/** @module signal
 *  Composable event-like thingies.
 *  @todo Finish dependency tracking and make sure there are no leaks.
 */

"use strict";

const constants = require("./constants");
const logger    = require("./logger");

const COMMAND = constants.COMMAND;
const STATUS  = constants.STATUS;

const log = logger.get("ircjs");

const RECEIVERS    = 0;
const DEPENDENCIES = 1;

/** The core {@link Signal} object, in search of a better name.
 *  @constructor
 */
function Signal() {
  this.connections = new Map();
  this.connections.set(DEPENDENCIES, []);
  this.connections.set(RECEIVERS, []);
  // Can't wait for classes with non-broken-by-default methods...
  this.depend   = depend.bind(this);
  this.emit     = emit.bind(this);
  this.end      = end.bind(this);
  this.receive  = receive.bind(this);
  this.remove   = remove.bind(this);
}

/** An error-catching safe version.
 *  @constructor
 */
function SafeSignal() {
  Signal.call(this);
  this.emit = emitSafe.bind(this);
}

/** Emit a value to all receivers.
 *  @this   {Signal}
 *  @param  {*...}    value
 *  @return {number}
 */
function emit(value /* ... */) {
  const receivers = this.connections.get(RECEIVERS)
  let index   = 0;
  let length  = receivers.length;
  while (index !== length) {
    // Is there something like `apply', except it doesn't mess up `this'?
    let status = receivers[index].apply(null, arguments);
    if (status & STATUS.REMOVE) {
      length = this.remove(receivers[index]);
      continue;
    }
    if (status & STATUS.STOP) {
      break;
    }
    ++index;
  }
  return length;
}

/** Emit a value to all receivers and catch any errors thrown.
 *  @todo Fix the copy pasta from `emit'.
 *  @this   {Signal}
 *  @param  {*...}    value
 *  @return {number}
 */
function emitSafe(value /* ... */) {
  const receivers = this.connections.get(RECEIVERS)
  let index   = 0;
  let length  = receivers.length;
  let status  = null;
  while (index !== length) {
    try {
      status = receivers[index].apply(null, arguments);
    } catch (e) {
      log.error("Caught error in emitSafe: %s", e.stack);
    }
    if (status & STATUS.REMOVE) {
      length = this.remove(receivers[index]);
      continue;
    }
    if (status & STATUS.STOP) {
      break;
    }
    ++index;
  }
  return length;
}

/** Add a receiver to the {@link Signal}.
 *  Returns a function that, when called, removes the added receiver.
 *  @this   {Signal}
 *  @param  {function}  receiver
 *  @return {function}
 */
function receive(receiver) {
  const receivers = this.connections.get(RECEIVERS);
  receivers.push(receiver);
  return this.remove.bind(this, receiver);
}

/** Add a "dependency", really a function that cleans up said dependency.
 *  @this   {Signal}
 *  @param  {function}  dependency
 *  @return {Signal}
 */
function depend(dependency) {
  const dependencies = this.connections.get(DEPENDENCIES);
  dependencies.push(dependency);
  return this;
}

/** Returned when adding a receiver, with arguments already filled in.
 *  When called, removes the receiver from the signal, and returns the number
 *  of remaining receivers.
 *  @this   {Signal}
 *  @param  {function}  receiver
 *  @return {number}
 */
function remove(receiver) {
  const receivers = this.connections.get(RECEIVERS);
  const deps      = this.connections.get(DEPENDENCIES);
  const index     = receivers.indexOf(receiver);
  if (-1 !== index) {
    receivers.splice(index, 1);
  }
  return receivers.length;
}

/** Dispose of the {@link Signal} receivers and dependencies.
 *  Wish it could be a finalizer method. :)
 *  @this   {Signal}
 *  @param  {function}  receiver
 *  @return {number}
 */
function end() {
  const receivers = this.connections.get(RECEIVERS);
  const deps      = this.connections.get(DEPENDENCIES);
  let i = deps.length;
  while (i--) {
    deps.pop()();
  }
  receivers.splice(0, receivers.length);
  return 0;
}


/** That's it for {@link Signal}, what follows are a bunch of combinators that
 *  can be used on their own, but are also used to generate prototype methods
 *  for {@link Signal}, giving a more JS-y API.
 */

/** Create a {@link Signal} that emits `value' every time `sigA' emits anything.
 *  @param  {Signal}  sigA
 *  @param  {*}       value
 *  @return {Signal}
 */
function constant(sigA, value) {
  const sigB = new Signal();
  const dep  = sigA.receive(sigB.emit.bind(null, value));
  return sigB.depend(dep);
}

/** Create a {@link Signal} that emits the values of sigA only when it differs from the previous one.
 *  @param  {Signal}  sigA
 *  @return {Signal}
 */
function distinct(sigA) {
  const sigB  = new Signal();
  const depA  = sigA.receive(function(value) {
    if (value !== prevVal) {
      sigB.emit(value);
    }
    prevVal = value;
  })
  let prevVal;
  return sigB.depend(depA);
}

/** Create a {@link Signal} consisting of values from sigA for which `predicate' returns true.
 *  @param  {Signal}    sigA
 *  @param  {function}  predicate
 *  @return {Signal}
 */
function filter(sigA, predicate) {
  const sigB = new Signal();
  const dep  = sigA.receive(filterSignal.bind(null, sigB, predicate));
  return sigB.depend(dep);
}

function filterSignal(signal, predicate, value) {
  if (true === predicate(value)) {
    signal.emit(value);
  }
}

/** Create a flattened signal with values from sigA and sigB.
 *  @param  {Signal}  sigA
 *  @param  {Signal}  sigB
 *  @return {Signal}
 */
function join(sigA, sigB) {
  if (2 < arguments.length) {
    return joinMany.apply(null, arguments);
  }
  const sigC = new Signal();
  const depA = sigA.receive(sigC.emit);
  const depB = sigB.receive(sigC.emit);
  sigC.depend(depA);
  sigC.depend(depB);
  return sigC;
}

/** Used by `join' if there are lots of signals to join.
 *  @param  {Signal...}
 *  @return {Signal}
 */
function joinMany(sig1, sig2 /* sig3, ... , sigN */) {
  const count = arguments.length;
  const sigJ  = new Signal();
  let sig   = null;
  let index = 0;
  while(index !== count) {
    sig = arguments[index];
    sigJ.depend(sig.receive(sigJ.emit));
    ++index;
  }
  return sigJ;
}

/** Create a {@link Signal} consisting of f applied to values from sigA.
 *  @param  {Signal}    sigA
 *  @param  {function}  fun
 *  @return {Signal}
 */
function map(sigA, fun) {
  const sigB = new Signal();
  const dep  = sigA.receive(mapSignal.bind(null, sigB, fun));
  return sigB.depend(dep);
}

function mapSignal(signal, fun, value) {
  signal.emit(fun(value));
}

/** Create a {@link Signal} of values from sigA, skipping the first n values.
 *  @param  {Signal}  sigA
 *  @param  {number}  number
 *  @return {Signal}
 */
function skip(sigA, number) {
  const sigB = new Signal();
  const dep  = sigA.receive(function(value) {
    if (number === skipped) {
      sigB.emit(value);
    }
    else {
      ++skipped;
    }
  });
  let skipped = 0;
  return sigB.depend(dep);
}

/** When `sigA' produces a value, call `swapper' and forward values from the
 *  returned Signal to the Signal returned by this function.
 *  @param  {Signal}    sigA
 *  @param  {function}  fun
 *  @return {Signal}
 */
function swap(sigA, fun) {
  const sigB = new Signal();
  const depA = sigA.receive(function(value) {
    const dep = fun(value).receive(sigB.emit);
    sigB.depend(dep);
    depA();
  });
  return sigB.depend(depA);
}

/** Create a {@link Signal} consisting of the first n values from sigA
 *  @param  {Signal}  sigA
 *  @param  {number}  number
 *  @return {Signal}
 */
function take(sigA, number) {
  const sigB = new Signal();
  const dep  = sigA.receive(function(value) {
    if (number === taken) {
      dep();
    }
    else {
      sigB.emit(value);
      ++taken;
    }
  });
  let taken = 0;
  return sigB.depend(dep);
}

/** Create a {@link Signal} of values from sigA until sigB emits a value.
 *  @param  {Signal}  sigA  Take from this
 *  @param  {Signal}  sigB  Stop taking when this produces a value
 *  @return {Signal}
 */
function takeUntil(sigA, sigB) {
  const sigC = new Signal();
  const depA = sigA.receive(sigC.emit);
  const depB = sigB.receive(function(_) {
    depA();
    depB();
  });
  sigC.depend(depA);
  sigC.depend(depB);
  return sigC;
}

/** Throttle a Signal, distributing values out over time.
 *  @param  {Signal}  sigA
 *  @param  {number}  minTime
 *  @return {Signal}
 */
function throttle(sigA, minTime) {
  const sigB = new Signal();
  const depA = sigA.receive(function(value) {
    const now = Date.now();
    const elapsed = now - lastTime;
    function next() {
      lastTime = now
      sigB.emit(value)
    }
    if (timeout) {
      clearTimeout(timeout = 0);
    }
    if (elapsed >= minTime) {
      next();
    }
    else {
      timeout = setTimeout(next, minTime - elapsed);
    }
  });
  let timeout  = 0;
  let lastTime = 0;
  return sigB.depend(depA);
}

/** Create a {@link Signal} of values from sigA and sigB, zipped into groups of `count'.
 *  @param  {Signal}  sigA
 *  @param  {Signal}  sigB
 *  @param  {?number} count
 *  @return {Signal}
 */
function zip(sigA, sigB, count) {
  count = count || 2;
  const sigC  = new Signal();
  const sigAB = sigA.join(sigB);
  const vals  = [];
  const depAB = sigAB.receive(zipSignal.bind(null, count, vals, sigC));
  return sigC.depend(depAB);
}

function zipSignal(count, values, signal, value) {
  values.push(value);
  if (count === values.length) {
    signal.emit(values.splice(0, count));
  }
}

/** End of generic {@link Signal} combinators, now some IRC-specific ones. */

/** Match a {@link Message}, and emit the matched data as arguments.
 *  This combinator is specific to IRC-js {@link Message} objects.
 *  @param  {Signal}          sigA
 *  @param  {RegExp|string}   expr
 *  @return {Signal}
 */
function match(sigA, expr) {
  const sigB  = new Signal();
  const depA  = sigA.receive(function(message) {
    if (message.type !== COMMAND.PRIVMSG) {
      return STATUS.RETRY;
    }
    const matches = message.params[1].match(expr);
    if (!matches) {
      return STATUS.RETRY;
    }
    if (!match.global) {
      matches.shift(); // Get rid of the full matched string
    }
    matches.unshift(message);
    sigB.emit.apply(sigB, matches);
    return STATUS.SUCCESS;
  });
  return sigB.depend(depA);
}

/** All of the public functions, meaning they will get a generated method on
 *  `Signal.prototype', in addition to being added to `exports'.
 */
const methods = [
  constant,
  distinct,
  filter,
  join,
  joinMany,
  map,
  skip,
  swap,
  take,
  takeUntil,
  throttle,
  zip,
  // IRC-specific
  match
];

/** Generate methods for `Signal.prototype', in a terrible fashion.
 *  Should look at how JS pros do it, and copy^H^H^H^Hborrow their code.
 */
methods.forEach(function(fun) {
  // TIL `Function.prototype.toString' is specced to return the source code.
  // Thought it was implementation-defined, and the reason `toSource' exists.
  const source  = fun.toString();
  const funArgs = source.match(/^function \w+\(([^)]+)\)/)[1].split(", ");
  const thisArg = funArgs[0];
  const funBody = source.match(/\{([\s\S]+)\}/)[1]
                    .replace(new RegExp("\\b" + thisArg + "\\b"), "this");
  // Methods use the implicit `this' argument, instead of this explicit one.
  funArgs.shift();
  /** `Signal.prototype[f.name] = new Function(funArgs, funBody)'
   *  The above code was my first approach, but node's `require()' messes up
   *  the scope somehow, causing `Signal', which is in module scope here, to
   *  be undefined when the new function is called. Need to investigate.
   */
  eval("Signal.prototype." + fun.name + " = SafeSignal.prototype." +
    fun.name + " = function(" + funArgs.join(", ") + ") {" +
    funBody + "}");
  exports[fun.name] = fun;
})

// Constructors
exports.Signal      = Signal;
exports.SafeSignal  = SafeSignal;

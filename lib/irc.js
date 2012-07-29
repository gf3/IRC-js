/** @module irc
 *  An IRC library for node.js
 *
 *  http://www.faqs.org/rfcs/rfc1459.html :)
 *  http://irchelp.org/irchelp/rfc/ :D
 */

"use strict";

const fs            = require("fs");
const net           = require("net");
const path          = require("path");
const tls           = require("tls");
const constants     = require("./constants");
const handlers      = require("./handlers");
const logger        = require("./logger");
const objects       = require("./objects");
const parser        = require("./parser");
const signal        = require("./signal");

// Constructors
const Channel       = objects.Channel;
const Message       = objects.Message;
const Person        = objects.Person;
const Server        = objects.Server;
const Signal        = signal.Signal;
const SafeSignal    = signal.SafeSignal;
// Factory functions
const message       = objects.message;
const channel       = objects.channel;
const person        = objects.person;
const server        = objects.server;
// Helpers
const trailing      = objects.trailing;
// Constants
const COMMAND       = constants.COMMAND;
const ERROR         = constants.ERROR;
const EVENT         = constants.EVENT;
const LEVEL         = constants.LEVEL;
const MODE          = constants.MODE;
const NODE          = constants.NODE;
const REPLY         = constants.REPLY;
const STATUS        = constants.STATUS;
const SOCKET        = constants.SOCKET;

// Level is (re)set later, when config is read
const log = logger.get("ircjs", LEVEL.ALL);

// IRC message delimiter and message max length
const DELIM   = "\r\n";
const MAXLEN  = 512 - DELIM.length;

// Flood protection
const MINWAIT = 10;
const MAXWAIT = 5000;

/** Throttle calls to a function, if they happen more often than `MINWAIT'.
 *  When throttling kicks in, time until next call increases by `ratio'.
 *  When the time reaches `MAXWAIT', it will not increase any further.
 *  @param  {function}  f
 *  @param  {number}    ratio
 *  @return {function}
 */
function backoff(f, ratio) {
  const r = ratio || Math.LOG2E;
  let lastCall = null;
  let interval = MINWAIT;
  return function() {
    const args = arguments;
    function later() {
      const now  = Date.now();
      const wait = interval - (now - lastCall);
      if (wait > 0) {
        return setTimeout(later, wait);
      }
      if (r) {
        interval = Math.min(MAXWAIT, interval * r);
      }
      lastCall = now;
      f.apply(null, args);
    }
    setTimeout(later, 0);
  }
}

/** Client: An IRC client wrapping up the server connection, configuration, signals
 *  and other things into an easy-to-use object.
 *
 *  @constructor
 *  @param    {Map}   conf
 *  @property {Map}   channels
 */
function Client(conf) {
  const server    = conf.get("server");
  const internal  = {
    buffer: [],
    connected: false,
    connectedSince: null,
    signals: new Map(),
    socket: null
  };

  log.level = LEVEL.fromString(conf.get("log"));

  this.config     = conf;

  this.server     = new Server(server.get("address"), server.get("port"));
  this.user       = new Person(conf.get("nick"), null, null);

  this.channels   = new Map();

  // Privileged methods
  this.connect    = connect.bind(this, internal);
  this.disconnect = disconnect.bind(this, internal);
  this.ignore     = ignore.bind(this, internal);
  this.listen     = listen.bind(this, internal);
  this.notify     = notify.bind(this, internal);

  // Other methods, using `bind()' anyway so they don't break when passed as arguments.
  this.match      = match.bind(this);
  this.matchIf    = matchIf.bind(this);
  this.join       = join.bind(this);
  this.part       = part.bind(this);
  this.setMode    = setMode.bind(this);
  this.quit       = quit.bind(this);

  // Wrap send method in a throttling function, if flood protection is wanted
  this.send       = conf.get("flood-protection")
                  ? backoff(send.bind(this, internal))
                  : send.bind(this, internal);
  // Add all default handlers
  handlers.load(this);
}

/** @private
 *  @this   {Client}
 *  @param  {Object}  internal
 *  @return {Client}
 */
function onConnect(internal) {
  const user = this.config.get("user");
  const mode = user.get("mode") ?
    parser.parse(user.get("mode"), "Mode") : null;
  const password = user.get("password");
  internal.connected = true;
  internal.connectedSince = new Date();
  if (password) {
    this.send(message(COMMAND.PASS, [password]));
  }
  this.send(message(COMMAND.NICK, [this.user.nick]));
  sendUser.call(this, user.get("username"), user.get("realname"), mode);
  return this;
}

/** Disconnect from server.
 *
 *  @this   {Client}
 *  @param  {Object}  internal
 *  @return {Client}
 */
function disconnect(internal) {
  const since = internal.connectedSince;
  internal.socket.end();
  internal.connected = false;
  internal.connectedSince = null;
  internal.socket = null;
  this.notify(EVENT.DISCONNECT);
  if (since) {
    log.info("Connected at %s, disconnected at %s", since, new Date());
  }
  return this;
}

/** @this   {Client}
 *  @param  {Object}  internal
 *  @return {Client}
 */
function onData(internal, data) {
  let buffer;
  let last;
  let message;
  // Apply previous buffer, split, re-buffer
  if (0 !== internal.buffer.length) {
    internal.buffer.push(data);
    data = internal.buffer.splice(0).join("");
  }
  buffer = data.split(DELIM);
  if (last = buffer.pop()) {
    internal.buffer.push(last);
  }
  // Emit!
  for (let i = 0, l = buffer.length; i < l; ++i) {
    log.debug("Received: %s", buffer[i]);
    message = parser.parse(buffer[i] + DELIM);
    message.client = this;
    this.notify(message.type, message);
    this.notify(EVENT.ANY, message);
  }
}

/** @this   {Client}
 *  @param  {Object}      internal
 *  @param  {?function=}  callback
 *  @return {Client}
 */
function connect(internal, callback) {
  // Pick an appropriate connection method
  const connect =
    this.config.get("server").get("ssl") ? tls.connect : net.connect;

  if (internal.connected) {
    log.warn("Already connected at %s", internal.connectedSince);
    return this;
  }

  internal.socket = connect(this.server.port, this.server.name);
  internal.socket.setEncoding(this.config.get("encoding"));
  internal.socket.setTimeout(0);

  internal.socket.addListener(NODE.SOCKET.EVENT.CONNECT, onConnect.bind(this, internal));
  internal.socket.addListener(NODE.SOCKET.EVENT.DATA, onData.bind(this, internal));
  internal.socket.addListener(NODE.SOCKET.EVENT.TIMEOUT, this.disconnect);

  if (2 === arguments.length) { // Do all servers send a 001 ?
    const client  = this;
    function handler() {
      client.ignore(REPLY.WELCOME, handler);
      callback(client);
    }
    this.listen(REPLY.WELCOME, handler);
  }
  // Forward network errors
  internal.socket.addListener(NODE.SOCKET.ERROR,
    this.notify.bind(this, EVENT.ERROR));

  return this;
}

/** Send a message
 *  @this   {Client}
 *  @param  {Object}    internal
 *  @param  {Message}   message
 *  @return {Client}
 */
function send(internal, message) {
  const data  = message.toString();
  if (data.length <= MAXLEN) {
    return write.call(this, internal.socket, data);
  }
  // Only works for PRIVMSG
  const rest = data.slice(MAXLEN);
  write.call(this, internal.socket, data.slice(0, MAXLEN));
  message.params[1] = trailing(rest);
  return this.send(message);
}

/** Write to socket.
 *  @private
 *  @this   {Client}
 *  @param  {Stream}  sock
 *  @param  {string}  data
 *  @return {Client}
 */
function write(sock, data) {
  if (sock.readyState !== NODE.SOCKET.STATE.OPEN) {
    log.error("Socket is not open, but tried to send: %s", data);
    return this;
  }
  const crlf = data.lastIndexOf(DELIM) === data.length - 2 ? "" : DELIM;
  sock.write(data + crlf);
  log.debug("Sent: %s", data);
  return this;
}

/** @private
 *  @this   {Client}
 *  @param  {string}  username
 *  @param  {string}  realname
 *  @param  {Map}     flags     User mode flags
 *  @return {Client}
 */
function sendUser(username, realname, flags) {
  let mode = 0;
  if (flags) {
    // When sending a USER command, these flags have special integer values.
    mode |= flags.get("+").indexOf("i") === -1 ? 0 : 1 << 2;
    mode |= flags.get("+").indexOf("w") === -1 ? 0 : 1 << 3;
  }
  const msg = message(COMMAND.USER, [username, mode.toString(), "*", trailing(realname)]);
  return this.send(msg);
}

/** Quit the server, with an optional message.
 *  When you call this, the bot will also disconnect.
 *
 *  Quit without a message:
 *  <code>ircInstance.quit()</code>
 *  Quit with a hilarious message:
 *  <code>ircInstance.quit("LOLeaving!")</code>
 *
 *  @this   {Client}
 *  @param  {string=} reason  Your quit message
 *  @return {Client}
 */
function quit(reason) {
  const params = reason ? [trailing(reason)] : []
  this.send(message(COMMAND.QUIT, params))
  return this.disconnect()
}

/** Set various user modes on yourself.
 *  For a full list of user modes, see: http://docs.dal.net/docs/modes.html#3
 *  De-op self:
 *  <code>ircInstance.setMode("-o")</code>
 *
 *  @this   {Client}
 *  @param  {string}  mode      The mode string
 */
function setMode(mode) {
  // 4.2.3.2
  return this.send(message(COMMAND.MODE, [this.user.nick, mode]));
}

/** Join a channel.
 *  @this   {Client}
 *  @param  {Channel|string}  chan
 *  @param  {string=}         pass
 *  @param  {function=}       callback
 *  @return {Client}
 */
function join(chan /*, pass, callback*/) {
  /** My kingdom for proper overloading. This one has 4 signatures:
   *    join(chan, pass, callback)
   *    join(chan, pass)
   *    join(chan, cb)
   *    join(chan)
   */
  let channel_ = this.channels.get(chan.id || objects.id(chan));
  let password = null;
  let callback = null;
  switch (arguments.length) {
    case 3:
    password = arguments[1];
    callback = arguments[2];
    break;

    case 2:
    // Either (chan, pass) or (chan, callback)
    if (arguments[1].constructor === String) {
      password = arguments[1];
    }
    else {
      callback = arguments[1];
    }
    break;

    case 1:
    break;

    default:
    throw new Error("No matching signature");
  }

  // We are already in it, but tell callback anyway, if there is one
  if (channel_) {
    if (callback) {
      callback(channel_);
    }
    return channel_;
  }
  // We got a proper Channel object, and this client's User is in it
  // That's the somewhat convoluted way of telling ourselves we've joined
  else if (chan instanceof Channel
      && chan.people.has(this.user.id)) {
    this.channels.set(chan.id, chan);
    return chan;
  }

  // All else failed, so construct and send a JOIN message
  const params = [];
  if (password) { params.push(password); }
  if (callback) { params.push(callback); }
  if (!(chan instanceof Channel)) { chan = channel(chan); }
  chan.client = this;
  return chan.join.apply(chan, params);
}

/** @this   {Client}
 *  @param  {Channel|string}  chan
 *  @param  {string=}         msg
 *  @return {Client}
 */
function part(chan, msg) {
  const ch = this.channels.get(chan.id || objects.id(chan))
  if (!ch) {
    return this;
  }
  const params = [ch.name];
  if (msg) {
    params.push(trailing(msg));
  }
  // This means that we have not left the channel yet
  if (ch.people.has(this.user.id)) {
    this.send(message(COMMAND.PART, params));
  }
  return this;
}

/** Look for a `PRIVMSG' that matches a `RegExp'.
 *  @this   {Client}
 *  @param  {RegExp|string}   expr
 *  @param  {function=}       handler
 *  @return {Client}
 */
function match(expr, handler) {
  let signal;
  if (expr instanceof RegExp) {
    signal = this.listen(COMMAND.PRIVMSG).match(expr);
  }
  else {
    signal = this.listen(expr);
  }
  if (handler) {
    signal.receive(handler);
  }
  return signal;
}

/** Look for a `PRIVMSG' that matches a `RegExp'.
 *  @this   {Client}
 *  @param  {RegExp}    expr
 *  @param  {function}  pred
 *  @param  {function}  handler
 *  @return {Signal}
 */
function matchIf(expr, pred, handler) {
  return this.listen(COMMAND.PRIVMSG, function(msg) {
    const match = msg.params[1].match(expr);
    if (!(match && pred(msg))) {
      return;
    }
    if (!expr.global) {
      match.shift();
    }
    match.unshift(msg);
    handler.apply(this, match);
  });
}

/** @this   {Client}
 *  @param  {Object}    internal
 *  @param  {string}    type
 *  @param  {function}  handler
 *  @return {Signal}
 */
function listen(internal, type, handler) {
  const die = this.config.get("die");
  const sig = internal.signals.get(type)
        || (internal.signals.set(type, die ? new Signal() : new SafeSignal()));
  if (handler) {
    sig.receive(handler);
  }
  return sig;
}

function ignore(internal, type, handler) {
  const sig = internal.signals.get(type);
  if (!sig) {
    return 0;
  }
  const remaining = sig.remove(handler);
  if (0 === remaining) {
    sig.end();
    internal.signals.delete(type);
  }
  return remaining;
}

function notify(internal, type, val) {
  const sig = internal.signals.get(type);
  if (!sig) {
    return false;
  }
  sig.emit(val);
  return true;
}

/** Helper for reading the config file
 *  @param  {string}  conf
 *  @return {Object}
 */
function getConfig(conf) {
  return makeConfig(JSON.parse(fs.readFileSync(conf, "utf8")));
}

function makeConfig(obj) {
  const map = new Map();
  for (let k in obj) {
    let v = obj[k];
    if (v && v.constructor === Object) {
      v = makeConfig(v);
    }
    map.set(k, v);
  }
  return map;
}

/** Convenience function for creating a {@Client} and connect
 *  @param  {string=}   conf
 *  @param  {function=} callback
 *  @return {Client}
 */
function quickConnect(conf, callback) {
  const confFile = conf ? conf : path.join(process.cwd(), "config.json");
  const bot = new Client(getConfig(conf));
  if (callback) {
    return bot.connect(callback);
  }
  return bot.connect(); 
}

exports.Client  = Client;

// Exports and re-exports

// Modules
exports.logger  = logger;
exports.parser  = parser;
exports.signal  = signal;

// Constructors
exports.Channel = Channel;
exports.Message = Message;
exports.Person  = Person;
exports.Server  = Server;

// Constants
exports.COMMAND = COMMAND;
exports.ERROR   = ERROR;
exports.EVENT   = EVENT;
exports.LEVEL   = LEVEL;
exports.MODE    = MODE;
exports.REPLY   = REPLY;
exports.STATUS  = STATUS;
/** @todo Remove when available in Node */
exports.NODE    = NODE;

// Factory functions;
exports.channel = channel;
exports.message = message;
exports.person  = person;
exports.server  = server;

// Other functions
exports.id      = objects.id;
exports.connect = quickConnect;

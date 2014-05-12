/** @module irc
 *  An IRC library for node.js
 *
 *  http://www.faqs.org/rfcs/rfc1459.html :)
 *  http://irchelp.org/irchelp/rfc/ :D
 */

"use strict";

const Channel       = require("./channel").Channel;
const Message       = require("./message").Message;
const Person        = require("./person").Person;
const Server        = require("./server").Server;
const channel       = require("./channel").channel;
const constants     = require("./constants");
const fs            = require("fs");
const handlers      = require("./handlers");
const id            = require("./util").id;
const logger        = require("./logger");
const message       = require("./message").message;
const net           = require("net");
const parser        = require("./parser");
const path          = require("path");
const person        = require("./person").person;
const server        = require("./server").server;
const trailing      = require("./message").trailing;

const COMMAND       = constants.COMMAND;
const ERROR         = constants.ERROR;
const EVENT         = constants.EVENT;
const LEVEL         = constants.LEVEL;
const MODE          = constants.MODE;
const NODE          = constants.NODE;
const REPLY         = constants.REPLY;
const STATUS        = constants.STATUS;
const SOCKET        = constants.SOCKET;

/** Maximum message length allowed by IRC */
const MESSAGE_MAX_LENGTH  = 512;
const MESSAGE_BUFFER_SIZE = MESSAGE_MAX_LENGTH + 4;

// Keys for config
const CFG_ADDRESS       = "address";
const CFG_CHANNELS      = "channels";
const CFG_DIE           = "die";
const CFG_LOG           = "log";
const CFG_MODE          = "mode";
const CFG_NICK          = "nick";
const CFG_PASSWORD      = "password";
const CFG_PORT          = "port";
const CFG_SSL           = "ssl";
const CFG_REALNAME      = "realname";
const CFG_SERVER        = "server";
const CFG_USER          = "user";
const CFG_USERNAME      = "username";
const CFG_FLOOD_PROTECT = "flood-protection";

// Level is (re)set later, when config is read
const log = logger.get("ircjs", LEVEL.ALL);

// Flood protection
const MIN_WAIT = 10;
const MAX_WAIT = 5000;

const defaultConfig = {};

defaultConfig[CFG_DIE]            = true;
defaultConfig[CFG_FLOOD_PROTECT]  = false;
defaultConfig[CFG_LOG]            = "all";
defaultConfig[CFG_NICK]           = "ircjsbot";

defaultConfig[CFG_SERVER]               = {};
defaultConfig[CFG_SERVER][CFG_ADDRESS]  = "chat.freenode.net";
defaultConfig[CFG_SERVER][CFG_PORT]     = 6667;
defaultConfig[CFG_SERVER][CFG_SSL]      = false;

defaultConfig[CFG_USER]               = {};
defaultConfig[CFG_USER][CFG_REALNAME] = "IRC-JS Bot";
defaultConfig[CFG_USER][CFG_USERNAME] = "irc-js";

/** Throttle calls to a function, if they happen more often than `MIN_WAIT'.
 *  When throttling kicks in, time until next call increases by `ratio'.
 *  When the time reaches `MAX_WAIT', it will not increase any further.
 *  @param  {function}  f
 *  @param  {number}    ratio
 *  @return {function}
 */
function backoff(f, ratio) {
  const r = ratio || Math.LOG2E;
  let lastCall = null;
  let interval = MIN_WAIT;
  return function() {
    const args = arguments;
    function later() {
      const now  = Date.now();
      const wait = interval - (now - lastCall);
      if (wait > 0) {
        setTimeout(later, wait);
        return;
      }
      if (r) {
        interval = Math.min(MAX_WAIT, interval * r);
      }
      lastCall = now;
      f.apply(null, args);
    }
    setTimeout(later, 0);
  };
}

/** Merge two objects, including properties that are objects.
 *  Mutates the first object.
 *  @param  {Object} a
 *  @param  {Object} b
 *  @return {Object} a with properties of b
 */
function mergeObjects(a, b) {
    for (var k in b) {
        if (b.hasOwnProperty(k)) {
            if (typeof a[k] === "object" && typeof b[k] === "object") {
                mergeObjects(a[k], b[k]);
            } else {
                a[k] = b[k];
            }
        }
    }

    return a;
}

/** Client: An IRC client wrapping up the server connection, configuration,
 *  and other things into an easy-to-use object.
 *
 *  @constructor
 *  @param    {Object=} conf
 *  @property {Map}     channels
 *  @property {Map}     config
 *  @property {Map}     handlers
 *  @property {Buffer}  messageBuffer
 *  @property {Server}  server
 *  @property {Person}  user
 *  @property {Buffer}  streamBuffer
 *  @property {Socket}  socket
 */
function Client(conf) {
  const config = makeConfig(mergeObjects(defaultConfig, conf));
  const server = config.get(CFG_SERVER);

  this.config         = config;
  this.channels       = new Map();
  this.connectedAt    = new Date(0);
  this.handlers       = new Map();
  this.messageBuffer  = new Buffer(MESSAGE_BUFFER_SIZE);
  this.server         = new Server(server.get(CFG_ADDRESS), server.get(CFG_PORT), server.get(CFG_SSL));
  this.user           = new Person(config.get(CFG_NICK), null, null);
  this.streamBuffer   = null;
  this.socket         = null;

  log.level = LEVEL.fromString(config.get(CFG_LOG));

  // Wrap send method in a throttling function, if flood protection is wanted
  if (config.get(CFG_FLOOD_PROTECT)) {
    this.send = backoff(this.send.bind(this));
  }

  // Add all default handlers
  handlers.load(this);
}

/** @private
 *  @this   {Client}
 *  @return {Client}
 */
function onConnect() {
  const user = this.config.get(CFG_USER);
  const mode = user.has(CFG_MODE) ?
    parser.parseMode(user.get(CFG_MODE)) : null;
  const password = user.get(CFG_PASSWORD);
  this.connectedAt.setTime(Date.now());
  if (password) {
    this.send(message(COMMAND.PASS, [password]));
  }
  this.send(message(COMMAND.NICK, [this.user.nick]));
  sendUser.call(this, user.get(CFG_USERNAME), user.get(CFG_REALNAME), mode);
  return this;
}

/** Disconnect from server.
 *  @return {Client}
 */
Client.prototype.disconnect = function() {
  const connected = this.connectedAt;
  const connectedSince = connected.getTime();
  connected.setTime(0);
  this.socket.end();
  this.socket = null;
  this.notify(EVENT.DISCONNECT);
  if (connectedSince) {
    log.info("Connected at %s, disconnected at %s", new Date(connectedSince), new Date());
  }
  return this;
};

/** @this   {Client}
 *  @param  {Buffer}  data
 */
function onData(data) {
  const prev = this.streamBuffer;
  if (prev) {
    const newBuf = new Buffer(prev.length + data.length);
    prev.copy(newBuf);
    data.copy(newBuf, prev.length);
    data = newBuf;
    this.streamBuffer = null;
  }
  const length = data.length;
  let end = 0;
  for (let i = 0, j = 0, l = data.length; i < l; ++i) {
    if (data[i] !== 0x0A) {
      continue;
    }
    const msg = parser.parse(data.slice(j, i + 1));
    msg.client = this;
    this.notify(msg.type, msg);
    this.notify(EVENT.ANY, msg);
    j = i + 1;
    end = j;
  }
  if (end !== length) {
    this.streamBuffer = data.slice(end);
  }
}

/** @param  {?function=}  callback
 *  @return {Client}
 */
Client.prototype.connect = function(callback) {
  if (this.connectedAt > 0) {
    log.warn("Already connected at %s", this.connectedAt);
    return this;
  }
  const sock = this.socket = this.server.connect();
  sock.setTimeout(0);

  sock.addListener(NODE.SOCKET.EVENT.CONNECT, onConnect.bind(this));
  sock.addListener(NODE.SOCKET.EVENT.SECURE_CONNECT, onConnect.bind(this));
  sock.addListener(NODE.SOCKET.EVENT.DATA, onData.bind(this));
  sock.addListener(NODE.SOCKET.EVENT.TIMEOUT, this.disconnect.bind(this));
  // Forward network errors
  sock.addListener(NODE.SOCKET.EVENT.ERROR, this.notify.bind(this, EVENT.ERROR));

  if (1 === arguments.length) { // Do all servers send a 001 ?
    const client  = this;
    function handler() {
      client.ignore(REPLY.WELCOME, handler);
      callback(client);
    }
    this.match(REPLY.WELCOME, handler);
  }

  return this;
};

/** Send a {@link Message} object into cyberspace.
 *  @param  {Message}   message
 *  @return {Client}
 */
Client.prototype.send = function(message) {
  const buffer = this.messageBuffer;
  message.toBuffer(buffer);
  const length  = buffer.readUInt16LE(0);
  const remains = buffer.readUInt16LE(2);
  write.call(this, buffer.slice(4, length));
  /** @todo Fix splitting of long messages again. */
  if (remains) {
    log.debug("Left %d poor bytes behind.", remains);
  }
  return this;
};

/** Write to socket.
 *  @private
 *  @this   {Client}
 *  @param  {Buffer}  data
 *  @return {Client}
 */
function write(data) {
  const sock = this.socket;
  if (sock.readyState !== NODE.SOCKET.STATE.OPEN) {
    log.error("Socket is not open, but tried to send: %s", data);
    return this;
  }
  sock.write(data);
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
    const arr = flags.get(0x2B);
    // When sending a USER command, these flags have special integer values.
    mode |= arr.indexOf("i") === -1 ? 0 : 1 << 2;
    mode |= arr.indexOf("w") === -1 ? 0 : 1 << 3;
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
Client.prototype.quit = function(reason) {
  const params = reason ? [trailing(reason)] : [];
  this.send(message(COMMAND.QUIT, params));
  return this.disconnect();
};

/** Set various user modes on yourself.
 *  For a full list of user modes, see: http://docs.dal.net/docs/modes.html#3
 *  De-op self:
 *  <code>ircInstance.setMode("-o")</code>
 *
 *  @param  {string}  mode      The mode string
 */
Client.prototype.setMode = function(mode) {
  // 4.2.3.2
  return this.send(message(COMMAND.MODE, [this.user.nick, mode]));
};

/** Join a channel.
 *  @param  {Channel|string}  chan
 *  @param  {string=}         pass
 *  @param  {function=}       callback
 *  @return {Client}
 */
Client.prototype.join = function(chan /*, pass, callback*/) {
  /** My kingdom for proper overloading. This one has 4 signatures:
   *    join(chan, pass, callback)
   *    join(chan, pass)
   *    join(chan, cb)
   *    join(chan)
   */
  let channel_ = this.channels.get(chan.id ? chan.id : id(chan));
  let password = null;
  let callback = null;
  switch (arguments.length) {
    default:
    throw new TypeError("No matching signature");

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
};

/** @param  {Channel|string}  chan
 *  @param  {string=}         msg
 *  @return {Client}
 */
Client.prototype.part = function(chan, msg) {
  const ch = this.channels.get(chan.id || id(chan));
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
};

/** @param  {RegExp|function|string}  expr
 *  @param  {function}                pred
 *  @param  {function=}               handler
 *  @return {function}    If called, removes the recently added handler.
 */
Client.prototype.match = function(expr, pred, handler) {
  if (expr instanceof RegExp) {
    return matchRegExp.apply(this, arguments);
  }
  if (expr instanceof Function) {
    return matchPred.apply(this, arguments);
  }
  return matchType.apply(this, arguments);
};

function matchRegExp(re, handler) {
  let pred = null;
  if (arguments.length === 3) {
    handler = arguments[2];
    pred = arguments[1];
  }
  return matchType.call(this, COMMAND.PRIVMSG, function(msg) {
    const match = msg.params[1].match(re);
    if (pred && !pred(msg)) {
      return null;
    }
    if (!match) {
      return null;
    }
    if (!re.global) {
      match.shift();
    }
    match.unshift(msg);
    delete match.index;
    delete match.input;
    return handler.apply(this, match);
  });
}

function matchPred(pred, handler) {
  return this.matchType(EVENT.ANY, function(msg) {
    if (!pred(msg)) {
      return null;
    }
    return handler(msg);
  });
}

function matchType(type, handler) {
  const handlers = this.handlers;
  let arr = handlers.get(type);
  if (!arr) {
    arr = [];
    handlers.set(type, arr);
  }
  arr.push(handler);
  return this.ignore.bind(this, type, handler);
}

/** Remove a handler for a specific type.
 *  @param  {string}    type
 *  @param  {function}  handler
 *  @return {numbder}   Remaining handlers for this type.
 */
Client.prototype.ignore = function(type, handler) {
  const arr = this.handlers.get(type);
  if (!arr) {
    return 0;
  }
  const ix = arr.indexOf(handler);
  if (-1 === ix) {
    return arr.length;
  }
  arr.splice(ix, 1);
  const length = arr.length;
  if (length === 0) {
    this.handlers.delete(type);
    return 0;
  }
  return length;
};

/** Call each handler with the supplied arguments.
 *  The handler can remove itself by returning the appropriate status code.
 *  @todo   It's mean to use `apply()' on the handlers, but I don't know another way to use an array(-like) of args.
 *  @param  {...*}
 *  @return {boolean}
 */
Client.prototype.notify = function(type /*, arg1, arg2 ... argN */) {
  const handlers = this.handlers.get(type);
  if (!handlers) {
    return false;
  }
  const args = Array.apply(null, arguments);
  args.shift();
  for (let i = 0, l = handlers.length; i < l; ++i) {
    const status = handlers[i].apply(this, args);
    if (status & STATUS.REMOVE) {
      this.ignore(type, handlers[i]);
      --i;
      --l;
    }
    if (status & STATUS.STOP) {
      break;
    }
  }
  return true;
};

/** Convert an Object into a Map
 *  @param  {Object} obj
 *  @return {Map}
 */
function makeConfig(obj) {
  const map = new Map();
  for (let k in obj) {
    let v = obj[k];
    if (v && v instanceof Object) {
      v = makeConfig(v);
    }
    map.set(k, v);
  }
  return map;
}

/** Convenience function for creating a {@Client} and connecting.
 *  @param  {Object=}   conf
 *  @param  {function=} callback
 *  @return {Client}
 */
function connect(conf, callback) {
  const bot = new Client(conf);
  if (callback) {
    return bot.connect(callback);
  }
  return bot.connect();
}

// Exports and re-exports
exports.Client  = Client;

// Modules
exports.logger  = logger;
exports.parser  = parser;

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
exports.connect   = connect;
exports.id        = id;
exports.trailing  = trailing;

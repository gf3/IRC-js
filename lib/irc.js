/** @module irc
 *  An IRC library for node.js
 *
 *  http://www.faqs.org/rfcs/rfc1459.html :)
 *  http://irchelp.org/irchelp/rfc/ :D
 */

"use strict";

Channel       = require("./channel").Channel;
Message       = require("./message").Message;
Person        = require("./person").Person;
Server        = require("./server").Server;
channel       = require("./channel").channel;
constants     = require("./constants");
extend        = require("util")._extend;
fs            = require("fs");
handlers      = require("./handlers");
id            = require("./util").id;
logger        = require("./logger");
message       = require("./message").message;
net           = require("net");
parser        = require("./parser");
path          = require("path");
person        = require("./person").person;
server        = require("./server").server;
trailing      = require("./message").trailing;

COMMAND       = constants.COMMAND;
ERROR         = constants.ERROR;
EVENT         = constants.EVENT;
LEVEL         = constants.LEVEL;
MODE          = constants.MODE;
NODE          = constants.NODE;
REPLY         = constants.REPLY;
STATUS        = constants.STATUS;
SOCKET        = constants.SOCKET;

/** Maximum message length allowed by IRC */
MESSAGE_MAX_LENGTH  = 512;
MESSAGE_BUFFER_SIZE = MESSAGE_MAX_LENGTH + 4;

// Keys for config
CFG_ADDRESS       = "address";
CFG_CHANNELS      = "channels";
CFG_DIE           = "die";
CFG_LOG           = "log";
CFG_MODE          = "mode";
CFG_NICK          = "nick";
CFG_PASSWORD      = "password";
CFG_PORT          = "port";
CFG_REALNAME      = "realname";
CFG_SERVER        = "server";
CFG_USER          = "user";
CFG_USERNAME      = "username";
CFG_FLOOD_PROTECT = "flood-protection";

// Level is (re)set later, when config is read
log = logger.get("ircjs", LEVEL.ALL);

// Flood protection
MIN_WAIT = 10;
MAX_WAIT = 5000;

defaultConfig = {};

defaultConfig[CFG_DIE]            = true;
defaultConfig[CFG_FLOOD_PROTECT]  = false;
defaultConfig[CFG_LOG]            = "all";
defaultConfig[CFG_NICK]           = "ircjsbot";

defaultConfig[CFG_SERVER]               = {};
defaultConfig[CFG_SERVER][CFG_ADDRESS]  = "chat.freenode.net";
defaultConfig[CFG_SERVER][CFG_PORT]     = 6667;

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
  r = ratio || Math.LOG2E;
  let lastCall = null;
  let interval = MIN_WAIT;
  return function() {
    args = arguments;
    function later() {
      now  = Date.now();
      wait = interval - (now - lastCall);
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
  config = makeConfig(extend(defaultConfig, conf));
  server = config.get(CFG_SERVER);

  this.config         = config;
  this.channels       = new Map();
  this.connectedAt    = new Date(0);
  this.handlers       = new Map();
  this.messageBuffer  = new Buffer(MESSAGE_BUFFER_SIZE);
  this.server         = new Server(server.get(CFG_ADDRESS), server.get(CFG_PORT));
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
  user = this.config.get(CFG_USER);
  mode = user.has(CFG_MODE) ?
    parser.parseMode(user.get(CFG_MODE)) : null;
  password = user.get(CFG_PASSWORD);
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
  connected = this.connectedAt;
  connectedSince = connected.getTime();
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
  prev = this.streamBuffer;
  if (prev) {
    newBuf = new Buffer(prev.length + data.length);
    prev.copy(newBuf);
    data.copy(newBuf, prev.length);
    data = newBuf;
    this.streamBuffer = null;
  }
  length = data.length;
  let end = 0;
  for (let i = 0, j = 0, l = data.length; i < l; ++i) {
    if (data[i] !== 0x0A) {
      continue;
    }
    msg = parser.parse(data.slice(j, i + 1));
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
  sock = this.socket = net.connect(this.server.port, this.server.name);
  sock.setTimeout(0);

  sock.addListener(NODE.SOCKET.EVENT.CONNECT, onConnect.bind(this));
  sock.addListener(NODE.SOCKET.EVENT.DATA, onData.bind(this));
  sock.addListener(NODE.SOCKET.EVENT.TIMEOUT, this.disconnect.bind(this));
  // Forward network errors
  sock.addListener(NODE.SOCKET.ERROR, this.notify.bind(this, EVENT.ERROR));

  if (1 === arguments.length) { // Do all servers send a 001 ?
    client  = this;
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
  buffer = this.messageBuffer;
  message.toBuffer(buffer);
  length  = buffer.readUInt16LE(0);
  remains = buffer.readUInt16LE(2);
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
  sock = this.socket;
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
    arr = flags.get(0x2B);
    // When sending a USER command, these flags have special integer values.
    mode |= arr.indexOf("i") === -1 ? 0 : 1 << 2;
    mode |= arr.indexOf("w") === -1 ? 0 : 1 << 3;
  }
  msg = message(COMMAND.USER, [username, mode.toString(), "*", trailing(realname)]);
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
  params = reason ? [trailing(reason)] : [];
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
  params = [];
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
  ch = this.channels.get(chan.id || id(chan));
  if (!ch) {
    return this;
  }
  params = [ch.name];
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
    match = msg.params[1].match(re);
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
  handlers = this.handlers;
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
  arr = this.handlers.get(type);
  if (!arr) {
    return 0;
  }
  ix = arr.indexOf(handler);
  if (-1 === ix) {
    return arr.length;
  }
  arr.splice(ix, 1);
  length = arr.length;
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
  handlers = this.handlers.get(type);
  if (!handlers) {
    return false;
  }
  args = Array.apply(null, arguments);
  args.shift();
  for (let i = 0, l = handlers.length; i < l; ++i) {
    status = handlers[i].apply(this, args);
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
  map = new Map();
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
  bot = new Client(conf);
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

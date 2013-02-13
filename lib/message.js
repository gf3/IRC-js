/** @module message */

"use strict";

const format    = require("util").format;
const constants = require("./constants");

const COMMAND   = constants.COMMAND;

/** Construct a shiny message object.
 *
 *  @constructor
 *  @param    {Server|Person}   from
 *  @param    {string}          type
 *  @param    {Array}           params
 *  @param    {Client=}         client
 *  @property {Date}            date
 *  @property {Server|Person}   from
 *  @property {string}          type
 *  @property {Array}           params
 */
function Message(from, type, params, client) {
  this.client = null;
  this.date   = new Date();
  this.from   = from;
  this.type   = type;
  this.params = params;
  if (client) {
    this.client = client;
  }
}

Object.defineProperty(Message.prototype, "forMe", {
  get: function() {
    return this.client ? forMe(this, this.client.user.nick) : false;
  }
});

// Command prefixes to look for. Should maybe go in some conf?
const prefixRE = /^:[!,./\?@`]/;

/** Determine if {@link Message} was meant for this client.
 *  @param  {Message} msg
 *  @param  {string}  nick
 *  @return {boolean}
 */
function forMe(msg, nick) {
  const msgText   = msg.params[1];
  const hasNick   = new RegExp(format("^:\\s*%s\\b", nick), "i").test(msgText);
  const hasPrefix = prefixRE.test(msgText);
  const isQuery   = msg.params[0] === nick;
  return hasNick || hasPrefix || isQuery;
}

/** Serialize into a string.
 *  No longer used when sending data, but can stay for debugging and stuff.
 *  @return {string}
 */
Message.prototype.toString = function() {
  const params = this.params;
  const parts  = [];
  if (this.from !== null) {
    parts.push(":" + this.from);
  }
  parts.push(this.type);
  if (params.length !== 0) {
    parts.push(params.join(" "));
  }
  return parts.join(" ");
};

/** Write {@link Message} into a Buffer object.
 *  @param  {Buffer}  buffer
 */
Message.prototype.toBuffer = function(buffer) {
  const length  = buffer.length - 2;
  const from    = this.from;
  const type    = this.type;
  const params  = this.params;
  // First two bytes are used for additional info.
  let offset    = 4;
  let remaining = 0;
  // Prefix
  if (from) {
    buffer[offset++] = 0x3A;
    // Server
    if (from.name) {
      offset += buffer.write(from.name, offset);
    }
    // Person
    else if (from.nick) {
      offset += buffer.write(from.nick, offset);
      if (from.host) {
        if (from.user) {
          buffer[offset++] = 0x21;
          offset += buffer.write(from.user, offset);
        }
        buffer[offset++] = 0x40;
        offset += buffer.write(from.host, offset);
      }
    }
    buffer[offset++] = 0x20;
  }
  // Command
  buffer.write(type, offset);
  offset += type.length;
  // Parameters
  for (let i = 0, l = params.length; i < l; ++i) {
    buffer[offset++] = 0x20;
    // Go char by char, but not really chars so possible bug here. 
    for (let j = 0, m = params[i].length; j < m; ++j) {
      if (offset >= length) {
        remaining += Buffer.byteLength(params[i][j]);
        continue;
      }
      if (params[i][j] === '\r' || params[i][j] === '\n') {
        offset += buffer.write(' ', offset);
      } else {
        offset += buffer.write(params[i][j], offset);
      }
    }
  }
  buffer[offset++] = 0x0D;
  buffer[offset++] = 0x0A;
  buffer.writeUInt16LE(offset, 0);
  buffer.writeUInt16LE(remaining, 2);
};

/** Send the {@link Message}
 *  If PRIVMSG text contains format specifiers, other args will fill them in.
 *  util.format only supports 3 simple specifiers:
 *    %s    String
 *    %d    Number
 *    %j    JSON
 *    %     Does nothing
 *  See http://nodejs.org/api/util.html
 *  @param  {Client}  client
 *  @return {Message}
 */
Message.prototype.send = function() {
  if (arguments.length && this.type === COMMAND.PRIVMSG) {
    let args = [this.params.pop()];
    args.push.apply(args, arguments);
    this.params.push(format.apply(null, args));
  }
  this.client.send(this);
  return this;
};

/** Reply to wherever a {@link Message} came from.
 *  @param  {string}  text
 *  @return {Message}
 */
Message.prototype.reply = function(text) {
  const sender  = this.params[0];
  const recip   = sender === this.client.user.nick ? this.from.nick : sender;
  const params  = [recip];
  if (arguments.length > 1) {
    let args = Array.apply(null, arguments);
    params.push(trailing(format.apply(null, args)));
  }
  else {
    params.push(trailing(text));
  }
  const msg = message(COMMAND.PRIVMSG, params);
  msg.client = this.client;
  msg.send();
  return msg;
};

/** Factory function for {@link Message} constructor.
 *  @throws {Error} if no matching signature was found
 *  @param {?Server|?Person|string} prefix   Prefix or command
 *  @param {Array|string=}          command  Command or params
 *  @param {Array=}                 params
 *  @return {Message}
 */
function message(prefix, command, params) {
  const argCount = arguments.length;
  switch (argCount) {
    case 2:
    return new Message(null, prefix, command);

    case 1:
    return new Message(null, prefix, []);

    case 3:
    return new Message(prefix, command, params);

    default:
    throw new Error("No matching signature");
  }
}

/** Prefix a trailing message param
 *  @param {string} text
 *  @return {string}
 */
function trailing(text) {
  return ":" + text;
}

exports.Message     = Message;
exports.message     = message;
exports.trailing    = trailing;

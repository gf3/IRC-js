/** @module message */

"use strict";

const format    = require("util").format;
const constants = require("./constants");

const COMMAND   = constants.COMMAND;

/** Maximum message length allowed by IRC, in bytes, excluding terminators. */
const MAX_LENGTH  = 510;

/** Message buffer size, includes two extra bytes for the terminating sequence,
 *  another two bytes specifying the message length, and finally two bytes
 *  specifying the number of remaining bytes, if any.
 */
const BUFFER_SIZE = MAX_LENGTH + 8;

/** Buffer that is reused for all messages.
 *  Not thread safAHAHAHAHA just kidding.
 */
const MESSAGE_BUFFER = new Buffer(BUFFER_SIZE);

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

/** Serialize into a string suitable for transmission.
 *  @deprecated In favour of `toBuffer'.
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
 *  The Buffer size is always 513 bytes, and the last byte tells you the number
 *  of bytes that didn't fit into the message, so that you can handle it.
 *  @return {Buffer}
 */
Message.prototype.toBuffer = function() {
  const buffer  = MESSAGE_BUFFER;
  const from    = this.from;
  const type    = this.type;
  const params  = this.params;
  let offset    = 0;
  let remaining = 0;
  // Prefix
  if (from) {
    buffer[offset++] = 0x3A;
    // Server
    if (from.name) {
      buffer.write(from.name, offset);
      offset += Buffer.byteLength(from.name);
    }
    // Person
    else if (from.nick) {
      buffer.write(from.nick, offset);
      offset += from.nick.length;
      if (from.host) {
        if (from.user) {
          buffer[offset++] = 0x21;
          buffer.write(from.user, offset);
          offset += from.user.length;
        }
        buffer[offset++] = 0x40;
        buffer.write(from.host, offset);
        offset += from.host.length;
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
    buffer.write(params[i], offset);
    offset += Buffer.byteLength(params[i]);
  }
  // Too much data, discard it and report the remaining number of bytes.
  if (offset > MAX_LENGTH) {
    remaining = offset - MAX_LENGTH;
    offset = MAX_LENGTH;
  }
  buffer[offset++]    = 0x0D;
  buffer[offset++]    = 0x0A;
  buffer.writeUInt16LE(offset, BUFFER_SIZE - 4);
  buffer.writeUInt16LE(remaining, BUFFER_SIZE - 2);
  return buffer;
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

function getRemainingBytes(buf) {
  return buf.readUInt16LE(BUFFER_SIZE - 2);
};

function getByteLength(buf) {
  return buf.readUInt16LE(BUFFER_SIZE - 4);
};

exports.Message     = Message;
exports.message     = message;
exports.trailing    = trailing;

exports.BUFFER_SIZE       = BUFFER_SIZE;
exports.getByteLength     = getByteLength;
exports.getRemainingBytes = getRemainingBytes;

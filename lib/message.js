/** @module message */

"use strict";

const format    = require("util").format;
const constants = require("./constants");

const COMMAND   = constants.COMMAND;

/** Construct a shiny message object.
 *  @todo {jonas} When available, use rest params instead of params array
 *
 *  @constructor
 *  @param {?Server|?Person} from
 *  @param {string}          type   Usually something from COMMAND, ERROR or REPLY
 *  @param {Array}           params
 *  @param {Client=}         client
 *  @property {Date}            date
 *  @property {?Server|?Person} from
 *  @property {string}          type
 *  @property {Array}           params
 */
function Message(from, type, params, client) {
  this.client = client || null;
  this.date   = new Date();
  this.from   = from;
  this.type   = type;
  this.params = params;
}

Object.defineProperty(Message.prototype, "forMe", {
  get: function() {
    return this.client ? forMe(this, this.client.user.nick) : false;
  }
});

function forMe(msg, nick) {
  const msgText   = msg.params[1];
  const hasNick   = new RegExp(format("^:\\s*%s\\b", nick), "i").test(msgText);
  const hasPrefix = /^:[!,./\?@`]/.test(msgText);
  const isQuery   = msg.params[0] === nick;
  return hasNick || hasPrefix || isQuery;
}

/** Serialize into a string suitable for transmission.
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
}

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
    console.log(this.params);
  }
  this.client.send(this);
  return this;
}

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
}

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


exports.Message   = Message;
exports.message   = message;
exports.trailing  = trailing;

/** @module person
 */

"use strict";

const format      = require("util").format;
const constants   = require("./constants");
const logger      = require("./logger");
const messagemod  = require("./message");
const util        = require("./util");

const cache     = util.cache;
const id        = util.id;
const message   = messagemod.message;
const property  = util.property;
const trailing  = messagemod.trailing;

const COMMAND   = constants.COMMAND;
const ERROR     = constants.ERROR;
const EVENT     = constants.EVENT;
const REPLY     = constants.REPLY;
const STATUS    = constants.STATUS;

const log = logger.get("ircjs");

/** @constructor
 *  @param {string}     name  Channel name
 *  @property {Set}     mode
 *  @property {string}  name
 *  @property {Map}     people
 *  @property {string}  topic
 */
function Channel(name) {
  this.client = null;
  this.people = new Map();
  this.name   = name;
  this.topic  = "";
  this.mode   = new Set();
}

Channel.prototype.toString = function() {
  return this.name;
};

property(Channel.prototype, "id", function() { return id(this.name); });

/** Send a {@link Message} to a {@link Channel}.
 *
 *  @param  {string}  text
 *  @return {Channel}
 */
Channel.prototype.say = function(text) {
  this.client.send(message(COMMAND.PRIVMSG, [this.name, trailing(text)]));
  return this;
};

Channel.prototype.join = function(key, callback) {
  const params = [this.name];
  if (arguments.length === 1) {
    callback = key instanceof Function ? key : null;
    key = callback ? null : key;
  }
  if (callback) {
    anticipateJoin.call(this, callback);
  }
  if (key) {
    params.push(key);
  }
  this.client.send(message(COMMAND.JOIN, params));
  return this;
};

Channel.prototype.invite = function(person) {
  const nick = person.nick ? person.nick : person;
  this.client.send(message(COMMAND.INVITE, [nick, this.name]));
  return this;
};

Channel.prototype.kick = function(person) {
  const nick = person.nick ? person.nick : person;
  this.client.send(message(COMMAND.KICK, [this.name, nick]));
  return this;
};

Channel.prototype.notify = function(note) {
  this.client.send(message(COMMAND.NOTICE, [this.name, trailing(note)]));
  return this;
};

Channel.prototype.part = function(txt) {
  // Someone tried to part a channel we're not in, what do?
  if (!this.client.channels.has(this.id)) {
    return this;
  }
  this.client.part(this.name, txt);
  return this;
};

Channel.prototype.setMode = function(mode) {
  this.client.send(message(COMMAND.MODE, [this.name, mode]));
  return this;
};

Channel.prototype.setTopic = function(topic) {
  this.client.send(message(COMMAND.TOPIC, [this.name, trailing(topic)]));
  return this;
};

/** Make a Channel object
 *  @throws {Error} if no matching signature was found
 *  @param  {string} name
 *  @return {Channel}
 */
function channel(name) {
  if (arguments.length === 0) {
    throw new Error("No matching signature");
  }
  const cid = id(name);
  if (cache.has(cid)) {
    return cache.get(cid);
  }
  const chan = new Channel(name);
  cache.set(chan.id, chan);
  return chan;
}

/** For joining channels
 *  RFC 2812 §3.2.1
 *
 *  If a JOIN is successful, the user receives a JOIN message as
 *  confirmation and is then sent the channel's topic (using RPL_TOPIC) and
 *  the list of users who are on the channel (using RPL_NAMREPLY), which
 *  MUST include the user joining.
 *
 *  Numeric replies:
 *
 *    ERR_NEEDMOREPARAMS    ERR_BANNEDFROMCHAN
 *    ERR_INVITEONLYCHAN    ERR_BADCHANNELKEY
 *    ERR_CHANNELISFULL     ERR_BADCHANMASK
 *    ERR_NOSUCHCHANNEL     ERR_TOOMANYCHANNELS
 *    ERR_TOOMANYTARGETS    ERR_UNAVAILRESOURCE
 *    RPL_TOPIC
 *
 * @this {Channel}
 * @param {function} callback
 */
function anticipateJoin(callback) {
  this.client.match(EVENT.ANY, handleJoinReply.bind(this, callback));
  return this;
}

function handleJoinReply(callback, msg) {
  const cmd = msg.type;
  const chn = ERROR.NOINVITEFORWARD === cmd ? msg.params[1]
            : REPLY.NAMREPLY === cmd ? msg.params[2] : msg.params[0];
  let error   = null;
  let status  = STATUS.INITIAL;

  if (cmd === ERROR.NEEDMOREPARAMS &&
      msg.params[0] === COMMAND.JOIN) {
    throw new Error("The impossible happened. IRC-js tried to join a channel" +
      "but didn't send enough parameters");
  }
  if (chn !== this.name) {
    return status;
  }

  switch (cmd) {
    case ERROR.BANNEDFROMCHAN:
    case ERROR.INVITEONLYCHAN:
    case ERROR.BADCHANNELKEY:
    case ERROR.CHANNELISFULL:
    case ERROR.BADCHANMASK:
    case ERROR.NOSUCHCHANNEL:
    case ERROR.TOOMANYCHANNELS:
    case ERROR.TOOMANYTARGETS:
    case ERROR.UNAVAILRESOURCE:
    error = msg.params[1].slice(1);
    break;

    case ERROR.NOINVITEFORWARD:
    status |= STATUS.REMOVE;
    // Not sure if this is a good idea
    this.name = msg.params[2];
    error = msg.params[3].slice(1);
    break;

    // Let's skip this and give a callback on name reply instead
    case REPLY.TOPIC:
    break;

    case REPLY.NAMREPLY:
    status |= STATUS.SUCCESS | STATUS.REMOVE;
    log.debug("Got name reply for %s, JOIN callback time", this.name);
    callback(null, this);
    break;

    default:
    log.debug("Fell through the giant join switch. Message: %s", msg);
    break;
  }
  if (error) {
    status |= STATUS.ERROR | STATUS.REMOVE;
    error = new Error(error);
    callback(error, this);
  }
  return status;
}

exports.Channel = Channel;
exports.channel = channel;

/** @module receivers
 *  Default receivers which make all the fancy stuff work.
 */

"use strict";

const channel   = require("./channel").channel;
const constants = require("./constants");
const format    = require("util");
const id        = require("./util").id;
const logger    = require("./logger");
const message   = require("./message").message;
const parser    = require("./parser");
const person    = require("./person").person;
const trailing  = require("./message").trailing;

const COMMAND   = constants.COMMAND;
const ERROR     = constants.ERROR;
const EVENT     = constants.EVENT;
const LEVEL     = constants.LEVEL;
const MODE      = constants.MODE;
const REPLY     = constants.REPLY;
const STATUS    = constants.STATUS;

const log = logger.get("ircjs");

// Commands
function onJoinCommand(msg) {
  /** @todo {jonas} Do some clients use a trailing param for channel name?
      Saw some of those in the fixtures. */
  const name = msg.params[0];
  const chan = channel(name);
  const user = msg.from;
  const self = user.id === this.user.id;
  if (self) {
    chan.client = this;
    chan.people.set(this.user.id, this.user);
    this.channels.set(chan.id, chan);
    log.info("Successfully joined %s", chan.name);
    return STATUS.SUCCESS;
  }
  user.client = this;
  log.debug("Adding user %s to channel %s", user.nick, chan.name);
  this.channels.get(chan.id).people.set(user.id, user);
  if (-1 === user.channels.indexOf(chan)) {
    user.channels.push(chan);
  }
  else {
    log.error("Got JOIN for user %s and channel %s, while %s was already in the channel",
      user.nick, chan.name, user.nick);
  }
  return STATUS.SUCCESS;
}

function onKickCommand(msg) {
  // Not sure if anyone makes use of it, but KICK commands may use two comma-
  // separated lists of equal length; one of channels and one of users.
  const chans = msg.params[0].split(",");
  const users = msg.params[1].split(",");
  let i = 0, j = 0;
  let k = users.length;
  let l = chans.length;
  let user = null;
  let chan = null;
  while (l--) {
    if (!(chan = this.channels.get(id(chans[l])))) {
      continue;
    }
    for (i = 0; i < k; ++i) {
      user = person(users[i]);
      log.debug("%s was kicked from %s, removing them", user.nick, chan.name);
      chan.people.delete(user.id);
      if (user.id === this.user.id) {
        // They hate the bot and want it gone :'(
        log.debug("I was kicked from %s, removing it", chan.name);
        this.channels.delete(chan.id);
      }
      let ix = user.channels.indexOf(chan);
      if (-1 !== ix) {
        user.channels.splice(ix, 1);
      }
      else {
        log.error("%s was not in %s, but got KICK message", user.nick, chan.name);
      }
    }
  }
  return STATUS.SUCCESS;
}

function onModeCommand(msg) {
  const param   = msg.params[0];
  const target  = param === this.user.nick ? this.user :
                  this.channels.get(id(param)) || person(param);
  const modes   = parser.parseMode(msg.params[1].replace(/^:/, ""));
  if (!target) {
    log.warn("Got mode %s for %s, dunno what to do", msg.params[1], param);
    return STATUS.ERROR;
  }
  if (this.user === target) {
    log.debug("Setting mode %s for myself", msg.params[1]);
  }
  else {
    log.debug("Setting mode %s for %s", msg.params[1], target);
  }
  for (let i = 0, m = modes.get(0x2B), l = m.length; i < l; ++i) {
    target.mode.add(m[i]);
  }
  for (let i = 0, m = modes.get(0x2D), l = m.length; i < l; ++i) {
    target.mode.delete(m[i]);
  }
  return STATUS.SUCCESS;
};

function onNickCommand(msg) {
  if (msg.from.nick === this.user.nick) {
    this.user.nick = msg.params[0];
  }
  return STATUS.SUCCESS;
}

function onPartCommand(msg) {
  const name = msg.params[0];
  const nick = msg.from.nick;
  const chan = this.channels.get(id(name));
  if (chan && chan.people.has(id(nick))) {
    chan.people.delete(id(nick));
    log.debug("Removing %s from %s", nick, chan);
    if (nick === this.user.nick) {
      log.debug("Left %s, removing it", chan);
      this.channels.delete(id(name));
    }
    return STATUS.SUCCESS;
  }
  if (chan) {
    log.error("Got a part message from %s for channel %s, but %s was not in that channel",
      nick, name, nick);
    return STATUS.ERROR;
  }
  log.error("Got a part message from %s for channel %s, which I am not in",
    nick, name);
  return STATUS.ERROR;
}

function onPingCommand(ping) {
  const reply = message(COMMAND.PONG, ping.params);
  this.send(reply);
  return STATUS.SUCCESS;
}

function onTopicCommand(msg) {
  const chan  = this.channels.get(id(msg.params[0]));
  const topic = msg.params[1].slice(1);
  if (chan) {
    if (chan.topic) {
      log.debug("Updating topic for %s from %s to %s",
        chan, chan.topic, topic);
    }
    else {
      log.debug("Setting topic for %s to %s", chan, topic);
    }
    chan.topic = topic;
    return STATUS.SUCCESS;
  }
  log.warn("Got a topic (%s) for channel %s, which I am not in",
    topic, msg.params[0]);
  return STATUS.ERROR;
}

function onQuitCommand(msg) {
  const user = msg.from;
  log.debug("Got a quit message for %s, removing them from all channels", user);
  user.channels.forEach(function(chan) {
    chan.people.delete(user.id);
  });
  return STATUS.SUCCESS;
}

// Numeric replies
function onMyInfoReply(msg) {
  const name = msg.params[1];
  log.debug("Updating server name from %s to %s", this.server.name, name);
  this.server.name = name;
  return STATUS.SUCCESS | STATUS.REMOVE;
}

function onNameReply(msg) {
  const chan  = this.channels.get(id(msg.params[2]));
  const nicks = msg.params[3].split(" ");
  const count = nicks.length;
  if (!chan) {
    log.error("Got a name reply for unknown channel %s", msg.params[2]);
    return STATUS.ERROR;
  }
  for (let i = 0, p = null, prsn = null; i < count; ++i) {
    // @todo Use real parser
    prsn = person(nicks[i].replace(/^[:@+~%&]/, ""));
    chan.people.set(prsn.id, prsn); // @todo Go ask for user info
    log.debug("Adding user %s to channel %s", prsn.nick, chan);
  }
  return STATUS.SUCCESS;
}

function onTopicReply(msg) {
  const chan  = this.channels.get(id(msg.params[1]));
  const topic = msg.params[2].slice(1);
  if (chan) {
    log.debug("Setting topic for %s to %s", chan, topic);
    chan.topic = topic;
    return STATUS.SUCCESS;
  }
  log.warn("Got a topic, %s, for channel %s, which I am not in",
    topic, msg.params[1]);
  return STATUS.ERROR;
}

function onWelcomeReply(msg) {
  const nick = msg.params[0];
  log.debug("Setting nick to", nick);
  this.user.nick = nick;
  return STATUS.SUCCESS | STATUS.REMOVE;
}

function onAnyError(msg) {
  const num = msg.type;
  if (isNaN(num) || num < 400 || num >= 600) {
    return STATUS.SUCCESS;
  }
  this.notify(EVENT.ERROR, msg);
  log.error("Received error %s from %s with params %s",
    msg.type, msg.from, msg.params.join(", "));
  return STATUS.ERROR;
}

function onForwardError(msg) {
  const from  = msg.params[1];
  const to    = msg.params[2];
  if (this.channels.has(id(to))) {
    log.debug("Forwarded from %s to %s, which already existed", from, to);
    return STATUS.ERROR;
  }
  const chan = channel(to);
  chan.people.set(this.user.id, this.user);
  this.channels.delete(id(from));
  this.channels.set(chan.id, chan);
  log.info("Got forwarded from %s to %s, adding %s", from, to, to);
  return STATUS.ERROR;
}

function load(client) {
  // Commands
  client.match(COMMAND.JOIN,   onJoinCommand);
  client.match(COMMAND.KICK,   onKickCommand);
  client.match(COMMAND.MODE,   onModeCommand);
  client.match(COMMAND.NICK,   onNickCommand);
  client.match(COMMAND.PART,   onPartCommand);
  client.match(COMMAND.PING,   onPingCommand);
  client.match(COMMAND.TOPIC,  onTopicCommand);
  client.match(COMMAND.QUIT,   onQuitCommand);

  // Numeric replies
  client.match(REPLY.MYINFO,   onMyInfoReply);
  client.match(REPLY.NAMREPLY, onNameReply);
  client.match(REPLY.TOPIC,    onTopicReply);
  client.match(REPLY.WELCOME,  onWelcomeReply);

  // Errors
  client.match(EVENT.ANY,              onAnyError);
  client.match(ERROR.NOINVITEFORWARD,  onForwardError);
}

exports.load = load;

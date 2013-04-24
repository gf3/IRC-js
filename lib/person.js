/** @module person
 */

"use strict";

const format      = require("util").format;
const constants   = require("./constants");
const messagemod  = require("./message");
const util        = require("./util");

const id        = util.id;
const message   = messagemod.message;
const property  = util.property;
const trailing  = messagemod.trailing;

const COMMAND   = constants.COMMAND;

const personCache = new Map();

/** @constructor
 *  @param    {string}    nick
 *  @param    {?string}   user
 *  @param    {?string}   host
 *  @property {string}    nick
 *  @property {?string}   user
 *  @property {?string}   host
 *  @property {Set}       mode
 *  @property {Array}     channels
 */
function Person(nick, user, host) {
  this.client   = null;
  this.nick     = nick;
  this.user     = user;
  this.host     = host;
  this.mode     = new Set();
  // This sucks, but will have to do until harmony collections suck less.
  this.channels = [];
}

/** Serialize person into prefix string
 *  @return {string}
 */
Person.prototype.toString = function() {
  return this.nick + (this.host ? (this.user ? "!"
       + this.user : "") + "@" + this.host : "")
}

property(Person.prototype, "id", function() { return id(this.nick) });

/** Make a Person object
 *  @throws {Error} if no matching signature was found
 *  @param {string}  nick
 *  @param {?string} user
 *  @param {?string} host
 *  @return {Person}
 */
function person(nick, user, host) {
  if (arguments.length === 0 || arguments.length > 3) {
    throw new Error("No matching signature");
  }
  const pid = id(nick);
  if (personCache.has(pid)) {
    return personCache.get(pid);
  }
  const p = new Person(nick, user || null, host || null);
  personCache.set(p.id, p);
  return p;
}

/** Send a {@link Message} to a {@link Person}.
 *
 *  @param  {string}  text
 *  @return {Person}
 */
Person.prototype.say = function(text) {
  this.client.send(message(COMMAND.PRIVMSG, [this.nick, trailing(text)]));
  return this;
}

/**
 *  @param  {Channel|string}  chan
 *  @return {Person}
 */
Person.prototype.inviteTo = function(chan) {
  const name = chan.name ? chan.name : chan;
  this.client.send(message(COMMAND.INVITE, [this.nick, name]));
  return this;
}

/**
 *  @param  {Channel|string}  chan
 *  @return {Person}
 */
Person.prototype.kickFrom = function(chan) {
  const name = chan.name ? chan.name : chan;
  this.client.send(message(COMMAND.KICK, [name, this.nick]));
  return this;
}

/**
 *  @param  {text}    note
 *  @return {Person}
 */
Person.prototype.notify = function(note) {
  this.client.send(message(COMMAND.NOTICE, [this.nick, trailing(note)]));
  return this;
}

Person.prototype.setMode = function(mode) {
  this.client.send(message(COMMAND.MODE, [this.nick, mode]));
  return this;
}

exports.Person  = Person;
exports.person  = person;

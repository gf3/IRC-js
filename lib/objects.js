/** @module objects
 */

"use strict";

const channel = require("./channel");
const message = require("./message");
const person  = require("./person");
const server  = require("./server");
const util    = require("./util");

// Constructors
exports.Message = message.Message;
exports.Server  = server.Server;
exports.Person  = person.Person;
exports.Channel = channel.Channel;

// Factory functions
exports.message = message.message;
exports.channel = channel.channel;
exports.person  = person.person;

exports.id        = util.id;
exports.trailing  = message.trailing;

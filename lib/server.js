/** @module server
 */

"use strict";

const format    = require("util").format;
const constants = require("./constants");

const COMMAND   = constants.COMMAND;

/** @constructor
 *  @param {string}   name
 *  @param {number=}  port
 *  @property {string} name
 *  @property {number} port
 */
function Server(name, port) {
  this.client = null;
  this.name   = name;
  this.port   = port || 6667;
}

/** Serialize server into string
 *  @return {string}
 */
Server.prototype.toString = function() {
  return this.name
}

Server.prototype.getVersion = function(callback) {
  this.client.send(message(COMMAND.VERSION, [this.name]));
  return this;
}

exports.Server  = Server;
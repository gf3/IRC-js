/** @module server
 */

"use strict";

const constants = require("./constants");
const format    = require("util").format;
const util      = require("./util");

const COMMAND   = constants.COMMAND;
const id        = util.id;


const DEFAULT_PORT  = 6667;

const serverCache   = new Map();

/** @constructor
 *  @param {string}   name
 *  @param {number=}  port
 *  @property {string} name
 *  @property {number} port
 */
function Server(name, port) {
  this.client = null;
  this.name   = name;
  this.port   = port;
}

/** Serialize server into string
 *  @return {string}
 */
Server.prototype.toString = function() {
  return this.name;
}

Server.prototype.getVersion = function(callback) {
  this.client.send(message(COMMAND.VERSION, [this.name]));
  return this;
}

/** Make a Server object
 *  @throws {TypeError}
 *  @param  {string} name
 *  @return {Channel}
 */
function server(name, port) {
  if (!name) {
    throw new TypeError();
  }
  const sid = util.id(name);
  if (serverCache.has(sid)) {
    return serverCache.get(sid);
  }
  const server = new Server(name, port ? port : DEFAULT_PORT);
  serverCache.set(server.id, server);
  return server;
}

exports.Server  = Server;
exports.server  = server;
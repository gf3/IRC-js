/** @module server
 */

"use strict";

const net       = require('net');
const tls       = require('tls');

const constants = require("./constants");
const format    = require("util").format;
const util      = require("./util");

const COMMAND   = constants.COMMAND;
const id        = util.id;


const DEFAULT_PORT  = 6667;

const serverCache   = new Map();

/** @constructor
 *  @param {string}     name
 *  @param {number=}    port
 *  @param {bool}       ssl
 *  @property {string}  name
 *  @property {number}  port
 *  @property {bool}    ssl
 */
function Server(name, port, ssl) {
  this.client = null;
  this.name   = name;
  this.port   = port;
  this.ssl    = ssl;
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

/** Create a socket connection
 * @return {Socket}
 */
Server.prototype.connect = function() {
  if (this.ssl) {
    return tls.connect(this.port, this.name, this.ssl);
  } else {
    return net.connect(this.port, this.name);
  }
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

/** @module server
 */

const format    = require( "util" ).format
    , constants = require( "./constants" )

const COMMAND   = constants.COMMAND

/** @constructor
 *  @param {string}   name
 *  @param {number=}  port
 *  @property {string} name
 *  @property {number} port
 */
const Server = function( name, port ) {
  this.name = name
  this.port = port || 6667
}

/** Serialize server into string
 *  @return {string}
 */
Server.prototype.toString = function() {
  return this.name
}

/**
 *  @param  {Client} client
 *  @return {Server}
 */
Server.prototype.for  = function( client ) {
  this.getVersion = getVersion.bind( this, client )
  return this
}

/** @this {Server}
 */
const getVersion = function( client, callback ) {
  if ( arguments.length === 2 ) { /** @todo wat */ }
  client.send( message( COMMAND.VERSION, [ this.name ] ) )
  return this
}

/** @this {Server}
 */
const list = function() {}

exports.Server  = Server

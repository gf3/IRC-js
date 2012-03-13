/**
 * @module objects
 * High-level objects representing the basic components of IRC.
 */
const constants = require( "./constants" )
    , COMMAND   = constants.COMMAND
    , ERROR     = constants.ERROR
    , REPLY     = constants.REPLY

/**
 * Helper function for creating properties
 * @this  {!Object}
 * @param {!string}   name
 * @param {!function} get
 * @param {?function} set
 * @return {!Object}  same as @this
 */
const property = function( name, get, set ) {
  return set
    ? Object.defineProperty( this, name, { get: get, set: set } )
    : Object.defineProperty( this, name, { get: get } )
}

/**
 * TODO when available, use rest params instead of params array
 * @constructor
 * @param {?Server|?Person} prefix
 * @param {!string}         command  Usually something from COMMAND, ERROR or REPLY
 * @param {!Array}          params
 * @property {?Server|?Person} prefix
 * @property {!string}         command
 * @property {!Array}          params
 */
const Message = function( prefix, command, params ) {
  this.prefix  = prefix
  this.command = command
  this.params  = params
}

/**
 * Serialize message object into a string suitable for transmission.
 * @return {string}
 */
Message.prototype.toString = function() {
  const params = this.params
      , parts  = []
  if ( this.prefix !== null )
    parts.push( ":" + this.prefix )
  parts.push( this.command )
  if ( params.length !== 0 )
    parts.push( params.join( " " ) )
  // TODO chunk it up? Or should that stay at a lower level?
  // if so maybe appending "\r\n" should too?
  return parts.join( " " ) + "\r\n"
}

/**
 * @constructor
 * @property {string} name
 */
const Server = function( name ) {
  this.name = name
}

/**
 * Serialize server into prefix string
 * @return {string}
 */
Server.prototype.toString = function() {
  return this.name
}

/**
 * @constructor
 * @param {!string} nick
 * @param {?string} user
 * @param {?string} host
 * @property {!string} nick
 * @property {?string} user
 * @property {?string} host
 */
const Person = function( nick, user, host ) {
  this.nick = nick
  this.user = user
  this.host = host
}

/**
 * Serialize person into prefix string
 * @return {string}
 */
Person.prototype.toString = function() {
  return this.nick + ( this.user ? "!" + this.user : "" )
       + ( this.host ? "@" + this.host : "" )
}

/**
 * @constructor
 * @param {!string} name
 * @property {!string} name
 * @property {!number} flags
 * @property {!Array.<Person>} users
 */
const Channel = function( name ) {
  this.users = []
  this.name  = name
  this.flags = 0
}

Channel.prototype.toString = function() {
  return this.name
}

exports.Message = Message
exports.Server  = Server
exports.Person  = Person
exports.Channel = Channel

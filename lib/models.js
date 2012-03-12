/**
 * @module objects
 * High-level objects representing the basic components of IRC.
 */
const constants = require( "./constants" )
    , CMD = constants.CMD
    , ERR = constants.ERR
    , RPL = constants.RPL

/**
 * @constructor
 * @property {?Server|?Person} prefix
 * @property {!CMD|!ERR|!RPL}  command
 * @property {!Array}          params
 */
const Message = function( prefix, command, params ) {
  // Wanted to use Object.defineProperties for get-only props
  // but it's so unreadable and ugly.
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
  parts.push( this.command, params.join( " " ) )
  return parts.join( " " ) + "\r\n"
}

/**
 * @constructor
 * @property {string} name
 */
const Server = function( name ) {
  this.name = name
}

Server.prototype.toString = function() {
  return this.name
}

/**
 * @constructor
 * @property {!string} nick
 * @property {?string} user
 * @property {?string} host
 */
const Person = function( nick, user, host ) {
  this.nick = nick
  this.user = user
  this.host = host
}

Person.prototype.toString = function() {
  return this.nick + ( this.user ? "!" + this.user : "" )
       + ( this.host ? "@" + this.host : "" )
}

/**
 * @constructor
 * @property {!string}         name
 * @property {!Array.<Person>} users
 */
const Channel = function( name ) {
  const users = []
  this.name = name
}

exports.Message = Message
exports.Server  = Server
exports.Person  = Person
exports.Channel = Channel

/** @module objects
 *  High-level IRC objects.
 */
const format    = require( "util" ).format
    , constants = require( "./constants" )
    , im        = require( "./ircmap" )

const COMMAND   = constants.COMMAND
    , ERROR     = constants.ERROR
    , MODE      = constants.MODE
    , REPLY     = constants.REPLY

/** Construct a shiny message object.
 *  @todo {jonas} When available, use rest params instead of params array
 *
 *  @constructor
 *  @param {?Server|?Person} prefix
 *  @param {string}          command  Usually something from COMMAND, ERROR or REPLY
 *  @param {Array}           params
 *  @property {?Server|?Person} prefix
 *  @property {string}          command
 *  @property {Array}           params
 */
const Message = function( prefix, command, params ) {
  this.prefix  = prefix
  this.command = command
  this.params  = params
}

/** Serialize message object into a string suitable for transmission.
 *  @return {string}
 */
Message.prototype.toString = function() {
  const params = this.params
      , parts  = []
  if ( this.prefix !== null )
    parts.push( ":" + this.prefix )
  parts.push( this.command )
  if ( params.length !== 0 )
    parts.push( params.join( " " ) )
  return parts.join( " " )
}

/** @constructor
 *  @param {string}    name
 *  @property {string} name
 */
const Server = function( name ) {
  this.name = name
}

/** Serialize server into string
 *  @return {string}
 */
Server.prototype.toString = function() {
  return this.name
}

/** @constructor
 *  @param {string}  nick
 *  @param {?string} user
 *  @param {?string} host
 *  @property {string}  nick
 *  @property {?string} user
 *  @property {?string} host
 *  @property {number}  mode
 */
const Person = function( nick, user, host ) {
  this.nick = nick
  this.user = user
  this.host = host
  this.mode = 0
}

/** Serialize person into prefix string
 *  @return {string}
 */
Person.prototype.toString = function() {
  return this.nick + ( this.host ? ( this.user ? "!"
       + this.user : "" ) + "@" + this.host : "" )
}

/** @constructor
 *  @param {string} name
 *  @property {number} mode
 *  @property {string} name
 *  @property {IRCMap} people
 *  @property {string} topic
 */
const Channel = function( name ) {
  this.people = new im.IRCMap( Person )
  this.name   = name
  this.topic  = ""
  this.mode   = 0
}

Channel.prototype.toString = function() {
  return this.name
}

/** Augments objects with methods for communicating with an {@link IRC} instance
 *  while keeping it hidden.
 *
 *  @this {Message|Channel|Person|Server}
 *  @param {IRC} irc
 *  @return {*} Same as `this`
 */
const with_ = function( irc ) {
  switch ( this.constructor ) {
    case Message:
      this.reply = reply.bind( this, irc )
      this.send  = send.bind( this, irc )
      break
    case Channel:
      this.people.with( irc )
      this.invite   = invite.bind( this, irc )
      this.join     = join.bind( this, irc )
      this.kick     = kick.bind( this, irc )
      this.part     = part.bind( this, irc )
      this.notify   = notify.bind( this, irc )
      this.say      = tell.bind( this, irc )
      this.setMode  = setMode.bind( this, irc )
      this.setTopic = setTopic.bind( this, irc )
      break
    case Person:
      this.inviteTo = invite.bind( this, irc )
      this.kickFrom = kick.bind( this, irc )
      this.notify   = notify.bind( this, irc )
      this.tell     = tell.bind( this, irc )
      break
    case Server:
      this.getVersion = getVersion.bind( this, irc )
    default:
      throw Error( format( "Unknown thisect %s", this ) )
  }

  return this
}

Message.prototype.with = with_
Channel.prototype.with = with_
Person.prototype.with  = with_
Server.prototype.with  = with_

/** Relay a PRIVMSG {@link Message} 
 *
 *  @this {Channel|Person}
 *  @param {IRC}    irc  An {@link IRC} instance
 *  @param {string} text
 *  @return {Channel|Person} Same as obj
 */
const tell = function( irc, text ) {
  irc.send( message( COMMAND.PRIVMSG, [ this, trailing( text ) ] ) )
  return this
}

/** @this {Message}
 *  @param {IRC} irc
 *  @return {Message}
 */
const send = function( irc ) {
  irc.send( this )
  return this
}

/** @this {Message}
 *  @param {IRC} irc
 *  @param {string} text
 *  @return {Message}
 */
const reply = function( irc, text ) {
  const sender  = this.params[0]
      , recip   = sender === irc.config.nick
                ? this.prefix.nick : sender
  irc.send( message( COMMAND.PRIVMSG
                  , [ recip, trailing( text ) ] ) )
  return this
}

/** @this {Channel}
 *  @param {IRC} irc
 *  @param {string} topic
 *  @param {function(Message)=} callback
 *  @return {Channel}
 */
const setTopic = function( irc, topic, callback ) {
  irc.send( message( COMMAND.TOPIC, [ this, trailing( topic ) ] ) )
  return this
}

/** @this {Channel|Person}
 *  @param {IRC} irc
 *  @param {Channel|Person|string} subject
 *  @return {Channel|Person}
 */
const invite = function( irc, subject ) {
  const isChan = this instanceof Channel
      , chan   = isChan ? this : subject
      , user   = isChan ? ( subject instanceof Person
                          ? subject.nick : subject )
                        : this.nick
  irc.send( message( COMMAND.INVITE, [ user, chan ] ) )
  return this
}

const join = function( irc, key, callback ) {
  const args = [ this ]
  if ( key )
    args.push( key )
  if ( callback )
    args.push( callback )
  irc.channels.add.apply( irc, args )
  return this
}

/** @this {Channel|Person}
 *  @param {IRC} irc
 *  @param {Channel|Person|string} subject
 *  @return {Channel|Person}
 */
const kick = function( irc, subject ) {
  const isChan = this instanceof Channel
      , from   = isChan ? this : subject
      , user   = isChan ? ( subject instanceof Person
                          ? subject.nick : subject )
                        : this.nick
  irc.send( message( COMMAND.KICK, [ from, user ] ) )
  return this
}

const part = function( irc ) {
  const chan = irc.channels.get( this )
  if ( ! chan ) // WAT DO
    return
  irc.send( message( COMMAND.PART, [ chan ] ) )
  return this
}

const getVersion = function( irc ) {
  irc.send( message( COMMAND.VERSION, [ this.name ] ) )
  return this
}

const notify = function( irc, note ) {
  irc.send( message( COMMAND.NOTICE
          , [ this, trailing( note ) ] ) )
  return this
}

const setMode = function( irc, mode ) {
  // @todo {jonas} Should it be optimistic or just wait for the MODE message?
  if ( Number === mode.constructor )
    mode = modeString( mode )
  irc.send( message( COMMAND.MODE
          , [ this, mode ] ) )
}

// Factory functions

/** Make a Message object
 *  @throws {Error} if no matching signature was found
 *  @param {?Server|?Person|string} prefix   Prefix or command
 *  @param {Array|string=}          command  Command or params
 *  @param {Array=}                 params
 *  @return {Message}
 */
const message = function( prefix, command, params ) {
  const argCount = arguments.length

  switch ( argCount ) {
    case 2:
      return new Message( null, prefix, command )
    case 1:
      return new Message( null, prefix, [] )
    case 3:
      return new Message( prefix, command, params )
    default:
      throw new Error( "No matching signature for %s" )
  }
}

/** Make a Channel object
 *  @throws {Error} if no matching signature was found
 *  @param {string} name
 *  @return {Channel}
 */
const channel = function( name ) {
  if ( arguments.length === 0 )
    throw new Error( "No matching signature" )
  /** @todo {jonas} Ensure that name is valid */
  return new Channel( name )
}

/** Make a Person object
 *  @throws {Error} if no matching signature was found
 *  @param {string}  nick
 *  @param {?string} user
 *  @param {?string} host
 *  @return {Person}
 */
const person = function( nick, user, host ) {
  if ( arguments.length === 0 || arguments.length > 3 )
    throw new Error( "No matching signature" )
  return new Person( nick, user ? user : null
                   , host ? host : null )
}

/** Prefix a trailing message param
 *  @param {string} text
 *  @return {string}
 */
const trailing = function( text ) {
  return ":" + text
}

// Quite silly, yes!
const modeString = function( mask, chars ) {
  const mode = []
  var set = null
    , b = 1
    , c
  chars = chars || MODE.CHAR.CHANNEL
  while ( ( c = chars[b] ) && ( b <<= 1 ) )
    if ( mask & chars[c] )
      set !== ( set = true ) ? mode.push( "+", c ) : mode.push( c )
    else
      set !== ( set = false ) ? mode.push( "-", c ) : mode.push( c )
  return mode.join( "" )
}

// Constructors
exports.Message = Message
exports.Server  = Server
exports.Person  = Person
exports.Channel = Channel
// Factory functions
exports.message = message
exports.channel = channel
exports.person  = person

exports.mode     = modeString
exports.trailing = trailing

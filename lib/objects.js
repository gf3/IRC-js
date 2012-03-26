/** @module objects
 *  High-level IRC objects.
 *  Most can be used with or without knowledge of an {@link IRC} instance.
 *  Therefore they have a method named `with`, which adds more methods
 *  when called with an {@link IRC} instance as argument.
 */
const format    = require( "util" ).format

    , constants = require( "./constants" )
    , map       = require( "./map" )
    , obs       = require( "./observable" )

const COMMAND   = constants.COMMAND
    , ERROR     = constants.ERROR
    , MODE      = constants.MODE
    , STATUS    = obs.STATUS
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

/** Serialize into a string suitable for transmission.
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
  this.people = map.IRCMap.of( Person )
  this.name   = name
  this.topic  = ""
  this.mode   = 0
}

Channel.prototype.toString = function() {
  return this.name
}

/**
 *  @param  {IRC} irc
 *  @return {Message}
 */
Message.prototype.for = function( irc ) {
  this.reply = reply.bind( this, irc )
  this.send  = send.bind( this, irc )
  return this
}

/**
 *  @param  {IRC} irc
 *  @return {Channel}
 */
Channel.prototype.for = function( irc ) {
  this.people.for( irc )
  this.invite   = invite.bind( this, irc )
  this.join     = join.bind( this, irc )
  this.kick     = kick.bind( this, irc )
  this.part     = part.bind( this, irc )
  this.notify   = notify.bind( this, irc )
  this.say      = say.bind( this, irc )
  this.setMode  = setMode.bind( this, irc )
  this.setTopic = setTopic.bind( this, irc )
  return this
}

/**
 *  @param  {IRC} irc
 *  @return {Person}
 */
Person.prototype.for  = function( irc ) {
  this.inviteTo = invite.bind( this, irc )
  this.kickFrom = kick.bind( this, irc )
  this.notify   = notify.bind( this, irc )
  this.tell     = say.bind( this, irc )
  return this
}

/**
 *  @param  {IRC} irc
 *  @return {Server}
 */
Server.prototype.for  = function( irc ) {
  this.getVersion = getVersion.bind( this, irc )
  return this
}

/** Send a {@link Message} to someone/somewhere.
 *
 *  @this {Channel|Person}
 *  @param {IRC}    irc  An {@link IRC} instance
 *  @param {string} text
 *  @return {Channel|Person} Same as obj
 */
const say = function( irc, text ) {
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

/** Reply to wherever a {@link Message} came from.
 *
 *  @this {Message}
 *  @param {IRC} irc
 *  @param {string} text
 *  @return {Message}
 */
const reply = function( irc, text ) {
  const sender  = this.params[0]
      , recip   = sender === irc.user.nick
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

/** @this {Channel}
 */
const join = function( irc, key, callback ) {
  const args  = Array.apply( null, arguments )
      , prms  = [ this.name ]
      , then  = args.pop()
      , chan  = irc.channels.add( this )
  // Don't call back until we have some users and fun stuff
  if ( then instanceof Function )
    irc.observe( REPLY.NAMREPLY, function( msg ) {
      if ( msg.params[2] !== chan.name )
        return STATUS.RETRY
      then( chan )
      return STATUS.REMOVE
    } )
  else if ( args.length === 2 )
    prms.push( args.pop() )
  else if ( args.length === 1 )
    prms.push( key )
  irc.send( message( COMMAND.JOIN, prms ) )
  return chan
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

/** @this {Channel|Person}
 */
const notify = function( irc, note ) {
  irc.send( message( COMMAND.NOTICE
          , [ this, trailing( note ) ] ) )
  return this
}

/** @this {Channel}
 */
const part = function( irc, txt ) {
  const chan   = irc.channels.get( this )
      , params = [ chan ]
  if ( ! chan ) // WAT DO
    return
  if ( txt )
    params.push( trailing( txt ) )
  irc.send( message( COMMAND.PART, params ) )
  return this
}

/** @this {Server}
 */
const getVersion = function( irc, callback ) {
  if ( arguments.length === 2 )
    irc.observe( ERROR.NOSUCHSERVER, REPLY.VERSION, function( msg ) {
      // @todo wat
    } )
  irc.send( message( COMMAND.VERSION, [ this.name ] ) )
  return this
}

/** @this {Server}
 */
const list = function() {}

/** @this {Channel|Person}
 */
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
  return new Person( nick, user || null
                   , host || null )
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
      set !== ( set = true  ) ? mode.push( "+", c ) : mode.push( c )
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

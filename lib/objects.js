/** @module objects
 *  High-level IRC objects.
 *  Most can be used with or without knowledge of an {@link IRC} instance.
 *  Therefore they have a method named `with`, which adds more methods
 *  when called with an {@link IRC} instance as argument.
 */
const format    = require( "util" ).format
    , constants = require( "./constants" )
    , log       = require( "./logger" )
    , map       = require( "./map" )
    , obs       = require( "./notifications" )

const COMMAND   = constants.COMMAND
    , ERROR     = constants.ERROR
    , EVENT     = constants.EVENT
    , LEVEL     = log.LEVEL
    , MODE      = constants.MODE
    , STATUS    = obs.STATUS
    , REPLY     = constants.REPLY

const logger = log.get( "ircjs" )

/** @todo {jonas} Switch to WeakMap or something when available,
 *  so that objects can be GC'd if there are no other refs to them.
 */
const channels  = {}
    , people    = channels
    , servers   = people

/** Make a nice canonical ID for our objects, taking into account
 *  that the characters {}|^ are considered to be the lower case equivalents
 *  of the characters []\~ in IRC.
 */
const getChar = function( c ) { return chars[c] }
    , charRE  = /[|{}^]/g
    , prefix  = "$"
    , chars   =
      { '{': '['
      , '}': ']'
      , '|': '\\'
      , '^': '~'
      }

const id = function( s ) {
  return prefix + s.toUpperCase().replace( charRE, getChar )
}

const property = function( obj, name, getter, setter ) {
  const argc = arguments.length
  switch ( argc ) {
    case 3:
      if ( getter instanceof Function )
        Object.defineProperty( obj, name, { get: getter } )
      else
        Object.defineProperty( obj, name, { value: getter } )
      break
    case 4:
      Object.defineProperty( obj, name, { get: getter, set: setter } )
      break
    default:
      throw new Error()
  }
  return obj
}

/** Construct a shiny message object.
 *  @todo {jonas} When available, use rest params instead of params array
 *
 *  @constructor
 *  @param {?Server|?Person} from
 *  @param {string}          type   Usually something from COMMAND, ERROR or REPLY
 *  @param {Array}           params
 *  @property {Date}            date
 *  @property {?Server|?Person} from
 *  @property {string}          type
 *  @property {Array}           params
 */
const Message = function( from, type, params ) {
  this.date   = new Date()
  this.from   = from
  this.type   = type
  this.params = params
}

/** Serialize into a string suitable for transmission.
 *  @return {string}
 */
Message.prototype.toString = function() {
  const params = this.params
      , parts  = []
  if ( this.from !== null )
    parts.push( ":" + this.from )
  parts.push( this.type )
  if ( params.length !== 0 )
    parts.push( params.join( " " ) )
  return parts.join( " " )
}

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

property( Person.prototype,  "id", function() { return id( this.nick ) } )

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

property( Channel.prototype, "id", function() { return id( this.name ) } )

/**
 *  @param  {Bot} irc
 *  @return {Message}
 */
Message.prototype.for = function( irc ) {
  this.reply = reply.bind( this, irc )
  this.send  = send.bind( this, irc )
  return this
}

/**
 *  @param  {Bot} irc
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
 *  @param  {Bot} irc
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
 *  @param  {Bot} irc
 *  @return {Server}
 */
Server.prototype.for  = function( irc ) {
  this.getVersion = getVersion.bind( this, irc )
  return this
}

/** Send a {@link Message} to someone/somewhere.
 *
 *  @this {Channel|Person}
 *  @param {Bot}    irc  An {@link IRC} instance
 *  @param {string} text
 *  @return {Channel|Person} Same as obj
 */
const say = function( irc, text ) {
  irc.send( message( COMMAND.PRIVMSG, [ this, trailing( text ) ] ) )
  return this
}

/** @this {Message}
 *  @param {Bot} irc
 *  @return {Message}
 */
const send = function( irc ) {
  irc.send( this )
  return this
}

/** Reply to wherever a {@link Message} came from.
 *
 *  @this {Message}
 *  @param {Bot} irc
 *  @param {string} text
 *  @return {Message}
 */
const reply = function( irc, text ) {
  const sender  = this.params[0]
      , recip   = sender === irc.user.nick
                ? this.from.nick : sender
  irc.send( message( COMMAND.PRIVMSG
                  , [ recip, trailing( text ) ] ) )
  return this
}

/** @this {Channel}
 *  @param {Bot} irc
 *  @param {string} topic
 *  @param {function(Message)=} callback
 *  @return {Channel}
 */
const setTopic = function( irc, topic, callback ) {
  irc.send( message( COMMAND.TOPIC, [ this, trailing( topic ) ] ) )
  return this
}

/** @this {Channel|Person}
 *  @param {Bot} irc
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
  const prms = [ this.name ]
  if ( arguments.length === 2 ) {
    callback = key instanceof Function ? key : null
    key = callback ? null : key
  }
  if ( callback )
    anticipateJoin.call( this, irc, callback )
  if ( key )
    prms.push( key )
  irc.send( message( COMMAND.JOIN, prms ) )
  return this
}

/** @this {Channel|Person}
 *  @param {Bot} irc
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
  var cached
  if ( arguments.length === 0 )
    throw new Error( "No matching signature" )
  if ( cached = channels[ id( name ) ] )
    return cached
  cached = new Channel( name )
  return channels[ cached.id ] = cached
}

/** Make a Person object
 *  @throws {Error} if no matching signature was found
 *  @param {string}  nick
 *  @param {?string} user
 *  @param {?string} host
 *  @return {Person}
 */
const person = function( nick, user, host ) {
  var cached
  if ( arguments.length === 0 || arguments.length > 3 )
    throw new Error( "No matching signature" )
  if ( cached = people[ id( nick ) ] )
    return cached
  cached = new Person( nick, user || null
                     , host || null )
  return people[ cached.id ] = cached
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

/** For joining channels
 *  RFC 2812 §3.2.1
 *
 *  If a JOIN is successful, the user receives a JOIN message as
 *  confirmation and is then sent the channel's topic (using RPL_TOPIC) and
 *  the list of users who are on the channel (using RPL_NAMREPLY), which
 *  MUST include the user joining.
 *
 *  Numeric replies:
 *
 *    ERR_NEEDMOREPARAMS    ERR_BANNEDFROMCHAN
 *    ERR_INVITEONLYCHAN    ERR_BADCHANNELKEY
 *    ERR_CHANNELISFULL     ERR_BADCHANMASK
 *    ERR_NOSUCHCHANNEL     ERR_TOOMANYCHANNELS
 *    ERR_TOOMANYTARGETS    ERR_UNAVAILRESOURCE
 *    RPL_TOPIC
 *
 * @this {Channel}
 * @param {Bot} irc
 * @param {function} callback
 */
const anticipateJoin = function( irc, callback ) {
  irc.observe( EVENT.ANY, handleJoinReply.bind( this, callback ) )
  return this
}

const handleJoinReply = function( callback, msg ) {
  const cmd = msg.type
      , chn = ERROR.NOINVITEFORWARD === cmd ? msg.params[1]
            : REPLY.NAMREPLY === cmd ? msg.params[2] : msg.params[0]
  var error   = null
    , status  = STATUS.INITIAL

  if ( cmd === ERROR.NEEDMOREPARAMS
      && msg.params[0] === COMMAND.JOIN ) // No way to know if it was for *this* channel...
    throw new Error( "The impossible happened. IRC-js tried to join a channel but didn't send enough parameters" )

  if ( chn !== this.name )
    return status

  switch ( cmd ) {
    case ERROR.BANNEDFROMCHAN:
    case ERROR.INVITEONLYCHAN:
    case ERROR.BADCHANNELKEY:
    case ERROR.CHANNELISFULL:
    case ERROR.BADCHANMASK:
    case ERROR.NOSUCHCHANNEL:
    case ERROR.TOOMANYCHANNELS:
    case ERROR.TOOMANYTARGETS:
    case ERROR.UNAVAILRESOURCE:
      error = msg.params[1].slice( 1 )
      break
    case ERROR.NOINVITEFORWARD:
      status |= STATUS.REMOVE
      // Not sure if this is a good idea
      // :holmes.freenode.net 470 ircjsbot #jquery-ot #pro-verflow :Forwarding to another channel
      this.name = msg.params[2]
      error = msg.params[3].slice( 1 )
      break
    // Let's skip this and give a callback on name reply instead
    case REPLY.TOPIC:
      break
    case REPLY.NAMREPLY:
      status |= STATUS.SUCCESS | STATUS.REMOVE
      logger.log( LEVEL.DEBUG, "[DEBUG] Got name reply for %s, JOIN callback time", this.name )
      callback( this )
      break
    default:
      logger.log( LEVEL.DEBUG, "[DEBUG] Fell through the giant join switch. Message: %s", msg )
      break
  }
  if ( error ) {
    status |= STATUS.ERROR | STATUS.REMOVE
    error = new Error( error )
    callback( this, error )
  }
  return status
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

exports.id        = id
exports.mode      = modeString
exports.trailing  = trailing

exports.cache = people

/** @module objects
 *  High-level IRC objects.
 *  Most can be used with or without knowledge of an {@link IRC} instance.
 *  Therefore they have a method named `with`, which adds more methods
 *  when called with an {@link IRC} instance as argument.
 */
const format    = require( "util" ).format
    , constants = require( "./constants" )
    , log       = require( "./logger" )
    , obs       = require( "./notifications" )

const COMMAND   = constants.COMMAND
    , ERROR     = constants.ERROR
    , EVENT     = constants.EVENT
    , LEVEL     = log.LEVEL
    , MODE      = constants.MODE
    , STATUS    = constants.STATUS
    , REPLY     = constants.REPLY

const logger = log.get( "ircjs" )

const cache = new Map()

/** Make an ID for our objects, taking IRC case insensitivity into account.
 *  IRC defines the characters {}|^ to be the lower-case equivalents of  []\~.
 *  This is important for determining if nicknames and other things are equivalent.
 */
const charRE  = /[|{}^]/g
    , chars   = new Map()

chars.set( '{', '[' )
chars.set( '}', ']' )
chars.set( '|', '\\' )
chars.set( '^', '~' )

// It annoys me to no end that you must use bind() or other tricks to *not*
// have methods blow up when you pass them as arguments. For shame, JS.
const getChar = chars.get.bind( chars )

const id = function( s ) {
  return s.toUpperCase().replace( charRE, getChar )
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
 *  @property {Set}     mode
 */
const Person = function( nick, user, host ) {
  this.nick = nick
  this.user = user
  this.host = host
  this.mode = new Set()
}

/** Serialize person into prefix string
 *  @return {string}
 */
Person.prototype.toString = function() {
  return this.nick + ( this.host ? ( this.user ? "!"
       + this.user : "" ) + "@" + this.host : "" )
}

property( Person.prototype, "id", function() { return id( this.nick ) } )

/** @constructor
 *  @param {string} name
 *  @property {Set}     mode
 *  @property {string}  name
 *  @property {Map}     people
 *  @property {string}  topic
 */
const Channel = function( name ) {
  this.people = new Map()
  this.name   = name
  this.topic  = ""
  this.mode   = new Set()
}

Channel.prototype.toString = function() {
  return this.name
}

property( Channel.prototype, "id", function() { return id( this.name ) } )

/**
 *  @param  {Client} client
 *  @return {Message}
 */
Message.prototype.for = function( client ) {
  this.reply = reply.bind( this, client )
  this.send  = send.bind( this, client )
  return this
}

/**
 *  @param  {Client} client
 *  @return {Channel}
 */
Channel.prototype.for = function( client ) {
  this.invite   = invite.bind( this, client )
  this.join     = join.bind( this, client )
  this.kick     = kick.bind( this, client )
  this.part     = part.bind( this, client )
  this.notify   = notify.bind( this, client )
  this.say      = say.bind( this, client )
  this.setMode  = setMode.bind( this, client )
  this.setTopic = setTopic.bind( this, client )
  return this
}

/**
 *  @param  {Client} client
 *  @return {Person}
 */
Person.prototype.for  = function( client ) {
  this.inviteTo = invite.bind( this, client )
  this.kickFrom = kick.bind( this, client )
  this.notify   = notify.bind( this, client )
  this.tell     = say.bind( this, client )
  return this
}

/**
 *  @param  {Client} client
 *  @return {Server}
 */
Server.prototype.for  = function( client ) {
  this.getVersion = getVersion.bind( this, client )
  return this
}

/** Send a {@link Message} to someone/somewhere.
 *
 *  @this {Channel|Person}
 *  @param {Client} client  A {@link Client} instance
 *  @param {string} text
 *  @return {Channel|Person}  Same as obj
 */
const say = function( client, text ) {
  client.send( message( COMMAND.PRIVMSG, [ this, trailing( text ) ] ) )
  return this
}

/** @this {Message}
 *  @param {Client} client
 *  @return {Message}
 */
const send = function( client ) {
  client.send( this )
  return this
}

/** Reply to wherever a {@link Message} came from.
 *
 *  @this {Message}
 *  @param {Client} client
 *  @param {string} text
 *  @return {Message}
 */
const reply = function( client, text ) {
  const sender  = this.params[0]
      , recip   = sender === client.user.nick
                ? this.from.nick : sender
  client.send( message( COMMAND.PRIVMSG
           , [ recip, trailing( text ) ] ) )
  return this
}

/** @this {Channel}
 *  @param {Client} client
 *  @param {string} topic
 *  @param {function(Message)=} callback
 *  @return {Channel}
 */
const setTopic = function( client, topic, callback ) {
  client.send( message( COMMAND.TOPIC, [ this, trailing( topic ) ] ) )
  return this
}

/** @this {Channel|Person}
 *  @param {Client} client
 *  @param {Channel|Person|string} subject
 *  @return {Channel|Person}
 */
const invite = function( client, subject ) {
  const isChan = this instanceof Channel
      , chan   = isChan ? this : subject
      , user   = isChan ? ( subject instanceof Person
                          ? subject.nick : subject )
                        : this.nick
  client.send( message( COMMAND.INVITE, [ user, chan ] ) )
  return this
}

/** @this {Channel}
 */
const join = function( client, key, callback ) {
  const params = [ this.name ]
  if ( arguments.length === 2 ) {
    callback = key instanceof Function ? key : null
    key = callback ? null : key
  }
  if ( callback )
    anticipateJoin.call( this, client, callback )
  if ( key )
    params.push( key )
  client.send( message( COMMAND.JOIN, params ) )
  return this
}

/** @this {Channel|Person}
 *  @param {Client} client
 *  @param {Channel|Person|string} subject
 *  @return {Channel|Person}
 */
const kick = function( client, subject ) {
  const isChan = this instanceof Channel
      , from   = isChan ? this : subject
      , user   = isChan ? ( subject instanceof Person
                          ? subject.nick : subject )
                        : this.nick
  client.send( message( COMMAND.KICK, [ from, user ] ) )
  return this
}

/** @this {Channel|Person}
 */
const notify = function( client, note ) {
  client.send( message( COMMAND.NOTICE
           , [ this, trailing( note ) ] ) )
  return this
}

/** @this {Channel}
 */
const part = function( client, txt ) {
  // Someone tried to part a channel we're not in, what do?
  if ( ! client.channels.has( this.id ) )
    return
  client.part( this.name, txt )
  return this
}

/** @this {Server}
 */
const getVersion = function( client, callback ) {
  if ( arguments.length === 2 )
    client.observe( ERROR.NOSUCHSERVER, REPLY.VERSION, function( msg ) {
      // @todo wat
    } )
  client.send( message( COMMAND.VERSION, [ this.name ] ) )
  return this
}

/** @this {Server}
 */
const list = function() {}

/** @this {Channel|Person}
 */
const setMode = function( client, mode ) {
  client.send( message( COMMAND.MODE
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
      throw new Error( "No matching signature" )
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
  const cid = id( name )
  if ( cache.has( cid ) )
    return cache.get( cid )
  const chan = new Channel( name )
  return cache.set( chan.id, chan )
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
  const pid = id( nick )
  if ( cache.has( pid ) )
    return cache.get( pid )
  const p = new Person( nick, user || null, host || null )
  return cache.set( p.id, p )
}

/** Prefix a trailing message param
 *  @param {string} text
 *  @return {string}
 */
const trailing = function( text ) {
  return ":" + text
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
 * @param {Client} client
 * @param {function} callback
 */
const anticipateJoin = function( client, callback ) {
  client.observe( EVENT.ANY, handleJoinReply.bind( this, callback ) )
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
exports.trailing  = trailing

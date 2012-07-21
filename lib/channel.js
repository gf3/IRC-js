/** @module person
 */

const format      = require( "util" ).format
    , constants   = require( "./constants" )
    , logger      = require( "./logger" )
    , messagemod  = require( "./message" )
    , util        = require( "./util" )

const cache     = util.cache
    , id        = util.id
    , message   = messagemod.message
    , property  = util.property
    , trailing  = messagemod.trailing

const COMMAND   = constants.COMMAND
    , ERROR     = constants.ERROR
    , EVENT     = constants.EVENT
    , REPLY     = constants.REPLY
    , STATUS    = constants.STATUS
    
const log = logger.get( "ircjs" )

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

/** Send a {@link Message} to a {@link Channel}.
 *
 *  @this   {Channel}
 *  @param  {Client}  client
 *  @param  {string}  text
 *  @return {Channel}
 */
const say = function( client, text ) {
  client.send( message( COMMAND.PRIVMSG, [ this, trailing( text ) ] ) )
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

/** @this   {Channel}
 *  @param  {Client}        client
 *  @param  {Person|string} person
 *  @return {Channel}
 */
const invite = function( client, person ) {
  const nick = person.nick || person
  client.send( message( COMMAND.INVITE, [ nick, this ] ) )
  return this
}

/** @this   {Channel}
 *  @param  {Client}          client
 *  @param  {Person|string}   person
 *  @return {Channel}
 */
const kick = function( client, person ) {
  client.send( message( COMMAND.KICK, [ this, person ] ) )
  return this
}

/** @this   {Channel}
 *  @return {Channel}
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

/** @this   {Channel}
 *  @return {Channel}
 */
const setMode = function( client, mode ) {
  client.send( message( COMMAND.MODE
           , [ this, mode ] ) )
  return this
}

/** @this   {Channel}
 *  @param  {Client} client
 *  @param  {string} topic
 *  @param  {function} callback
 *  @return {Channel}
 */
const setTopic = function( client, topic, callback ) {
  client.send( message( COMMAND.TOPIC, [ this, trailing( topic ) ] ) )
  return this
}

/** Make a Channel object
 *  @throws {Error} if no matching signature was found
 *  @param  {string} name
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
  client.listen( EVENT.ANY, handleJoinReply.bind( this, callback ) )
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
      this.name = msg.params[2]
      error = msg.params[3].slice( 1 )
      break
    // Let's skip this and give a callback on name reply instead
    case REPLY.TOPIC:
      break
    case REPLY.NAMREPLY:
      status |= STATUS.SUCCESS | STATUS.REMOVE
      log.debug( "Got name reply for %s, JOIN callback time", this.name )
      callback( this )
      break
    default:
      log.debug( "Fell through the giant join switch. Message: %s", msg )
      break
  }
  if ( error ) {
    status |= STATUS.ERROR | STATUS.REMOVE
    error = new Error( error )
    callback( this, error )
  }
  return status
}

exports.Channel = Channel
exports.channel = channel

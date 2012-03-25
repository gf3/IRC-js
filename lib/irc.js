/** @module irc
 *  An IRC library for node.js
 *
 *  http://www.faqs.org/rfcs/rfc1459.html :)
 *  http://irchelp.org/irchelp/rfc/ :D
 *
 *  @todo {jonas} Handle this:
 *    Because of IRC's Scandinavian origin, the characters {}|^ are
 *    considered to be the lower case equivalents of the characters []\~,
 *    respectively. This is a critical issue when determining the
 *    equivalence of two nicknames, or channel names.
 */

    // Exported in Makefile
const TEST   = process.env["IRCJS_TEST"] ? true : false
    , stream = TEST ? [ __dirname, "..", "spec", "mockstream" ]
                    : [ "net" ]

    // Standard imports
const events    = require( "events" )
    , fs        = require( "fs" )
    , path      = require( "path" )
    , tls       = require( "tls" )
    // Relative imports
    , constants = require( "./constants" )
    , map       = require( "./map" )
    , log       = require( "./logger" )
    // THE OLD SWITCHEROO HAHAHAHA
    , net       = require( path.join.apply( path, stream ) )
    , objects   = require( "./objects" )
    , observe   = require( "./observable" )
    , observers = require( "./observers" )
    , parser    = require( "./parser" )

    // Constructors
const Channel   = objects.Channel
    , IRCMap    = map.IRCMap
    , Message   = objects.Message
    , Person    = objects.Person
    , Server    = objects.Server
    // Factory functions
    , message   = objects.message
    , channel   = objects.channel
    , person    = objects.person
    // Helpers
    , trailing  = objects.trailing
    // Constants
    , COMMAND   = constants.COMMAND
    , ERROR     = constants.ERROR
    , EVENT     = constants.EVENT
    , LEVEL     = log.LEVEL
    , MODE      = constants.MODE
    , REPLY     = constants.REPLY
    , STATUS    = observe.STATUS

// Level is (re)set later, when config is read
const logger = log.get( "ircjs", LEVEL.ALL )

/** Helper for reading the config file
 *  @param {string} conf
 *  @return {Object}
 */
const getConfig = function( conf ) {
  const confFile = conf ? conf : path.join( process.cwd(), "config.json" )
  return JSON.parse( fs.readFileSync( confFile, "utf8" ) )
}

// Maximum message length, not counting the "\r\n" terminating sequence
const MAXLEN = 510

/** IRC!
 *  The star of the show.
 *
 *  @constructor
 *  @param {string=}  config  Path to config file. Defaults to "config.json" in current directory.
 *  @property {IRCMap} channels
 */
const IRC = function( config ) {
  config = getConfig( config )

  logger.level = LEVEL.fromString( config["log"] )

  const internal  =
      { buffer: []
      , connected: false
      , connectedSince: null
      , queue: [] /** @todo {jonas} Implement queueing and backoff for ALL THE THINGS */
      , socket: null
      }

  this.config     = config

  this.channels   = new IRCMap( Channel ).with( this )
  this.observers  = new observe.Observable().for( this )

  // Priviliged methods
  this.connect        = connect.bind( this, internal )
  this.disconnect     = disconnect.bind( this, internal )
  this.send           = send.bind( this, internal )
  this.setMode        = setMode.bind( this, internal )

  // Regular methods
  this.quit = quit.bind( this )

  // Default observers
  this.observe( COMMAND.JOIN,   observers[COMMAND.JOIN].bind( this ) )
  this.observe( COMMAND.MODE,   observers[COMMAND.MODE].bind( this ) )
  this.observe( COMMAND.NICK,   observers[COMMAND.NICK].bind( this ) )
  this.observe( COMMAND.PART,   observers[COMMAND.PART].bind( this ) )
  this.observe( COMMAND.PING,   observers[COMMAND.PING].bind( this ) )
  this.observe( COMMAND.TOPIC,  observers[COMMAND.TOPIC].bind( this ) )

  this.observe( REPLY.NAMREPLY, observers[REPLY.NAMREPLY].bind( this ) )
  this.observe( REPLY.TOPIC,    observers[REPLY.TOPIC].bind( this ) )
  this.observe( REPLY.WELCOME,  observers[REPLY.WELCOME].bind( this ) )

  // :(
  if ( TEST )
    this._internal = internal
}

/** @private
 *  @this {IRC}
 *  @param {Object} internal
 *  @return {IRC}
 */
const onConnect = function( internal ) {
  const user = this.config.user
      , mode = user.mode ? parser.mode( user.mode, MODE.CHAR.USER )[0] : 0
  internal.connected = true
  internal.connectedSince = new Date()

  if ( user.password )
    this.send( message( COMMAND.PASS, [ user.password ] ) )

  this.send( message( COMMAND.NICK, [ this.config.nick ] ) )
  sendUser.call( this, user.username, user.realname, mode )

  return this
}

/** Disconnect from server.
 *
 *  @this {IRC}
 *  @param {Object} internal
 *  @return {IRC}
 */
const disconnect = function( internal ) {
  const since = internal.connectedSince
  internal.connectedSince = null
  internal.queue.splice( 0 )
  internal.connected = false
  internal.socket.end()
  internal.socket = null
  this.observers.notify( EVENT.DISCONNECT )
  this.observers.clear()
  if ( since )
    logger.log( LEVEL.INFO
              , "[INFO]  Connected at %s, disconnected at %s"
              , since, new Date() )
  return this
}

/** @this {IRC}
 *  @param {Object} internal
 *  @return {IRC}
 */
const onData = function( internal, data ) {
  var buffer
    , last
    , message
    , i, l

  // Apply previous buffer, split, re-buffer
  if ( 0 !== internal.buffer.length ) {
    internal.buffer.push( data )
    data = internal.buffer.splice( 0 ).join( "" )
  }

  buffer = data.split( "\r\n" )

  if ( last = buffer.pop() )
    internal.buffer.push( last )

  // Emit!
  l = buffer.length
  for ( i = 0, l = buffer.length; i < l; ++i ) {
    logger.log( LEVEL.INFO, "[RECV]  %s", buffer[i] )

    message = parser.message( buffer[i] + "\r\n", this.config.die )

    if ( null === message ) {
      logger.log( LEVEL.ERROR, "[ERROR] Failed parsing %s", buffer[i] )
      continue
    }
    // Give superpowers
    message.with( this )

    this.observers.notify( EVENT.ANY, message )
    this.observers.notify( message.command, message )
  }
}

/** @this {IRC}
 *  @param {Object}     internal
 *  @param {?function=} callback
 *  @return {IRC}
 */
const connect = function( internal, callback ) {
  // Pick an appropriate connection method
  const connect =
    this.config.server.ssl ? tls.connect : net.connect

  if ( internal.connected ) {
    logger.log( LEVEL.WARN, "[WARN]  Already connected at %s", internal.connectedSince )
    return this
  }

  internal.socket = connect( this.config.server.port, this.config.server.address )
  internal.socket.setEncoding( this.config.encoding )
  internal.socket.setTimeout( 0 )

  internal.socket.addListener( "connect", onConnect.bind( this, internal ) )
  internal.socket.addListener( "data", onData.bind( this, internal ) )
  internal.socket.addListener( "timeout", this.disconnect )

  if ( 2 === arguments.length ) // Do all servers send a 001 ?
    this.observe( REPLY.WELCOME
                , function( _ ) {
                    callback()
                    return STATUS.SUCCESS | STATUS.REMOVE } )

  // Forward network errors
  internal.socket.addListener( "error", function( er ) {
    this.observers.notify( EVENT.ERROR, er )
  })

  return this
}

/** Send a message
 *  @this {IRC}
 *  @param {Object}  internal
 *  @param {Message} message
 *  @return {IRC}
 */
const send = function( internal, message ) {
  const data  = message.toString()
      , chunk = data.length > MAXLEN ? data.slice( 0, MAXLEN ) : data
  return write.call( this, internal.socket, chunk )
}

/** Write to socket.
 *  @private
 *  @this {IRC}
 *  @param {Stream} sock
 *  @param {string} data
 *  @return {IRC}
 */
const write = function( sock, data ) {
  if ( sock.readyState !== "open" ) {
    logger.log( LEVEL.ERROR, "[ERROR] Socket is not open, but tried to send: %s", data )
    return this
  }
  const crlf = /\r\n$/.test( data ) ? "" : "\r\n"
  sock.write( data + crlf )
  logger.log( LEVEL.INFO, "[SENT]  %s", data )
  return this
}

/** Add an observer that gets notified if the predicate returns anything
 *  for any messsage. The predicate can also be a regular expression,
 *  or a string which will be converted into one.
 *
 *  @param {string=}                 command    Defaults to PRIVMSG
 *  @param {function|RegExp|string}  predicate
 *  @param {function}                handler
 *  @return {IRC}
 */
IRC.prototype.observeIf = function( command, predicate, handler ) {
  const args = Array.apply( null, arguments )
  handler   = args.pop()
  predicate = args.pop()
  command   = args.pop() || COMMAND.PRIVMSG
  const isFunc = predicate instanceof Function
      , regExp = isFunc ? null : predicate.constructor === String ? RegExp( predicate, "i" ) : predicate
      , predic = isFunc ? predicate : matchMessage.bind( this, regExp )
  return observeIf.call( this, command, predic, handler )
}

// Implementation of above
const matchMessage = function( re, msg ) {
  const match = msg.params[1].match( re )
      , data  = match ? [ msg ] : null
  if ( ! match )
    return false
  if ( ! match.global )
    match.shift()
  data.push.apply( data, match )
  return data
}

const observeIf = function( cmd, pred, then ) {
  const handler = function( msg ) {
    const test  = pred( msg )
    return test ? then.apply( this, test )
                : STATUS.ERROR | STATUS.RETRY
  }
  return this.observe( cmd, handler.bind( this ) )
}

/** @private
 *  @this {IRC}
 *  @param {string}  username
 *  @param {string}  realname
 *  @param {number=} flags     User mode flags mask
 *  @return {IRC}
 */
const sendUser = function( username, realname, flags ) {
  const // A bit gross, convert from our own values to the two defined in spec
        mode  = ( flags & MODE.USER.INVISIBLE ? 1 << 2 : 0 )
              | ( flags & MODE.USER.WALLOPS   ? 1 << 3 : 0 )
      , msg   = message( COMMAND.USER, [ username, mode, "*", trailing( realname ) ] )
  return this.send( msg )
}

/** Quit the server, with an optional message.
 *  When you call this, the bot will also disconnect.
 *
 *  Quit without a message:
 *  <code>ircInstance.quit()</code>
 *  Quit with a hilarious message:
 *  <code>ircInstance.quit( "LOLeaving!" )</code>
 *
 *  @this {IRC}
 *  @param {string=} reason   Your quit message
 *  @return {IRC}
 */
const quit = function( reason ) {
  const params = reason ? [ trailing( reason ) ] : []
  this.send( message( COMMAND.QUIT, params ) )
  return this.disconnect()
}

/** Set various user modes on yourself.
 *  For a full list of user modes, see: http://docs.dal.net/docs/modes.html#3
 *  De-op self:
 *  <code>ircInstance.setMode( "-o" )</code>
 *
 *  @param {Object} internal  Don't mind this
 *  @param {string} mode      The mode string
 */
const setMode = function( internal, mode ) {
  // 4.2.3.2
  return this.send( message( COMMAND.MODE, [ this.config.nick, mode ] ) )
}

/** @todo {jonas} Re-export anything that might be nice for users of lib */
exports.IRC   = IRC
exports.cache = { people: map.cache.people }

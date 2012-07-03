/** @module irc
 *  An IRC library for node.js
 *
 *  http://www.faqs.org/rfcs/rfc1459.html :)
 *  http://irchelp.org/irchelp/rfc/ :D
 */

    // Standard imports
const events    = require( "events" )
    , fs        = require( "fs" )
    , net       = require( "net" )
    , path      = require( "path" )
    , tls       = require( "tls" )
    // Relative imports
    , constants = require( "./constants" )
    , map       = require( "./map" )
    , log       = require( "./logger" )
    , notify    = require( "./notifications" )
    , objects   = require( "./objects" )
    , observers = require( "./observers" )
    , parser    = require( "./parser" )

    // Constructors
const Channel   = objects.Channel
    , IRCMap    = map.IRCMap
    , Message   = objects.Message
    , Observable= notify.Observable
    , Person    = objects.Person
    , Server    = objects.Server
    // Factory functions
    , message   = objects.message
    , channel   = objects.channel
    , person    = objects.person
    , server    = objects.server
    // Helpers
    , trailing  = objects.trailing
    // Constants
    , COMMAND   = constants.COMMAND
    , ERROR     = constants.ERROR
    , EVENT     = constants.EVENT
    , LEVEL     = log.LEVEL
    , MODE      = constants.MODE
    , REPLY     = constants.REPLY
    , STATUS    = notify.STATUS
    , SOCKET    = constants.SOCKET

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

/** Client: An IRC client wrapping up the server connection, configuration, message notifications
 *  and other things into an easy-to-use object.
 *
 *  @constructor
 *  @param {string=}  conf  Path to config file. Defaults to "config.json" in current directory.
 *  @property {IRCMap} channels
 */
const Client = function( conf ) {
  const config    = getConfig( conf )
      , server    = config.server
      , internal  =
        { buffer: []
        , connected: false
        , connectedSince: null
        , queue: [] /** @todo {jonas} Implement queueing and backoff for ALL THE THINGS */
        , socket: null
        }

  logger.level = LEVEL.fromString( config["log"] )

  this.config     = config

  this.server     = new Server( server.address, server.port )
  this.user       = new Person( config["nick"], null, null )

  this.channels   = IRCMap.of( Channel ).for( this )
  this.observers  = Observable.of( this ).for( this )

  // Priviliged methods
  this.connect        = connect.bind( this, internal )
  this.disconnect     = disconnect.bind( this, internal )
  this.send           = send.bind( this, internal )
}

/** @private
 *  @this {Client}
 *  @param {Object} internal
 *  @return {Client}
 */
const onConnect = function( internal ) {
  const user = this.config.user
      , mode = user.mode ?
               parser.mode( user.mode, MODE.USER ).get( "+" ) : ""
  internal.connected = true
  internal.connectedSince = new Date()

  if ( user.password )
    this.send( message( COMMAND.PASS, [ user.password ] ) )

  this.send( message( COMMAND.NICK, [ this.user.nick ] ) )
  sendUser.call( this, user.username, user.realname, mode )

  return this
}

/** Disconnect from server.
 *
 *  @this {Client}
 *  @param {Object} internal
 *  @return {Client}
 */
const disconnect = function( internal ) {
  const since = internal.connectedSince
  internal.queue.splice( 0 )
  internal.socket.end()
  internal.connected = false
  internal.connectedSince = null
  internal.socket = null
  this.observers.notify( EVENT.DISCONNECT )
  if ( since )
    logger.log( LEVEL.INFO
              , "[INFO]  Connected at %s, disconnected at %s"
              , since, new Date() )
  return this
}

/** @this {Client}
 *  @param {Object} internal
 *  @return {Client}
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
  for ( i = 0, l = buffer.length; i < l; ++i ) {
    logger.log( LEVEL.INFO, "[RECV]  %s", buffer[i] )

    message = parser.message( buffer[i] + "\r\n", this.config.die )

    if ( null === message ) {
      logger.log( LEVEL.ERROR, "[ERROR] Failed parsing %s", buffer[i] )
      continue
    }
    // Give superpowers
    message.for( this )

    this.observers.notify( message.type, message )
    this.observers.notify( EVENT.ANY, message )
  }
}

/** @this {Client}
 *  @param {Object}     internal
 *  @param {?function=} callback
 *  @return {Client}
 */
const connect = function( internal, callback ) {
  // Pick an appropriate connection method
  const connect =
    this.config.server.ssl ? tls.connect : net.connect

  if ( internal.connected ) {
    logger.log( LEVEL.WARN, "[WARN]  Already connected at %s", internal.connectedSince )
    return this
  }

  internal.socket = connect( this.server.port, this.server.name )
  internal.socket.setEncoding( this.config.encoding )
  internal.socket.setTimeout( 0 )

  internal.socket.addListener( SOCKET.CONNECT, onConnect.bind( this, internal ) )
  internal.socket.addListener( SOCKET.DATA, onData.bind( this, internal ) )
  internal.socket.addListener( SOCKET.TIMEOUT, this.disconnect )

  // Add all default observers
  observers.register( this )

  if ( 2 === arguments.length ) // Do all servers send a 001 ?
    this.observe( REPLY.WELCOME, function() {
      return callback( this ), STATUS.REMOVE }.bind( this ) )

  // Forward network errors
  internal.socket.addListener( SOCKET.ERROR
    , this.observers.notify.bind( this.observers, EVENT.ERROR ) )

  return this
}

/** Send a message
 *  @this {Client}
 *  @param {Object}  internal
 *  @param {Message} message
 *  @return {Client}
 */
const send = function( internal, message ) {
  const data  = message.toString()
      , chunk = data.length > MAXLEN ? data.slice( 0, MAXLEN ) : data
  return write.call( this, internal.socket, chunk )
}

/** Write to socket.
 *  @private
 *  @this {Client}
 *  @param {Stream} sock
 *  @param {string} data
 *  @return {Client}
 */
const write = function( sock, data ) {
  if ( sock.readyState !== "open" ) {
    logger.log( LEVEL.ERROR, "[ERROR] Socket is not open, but tried to send: %s", data )
    return this
  }
  const crlf = data.lastIndexOf( "\r\n" ) === data.length - 2 ? "" : "\r\n"
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
 *  @return {Client}
 */
Client.prototype.lookFor = function( command, predicate, handler ) {
  const args = Array.apply( null, arguments )
  handler   = args.pop()
  predicate = args.pop()
  command   = args.pop() || COMMAND.PRIVMSG
  const isFunc = predicate instanceof Function
      , regExp = isFunc ? null : predicate.constructor === String ? RegExp( predicate, "i" ) : predicate
      , predic = isFunc ? predicate : matchMessage.bind( this, regExp )
  return lookFor.call( this, command, predic, handler )
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

const lookFor = function( cmd, pred, then ) {
  const handler = function( msg ) {
    const test  = pred( msg )
    return test ? then.apply( this, test )
                : STATUS.ERROR | STATUS.RETRY
  }
  return this.observe( cmd, handler.bind( this ) )
}

/** @private
 *  @this {Client}
 *  @param {string}  username
 *  @param {string}  realname
 *  @param {string}  flags     User mode flags
 *  @return {Client}
 */
const sendUser = function( username, realname, flags ) {
  const // When sending a USER command, these flags have special integer values.
        mode  = ( flags.indexOf( 'i' ) === -1 ? 0 : 1 << 2 )
              | ( flags.indexOf( 'w' ) === -1 ? 0 : 1 << 3 )
      , msg   = message( COMMAND.USER, [ username, mode.toString()
                       , "*", trailing( realname ) ] )
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
 *  @this {Client}
 *  @param {string=} reason   Your quit message
 *  @return {Client}
 */
Client.prototype.quit = function( reason ) {
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
Client.prototype.setMode = function( mode ) {
  // 4.2.3.2
  return this.send( message( COMMAND.MODE, [ this.user.nick, mode ] ) )
}

const Success = function( message ) {
  this.message = message || ""
}

exports.Client  = Client

// Re-exports
exports.Channel = Channel
exports.Message = Message
exports.Person  = Person
exports.Server  = Server

exports.COMMAND = COMMAND
exports.ERROR   = ERROR
exports.EVENT   = EVENT
exports.LEVEL   = LEVEL
exports.MODE    = MODE
exports.REPLY   = REPLY
exports.STATUS  = STATUS

exports.channel = channel
exports.message = message
exports.person  = person
exports.server  = server

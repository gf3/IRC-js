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
    , constants = require( "./constants" )
    , log       = require( "./logger" )
    , notify    = require( "./notifications" )
    , objects   = require( "./objects" )
    , observers = require( "./observers" )
    , parser    = require( "./parser" )

    // Constructors
const Channel   = objects.Channel
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
    , NODE      = constants.NODE
    , REPLY     = constants.REPLY
    , STATUS    = constants.STATUS
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

// IRC message delimiter and message max length
const DELIM = "\r\n"
    , MAXLEN = 512 - DELIM.length

// Flood protection
const MINWAIT = 100
    , MAXWAIT = 5000

const backoff = function( f, ratio ) {
  const r = ratio || Math.E
  var lastCall = null
    , interval = MINWAIT
  return function() {
    const args = arguments
        , later = function() {
      const now  = Date.now()
          , wait = interval - ( now - lastCall )
      if ( wait > 0 )
        return setTimeout( later, wait )
      if ( r )
        interval = Math.min( MAXWAIT, interval * r )
      lastCall = now
      f.apply( null, args )
    }
    setTimeout( later, 0 )
  }
}

/** Client: An IRC client wrapping up the server connection, configuration, message notifications
 *  and other things into an easy-to-use object.
 *
 *  @constructor
 *  @param {string=}  conf  Path to config file. Defaults to "config.json" in current directory.
 *  @property {Map} channels
 */
const Client = function( conf ) {
  const config    = getConfig( conf )
      , server    = config.server
      , internal  =
        { buffer: []
        , connected: false
        , connectedSince: null
        , socket: null
        }

  logger.level = LEVEL.fromString( config["log"] )

  this.config     = config

  this.server     = new Server( server.address, server.port )
  this.user       = new Person( config["nick"], null, null )

  this.channels   = new Map()
  this.observers  = Observable.of( this ).for( this )

  // Priviliged methods
  this.connect        = connect.bind( this, internal )
  this.disconnect     = disconnect.bind( this, internal )

  if ( this.config[ "flood-protection" ] )
    this.send         = backoff( send.bind( this, internal ) )
  else
    this.send         = send.bind( this, internal )
}

/** @private
 *  @this {Client}
 *  @param {Object} internal
 *  @return {Client}
 */
const onConnect = function( internal ) {
  const user = this.config.user
      , mode = user.mode ?
               parser.mode( user.mode, MODE.USER ) : ""
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

  buffer = data.split( DELIM )

  if ( last = buffer.pop() )
    internal.buffer.push( last )

  // Emit!
  for ( i = 0, l = buffer.length; i < l; ++i ) {
    logger.log( LEVEL.INFO, "[RECV]  %s", buffer[i] )

    message = parser.message( buffer[i] + DELIM, this.config.die )

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

  internal.socket.addListener( NODE.SOCKET.EVENT.CONNECT, onConnect.bind( this, internal ) )
  internal.socket.addListener( NODE.SOCKET.EVENT.DATA, onData.bind( this, internal ) )
  internal.socket.addListener( NODE.SOCKET.EVENT.TIMEOUT, this.disconnect )

  // Add all default observers
  observers.register( this )

  if ( 2 === arguments.length ) // Do all servers send a 001 ?
    this.observe( REPLY.WELCOME, function() {
      return callback( this ), STATUS.REMOVE }.bind( this ) )

  // Forward network errors
  internal.socket.addListener( NODE.SOCKET.ERROR
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
  if ( sock.readyState !== NODE.SOCKET.STATE.OPEN ) {
    logger.log( LEVEL.ERROR, "[ERROR] Socket is not open, but tried to send: %s", data )
    return this
  }
  const crlf = data.lastIndexOf( DELIM ) === data.length - 2 ? "" : DELIM
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
  const args = []
  args.push.apply( args, arguments )
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
  const match = msg.params[ 1 ].match( re )
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

/** Join a channel
 *  @param {Channel|string} chan
 *  @param {string=}        pass
 *  @param {function=}      callback
 *  @return {Client}
 */
Client.prototype.join = function( chan /*, pass, callback*/ ) {
  /** My kingdom for proper overloading. This one has 4 signatures:
   *    join( chan, pass, callback )
   *    join( chan, pass )
   *    join( chan, cb )
   *    join( chan )
   *  I'm not JS enough to do it nicely, I'll just count them and prod a bit.
   */
  var channel_ = this.channels.get( chan.id || objects.id( chan ) )
    , password = null
    , callback = null
  switch ( arguments.length ) {
    case 3:
      password = arguments[ 1 ]
      callback = arguments[ 2 ]
      break
    case 2:
      // Either (chan, pass) or (chan, callback)
      if ( arguments[ 1 ].constructor === String )  // >_<
        password = arguments[ 1 ]
      else
        callback = arguments[ 1 ]
      break
    case 1:
      break
    default:
      throw new Error( "No matching signature" )
  }

  // We are already in it, but tell callback anyway, if there is one
  if ( channel_ ) {
    if ( callback )
      callback( channel_ )
    return channel_
  }
  // We got a proper Channel object, and this client's User is in it
  // That's the somewhat convoluted way of telling ourselves we've joined
  else if ( chan instanceof Channel
      && chan.people.has( this.user.id ) ) {
    this.channels.set( chan.id, chan )
    return chan
  }

  // All else failed, so construct and send a JOIN message
  const params = []
  if ( password )
    params.push( password )
  if ( callback )
    params.push( callback )
  if ( ! ( chan instanceof Channel ) )
    chan = channel( chan )
  return chan.for( this ).join.apply( chan, params )
}

Client.prototype.part = function( chan, msg ) {
  const ch = this.channels.get( chan.id || objects.id( chan ) )
  if ( ! ch )
    return this
  const params = [ ch.name ]
  if ( msg )
    params.push( msg )
  // This means that we have not left the channel yet
  if ( ch.people.has( this.user.id ) )
    this.send( message( COMMAND.PART, params ) )
  return this
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

/** @todo Remove when fixed in Node */
exports.NODE    = NODE

exports.channel = channel
exports.message = message
exports.person  = person
exports.server  = server

exports.id      = objects.id

// Submodules
exports.logger  = log
exports.parser  = parser

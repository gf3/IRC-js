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
    , listeners = require( "./listeners" )
    // THE OLD SWITCHEROO HAHAHAHA
    , net       = require( path.join.apply( path, stream ) )
    , objects   = require( "./objects" )
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
    , REPLY     = constants.REPLY
    , MODE      = constants.MODE

/** Helper for reading the config file
 *  @param {string} conf
 *  @return {Object}
 */
const getConf = function( conf ) {
  const confFile = conf ? conf : path.join( __dirname, "config.json" )
  return JSON.parse( fs.readFileSync( confFile, "utf8" ) )
}

// Maximum message length, not counting the "\r\n" terminating sequence
const MSGMAXLEN = 510

/** IRC!
 *  @constructor
 *  @param {?Object|string=} config  Either a path to a config file, or a config object
 *  @property {IRC{IRCMap} channels
 */
const IRC = function( config ) {
  const internal =
      { buffer: null
      , connected: false
      , connectedSince: null
      , emitter: new events.EventEmitter()
      , queue: [] /** @todo {jonas} Implement queueing and backoff for ALL THE THINGS */
      , socket: null
      }

  this.config   = getConf( config )
  this.channels = new IRCMap( Channel ).with( this )

  // Priviliged methods
  this.addListener    = addListener.bind( this, internal )
  this.connect        = connect.bind( this, internal )
  this.disconnect     = disconnect.bind( this, internal )
  this.listenOnce     = listenOnce.bind( this, internal )
  this.removeListener = removeListener.bind( this, internal )
  this.send           = send.bind( this, internal )
  this.setMode        = setMode.bind( this, internal )

  // Regular methods
  this.quit = quit.bind( this )

  // Default listeners
  this.addListener( COMMAND.JOIN,  listeners.command.join.bind( this ) )
  this.addListener( COMMAND.MODE,  listeners.command.mode.bind( this ) )
  this.addListener( COMMAND.NICK,  listeners.command.nick.bind( this ) )
  this.addListener( COMMAND.PART,  listeners.command.part.bind( this ) )
  this.addListener( COMMAND.PING,  listeners.command.ping.bind( this ) )
  this.addListener( COMMAND.TOPIC, listeners.command.topic.bind( this ) )

  this.addListener( REPLY.NAMREPLY, listeners.reply.name.bind( this ) )
  this.addListener( REPLY.TOPIC,    listeners.reply.topic.bind( this ) )
  this.addListener( REPLY.WELCOME,  listeners.reply.welcome.bind( this ) )

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

  internal.emitter.emit( EVENT.CONNECT )
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
  internal.queue.length = 0
  internal.connected = false
  internal.socket.end()
  internal.emitter.emit( EVENT.DISCONNECT )
  internal.emitter.removeAllListeners()
  if ( since )
    console.info( "[INFO]  Connected at %s, disconnected at %s"
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
    , i

  // Apply previous buffer, split, re-buffer
  if ( internal.buffer ) {
    data = internal.buffer + data
    internal.buffer = null
  }

  buffer = data.split( "\r\n" )

  if ( last = buffer.pop() )
    internal.buffer = last

  // Emit!
  for ( i = 0; i < buffer.length; ++i ) {
    console.log( "[RECV]  %s", buffer[i] )

    message = parser.message( buffer[i] + "\r\n", this.config.die )

    if ( null === message ) {
      console.error( "[ERROR] Failed parsing %s", buffer[i] )
      continue
    }
    // Give superpowers
    message.with( this )

    internal.emitter.emit( EVENT.ANY, message )
    internal.emitter.emit( message.command, message )
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
    console.warn( "[WARN]  Already connected (since %s)", internal.connectedSince )
    return this
  }

  internal.socket = connect( this.config.server.port, this.config.server.address )
  internal.socket.setEncoding( this.config.encoding )
  internal.socket.setTimeout( 0 )

  internal.socket.addListener( "connect", onConnect.bind( this, internal ) )
  internal.socket.addListener( "data", onData.bind( this, internal ) )
  internal.socket.addListener( "timeout", this.disconnect.bind( this ) )

  if ( 2 === arguments.length ) // Do all servers send a 001 ?
    this.listenOnce( REPLY.WELCOME, callback.bind( this ) )

  // Forward network errors
  internal.socket.addListener( "error", function( er ) {
    internal.emitter.emit( "error", er )
    internal.emitter.emit( "error:network", er )
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
      , chunk = data.length > MSGMAXLEN ? data.slice( 0, MSGMAXLEN ) : data
  return write.call( this, internal, chunk )
}

/** Write to socket.
 *  @private
 *  @this {IRC}
 *  @param {Object} internal
 *  @param {string} data
 *  @return {IRC}
 */
const write = function( internal, data ) {
  if ( internal.socket.readyState !== "open" ) {
    console.error( "[ERROR] Socket is not open, but tried to send: %s", data )
    return this
  }
  const crlf = /\r\n$/.test( data ) ? "" : "\r\n"
  internal.socket.write( data + crlf )
  console.log( "[SENT]  %s", data )
  return this
}

/** Listen for a certain event, usually an IRC command
 *  To listen for a PING message:
 *  <code>ircInstance.addListener( COMMAND.PING, pingListener )</code>
 *
 *  @this {IRC}
 *  @param {Object}   internal
 *  @param {string}   event
 *  @param {function} callback
 *  @return {IRC}
 */
const addListener = function( internal, event, callback ) {
  internal.emitter.addListener( event.toUpperCase(), callback.bind( this ) )
  return this
}

/** Add a listener that gets called if the predicate returns anything
 *  for any messsage. The predicate can also be a regular expression,
 *  or a string which will be converted into one.
 *
 *  @param {string=}                 command
 *  @param {function|RegExp|string}  predicate
 *  @param {function}                listener
 *  @return {IRC}
 */
IRC.prototype.listenFor = function( command, predicate, listener ) {
  if ( 2 === arguments.length )
    listener = predicate, predicate = command, command = COMMAND.PRIVMSG
  const isFunc = predicate instanceof Function
      , regExp = isFunc ? null : predicate.constructor === String? RegExp( predicate, "i" ) : predicate
      , predic = isFunc ? predicate : matchMessage.bind( this, regExp )
  return listenFor.call( this, command, predic, listener )
}

// Implementation of above
const matchMessage = function( regExp, message ) {
  const match = message.params[1].match( regExp )
      , data  = match ? [ message ] : null
  if ( ! match )
    return false
  match.shift()
  data.push.apply( data, match )
  return data
}

const listenFor = function( command, pred, then ) {
  const listener = function( msg ) {
    const res = pred( msg )
    if ( false === res )
      return
    then.apply( this, res )
  }
  return this.addListener( command, listener.bind( this ) )
}

/** Stop listening for incoming IRC messages.
 *  To stop listening for PING messages:
 *  <code>ircInstance.removeListener( "ping", pingListener )</code>
 *
 *  @this {IRC}
 *  @param {Object}   internal  Don't mind this
 *  @param {string}   event     The event type
 *  @param {function} listener
 *  @return {IRC}
 */
const removeListener = function( internal, event, listener ) {
  internal.emitter.removeListener( event, listener )
  return this
}

/** Like {@link removeListener}, except that the listener is
 *  removed after one event.
 *
 *  @this {IRC}
 *  @param {Object}   internal  Don't mind this
 *  @param {string}   event     The event type
 *  @param {function} listener
 *  @return {IRC}
 */
const listenOnce = function( internal, event, listener ) {
  internal.emitter.once( event, listener.bind( this ) )
  return this
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

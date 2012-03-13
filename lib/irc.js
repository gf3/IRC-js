// http://www.faqs.org/rfcs/rfc1459.html :)
// http://irchelp.org/irchelp/rfc/ :D

/**
 * @module IRC
 *
 * An IRC library for node.js
 */

const path      = require( "path" )
    , fs        = require( "fs" )
    , events    = require( "events" )
    , format    = require( "util" ).format
    , compiler  = require( "./compiler" )
    , constants = require( "./constants" )
    , models    = require( "./models" )
    , Channel   = models.Channel
    , Message   = models.Message
    , Person    = models.Person
    , Server    = models.Server
    , COMMAND   = constants.COMMAND
    , ERROR     = constants.ERROR
    , EVENT     = constants.EVENT
    , REPLY     = constants.REPLY
    , MODE      = constants.MODE

const MOCK_INTERNALS = process.env[ "IRCJS_MOCK_INTERNALS" ]
                     ? true : false


const isEmpty = function( text ) {
  return 0 === text.trim().length
}

// Factory functions

/**
 * Make a Message object
 * @throws {Error} if no matching signature was found
 * @param {?Server|?Person|!string} prefix   Prefix or command
 * @param {!Array|!string=}         command  Command or params
 * @param {!Array=}                 params
 * @return {!Message}
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
      throw new Error( format( "No matching signature for %s", arguments ) )
  }
}

/**
 * Make a Channel object
 * @throws {Error} if no matching signature was found
 * @param {!string} name
 * @return {!Channel}
 */
const channel = function( name ) {
  const hasPrefix = /^[!#&+]/.test( name )
      , canonicalName = hasPrefix ? name : "#" + name
  return new Channel( canonicalName )
}

/**
 * Prefix a trailing message param
 * @param {!string} text
 * @return {string}
 */
const trailing = function( text ) {
  return ":" + text
}

/**
 * Handles all your channel needs
 * @constructor
 * @property {Object.<string, Channel>} map
 */
const ChannelManager = function() {
  this.map = {}
}

/**
 * @this {!IRC}
 * @param {!Channel|!string}   channel
 * @param {function(Channel=)} callback
 * @return {!IRC}
 */
ChannelManager.prototype.add = function( channel, callback ) {
  if ( this.channels.contains( channel ) )
    return callback( this.channels.get( channel ) ), this
  this.send( message( COMMAND.JOIN, [ channel.toString() ] ) )
}

/**
 * @this {!IRC}
 * @param {!string} name
 * @return {?Channel}
 */
ChannelManager.prototype.get = function( channel ) {
  const name = channel.toString()
  return this.channels.map[ name ] || null
}

/**
 * @this {!IRC}
 * @param {!Channel|!string} channel
 * @return {!IRC}
 */
ChannelManager.prototype.remove = function( channel ) {
  const name = channel.toString()
  delete this.channels.map[ name ]
  return this
}

/**
 * @this {!IRC}
 * @param {!Channel|!string} channel
 * @return {!boolean}
 */
ChannelManager.prototype.contains = function( channel ) {
  const name = channel.toString()
  return this.channels.map[ name ] ? true : false
}

/**
 * @private
 * @this {!Channel}
 * @param {!Array.<Person>} users
 * @param {!Person}         user
 * @return {!Channel}
 */
const removeUser = function( users, user ) {
  const nick = user.nick
  var i = users.length
  while ( i )
    if ( users[ --i ].nick === nick)
      break // Gotcha
  if ( -1 !== i )
    users.splice( i, 1 )
  return this
}

/**
 * Mediates between objects, commonly an {@link IRC} instance
 * and a {@link Channel} or {@link Person}
 *
 * @constructor
 * @param {!*} sender
 * @param {!*} receiver
 */
const Mediator = function( sender, receiver ) {
  this.mediate = mediate.bind( this, receiver )
}

/**
 * Relay a {@link Message}
 *
 * @this {Mediator}
 * @param {!*}        receiver Usually an {@link IRC} instance, automatically bound in {@link Mediator}
 * @param {!Message}  message
 * @return {Mediator}
 */
const mediate = function( receiver, message ) {
  receiver.send( message )
  return this
}

/**
 * IRC!
 *
 * @constructor
 * @param {?Object} options
 * @property {ChannelManager} channels
 */
const IRC = function( options ) {
  // Options
  this._internal =
    { buffer: ''
    , connected: false
    , queue: []
    , cache: {}
    , locks: {}
    , emitter: new events.EventEmitter()
    , socket: null
    , queue: []
    }

  ;( this.options = options || {} ).__proto__ = IRC.options

  this.channels = new ChannelManager()

  // Inherit users
  if ( this.options.user !== IRC.options.user )
    this.options.user.__proto__ = IRC.options.user

  // Sketchyness used for testing purposes
  if ( MOCK_INTERNALS )
    this._internal = options._internal

  this._internal.emitter.on( COMMAND.PING, function( message ) {
    const reply = message( COMMAND.PONG, message.params )
    this.send( reply )
  }.bind( this ) )

  this._internal.emitter.on( COMMAND.JOIN, function( message ) {
    const name = message.params[ 0 ]
    console.info( "Joining channel %s", name )
    this.channels.add.call( this, new Channel( name ) )
  }.bind( this ) )
}

/**
 * @private
 * @this {!IRC}
 * @return {!IRC}
 */
const connect = function() {
  const password = this.options[ "password" ]
  this._internal.connected = true
  this._internal.connectedSince = new Date

  if ( password )
    this.send( message( COMMAND.PASS, [ password ] ) )

  this
    .nick( this.options.nick )
    .user( this.options.user.username, this.options.user.realname
         , ( this.options.user.wallops ? MODE.USER.WALLOPS : 0 )
         | ( this.options.user.invisible ? MODE.USER.INVISIBLE : 0 ) )

  // Privmsg queue for flood protection
  this._internal.queue_timer = setInterval( function tick() { var m
    if ( m = this._internal.queue.shift() )
      sendPrivmsg.call( this, m.receiver, m.message )
  }.bind( this ), 200 )

  this._internal.emitter.emit( EVENT.CONNECT )
  return this
}

const disconnect = function() {
  clearInterval( this._internal.queue_timer )
  this._internal.queue = []
  this._internal.connected = false
  this._internal.socket.end()
  this._internal.emitter.emit( EVENT.DISCONNECT )
}

function parseMessage ( data ) {
  var buffer
    , last
    , message
    , command
    , i

  // Apply previous buffer, split, re-buffer
  if ( !!this._internal.buffer ) {
    data = this._internal.buffer + data
    this._internal.buffer = ""
  }
  buffer = data.split( /\r\n/ )
  if ( last = buffer.pop() )
    this._internal.buffer = last

  // Emit!
  for ( i = 0; i < buffer.length; ++i ) {
    log.call( this, "[RECV]   %s", buffer[i] )

    // Compile
    try {
      message = compiler.compileMessage( buffer[i] + "\r\n" )
    }
    catch ( err ) {
      console.error( format( "[ERROR] Failed parsing '%s'", buffer[i] ) )
      if ( true === this.options.die )
        throw err
    }

    // Set this._internal nick
    if ( command === REPLY.WELCOME )
      this._internal.nick = message.params[0]
    else if ( command === COMMAND.NICK && message.prefix.nick === this._internal.nick )
      this._internal.nick = message.params[0]

    // Emit event
    this._internal.emitter.emit( EVENT.ANY, message.command, message )
    this._internal.emitter.emit( message.command, message )
  }
}

/**
 * @param {?function} callback
 * @return {IRC}
 */
IRC.prototype.connect = function( callback ) {
  // Client setup
  if ( MOCK_INTERNALS || !this._internal.socket
      || [ 'open', 'opening' ].indexOf( this._internal.socket.readyState ) < 0 ) {
    if ( ! MOCK_INTERNALS ) {
      if ( this._internal.socket !== null ) {
        this._internal.socket.end()
        this._internal.socket.removeAllListeners()
        this._internal.socket = null
      }

      if ( this.options.server.ssl )
        this._internal.socket = require( 'tls' ).connect( this.options.server.port, this.options.server.address )
      else
        this._internal.socket = new require( 'net' ).Socket()
    }

    this._internal.socket.setEncoding( this.options.encoding )
    this._internal.socket.setTimeout( 0 )

    // Forward network errors
    this._internal.socket.on( 'error', function( er ) {
      this._internal.emitter.emit( 'error', er )
      this._internal.emitter.emit( 'error:network', er )
    })

    // Send login commands after connect
    this._internal.socket.on( 'connect', connect.bind( this ) )

    // Receive data
    this._internal.socket.on( 'data', parseMessage.bind( this ) )

    // Timeout
    this._internal.socket.on( 'timeout', disconnect.bind( this ) )

    if ( !this.options.server.ssl )
      this._internal.socket.connect( this.options.server.port, this.options.server.address )
  }

  if ( callback )
    this.once( EVENT.CONNECT, callback )

  return this
}

/**
 * Disconnect from the server.
 * Prefer using {@link IRC.prototype.quit}.
 *
 * @return {!IRC}
 */
IRC.prototype.disconnect = function() {
  disconnect.call( this )
  return this
}

/**
 * Send a message
 * @param {!Message} message
 * @return {IRC}
 */
IRC.prototype.send = function( message ) {
  const data = message.toString().slice( 0, 510 )
      , crlf = /\r\n$/.test( data ) ? "" : "\r\n"
  if ( this._internal.socket.readyState !== "open" )
    return console.warn( "Socket is not open, but tried to send: %", data ), this
  this._internal.socket.write( crlf ? data + crlf : data )
  log.call( this, "[SENT]   %s", data )
  return this
}

/**
 * Listen for a certain event, usually an IRC command
 * <code>ircInstance.on( COMMAND.PING, pingListener ) // Listen for PING messages</code>
 * @param {!string}   event
 * @param {!function} callback
 * @return {!IRC}
 */
IRC.prototype.addListener = function( event, callback ) {
  const bound = callback.bind( this )
  this._internal.emitter.addListener( event, bound )
  return this
}

/**
 * Add a listener that gets called if the predicate function returns true
 * @param {!function} predicate
 * @return {!IRC}
 */
IRC.prototype.when = function( predicate ) {

}

/** @see {IRC.prototype.addListener} */
IRC.prototype.on = IRC.prototype.addListener

/**
 * IRC#removeListener( event, listener ) -> null
 * - event ( String ): Event to stop listening for
 * - listener ( Function ): Event listener to unregister
 *
 * Stop listening for incoming IRC messages.
 *
 * ### Examples
 *
 *     irc_instance.removeListener( 'ping', pingListener ) // Stops listening for the PING message from server
**/
IRC.prototype.removeListener = function( event, hollaback ) {
  this._internal.emitter.removeListener( event, hollaback )
  return this
}

/**
 * IRC#once( event, listener ) -> null
 * - event ( String ): Event to listen for
 * - listener ( Function ): Event listener, called when event is emitted.
 *
 * Listen only once for an incoming IRC message.
 *
 * ### Examples
 *
 *     irc_instance.once( 'ping', pingListener ) // Listens for the *next* PING message from server, then unregisters itself
**/
IRC.prototype.once = function once ( event, hollaback ) {
  this._internal.emitter.once( event, hollaback.bind( this ) )
  return this
}

/** alias of: IRC#once
 * IRC#listenOnce( event, listener ) -> null
**/
IRC.prototype.listenOnce = IRC.prototype.once

/**
 * Set the client's nickname
 * <code>ircInstance.nick( "Jeff" ) // Set client's nickname to Jeff
 * @param {!string} nickname
 * @return {!IRC}
 */
IRC.prototype.nick = function( nickname ) {
  return this.send( message( COMMAND.NICK, [ nickname ] ) )
}

/**
 * @private
 * @this {!IRC}
 * @param {!string}  username
 * @param {!string}  realname
 * @param {!number=} flags     User mode flags mask
 * @return {!IRC}
 */
IRC.prototype.user = function( username, realname, flags ) {
  // A bit gross, convert from our own enum values to the two defined in spec
  // TODO use same values as spec?
  const mode = ( flags & MODE.USER.WALLOPS   ? 1 << 2 : 0 )
             | ( flags & MODE.USER.INVISIBLE ? 1 << 3 : 0 )
  return this.send( message( COMMAND.USER, [ username, mode, "*", trailing( realname ) ] ) )
}

/**
 * IRC#oper( user, password ) -> self
 * - user ( String ): Username
 * - password ( String ): Password
 *
 * Obtain operator privelages.
 *
 * ### Examples
 *
 *     irc_instance.oper( 'king', 'lol123' )
**/
IRC.prototype.oper = function( user, password ) {
  // 4.1.5
  return this.send( message( COMMAND.OPER, [ user, password ] ) )
}

/**
 * IRC#quit( [message] ) -> self
 * - message ( String ): Quit message
 *
 * Quit the server, passing an optional message. Note: the `disconnect`
 * method is called internally from `quit`.
 *
 * ### Examples
 *
 *     irc_instance.quit() // Quit without a message
 *     irc_instance.quit( 'LOLeaving!' ) // Quit with a hilarious exit message
**/
IRC.prototype.quit = function( reason ) {
  const params = reason ? [ trailing( reason ) ] : []
  this.send( message( COMMAND.QUIT, params ) )
  return this.disconnect()
}

/**
 * Join a channel, optionally providing a key and/or callback
 * <code>ircInstance.join( "#asl" ) // Join the channel `#asl`</code>
 * <code>ircInstance.join( "#asxxxl", "lol123" ) // Join the channel `#asxxl` with the key `lol123`</code>
 *
 * @param {!Channel|!string} chan
 * @param {?string=}         key
 * @param {?function=}       callback
 * @return {IRC}
 */
IRC.prototype.join = function( chan, key, callback ) {
  const name    = chan
      , params  = [ name ]
  if ( arguments.length > 1 )
    params.push( key )
  return this.send( message( COMMAND.JOIN, params ) )
}

/**
 * Part a channel
 * <code>ircInstance.part( "#asl" ) // Part the channel `#asl`</code>
 * @param {!Channel|!string} chan
 * @return {IRC}
 */
IRC.prototype.part = function( chan ) {
  return this.send( message( COMMAND.PART
                         , [ channel( chan ) ] ) )
}

/**
 * IRC#channelMode( channel, mode[, limit][, user][, ban_mask] ) -> self
 * - channel ( String ): Channel to apply mode
 * - mode ( String ): Mode to apply
 * - limit ( Number ): Optional - used in conjunction with `l` mode
 * - user ( String ): Optional - used in conjunction with some modes
 * - ban_mask ( String ): Optional - used in conjunction with `b` mode
 *
 * Set various channel modes. For a full list of channel modes, see: http://docs.dal.net/docs/modes.html#2
 *
 * ### Examples
 *
 *     irc_instance.channelMode( '#asl', '+im' ) // Makes `#asl` moderated and invite only
**/
IRC.prototype.channelMode = function( channel, mode, last ) {
  // 4.2.3.1
  const params = [ channel, mode ]
  if ( arguments.length === 3 )
    params.push( last )
  return this.send( message( COMMAND.MODE, params ) )
}

/**
 * IRC#userMode( mode ) -> self
 * - mode ( String ): Mode to apply
 *
 * Set various user modes on yourself. For a full list of user modes, see: http://docs.dal.net/docs/modes.html#3
 *
 * ### Examples
 *
 *     irc_instance.userMode( '-o' ) // De-ops user
**/
IRC.prototype.userMode = function( mode ) {
  // 4.2.3.2
  return this.send( message( COMMAND.MODE, [ this._internal.nick, mode ] ) )
}

/**
 * IRC#topic( channel, topic ) -> self
 * IRC#topic( channel, hollaback ) -> self
 * - channel ( String ): Channel to set/get topic
 * - topic ( String ): Topic to set
 * - hollaback ( Function ): Callback to receive the channel topic. The first argument is the channel, the second is the topic.
 *
 * Retreive or set a channel's topic.
 *
 * ### Examples
 *
 *     irc_instance.topic( '#asl', 'Laaaadddddiiiiiieeeeeesssssss' ) // Set a channel topic
 *     irc_instance.topic( '#asl', function( c, t ) {
 *         console.log( 'Topic in ' + c + ' is: ' + t )
 *     })
**/
IRC.prototype.topic = function( channel, topic ) {
  // 4.2.4
  if ( typeof topic !== "function" )
    return this.send( message( COMMAND.TOPIC, [ channel, trailing( topic ) ] ))

  // Register event for topic query
  this.once( REPLY.TOPIC, function( message ) {
    topic.call( this, message.params[1]
             , message.params[2].slice( 1 ) )
  } )

  return this.send( message( COMMAND.TOPIC, [ channel ] ) )
}

/**
 * IRC#names( channel, hollaback ) -> self
 * - channel ( String ): Channel to query
 * - hollaback ( Function ): Callback to receive the names list. The first argument is the channel, the second is an array of names.
 *
 * Get a list of everyone in a channel.
 *
 * ### Examples
 *
 *     irc_instance.names( '#asl', function( channel, names ) {
 *         this.privmsg( channel, 'Hi ' + names.join( ', ' ) + '!' )
 *     }) // Say hi to everyone in the channel
**/
IRC.prototype.names = function names ( channel, hollaback ) {
  // 4.2.5
  // Register event for names query
  this.once( REPLY.NAMREPLY, function( message ) {
    const chan  = message.params[1] === "=" ? message.params[2] : message.params[1]
        , nicks = message.params.slice( -1 )[ 0 ].match( /[^:\s]+/g );
    hollaback.call( this, chan, nicks || [] )
  })
  return this.send( message( COMMAND.NAMES, [ channel ] ) )
}

/**
 * IRC#list( channel, hollaback ) -> self
 * IRC#list( hollaback ) -> self
 * - channel ( String ): Channel to list information for.
 * - hollaback ( Function ): Callback to receive the channel list. As its
 * single parameter it receives one or many arrays with three elements. The
 * first element is the channel name, the second is the user count, the third
 * is the topic.
 *
 * List the information about a given channel, or all channels. Optional first parameter is the channel.
 *
 * ### Examples
 *
 *     irc_instance.list( '#asl', showList ) // `showList` would receive something like the following as it's only parameter: `['#asl', 57, 'Find hookups in here!']`
 *     irc_instance.list( listAll )
**/
IRC.prototype.list = function list ( channel, hollaback ) {
  // 4.2.6
  if ( ! hollaback )
    hollaback = channel, channel = null

  if ( ! isEmpty( channel ) ) {
    this.once( 'internal:list', function( list ) {
      hollaback.call( this, list )
    })
    gatherList()
  }
  else {
    // XXX This assumes there isn't a /list in progress
    this.once( REPLY.LIST, function( message ) {
      hollaback.call( this, [message.params[1], message.params[2], message.params[3]] )
    })
  }

  return this.send( message( COMMAND.LIST, [ channel ] ) )
}

function gatherList () {
  if ( this._internal.locks.list )
    return
  this._internal.locks.list = true
  this._internal.channel_list = []

  var gatherChannels = function( message ) {
    this._internal.cache.channel_list.push( [message.params[1], message.params[2], message.params[3]] )
  }

  this._internal.emitter.on( REPLY.LIST, gatherChannels )
  this._internal.emitter.on( REPLY.LISTEND, function() {
    this._internal.emitter.removeListener( REPLY.LIST, gatherChannels )
    this._internal.emitter.emit( 'internal:list', this._internal.channel_list )
    delete this._internal.locks.list
    delete this._internal.cache.channel_list
  })
}

/**
 * IRC#invite( nickname, channel ) -> self
 * - nickname ( String ): User to invite.
 * - channel ( String ): Channel to invite user to.
 *
 * Invite a user to a channel.
 *
 * ### Examples
 *
 *     irc_instance.invite( 'BloodNinja', '#asl' ) // I put on my robe and wizard hat...
**/
IRC.prototype.invite = function invite ( nickname, channel ) {
  // 4.2.7
  return this.send( message( COMMAND.INVITE, [ nickname, channel ] ) )
}

/**
 * IRC#kick( channel, user [, comment] ) -> self
 * - channel ( String ): Chennel to kick user from.
 * - user ( String ): User to kick.
 * - comment ( String ): Optional comment for kicking.
 *
 * Kick a user from a channel that you haver operator privelages for.
 *
 * ### Examples
 *
 *     irc_instance.kick( '#asl', 'some_douche' ) // Kick `some_douche` from `#asl`
 *     irc_instance.kick( '#asl', 'pedobear', 'TOO OLD!' ) // Kick user with a comment
**/
IRC.prototype.kick = function kick ( channel, user, comment ) {
  // 4.2.8
  const params = [ channel, user ]
  if ( arguments.length === 3 )
    params.push( trailing( comment ) )
  return this.send( message( COMMAND.KICK, params ) )
}

/**
 * IRC#version( server, hollaback ) -> self
 * IRC#version( hollaback ) -> self
 * - server ( String ): Optional, specific server to query.
 * - hollaback ( Function ): Callback to receive server version info.
 *
 * Query server for version information.
 *
 * ### Examples
 *
 *     irc_instance.version( whatVersion )
**/
IRC.prototype.version = function version ( server, hollaback ) {
  // 4.3.1
  if ( !hollaback )
    hollaback = server, server = null
  return this
    .once( REPLY.VERSION, function( message ) {
      hollaback.call( this, message.params.slice(1) )
    })
    .send( message( COMMAND.VERSION, server ? [ server ] : [] ) )
}

/**
 * IRC#privmsg( receiver, message [, protect] ) -> self
 * - receiver ( String ): Recipient of message, can be either a user nick or a channel.
 * - message ( String ): Message to send.
 * - protect ( Boolean ): Flood protection for long messages, if `true` will
 *   delay messages. Default: `false`. If flood_protection is set in the constructor
 *   options argument this value is used if the protect argument is not passed.
 *
 * Send a message to a user or channel. `privmsg` will automagically split
 * long messages into multiple messages.
 *
 * ### Examples
 *
 *     irc_instance.privmsg( '#asl', 'What\'s up ladiiieeeessssss!?' ) // Ask the ladies `what's up`
**/
IRC.prototype.privmsg = function( receiver, msg, protect ) { var private_messages, i
  // 4.4.1
  if ( msg == '' )
    return this

  protect = (protect === undefined) ? this.options.flood_protection : protect
  private_messages = msg.match( new RegExp( '.{1,' + ( 510 - 8 - receiver.length - 1 - 1 ) + '}', 'g' ) )

  for ( i = 0; i < private_messages.length; i++ )
    if ( protect && i > 0 )
      this._internal.queue.push({ receiver: receiver, message: private_messages[i] })
    else
      sendPrivmsg.call( this, receiver, private_messages[i] )
  return this
}

const sendPrivmsg = function( receiver, text ) {
  this.send( message( COMMAND.PRIVMSG
                    , [ receiver, trailing( text ) ]
                    ) )
}

/**
 * IRC#notice( receiver, message ) -> self
 *
 * Send a notice to a user or a channel.
 *
 * ### Examples
 *
 *     irc_instance.notice( '#asl', 'It is past midnight, time to go to bed.' )
**/
IRC.prototype.notice = function( receiver, msg ) {
  // 4.4.2
  // TODO flood protection, maybe privmsg and notice should use same queue
  return this.send( message( COMMAND.NOTICE, [ receiver, trailing( msg ) ] ) )
}

/**
 * @param {!Channel|!Person|!string} recipient
 * @param {!string}                  text
 * @return {IRC}
 */
IRC.prototype.say = function ( recipient, text ) {
  return this.send( message( COMMAND.PRIVMSG
                           , [ recipient, trailing( text ) ]
                           ) )
}

/**
 * @this {!IRC}
 */
const log = function( text/*, args... */ ) {
  if ( this.options.log )
    console.info.apply( console, arguments )
}


/**
 * IRC.options
 *
 * Default global options, all instances will inherit these options.
 *
 * ### Defaults
 *
 *      IRC.options =
 *        { die: false
 *        , encoding: 'ascii'
 *        , flood_protection: false
 *        , log: true
 *        , nick: 'js-irc'
 *        , port: 6667
 *        , server: '127.0.0.1'
 *        , ssl: false
 *        , user:
 *          { hostname: 'thetubes'
 *          , realname: 'Javascript Bot'
 *          , servername: 'tube1'
 *          , username: 'js-irc'
 *          }
 *        }
**/
IRC.options =
  { die: false
  , encoding: 'ascii'
  , flood_protection: false
  , log: true
  , nick: 'js-irc'
  , port: 6667
  , server: '127.0.0.1'
  , ssl: false
  , user:
    { hostname: 'thetubes'
    , realname: 'Javascript Bot'
    , servername: 'tube1'
    , username: 'js-irc'
    }
  }

module.exports = IRC

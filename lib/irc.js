// http://www.faqs.org/rfcs/rfc1459.html :)
// http://irchelp.org/irchelp/rfc/ :D

/** 
 *  class IRC
 *  
 *  An IRC library for node.js
**/

var path = require( 'path' )
  , fs = require( 'fs' )
  , Compiler
  , internal

require.paths.unshift( path.join( __dirname ) )

/* ------------------------------ Init Junk ------------------------------ */
Compiler = require( 'compiler' )

/* ------------------------------ MISCELLANEOUS ------------------------------ */
function if_exists( data, no_pad, pad_char ) {
  return data ? param( data, no_pad, pad_char ) : ''
}

function param( data, no_pad, pad_char ) {
  return ( no_pad ? '' : ( pad_char ? pad_char : ' ' ) ) + data.toString()
}

function not_blank( item ) {
  return ( !!item && item.toString().replace( /\s/g, '' ) != '' )
}

function $w( item ) {
  return item.toString().split( /\s+/ ).filter( not_blank )
}

/*------------------------------------*\
    IRC Class
\*------------------------------------*/
/**
 * new IRC( options )
 * - options ( Object ): Options for specific instance.
 * 
 * Creates a new `IRC` instance.
 * 
 * ### Examples
 * 
 *     var irc = new IRC( { server: 'irc.freenode.net', nick: 'lolbot' });
**/
function IRC ( options ) {
  // Options
  internal = 
    { buffer: ''
    , connected: false
    , privmsg_queue: []
    , listener_cache: {}
    , single_listener_cache: {}
    , cache: {}
    , locks: {}
    , emitter: new events.EventEmitter()
    , socket: null
    }

  ;( this.options = options || {} ).__proto__ = IRC.options

  // Sketchyness used for testing purposes
  if ( typeof IRCExposeInternals != 'undefined' && IRCExposeInternals )
    internal = this.options.internal

  internal.emitter.on( 'ping', function( message ){
    this.raw( 'PONG ' + ':' + message.params[0] )
  }.bind( this ))
}

/*------------------------------------*\
    Private Methods
\*------------------------------------*/
function doConnect() {
  internal.connected = true
  internal.connected_since = +new Date

  if ( this.options.pass !== undefined )
    this.pass( this.options.pass )

  this
    .nick( this.options.nick )
    .user( this.options.user.username, this.options.user.wallops, this.options.user.invisible, this.options.user.realname )

  // Privmsg queue for flood protection
  internal.privmsg_queue_timer = setInterval( function tick() { var m
    if ( m = internal.privmsg_queue.shift() )
      sendPrivmsg.call( this, m.receiver, m.message )
  }.bind( this ), 200 )

  internal.emitter.emit( 'connected' )
}

function doDisconnect() {
  clearTimeout( internal.privmsg_queue_timer )
  internal.privmsg_queue = []
  internal.connected = false
  internal.socket.end()
  internal.emitter.emit( 'disconnected' )
}

function parseMessage( data ) { var buffer, last, message, command, i
  internal.last_message = +new Date
  
  // Apply previous buffer, split, re-buffer
  if ( !!internal.buffer ) {
    data = internal.buffer + data
    internal.buffer = ''
  }
  buffer = data.split( /\r\n/ )
  if ( last = buffer.pop() )
    internal.buffer = last
  
  // Emit!
  for ( i = 0; i < buffer.length; i++ ) {
    if ( this.options.log )
      Log.info( "[RECV]  " + buffer[i] )

    // Compile
    try {
      message = Compiler.compile( buffer[i] + "\r\n" )
    }
    catch ( err ) {
      Log.error( "[ERROR] Failed parsing '" + buffer[i] + "'" )
      if ( this.options.die )
        throw err
    }

    // We're "connected" once we receive data
    if ( !internal.connected )
      doConnect.call( this )

    // Set internal nick
    if ( command == '001' )
      internal.nick = message.params[0]
    else if ( command == 'nick' && message.person.nick == internal.nick )
      internal.nick = message.params[0]

    // Emit event
    internal.emitter.emit( message.command, message )
  }
}
  
/*------------------------------------*\
    Instance Methods
\*------------------------------------*/
/**
 * IRC#connect( [hollaback] ) -> self
 * - hollaback ( Function ): Optional callback to be executed when the
 *                           connection is established an ready.
 * 
 * Connect to the server.
**/
IRC.prototype.connect = function connect ( hollaback ) {
  // Client setup
  var not_open
  if ( typeof IRCExposeInternals != 'undefined' || !internal.socket || ( not_open = ( [ 'open', 'opening' ].indexOf( internal.socket.readyState ) < 0 ) ) ) {
    if ( typeof IRCExposeInternals == 'undefined' ) {
      if ( internal.socket != null ) {
        internal.socket.end()
        internal.socket.removeAllListeners()
        internal.socket = null
      }

      if ( this.options.ssl )
        internal.socket = require( 'tls' ).connect( this.options.port, this.options.server )
      else
        internal.socket = new require( 'net' ).Socket()
    }

    internal.socket.setEncoding( this.options.encoding )
    internal.socket.setTimeout( 0 )

    // Forward network errors
    internal.socket.on( 'error', function( er ) {
      internal.emitter.emit( 'error', er )
      internal.emitter.emit( 'error:network', er )
    })

    // Receive data
    internal.socket.on( 'data', parseMessage.bind( this ) )

    // Timeout
    internal.socket.on( 'timeout', doDisconnect.bind( this ) )

    // End
    internal.socket.on( 'end', doDisconnect.bind( this ) )

    if ( !this.options.ssl )
      internal.socket.connect( this.options.port, this.options.server )
  }

  // Holla
  if ( typeof hollaback === 'function' )
    this.once( 'connected', hollaback )

  return this
}

/**
 * IRC#disconnect() -> self
 * 
 * Disconnect from the server. It is best practices to use the `quit`
 * convenience method.
**/
IRC.prototype.disconnect = function disconnect () {
  doDisconnect.call( this )
  return this
}

/**
 * IRC#raw( data ) -> self
 * - data ( String ): Raw IRC command to be sent to server
 * 
 * Send a raw IRC command to the server. Used internally by the convenience
 * methods. Note: It is not recommended to use this method, convenience
 * methods should be used instead to ensure data consistency.
 * 
 * ### Examples
 * 
 *     irc_instance.raw( ':YourNick TOPIC #channel :LOL This is awesome!' ) // Set a channel topic
**/
IRC.prototype.raw = function raw ( data ) {
  if ( internal.socket.readyState == 'open' ) {
    data = data.slice( 0, 510 )
    if ( !/\r\n$/.test( data ) )
      data += "\r\n"
    internal.socket.write( data )
    if ( this.options.log )
      Log.info( "[SENT]  " + data.replace( /\r\n$/, "" ) )
  }
  return this
}

/**
 * IRC#on( event, listener ) -> null
 * - event ( String ): Event to listen for
 * - listener ( Function ): Event listener, called when event is emitted.
 * 
 * Listen for incoming IRC messages.
 * 
 * ### Examples
 * 
 *     irc_instance.on( 'ping', pingListener ) // Listens for the PING message from server
**/
IRC.prototype.on = function on ( event, hollaback ) {
  var bound = hollaback.bind( this )

  if ( !internal.listener_cache[event] )
    internal.listener_cache[event] = []

  internal.listener_cache[event].push( bound )
  internal.emitter.addListener( event, bound )
  return this
}

/** alias of: IRC#on
 * IRC#addListener( event, listener ) -> null
**/
IRC.prototype.addListener = IRC.prototype.on

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
IRC.prototype.removeListener = function removeListener ( event, hollaback ) { var eventCache, i
  if ( internal.listener_cache[event] ) {
    eventCache = internal.listener_cache[event]
    for ( i = 0; i < eventCache.length; i++ ) {
      if ( eventCache[i] === hollaback ) {
        // If last element.
        if ( i+1 === eventCache.length )
          eventCache.pop()
        else
          eventCache[i] = eventCache.pop() // Replace index with last element.
        internal.emitter.removeListener( event, eventCache[i] )
      }
    }
  }
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
  internal.emitter.once( event, hollaback.bind( this ) )
  return this
}

/** alias of: IRC#once
 * IRC#listenOnce( event, listener ) -> null
**/
IRC.prototype.listenOnce = IRC.prototype.once

/* ------------------------------ Convenience Methods ------------------------------ */

/**
 * IRC#pass( password ) -> self
 * - password ( String ): Server password
 * 
 * Issue a server password. Note that this must be sent before anything else,
 * and is handled automatically by the `connect` method - so it's kinda
 * useless outside of this class. Be sure to set a `pass` in the `options`
 * should you need to connect with a password.
 * 
 * ### Examples
 * 
 *     irc_instance.pass( 'lol123' )
**/
IRC.prototype.pass = function pass ( password ) {
  // 4.1.1
  // TODO GIANNI: Consider not making this public
  return this.raw( 'PASS' + param( password ) )
}

/**
 * IRC#nick( nickname ) -> self
 * - nickname ( String ): Desired nick name.
 * 
 * Used to set or change a user's nick name.
 * 
 * ### Examples
 * 
 *     irc_instance.nick( 'Jeff' ) // Set user's nickname to `Jeff`
**/
IRC.prototype.nick = function nick ( nickname ) {
  // 4.1.2
  this.raw( ( internal.nick === undefined ? '' : ':' + internal.nick + ' ' ) + 'NICK' + param( nickname ) )
  return this
}

/**
 * IRC#user( username, wallops, invisible, realname ) -> self
 * - username ( String ): User name
 * - wallops ( Boolean ): Set +w on connect
 * - invisible ( Boolean ): Set +i on connect
 * - realname ( String ): Real name
 * 
 * Specify user's identify to the server. `username` must not contain spaces,
 * but `realname` may. 
 * 
 * ### Examples
 * 
 *     irc_instance.user( 'king', false, true, 'Lion King' )
**/
IRC.prototype.user = function user ( username, wallops, invisible, realname ) { var mode
  // 4.1.3
  // TODO GIANNI: Consider not making this public
  mode = ( wallops ? 4 : 0 ) + ( invisible ? 8 : 0 )
  return this.raw( 'USER ' + [ username, mode, '*' ].join(' ') + param( realname, null, ' :' ) )
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
IRC.prototype.oper = function oper ( user, password ) {
  // 4.1.5
  return this.raw( 'OPER' + param( user ) + param( password ) )
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
IRC.prototype.quit = function quit ( message ) {
  // 4.1.6
  this.raw( 'QUIT' + if_exists( message, null, ' :' ) ).disconnect()
  return this
}

/**
 * IRC#join( channel[, key] ) -> self
 * - channel ( String ): Channel to join
 * - key ( String ): Channel key
 * 
 * Start listening for messages from a given channel.
 * 
 * ### Examples
 * 
 *     irc_instance.join( '#asl' ) // Join the channel `#asl`
 *     irc_instance.join( '#asxxxl', 'lol123' ) // Join the channel `#asxxl` with the key `lol123`
**/
IRC.prototype.join = function join ( channel, key ) {
  // 4.2.1
  return this.raw( 'JOIN' + param( channel ) + if_exists( key ) )
}

/**
 * IRC#part( channel ) -> self
 * - channel ( String ): Channel to part
 * 
 * Stop listening for messages from a given channel
 * 
 * ### Examples
 * 
 *     irc_instance.part( '#asl' ) // You've had your fill of `#asl` for the day
**/
IRC.prototype.part = function part ( channel ) {
  // 4.2.2
  return this.raw( 'PART' + param( channel ) )
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
IRC.prototype.channelMode = function channelMode ( channel, mode, last ) {
  // 4.2.3.1
  return this.raw( 'MODE' + param( channel ) + param( mode ) + if_exists( last ) )
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
IRC.prototype.userMode = function userMode ( mode ) {
  // 4.2.3.2
  return this.raw( param( internal.nick, null, ':' ) + ' MODE' + param( mode ) )
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
IRC.prototype.topic = function topic ( channel, type ) {
  // 4.2.4
  if ( typeof type === 'function' ) {
    // Register event for topic query
    this.once( '332', function( message ) {
      type.call( this, message.params[1], message.params.slice( -1 ) )
    })
    
    this.raw( 'TOPIC' + param( channel ) )
  }
  else
    this.raw( 'TOPIC' + param( channel ) + param( type || '', null, ' :' ) )
  
  return this
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
  this.once( '353', function( message ) {
    var chan = message.params[1] == '=' ? message.params[2] : message.params[1]
    hollaback.call( this, chan, $w( message.params.slice( -1 ) ) )
  })
  return this.raw( 'NAMES' + param( channel ) )
}

/**
 * IRC#list( channel, hollaback ) -> self
 * IRC#list( hollaback ) -> self
 * - channel ( String ): Channel to list information for.
 * - hollaback ( Function ): Callback to receive the channel list. As it's 
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
  if ( !hollaback )
    hollaback = channel, channel = null
  
  if ( not_blank( channel ) ) {
    this.once( 'internal:list', function( list ) {
      hollaback.call( this, list )
    })
    gatherList()
  }
  else {
    // XXX This assumes there isn't a /list in progress
    this.once( '322', function( message ) {
      hollaback.call( this, [message.params[1], message.params[2], message.params[3]] )
    })
  }
  
  return this
}

function gatherList () {
  if ( internal.locks.list )
    return
  internal.locks.list = true
  internal.channel_list = []
  
  var gatherChannels = function( message ) {
    internal.cache.channel_list.push( [message.params[1], message.params[2], message.params[3]] )
  }
  
  internal.emitter.on( '322', gatherChannels )
  internal.emitter.on( '323', function() {
    internal.emitter.removeListener( '322', gatherChannels )
    internal.emitter.emit( 'internal:list', internal.channel_list )
    delete internal.locks.list
    delete internal.cache.channel_list
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
  return this.raw( 'INVITE' + param( nickname ) + param( channel ) )
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
  return this.raw( 'KICK' + param( channel ) + param( user ) + if_exists( comment, null, ' :' ) )
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
    .once( '351', function( message ) {
      hollaback.call( this, message.params.slice(1) )
    })
    .raw( 'VERSION' + if_exists( server ) )
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
IRC.prototype.privmsg = function privmsg ( receiver, msg, protect ) { var private_messages, i
  // 4.4.1
  if ( msg == '' )
    return this

  protect = protect === undefined ? this.options.flood_protection : protect
  private_messages = msg.match( new RegExp( '.{1,' + ( 510 - 8 - receiver.length - 1 - 1 ) + '}', 'g' ) )

  for ( i = 0; i < private_messages.length; i++ )
    if ( protect && i > 0 )
      internal.privmsg_queue.push({ receiver: receiver, message: private_messages[i] })
    else
      sendPrivmsg.call( this, receiver, private_messages[i] )
  return this
}

function sendPrivmsg ( receiver, msg ) {
  this.raw( 'PRIVMSG' + param( receiver ) + ' ' + param( msg || '', null, ':' ) )
}

/*------------------------------------*\
    Class Properties
\*------------------------------------*/
/**
 * IRC.info -> Object
 *
 * Information about [[IRC]] package.
**/
fs.readFile( path.join( __dirname, '..', 'package.json' ), function( err, data ) {
  if ( err )
    throw err
  else
    IRC.info = JSON.parse( data )
})

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

// Numeric error codes
IRC.errors = {}

// Numeric reply codes
IRC.replies = {}

/* ------------------------------ EXPORTS ------------------------------ */
module.exports = IRC


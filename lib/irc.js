// http://www.faqs.org/rfcs/rfc1459.html :)
// http://irchelp.org/irchelp/rfc/ :D

/** 
 *  class IRC
 *  
 *  An IRC library for node.js
**/

var sys = require('sys')
  , net = require('net')
  , Parser = require('./parser_grammar')

require('../vendor/utools/lib/utools')

/* ------------------------------ CONSTANTS ------------------------------ */
var DEBUG = true

/* ------------------------------ MISCELLANEOUS ------------------------------ */
function if_exists (data, no_pad, pad_char) {
  return data ? param(data, no_pad, pad_char) : ''
}

function param (data, no_pad, pad_char) {
  return (no_pad ? '' : (pad_char ? pad_char : ' ')) + data.toString()
}

function not_blank (item) {
  return (!!item && item.toString().replace(/\s/g, '') != '')
}

function $w (item) {
  return item.toString().split(/\s+/).filter(not_blank)
}

function pp (lol) {
  sys.puts(sys.inspect(lol))
}

/* ------------------------------ IRC Class ------------------------------ */
/**
 * new IRC(options)
 * - options (Object): Options for specific instance.
 * 
 * Creates a new `IRC` instance.
 * 
 * ### Examples
 * 
 *     var irc = new IRC({ server: 'irc.freenode.net', nick: 'lolbot' });
**/
function IRC (options) {
  // Options
  var internal = 
        { buffer: ''
        , connected: false
        , privmsg_queue: []
        , listener_cache: {}
        , single_listener_cache: {}
        , cache: {}
        , locks: {}
        }
    , stream
    , emitter  = new process.EventEmitter()
  this.options = {}.extend(IRC.options).extend(options || {})

  // Connect
  function do_connect () {
    internal.connected = true
    internal.connected_since = +new Date

    if (! typeof this.options.pass === 'undefined')
      stream.pass(this.options.pass)

    this
      .nick(this.options.nick)
      .user(this.options.user.username, this.options.user.wallops, this.options.user.invisible, this.options.user.realname)

    // Privmsg queue for flood protection
    internal.privmsg_queue_timer = setInterval(function tick () { var m
      if (m = internal.privmsg_queue.pop())
        privmsg.call(this, m.receiver, m.message)
    }.bind(this), 200)

    emitter.emit('connected')
  }

  // Disconnect
  function do_disconnect () {
    clearTimeout(internal.privmsg_queue_timer)
    internal.privmsg_queue = []
    internal.connected = false
    stream.end()
    emitter.emit('disconnected')
  }
  
  // Parse incoming messages
  function parseMessage (data) { var buffer, last, line, message, i
    internal.last_message = +new Date
    
    // Apply previous buffer, split, re-buffer
    if (!!internal.buffer) {
      data = internal.buffer + data
      internal.buffer = ''
    }
    buffer = data.split(/\r\n/)
    if (last = buffer.pop())
      internal.buffer = last
    
    // Parse Messages
    // TODO GIANNI Move try/catch inside for, so subsequent lines aren't clobbered
    try {
      for (i = 0; i < buffer.length; i++) {
        line = buffer[i], message = buildMessage(Parser.parse(line + "\r\n"))
        if (!internal.connected)
          do_connect.call(this) // We're "connected" once we receive data
        emitter.emit(message.command.toLowerCase(), message)
      }
    }
    catch (e) {
      if (DEBUG)
        sys.puts("[ERROR] Parsing '" + line + "'")
    }
  }
  
  // Build message object to be passed to listeners
  function buildMessage (node) { var o={}, p, i, n
    switch (node.type) {
      case 'message':
        for (i=0; i<node.children.length; i++) {
          n = buildMessage(node.children[i])
          o[n[0]] = n[1]
        }
        return o
      
      case 'servername':
        return ['servername', node.value.toString()]
      
      case 'person':
        p = {}
        for (i=0; i<node.children.length; i++)
          p[node.children[i].type] = node.children[i].value.toString()
        return ['person', p]
      
      case 'command':
        return ['command', node.value.toString()]
      
      case 'params':
        p = []
        for (i=0; i<node.children.length; i++)
          p.push(node.children[i].value.toString());
        return ['params', p]
    }
  }
  
  /* ------------------------------ Basic Client ------------------------------ */
  emitter.addListener('ping', function (message){
    this.raw('PONG ' + ':' + message.params[0])
  }.bind(this))
  
  /* ------------------------------ Basic Methods ------------------------------ */
  
  /**
   * IRC#connect([hollaback]) -> self
   * - hollaback (Function): Optional callback to be executed when the
   *                         connection is established an ready.
   * 
   * Connect to the server.
  **/
  this.connect = function (hollaback) {
    // Client setup
    var not_open
    if (!stream || (not_open = (['open', 'opening'].indexOf(stream.readyState) < 0))) {
      if (not_open) {
        stream.end()
        stream.removeAllListeners()
        stream = null
      }
      stream = net.createConnection(this.options.port, this.options.server)
      stream.setEncoding(this.options.encoding)
      stream.setTimeout(0)

      // Receive data
      stream.addListener('data', parseMessage.bind(this))
      
      // Timeout
      stream.addListener('timeout', do_disconnect.bind(this))
      
      // End
      stream.addListener('end', do_disconnect.bind(this))
    }
      
    // Holla
    if (typeof hollaback === 'function')
      this.listenOnce('connected', hollaback)
    return this;
  }
  
  /**
   * IRC#disconnect() -> self
   * 
   * Disconnect from the server. It is best practices to use the `quit`
   * convenience method.
  **/
  this.disconnect = function () {
    do_disconnect.call(this)
    return this
  }
  
  /**
   * IRC#raw(data) -> self
   * - data (String): Raw IRC command to be sent to server
   * 
   * Send a raw IRC command to the server. Used internally by the convenience
   * methods. Note: It is not recommended to use this method, convenience
   * methods should be used instead to ensure data consistency.
   * 
   * ### Examples
   * 
   *     irc_instance.raw(':YourNick TOPIC #channel :LOL This is awesome!'); // Set a channel topic
  **/
  this.raw = function (data) {
    if (stream.readyState == 'open') {
      data = data.slice(0, 509)
      if (!/\r\n$/.test(data))
        data += "\r\n"
      stream.write(data)
      if (DEBUG)
        sys.print('[SENT] ' + data)
    }
    return this
  }
  
  /**
   * IRC#addListener(event, listener) -> null
   * - event (String): Event to listen for
   * - listener (Function): Event listener, called when event is emitted.
   * 
   * Listen for incoming IRC messages.
   * 
   * ### Examples
   * 
   *     irc_instance.addListener('PING', pingListener); // Listens for the PING message from server
  **/
  this.addListener = function (event, hollaback) {
    var bound = hollaback.bind(this)
    internal.listener_cache[hollaback] = bound
    emitter.addListener(event, bound)
    return this
  }
  
  /**
   * IRC#removeListener(event, listener) -> null
   * - event (String): Event to stop listening for
   * - listener (Function): Event listener to unregister
   * 
   * Stop listening for incoming IRC messages.
   * 
   * ### Examples
   * 
   *     irc_instance.removeListener('PING', pingListener); // Stops listening for the PING message from server
  **/
  this.removeListener = function (event, hollaback) {
    emitter.removeListener(event, internal.listener_cache[hollaback])
    delete listener_cache[hollaback]
    return this
  }
  
  /**
   * IRC#listenOnce(event, listener) -> null
   * - event (String): Event to listen for
   * - listener (Function): Event listener, called when event is emitted.
   * 
   * Listen only once for an incoming IRC message.
   * 
   * ### Examples
   * 
   *     irc_instance.listenOnce('PING', pingListener); // Listens for the *next* PING message from server, then unregisters itself
  **/
  this.listenOnce = function (event, hollaback) {
    // Store reference and wrap
    internal.single_listener_cache[hollaback] = function (hollaback, message) {
      // Call function
      hollaback.call(this, message)
      
      // Unregister self
      setTimeout(function () {
        emitter.removeListener(event, internal.single_listener_cache[hollaback])
        delete internal.single_listener_cache[hollaback]
      }, 0)
    }.bind(this, hollaback)
    
    // Listen
    emitter.addListener(event, internal.single_listener_cache[hollaback])
  }
  
  /* ------------------------------ Convenience Methods ------------------------------ */
  
  /**
   * IRC#pass(password) -> self
   * - password (String): Server password
   * 
   * Issue a server password. Note that this must be sent before anything else,
   * and is handled automatically by the `connect` method - so it's kinda
   * useless outside of this class. Be sure to set a `pass` in the `options`
   * should you need to connect with a password.
   * 
   * ### Examples
   * 
   *     irc_instance.pass('lol123');
  **/
  this.pass = function (password) {
    // 4.1.1
    // TODO GIANNI: Consider not making this public
    return this.raw('PASS' + param(password))
  }
  
  /**
   * IRC#nick(nickname) -> self
   * - nickname (String): Desired nick name.
   * 
   * Used to set or change a user's nick name.
   * 
   * ### Examples
   * 
   *     irc_instance.nick('Jeff'); // Set user's nickname to `Jeff`
  **/
  this.nick = function (nickname) {
    // 4.1.2
    this.raw((internal.nick === undefined ? '' : ':' + internal.nick + ' ') + 'NICK' + param(nickname))
    internal.nick = this.options.nick = nickname
    return this
  }
  
  /**
   * IRC#user(username, wallops, invisible, realname) -> self
   * - username (String): User name
   * - wallops (Boolean): Set +w on connect
   * - invisible (Boolean): Set +i on connect
   * - realname (String): Real name
   * 
   * Specify user's identify to the server. `username` must not contain spaces,
   * but `realname` may. 
   * 
   * ### Examples
   * 
   *     irc_instance.user('king', false, true, 'Lion King');
  **/
  this.user = function (username, wallops, invisible, realname) {
    // 4.1.3
    // TODO GIANNI: Consider not making this public
    var mode = (wallops ? 4 : 0) + (invisible ? 8 : 0)
    return this.raw('USER ' + [username, mode, '*'].join(' ') + param(realname, null, ' :'))
  }
  
  /**
   * IRC#oper(user, password) -> self
   * - user (String): Username
   * - password (String): Password
   * 
   * Obtain operator privelages.
   * 
   * ### Examples
   * 
   *     irc_instance.oper('king', 'lol123');
  **/
  this.oper = function (user, password) {
    // 4.1.5
    return this.raw('OPER' + param(user) + param(password))
  }
  
  /**
   * IRC#quit([message]) -> self
   * - message (String): Quit message
   * 
   * Quit the server, passing an optional message. Note: the `disconnect`
   * method is called internally from `quit`.
   * 
   * ### Examples
   * 
   *     irc_instance.quit(); // Quit without a message
   *     irc_instance.quit('LOLeaving!'); // Quit with a hilarious exit message
  **/
  this.quit = function (message) {
    // 4.1.6
    this.raw('QUIT' + if_exists(message, null, ' :')).disconnect()
    return this
  }
  
  /**
   * IRC#join(channel[, key]) -> self
   * - channel (String): Channel to join
   * - key (String): Channel key
   * 
   * Start listening for messages from a given channel.
   * 
   * ### Examples
   * 
   *     irc_instance.join('#asl'); // Join the channel `#asl`
   *     irc_instance.join('#asxxxl', 'lol123'); // Join the channel `#asxxl` with the key `lol123`
  **/
  this.join = function (channel, key) {
    // 4.2.1
    return this.raw('JOIN' + param(channel) + if_exists(key))
  }
  
  /**
   * IRC#part(channel) -> self
   * - channel (String): Channel to part
   * 
   * Stop listening for messages from a given channel
   * 
   * ### Examples
   * 
   *     irc_instance.part('#asl'); // You've had your fill of `#asl` for the day
  **/
  this.part = function (channel) {
    // 4.2.2
    return this.raw('PART' + param(channel))
  }
  
  /**
   * IRC#channelMode(channel, mode[, limit][, user][, ban_mask]) -> self
   * - channel (String): Channel to apply mode
   * - mode (String): Mode to apply
   * - limit (Number): Optional - used in conjunction with `l` mode
   * - user (String): Optional - used in conjunction with some modes
   * - ban_mask (String): Optional - used in conjunction with `b` mode
   * 
   * Set various channel modes. For a full list of channel modes, see: http://docs.dal.net/docs/modes.html#2
   * 
   * ### Examples
   * 
   *     irc_instance.channelMode('#asl', '+im'); // Makes `#asl` moderated and invite only
  **/
  this.channelMode = function (channel, mode, last) {
    // 4.2.3.1
    return this.raw('MODE' + param(mode) + if_exists(last));
  }
  
  /**
   * IRC#userMode(mode) -> self
   * - mode (String): Mode to apply
   * 
   * Set various user modes on yourself. For a full list of user modes, see: http://docs.dal.net/docs/modes.html#3
   * 
   * ### Examples
   * 
   *     irc_instance.userMode('-o'); // De-ops user
  **/
  this.userMode = function (mode) {
    // 4.2.3.2
    return this.raw(param(internal.nick, null, ':') + ' MODE' + param(mode))
  }
  
  /**
   * IRC#topic(channel, topic) -> self
   * IRC#topic(channel, hollaback) -> self
   * - channel (String): Channel to set/get topic
   * - topic (String): Topic to set
   * - hollaback (Function): Callback to receive the channel topic. The first argument is the channel, the second is the topic.
   * 
   * Retreive or set a channel's topic.
   * 
   * ### Examples
   * 
   *     irc_instance.topic('#asl', 'Laaaadddddiiiiiieeeeeesssssss'); // Set a channel topic
   *     irc_instance.topic('#asl', function (c, t) {
   *         print('Topic in ' + c + ' is: ' + t);
   *     });
  **/
  this.topic = function (channel, type) {
    // 4.2.4
    if (typeof type === 'function') {
      // Register event for topic query
      this.listenOnce('332', function (message) {
        type.call(this, message.params[1], message.params.slice(-1))
      })
      
      this.raw('TOPIC' + param(channel))
    }
    else
      this.raw('TOPIC' + param(channel) + param(type || '', null, ' :'))
    
    return this
  }
  
  /**
   * IRC#names(channel, hollaback) -> self
   * - channel (String): Channel to query
   * - hollaback (Function): Callback to receive the names list. The first argument is the channel, the second is an array of names.
   * 
   * Get a list of everyone in a channel.
   * 
   * ### Examples
   * 
   *     irc_instance.names('#asl', function (channel, names) {
   *         this.privmsg(channel, 'Hi ' + names.join(', ') + '!');
   *     }); // Say hi to everyone in the channel
  **/
  this.names = function (channel, hollaback) {
    // 4.2.5
    // Register event for names query
    this.listenOnce('353', function (message) {
      hollaback.call(this, message.params[1], $w(message.params.slice(-1)))
    })
    return this.raw('NAMES' + param(channel))
  }
  
  /**
   * IRC#list(channel, hollaback) -> self
   * IRC#list(hollaback) -> self
   * - channel (String): Channel to list information for.
   * - hollaback (Function): Callback to receive the channel list. As it's 
   * single parameter it receives one or many arrays with three elements. The
   * first element is the channel name, the second is the user count, the third
   * is the topic.
   * 
   * List the information about a given channel, or all channels. Optional first parameter is the channel.
   * 
   * ### Examples
   * 
   *     irc_instance.list('#asl', showList); // `showList` would receive something like the following as it's only parameter: `['#asl', 57, 'Find hookups in here!']`
   *     irc_instance.list(listAll);
  **/
  this.list = function (channel, hollaback) {
    // 4.2.6
    if (!hollaback)
      hollaback = channel, channel = null
    
    if (not_blank(channel)) {
      this.listenOnce('internal:list', function (list) {
        hollaback.call(this, list)
      })
      gatherList()
    }
    else {
      // XXX This assumes there isn't a /list in progress
      this.listenOnce('322', function (message) {
        hollaback.call(this, [message.params[1], message.params[2], message.params[3]])
      })
    }
    
    return this
  }
  
  function gatherList () {
    if (internal.locks.list)
      return
    internal.locks.list = true
    internal.channel_list = []
    
    var gatherChannels = function (message) {
      internal.cache.channel_list.push([message.params[1], message.params[2], message.params[3]])
    }
    
    emitter.addListener('322', gatherChannels)
    emitter.addListener('323', function () {
      emitter.removeListener('322', gatherChannels)
      emitter.emit('internal:list', internal.channel_list)
      delete internal.locks.list
      delete internal.cache.channel_list
    })
  }
  
  /**
   * IRC#invite(nickname, channel) -> self
   * - nickname (String): User to invite.
   * - channel (String): Channel to invite user to.
   * 
   * Invite a user to a channel.
   * 
   * ### Examples
   * 
   *     irc_instance.invite('BloodNinja', '#asl'); // I put on my robe and wizard hat...
  **/
  this.invite = function (nickname, channel) {
    // 4.2.7
    return this.raw('INVITE' + param(nickname) + param(channel))
  }
  
  /**
   * IRC#kick(channel, user [, comment]) -> self
   * - channel (String): Chennel to kick user from.
   * - user (String): User to kick.
   * - comment (String): Optional comment for kicking.
   * 
   * Kick a user from a channel that you haver operator privelages for.
   * 
   * ### Examples
   * 
   *     irc_instance.kick('#asl', 'some_douche'); // Kick `some_douche` from `#asl`
   *     irc_instance.kick('#asl', 'pedobear', 'TOO OLD!'); // Kick user with a comment
  **/
  this.kick = function (channel, user, comment) {
    // 4.2.8
    return this.raw('KICK' + param(channel) + param(user) + if_exists(comment, null, ' :'))
  }
  
  /**
   * IRC#version(server, hollaback) -> self
   * IRC#version(hollaback) -> self
   * - server (String): Optional, specific server to query.
   * - hollaback (Function): Callback to receive server version info.
   * 
   * Query server for version information.
   * 
   * ### Examples
   * 
   *     irc_instance.version(whatVersion);
  **/
  this.version = function (server, hollaback) {
    // 4.3.1
    if (!hollaback)
      hollaback = server, server = null
    return this.listenOnce('351', hollaback).raw('VERSION' + if_exists(server))
  }
  
  this.stats = function () {
    // 4.3.2
  }
  
  /**
   * IRC#privmsg(receiver, message [, protect]) -> self
   * - receiver (String): Recipient of message, can be either a user nick or a channel.
   * - message (String): Message to send.
   * - protect (Boolean): Flood protection for long messages, if `true` will
   *   delay messages. Default: `false`.
   * 
   * Send a message to a user or channel. `privmsg` will automagically split
   * long messages into multiple messages.
   * 
   * ### Examples
   * 
   *     irc_instance.privmsg('#asl', 'What\'s up ladiiieeeessssss!?'); // Ask the ladies `what's up`
  **/
  this.privmsg = function (receiver, msg, protect) { var max_length, private_messages, i
    // 4.4.1
    max_length = 510 - 8 - receiver.length - 1 - 1
    private_messages = msg.match(new RegExp('.{1,' + max_length + '}', 'g'))

    for (i = 0; i < private_messages.length; i++)
      if (protect && i > 0)
        internal.privmsg_queue.push({ receiver: receiver, message: private_messages[i] })
      else
        privmsg.call(this, receiver, private_messages[i])
    return this
  }

  function privmsg (receiver, msg) {
    this.raw('PRIVMSG' + param(receiver) + ' ' + param(msg || '', null, ':'))
  }
}

/**
 * IRC.version -> String
 *
 * Version of [[IRC]] code.
**/
IRC.version = '0.2.0'

/**
 * IRC.options
 *
 * Default global options, all instances will inherit these options.
 *
 * ### Defaults
 *
 *      IRC.options =
 *        { server:   '127.0.0.1'
 *        , port:     6667
 *        , encoding: 'ascii'
 *        , nick:     'js-irc'
 *        , user:
 *          { username:   'js-irc'
 *          , hostname:   'thetubes'
 *          , servername: 'tube1'
 *          , realname:   'Javascript Bot'
 *          }
 *        }
**/
IRC.options =
  { server:   '127.0.0.1'
  , port:     6667
  , encoding: 'ascii'
  , nick:     'js-irc'
  , user:
    { username:   'js-irc'
    , hostname:   'thetubes'
    , servername: 'tube1'
    , realname:   'Javascript Bot'
    }
  }

// Numeric error codes
IRC.errors = {}

// Numeric reply codes
IRC.replies = {}

/* ------------------------------ EXPORTS ------------------------------ */
module.exports = IRC


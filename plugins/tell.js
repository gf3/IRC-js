/** @module tell
 *  @todo Only add observers for people who have notes waiting for them.
 *        Then remove when list is empty.
 */

const redis = require( "redis" )
    , fmt   = require( "util" ).format
    , cnst  = require( "../lib/constants" )
    , obj   = require( "../lib/objects" )
    , parse = require( "../lib/parser" )
    , log   = require( "../lib/logger" )
    , shrd  = require( "./shared" )

const rds = shrd.redis

const logger = log.get( "ircjs" )

const RPREFIX = "TELL"

const DELIM = String.fromCharCode( 0x7 )

const Note = function( from, to, note ) {
  this.date = Date.now()
  this.from = from
  this.to   = rds.key( to, RPREFIX )
  this.note = note
  this.new  = true
}

Note.prototype.toString = function() {
  return [ this.new, this.date, this.from, this.to, this.note ].join( DELIM )
}

Note.fromString = function( s ) {
  const parts = s.split( DELIM )
      , note  = new Note( parts[2], parts[3], parts[4] )
  note.new  = parts[0] === "true" ? true : false
  note.date = Number( parts[1] )
  return note
}

const Tell = function( irc ) {
  const rclient = redis.createClient( rds.PORT, rds.HOST )
  rclient.auth( rds.TOKEN )
  this.client = rclient
  this.irc = irc

  this.client.on( rds.EVENT.ERROR, this.error.bind( this ) )
}

Tell.prototype.error = function( err ) {
  logger.log( log.LEVEL.ERROR, "tell.js redis client error: %s", err )
}

Tell.prototype.tell = function( msg, num ) {
  // Probably full of async-y bugs, how to update a bunch of items at once and get a callback?
  const nick = msg.prefix.nick
      , key = rds.key( msg.prefix, RPREFIX )
  this.client.lrange( key, 0, -1, function( err, notes ) {
    if ( err ) {
      logger.log( log.LEVEL.ERROR, "Redis error in tell.js Tell.prototype.tell: %s", err )
      return
    }
    if ( ! notes || 0 === notes.length )
      return
    
    var reply = null
      , note = null
      , new_ = []
      , i = 0
      , l = notes.length
    for ( ; i < l ; ++i ) {
      note = Note.fromString( notes[i] )
      if ( ! note.new )
        continue
      new_.push( fmt( "%s (%s ago)", note.from, shrd.timeAgo( note.date ) ) )
      note.new = false
      logger.log( log.LEVEL.DEBUG, "Marking note from %s (%s) as not new", note.from, note )
      this.client.lset( key, i, note.toString() )
    }
    l = new_.length
    if ( 0 === l )
      return
    reply = fmt( "%s, you have %s, from %s. Tell me if you want to read %s (“read”)."
               , nick, l === 1 ? "one new message" : l + " new messages"
               , shrd.join( new_ ), l === 1 ? "it" : "them" )
    msg.reply( reply )
  }.bind( this ) )
}

Tell.prototype.read = function( msg ) {
  const nick = msg.prefix.nick
      , pm = msg.params[0] === this.irc.user.nick
      , forMe = pm || -1 !== msg.params[1].indexOf( this.irc.user.nick )
      , key = rds.key( msg.prefix, RPREFIX )

  if ( ! forMe )
    return

  this.client.lrange( key, 0, -1, function( err, notes ) {
    if ( err ) {
      logger.log( log.LEVEL.ERROR, "Redis error in tell.js: %s", err )
      return
    }

    if ( ! notes || 0 === notes.length ) {
      msg.reply( fmt( "%sI have no messages for you.", pm ? "" : nick + ", " ) )
      return
    }
    var l = notes.length
      , note = null
    while ( l-- ) {
      note = Note.fromString( notes[l] )
      msg.reply( fmt( "%s, from %s, %s ago: %s", pm ? "" : nick + ", ", note.from, shrd.timeAgo( note.date ), note.note ) )
    }
    this.client.del( key )
  }.bind( this ) )
}

Tell.prototype.add = function( msg, name, note ) {
  const forMe = -1 !== msg.params[1].indexOf( this.irc.user.nick )
      , from  = msg.prefix.nick
      , key   = rds.key( name, RPREFIX )
  if ( ! forMe )
    return
  if ( key === rds.key( from, RPREFIX ) ) {
    msg.reply( fmt( "%s, %s", from, note ) )
    return
  }
  if ( key === rds.key( this.irc.user.nick, RPREFIX ) ) {
    msg.reply( fmt( "%s, whatever you say…", from ) )
    return
  }
  const rnote = new Note( from, key, note )
  this.client.lpush( key, rnote.toString() )
  msg.reply( fmt( "%s, OK, I will tell %s if I see them.", from, name ) )
  logger.log( log.LEVEL.DEBUG, "Added note from %s to %s: %s", from, name, note )
}

Tell.prototype.disconnect = function( msg ) {
  logger.log( log.LEVEL.INFO, "Telling tell.js Redis client to quit" )
  this.client.quit()
}

const register = function( irc ) {
  const tell = new Tell( irc )
  irc.lookFor( /\btell +([-`_\{\}\[\]\^\|\\a-z0-9]+) +(.+)$/i, tell.add.bind( tell ) )
  irc.lookFor( /\bread\b/i, tell.read.bind( tell ) )
  irc.observe( cnst.COMMAND.PRIVMSG, tell.tell.bind( tell ) ) // tell tell, tell. also: tell
  irc.observe( cnst.EVENT.DISCONNECT, tell.disconnect.bind( tell ) )
  logger.log( log.LEVEL.INFO, "Registered Tell plugin" )
  return "Yay"
}

exports.register = register

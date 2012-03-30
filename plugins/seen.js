/** @module seen
 */

const redis = require( "redis" )
    , fmt   = require( "util" ).format
    , cnst  = require( "../lib/constants" )
    , obj   = require( "../lib/objects" )
    , parse = require( "../lib/parser" )

const TOKEN = "ff774f90da063a0dfa783172f16af4e3"
    , HOST  = "pike.redistogo.com"
    , PORT  = 9475

// Redis events
const EVENT =
    { ERROR: "error"
    }

// We'll use the person id as key, with lists of messages for each person
const getKey = function( id ) {
  return "SEEN" + id
}

const Seen = function( irc ) {
  const rclient = redis.createClient( PORT, HOST )
  rclient.auth( TOKEN )
  this.client = rclient
  this.irc = irc
}

Seen.prototype.seen = function( msg, name ) {
  const key = getKey( new obj.Person( name, null, null ).id ) // >_>
  if ( msg.prefix.nick === name )
    return msg.reply( fmt( "%s, I see you right now, here in %s.", msg.prefix.nick
                         , this.irc.user.nick === msg.params[0] ? "our cozy private chat" : msg.params[0] ) )
  if ( this.irc.user.nick === name )
    return msg.reply( fmt( "%s, I am here with you in %s.", msg.prefix.nick
                         , this.irc.user.nick === msg.params[0] ? "our sexy private chat" : msg.params[0] ) )
  this.client.lindex( key, 0, this.reply.bind( this, msg, name ) )
}

Seen.prototype.reply = function( msg, name, err, res ) {
  if ( err )
    return msg.reply( fmt( "%s, I went to see, but there was an error: %s", err ) )
  if ( ! res )
    return msg.reply( fmt( "%s, sorry, I have never seen %s.", msg.prefix.nick, name ) )
  const parts = res.match( /^(\d+)(.+)/ )
      , date  = new Date( Number( parts[1] ) )
      , mesg  = parse.message( parts[2] + "\r\n" )
      , ago   = timeAgo( date )
  if ( ! mesg )
    return msg.reply( fmt( "%s, WTF, could not parse this: %s", msg.prefix.nick, parts[2] ) )

  var reply = fmt( "%s, I last saw %s %s ago", msg.prefix.nick, name, ago )
  switch ( mesg.command ) {
    case cnst.COMMAND.PRIVMSG:
      if ( parse.channel( mesg.params[0] ) === null )
        reply += ", saying something to me in private"
      else
        reply += fmt( ", %s %s, saying “%s”", msg.params[0] === mesg.params[0] ? "here in" : "in"
                    , mesg.params[0], mesg.params[1].slice( 1 ) )
      break
    case cnst.COMMAND.JOIN:
      reply += fmt( ", joining %s", mesg.params[0] )
      break
    case cnst.COMMAND.PART:
      reply += fmt( ", leaving %s%s", mesg.params[0]
                  , mesg.params[1] ? " with the message “%s”" + mesg.params[1].slice( 1 ) : "." )
      break
    case cnst.COMMAND.QUIT:
      reply += fmt( ", quitting with the message “%s”", mesg.params[0].slice( 1 ) )
      break
    case cnst.COMMAND.NICK:
      name = mesg.params[0]
      reply += fmt( ", changing nick to %s", name )
      break
    default:
      reply += ", doing something I have no description for. The message was: " + parts[2]
      break
  }
  reply += "."
  if ( this.irc.channels.contains( msg.params[0] )
      && this.irc.channels.get( msg.params[0] ).people.contains( name ) )
    reply += fmt( " %s is here right now.", name )

  msg.reply( reply )
}

Seen.prototype.log = function( msg ) {
  if ( ! ( msg.prefix instanceof obj.Person ) )
    return this
  const now = Date.now()
      , key = getKey( msg.prefix.id )
      , val = now + msg
  this.client.lpush( key, val )
}

Seen.prototype.disconnect = function( msg ) {
  this.client.quit()
}

const timeAgo = function( t ) {
  var diff = Math.round( ( Date.now() - t ) / 1000 )
  const days  = Math.floor( diff / 86400 )
      , hours = Math.floor( ( diff -= days * 86400 ) / 3600 )
      , mins  = Math.floor( ( diff -= hours * 3600 ) / 60 )
      , secs  = Math.floor( ( diff -= mins * 60 ) )
      , ago   = []

  if ( days )
    ago.push( days === 1 ? "one day" : days + " days" )
  if ( hours )
    ago.push( hours === 1 ? "one hour" : hours + " hours" )
  if ( mins )
    ago.push( mins === 1 ? "one minute" : mins + " minutes" )
  if ( secs )
    ago.push( secs === 1 ? "one second" : secs + " seconds" )
  ago.splice( 2 )
  return ago.join( " and " )
}

const register = function( irc ) {
  const s = new Seen( irc )
  irc.observe( cnst.EVENT.ANY, s.log.bind( s ) )
  irc.observe( cnst.EVENT.DISCONNECT, s.disconnect.bind( s ) )
  irc.lookFor( /\bseen +([-`_\{\}\[\]\^\|\\a-z0-9]+)/i, s.seen.bind( s ) )
  return "Hooray"
}

exports.register = register

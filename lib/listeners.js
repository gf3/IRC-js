/** @module listeners
 *  Default listeners which make all the fancy stuff work
 */
const constants = require( "./constants" )
    , map       = require( "./map" )
    , objects   = require( "./objects" )
    , parser    = require( "./parser" )

const Channel   = objects.Channel
    , Message   = objects.Message
    , Person    = objects.Person
    , Server    = objects.Server
    , channel   = objects.channel
    , message   = objects.message
    , person    = objects.person
    , trailing  = objects.trailing
    , COMMAND   = constants.COMMAND
    , ERROR     = constants.ERROR
    , EVENT     = constants.EVENT
    , MODE      = constants.MODE
    , REPLY     = constants.REPLY

// Commands
const onJoin = function( msg ) {
  /** @todo {jonas} Do some clients use a trailing param for channel name?
      Saw some of those in the fixtures. */
  const name = msg.params[0]
      , nick = msg.prefix.nick
      , self = nick === this.config.nick // Needed?
      , prsn = new Person( nick, msg.prefix.user, msg.prefix.host )
  this.channels.get( name ).people.add( nick, prsn )
}

const onMode = function( msg ) {
  const param   = msg.params[0]
      , target  = param === this.config.nick ? this :
                  this.channels.get( param ) || map.cache.people.get( param )
      , modes   = parser.mode( msg.params[1]
                , target instanceof Channel ? MODE.CHAR.CHANNEL : MODE.CHAR.USER )
  if ( ! target ) {
    console.warn( "[WARN]  Got mode %s for %s, dunno what to do", msg.params[1], param )
    return
  }
  if ( this === target ) {
    console.info( "[INFO]  Got mode %s for myself, should save that somewhere", msg.params[1] )
    return
  }
  target.mode |=  modes[0]
  target.mode &= ~modes[1]
}

const onNick = function( msg ) {
  if ( msg.prefix.nick !== this.config.nick )
    return
  this.config.nick = msg.params[0]
}

const onPart = function( msg ) {
  const name = msg.params[0]
      , nick = msg.prefix.nick
      , chan = this.channels.get( name )
  if ( chan && chan.people.contains( nick ) ) {
    chan.people.remove( nick )
    return
  }
  if ( chan ) {
    console.error( "[ERROR] Got a part message from %s for channel %s, but %s was not in that channel"
                 , nick, name, nick )
    return
  }
  console.error( "[ERROR] Got a part message from %s for channel %s, which I am not in"
               , nick, name )
}

const onPing = function( ping ) {
  const reply = message( COMMAND.PONG, ping.params )
  this.send( reply )
}

const onTopic = function( msg ) {
  const chan  = this.channels.get( msg.params[0] )
      , topic = msg.params[1].slice( 1 )
  if ( chan ) {
    chan.topic = topic
    return
  }
  console.info( "[INFO]  Got a topic (%s) for channel %s, which I am not in"
              , topic, msg.params[0] )
}

// Numeric replies
const onNameReply = function( msg ) {
  const chan  = this.channels.get( msg.params[2] )
      , nicks = parser.nick( msg.params[3], true )
      , count = nicks.length
  var i = 0, p = null, nick
  for (; i < count; ++i ) {
    nick = nicks[i]
    chan.people.add( nick )
    console.info( "[INFO]  Adding %s to %s", nick, chan )
  }
}

const onTopicReply = function( msg ) {
  const chan  = this.channels.get( msg.params[1] )
      , topic = msg.params[2].slice( 1 )
  if ( chan ) {
    chan.topic = topic
    return
  }
  console.info( "Got a topic, %s, for channel %s, which I am not in"
              , topic, msg.params[1] )
}

const onWelcome = function( msg ) {
  this.config.nick = msg.params[0]
}

const command =
  { join  : onJoin
  , mode  : onMode
  , nick  : onNick
  , part  : onPart
  , ping  : onPing
  , topic : onTopic
  }

const reply =
  { name    : onNameReply
  , topic   : onTopicReply
  , welcome : onWelcome
  }

// WHY WOULD THESE BE NEEDED LOL
const error =
  {}

exports.command = command
exports.error   = error
exports.reply   = reply

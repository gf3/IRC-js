/** @module observers
 *  Default observers which make all the fancy stuff work.
 */
const constants = require( "./constants" )
    , log       = require( "./logger" )
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
    , LEVEL     = log.LEVEL
    , MODE      = constants.MODE
    , REPLY     = constants.REPLY

const logger = log.get( "ircjs" )

// Commands
const onJoinCommand = function( msg ) {
  /** @todo {jonas} Do some clients use a trailing param for channel name?
      Saw some of those in the fixtures. */
  const name = msg.params[0]
      , nick = msg.prefix.nick
      , self = nick === this.user.nick
  if ( self ) {
    logger.log( LEVEL.INFO, "[INFO]  Successfully joined %s", name )
    return
  }
  const prsn = new Person( nick, msg.prefix.user, msg.prefix.host ).for( this )
  logger.log( LEVEL.INFO, "[INFO]  Adding %s to %s", prsn, name )
  this.channels.get( name ).people.add( prsn )
}

const onModeCommand = function( msg ) {
  const param   = msg.params[0]
      , target  = param === this.user.nick ? this :
                  this.channels.get( param ) || map.cache.people[param]
      , modes   = parser.mode( msg.params[1]
                  , target instanceof Channel ? MODE.CHAR.CHANNEL : MODE.CHAR.USER )
  if ( ! target ) {
    logger.log( LEVEL.WARN, "[WARN]  Got mode %s for %s, dunno what to do", msg.params[1], param )
    return
  }
  if ( this === target ) {
    logger.log( LEVEL.DEBUG, "[DEBUG] Got mode %s for myself, should save that somewhere", msg.params[1] )
    return
  }
  logger.log( LEVEL.DEBUG, "[DEBUG] Setting mode %s for %s", msg.params[1], target, modes )
  target.mode |=  modes[0]
  target.mode &= ~modes[1]
  logger.log( LEVEL.DEBUG, "[DEBUG] GFDHJKK", target.name, target.mode )
}

const onNickCommand = function( msg ) {
  if ( msg.prefix.nick !== this.user.nick )
    return
  this.user.nick = msg.params[0]
}

const onPartCommand = function( msg ) {
  const name = msg.params[0]
      , nick = msg.prefix.nick
      , chan = this.channels.get( name )
  if ( chan && chan.people.contains( nick ) ) {
    chan.people.remove( nick )
    logger.log( LEVEL.DEBUG, "[DEBUG] Removing %s from %s", nick, chan )
  }
  if ( nick === this.user.nick ) {
    logger.log( LEVEL.DEBUG, "[DEBUG] Left %s, removing it", chan )
    this.channels.remove( chan )
    return
  }
  if ( chan ) {
    logger.log( LEVEL.ERROR
              , "[ERROR] Got a part message from %s for channel %s, but %s was not in that channel"
              , nick, name, nick )
    return
  }
  logger.log( LEVEL.ERROR
            , "[ERROR] Got a part message from %s for channel %s, which I am not in"
            , nick, name )
}

const onPingCommand = function( ping ) {
  const reply = message( COMMAND.PONG, ping.params )
  this.send( reply )
}

const onTopicCommand = function( msg ) {
  const chan  = this.channels.get( msg.params[0] )
      , topic = msg.params[1].slice( 1 )
  if ( chan ) {
    if ( chan.topic )
      logger.log( LEVEL.DEBUG
                , "[DEBUG] Updating topic for %s from %s to %s", chan, chan.topic, topic )
    else
      logger.log( LEVEL.DEBUG
                , "[DEBUG] Setting topic for %s to %s", chan, topic )
    chan.topic = topic
    return
  }
  logger.log( LEVEL.WARN, "[WARN]  Got a topic (%s) for channel %s, which I am not in"
            , topic, msg.params[0] )
}

// Numeric replies
const onNameReply = function( msg ) {
  const chan  = this.channels.get( msg.params[2] )
      , nicks = parser.nick( msg.params[3], true )
      , count = nicks.length
  if ( ! chan ) {
    logger.log( LEVEL.ERROR, "[ERROR] Got a name reply for unknown channel %s", chan )
    return
  }
  var i = 0, p = null, nick = null
  for ( ; i < count; ++i ) {
    nick = nicks[i]
    chan.people.add( nick ) // @todo Go ask for user info
    logger.log( LEVEL.DEBUG, "[DEBUG]  Adding %s to %s", nick, chan )
  }
}

const onTopicReply = function( msg ) {
  const chan  = this.channels.get( msg.params[1] )
      , topic = msg.params[2].slice( 1 )
  if ( chan ) {
    logger.log( LEVEL.DEBUG
              , "[DEBUG] Setting topic for %s to %s", chan, topic )
    chan.topic = topic
    return
  }
  logger.log( LEVEL.WARN
            , "[WARN]  Got a topic, %s, for channel %s, which I am not in"
            , topic, msg.params[1] )
}

const onWelcomeReply = function( msg ) {
  const nick = msg.params[0]
  logger.log( LEVEL.DEBUG, "[DEBUG] Setting nick to", nick )
  this.user.nick = nick
}

const register = function( irc ) {
  irc.observe( COMMAND.JOIN,   onJoinCommand.bind( irc ) )
  irc.observe( COMMAND.MODE,   onModeCommand.bind( irc ) )
  irc.observe( COMMAND.NICK,   onNickCommand.bind( irc ) )
  irc.observe( COMMAND.PART,   onPartCommand.bind( irc ) )
  irc.observe( COMMAND.PING,   onPingCommand.bind( irc ) )
  irc.observe( COMMAND.TOPIC,  onTopicCommand.bind( irc ) )

  irc.observe( REPLY.NAMREPLY, onNameReply.bind( irc ) )
  irc.observe( REPLY.TOPIC,    onTopicReply.bind( irc ) )
  irc.observe( REPLY.WELCOME,  onWelcomeReply.bind( irc ) )
}

exports.register = register

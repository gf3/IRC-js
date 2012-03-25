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
      , self = nick === this.config.nick
  if ( self ) {
    logger.log( LEVEL.INFO, "[INFO]  Successfully joined %s", name )
    return
  } else if ( ! this.channels.contains( name ) ) {
    logger.log( LEVEL.WARN, "[WARN]  Received a JOIN from %s for %s, which I am not in", nick, name )
    return
  }
  this.channels.get( name )
      .people.add( new Person( nick, msg.prefix.user, msg.prefix.host ) )
}

const onModeCommand = function( msg ) {
  const param   = msg.params[0]
      , target  = param === this.config.nick ? this :
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
  target.mode |=  modes[0]
  target.mode &= ~modes[1]
}

const onNickCommand = function( msg ) {
  if ( msg.prefix.nick !== this.config.nick )
    return
  this.config.nick = msg.params[0]
}

const onPartCommand = function( msg ) {
  const name = msg.params[0]
      , nick = msg.prefix.nick
      , chan = this.channels.get( name )
  if ( chan && chan.people.contains( nick ) ) {
    chan.people.remove( nick )
    logger.log( LEVEL.DEBUG, "[DEBUG] Removing %s from %s", nick, chan )
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
  var i = 0, p = null, nick
  for ( ; i < count; ++i ) {
    nick = nicks[i]
    chan.people.add( nick )
    logger.log( LEVEL.INFO, "[INFO]  Adding %s to %s", nick, chan )
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
  this.config.nick = nick
}

exports[COMMAND.JOIN]   = onJoinCommand
exports[COMMAND.MODE]   = onModeCommand
exports[COMMAND.NICK]   = onNickCommand
exports[COMMAND.PART]   = onPartCommand
exports[COMMAND.PING]   = onPingCommand
exports[COMMAND.TOPIC]  = onTopicCommand

exports[REPLY.NAMREPLY] = onNameReply
exports[REPLY.TOPIC]    = onTopicReply
exports[REPLY.WELCOME]  = onWelcomeReply

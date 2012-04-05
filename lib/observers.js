/** @module observers
 *  Default observers which make all the fancy stuff work.
 */
const format    = require( "util" )
    , constants = require( "./constants" )
    , log       = require( "./logger" )
    , map       = require( "./map" )
    , objects   = require( "./objects" )
    , observe   = require( "./notifications" )
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
    , STATUS    = observe.STATUS

const logger = log.get( "ircjs" )

// Commands
const onJoinCommand = function( msg ) {
  /** @todo {jonas} Do some clients use a trailing param for channel name?
      Saw some of those in the fixtures. */
  const name = msg.params[0]
      , nick = msg.from.nick
      , self = nick === this.user.nick
  var chan = null
  if ( self ) {
    chan = channel( name )
    chan.people.add( this.user )
    this.channels.add( chan.for( this ) )
    logger.log( LEVEL.INFO, "[INFO]  Successfully joined %s", name )
    return STATUS.SUCCESS
  }
  const prsn = person( nick, msg.from.user, msg.from.host ).for( this )
  logger.log( LEVEL.INFO, "[INFO]  Adding %s to %s", prsn, name )
  this.channels.get( name ).people.add( prsn )
  return STATUS.SUCCESS
}

const onKickCommand = function( msg ) {
  const chans = msg.params[0].split( "," )
      , users = parser.nick( msg.params[1], true )
  var i = 0, j = 0
    , k = users.length
    , l = chans.length
    , chan = null
  while ( l-- ) {
    if ( chan = this.channels.get( chans[l] ) )
      for ( i = 0; i < k; ++i )
        if ( users[i] === this.user.nick ) {
          chan.people.remove( users[i] )
          logger.log( LEVEL.DEBUG, "[DEBUG] I was kicked from %s, removing it", chan.name )
          this.channels.remove( chan )
        } else {
          logger.log( LEVEL.DEBUG, "[DEBUG] %s was kicked from %s, removing them", users[i], chan.name )
          chan.people.remove( users[i] )
        }
  }
  return STATUS.SUCCESS
}

const onModeCommand = function( msg ) {
  const param   = msg.params[0]
      , target  = param === this.user.nick ? this.user :
                  this.channels.get( param ) || person( param )
      , modes   = parser.mode( msg.params[1]
                  , target instanceof Channel ? MODE.CHAR.CHANNEL : MODE.CHAR.USER )
  if ( ! target ) {
    logger.log( LEVEL.WARN, "[WARN]  Got mode %s for %s, dunno what to do", msg.params[1], param )
    return STATUS.ERROR
  }
  if ( this.user === target )
    logger.log( LEVEL.DEBUG, "[DEBUG] Setting mode %s for myself", msg.params[1] )
  else
    logger.log( LEVEL.DEBUG, "[DEBUG] Setting mode %s for %s", msg.params[1], target )
  target.mode |=  modes[0]
  target.mode &= ~modes[1]
  return STATUS.SUCCESS
}

const onNickCommand = function( msg ) {
  if ( msg.from.nick === this.user.nick )
    this.user.nick = msg.params[0]

  return STATUS.SUCCESS
}

const onPartCommand = function( msg ) {
  const name = msg.params[0]
      , nick = msg.from.nick
      , chan = this.channels.get( name )

  if ( chan && chan.people.contains( nick ) ) {
    chan.people.remove( nick )
    logger.log( LEVEL.DEBUG, "[DEBUG] Removing %s from %s", nick, chan )

    if ( nick === this.user.nick ) {
      logger.log( LEVEL.DEBUG, "[DEBUG] Left %s, removing it", chan )
      this.channels.remove( name )
    }

    return STATUS.SUCCESS
  }

  if ( chan ) {
    logger.log( LEVEL.ERROR
              , "[ERROR] Got a part message from %s for channel %s, but %s was not in that channel"
              , nick, name, nick )
    return STATUS.ERROR
  }

  logger.log( LEVEL.ERROR
            , "[ERROR] Got a part message from %s for channel %s, which I am not in"
            , nick, name )
  return STATUS.ERROR
}

const onPingCommand = function( ping ) {
  const reply = message( COMMAND.PONG, ping.params )
  this.send( reply )
  return STATUS.SUCCESS
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
    return STATUS.SUCCESS
  }
  logger.log( LEVEL.WARN, "[WARN]  Got a topic (%s) for channel %s, which I am not in"
            , topic, msg.params[0] )

  return STATUS.ERROR
}

const onQuitCommand = function( msg ) {
  // Remove from all chans
  const user = msg.from.nick
  var chan
  for ( chan in this.channels )
    if ( this.channels[chan].people ) // Gross, all sorts of other stuff in this obj...
      this.channels[chan].people.remove( user )
  logger.log( LEVEL.DEBUG, "[DEBUG] Got a quit message for %s, removing them from all channels", user )
  return STATUS.SUCCESS
}

// Numeric replies
const onMyInfoReply = function( msg ) {
  const name = msg.params[1]
  logger.log( LEVEL.DEBUG, "[DEBUG] Updating server name from %s to %s", this.server.name, name )
  this.server.name = name
  return STATUS.SUCCESS | STATUS.REMOVE
}

const onNameReply = function( msg ) {
  const chan  = this.channels.get( msg.params[2] )
      , nicks = parser.nick( msg.params[3], this.config.die )
      , count = nicks.length
  if ( ! chan ) {
    logger.log( LEVEL.ERROR, "[ERROR] Got a name reply for unknown channel %s", msg.params[2] )
    return STATUS.ERROR
  }
  var i = 0, p = null, nick = null
  for ( ; i < count; ++i ) {
    nick = nicks[i]
    chan.people.add( nick ) // @todo Go ask for user info
    logger.log( LEVEL.DEBUG, "[DEBUG] Adding %s to %s", nick, chan )
  }
  return STATUS.SUCCESS
}

const onTopicReply = function( msg ) {
  const chan  = this.channels.get( msg.params[1] )
      , topic = msg.params[2].slice( 1 )
  if ( chan ) {
    logger.log( LEVEL.DEBUG
              , "[DEBUG] Setting topic for %s to %s", chan, topic )
    chan.topic = topic
    return STATUS.SUCCESS
  }
  logger.log( LEVEL.WARN
            , "[WARN]  Got a topic, %s, for channel %s, which I am not in"
            , topic, msg.params[1] )
  return STATUS.ERROR
}

const onWelcomeReply = function( msg ) {
  const nick = msg.params[0]
  logger.log( LEVEL.DEBUG, "[DEBUG] Setting nick to", nick )
  this.user.nick = nick
  return STATUS.SUCCESS | STATUS.REMOVE
}

const onAnyError = function( msg ) {
  const num = msg.type
  if ( isNaN( num ) || num < 400 || num >= 600)
    return STATUS.SUCCESS
  this.notify( EVENT.ERROR, msg )
  logger.log( LEVEL.ERROR
            , "[ERROR] Received error %s from %s with params %s"
            , msg.type, msg.from, msg.params.join( ", " )
            )
  return STATUS.ERROR
}

const onForwardError = function( msg ) {
  const from  = msg.params[1]
      , to    = msg.params[2]
  if ( this.channels.contains( to ) ) {
    logger.log( LEVEL.DEBUG, "[DEBUG] Forwarded from %s to %s, which already existed", from, to )
    return
  }
  const chan = channel( to )
  chan.people.add( this.user )
  this.channels.add( chan.for( this ) )
  this.channels.add( to )
  logger.log( LEVEL.INFO, "[INFO]  Got forwarded from %s to %s, adding %s", from, to, to )

  return STATUS.ERROR
}

const register = function( irc ) {
  // Commands
  irc.observe( COMMAND.JOIN
    , onJoinCommand.bind( irc ) )
  irc.observe( COMMAND.KICK
    , onKickCommand.bind( irc ) )
  irc.observe( COMMAND.MODE
    , onModeCommand.bind( irc ) )
  irc.observe( COMMAND.NICK
    , onNickCommand.bind( irc ) )
  irc.observe( COMMAND.PART
    , onPartCommand.bind( irc ) )
  irc.observe( COMMAND.PING
    , onPingCommand.bind( irc ) )
  irc.observe( COMMAND.TOPIC
    , onTopicCommand.bind( irc ) )
  irc.observe( COMMAND.QUIT
    , onQuitCommand.bind( irc ) )

  // Numeric replies
  irc.observe( REPLY.MYINFO
    , onMyInfoReply.bind( irc ) )
  irc.observe( REPLY.NAMREPLY
    , onNameReply.bind( irc ) )
  irc.observe( REPLY.TOPIC
    , onTopicReply.bind( irc ) )
  irc.observe( REPLY.WELCOME
    , onWelcomeReply.bind( irc ) )

  // Errors
  irc.observe( EVENT.ANY
    , onAnyError.bind( irc ) )
  irc.observe( ERROR.NOINVITEFORWARD
    , onForwardError.bind( irc ) )
}

exports.register = register

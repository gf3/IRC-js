/** @module observers
 *  Default observers which make all the fancy stuff work.
 */
const format    = require( "util" )
    , constants = require( "./constants" )
    , logger    = require( "./logger" )
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
    , LEVEL     = constants.LEVEL
    , MODE      = constants.MODE
    , REPLY     = constants.REPLY
    , STATUS    = constants.STATUS

const log = logger.get( "ircjs" )

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
    chan.people.set( this.user.id, this.user )
    this.channels.set( chan.id, chan.for( this ) )
    log.info( "Successfully joined %s", name )
    return STATUS.SUCCESS
  }
  const prsn = person( nick, msg.from.user, msg.from.host ).for( this )
  log.debug( "Adding user %s to channel %s", prsn, name )
  this.channels.get( objects.id( name ) ).people.set( prsn.id, prsn )
  return STATUS.SUCCESS
}

const onKickCommand = function( msg ) {
  // Not sure if anyone makes use of it, but KICK commands may use two comma-
  // separated lists of equal length; one of channels and one of users.
  const chans = msg.params[0].split( "," )
      , users = parser.nick( msg.params[1], true )
  var i = 0, j = 0
    , k = users.length
    , l = chans.length
    , chan = null
  while ( l-- ) {
    if ( chan = this.channels.get( objects.id( chans[l] ) ) )
      for ( i = 0; i < k; ++i )
        if ( users[i] === this.user.nick ) {
          // They hate the bot and want it gone.
          chan.people.delete( objects.id( users[i] ) )
          log.debug( "I was kicked from %s, removing it", chan.name )
          this.channels.delete( chan.id )
        } else {
          log.debug( "%s was kicked from %s, removing them", users[i], chan.name )
          chan.people.delete( objects.id( users[i] ) )
        }
  }
  return STATUS.SUCCESS
}

const onModeCommand = function( msg ) {
  const param   = msg.params[0]
      , target  = param === this.user.nick ? this.user :
                  this.channels.get( objects.id( param ) ) || person( param )
      , modes   = parser.mode( msg.params[1] )
  if ( ! target ) {
    log.warn( "Got mode %s for %s, dunno what to do", msg.params[1], param )
    return STATUS.ERROR
  }
  if ( this.user === target )
    log.debug( "Setting mode %s for myself", msg.params[1] )
  else
    log.debug( "Setting mode %s for %s", msg.params[1], target )
  // Modes come in pairs of bool and char, so loop in steps of 2.
  for ( var i = 0, l = modes.length; i < l; i += 2 ) {
    if ( modes[ i ] === true )
      target.mode.add( modes[ i + 1 ] )
    else
      target.mode.delete( modes[ i + 1 ] )
  }
}

const onNickCommand = function( msg ) {
  if ( msg.from.nick === this.user.nick )
    this.user.nick = msg.params[0]

  return STATUS.SUCCESS
}

const onPartCommand = function( msg ) {
  const name = msg.params[0]
      , nick = msg.from.nick
      , chan = this.channels.get( objects.id( name ) )

  if ( chan && chan.people.has( objects.id( nick ) ) ) {
    chan.people.delete( objects.id( nick ) )
    log.debug( "Removing %s from %s", nick, chan )

    if ( nick === this.user.nick ) {
      log.debug( "Left %s, removing it", chan )
      this.channels.delete( objects.id( name ) )
    }

    return STATUS.SUCCESS
  }

  if ( chan ) {
    log.error( "Got a part message from %s for channel %s, but %s was not in that channel"
                , nick, name, nick )
    return STATUS.ERROR
  }

  log.error( "Got a part message from %s for channel %s, which I am not in"
              , nick, name )
  return STATUS.ERROR
}

const onPingCommand = function( ping ) {
  const reply = message( COMMAND.PONG, ping.params )
  this.send( reply )
  return STATUS.SUCCESS
}

const onTopicCommand = function( msg ) {
  const chan  = this.channels.get( objects.id( msg.params[0] ) )
      , topic = msg.params[1].slice( 1 )
  if ( chan ) {
    if ( chan.topic )
      log.debug( "Updating topic for %s from %s to %s"
                  , chan, chan.topic, topic )
    else
      log.debug( "Setting topic for %s to %s", chan, topic )
    chan.topic = topic
    return STATUS.SUCCESS
  }
  log.warn( "Got a topic (%s) for channel %s, which I am not in"
            , topic, msg.params[0] )

  return STATUS.ERROR
}

const onQuitCommand = function( msg ) {
  // Remove from all chans
  const user = msg.from.nick
  // TODO TODO TODO, actually remove user once Map API gets less broken.
  log.debug( "Got a quit message for %s, removing them from all channels", user )
  return STATUS.SUCCESS
}

// Numeric replies
const onMyInfoReply = function( msg ) {
  const name = msg.params[1]
  log.debug( "Updating server name from %s to %s", this.server.name, name )
  this.server.name = name
  return STATUS.SUCCESS | STATUS.REMOVE
}

const onNameReply = function( msg ) {
  const chan  = this.channels.get( objects.id( msg.params[2] ) )
      , nicks = parser.nick( msg.params[3], this.config.die )
      , count = nicks.length
  if ( ! chan ) {
    log.error( "Got a name reply for unknown channel %s", msg.params[2] )
    return STATUS.ERROR
  }
  var i = 0, p = null, prsn = null
  for ( ; i < count; ++i ) {
    prsn = person( nicks[i] )
    chan.people.set( prsn.id, prsn ) // @todo Go ask for user info
    log.debug( "Adding user %s to channel %s", prsn.nick, chan )
  }
  return STATUS.SUCCESS
}

const onTopicReply = function( msg ) {
  const chan  = this.channels.get( objects.id( msg.params[1] ) )
      , topic = msg.params[2].slice( 1 )
  if ( chan ) {
    log.debug( "Setting topic for %s to %s", chan, topic )
    chan.topic = topic
    return STATUS.SUCCESS
  }
  log.warn( "Got a topic, %s, for channel %s, which I am not in"
             , topic, msg.params[1] )
  return STATUS.ERROR
}

const onWelcomeReply = function( msg ) {
  const nick = msg.params[0]
  log.debug( "Setting nick to", nick )
  this.user.nick = nick
  return STATUS.SUCCESS | STATUS.REMOVE
}

const onAnyError = function( msg ) {
  const num = msg.type
  if ( isNaN( num ) || num < 400 || num >= 600)
    return STATUS.SUCCESS
  this.notify( EVENT.ERROR, msg )
  log.error( "Received error %s from %s with params %s"
              , msg.type, msg.from, msg.params.join( ", " ) )
  return STATUS.ERROR
}

const onForwardError = function( msg ) {
  const from  = msg.params[1]
      , to    = msg.params[2]
  if ( this.channels.has( objects.id( to ) ) ) {
    log.debug( "Forwarded from %s to %s, which already existed", from, to )
    return
  }
  const chan = channel( to )
  chan.people.set( this.user.id, this.user )
  this.channels.delete( objects.id( from ) )
  this.channels.set( chan.id, chan )
  log.info( "Got forwarded from %s to %s, adding %s", from, to, to )

  return STATUS.ERROR
}

const register = function( client ) {
  // Commands
  client.observe( COMMAND.JOIN
    , onJoinCommand.bind( client ) )
  client.observe( COMMAND.KICK
    , onKickCommand.bind( client ) )
  client.observe( COMMAND.MODE
    , onModeCommand.bind( client ) )
  client.observe( COMMAND.NICK
    , onNickCommand.bind( client ) )
  client.observe( COMMAND.PART
    , onPartCommand.bind( client ) )
  client.observe( COMMAND.PING
    , onPingCommand.bind( client ) )
  client.observe( COMMAND.TOPIC
    , onTopicCommand.bind( client ) )
  client.observe( COMMAND.QUIT
    , onQuitCommand.bind( client ) )

  // Numeric replies
  client.observe( REPLY.MYINFO
    , onMyInfoReply.bind( client ) )
  client.observe( REPLY.NAMREPLY
    , onNameReply.bind( client ) )
  client.observe( REPLY.TOPIC
    , onTopicReply.bind( client ) )
  client.observe( REPLY.WELCOME
    , onWelcomeReply.bind( client ) )

  // Errors
  client.observe( EVENT.ANY
    , onAnyError.bind( client ) )
  client.observe( ERROR.NOINVITEFORWARD
    , onForwardError.bind( client ) )
}

exports.register = register

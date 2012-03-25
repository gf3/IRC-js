/** @module map
 *  A "managed" map, for {@link Channel}s, {@link Person}s or whatever.
 *  @todo {jonas} Could certainly be a lot DRYer.
 */

const constants = require( "./constants" )
    , parser    = require( "./parser" )
    , objects   = require( "./objects" )
    , observe   = require( "./observable" )

const Channel   = objects.Channel
    , Message   = objects.Message
    , Person    = objects.Person
    , Server    = objects.Server
    , COMMAND   = constants.COMMAND
    , REPLY     = constants.REPLY
    , STATUS    = observe.STATUS

const TEST = process.env["IRCJS_TEST"] ? true : false

/** Shared {@link Person} cache */
const _people = {}

/** Map!
 *  A map managed by IRC to avoid certain problems.
 *  @todo {jonas} Switch to a better data structure when available in Node.
 *
 *  @constructor
 *  @param {Object} of  The type of thing the Map should manage
 */
const IRCMap = function( of ) {
  const map = {}
  this.with = with_.bind( this, map, of )

  if ( TEST )
    this._map = map
}

/** Enchance the {@link IRCMap} with {@link IRC}-aware methods.
 *  Specialized for the most important types, {@link Channel} and {@link Person}.
 *  More may be added later.
 *
 *  @this {IRCMap}
 *  @param {Object}   map  Internal map
 *  @param {function} of   Constructor for which to specialize
 *  @param {IRC}      irc
 *  @return {IRCMap}
 */
const with_ = function( map, for_, irc ) {
  if ( for_ === Channel ) {
    this.add      = addChannel.bind( this, irc, map )
    this.contains = containsChannel.bind( this, map )
    this.get      = getChannel.bind( this, map )
    this.remove   = removeChannel.bind( this, irc, map )
  } else if ( for_ === Person ) {
    this.add      = addPerson.bind( this, irc, map )
    this.contains = containsPerson.bind( this, map )
    this.get      = getPerson.bind( this, map )
    this.remove   = removePerson.bind( this, map )
  }
  return this
}

/** This should be the only function that adds a {@link Channel}
 *  @this {IRCMap}
 *  @param {IRC}            irc
 *  @param {Object}         map
 *  @param {Channel|string} channel
 *  @param {string=}        key
 *  @param {function=}      callback
 *  @return {IRCMap}
 */
const addChannel = function( irc, map, channel, key, callback ) {
  if ( key instanceof Function )
    callback = key, key = null
  if ( this.contains( channel ) ) {
    channel = this.get( channel )
    if ( callback )
      callback.call( irc, channel )
    return channel
  }
  const name   = channel.toString()
      , params = [ name ]
      , chan   = channel instanceof Channel ? channel
               : parser.channel( name )
  if ( key )
    params.push( key )

  if ( callback )
    irc.observe( REPLY.NAMREPLY, function( msg ) {
      if ( name === msg.params[2] ) {
        callback.call( irc, chan )
        return STATUS.SUCCESS | STATUS.REMOVE
      }
      return STATUS.RETRY
    } )
  irc.observe( COMMAND.JOIN, function( msg ) {
    if ( irc.config.nick === msg.prefix.nick
      && name === msg.params[0] ) {
      map[name] = chan
      return STATUS.SUCCESS | STATUS.REMOVE
    }
    return STATUS.RETRY
  } )
  irc.send( objects.message( COMMAND.JOIN, params ) )
  return chan.with( irc )
}

/** @this {IRCMap}
 *  @param {Object.<string, Channel>} map
 *  @param {string} name
 *  @return {?Channel}
 */
const getChannel = function( map, channel ) {
  const name = channel.toString()
  return map[ name ] || null
}

/** @this {IRCMap}
 *  @param {IRC}            irc
 *  @param {Object}         map
 *  @param {Channel|string} channel
 *  @param {string=}        words     Any parting words
 *  @return {?Channel}
 */
const removeChannel = function( irc, map, channel, words ) {
  const chan = this.getChannel( name )
  if ( null === chan )
    return null
  const params = [ name ]
  if ( words )
    params.push( objects.trailing( words ) )
  irc.send( objects.message( COMMAND.PART, params ) )
  delete map[ name ]
  return chan
}

/** @this {IRCMap}
 *  @param {IRC}            irc
 *  @param {Object}         map
 *  @param {Channel|string} channel
 *  @return {boolean}
 */
const containsChannel = function( map, channel ) {
  const name = channel.toString()
  return map[ name ] ? true : false
}

/** This should be the only function that adds a {@link Person}
 *  @this {IRCMap}
 *  @param {IRC}            irc
 *  @param {Object}         map
 *  @param {Channel|string} prsn
 *  @return {boolean}
 */
const addPerson = function( irc, map, prsn ) {
  const nick    = prsn instanceof Person ? prsn.nick : parser.nick( prsn )
      , exists  = this.get( nick )
  if ( exists )
    return exists // @todo {jonas} Update existing Person?
  const cached  = _people[nick] || null
      , newprsn = cached ? cached : nick === prsn
                ? new Person( nick, null, null )
                : prsn
  map[nick] = _people[nick] = newprsn.with( irc )
  return newprsn
}

const containsPerson = function( map, p ) {
  const nick = p instanceof Person ? p.nick : p
  return map[nick] ? true : false
}

const getPerson = function( map, p ) {
  const nick = p instanceof Person ? p.nick : p
  return map[nick] || null
}

const removePerson = function( map, p ) {
  const nick = p instanceof Person ? p.nick : p
  delete map[nick]
  return this
}

exports.IRCMap = IRCMap
exports.cache  = { people: _people }

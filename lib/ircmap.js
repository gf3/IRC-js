/** @module ircmap
 *  A "managed" map, for {@link Channel}s, {@link Person}s or whatever.
 *  @todo {jonas} Could certainly be a lot DRYer.
 */

const constants = require( "./constants" )
    , parser    = require( "./parser" )
    , objects   = require( "./objects" )

const Channel   = objects.Channel
    , Message   = objects.Message
    , Person    = objects.Person
    , Server    = objects.Server
    , COMMAND   = constants.COMMAND
    , REPLY     = constants.REPLY

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

  // Default implementation, may be replaced when using `with`
  this.add        = add.bind( this, map )
  this.contains   = contains.bind( this, map )
  this.get        = get.bind( this, map )
  this.remove     = remove.bind( this, map )

  if ( TEST ) // Not so secret anymore!
    this._map = map
}

// Default impl
const add = function( map, k, v ) {
  map[k] = v
  return this
}

const contains = function( map, k ) {
  return map.hasOwnProperty( k )
}

const get = function( map, k, def ) {
  return map[k] || def || null
}

const remove = function( map, k ) {
  delete map[k]
  return this
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
const with_ = function( map, ctor, irc ) {
  if ( Channel === ctor ) {
    this.add      = addChannel.bind( this, irc, map )
    this.contains = containsChannel.bind( this, map )
    this.get      = getChannel.bind( this, map )
    this.remove   = removeChannel.bind( this, irc, map )
  } else if ( Person === ctor ) {
    this.add      = addPerson.bind( this, irc, map )
    this.contains = containsPerson.bind( this, map )
    this.get      = getPerson.bind( this, map )
    this.remove   = removePerson.bind( this, map )
  }
  return this
}

/** @this {IRCMap}
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
  const name   = channel.toString().replace( /(^[\s:]+|\s+$)/g, "" ) // :(
      , params = [ name ]
      , chan   = channel instanceof Channel ? channel
               : parser.channel( name )
  if ( key )
    params.push( key )

  const laterz = function( msg ) {
    if ( name !== msg.params[2] )
      return
    callback.call( irc, chan )
  }

  if ( callback )
    irc.addListener( REPLY.NAMREPLY, laterz )

  irc.send( objects.message( COMMAND.JOIN, params ) )
  return map[name] = chan.with( irc )
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
 *  @param {string}         words     Any parting words
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
 *  @param {Channel|string} channel
 *  @return {boolean}
 */
const containsChannel = function( map, channel ) {
  const name = channel.toString()
  return map[ name ] ? true : false
}

const addPerson = function( irc, map, prsn ) {
  const nick    = prsn instanceof Person ? prsn.nick : prsn
      , exists  = this.get( nick )
  if ( exists )
    return exists // @todo {jonas} Update existing Person?
  const cached  = _people[nick] || null
      , newp    = cached ? cached : nick === prsn
                ? new Person( nick, null, null )
                : prsn
  map[newp.nick] = _people[nick] = newp.with( irc )
  return newp
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

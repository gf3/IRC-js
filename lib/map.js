/** @module map
 *  A "managed" map, for {@link Channel}s, {@link Person}s or whatever.
 *  @todo {jonas} Could certainly be a lot DRYer.
 */

const constants = require( "./constants" )
    , parser    = require( "./parser" )
    , objects   = require( "./objects" )
    , observe   = require( "./observable" )
    , logger    = require( "./logger" )

const Channel   = objects.Channel
    , Message   = objects.Message
    , Person    = objects.Person
    , Server    = objects.Server
    , COMMAND   = constants.COMMAND
    , LEVEL     = logger.LEVEL
    , REPLY     = constants.REPLY
    , STATUS    = observe.STATUS

const log = logger.get( "ircjs" )

/** Shared {@link Person} cache */
const _people = {}

/** A map managed by IRC, so that it can do nice things under the hood.
 *
 *  @constructor
 */
const IRCMap = function() {
}

// Default useless impl
IRCMap.prototype.for = function( irc ) { return this }

IRCMap.prototype.add = function( a ) {
  const k = key( a )
  return this[k] = a
}

IRCMap.prototype.remove = function( a ) {
  const k = key( a.toString() )
      , v = this[k]
  if ( ! v )
    return null
  delete this[k]
  return v
}

IRCMap.prototype.get = function( a ) {
  const k = key( a.toString() )
  return this[k] || null
}

IRCMap.prototype.contains = function( a ) {
  return this.get( a ) ? true : false
}

IRCMap.of = function( t ) {
  const ircMap = new IRCMap()
  ircMap.for = for_.bind( ircMap, t )
  return ircMap
}

/** Enchance the {@link IRCMap} with {@link IRC}-aware methods.
 *  Specialized for the most important types, {@link Channel} and {@link Person}.
 *  More may be added later.
 *
 *  @this {IRCMap}
 *  @param {function} t     Constructor for which to specialize
 *  @param {IRC}      irc   IRC instance delegate
 *  @return {IRCMap}
 */
const for_ = function( t, irc ) {
  if ( t === Channel ) {
    this.add      = addChannel.bind( this, irc )
    this.remove   = removeChannel.bind( this )
  } else if ( t === Person ) {
    this.add      = addPerson.bind( this )
    this.get      = getPerson.bind( this )
    this.remove   = removePerson.bind( this )
  }
  return this
}

/** Add a {@link Channel}, either by passing a channel name
 *  or a {@link Channel} object.
 *
 *  @this {IRCMap}
 *  @param {IRC}            irc
 *  @param {Channel|string} channel
 *  @param {string=}        pass
 *  @param {function=}      callback
 *  @return {IRCMap}
 */
const addChannel = function( irc, channel, pass, callback ) {
  const args = Array.apply( null, arguments )
      , cont = args.pop()
  var chan = this.get( channel )
  if ( chan ) {
    if ( cont instanceof Function )
      then( chan )
    return chan
  }
  chan = channel instanceof Channel ? channel : new Channel( channel )
  this[ key( chan.name ) ] = chan
  args.push( cont )
  args.splice( 0, 2 )
  return chan.for( irc ).join.apply( chan, args )
}

/** @this {IRCMap}
 *  @param {Channel|string} channel
 *  @return {?Channel}
 */
const removeChannel = function( channel ) {
  const chan = this.get( channel )
  if ( null === chan )
    return null
  delete this[ key( chan.name ) ]
  return chan
}

/** This should be the only function that adds a {@link Person}
 *  @this {IRCMap}
 *  @param {Person}     prsn
 *  @return {Person}
 */
const addPerson = function( prsn ) {
  
  const exists  = this.get( prsn )
      , nick    = prsn instanceof Person ? prsn.nick : prsn
      , nkey    = key( nick )
      , cached  = _people[nkey]
  if ( exists )
    return exists
  if ( cached )
    return this[nkey] = _people[nkey]
  return this[nkey] = _people[nkey] =
    prsn instanceof Person ? prsn : new Person( nick, null, null )
}

const getPerson = function( p ) {
  const k = key( p instanceof Person ? p.nick : p )
  return this[k] || null
}

const removePerson = function( p ) {
  const k = key( p instanceof Person ? p.nick : p )
      , v = this[k]
  if ( ! v )
    return null
  delete this[k]
  return v
}

/** Make a nice key string for our objects, taking into account
 *  that the characters {}|^ are considered to be the lower case equivalents
 *  of the characters []\~ in IRC.
 */
const charMap =
  { '{': '['
  , '}': ']'
  , '|': '\\'
  , '^': '~'
  }

const chars = function( c ) { return charMap[c] }
    , regex = /[|{}^]/g

const key = function( s ) {
  return "$" + s.toUpperCase().replace( regex, chars )
}

exports.IRCMap = IRCMap
exports.cache  = { people: _people }

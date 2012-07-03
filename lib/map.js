/** @module map
 *  A "managed" map, for {@link Channel}s, {@link Person}s or whatever.
 *  @todo {jonas} Could certainly be a lot DRYer.
 */

const constants = require( "./constants" )
    , parser    = require( "./parser" )
    , objects   = require( "./objects" )
    , observe   = require( "./notifications" )
    , logger    = require( "./logger" )

const Channel   = objects.Channel
    , Message   = objects.Message
    , Person    = objects.Person
    , Server    = objects.Server
    , channel   = objects.channel
    , message   = objects.message
    , person    = objects.person
    , server    = objects.server
    , id        = objects.id
    , COMMAND   = constants.COMMAND
    , LEVEL     = logger.LEVEL
    , REPLY     = constants.REPLY
    , STATUS    = observe.STATUS

const log = logger.get( "ircjs" )

/** A Map managed by IRC, so that it can do nice things under the hood.
 *  Also so you can get callbacks and stuff.
 *
 *  @constructor
 */
const IRCMap = function() {
  this.map = new Map()
}

// Default implementation
IRCMap.prototype.for = function( irc ) { return this }

IRCMap.prototype.add = function( o ) {
  const k = o.id || id( o )
  return this.map.set( k, o )
}

IRCMap.prototype.remove = function( a ) {
  const k = a.id || id( a )
      , v = this.map.get( k )
  if ( ! v )
    return null
  this.map.delete( k )
  return v
}

IRCMap.prototype.get = function( a ) {
  const k = a.id || id( a )
  return this.map.get( k ) || null
}

IRCMap.prototype.contains = function( a ) {
  return this.get( a ) ? true : false
}

IRCMap.prototype.rename = function( old, new_ ) {
  const oldKey = old.id  || id( old )
      , newKey = new_.id || id( new_ )
  this.map.set( newKey, this.map.get( oldKey ) )
  this.map.delete( oldKey )
  return this.map.get( newKey )
}

IRCMap.of = function( t ) {
  const ircMap = new IRCMap()
  ircMap.for = for_.bind( ircMap, t )
  return ircMap
}

/** Enchance the {@link IRCMap} with {@link IRC}-aware methods.
 *  Specialized for the most important types, {@link Channel} and {@link Person}.
 *
 *  @this {IRCMap}
 *  @param {function} t     Constructor for which to specialize
 *  @param {Client}   bot   Client instance
 *  @return {IRCMap}
 */
const for_ = function( t, irc ) {
  if ( t === Channel ) {
    this.add      = addChannel.bind( this, irc )
    this.remove   = removeChannel.bind( this, irc )
  } else if ( t === Person ) {
    this.add      = addPerson.bind( this )
  }
  return this
}

/** Add a {@link Channel}, either by passing a channel name
 *  or a {@link Channel} object.
 *
 *  @this {IRCMap}
 *  @param {Client}         irc
 *  @param {Channel|string} chan
 *  @param {string=}        pass
 *  @param {function=}      callback
 *  @return {Channel}
 */
const addChannel = function( irc, chan, pass, callback ) {
  const args = Array.apply( null, arguments )
      , cbck = args.pop()
  var ch = this.get( chan )
  if ( ch ) {
    if ( cbck instanceof Function )
      cbck( ch )
    return ch
  } else if ( chan instanceof Channel
      && chan.people.contains( irc.user ) ) {
    // This means we just joined, so now we can add it to the map for all to see
    this.map.set( chan.id, chan )
    return chan
  }
  args.splice( 0, 2 )
  args.push( cbck )
  ch = chan instanceof Channel ? chan : channel( chan )
  return ch.for( irc ).join.apply( ch, args )
}

/** @this {IRCMap}
 *  @param {Client}         irc
 *  @param {Channel|string} channel
 *  @param {string=}        words
 *  @return {?Channel}
 */
const removeChannel = function( irc, channel, words ) {
  const chan = this.get( channel )
  if ( null === chan )
    return null
  // This means that we have not left the channel yet
  if ( chan.people.contains( irc.user ) )
    return chan.part( words )
  // Now we should be outta there, and can remove it from the map
  this.map.delete( chan.id )
  return chan
}

/** This should be the only function that adds a {@link Person}
 *  @this {IRCMap}
 *  @param {Person|string}  prsn
 *  @return {Person}
 */
const addPerson = function( prsn ) {
  const oldp  = this.get( prsn )
      , newp  = oldp ? null : prsn instanceof Person
                     ? prsn : person( prsn )
  if ( oldp )
    return oldp
  return this.map.set( newp.id, newp )
}

exports.IRCMap = IRCMap

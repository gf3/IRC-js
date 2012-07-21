/** @module person
 */

const format      = require( "util" ).format
    , constants   = require( "./constants" )
    , messagemod  = require( "./message" )
    , util        = require( "./util" )

const cache     = util.cache
    , id        = util.id
    , message   = messagemod.message
    , property  = util.property
    , trailing  = messagemod.trailing

const COMMAND   = constants.COMMAND

/** @constructor
 *  @param {string}  nick
 *  @param {?string} user
 *  @param {?string} host
 *  @property {string}  nick
 *  @property {?string} user
 *  @property {?string} host
 *  @property {Set}     mode
 */
const Person = function( nick, user, host ) {
  this.nick = nick
  this.user = user
  this.host = host
  this.mode = new Set()
}

/** Serialize person into prefix string
 *  @return {string}
 */
Person.prototype.toString = function() {
  return this.nick + ( this.host ? ( this.user ? "!"
       + this.user : "" ) + "@" + this.host : "" )
}

/** Enhance.
 *  @param  {Client} client
 *  @return {Person}
 */
Person.prototype.for  = function( client ) {
  this.inviteTo = invite.bind( this, client )
  this.kickFrom = kick.bind( this, client )
  this.notify   = notify.bind( this, client )
  this.tell     = say.bind( this, client )
  return this
}

property( Person.prototype, "id", function() { return id( this.nick ) } )

/** Make a Person object
 *  @throws {Error} if no matching signature was found
 *  @param {string}  nick
 *  @param {?string} user
 *  @param {?string} host
 *  @return {Person}
 */
const person = function( nick, user, host ) {
  if ( arguments.length === 0 || arguments.length > 3 )
    throw new Error( "No matching signature" )
  const pid = id( nick )
  if ( cache.has( pid ) )
    return cache.get( pid )
  const p = new Person( nick, user || null, host || null )
  return cache.set( p.id, p )
}

/** Send a {@link Message} to a {@link Person}.
 *
 *  @this   {Person}
 *  @param  {Client}  client
 *  @param  {string}  text
 *  @return {Person}
 */
const say = function( client, text ) {
  client.send( message( COMMAND.PRIVMSG, [ this, trailing( text ) ] ) )
  return this
}

/** @this   {Person}
 *  @param  {Client}          client
 *  @param  {Channel|string}  chan
 *  @return {Person}
 */
const invite = function( client, chan ) {
  client.send( message( COMMAND.INVITE, [ this, chan ] ) )
  return this
}

/** @this   {Person}
 *  @param  {Client}          client
 *  @param  {Channel|string}  chan
 *  @return {Person}
 */
const kick = function( client, chan ) {
  const name = chan.name || chan
  client.send( message( COMMAND.KICK, [ name, this.nick ] ) )
  return this
}

/** @this   {Person}
 *  @param  {Client}  client
 *  @return {Person}
 */
const notify = function( client, note ) {
  client.send( message( COMMAND.NOTICE
           , [ this, trailing( note ) ] ) )
  return this
}

/** @this {Channel|Person}
 */
const setMode = function( client, mode ) {
  client.send( message( COMMAND.MODE
           , [ this, mode ] ) )
}

exports.Person  = Person
exports.person  = person

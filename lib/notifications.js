/** @module notifications
 *  @todo {jonas} A real (well...) interface would be nice, for various objects to implement.
 */
const o = require( "./objects" )
    , c = require( "./constants" )
    , l = require( "./logger" )

const logger  = l.get( "ircjs" )
    , LEVEL   = l.LEVEL
    , STATUS  = c.STATUS

var _observers = null

/**
 *  @constructor
 *  @param {boolean}  shared  Use shared {@link Observer} map
 */
const Observable = function( shared ) {
  if ( shared && ! _observers )
    _observers = new Map()
  const map = shared ? _observers : new Map()
  this.add    = add.bind( map )
  this.get    = get.bind( map )
  this.notify = notify.bind( map )
  this.remove = remove.bind( map )
}

Observable.of = function( t ) {
  const obs = new Observable()
  obs.for = for_.bind( obs, t )
  return obs
}

// Add handy methods
const for_ = function( obj ) {
  obj.observe = this.add
  obj.ignore  = this.remove
  obj.notify  = this.notify
  return this
}

const add = function( type, handler ) {
  const types = arguments.length - 1 // Last arg is handler
      , obsrv = new Observer( arguments[types] )
  if ( 1 === types )
    return insert.call( this, type, obsrv )
  var i = 0
  do insert.call( this, arguments[ i++ ], obsrv )
  while ( i !== types )
  return obsrv
}

const get = function( type ) {
  return this.get( type ) || null
}

/**
 *  @constructor
 *  @param {function} handler
 */
const Observer = function( handler ) {
  this.notify = handle.bind( this, handler )
}

const handle = function( h ) {
  const args = arguments.length === 1
             ? [] : Array.apply( null, arguments )
  args.shift()
  return h.apply( this, args )
}

const insert = function( type, observer ) {
   // TODO switch to a Set and get tid of all the index crap, once Set is more usable.
  const key = type.toLowerCase()
      , arr = this.get( type ) || ( this.set( type, [] ) )
  arr.push( observer )
  logger.debug( "Adding observer for %s", type )
  return observer
}

const notify = function( type ) {
  if ( ! this.has( type ) )
    return false
  const oarr  = this.get( type )
      , args  = Array.apply( null, arguments )
  args.shift() // Plop off type, leaving args for Observers
  var l = oarr.length
    , o = null
    , i = 0
    , s = 0
  logger.debug( "Notifying %d observers about %s", l, type )
  // Somewhat nasty
  while ( i !== l ) {
    o = oarr[i]
    s = o.notify.apply( null, args )
    if ( s & STATUS.ERROR )
      logger.debug( "Handler %s for %s returned ERROR", o.toString(), type )
    if ( s & STATUS.REMOVE ) {
      removeIndex.call( this, type, i )
      --l
      continue
    }
    if ( s & STATUS.STOP )
      continue
    ++i
  }
  return true
}

const removeIndex = function( type, ix ) {
  const arr = this.get( type )
  logger.debug( "Removing observer for %s", type )
  arr.splice( ix, 1 )
  if ( 0 === arr.length )
    this.delete( type )
}

const remove = function( type, observer ) {
  const arr = this.get( type )
      , ix  = arr.indexOf( observer )
  if ( -1 === ix )
    return observer
  logger.debug( "Removing observer for %s", type )
  arr.splice( ix, 1 )
  if ( 0 === arr.length )
    this.delete( type )
  return observer
}

exports.Observable  = Observable
exports.Observer    = Observer
exports.STATUS      = STATUS

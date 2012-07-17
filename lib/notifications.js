/** @module notifications
 *  @todo {jonas} A real (well...) interface would be nice, for various objects to implement.
 *  @todo {jonas} Would be nice if things were more composable, maybe incorporate some stuff
 *                from my bitrotted react.js lib (https://github.com/nlogax/react.js).
 *                Would let you build smaller observers, then bigger ones from those, like lego.
 */
const objects   = require( "./objects" )
    , constants = require( "./constants" )
    , logger    = require( "./logger" )

const log     = logger.get( "ircjs" )
    , LEVEL   = constants.LEVEL
    , STATUS  = constants.STATUS

var observers = new Map()

/**
 *  @constructor
 *  @param {boolean}  shared  Use shared {@link Observer} map
 */
const Observable = function( shared ) {
  const map = shared ? observers : new Map()
  this.add    = add.bind( map )
  this.get    = get.bind( map )
  this.notify = notify.bind( map )
  this.remove = remove.bind( map )
}

// Pass along the observable object without exposing it
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

/** Adds an {@link Observer} for the specified type.
 *  If more than two arguments are provided, the additional arguments
 *  are assumed to be additional types that should be observed.
 *  @param {string}   type
 *  @param {function} handler
 *  @return {Observer}
 */
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
  log.debug( "Adding observer for %s", type )
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
  log.debug( "Notifying %d observers about %s", l, type )
  // Somewhat nasty
  while ( i !== l ) {
    o = oarr[i]
    s = o.notify.apply( null, args )
    if ( s & STATUS.ERROR )
      log.debug( "Handler %s for %s returned ERROR", o.toString(), type )
    if ( s & STATUS.REMOVE ) {
      removeIndex.call( this, type, i )
      --l
      continue
    }
    // An observer deemed this Handled™ and no one else should do stuff.
    if ( s & STATUS.STOP ) {
      log.debug( "Handler said STOP, breakin' out of this %s", type )
      break
    }
    ++i
  }
  return true
}

const removeIndex = function( type, ix ) {
  const arr = this.get( type )
  log.debug( "Removing observer for %s", type )
  arr.splice( ix, 1 )
  if ( 0 === arr.length )
    this.delete( type )
}

/** Removes an {@link Observer} for a specific type.
 *  @param {string}   type
 *  @param {Observer} observer
 */
const remove = function( type, observer ) {
  const arr = this.get( type )
      , ix  = arr.indexOf( observer )
  if ( -1 === ix )
    return observer
  log.debug( "Removing observer for %s", type )
  arr.splice( ix, 1 )
  if ( 0 === arr.length )
    this.delete( type )
  return observer
}

exports.Observable  = Observable
exports.Observer    = Observer
exports.STATUS      = STATUS

/** @module observable
 *  @todo {jonas} A real (well...) interface would be nice, for various objects to implement.
 */
const o = require( "./objects" )
    , c = require( "./constants" )
    , l = require( "./logger" )

const logger  = l.get( "ircjs" )
    , LEVEL   = l.LEVEL

/** {@link Observer} status.
 *  It supports masking so that it can be e.g. `SUCCESS | REMOVE` or `ERROR | REMOVE`.
 *  Also enables nonsense like `ERROR | SUCCESS`, so avoid that. :)
 *
 *  @enum {number}
 */
const STATUS =
  { ERROR:    0
  , INITIAL:  1 << 1
  , KEEP:     1 << 2
  , REMOVE:   1 << 3
  , RETRY:    1 << 4
  , SUCCESS:  1 << 5
  }

/** @type {Object.<string,Observer>} */
const _observers = {}

/**
 *  @constructor
 *  @param {boolean}  shared  Use shared {@link Observer} map
 */
const Observable = function( shared ) {
  const map = shared ? _observers : {}
  this.add    = add.bind( map )
  this.notify = notify.bind( map )
  this.remove = remove.bind( map )
  this.clear  = clear.bind( map )
}

// Add handy methods
Observable.prototype.for = function( obj ) {
  obj.observe = this.add
  obj.ignore  = this.remove
  return this
}

const add = function( type, handler ) {
  const types = arguments.length - 1 // Last arg is handler
      , obsrv = new Observer( arguments[types] )
  if ( 1 === types )
    return insert.call( this, type, obsrv )
  var i = 0
  do insert.call( this, arguments[i++], obsrv )
  while ( i !== types )
  return obsrv
}

/**
 *  @constructor
 *  @param {function} handler
 *  @property {STATUS}  status
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
  const arr = this[type] || ( this[type] = [] )
  arr.push( observer )
  logger.log( LEVEL.DEBUG, "[DEBUG] Adding observer for %s", type )
  return observer
}

const notify = function( type ) {
  if ( ! this[type] )
    return false
  const oarr  = this[type]
      , args  = Array.apply( null, arguments )
  args.shift() // Plop off type, leaving args for Observers
  var l = oarr.length
    , o = null
    , i = 0
    , s = 0
  // Somewhat nasty
  while ( i !== l ) {
    o = oarr[i]
    s = o.notify.apply( null, args )
    if ( s & STATUS.REMOVE ) {
      removeIndex.call( this, type, i )
      --l
      continue
    }
    ++i
  }
  logger.log( LEVEL.DEBUG, "[DEBUG] Notifying %d observers about %s", l, type )
  return true
}

const removeIndex = function( type, ix ) {
  const arr = this[type]
  logger.log( LEVEL.DEBUG, "[DEBUG] Removing observer for %s", type )
  arr.splice( ix, 1 )
  if ( 0 === arr.length )
    delete this[type]
}

const remove = function( type, observer ) {
  const arr = this[type]
      , ix  = arr.indexOf( observer )
  if ( -1 === ix )
    return observer
  logger.log( LEVEL.DEBUG, "[DEBUG] Removing observer for %s", type )
  arr.splice( ix, 1 )
  if ( 0 === arr.length )
    delete this[type]
  return observer
}

const clear = function() {
  var type
  for ( type in this )
    delete this[type]
  return this
}

if ( process.env["IRCJS_TEST"] )
  exports._observers = _observers

exports.Observable  = Observable
exports.Observer    = Observer
exports.STATUS      = STATUS

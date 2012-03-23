/** @module observer
 *  @todo {jonas} Some kind of observable interface would be nice
 *                for {@link Channel}s, {@link Person}s, etc.
 */
const f = require( "util" ).format
    , o = require( "./objects" )
    , c = require( "./constants" )

/** {@link Observer} return value.
 *  It's a mask so that you can return e.g. `SUCCESS | REMOVE`
 *  or `ERROR | RETRY`. Also enabled nonsense like `ERROR | SUCCESS`, so avoid that. :)
 */
const STATUS =
  { ERROR:   0      // Indicate something went wrong, if someone needs to know
  , REMOVE:  1 << 1 // Tell IRC to remove the listener now
  , RETRY:   1 << 2 // Express wish for something to be retried
  , SUCCESS: 1 << 3 // Indicate success
  }

/** @type {Object.<string,function>} */
const _observers = {}

/**
 * @constructor
 */
const Observer = function( type, handler ) {
}

const observe = function( f ) {
  
}

exports.Observer = Observer
exports.observe  = observe
exports.STATUS   = STATUS
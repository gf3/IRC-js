const cache = new Map()

/** Makes an ID for an object, taking IRC case insensitivity into account.
 *  IRC defines the characters {}|^ to be the lower-case equivalents of  []\~.
 *  This is important for determining if nicknames and other things are equivalent.
 */
const charRE  = /[|{}^]/g
    , chars   = new Map()

chars.set( '{', '[' )
chars.set( '}', ']' )
chars.set( '|', '\\' )
chars.set( '^', '~' )

const getChar = chars.get.bind( chars ) // Silly broken JS methods...

const id = function( s ) {
  return s.toUpperCase().replace( charRE, getChar )
}

const property = function( obj, name, getter, setter ) {
  const argc = arguments.length
  switch ( argc ) {
    case 3:
      if ( getter instanceof Function )
        Object.defineProperty( obj, name, { get: getter } )
      else
        Object.defineProperty( obj, name, { value: getter } )
      break
    case 4:
      Object.defineProperty( obj, name, { get: getter, set: setter } )
      break
    default:
      throw new Error()
  }
  return obj
}

exports.cache     = cache
exports.id        = id
exports.property  = property

/** @module logger
 *  Exists only because I can't figure out how to set log levels
 *  or anything in Node.
 *  @todo Add logging to file, rotation, color, etc.
 */

const TEST  = process.env["IRCJS_TEST"] ? true : false
    , fmt   = require( "util" ).format

const dummy =
  { output: []
  , log:
      function() {
        const out = fmt.apply( null, arguments )
        console.log.apply( console, arguments )
        dummy.output.unshift( out )
        return this
      }
  }

const out = TEST ? dummy : console

/** @enum {number} */
const LEVEL =
  { DEBUG:  1 << 0
  , INFO:   1 << 1
  , WARN:   1 << 2
  , ERROR:  1 << 3
  }

LEVEL.ALL   = LEVEL.DEBUG | LEVEL.INFO | LEVEL.WARN | LEVEL.ERROR
LEVEL.NONE  = 0

/** Get a {@link LEVEL} from a string, e.g. "debug warn"
 *  @throws {Error} if no level could be matched
 *  @param {string} s
 *  @return {LEVEL}
 */
LEVEL.fromString = function( s ) {
  const ms  = s.toUpperCase().match( levelRE )
      , l   = ms && ms.length
  var ret = LEVEL.NONE
    , i = l
  if ( ! ms )
    throw new Error( fmt( "Could not extract any log levels from %s", s ) )
  while ( i )
    ret |= LEVEL[ ms[ --i ] ]
  return ret
}

// For fuzzy reading from config file
const levelRE = RegExp( "\\b(debug|info|warn|error|all|none)\\b", "gi" )

const loggers = new Map()

/** Get an IRCLog, or create one.
 *  @param {string} name
 *  @param {LEVEL|string=} level
 *  @return {IRCLog}
 */
const get = function( name, level ) {
  const argc    = arguments.length
      , logger  = loggers.get( name )
  if ( logger )
    return logger
  if ( 2 === argc )
    level = LEVEL.ALL & level ? level : LEVEL.fromString( level )
  else
    level = LEVEL.ALL
  return new IRCLog( name, level )
}

/**
 * @constructor
 * @param {string}  name
 * @param {LEVEL}   level
 */
const IRCLog = function( name, level ) {
  if ( ! ( LEVEL.ALL & level ) )
    throw new Error( fmt( "Unknown level %s", level ) )
  this.level = level
  loggers.set( name, this )
}

/**
 * @param {LEVEL} level
 * @param {...*}  args
 * @return {IRCLog}
 */
IRCLog.prototype.log = function( level, args ) {
  const rest = Array.apply( null, arguments )
  rest.shift()
  if ( this.level & level )
    out.log.apply( out, rest )
  return this
}

if ( TEST )
  exports._output = dummy.output

exports.IRCLog  = IRCLog
exports.LEVEL   = LEVEL
exports.get     = get

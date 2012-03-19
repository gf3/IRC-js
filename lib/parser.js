/** @module parser
 *  @todo {jonas} Optimize
 *
 *  Yes, regex-based parsers are gross
 *  but IRC is simplistic enough to put it within the realm of sanity.
 *  Also, V8's regex engine is very good, this is about a hundred
 *  times faster than the PanPG-based parser in previous versions
 *  of IRC-js, while using significantly less memory.
 */

const path = require( "path" )
    , f    = require( "util" ).format
    , o    = require( "./objects" )
    , c    = require( "./constants" )

/** @param {...string} Two or more regular expressions (in string form)
 *  @return {string}   An expression where all inputs are joined into one expression accepting any of them
 */
const alt = function() {
  const alts = Array.apply( null, arguments )
  return r( "(?:", alts.join( "|" ), ")" )
}

// Make a rule from a combination of other rules.
// Or join an array, but that doesn't sound very cool.
const r = function() {
  return Array.apply( null, arguments ).join( "" )
}

// Get the value of a match, or default
const get = function( matches, ix, def ) {
  const match = matches[ix]
  return undefined === match ? def || null : match
}

// Basic rules
const upper     = "A-Z"
    , lower     = "a-z"
    , digit     = "0-9"
    , bell      = "\\u0007"
    , asterisk  = "\\u002A"
    , colon     = "\\u003A"
    , space     = "\\u0020"
    , cflex     = "\\u005E"
    , rsolid    = "\\u005C"
    , hyphen    = "\\u002D"
    , plus      = "\\u002B"
    , fullstop  = "\\u002E"
    , vline     = "\\u007C"
    , crlf      = "\\u000D\\u000A"
    , sbracket  = "\\u005B\\u005D"
    , cbracket  = "\\u007B\\u007D"
    , letter    = r( upper, lower )
    , alphanum  = r( letter, digit )
    // Common parts of various names
    , common    = r( alphanum, sbracket, hyphen, vline )

// Message rules
const nick      = r( "[`_", common, cbracket, cflex, rsolid, "]+" )
    , user      = r( "[`_=~", common, fullstop, cflex, rsolid, "]+" )
    , host      = r( "[/_", common, fullstop, colon, "]+" )
    , person    = r( "(", nick, ")(?:(?:!(", user, "))?@(", host, "))?" )
    , server    = r( "([_", common, fullstop, asterisk, "]+)(?!(?:(?:!", user, ")?@", host, "))" )
    , prefix    = r( colon, alt( server, person ), space )
    , command   = r( "([", upper, "]+|[", digit, "]{3})" )
    , middle    = r( "[^", colon, crlf, space, "]+" )
    , trailing  = r( colon, "[^", crlf, "]*" )
    , params    = r( "((?:", middle, space, "?)*(?:", trailing, ")?)" )
    , message   = r( "^(?:", prefix, ")?", command, "(?: ", params, ")?", crlf, "$" )

const // Match a standalone server/person
      prefixRE  = new RegExp( r( "^", alt( server, person ), "$" ) )
      // Match any number of individual params
    , paramsRE  = new RegExp( r( "(", middle, ")|(", trailing, ")" ), "g" )
      // Match a full message
    , messageRE = new RegExp( message )

// Mode rules
const flag  = r( "[", letter, "]" )
    , mode  = r( "([", hyphen, plus, "]", flag, "+)" )

// Match a mode string
const modeRE  = new RegExp( mode, "g" )

// Channel rules
const cprefix = "\\u0021\\u0023\\u0026\\u002B" // !#&+
    , channel = r( "^([", cprefix, "][^", bell, space, ",", colon, "]+)$" )

const channelRE = new RegExp( channel )

/** Parse an IRC message
 *  <code>parseMessage( ":nick!name@host.com PRIVMSG #channel :Hello there\r\n" )</code>
 *
 *  @throws {SyntaxError} if parsing fails and toss === true
 *  @param {string}   data
 *  @param {boolean=} toss
 *  @return {Message|null}
 */
const parseMessage = function( data, toss ) {
  const matches = data.match( messageRE )
  if ( null === matches )
    if ( true === toss )
      throw new SyntaxError( f( "Could not parse message \"%s\"", data ) )
    else
      return matches
  const params = matches[6] ? parseParams( matches[6] ) : []
      , prefix = matches[2]
               ? new o.Person( matches[2], get( matches, 3 ), get( matches, 4 ) )
               : matches[1] ? new o.Server( matches[1] ) : null
  return new o.Message( prefix, matches[5], params )
}

const parseParams = function( data ) {
  const matches = data.match( paramsRE )
  return matches
}

const parsePrefix = function( data ) {
  const ms = data.match( prefixRE )
  return ms[2] ? new o.Person( ms[2], get( ms, 3 ), get( ms, 4 ) )
               : ms[1] ? new o.Server( ms[1] ) : null
}

const parseChannel = function( data, toss ) {
  const ms = data.match( channelRE )
  if ( null === ms )
    if ( true === toss )
      throw new SyntaxError( f( "Could not parse channel \"%s\"", data ) )
    else
      return ms
  return new o.Channel( ms[1] )
}

/** Parse a mode string, e.g. "+im-t", into a pair of masks
 *  using value from the flags param
 *  @param {string} data
 *  @param {Object.<string, number>=} flags_
 *  @return {number} Mask of flags
 */
const parseMode = function( data, flags_ ) {
  const match  = data.match( modeRE )
      , flags  = flags_ || c.MODE.CHAR.CHANNEL
      , length = match ? match.length : 0
      , masks  = [ 0, 0 ]
  var flag = 0
    , set  = false
    , i, j, k
  for ( i = 0; i < length; ++i ) {
    k = match[i].length;
    set = match[i][0] === "+"
    for ( j = 1; j < k; ++j ) {
      flag = flags[match[i][j]]
      masks[ set ? 0 : 1 ] |= ( flag || 0 )
    }
  }
  return masks
}

const isChannel = function( data ) {
  return null !== parseChannel( data )
}

const expose =
  { channel:    parseChannel
  , message:    parseMessage
  , mode:       parseMode
  , params:     parseParams
  , prefix:     parsePrefix
  , isChannel:  isChannel
  }

module.exports = expose

/** @module parser
 *  @todo {jonas} Optimize
 *
 *  Yes, regex-based parsers are gross
 *  but IRC is simplistic enough to put it within the realm of sanity.
 *  Also, V8's regex engine is very good, this is about a hundred
 *  times faster than the PanPG-based parser in previous versions
 *  of IRC-js, while using significantly less memory.
 */

const f = require( "util" ).format
    , o = require( "./objects" )
    , c = require( "./constants" )

/** @param {...string} Two or more regular expressions (in string form)
 *  @return {string}   An expression where all inputs are joined into one expression accepting any of them
 */
const alt = function() {
  const alts = Array.apply( null, arguments )
  return rule( "(?:", alts.join( "|" ), ")" )
}

/** Make a rule from a sequence of other rules.
 *  Or join a bunch of strings, but that doesn't sound very cool.
 *  @param {...string}
 *  @return {string}
 */
const rule = function() {
  return Array.apply( null, arguments ).join( "" )
}

/** Get unicode escape sequence for a char or two.
 *  @param {...string} c  E.g. '+'
 *  @return {string}      E.g. "\\u002B"
 */
const char = function( c ) {
  // Beware of troll-JS, Array.apply( null, [10] ) gives you 10 undefined items
  // while Array.apply( null, [1, 2] ) gives you [1, 2]
  const count = arguments.length
      , chars = count > 1 ? Array.apply( null, arguments ) : [ c ]
  return chars.map( hex ).join( "" )
}

const range = function( begin, end ) {
  return rule( begin, '-', end )
}

// Hexify and pad a char/num
const hex = function( c ) {
  const n = c.constructor === Number ? c : c.charCodeAt( 0 )
      , s = n.toString( 16 )
  return f( "\\u%s%s", Array( 5 - s.length ).join( '0' ), s )
}

// Get the value of a match, or default
const get = function( matches, ix, def ) {
  const match = matches[ix]
  return undefined === match ? def || null : match
}


// Basic rules
const upper     = range( 'A', 'Z' )
    , lower     = range( 'a', 'z' )
    , digit     = range( '0', '9' )
    , asterisk  = char( '*' )
    , colon     = char( ':' )
    , space     = char( 0x20 )
    , cflex     = char( '^' )
    , rsolid    = char( 0x5C )
    , hyphen    = char( '-' )
    , plus      = char( '+' )
    , fullstop  = char( '.' )
    , vline     = char( '|' )
    , crlf      = char( 0xD, 0xA )
    , sbracket  = char( '[', ']' )
    , cbracket  = char( '{', '}' )
    , letter    = rule( upper, lower )
    , alphanum  = rule( letter, digit )
    // Common parts of various names
    , common    = rule( alphanum, sbracket, hyphen, vline )
    , bell      = char( 0x7 )

// Channel rules
const cprefix = char( '!', '#', '&', '+' )
    , channel = rule( "^([", cprefix, "][^", bell, space, ",", colon, "]+)$" )

// Message rules
const nick      = rule( "[`_", common, cbracket, cflex, rsolid, "]+" )
    , user      = rule( "[`_=~", common, fullstop, cflex, rsolid, "]+" )
    , host      = rule( "[/_", common, fullstop, colon, "]+" )
    , person    = rule( "(", nick, ")(?:(?:!(", user, "))?@(", host, "))?" )
    , server    = rule( "([_", common, fullstop, asterisk, "]+)(?!(?:(?:!", user, ")?@", host, "))" )
    , prefix    = rule( colon, alt( server, person ), space )
    , command   = rule( "([", upper, "]+|[", digit, "]{3})" )
    , middle    = rule( "[^", colon, crlf, space, "]+" )
    , trailing  = rule( colon, "[^", crlf, "]*" )
    , params    = rule( "((?:", middle, space, "?)*(?:", trailing, ")?)" )
    , message   = rule( "^(?:", prefix, ")?", command, "(?: ", params, ")?", crlf, "$" )

// Mode rules
const flag  = rule( "[", letter, "]" )
    , mode  = rule( "([", hyphen, plus, "]", flag, "+)" )

// Nick rules
const
    // Prefix chars I could find, feel free to add unusual ones used by strange software
    // http://emptv.com/irc-ref
    nprefix = char( '%', '&', '+', '@', '~' )

const channelRE = RegExp( channel )
    // Match standalone nick(s), like comma-separated lists of nicks with mode-indicating prefix
    , nickRE    = RegExp( rule( "(?![", nprefix ,"])", "(", nick, ")" ), "g" )
    // Match a mode string
    , modeRE    = RegExp( mode, "g" )
    // Match a standalone server/person
      prefixRE  = RegExp( rule( alt( server, person ) ) )
    // Match any number of individual params
    , paramsRE  = RegExp( rule( "(", middle, ")|(", trailing, ")" ), "g" )
    // Match a full message
    , messageRE = RegExp( message )

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
      return null
  const params = matches[6] ? parseParams( matches[6] ) : []
      , prefix = matches[2]
               ? new o.Person( matches[2], get( matches, 3 ), get( matches, 4 ) )
               : matches[1] ? new o.Server( matches[1] ) : null
  return new o.Message( prefix, matches[5], params )
}

/**
 *  @param {string} data
 *  @return {Array|null}
 */
const parseParams = function( data ) {
  return data.match( paramsRE )
}

/**
 *  @param {string} data
 *  @return {Person|Server|null}
 */
const parsePrefix = function( data ) {
  const ms = data.match( prefixRE )
  return ms[2] ? new o.Person( ms[2], get( ms, 3 ), get( ms, 4 ) )
               : ms[1] ? new o.Server( ms[1] ) : null
}

/**
 *  @throws {SyntaxError} if parsing fails and toss === true
 *  @param {string} data
 *  @return {Channel|null}
 */
const parseChannel = function( data, toss ) {
  const ms = data.match( channelRE )
  if ( null === ms )
    if ( true === toss )
      throw new SyntaxError( f( "Could not parse channel \"%s\"", data ) )
    else
      return null
  return new o.Channel( ms[1] )
}

/**
 *  @param {string}  data
 *  @param {boolean} many
 *  @return {Array|string|null}
 */
const parseNick = function( data, many ) {
  const ms = data.match( nickRE )
  if ( ! ms )
    return null
  return many ? ms : ms[0]
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

module.exports =
  { channel:    parseChannel
  , message:    parseMessage
  , mode:       parseMode
  , nick:       parseNick
  , params:     parseParams
  , prefix:     parsePrefix
  // For use in other modules
  , alt:        alt
  , char:       char
  , range:      range
  , rule:       rule
  }

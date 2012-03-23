/** @module color
 *  @todo Come up with an actually nice API :)
 *
 *  Support for (M)IRC colors.
 *  http://irssi.org/documentation/formats
 *  http://www.mirc.com/colors.html
 */
const fmt     = require( "util" ).format
    , parser  = require( "./parser" )
    , char    = parser.char
    , rule    = parser.rule

const COLOR =
  { WHITE:       0
  , BLACK:       1
  , BLUE:        2
  , GREEN:       3
  , RED:         4
  , BROWN:       5
  , PURPLE:      6
  , ORANGE:      7  // YEAH THAT'S RIGHT
  , YELLOW:      8
  , LIGHTGREEN:  9
  , TEAL:        10
  , LIGHTCYAN:   11
  , LIGHTBLUE:   12
  , PINK:        13
  , GREY:        14
  , LIGHTGREY:   15
  }

// Rules
const ccode = rule( "(?:[a-z]{3,10}|[0-9]{1,2})" )
    , begin = char( '{', '[', '<' )
    , end   = char( '}', ']', '>' )
    , color = rule( "(", ccode, ")(?:[|,:](", ccode, "))?[", begin, "]", "([^", end, "]+)", "[", end, "]" )

const colorRE = RegExp( color, "gi" )

const cchar   = String.fromCharCode( 0x7 )

const replace = function( _, fg, bg, txt ) {
  const fgc = COLOR[fg.toUpperCase()]
      , bgc = bg ? COLOR[bg.toUpperCase()] : undefined
  if ( undefined === fgc )
    return txt
  if ( undefined === bgc )
    return fmt( "%s%s%s%s", cchar, fgc, txt, cchar )
  return fmt( "%s%s,%s%s%s", cchar, fgc, bgc, txt, cchar )
}

const colorize = function( s ) {
  return s.replace( colorRE, replace )
}

exports.colorize = colorize

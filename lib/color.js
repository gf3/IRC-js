/** @module color
 *  @todo Come up with an actually nice API :)
 *
 *  Support for (M)IRC colors.
 *  http://irssi.org/documentation/formats
 *  http://www.mirc.com/colors.html
 */
const fmt     = require( "util" ).format
    , parser  = require( "./parser" )
    , alt     = parser.alt
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

const FORMAT =
  { BOLD:      String.fromCharCode( 0x2 )
  , ITALIC:    String.fromCharCode( 0x16 )
  , UNDERLINE: String.fromCharCode( 0x1F )
  }

// Rules
const ccode = rule( alt.apply( null, Object.keys( COLOR ) ) )
    , fcode = rule( alt.apply( null, Object.keys( FORMAT ) ) )
    , begin = char( '{', '[', '<' )
    , end   = char( '}', ']', '>' )
    , color = rule( "(", ccode, ")(?:[|,:](", ccode, "))?["
                  , begin, "]", "([^", end, "]+)", "[", end, "]" )

const colorRE = RegExp( color, "gi" )

const cstart  = String.fromCharCode( 0x3 )
    , cclear  = String.fromCharCode( 0xF )

const replace = function( _, fg, bg, txt ) {
  const fgc = COLOR[fg.toUpperCase()]
      , bgc = bg ? COLOR[bg.toUpperCase()] : null

  if ( null === bgc )
    return fmt( "%s%s%s%s", cstart, fgc, txt, cclear )

  return fmt( "%s%s,%s%s%s", cstart, fgc, bgc, txt, cclear )
}

const colorize = function( s ) {
  return s.replace( colorRE, replace )
}

// >:)
String.prototype.colorize = function() {
  return colorize.call( null, this )
}

String.prototype.format = function() {
  const args = [ this ]
  args.push.apply( args, arguments )
  return fmt.apply( null, args )
}

exports.colorize = colorize

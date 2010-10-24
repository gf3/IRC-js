var Colour = {}

/* ------------------------------ Colours ------------------------------ */
Colour.colours =
  { 'black':   30
  , 'red':     31
  , 'green':   32
  , 'yellow':  33
  , 'blue':    34
  , 'magenta': 35
  , 'cyan':    36
  , 'white':   37
  }

Colour.extras =
  { 'clear':     0
  , 'bold':      1
  , 'underline': 4
  , 'reversed':  7
  }

/* ------------------------------ Colour Methods ------------------------------ */
// Colourise a given string based on the passed options.
Colour.colourise = function( string, options ) { var out
  options = options || {}
  out = ''
  if ( options.foreground )
    out += this.colour( options.foreground )
  if ( options.background )
    out += this.colour( options.background, true )
  if ( options.extra )
    out += this.extra( options.extra )
  out += string + this.extra( 'clear' )
  return out
}

// Generate an acceptable colour escape code.
Colour.colour = function( name, background ) { var colour
  if ( ! name in this.colours )
    colour = ''
  else
    colour = "\033[" + ( this.colours[ name ] + ( background ? 10 : 0 ) ) + "m"
  return colour
}

// Generate an acceptable modifier escape code.
Colour.extra = function( name ) { var extra
  if ( ! name in this.extras )
    extra = ''
  else
    extra = "\033[" + this.extras[ name ] + "m"
  return extra
}

/* ------------------------------ Native Additions ------------------------------ */
Colour.extendString = function( nativeProto ) {
  nativeProto = nativeProto || String.prototype
  Object.keys( Colour.colours ).forEach( function( foreground ) {
    // Foregrounds
    Object.defineProperty( nativeProto, foreground, { value: function() {
      return Colour.colourise( this, { foreground: foreground } )
    }})
    // Backgrounds
    Object.keys( Colour.colours ).forEach( function( background ) {
      Object.defineProperty( nativeProto, foreground + '_on_' + background, { value: function() {
        return Colour.colourise( this, { foreground: foreground, background: background } )
      }})
    })
  })

  Object.keys( Colour.extras ).forEach( function( extra ) {
    // Extras
    Object.defineProperty( nativeProto, extra, { value: function() {
      return Colour.colourise( this, { extra: extra } )
    }})
  })
}

/* ------------------------------ Export ------------------------------ */
module.exports = Colour


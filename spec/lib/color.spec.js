const f       = require( "util" ).format
    , path    = require( "path" )
    , should  = require( "should" )
    , libPath = path.join( __dirname, "..", "..", "lib" )
    // HELP!! If this is not require()d, a bunch of *other* tests fail.
    // I'm too stupid to understand why.
    , irc     = require( path.join( libPath, "irc" ) ) // <- This one, that is
    , color   = require( path.join( libPath, "color" ) )

describe( "color", function() {
  describe( "colorize", function() {
    it( "should colorize stuff", function() {
      color.colorize( "red{color!}" ).should.equal( "\u00074color!\u0007" )
      color.colorize( "red,blue{more color!}" ).should.equal( "\u00074,2more color!\u0007" )
      color.colorize( "red,blue{color!} and then some text and then green{green color}" )
        .should.equal( "\u00074,2color!\u0007 and then some text and then \u00073green color\u0007" )
      color.colorize( "red[color!]" ).should.equal( "\u00074color!\u0007" )
      color.colorize( "red:blue[more color!]" ).should.equal( "\u00074,2more color!\u0007" )
      color.colorize( "red:blue[color!] and then some text and then green[green color]" )
        .should.equal( "\u00074,2color!\u0007 and then some text and then \u00073green color\u0007" )
      color.colorize( "red<color!>" ).should.equal( "\u00074color!\u0007" )
      color.colorize( "red|blue<more color!>" ).should.equal( "\u00074,2more color!\u0007" )
      color.colorize( "red|blue<color!> and then some text and then green<green color>" )
        .should.equal( "\u00074,2color!\u0007 and then some text and then \u00073green color\u0007" )
    })
  })
})

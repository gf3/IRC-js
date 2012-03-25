const f       = require( "util" ).format
    , path    = require( "path" )
    , should  = require( "should" )
    , lib     = path.join( __dirname, "..", "..", "lib" )
    // HELP!! If this is not require()d, a bunch of *other* tests fail.
    // I'm too stupid to understand why.
    , irc     = require( path.join( lib, "irc" ) ) // <- This one, that is
    , color   = require( path.join( lib, "color" ) )

describe( "color", function() {
  describe( "colorize", function() {
    it( "should colorize stuff", function() {
      color.colorize( "red{color!}" ).should.equal( "\u00034color!\u000F" )
      color.colorize( "red,blue{more color!}" ).should.equal( "\u00034,2more color!\u000F" )
      color.colorize( "red,blue{color!} and then some text and then green{green color}" )
        .should.equal( "\u00034,2color!\u000F and then some text and then \u00033green color\u000F" )
      color.colorize( "red[color!]" ).should.equal( "\u00034color!\u000F" )
      color.colorize( "red:blue[more color!]" ).should.equal( "\u00034,2more color!\u000F" )
      color.colorize( "red:blue[color!] and then some text and then green[green color]" )
        .should.equal( "\u00034,2color!\u000F and then some text and then \u00033green color\u000F" )
      color.colorize( "red<color!>" ).should.equal( "\u00034color!\u000F" )
      color.colorize( "red|blue<more color!>" ).should.equal( "\u00034,2more color!\u000F" )
      color.colorize( "red|blue<color!> and then some text and then green<green color>" )
        .should.equal( "\u00034,2color!\u000F and then some text and then \u00033green color\u000F" )
    })
  })
})

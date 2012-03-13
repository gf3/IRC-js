const format = require( "util" ).format
    , path = require( "path" )
    , fs = require( "fs" )
    , ppg = require( "../node_modules/PanPG/PanPG" )
    , pegDir = path.join( __dirname, "..", "lib", "peg" )
    , jsDir = path.join( __dirname, "..", "lib", "parser" )

// Grammars and their sub-grammars
const grammars =
  { "message": [ "prefix", "shared" ]
  , "mode": []
  , "prefix": [ "shared" ]
  }

const readPeg = function( p ) {
  return fs.readFileSync( path.join( pegDir, format( "%s.peg", p ) ), "utf8" )
}

Object.keys( grammars ).forEach( function( k ) {
  try {
    const peg  = readPeg( k )
        , deps = grammars[k].map( readPeg )
        , opts = { commonjs: true
                 , fname: k
                 }
        , parser = ppg.generateParser( [peg].concat( deps ), opts )
    try {
      fs.writeFileSync( path.join( jsDir, format( "%s.js", k ) ), parser )
      console.info( "✔ Wrote file: %s.js", k )
    } catch (e) {
      console.error( "✖ Unable to write file" )
      console.error( err.message )
      console.error( err.stack )
    }
  } catch ( e ) {
    console.error( format( "✖ Parser %s could not be generated", k ) )
    console.error( e.message )
    console.error( e.stack )
  }
} )

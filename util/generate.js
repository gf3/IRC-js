const ppg = require( "../node_modules/PanPG/PanPG" )
    , path = require( "path" )
    , fs = require( "fs" )
    , peg = fs.readFileSync( path.join( __dirname, "..", "lib", "irc.peg" ) ).toString()
    , filename = path.join( __dirname, "..", "lib", "parser.js" )
    , options = // TODO drop/elide stuff for smaller tree?
      { commonjs: true
      , fname: "parser"
      }

try {
  const parser = ppg.generateParser( peg, options )
  fs.writeFile( filename, parser, function( err ) {
    if ( ! err )
      return console.info( "✔ Wrote file: %s", filename )
    console.error( "✖ Unable to write file." )
    console.error( err.message )
    console.error( err.stack )
  })
} catch ( e ) {
  console.error( "✖ Parser could not be generated." )
  console.error( e.message )
  console.error( e.stack )
  return 1
}

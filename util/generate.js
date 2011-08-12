var PanPG = require( '../node_modules/PanPG/PanPG' )
  , path = require( 'path' )
  , fs = require( 'fs' )
  , PEG = fs.readFileSync( path.join( __dirname, '..', 'lib', 'irc.peg' ) ).toString()
  , options =
    { 'commonjs': true
    , 'fname': 'Parser'
    }
  , parser
  , filename = path.join( __dirname, '..', 'lib', 'parser.js' )

/* ------------------------------ Build Parser ------------------------------ */
try {
  parser = PanPG.generateParser( PEG, options )
  fs.writeFile( filename, parser, function( err ) {
    if ( err ) {
      console.error( '✖ Unable to write file.' )
      console.error( err.message )
      console.error( err.stack )
      return 1
    }
    else
      console.info( '✔ Wrote file: "' + filename + '"' )
  })
}
catch ( e ) {
  console.error( '✖ Parser could not be generated.' )
  console.error( e.message )
  console.error( e.stack )
  return 1
}


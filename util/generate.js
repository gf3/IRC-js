var ColouredLog = require( '../node_modules/coloured-log' )
  , PanPG = require( '../node_modules/PanPG/PanPG' )
  , path = require( 'path' )
  , fs = require( 'fs' )
  , Log
  , PEG = fs.readFileSync( path.join( __dirname, '..', 'lib', 'irc.peg' ) ).toString()
  , options =
    { 'commonjs': true
    , 'fname': 'Parser'
    }
  , parser
  , filename = path.join( __dirname, '..', 'lib', 'parser.js' )

/* ------------------------------ Build Parser ------------------------------ */
Log = new ColouredLog( ColouredLog.DEBUG )

try {
  parser = PanPG.generateParser( PEG, options )
  fs.writeFile( filename, parser, function( err ) {
    if ( err ) {
      Log.error( 'Unable to write file.' )
      console.log( err.message )
      console.log( err.stack )
    }
    else
      Log.info( 'Wrote file: "' + filename + '"' )
  })
}
catch ( e ) {
  Log.error( 'Parser could not be generated.' )
  console.log( e.message )
  console.log( e.stack )
}


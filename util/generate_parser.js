var Colour = require( '../node_modules/coloured' )
  , PanPG = require( '../node_modules/PanPG/PanPG' )
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
Colour.extendString()

try {
  parser = PanPG.generateParser( PEG, options )
  fs.writeFile( filename, parser, function( err ) {
    if ( err ) {
      error( 'Unable to write file.' )
      console.log( err )
    }
    else
      success( 'Wrote file: "' + filename + '"' )
  })
}
catch ( e ) {
  error( 'Parser could not be generated.' )
  console.log( e.message )
  console.log( e.stack )
}

/* ------------------------------ Functions ------------------------------ */
function success( msg ) {
  console.log( '[SUCCESS] '.green().bold() + msg )
}

function error( msg ) {
  console.log( '[ERROR] '.red().bold() + msg )
}


const path = require( "path" )
    , fs   = require( "fs" )
    , irc  = require( path.join( __dirname, "..", "lib", "irc" ) )
    , fxtp = path.join( __dirname, "fixtures" )
    , srv  = require( "./server" )

const readFixture = function( fileName, fp ) {
  return JSON.parse( fs.readFileSync( path.join( fp || fxtp, fileName ), "utf8" ) )
}

const conf = path.join( __dirname, "lib", "config.json" )
    , cobj = JSON.parse( fs.readFileSync( conf, "utf8" ) )

const server = srv.server

server.listen( cobj.server.port, cobj.server.address )

const bot = new irc.Client( conf ).connect()

// Convenience wrapper around `it`, with added bottage/servage
const bit = function( desc, f ) {
  
  server.removeAllListeners( "message" )
  if ( ! f )
    return it( desc )
  it( desc, f.bind( bot ) )
}

exports.bit         = bit
exports.conf        = cobj
exports.readFixture = readFixture

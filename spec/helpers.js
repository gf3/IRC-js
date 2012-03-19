const path = require( "path" )
    , fs   = require( "fs" )
    , irc  = require( path.join( __dirname, "..", "lib", "irc" ) )
    , conf = path.join( __dirname, "lib", "config.json" )

// Convenience wrapper around `it`, with added bottage
const bit = function( desc, f ) {
  const bot = new irc.IRC( conf ).connect()
  // Expose people cache
  bot._people = irc.cache.people
  fbot = f.bind( bot )
  return it( desc, fbot )
}

exports.bit  = bit
exports.conf = JSON.parse( fs.readFileSync( conf, "utf8" ) )

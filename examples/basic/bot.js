// In your Bot, IRC-js is a node module, so requiring it is nicer
const path = require( "path" )
    , fs   = require( "fs" )
    , here = __dirname
    , lib  = path.join( here, "..", "..", "lib" )
    , IRC  = require( path.join( lib, "irc" ) )
    , CODE = require ( path.join( lib, "constants" ) )

const config =
      JSON.parse( fs.readFileSync( path.join( here, "config.json" ), "utf8" ) )

const bot = new IRC( config ).connect( function() {
  bot.join( "#nlogax" )
  bot.say( "#nlogax", "Hello!" )
})

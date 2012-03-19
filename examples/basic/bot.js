const path = require( "path" )
    , fs   = require( "fs" )
    , fmt  = require( "util" ).format
    , here = __dirname
    , lib  = path.join( here, "..", "..", "lib" )
    , IRC  = require( path.join( lib, "irc" ) ).IRC

const config = path.join( here, "config.json" )

const bot = new IRC( config ).connect( function() {
  bot.channels.add( "#nlogax", function( chan ) {
    chan.say( "Hello!" )
        .say( fmt( "What kind of topic is “%s”? I will fix it.", chan.topic ) )
        .setTopic( fmt( "%s was here @ %s"
                      , bot.config.nick
                      , new Date() ) )

    chan.people.contains( "nlogax" )
      ? chan.say( "nlogax: I ♥ U" )
      : chan.invite( "nlogax", "WHERE R U" )
  })
})

bot.listenFor( fmt( " *@?%s *:? *(.+)", bot.config.nick )
             , function( msg, remark ) {
  const wittyReply = fmt( "%s: no ur a %s", msg.prefix.nick, remark )
  msg.reply( wittyReply.toUpperCase() )
})

bot.listenFor( "quit (.+)", function( _, partingWords ) {
  bot.quit( partingWords )
})

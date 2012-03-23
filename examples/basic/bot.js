// Get the stuff we need for our bot.
// When you have IRC-js installed properly, it looks nicer of course.
const path = require( "path" )
    , fmt  = require( "util" ).format
    , here = __dirname
    , lib  = path.join( here, "..", "..", "lib" )
    , IRC  = require( path.join( lib, "irc" ) ).IRC

// Get a path to your config file.
// Consult the default file for comments about the various options.
const conf = path.join( here, process.argv[2] || "config.json" )

// Create an IRC instance, tell it where the config file is.
// Then tell it to connect.
const bot = new IRC( conf ).connect( function() {
  // The bot is now connected, add a channel. Ok.
  // The `add` method returns a `Channel` immediately, but the bot has not joined yet.
  bot.channels.add( "#nlogax", function( chan ) {
    // It has now joined the channel, and we get a `Channel` object to play with.
    // You can `say` stuff in the channel, maybe `setTopic` to something nice.
    chan.say( "Hello!" )
        .say( fmt( "What kind of topic is “%s”? I will fix it.", chan.topic ) )
        .setTopic( fmt( "%s was here @ %s", bot.config.nick, new Date() ) )
    // A `Channel` contains `Person` objects (unless it's empty, of course).
    // You can access these through the `people` property.
    chan.people.contains( "nlogax" )          // Is nlogax in the channel?
      ? chan.say( "nlogax: I ♥ U" )           // If so, profess bot love.
      : chan.invite( "nlogax", "WHERE R U" )  // If not, try to invite nlogax.
  })
})

// Listen for a message matching a pattern, in this case something like `basicbotjs: ur an alligator`
// with some fuzzy matching since people write in different ways. Those people...
bot.listenFor( fmt( " *@?%s *:? *([Yy]ou(?:['’]?re)?|u(?: r)|ur?) +(.+)", bot.config.nick )
             , function( msg, you, remark ) {
  // Each group captured by the pattern is passed as an argument.
  // More capture groups, more arguments.
  const wittyReply = fmt( "%s: no %s %s", msg.prefix.nick, you, remark )
  // `Message` objects have a set of handy methods, like `reply`.
  // It is useful when you want to respond in the same context (e.g. a channel, private message).
  msg.reply( wittyReply.toUpperCase() ) // IRC
})

// Automatically join a channel if invited.
bot.addListener( "invite", function( msg ) {
  const chan = bot.channels.add( msg.params[1] )
  chan.say( fmt( "Thanks for inviting me, %s", msg.prefix.nick ) )
})

// Love ice cream.
bot.listenFor( /\bice\b +cream\b/i
             , function( msg ) { msg.reply( "I love ice cream." ) } )

// Listen for various commands from bot's human overlords (for now...).
bot.listenFor( fmt( "@?%s[: ]+(?:quit|shutdown|die|disconnect) ?(.+)?", bot.config.nick )
             , function( msg, partingWords ) {
  const master = msg.prefix.nick
  msg.reply( fmt( "Your wish is my command, %s.", master ) )
  bot.quit( partingWords )
})

bot.listenFor( fmt( "@?%s[: ]+(?:part|leave|gtfo) +([+!#&][^ ]+(.+)?)", bot.config.nick )
             , function( msg, name, txt ) {
  const chan = bot.channels.get( name )
  if ( ! chan )
    return msg.reply( fmt( "I’m not in %s, so I can’t leave it.", name ) )
  chan.part( txt ? txt.trim() : "Goodbye!" )
  if ( chan.name !== msg.params[0] )
    msg.reply( fmt( "Ok, I have left %s.", chan.name ) )
})

bot.listenFor( fmt( "@?%s[: ]+(?:join|add) +([+!#&][^ ]+([^ ]+)?)", bot.config.nick )
             , function( msg, name, key ) {
  const chan = bot.channels.get( name )
  if ( chan && chan.name === msg.params[0] )
    return msg.reply( fmt( "Nice try, %s.", msg.prefix.nick ) )
  else if ( chan )
    return msg.reply( fmt( "I am already in %s, and I can prove it. The topic is as follows. %s"
                         , name, chan.topic || "Hmm, appears to be empty." ) )
  msg.reply( fmt( "Joining %s%s", name, key ? fmt( ", using the key “%s”.", key ) : "." ) )
  bot.channels.add( name, key )
})

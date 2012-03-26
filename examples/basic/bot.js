// Get the stuff we need for our bot.
// When you have IRC-js installed properly, it looks nicer of course.
const path = require( "path" )
    , fmt  = require( "util" ).format
    , here = __dirname
    , lib  = path.join( here, "..", "..", "lib" )
    , IRC  = require( path.join( lib, "irc" ) ).IRC
    , clr  = require( path.join( lib, "color" ) )

// Get a path to your config file. If not provided, it will look for
// "config.json" in the current working directory.
// Consult the default file for comments about the various options.
const conf = path.join( here, process.argv[2] || "config.json" )

// Create an IRC instance, optionally telling it where the config file is.
// Then tell it to connect.
const bot = new IRC( conf ).connect( function( srv ) {
  // The bot is now connected, add a channel. OK.
  // The `add` method returns a `Channel` immediately, but the bot has not joined yet.
  bot.channels.add( "#nlogax", function( chan ) {
    // It has now joined the channel, and we get a `Channel` object.
    // You can `say` stuff in the channel, maybe `setTopic` to something nice.
    chan.say( "Hello!" )
        .say( fmt( "What kind of topic is “%s”? I will fix it.", chan.topic ) )
        .setTopic( fmt( "%s was here @ %s", bot.user.nick, new Date() ) )
    // A `Channel` contains `Person` objects (unless it's empty, of course).
    // You can access these through the `people` property.
    chan.people.contains( "nlogax" )                // Is nlogax in the channel?
      ? chan.say( "nlogax: I red{♥} U".colorize() ) // If so, show appreciation for your creator.
      : chan.invite( "nlogax", "WHERE R U" )        // If not, try to invite nlogax.
  })
})

// Listen for a message matching a pattern, in this case something like `botnick: ur an alligator`
// with some fuzzy matching since people write in fuzzy ways.
bot.lookFor( fmt( " *@?%s *:? *(you(?:['’]?re)?|u(?: r)|ur?) +(.+)", bot.user.nick )
           , function( msg, you, remark ) {
  // Each group captured by the pattern is passed as an argument.
  // More capture groups, more arguments.
  const wittyReply = fmt( "%s: no %s %s", msg.prefix.nick
                        , you.toUpperCase(), remark.toUpperCase() )
  // `Message` objects have a set of handy methods, like `reply`.
  // It is useful when you want to respond in the same context (e.g. a channel, private message).
  msg.reply( wittyReply ) // IRC
})

// Automatically join a channel if invited.
// For the command names, you can use the provided constans, or type one yourself.
bot.observe( "invite", function( msg ) {
  const chan = bot.channels.add( msg.params[1] )
  chan.say( fmt( "Thanks for inviting me, %s", msg.prefix.nick ) )
})

// Love ice cream.
bot.lookFor( /\bice +cream\b/i
           , function( msg ) { msg.reply( "I love ice cream." ) } )

// Listen for various commands from bot's human overlords (for now...).
bot.lookFor( fmt( "@?%s[: ]+(?:quit|shutdown|die|disconnect) ?(.+)?", bot.user.nick )
           , function( msg, partingWords ) {
  const master = msg.prefix.nick
  bot.quit( partingWords || fmt( "%s told me to quit, goodbye!", master ) )
})

bot.lookFor( fmt( "@?%s[: ]+(?:part|leave|gtfo)(?: +([+!#&][^ ]+))?(?: (.+))?", bot.user.nick )
           , function( msg, name, txt ) {
  const chan = bot.channels.get( name || msg.params[0] )
  if ( ! chan )
    return msg.reply( fmt( "I’m not in %s.", name ) )
  chan.part( txt ? txt.trim() : fmt( "%s told me to leave. Bye!", msg.prefix.nick ) )
  if ( chan.name !== msg.params[0] )
    msg.reply( fmt( "I have left %s.", chan.name ) )
})

bot.lookFor( fmt( "@?%s[: ]+(?:join|add) +([+!#&][^ ]+)(?: +([^ ]+))?", bot.user.nick )
           , function( msg, name, key ) {
  const chan = bot.channels.get( name )
  if ( chan && chan.name === msg.params[0] )
    return msg.reply( fmt( "I am already here, %s.", msg.prefix.nick ) )
  else if ( chan )
    return msg.reply( fmt( "I am already in %s, and I can prove it. The topic is as follows. %s"
                         , name, chan.topic || "Hmm, appears to be empty." ) )
  bot.channels.add( name, key, function( chan ) {
    msg.reply( fmt( "I am now in %s%s", name, key ? fmt( ", I used “%s” to get in.", key ) : "." ) )
  })
})

var helper = require( __dirname + '/../spec_helper' )
helper.bot.options.log = false
helper.bot.connect()

exports[ 'IRC#raw should append "\\r\\n" if not present' ] = function ( test ) {
  test.numAssertions = 2

  helper.bot.raw( "NO U" )
  test.equal( helper.MockInternals.socket.output[0], "NO U\r\n" )

  helper.bot.raw( "RAWR\r\n" )
  test.equal( helper.MockInternals.socket.output[1], "RAWR\r\n" )

  done( test )
}

exports[ 'IRC#raw should truncate messages to 512 chars (including "\\r\\n")' ] = function ( test ) {
  test.numAssertions = 1

  var longAssString = Array( 1024 ).join( '*' )
  helper.bot.raw( longAssString )
  test.equal( helper.MockInternals.socket.output[0].length, 512 )

  done( test )
}

exports[ 'IRC#pass should send the server password' ] = function ( test ) {
  test.numAssertions = 1

  helper.bot.pass( 'pewpew' )
  test.equal( helper.MockInternals.socket.output[0], "PASS pewpew\r\n" )

  done( test )
}

exports[ 'IRC#nick should change the nickname' ] = function ( test ) {
  test.numAssertions = 2

  // No prev nick
  helper.bot.nick( 'pewpew' )
  test.equal( helper.MockInternals.socket.output[0], "NICK pewpew\r\n" )

  // Prev nick
  helper.MockInternals.nick = 'pewpew'
  helper.bot.nick( 'wepwep' )
  test.equal( helper.MockInternals.socket.output[1], ":" + helper.MockInternals.nick + " NICK wepwep\r\n" )

  done( test )
}

exports[ 'IRC#user should send the user information with the correct modes' ] = function ( test ) {
  test.numAssertions = 4

  helper.bot.user( 'user', true, true, 'User Name' )
  test.equal( helper.MockInternals.socket.output[0], "USER user 12 * :User Name\r\n" )

  helper.bot.user( 'user', true, false, 'User Name' )
  test.equal( helper.MockInternals.socket.output[1], "USER user 4 * :User Name\r\n" )

  helper.bot.user( 'user', false, true, 'User Name' )
  test.equal( helper.MockInternals.socket.output[2], "USER user 8 * :User Name\r\n" )

  helper.bot.user( 'user', false, false, 'User Name' )
  test.equal( helper.MockInternals.socket.output[3], "USER user 0 * :User Name\r\n" )

  done( test )
}

exports[ 'IRC#oper should send the operator information' ] = function ( test ) {
  test.numAssertions = 1

  helper.bot.oper( 'user', 'password' )
  test.equal( helper.MockInternals.socket.output[0], "OPER user password\r\n" )

  done( test )
}

exports[ 'IRC#quit should quit with an optional message' ] = function ( test ) {
  test.numAssertions = 2

  helper.bot.quit()
  test.equal( helper.MockInternals.socket.output[0], "QUIT\r\n" )

  helper.bot.quit("LOL BAI" )
  test.equal( helper.MockInternals.socket.output[1], "QUIT :LOL BAI\r\n" )

  done( test )
}

exports[ 'IRC#quit should disconnect and end the socket' ] = function ( test ) {
  test.numAssertions = 1

  helper.bot.quit()
  test.ok( helper.MockInternals.socket.mockEnded )

  done( test )
}

exports[ 'IRC#join should join both public and protected channels' ] = function ( test ) {
  test.numAssertions = 2

  helper.bot.join( "#asl" )
  test.equal( helper.MockInternals.socket.output[0], "JOIN #asl\r\n" )

  helper.bot.join( "#asl", "secret" )
  test.equal( helper.MockInternals.socket.output[1], "JOIN #asl secret\r\n" )

  done( test )
}

exports[ 'IRC#part should leave the channel' ] = function ( test ) {
  test.numAssertions = 1

  helper.bot.part( "#asl" )
  test.equal( helper.MockInternals.socket.output[0], "PART #asl\r\n" )

  done( test )
}

exports[ 'IRC#channelMode should set various modes' ] = function ( test ) {
  test.numAssertions = 2

  helper.bot.channelMode( "#asl", "+im" )
  test.equal( helper.MockInternals.socket.output[0], "MODE #asl +im\r\n" )

  helper.bot.channelMode( "#asl", "+b", "wat" )
  test.equal( helper.MockInternals.socket.output[1], "MODE #asl +b wat\r\n" )

  done( test )
}

exports[ 'IRC#userMode should set various modes on the current user' ] = function ( test ) {
  test.numAssertions = 1

  helper.MockInternals.nick = 'pewpew'
  helper.bot.userMode( "-o" )
  test.equal( helper.MockInternals.socket.output[0], ":" + helper.MockInternals.nick + " MODE -o\r\n" )

  done( test )
}

exports[ 'IRC#topic should set the topic for a given channel' ] = function ( test ) {
  test.numAssertions = 1

  helper.bot.topic( "#asl", "oh hai" )
  test.equal( helper.MockInternals.socket.output[0], "TOPIC #asl :oh hai\r\n" )

  done( test )
}

exports[ 'IRC#topic should get the topic for a given channel' ] = function ( test ) {
  test.numAssertions = 3

  helper.bot.topic( "#asl", function( c, t ) {
    test.equal( "#asl", c )
    test.equal( "oh hai", t )
    done( test )
  })

  test.equal( helper.MockInternals.socket.output[0], "TOPIC #asl\r\n" )

  helper.MockInternals.socket.emit( 'data', ':the.server.com 332 js-irc #asl :oh hai\r\n' )
}

exports[ 'IRC#names should get the names for a given channel' ] = function ( test ) {
  test.numAssertions = 5

  helper.bot.names( "#asl", function( c, n ) {
    test.equal( "#asl", c )
    test.equal( "one", n[0] )
    test.equal( "two", n[1] )
    test.equal( "three", n[2] )
    done( test )
  })

  test.equal( helper.MockInternals.socket.output[0], "NAMES #asl\r\n" )

  helper.MockInternals.socket.emit( 'data', ':the.server.com 353 js-irc = #asl :one two three\r\n' )
}

exports[ 'IRC#names should queue up successive calls' ] = function ( test ) {
  test.numAssertions = 1
  test.ok( false, "Pending" )
  done( test )
}

exports[ 'IRC#list should get the information for a given channel' ] = function ( test ) {
  test.numAssertions = 1
  test.ok( false, "Pending" )
  done( test )
}

exports[ 'IRC#list should get the information for all channels on a server' ] = function ( test ) {
  test.numAssertions = 1
  test.ok( false, "Pending" )
  done( test )
}

exports[ 'IRC#invite should invite a user to a given channel' ] = function ( test ) {
  test.numAssertions = 1

  helper.bot.invite( "user", "#asl" )
  test.equal( helper.MockInternals.socket.output[0], "INVITE user #asl\r\n" )

  done( test )
}

exports[ 'IRC#kick should kick a user from a given channel' ] = function ( test ) {
  test.numAssertions = 2

  helper.bot.kick( "#asl", "user" )
  test.equal( helper.MockInternals.socket.output[0], "KICK #asl user\r\n" )

  helper.bot.kick( "#asl", "user", "kk bai" )
  test.equal( helper.MockInternals.socket.output[1], "KICK #asl user :kk bai\r\n" )

  done( test )
}

exports[ 'IRC#version should query the server for version information' ] = function ( test ) {
  test.numAssertions = 4

  helper.bot.version( function( v ) {
    test.equal( "one", v[0] )
    test.equal( "two", v[1] )
    test.equal( "longer message", v[2] )
    done( test )
  })

  test.equal( helper.MockInternals.socket.output[0], "VERSION\r\n" )

  helper.MockInternals.socket.emit( 'data', ':the.server.com 351 js-irc one two :longer message\r\n' )
}

exports[ 'IRC#privmsg should send basic messages' ] = function ( test ) {
  test.numAssertions = 1

  helper.bot.privmsg( '#asl', 'hey sup everyone?' )
  test.equal( helper.MockInternals.socket.output[0], "PRIVMSG #asl :hey sup everyone?\r\n" )

  done( test )
}

exports[ 'IRC#privmsg should do nothing if the message is an empty string' ] = function ( test ) {
  test.numAssertions = 1

  helper.bot.privmsg( '#asl', '' )
  test.equal( helper.MockInternals.socket.output.length, 0 )

  done( test )
}

exports[ 'IRC#privmsg should split long messages into multiple messages' ] = function ( test ) {
  test.numAssertions = 1

  var msg = new Array( 1200 ).join( 'x' )
  helper.bot.privmsg( '#asl', msg )
  test.equal( helper.MockInternals.socket.output.length, 3 )

  done( test )
}

// exports[ 'IRC#privmsg should use flood protection when instructed' ] = function ( test ) {
  // test.numAssertions = 2

  // var msg = new Array( 5000 ).join( 'x' )
  // helper.bot.privmsg( '#asl', msg, true )
  // test.equal( helper.MockInternals.socket.output.length, 1 )

  // setTimeout( function() {
    // test.equal( helper.MockInternals.socket.output.length, 5 )
    // done( test )
  // }, 1000 )
// }

exports[ 'IRC#notice should notice a channel' ] = function ( test ) {
  test.numAssertions = 1

  helper.bot.notice( '#asl', 'going down' )
  test.equal( helper.MockInternals.socket.output[0], "NOTICE #asl :going down\r\n" )

  done( test )
}

exports[ 'IRC should emit all events as a `*` with the command as the first parameter ' ] = function ( test ) {
  test.numAssertions = 1

  helper.bot.on( '*', function ( type, message ) {
    test.equal( type, 'join' )
    done( test )
  })
  helper.MockInternals.socket.emit( 'data', ":Hornet!~hornet@cpc3-ipsw1-0-0-cust381.5-4.cable.virginmedia.com JOIN :#prototype\r\n" )
}

/*------------------------------------*\
    Util
\*------------------------------------*/
function done ( test ) {
  helper.MockInternals.socket.output = []
  delete helper.MockInternals.socket.mockConnected
  delete helper.MockInternals.socket.mockEnded
  delete helper.MockInternals.nick
  test.finish()
}

/* ------------------------------ Run ------------------------------ */
if ( module == require.main )
  require( 'async_testing' ).run( __filename, process.ARGV )


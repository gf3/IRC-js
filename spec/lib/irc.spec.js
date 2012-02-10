IRCExposeInternals = true

var MI = require( __dirname + '/../mock_internals' )
  , IRC = require( __dirname + '/../../lib/irc' )
// , helper = require( __dirname + '/../spec_helper' )

// helper.bot.options.log = false
// helper.bot.connect()

describe( 'IRC', function(){
  describe( '#raw', function(){
    it( 'should append "\\r\\n" if not present', function( done ) {
      withHelper( function( h ){

        h.bot.raw( "NO U" )
        h.MockInternals.socket.output[0].should.equal( "NO U\r\n" )

        h.bot.raw( "RAWR\r\n" )
        h.MockInternals.socket.output[1].should.equal( "RAWR\r\n" )

        done()
      })
    })

    it( 'should truncate messages to 512 chars (including "\\r\\n")', function( done ) {
      withHelper( function( h ){

        var longAssString = Array( 1024 ).join( '*' )
        h.bot.raw( longAssString )
        h.MockInternals.socket.output[0].length.should.equal( 512 )

        done()
      })
    })
  })

  describe( '#pass', function(){
    it( 'should send the server password', function( done ) {
      withHelper( function( h ){

        h.bot.pass( 'pewpew' )
        h.MockInternals.socket.output[0].should.equal( "PASS pewpew\r\n" )

        done()
      })
    })
  })

  describe( '#nick', function(){
    it( 'should change the nickname', function( done ) {
      withHelper( function( h ){

        // No prev nick
        h.bot.nick( 'pewpew' )
        h.MockInternals.socket.output[0].should.equal( "NICK pewpew\r\n" )

        // Prev nick
        h.MockInternals.nick = 'pewpew'
        h.bot.nick( 'wepwep' )
        h.MockInternals.socket.output[1].should.equal( ":" + h.MockInternals.nick + " NICK wepwep\r\n" )

        done()
      })
    })
  })

  describe( '#user', function(){
    it( 'should send the user information with the correct modes', function( done ) {
      withHelper( function( h ){

        h.bot.user( 'user', true, true, 'User Name' )
        h.MockInternals.socket.output[0].should.equal( "USER user 12 * :User Name\r\n" )

        h.bot.user( 'user', true, false, 'User Name' )
        h.MockInternals.socket.output[1].should.equal( "USER user 4 * :User Name\r\n" )

        h.bot.user( 'user', false, true, 'User Name' )
        h.MockInternals.socket.output[2].should.equal( "USER user 8 * :User Name\r\n" )

        h.bot.user( 'user', false, false, 'User Name' )
        h.MockInternals.socket.output[3].should.equal( "USER user 0 * :User Name\r\n" )

        done()
      })
    })
  })

  describe( '#oper', function(){
    it( 'should send the operator information', function( done ) {
      withHelper( function( h ){

        h.bot.oper( 'user', 'password' )
        h.MockInternals.socket.output[0].should.equal( "OPER user password\r\n" )

        done()
      })
    })
  })

  describe( '#quit', function(){
    it( 'should quit with an optional message', function( done ) {
      withHelper( function( h ){

        h.bot.quit()
        h.MockInternals.socket.output[0].should.equal( "QUIT\r\n" )

        h.bot.quit("LOL BAI" )
        h.MockInternals.socket.output[1].should.equal( "QUIT :LOL BAI\r\n" )

        done()
      })
    })

    it( 'should disconnect and end the socket', function( done ) {
      withHelper( function( h ){

        h.bot.quit()
        h.MockInternals.socket.mockEnded.should.be.ok

        done()
      })
    })
  })

  describe( '#join', function(){
    it( 'should join both public and protected channels', function( done ) {
      withHelper( function( h ){

        h.bot.join( "#asl" )
        h.MockInternals.socket.output[0].should.equal( "JOIN #asl\r\n" )

        h.bot.join( "#asl", "secret" )
        h.MockInternals.socket.output[1].should.equal( "JOIN #asl secret\r\n" )

        done()
      })
    })
  })

  describe( '#part', function(){
    it( 'should leave the channel', function( done ) {
      withHelper( function( h ){

        h.bot.part( "#asl" )
        h.MockInternals.socket.output[0].should.equal( "PART #asl\r\n" )

        done()
      })
    })
  })

  describe( '#channelMode', function(){
    it( 'IRC#channelMode should set various modes', function( done ) {
      withHelper( function( h ){

        h.bot.channelMode( "#asl", "+im" )
        h.MockInternals.socket.output[0].should.equal( "MODE #asl +im\r\n" )

        h.bot.channelMode( "#asl", "+b", "wat" )
        h.MockInternals.socket.output[1].should.equal( "MODE #asl +b wat\r\n" )

        done()
      })
    })
  })

  describe( '#userMode', function(){
    it( 'IRC#userMode should set various modes on the current user', function( done ) {
      withHelper( function( h ){

        h.MockInternals.nick = 'pewpew'
        h.bot.userMode( "-o" )
        h.MockInternals.socket.output[0].should.equal( ":" + h.MockInternals.nick + " MODE -o\r\n" )

        done()
      })
    })
  })

  describe( '#topic', function(){
    it( 'should set the topic for a given channel', function( done ) {
      withHelper( function( h ){

        h.bot.topic( "#asl", "oh hai" )
        h.MockInternals.socket.output[0].should.equal( "TOPIC #asl :oh hai\r\n" )

        done()
      })
    })

    it( 'should get the topic for a given channel', function( done ) {
      withHelper( function( h ){

        h.bot.topic( "#asl", function( c, t ) {
          "#asl".should.equal( c )
          "oh hai".should.equal( t )
          done()
        })

        h.MockInternals.socket.output[0].should.equal( "TOPIC #asl\r\n" )
        h.MockInternals.socket.emit( 'data', ':the.server.com 332 js-irc #asl :oh hai\r\n' )
      })
    })
  })

  describe( '#names', function(){
    it( 'should get the names for a given channel', function( done ) {
      withHelper( function( h ){

        h.bot.names( "#asl", function( c, n ) {
          "#asl".should.equal( c )
          "one".should.equal( n[0] )
          "two".should.equal( n[1] )
          "three".should.equal( n[2] )
          done()
        })

        h.MockInternals.socket.output[0].should.equal( "NAMES #asl\r\n" )
        h.MockInternals.socket.emit( 'data', ':the.server.com 353 js-irc = #asl :one two three\r\n' )
      })
    })

    it( 'should queue up successive calls' )
  })

  describe( '#list', function(){
    it( 'should get the information for a given channel' )

    it( 'should get the information for all channels on a server' )
  })

  describe( '#invite', function(){
    it( 'should invite a user to a given channel', function( done ) {
      withHelper( function( h ){

        h.bot.invite( "user", "#asl" )
        h.MockInternals.socket.output[0].should.equal( "INVITE user #asl\r\n" )

        done()
      })
    })
  })

  describe( '#kick', function(){
    it( 'should kick a user from a given channel', function( done ) {
      withHelper( function( h ){

        h.bot.kick( "#asl", "user" )
        h.MockInternals.socket.output[0].should.equal( "KICK #asl user\r\n" )

        h.bot.kick( "#asl", "user", "kk bai" )
        h.MockInternals.socket.output[1].should.equal( "KICK #asl user :kk bai\r\n" )

        done()
      })
    })
  })

  describe( '#version', function(){
    it( 'should query the server for version information', function( done ) {
      withHelper( function( h ){
        h.bot.version( function( v ) {
          "one".should.equal( v[0] )
          "two".should.equal( v[1] )
          "longer message".should.equal( v[2] )
          done()
        })

        h.MockInternals.socket.output[0].should.equal( "VERSION\r\n" )
        h.MockInternals.socket.emit( 'data', ':the.server.com 351 js-irc one two :longer message\r\n' )
      })
    })
  })

  describe( '#privmsg', function(){
    it( 'should send basic messages', function( done ) {
      withHelper( function( h ){

        h.bot.privmsg( '#asl', 'hey sup everyone?' )
        h.MockInternals.socket.output[0].should.equal( "PRIVMSG #asl :hey sup everyone?\r\n" )

        done()
      })
    })

    it( 'should do nothing if the message is an empty string', function( done ) {
      withHelper( function( h ){

        h.bot.privmsg( '#asl', '' )
        h.MockInternals.socket.output.length.should.equal( 0 )

        done()
      })
    })

    it( 'should split long messages into multiple messages', function( done ) {
      withHelper( function( h ){

        var msg = new Array( 1200 ).join( 'x' )
        h.bot.privmsg( '#asl', msg )
        h.MockInternals.socket.output.length.should.equal( 3 )

        done()
      })
    })

    // it( 'should use flood protection when instructed', function( done ) {
      // withHelper( function( h ){

        // var msg = new Array( 5000 ).join( 'x' )
        // h.bot.privmsg( '#asl', msg, true )
        // h.MockInternals.socket.output.length.should.equal( 1 )
        // var d = h

        // setTimeout( function() {
          // ;;; console.log( "\n\n\n", d.MockInternals.socket.output, "\n\n\n" )
          // d.MockInternals.socket.output.length.should.equal( 5 )
          // done()
        // }, 1000 )
      // })
    // })
  })

  describe( '#notice', function(){
    it( 'should notice a channel', function( done ) {
      withHelper( function( h ){

        h.bot.notice( '#asl', 'going down' )
        h.MockInternals.socket.output[0].should.equal( "NOTICE #asl :going down\r\n" )

        done()
      })
    })
  })

  it( 'IRC should emit all events as a `*` with the command as the first parameter ', function( done ) {
    withHelper( function( h ){

      h.bot.on( '*', function ( type, message ) {
        type.should.equal( 'join' )
        done()
      })

      h.MockInternals.socket.emit( 'data', ":Hornet!~hornet@cpc3-ipsw1-0-0-cust381.5-4.cable.virginmedia.com JOIN :#prototype\r\n" )
    })
  })

})

/*------------------------------------*\
Util
\*------------------------------------*/
function withHelper ( test ) {
  var mi = new MI
  mi.resetNetwork()

  var bot = new IRC({ _internal: mi, log: false })
  bot.on( 'connected', function(){
    mi.socket.output = []
    test.call( null, { bot: bot, MockInternals: mi } )
  })
  bot.connect()
}


const format  = require( "util" ).format
    , path    = require( "path" )
    , libPath = path.join( __dirname, "..", "..", "lib" )
    , MI      = require( path.join( libPath, "..", "spec", "mock_internals" ) )
    , IRC     = require( path.join( libPath, "irc" ) )
    , cs      = require( path.join( libPath, "constants" ) )
    , COMMAND = cs.COMMAND
    , EVENT   = cs.EVENT
    , REPLY   = cs.REPLY
    , MODE    = cs.MODE

describe( "IRC", function() {
  describe( "send", function() {
    it( "should append \"\\r\\n\" if not present", function( done ) {
      withHelper( function( h ) {

        h.bot.send( "NO U" )
        h.mockInternals.socket.output[0].should.equal( "NO U\r\n" )

        h.bot.send( "RAWR\r\n" )
        h.mockInternals.socket.output[0].should.equal( "RAWR\r\n" )

        done()
      })
    })

    it( "should truncate messages to 512 chars (including \"\\r\\n\")", function( done ) {
      withHelper( function( h ) {

        const longAssString = Array( 1024 ).join( "*" )
        h.bot.send( longAssString )
        h.mockInternals.socket.output[0].length.should.equal( 512 )

        done()
      })
    })
  })

  describe( "#connect", function() {
    it( "should send the server password, if provided, on connect", function( done ) {
      withHelper( function( h ) {

        h.mockInternals.socket.output[2].should.equal( "PASS asd123\r\n" )

        done()
      })
    })
  })

  describe( "#nick", function() {
    it( "should change the nickname", function( done ) {
      withHelper( function( h ) {

        // No prev nick
        h.bot.nick( "pewpew" )
        h.mockInternals.socket.output[0].should.equal( "NICK pewpew\r\n" )

        // Prev nick
        // TODO ask gf3 about this, can't find anything about it in the RFC
        //h.mockInternals.nick = "pewpew"
        //h.bot.nick( "wepwep" )
        //h.mockInternals.socket.output[0].should.equal( ":" + h.mockInternals.nick + " NICK wepwep\r\n" )

        done()
      })
    })
  })

  describe( "#user", function() {
    it( "should send the user information with the correct modes", function( done ) {
      withHelper( function( h ) {
        const m = MODE.USER

        h.bot.user( "user", "User Name", m.WALLOPS | m.INVISIBLE )
        h.mockInternals.socket.output[0].should.equal( "USER user 12 * :User Name\r\n" )

        h.bot.user( "user", "User Name", m.WALLOPS )
        h.mockInternals.socket.output[0].should.equal( "USER user 4 * :User Name\r\n" )

        h.bot.user( "user", "User Name", m.INVISIBLE )
        h.mockInternals.socket.output[0].should.equal( "USER user 8 * :User Name\r\n" )

        h.bot.user( "user", "User Name" )
        h.mockInternals.socket.output[0].should.equal( "USER user 0 * :User Name\r\n" )

        done()
      })
    })
  })

  describe( '#oper', function() {
    it( 'should send the operator information', function( done ) {
      withHelper( function( h ) {

        h.bot.oper( 'user', 'password' )
        h.mockInternals.socket.output[0].should.equal( "OPER user password\r\n" )

        done()
      })
    })
  })

  describe( '#quit', function() {
    it( 'should quit with an optional message', function( done ) {
      withHelper( function( h ) {

        h.bot.quit()
        h.mockInternals.socket.output[0].should.equal( "QUIT\r\n" )

        h.bot.quit("LOL BAI" )
        h.mockInternals.socket.output[0].should.equal( "QUIT :LOL BAI\r\n" )

        done()
      })
    })

    it( 'should disconnect and end the socket', function( done ) {
      withHelper( function( h ) {

        h.bot.quit()
        h.mockInternals.socket.mockEnded.should.be.ok

        done()
      })
    })
  })

  describe( '#join', function() {
    it( 'should join both public and protected channels', function( done ) {
      withHelper( function( h ) {

        h.bot.join( "#asl" )
        h.mockInternals.socket.output[0].should.equal( "JOIN #asl\r\n" )

        h.bot.join( "#asl", "secret" )
        h.mockInternals.socket.output[0].should.equal( "JOIN #asl secret\r\n" )

        done()
      })
    })
  })

  describe( '#part', function() {
    it( 'should leave the channel', function( done ) {
      withHelper( function( h ) {

        h.bot.part( "#asl" )
        h.mockInternals.socket.output[0].should.equal( "PART #asl\r\n" )

        done()
      })
    })
  })

  describe( '#channelMode', function() {
    it( 'IRC#channelMode should set various modes', function( done ) {
      withHelper( function( h ) {

        h.bot.channelMode( "#asl", "+im" )
        h.mockInternals.socket.output[0].should.equal( "MODE #asl +im\r\n" )

        h.bot.channelMode( "#asl", "+b", "wat" )
        h.mockInternals.socket.output[0].should.equal( "MODE #asl +b wat\r\n" )

        done()
      })
    })
  })

  describe( '#userMode', function() {
    it( 'IRC#userMode should set various modes on the current user', function( done ) {
      withHelper( function( h ) {

        h.mockInternals.nick = "pewpew"
        h.bot.userMode( "-o" )
        h.mockInternals.socket.output[0].should.equal( "MODE " + h.mockInternals.nick + " -o\r\n" )

        done()
      })
    })
  })

  describe( '#topic', function() {
    it( 'should set the topic for a given channel', function( done ) {
      withHelper( function( h ) {

        h.bot.topic( "#asl", "oh hai" )
        h.mockInternals.socket.output[0].should.equal( "TOPIC #asl :oh hai\r\n" )

        done()
      })
    })

    it( 'should get the topic for a given channel', function( done ) {
      withHelper( function( h ) {

        h.bot.topic( "#asl", function( c, t ) {
          c.should.equal( "#asl" )
          t.should.equal( "oh hai" )
          done()
        })

        h.mockInternals.socket.output[0].should.equal( "TOPIC #asl\r\n" )
        h.mockInternals.socket.emit( 'data', ':the.server.com 332 js-irc #asl :oh hai\r\n' )
      })
    })
  })

  describe( '#names', function() {
    it( 'should get the names for a given channel', function( done ) {
      withHelper( function( h ) {

        h.bot.names( "#asl", function( c, n ) {
          c.should.equal( "#asl" )
          n[0].should.equal( "one" )
          n[1].should.equal( "two" )
          n[2].should.equal( "three" )
          done()
        })

        h.mockInternals.socket.output[0].should.equal( "NAMES #asl\r\n" )
        h.mockInternals.socket.emit( 'data', ':the.server.com 353 js-irc = #asl :one two three\r\n' )
      })
    })

    it( 'should queue up successive calls' )
  })

  describe( '#list', function() {
    it( 'should get the information for a given channel' )

    it( 'should get the information for all channels on a server' )
  })

  describe( '#invite', function() {
    it( 'should invite a user to a given channel', function( done ) {
      withHelper( function( h ) {

        h.bot.invite( "user", "#asl" )
        h.mockInternals.socket.output[0].should.equal( "INVITE user #asl\r\n" )

        done()
      })
    })
  })

  describe( '#kick', function() {
    it( 'should kick a user from a given channel', function( done ) {
      withHelper( function( h ) {

        h.bot.kick( "#asl", "user" )
        h.mockInternals.socket.output[0].should.equal( "KICK #asl user\r\n" )

        h.bot.kick( "#asl", "user", "kk bai" )
        h.mockInternals.socket.output[0].should.equal( "KICK #asl user :kk bai\r\n" )

        done()
      })
    })
  })

  describe( '#version', function() {
    it( 'should query the server for version information', function( done ) {
      withHelper( function( h ) {
        h.bot.version( function( v ) {
          v[0].should.equal( "one" )
          v[1].should.equal( "two" )
          v[2].should.equal( ":longer message" )
          done()
        })

        h.mockInternals.socket.output[0].should.equal( "VERSION\r\n" )
        h.mockInternals.socket.emit( 'data', ':the.server.com 351 js-irc one two :longer message\r\n' )
      })
    })
  })

  describe( '#privmsg', function() {
    it( 'should send basic messages', function( done ) {
      withHelper( function( h ) {

        h.bot.privmsg( '#asl', 'hey sup everyone?' )
        h.mockInternals.socket.output[0].should.equal( "PRIVMSG #asl :hey sup everyone?\r\n" )

        done()
      })
    })

    it( "should do nothing if the message is an empty string", function( done ) {
      withHelper( function( h ) {
        const before = h.mockInternals.socket.output.length

        h.bot.privmsg( "#asl", "" )
        h.mockInternals.socket.output.length.should.equal( before )

        done()
      })
    })

    it( "should split long messages into multiple messages", function( done ) {
      withHelper( function( h ) {
        const msg = new Array( 1200 ).join( "x" )
            , before = h.mockInternals.socket.output.length
        h.bot.privmsg( "#asl", msg )
        h.mockInternals.socket.output.length.should.equal( before + 3 )

        done()
      })
    })

    // it( 'should use flood protection when instructed', function( done ) {
      // withHelper( function( h ) {

        // const msg = new Array( 5000 ).join( 'x' )
        // h.bot.privmsg( '#asl', msg, true )
        // h.mockInternals.socket.output.length.should.equal( 1 )
        // const d = h

        // setTimeout( function() {
          // ;;; console.log( "\n\n\n", d.MockInternals.socket.output, "\n\n\n" )
          // d.MockInternals.socket.output.length.should.equal( 5 )
          // done()
        // }, 1000 )
      // })
    // })
  })

  describe( '#notice', function() {
    it( 'should notice a channel', function( done ) {
      withHelper( function( h ) {

        h.bot.notice( '#asl', 'going down' )
        h.mockInternals.socket.output[0].should.equal( "NOTICE #asl :going down\r\n" )

        done()
      })
    })
  })

  it( format( "should emit all events as a `%s` event with the command as the first parameter", EVENT.ANY ), function( done ) {
    withHelper( function( h ) {

      h.bot.on( EVENT.ANY, function( type, message ) {
        type.should.equal( COMMAND.JOIN )
        done()
      })

      h.mockInternals.socket.emit( "data", ":Hornet!~hornet@cpc3-ipsw1-0-0-cust381.5-4.cable.virginmedia.com JOIN :#prototype\r\n" )
    })
  })

})

/**
 * @param {!function} test
 */
function withHelper( test ) {
  const mi  = new MI
      , bot = new IRC({ _internal: mi, log: false, password: "asd123" })
  mi.resetNetwork()

  bot.on( EVENT.CONNECT, function() {
    test.call( null, { bot: bot, mockInternals: mi } )
  })
  bot.connect()
}


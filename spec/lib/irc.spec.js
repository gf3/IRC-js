const f       = require( "util" ).format
    , path    = require( "path" )
    , fs      = require( "fs" )
    , should  = require( "should" )
    , lib     = path.join( __dirname, "..", "..", "lib" )
    , help    = require( path.join( __dirname, "..", "helpers" ) )
    , o       = require( path.join( lib, "objects" ) )
    , cs      = require( path.join( lib, "constants" ) )
    , bit     = help.bit
    , conf    = help.conf
    , COMMAND = cs.COMMAND
    , EVENT   = cs.EVENT
    , REPLY   = cs.REPLY
    , MODE    = cs.MODE

// Make sure config files are up to date
const defaultConf = JSON.parse( fs.readFileSync( path.join( lib, "config.json" ) ) )
    , testingConf = JSON.parse( fs.readFileSync( path.join( __dirname, "config.json" ) ) )
    , exampleConf = JSON.parse( fs.readFileSync( path.join( __dirname, "..", "..", "examples", "basic", "config.json" ) ) )
    , noComments  = function( k ) { return k !== "//" } // :) // :)

describe( "irc", function() {
  describe( "IRC", function() {
    describe( "send", function() {
      bit( "should append \"\\r\\n\" if not present", function() {
        this.send( o.message( COMMAND.PRIVMSG, [ "#nou", "NO U" ] ) )
        this._stream.output[0].should.equal( "PRIVMSG #nou NO U\r\n" )
      })

      bit( "should truncate messages to 512 chars (including \"\\r\\n\")", function() {
        const longAssString = f( ":%s", Array( 567 ).join( "*" ) )
        this.send( o.message( COMMAND.PRIVMSG, [ "#longassstrings", longAssString ] ) )
        this._stream.output[0].length.should.equal( 512 )
      })
    })

    describe( "connect", function() {
      // Pass is set in spec/lib/config.json
      bit( "should send the server password, if provided, on connect", function() {
        this._stream.output[2].should.equal( f( "PASS %s\r\n", conf.user.password ) )
      })
      // Modes set in config
      bit( "should send user information with correct modes", function() {
        this._stream.output[0]
            .should.equal( f( "USER %s 12 * :%s\r\n", conf.user.username, conf.user.realname ) )
      })

      bit( "should update server name on 004", function() {
        this._stream.emit( "data", f( ":holmes.freenode.net 004 ircjsbot holmes.freenode.net ircd-seven-1.1.3 DOQRSZaghilopswz CFILMPQbcefgijklmnopqrstvz bkloveqjfI\r\n", this.user.nick ) )
        this.server.name.should.equal( "holmes.freenode.net" )
      })
    })

    describe( "nick", function() {
      bit( "should change the nickname" )
    })

    describe( "quit", function() {
      bit( "should quit without a message", function() {
        const sock = this._stream
        this.quit()
        sock.output[0].should.equal( "QUIT\r\n" )
        sock.mockEnded.should.be.ok
      })

      bit( "should quit with a message", function() {
        const sock = this._stream
        this.quit( "LOL BAI" )
        sock.output[0].should.equal( "QUIT :LOL BAI\r\n" )
        sock.mockEnded.should.be.ok
      })

      bit( "should disconnect and end the socket", function() {
        const sock = this._stream
        this.quit()
        sock.mockEnded.should.be.ok
      })
    })

    describe( "setMode", function() {
      bit( "should set various modes on the current user", function() {
        this.user.nick = "pewpew"
        this.setMode( "-o" )
        this._stream.output[0].should.equal( f( "MODE %s -o\r\n", this.user.nick ) )
      })
    })

    describe( "list", function() {
      it( "should get the information for a given channel", function() {
      })

      it( "should get the information for all channels on a server", function() {
      })
    })

    describe( "send", function() {
      bit( "should send Message objects", function() {
        this.channels.add( "#asl" ).say( "hey sup everyone?" )
        this._stream.output[0].should.equal( "PRIVMSG #asl :hey sup everyone?\r\n" )

        this.send( o.message( COMMAND.PRIVMSG, [ "#asl", ":Sending stuff" ] ) )
        this._stream.output[0].should.equal( "PRIVMSG #asl :Sending stuff\r\n" )
      })

      // TODO reimplement
      bit( "should split long messages into multiple messages", function() {
        return
        const msg = new Array( 1200 ).join( "x" )
            , before = this._stream.output.length
        this.send( o.message( COMMAND.PRIVMSG, [ "#asl", f( ":%s", msg ) ] ) )
        this._stream.output.length.should.equal( before + 3 )
      })
    })

    describe( "channels", function() {
      bit( "should let you add channels by name", function( done ) {
        const bot  = this
            , chan = this.channels.add( "#addchanname", function( ch ) {
          bot.channels.contains( chan ).should.equal( true )
          bot.channels.get( ch.name ).should.equal( chan )
          ch.should.equal( chan )
          done()
        })
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        this._stream.emit( "data"
          , f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n", this.user.nick, chan, this.user.nick ) )
      })

      bit( "should let you add Channel objects", function( done ) {
        const bot = this, chan = new o.Channel( "#addchanobj" )
        this.channels.add( chan, function( ch ) {
          bot.channels.contains( "#addchanobj" ).should.equal( true )
          bot.channels.get( "#addchanobj" ).should.equal( chan )
          bot.channels.get( ch ).should.equal( chan )
          done()
        })
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        this._stream.emit( "data"
          , f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n", this.user.nick, chan, this.user.nick ) )
      })

      bit( "should let you remove channels by name", function() {
        const chan = "#removechanname"
        this.channels.add( chan )
        this.channels.contains( chan ).should.equal( true )
        this.channels.remove( chan )
        this.channels.contains( chan ).should.equal( false )
      })

      bit( "should let you remove Channel objects", function() {
        const chan = new o.Channel( "#removechanobj" )
        this.channels.add( chan )
        this.channels.contains( chan ).should.equal( true )
        this.channels.remove( chan )
        this.channels.contains( chan ).should.equal( false )
      })

      bit( "should add people to its list of users, for various relevant messages", function() {
        const chan = this.channels.add( "#addpeople" )
        // A specific user JOINs
        this._stream.emit( "data", f( ":protobot!~protobot@lol.com JOIN %s\r\n", chan ) )
        should.exist( chan.people.get( "protobot" ) )
        chan.people.get( "protobot" ).should.be.an.instanceof( o.Person )
        // A name reply for a channel
        this._stream.emit( "data", f( ":niven.freenode.net 353 %s @ %s :some +different @nicks\r\n", conf.nick, chan ) )
        should.exist( chan.people.get( "some" ) )
        should.exist( chan.people.get( "different" ) )
        should.exist( chan.people.get( "nicks" ) )
        chan.people.get( "some" ).should.be.an.instanceof( o.Person )
        chan.people.get( "different" ).should.be.an.instanceof( o.Person )
        chan.people.get( "nicks" ).should.be.an.instanceof( o.Person )
      })

      bit( "should remove people from its list of users", function() {
        const chan = this.channels.add( "#removepeople" )
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        // Hit and run lol
        this._stream.emit( "data", ":protobot!~protobot@rogers.com JOIN #removepeople\r\n" )
        this._stream.emit( "data", ":protobot!~protobot@rogers.com PART #removepeople\r\n" )
        should.not.exist( this.channels.get( "#removepeople" ).people.get( "protobot" ) )
      })

      bit( "should create only one Person instance per user", function( done ) {
        const nick = "unique"
            , c1 = this.channels.add( "#channelone" )
            , c2 = this.channels.add( "#channeltwo"
              , function( ch ) {
                ch.people.get( nick ).should.equal( c1.people.get( nick ) )
                c1.people.get( nick ).should.equal( c2.people.get( nick ) )
                done()
              })
        this._stream.emit( "data", f( ":%s@wee JOIN %s\r\n", this.user.nick, c1 ) )
        this._stream.emit( "data", f( ":%s@wee JOIN %s\r\n", this.user.nick, c2 ) )
        this._stream.emit( "data"
          , f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n", this.user.nick, c1, nick ) )
        this._stream.emit( "data"
          , f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n", this.user.nick, c2, nick ) )
      })

      bit( "should know that lol{}|^ is the same as LOL[]\\~", function() {
        const lol = "#lol{}|^"
        this.channels.add( lol )
        this.channels.contains( "#LOL[]\\~" ).should.equal( true )
      })
    })

    bit( f( "should emit all events as a `%s` event with message as first parameter", EVENT.ANY ), function( done ) {
      this.observe( EVENT.ANY, function( msg ) {
        msg.command.should.equal( COMMAND.PRIVMSG )
        done()
      })

      this._stream.emit( "data", ":gf3!n=gianni@pdpc/supporter/active/gf3 PRIVMSG #runlevel6 :NO U LOL\r\n")
    })
  })

  describe( "configuration", function() {
    it( "should be kept in sync with provided default config", function() {
      const defKeys  = Object.keys( defaultConf ).filter( noComments )
          , testKeys = Object.keys( testingConf ).filter( noComments )
          , exmpKeys = Object.keys( exampleConf ).filter( noComments )
      defKeys.length.should.equal( testKeys.length )
      defKeys.every( function( k ) { return k in testingConf } ).should.be.ok
      Object.keys( defaultConf.user ).should.eql( Object.keys( testingConf.user ) )
      Object.keys( defaultConf.server ).should.eql( Object.keys( testingConf.server ) )
    })

    bit( "should use the testing config for testing", function() {
      this.config.should.eql( testingConf )
    })
  })
})

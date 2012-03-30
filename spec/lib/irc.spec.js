const f       = require( "util" ).format
    , path    = require( "path" )
    , fs      = require( "fs" )
    , should  = require( "should" )
    , lib     = path.join( __dirname, "..", "..", "lib" )
    , help    = require( path.join( __dirname, "..", "helpers" ) )
    , o       = require( path.join( lib, "objects" ) )
    , cs      = require( path.join( lib, "constants" ) )
    , IRC     = require( path.join( lib, "irc" ) ).IRC
    , bit     = help.bit
    , conf    = help.conf
    , COMMAND = cs.COMMAND
    , EVENT   = cs.EVENT
    , REPLY   = cs.REPLY
    , MODE    = cs.MODE

// Make sure config files are up to date
const defaultConf = JSON.parse( fs.readFileSync( path.join( lib, "config.json" ) ) )
    , testingConf = JSON.parse( fs.readFileSync( path.join( __dirname, "config.json" ) ) )
    , exampleConf = JSON.parse( fs.readFileSync( path.join( __dirname, "..", "..", "examples", "config.json" ) ) )
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

      bit( "should connect after having been disconnected", function( done ) {
        this.disconnect()
        this.connect( function( b ) {
          b.should.be.an.instanceof( IRC )
          done()
        })
        this._stream.emit( "data", f( ":crichton.freenode.net 001 %s :Welcome to the freenode IRC Network js-irc\r\n", this.user.nick ) )
      })

      bit( "should update server name on 004", function() {
        this._stream.emit( "data", f( ":holmes.freenode.net 004 %s holmes.freenode.net ircd-seven-1.1.3 DOQRSZaghilopswz CFILMPQbcefgijklmnopqrstvz bkloveqjfI\r\n", this.user.nick ) )
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
      bit( "should split long messages into multiple messages" )
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
        const bot = this, chan = o.channel( "#addchanobj" )
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

      bit( "should let you remove channels by name", function( done ) {
        const chan = "#removechanname", bot = this
        this.channels.add( chan, function( ch ) {
          bot.channels.contains( chan ).should.equal( true )
          bot.channels.remove( chan )
          bot._stream.output[0].should.equal( f( "PART %s\r\n", chan ) )
          bot._stream.emit( "data", f( ":%s!~a@b.c PART %s\r\n", bot.user.nick, chan ) )
          bot.channels.contains( chan ).should.equal( false )
          done()
        })
        this._stream.output[0].should.equal( f( "JOIN %s\r\n", chan ) )
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        this._stream.emit( "data"
          , f( ":card.freenode.net 353 %s @ %s :%s\r\n", this.user.nick, chan, this.user.nick ) )
      })

      bit( "should let you remove Channel objects", function( done ) {
        const chan = new o.Channel( "#removechanobj" ), bot = this
        this.channels.add( chan, function( ch ) {
          bot.channels.contains( chan ).should.equal( true )
          bot.channels.remove( chan )
          bot._stream.output[0].should.equal( f( "PART %s\r\n", chan ) )
          bot._stream.emit( "data", f( ":%s!~a@b.c PART %s\r\n", bot.user.nick, chan ) )
          bot.channels.contains( chan ).should.equal( false )
          done()
        })
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        this._stream.emit( "data"
          , f( ":card.freenode.net 353 %s @ %s :%s\r\n", this.user.nick, chan, this.user.nick ) )
      })

      bit( "should add people to its list of users, for various relevant messages", function( done ) {
        const bot = this
            , chan = this.channels.add( "#addpeople", function( ch ) {
          should.exist( chan.people.get( "protobot" ) )
          chan.people.get( "protobot" ).should.be.an.instanceof( o.Person )
          should.exist( chan.people.get( "some" ) )
          should.exist( chan.people.get( "different" ) )
          should.exist( chan.people.get( "nicks" ) )
          chan.people.get( "some" ).should.be.an.instanceof( o.Person )
          chan.people.get( "different" ).should.be.an.instanceof( o.Person )
          chan.people.get( "nicks" ).should.be.an.instanceof( o.Person )
          done()
        })
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        // A specific user JOINs
        bot._stream.emit( "data", f( ":protobot!~protobot@lol.com JOIN %s\r\n", chan ) )
        // A name reply for a channel
        bot._stream.emit( "data", f( ":niven.freenode.net 353 %s @ %s :some +different @nicks\r\n", conf.nick, chan ) )
      })

      bit( "should remove people from its list of users", function() {
        const chan = this.channels.add( "#removepeople" )
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        // Hit and run lol
        this._stream.emit( "data", ":protobot!~protobot@rogers.com JOIN #removepeople\r\n" )
        this._stream.emit( "data", ":protobot!~protobot@rogers.com PART #removepeople\r\n" )
        should.not.exist( this.channels.get( "#removepeople" ).people.get( "protobot" ) )
        // getting kicked should also remove the person
        this._stream.emit( "data", ":protobot!~protobot@rogers.com JOIN #removepeople\r\n" )
        this._stream.emit( "data", ":nemesis!~nemesis@rogers.com KICK #removepeople protobot\r\n" )
        should.not.exist( this.channels.get( "#removepeople" ).people.get( "protobot" ) )
        // also quitting
        this.channels.add( "#quitters" )
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, "#quitters" ) )
        this._stream.emit( "data", ":protobot!~protobot@rogers.com JOIN #removepeople\r\n" )
        this._stream.emit( "data", ":protobot!~protobot@rogers.com JOIN #quitters\r\n" )
        this._stream.emit( "data", ":protobot!~protobot@rogers.com QUIT :Oh no!\r\n" )
        should.not.exist( this.channels.get( "#removepeople" ).people.get( "protobot" ) )
        should.not.exist( this.channels.get( "#quitters" ).people.get( "protobot" ) )
      })

      bit( "should remove a channel if kicked from it", function() {
        const chan = this.channels.add( "#kickedfrom" )
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        this.channels.contains( chan ).should.equal( true )
        this._stream.emit( "data", f( ":kicky@kick.com KICK #lol,%s @other,%s,+another\r\n", chan, this.user.nick ) )
        this.channels.contains( chan ).should.equal( false )
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

      bit( "should know that lol{}|^ is the same as LOL[]\\~", function( done ) {
        const lol = "#lol{}|^", bot = this
        this.channels.add( lol, function( ch ) {
          bot.channels.contains( "#LOL[]\\~" ).should.equal( true )
          done()
        })
        this._stream.emit( "data", f( ":%s@wee JOIN %s\r\n", this.user.nick, lol ) )
        this._stream.emit( "data"
          , f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n", this.user.nick, lol, this.user.nick ) )
      })

      bit( "should rename the channel if forwarded", function( done ) {
        const c1 = o.channel( "#fwdfrom" )
            , c2 = o.channel( "#fwdto" )
        this.channels.add( c1, function( ch, err ) {
          err.should.be.an.instanceof( Error )
          err.message.should.equal( "Forwarding to another channel" )
          ch.name.should.equal( c2.name )
          done()
        })
        this._stream.emit( "data"
          , f( ":holmes.freenode.net 470 %s %s %s :Forwarding to another channel\r\n", this.user.nick, c1, c2 ) )
        this._stream.emit( "data", f( ":%s@wee JOIN %s\r\n", this.user.nick, c2 ) )
        this.channels.contains( c2 ).should.equal( true )
        this.channels.contains( "#fwdfrom" ).should.equal( false )
        c1.name.should.equal( c2.name )
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

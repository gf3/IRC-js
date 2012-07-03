const f       = require( "util" ).format
    , path    = require( "path" )
    , fs      = require( "fs" )
    , should  = require( "should" )
    , lib     = path.join( __dirname, "..", "..", "lib" )
    , help    = require( path.join( __dirname, "..", "helpers" ) )
    , o       = require( path.join( lib, "objects" ) )
    , cs      = require( path.join( lib, "constants" ) )
    , irc     = require( path.join( lib, "irc" ) )
    , Client  = irc.Client
    , server  = require( path.join( "..", "server" ) ).server
    , bit     = help.bit
    , conf    = help.conf
    , COMMAND = cs.COMMAND
    , EVENT   = cs.EVENT
    , MODE    = cs.MODE
    , REPLY   = cs.REPLY
    , STATUS  = irc.STATUS

// Make sure config files are up to date
const defaultConf = JSON.parse( fs.readFileSync( path.join( lib, "config.json" ) ) )
    , testingConf = JSON.parse( fs.readFileSync( path.join( __dirname, "config.json" ) ) )
    , exampleConf = JSON.parse( fs.readFileSync( path.join( __dirname, "..", "..", "examples", "config.json" ) ) )
    , noComments  = function( k ) { return k !== "//" } // :) // :)

describe( "irc", function() {
  describe( "Client", function() {
    describe( "send", function() {
      bit( "should append \"\\r\\n\" if not present", function( done ) {
        server.on( "message", function ok( d ) {
          if ( /PRIVMSG #nou/.test( d ) ) {
            server.removeListener( "message", ok )
            d.should.equal( "PRIVMSG #nou :NO U\r\n" )
            done()
          }
        })
        this.send( o.message( COMMAND.PRIVMSG, [ "#nou", ":NO U" ] ) )
      })

      bit( "should truncate messages to 512 chars (including \"\\r\\n\")", function( done ) {
        const longAssString = ":" + Array( 567 ).join( "*" )
        server.on( "message", function ok( d ) {
          if ( /PRIVMSG #longassstrings/.test( d ) ) {
            server.removeListener( "message", ok )
            d.length.should.equal( 512 )
            done()
          }
        })
        this.send( o.message( COMMAND.PRIVMSG, [ "#longassstrings", longAssString ] ) )
      })
    })

    describe( "connect", function() {
      // Pass is set in spec/lib/config.json
      bit( "should send the server password, if provided, on connect", function() {
        server.received[server.received.length - 1].should.equal( f( "PASS %s\r\n", conf.user.password ) )
      })
      // Modes set in config
      bit( "should send user information with correct modes", function() {
        server.received[server.received.length - 3]
            .should.equal( f( "USER %s 12 * :%s\r\n", conf.user.username, conf.user.realname ) )
      })

      bit( "should reconnect after having been disconnected", function( done ) {
        const bot = this
        bot.disconnect()
        bot.connect( function( b ) {
          b.should.be.an.instanceof( Client )
          done()
          return STATUS.REMOVE
        })
        server.on( "connection", function( s ) {
          server.recite( f( ":crichton.freenode.net 001 %s :Welcome to the freenode IRC Network js-irc\r\n"
                          , bot.user.nick ) )
        })
      })

      bit( "should update server name on 004", function( done ) {
        const bot = this
        bot.observe( REPLY.MYINFO, function() {
          bot.server.name.should.equal( "holmes.freenode.net" )
          done()
          // Better set it back now :)
          bot.server.name = conf.server.address
          return STATUS.REMOVE
        })
        server.recite( f( ":holmes.freenode.net 004 %s holmes.freenode.net ircd-seven-1.1.3 DOQRSZaghilopswz CFILMPQbcefgijklmnopqrstvz bkloveqjfI\r\n"
                        , this.user.nick ) )
      })
    })

    describe( "nick", function() {
      bit( "should change the nickname" )
    })

    describe( "quit", function() {
      bit( "should quit without a message", function( done ) {
        const bot = this
        server.on( "message", function ok( m ) {
          if ( ! /QUIT/.test( m ) )
            return
          m.should.equal( "QUIT\r\n" )
          bot.connect( function() { done() } )
          server.removeListener( "message", ok )
        })
        this.quit()
      })

      bit( "should quit with a message", function( done ) {
        const msg = "QUIT :LOL BAI\r\n", bot = this
        server.on( "message", function ok( m ) {
          if ( ! /QUIT/.test( m ) )
            return
          m.should.equal( msg )
          bot.connect( function() { done() } )
          server.removeListener( "message", ok )
        })
        this.quit( msg.slice( 6, -2 ) )
      })

      bit( "should disconnect and end the socket", function( done ) {
        const bot = this
        server.on( "end", function ok() {
          server.removeListener( "message", ok )
          bot.connect( function() { done() } )
        })
        this.quit()
      })
    })

    describe( "setMode", function() {
      bit( "should set various modes on the current user", function( done ) {
        const bot = this
        this.setMode( "-o" )
        server.on( "message", function ok( m ) {
          if ( ! /MODE/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( f( "MODE %s -o\r\n", bot.user.nick ) )
          done()
        })
      })
    })

    describe( "list", function() {
      it( "should get the information for a given channel" )
      it( "should get the information for all channels on a server" )
    })

    describe( "send", function() {
      bit( "should send Message objects", function( done ) {
        const bot = this
        server.on( "message", function ok( m ) {
          if ( ! /PRIVMSG/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( "PRIVMSG #asl :Sending stuff\r\n" )
          done()
        })
        this.send( o.message( COMMAND.PRIVMSG, [ "#asl", ":Sending stuff" ] ) )
      })

      /** @todo reimplement */
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
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        server.recite( f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n"
                        , this.user.nick, chan, this.user.nick ) )
      })

      bit( "should let you add Channel objects", function( done ) {
        const bot = this, chan = o.channel( "#addchanobj" )
        this.channels.add( chan, function( ch ) {
          bot.channels.contains( "#addchanobj" ).should.equal( true )
          bot.channels.get( "#addchanobj" ).should.equal( chan )
          bot.channels.get( ch ).should.equal( chan )
          done()
        })
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        server.recite( f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n", this.user.nick, chan, this.user.nick ) )
      })

      bit( "should let you remove channels by name", function( done ) {
        const chan = "#removechanname", bot = this
        this.channels.add( chan, function( ch ) {
          bot.channels.contains( chan ).should.equal( true )
          server.on( "message", function ok( m ) {
            if ( ! /PART/.test( m ) )
              return
            server.removeListener( "message", ok )
            m.should.equal( f( "PART %s\r\n", chan ) )
            server.recite( f( ":%s!~a@b.c PART %s\r\n", bot.user.nick, chan ) )
            done()
          })
          bot.channels.remove( chan )
        })
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        server.recite( f( ":card.freenode.net 353 %s @ %s :%s\r\n", this.user.nick, chan, this.user.nick ) )
      })

      bit( "should let you remove Channel objects", function( done ) {
        const chan = new o.Channel( "#removechanobj" ), bot = this
        this.channels.add( chan, function( ch ) {
          bot.channels.contains( chan ).should.equal( true )
          server.on( "message", function ok( m ) {
            if ( ! /PART/.test( m ) )
              return
            server.removeListener( "message", ok )
            m.should.equal( f( "PART %s\r\n", chan ) )
          })
          bot.channels.remove( chan )
          bot.observe( COMMAND.PART, function() {
            bot.channels.contains( chan ).should.equal( false )
            return STATUS.REMOVE
          })
          server.recite( f( ":%s!~a@b.c PART %s\r\n", bot.user.nick, chan ) )
          done()
        })
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        server.recite( f( ":card.freenode.net 353 %s @ %s :%s\r\n", this.user.nick, chan, this.user.nick ) )
      })

      bit( "should add people to its list of users, for various relevant messages", function( done ) {
        const bot = this
            , chan = this.channels.add( "#addpeople" )
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        // A name reply for a channel
        server.recite( f( ":niven.freenode.net 353 %s @ %s :some +different @nicks\r\n", conf.nick, chan ) )
        // A specific user joins
        server.recite( f( ":protobot!~protobot@lol.com JOIN %s\r\n", chan ) )

        setTimeout( function() {
          should.exist( chan.people.get( "protobot" ) )
          chan.people.get( "protobot" ).should.be.an.instanceof( o.Person )
          should.exist( chan.people.get( "some" ) )
          should.exist( chan.people.get( "different" ) )
          should.exist( chan.people.get( "nicks" ) )
          chan.people.get( "some" ).should.be.an.instanceof( o.Person )
          chan.people.get( "different" ).should.be.an.instanceof( o.Person )
          chan.people.get( "nicks" ).should.be.an.instanceof( o.Person )
          done()
        }, 10 )
      })

      bit( "should remove people from its list of users", function( done ) {
        const chan = this.channels.add( "#removepeople" ), bot = this
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", bot.user.nick, chan ) )
        // Hit and run lol
        server.recite( ":protobot1!~protobot@rogers.com JOIN #removepeople\r\n" )
        server.recite( ":protobot1!~protobot@rogers.com PART #removepeople\r\n" )
        // getting kicked should also remove the person
        server.recite( ":protobot2!~protobot@rogers.com JOIN #removepeople\r\n" )
        server.recite( ":evilbot!~nemesis@rogers.com KICK #removepeople protobot2\r\n" )
        // also quitting
        bot.channels.add( "#quitters" )
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", bot.user.nick, "#quitters" ) )
        server.recite( ":protobot3!~protobot@rogers.com JOIN #removepeople\r\n" )
        server.recite( ":protobot3!~protobot@rogers.com JOIN #quitters\r\n" )
        server.recite( ":protobot3!~protobot@rogers.com QUIT :Laterz\r\n" )
        setTimeout( function() {
          // Currently fails because I wanted to be cool and use a Map, then noticed
          // the lack of iteration/enumeration of keys, needed to check for and remove
          // a user from all channels in which they might be lurking.
          should.not.exist( bot.channels.get( "#removepeople" ).people.get( "protobot1" ) )
          should.not.exist( bot.channels.get( "#removepeople" ).people.get( "protobot2" ) )
          should.not.exist( bot.channels.get( "#removepeople" ).people.get( "protobot3" ) )
          should.not.exist( bot.channels.get( "#quitters" ).people.get( "protobot3" ) )
          done()
        }, 10 )
      })

      bit( "should remove a channel if kicked from it", function( done ) {
        const chan = this.channels.add( "#kickedfrom" ), bot = this
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", bot.user.nick, chan ) )
        setTimeout( function() {
          bot.channels.contains( chan ).should.equal( true )
          server.recite( f( ":kicky@kick.com KICK #lol,%s @other,%s,+another\r\n", chan, bot.user.nick ) )
          setTimeout( function() {
            bot.channels.contains( chan ).should.equal( false )
            done()
          }, 10 )
        }, 10 )
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
        server.recite( f( ":%s@wee JOIN %s\r\n", this.user.nick, c1 ) )
        server.recite( f( ":%s@wee JOIN %s\r\n", this.user.nick, c2 ) )
        server.recite( f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n", this.user.nick, c1, nick ) )
        server.recite( f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n", this.user.nick, c2, nick ) )
      })

      bit( "should know that lol{}|^ is the same as LOL[]\\~", function( done ) {
        const lol = "#lol{}|^", bot = this
        this.channels.add( lol, function( ch ) {
          bot.channels.contains( "#LOL[]\\~" ).should.equal( true )
          done()
        })
        server.recite( f( ":%s@wee JOIN %s\r\n", this.user.nick, lol ) )
        server.recite( f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n"
                        , this.user.nick, lol, this.user.nick ) )
      })

      bit( "should rename the channel if forwarded", function( done ) {
        const c1 = o.channel( "#fwdfrom" )
            , c2 = o.channel( "#fwdto" )
            , bot = this
        this.channels.add( c1, function( ch, err ) {
          err.should.be.an.instanceof( Error )
          err.message.should.equal( "Forwarding to another channel" )
          ch.name.should.equal( c2.name )
          bot.channels.contains( c2 ).should.equal( true )
          bot.channels.contains( "#fwdfrom" ).should.equal( false )
          done()
        })
        server.recite( f( ":holmes.freenode.net 470 %s %s %s :Forwarding to another channel\r\n"
                        , this.user.nick, c1, c2 ) )
        server.recite( f( ":%s@wee JOIN %s\r\n", this.user.nick, c2 ) )
      })
    })

    bit( f( "should emit all events as a `%s` event with message as first parameter", EVENT.ANY ), function( done ) {
      this.observe( EVENT.ANY, function( msg ) {
        msg.type.should.equal( COMMAND.PRIVMSG )
        done()
        return STATUS.REMOVE
      })

      server.recite( ":gf3!n=gianni@pdpc/supporter/active/gf3 PRIVMSG #runlevel6 :ANY LOL\r\n")
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

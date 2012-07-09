const f       = require( "util" ).format
    , fs      = require( "fs" )
    , path    = require( "path" )
    , should  = require( "should" )
    , help    = require( path.join( __dirname, "..", "helpers" ) )
    , lib     = path.join( __dirname, "..", "..", "lib" )
    , IRC     = require( path.join( lib, "irc" ) )
    , cs      = require( path.join( lib, "constants" ) )
    , o       = require( path.join( lib, "objects" ) )
    , server  = require( path.join( "..", "server" ) ).server
    , bit     = help.bit
    , COMMAND = cs.COMMAND
    , ERROR   = cs.ERROR
    , EVENT   = cs.EVENT
    , REPLY   = cs.REPLY
    , MODE    = cs.MODE

const msgs = help.readFixture( "messages.json" )

describe( "objects", function() {
  describe( "Message", function() {
    describe( "send", function() {
      bit( "should send itself", function( done ) {
        const txt = o.trailing( "Message, send thyself" )
            , msg = o.message( COMMAND.PRIVMSG, [ "#nlogax", txt ] ).for( this )
        server.on( "message", function ok( m ) {
          if ( ! /PRIVMSG #nlogax/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( "PRIVMSG #nlogax :Message, send thyself\r\n" )
          done()
        })
        msg.send()
      })
    })

    describe( "reply", function() {
      bit( "should reply to channel messages", function( done ) {
        const msg = o.message( o.person( "gf3" ), COMMAND.PRIVMSG
                             , [ "#jquery-ot", ":wat" ] ).for( this )
        server.on( "message", function ok( m ) {
          if ( ! /PRIVMSG #jquery-ot/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( "PRIVMSG #jquery-ot :Is these a bug?\r\n" )
          done()
        })
        msg.reply( "Is these a bug?" )
      })

      bit( "should reply to direct messages", function( done ) {
        const msg = o.message( o.person( "gf3" ), COMMAND.PRIVMSG
                             , [ this.user.nick, ":wat" ] ).for( this )
        server.on( "message", function ok( m ) {
          if ( ! /PRIVMSG gf3/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( "PRIVMSG gf3 :Is these a bug?\r\n" )
          done()
        })
        msg.reply( "Is these a bug?" )
      })
    })

    describe( "factory function", function() {
      it( "should support convenient signatures", function() {
        var m = o.message( COMMAND.LIST )
        m.should.be.an.instanceof( o.Message )
        m.type.should.equal( COMMAND.LIST )
        should.equal( m.from, null )
        m.params.should.eql( [] )

        m = o.message( COMMAND.JOIN, [ "#jquery" ] )
        m.should.be.an.instanceof( o.Message )
        m.type.should.equal( COMMAND.JOIN )
        should.equal( m.from, null )
        m.params.should.eql( [ "#jquery"] )

        m = o.message( COMMAND.PRIVMSG, [ "#jquery", ": Hey" ] )
        m.should.be.an.instanceof( o.Message )
        m.type.should.equal( COMMAND.PRIVMSG )
        should.equal( m.from, null )
        m.params.should.eql( [ "#jquery", ": Hey" ] )

        m = o.message( o.person( "lol" ), COMMAND.PRIVMSG, [ "#jquery", ": Hey" ] )
        m.should.be.an.instanceof( o.Message )
        m.type.should.equal( COMMAND.PRIVMSG )
        m.from.should.eql( o.person( "lol" ) )
        m.params.should.eql( [ "#jquery", ": Hey" ] )
      })

      it( "should throw an error if no suitable signature", function() {
        o.message.bind( null, 1, 2, 3, 4 ).should.throw( /signature/ )
        o.message.bind( null ).should.throw( /signature/ )
      })
    })
  })

  describe( "Channel", function() {
    describe( "toString", function() {
      it( "should serialize into its name", function() {
        const chan = o.channel( "#nlogax" )
        chan.toString().should.equal( chan.name )
      })
    })

    describe( "topic", function() {
      bit( "should set its own topic", function( done ) {
        const chan  = o.channel( "#setowntopic" ).for( this )
            , topic = "My own topic should be set to this"
        chan.join()
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        server.on( "message", function ok( m ) {
          if ( ! /TOPIC #setowntopic/.test( m ) )
            return
          server.removeListener( "message", ok )
          server.recite( f( ":topic@setter.com TOPIC %s :%s\r\n", chan, topic ) )
          setTimeout( function() {
            chan.topic.should.equal( topic )
            done()
          }, 10 )
        })
        chan.setTopic( topic )
      })

      bit( "should keep its topic updated", function( done ) {
        const chan  = this.join( "#updatetopic" ).for( this )
            , topic = "This topic is so up to date"
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        server.recite( f( ":topic@setter.com TOPIC %s :%s\r\n", chan, topic ) )
        setTimeout( function() {
          chan.topic.should.equal( topic )
          done()
        }, 10 )
      })
    })

    describe( "mode", function() {
      bit( "should record the channel mode", function( done ) {
        const chan = o.channel( "#gotmodez" )
        this.join( chan )
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        server.recite( ":the.server.com MODE #gotmodez +ami\r\n" )
        server.recite( ":the.server.com MODE #gotmodez -i\r\n" )
        setTimeout( function() {
          chan.mode.sort().should.eql( [ 'a', 'm' ] )
          done()
        }, 10 )
      })

      bit( "should set the channel mode from a string", function( done ) {
        const chan = this.join( "#modez" )
            , mode = "+it"
        server.on( "message", function ok( m ) {
          if ( ! /MODE #modez/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( f( "MODE %s %s\r\n", chan, mode ) )
          server.recite( f( ":lol@omg.com MODE %s %s\r\n", chan, mode ) )
        })
        this.observe( COMMAND.MODE, function() {
          chan.mode.sort().should.eql( [ 'i', 't' ] )
          done()
        })
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        chan.setMode( mode )
      })
    })

    describe( "invite", function() {
      bit( "should invite people by name", function( done ) {
        const chan = o.channel( "#peoplewithnames" ).for( this )
            , user = "namedperson"
        server.on( "message", function ok( m ) {
          if ( ! /INVITE/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( f( "INVITE %s %s\r\n", user, chan ) )
          done()
        })
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        server.recite( f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n"
                        , this.user.nick, chan, this.user.nick ) )
        chan.invite( user )
      })

      bit( "should invite Person objects", function( done ) {
        const chan = o.channel( "#objectified" ).for( this )
            , user = o.person( "obj", "lol", "omg" )
        server.on( "message", function ok( m ) {
          if ( ! /INVITE/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( f( "INVITE %s %s\r\n", user.nick, chan ) )
          done()
        })
        chan.invite( user )
      })
    })

    describe( "join", function() {
      bit( "should join a Channel object", function( done ) {
        const chan = o.channel( "#joiners" ).for( this )
        server.on( "message", function ok( m ) {
          if ( ! /JOIN/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( f( "JOIN %s\r\n", chan.name ) )
          done()
        })
        chan.join()
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        server.recite( f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n"
                        , this.user.nick, chan, this.user.nick ) )
      })

      bit( "should join a Channel object with a key", function( done ) {
        const chan = o.channel( "#keyjoin" ).for( this )
            , key = "keymaster"
            , bot = this
        chan.join( key, function( ch ) {
          bot.channels.has( chan.id ).should.equal( true )
          done()
        })
        this.channels.has( chan.id ).should.equal( false )
        server.on( "message", function ok( m ) {
          if ( ! /JOIN/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( f( "JOIN %s %s\r\n", chan.name, key ) )
        })
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        server.recite( f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n"
                        , this.user.nick, chan, this.user.nick ) )
      })

      bit( "should join a Channel object with a callback", function( done ) {
        const chan = o.channel( "#callbackz" ).for( this )
            , bot = this
        chan.join( function( ch ) {
          chan.should.equal( ch )
          ch.people.has( bot.user.id ).should.equal( true )
          ch.people.has( o.id( "nlogax" ) ).should.equal( true )
          done()
        })
        server.on( "message", function ok( m ) {
          if ( ! /JOIN/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( f( "JOIN %s\r\n", chan.name ) )
        })
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        server.recite( f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n"
                        , this.user.nick, chan, this.user.nick ) )
      })

      bit( "should join a Channel object with a key and a callback", function( done ) {
        const chan = o.channel( "#keycallback" ).for( this )
            , key = "keyback"
        chan.join( key, function( ch ) {
          chan.should.equal( ch )
          done()
        })
        server.on( "message", function ok( m ) {
          if ( ! /JOIN/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( f( "JOIN %s %s\r\n", chan.name, key ) )
        })
        server.recite( f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        server.recite( f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n", this.user.nick, chan, this.user.nick ) )
      })

      // All error responses to joining a channel except ERR_NEEDMOREPARAMS
      // We only send proper JOIN messages, if someone concocts and sends an invalid one,
      // they need to handle the replies on their own anyway.
      bit( "should give a proper error callback if joining fails", function( done ) {
        const bot = this
            , ers = [ ERROR.BANNEDFROMCHAN
                    , ERROR.INVITEONLYCHAN
                    , ERROR.BADCHANNELKEY
                    , ERROR.CHANNELISFULL
                    , ERROR.BADCHANMASK
                    , ERROR.NOSUCHCHANNEL
                    , ERROR.TOOMANYCHANNELS
                    , ERROR.TOOMANYTARGETS
                    , ERROR.UNAVAILRESOURCE
                    ]
            , l = ers.length
        var i = 0
        ers.forEach( function( e ) {
          const chan = o.channel( f( "#failjoin%s", e ) ).for( bot )
          chan.join( function( chn, err ) {
            chn.should.be.an.instanceof( o.Channel )
            err.should.be.an.instanceof( Error )
            err.message.should.equal( f( "Cannot join channel (%s)", e ) )
            if ( ++i === l )
              done()
          })
          server.recite( f( ":n.o.u %s %s :%s\r\n", e, chan, f( "Cannot join channel (%s)", e ) ) )
        })
      })
    })

    describe( "kick", function() {
      bit( "should kick people by name", function( done ) {
        const chan = o.channel( "#meanies" ).for( this ).join()
            , user = "victim"
        server.on( "message", function ok( m ) {
          if ( ! /KICK/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( f( "KICK %s %s\r\n", chan, user ) )
          done()
        })
        chan.kick( user )
      })

      bit( "should kick Person objects", function( done ) {
        const chan = o.channel( "#meanies" ).for( this ).join()
            , user = o.person( "victim" )
        server.on( "message", function ok( m ) {
          if ( ! /KICK/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( f( "KICK %s %s\r\n", chan, user.nick ) )
          done()
        })
        chan.kick( user )
      })
    })

    describe( "notify", function() {
      bit( "should get notified", function( done ) {
        const chan   = o.channel( "#notifications" ).for( this )
            , notice = "Important announcement"
        server.on( "message", function ok( m ) {
          if ( ! /NOTICE/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( f( "NOTICE %s :%s\r\n", chan, notice ) )
          done()
        })
        chan.notify( notice )
      })
    })

    describe( "factory function", function() {
      it( "should support convenient signatures", function() {
        o.channel( "#lol" ).should.be.an.instanceof( o.Channel )
      })

      it( "should throw an error if no suitable signature", function() {
        o.channel.bind( null ).should.throw( /signature/ )
      })
    })
  })

  describe( "Person", function() {
    describe( "toString", function() {
      it( "should serialize into its nick, user and host", function() {
        const p = o.person( "anick", "auser", "ahost" )
        p.toString().should.equal( "anick!auser@ahost" )
        p.user = null
        p.toString().should.equal( "anick@ahost" )
        p.host = null
        p.toString().should.equal( "anick" )
      })
    })

    describe( "kickFrom", function() {
      bit( "should get kicked from a channel by name", function( done ) {
        const prsn = o.person( "kicked1", "ki", "ck" ).for( this )
            , chan = "#namekick"
        server.on( "message", function ok( m ) {
          if ( ! /KICK/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( f( "KICK %s %s\r\n", chan, prsn.nick ) )
          done()
        })
        prsn.kickFrom( chan )
      })

      bit( "should get kicked from a Channel object", function( done ) {
        const prsn = o.person( "kicked2", "bo", "om" ).for( this )
            , chan = o.channel( "#objkick" ).for( this ).join()
        server.on( "message", function ok( m ) {
          if ( ! /KICK/.test( m ) )
            return
          server.removeListener( "message", ok )
          m.should.equal( f( "KICK %s %s\r\n", chan.name, prsn.nick ) )
          done()
        })
        prsn.kickFrom( chan )
      })
    })

    describe( "inviteTo", function() {
      bit( "should get invited to a channel, by name or Channel object", function( done ) {
        const prsn = o.person( "gf3", "eh", "canada" ).for( this )
            , chan = o.channel( "#america" )
        server.on( "message", function ok( m ) {
          server.removeListener( "message", ok )
          m.should.equal( f( "INVITE %s %s\r\n", prsn.nick, chan ) )
          done()
        })
        prsn.inviteTo( chan )
      })
    })

    describe( "notify", function() {
      bit( "should get notified", function( done ) {
        const person = o.person( "gf3" ).for( this )
            , notice = "Important announcement"
        server.on( "message", function ok( m ) {
          server.removeListener( "message", ok )
          m.should.equal( f( "NOTICE %s :%s\r\n", person, notice ) )
          done()
        })
        person.notify( notice )
      })
    })

    describe( "factory function", function() {
      it( "should support convenient signatures", function() {
        var p = o.person( "lol1" )
        p.should.be.an.instanceof( o.Person )
        p.nick.should.equal( "lol1" )
        should.not.exist( p.user )
        should.not.exist( p.host )
        p = o.person( "lol2", "omg" )
        p.should.be.an.instanceof( o.Person )
        p.nick.should.equal( "lol2" )
        p.user.should.equal( "omg" )
        should.not.exist( p.host )
        p = o.person( "lol3", "omg", "wtf" )
        p.should.be.an.instanceof( o.Person )
        p.nick.should.equal( "lol3" )
        p.user.should.equal( "omg" )
        p.host.should.equal( "wtf" )
      })

      it( "should throw an error if no suitable signature", function() {
        o.person.bind( null ).should.throw( /signature/ )
        o.person.bind( null, 1, 2, 3, 4 ).should.throw( /signature/ )
      })
    })
  })
})

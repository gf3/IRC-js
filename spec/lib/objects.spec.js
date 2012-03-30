const f       = require( "util" ).format
    , fs      = require( "fs" )
    , path    = require( "path" )
    , should  = require( "should" )
    , help    = require( path.join( __dirname, "..", "helpers" ) )
    , lib     = path.join( __dirname, "..", "..", "lib" )
    , IRC     = require( path.join( lib, "irc" ) )
    , cs      = require( path.join( lib, "constants" ) )
    , o       = require( path.join( lib, "objects" ) )
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
      bit( "should send itself", function() {
        const txt = o.trailing( "Message, send thyself" )
            , msg = o.message( COMMAND.PRIVMSG, [ "#nlogax", txt ] ).for( this )
        msg.send()
        this._stream.output[0].should.equal( f( "PRIVMSG #nlogax %s\r\n", txt ) )
      })
    })

    describe( "reply", function() {
      bit( "should reply to channel messages", function() {
        const msg = o.message( o.person( "gf3" ), COMMAND.PRIVMSG
                             , [ "#jquery-ot", ":wat" ] ).for( this )
        msg.reply( "Is these a bug?" )
        this._stream.output[0].should.equal( "PRIVMSG #jquery-ot :Is these a bug?\r\n" )
      })

      bit( "should reply to direct messages", function() {
        const msg = o.message( o.person( "gf3" ), COMMAND.PRIVMSG
                             , [ this.user.nick, ":wat" ] ).for( this )
        msg.reply( "Is these a bug?" )
        this._stream.output[0].should.equal( "PRIVMSG gf3 :Is these a bug?\r\n" )
      })
    })

    describe( "factory function", function() {
      it( "should support convenient signatures", function() {
        var m = o.message( COMMAND.LIST )
        m.should.be.an.instanceof( o.Message )
        m.command.should.equal( COMMAND.LIST )
        should.equal( m.prefix, null )
        m.params.should.eql( [] )

        m = o.message( COMMAND.JOIN, [ "#jquery" ] )
        m.should.be.an.instanceof( o.Message )
        m.command.should.equal( COMMAND.JOIN )
        should.equal( m.prefix, null )
        m.params.should.eql( [ "#jquery"] )

        m = o.message( COMMAND.PRIVMSG, [ "#jquery", ": Hey" ] )
        m.should.be.an.instanceof( o.Message )
        m.command.should.equal( COMMAND.PRIVMSG )
        should.equal( m.prefix, null )
        m.params.should.eql( [ "#jquery", ": Hey" ] )

        m = o.message( o.person( "lol" ), COMMAND.PRIVMSG, [ "#jquery", ": Hey" ] )
        m.should.be.an.instanceof( o.Message )
        m.command.should.equal( COMMAND.PRIVMSG )
        m.prefix.should.eql( o.person( "lol" ) )
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
      bit( "should set its own topic", function() {
        const chan  = o.channel( "#setowntopic" ).for( this )
            , topic = "My own topic should be set to this"
        chan.setTopic( topic )
        this._stream.output[0].should.equal( f( "TOPIC %s :%s\r\n", chan, topic ) )
      })

      bit( "should keep its topic updated", function() {
        const chan  = this.channels.add( "#updatetopic" ).for( this )
            , topic = "This topic is so up to date"
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        this._stream.emit( "data", f( ":topic@setter.com TOPIC %s :%s\r\n", chan, topic ) )
        chan.topic.should.equal( topic )
      })
    })

    describe( "mode", function() {
      bit( "should record the channel mode", function() {
        const chan = o.channel( "#gotmodez" )
        this.channels.add( chan )
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        this._stream.emit( "data", ":the.server.com MODE #gotmodez +am-i\r\n" )
        chan.mode.should.equal( MODE.CHANNEL.ANONYMOUS | MODE.CHANNEL.MODERATED )
        this._stream.emit( "data", ":the.server.com MODE #gotmodez +i\r\n" )
        chan.mode.should.equal( MODE.CHANNEL.ANONYMOUS | MODE.CHANNEL.MODERATED | MODE.CHANNEL.INVITE )
        this._stream.emit( "data", ":the.server.com MODE #gotmodez -a\r\n" )
        chan.mode.should.equal( MODE.CHANNEL.MODERATED | MODE.CHANNEL.INVITE )
      })

      bit( "should set the channel mode from a mask", function() {
        // This is silly, but when turning the mask into a string, every mode *not* set is _un_set
        // @todo {jonas} Make unsilly
        const mode = "-a+i-mnpqrs+t-bOeIklov"
            , chan = o.channel( "#modezmask" )
        this.channels.add( chan )
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        chan.setMode( MODE.CHANNEL.INVITE | MODE.CHANNEL.TOPIC )
        this._stream.output[0].should.equal( f( "MODE %s %s\r\n", chan, mode ) )
        this._stream.emit( "data", f( ":lol@omg.com MODE %s %s\r\n", chan, mode ) )
        chan.mode.should.equal( MODE.CHANNEL.INVITE | MODE.CHANNEL.TOPIC )
      })

      bit( "should set the channel mode from a string", function() {
        const chan = this.channels.add( "#modez" )
            , mode = "+it"
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        chan.setMode( "+it" )
        this._stream.output[0].should.equal( f( "MODE %s %s\r\n", chan, mode ) )
        this._stream.emit( "data", f( ":lol@omg.com MODE %s %s\r\n", chan, mode ) )
        chan.mode.should.equal( MODE.CHANNEL.INVITE | MODE.CHANNEL.TOPIC )
      })
    })

    describe( "invite", function() {
      bit( "should invite people by name", function() {
        const chan = o.channel( "#peoplewithnames" ).for( this )
            , user = "namedperson"
        chan.invite( user )
        this._stream.output[0].should.equal( f( "INVITE %s %s\r\n", user, chan ) )
      })

      bit( "should invite Person objects", function() {
        const chan = o.channel( "#objectified" ).for( this )
            , user = o.person( "obj", "lol", "omg" )
        chan.invite( user )
        this._stream.output[0].should.equal( f( "INVITE %s %s\r\n", user.nick, chan ) )
      })
    })

    describe( "join", function() {
      bit( "should join a Channel object", function() {
        const chan = o.channel( "#joiners" ).for( this )
        chan.join()
        this._stream.output[0].should.equal( f( "JOIN %s\r\n", chan.name ) )
      })

      bit( "should join a Channel object with a key", function( done ) {
        const chan = o.channel( "#keyjoin" ).for( this )
            , key = "keymaster"
            , bot = this
        this.observe( REPLY.NAMREPLY, function( ch ) {
          bot.channels.contains( chan ).should.equal( true )
          done()
        })
        chan.join( key )
        this.channels.contains( chan ).should.equal( false )
        this._stream.output[0].should.equal( f( "JOIN %s %s\r\n", chan.name, key ) )
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        this._stream.emit( "data"
          , f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n", this.user.nick, chan, this.user.nick ) )
      })

      bit( "should join a Channel object with a callback", function( done ) {
        const chan = o.channel( "#callbackz" ).for( this )
            , bot = this
        chan.join( function( ch ) {
          chan.should.equal( ch )
          // Since we give the callback after a 353, people should be available
          ch.people.contains( bot.user ).should.equal( true )
          ch.people.contains( "nlogax" ).should.equal( true )
          done()
        })
        this._stream.output[0].should.equal( f( "JOIN %s\r\n", chan.name ) )
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        this._stream.emit( "data"
          , f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n", this.user.nick, chan, this.user.nick ) )
        this.channels.contains( chan ).should.equal( true )
      })

      bit( "should join a Channel object with a key and a callback", function( done ) {
        const chan = o.channel( "#keycallback" ).for( this )
            , key = "keyback"
        chan.join( key, function( ch ) {
          chan.should.equal( ch )
          done()
        })
        this._stream.output[0].should.equal( f( "JOIN %s %s\r\n", chan.name, key ) )
        this._stream.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan ) )
        this._stream.emit( "data"
          , f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n", this.user.nick, chan, this.user.nick ) )
        this.channels.contains( chan ).should.equal( true )
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
          bot._stream.output[0].should.equal( f( "JOIN %s\r\n", chan.name ) )
          bot._stream.emit( "data"
            , f( ":n.o.u %s %s :%s\r\n", e, chan, f( "Cannot join channel (%s)", e ) ) )
        })
      })
    })

    describe( "kick", function() {
      bit( "should kick people by name", function() {
        const chan = o.channel( "#meanies" ).for( this )
            , user = "victim"
        chan.kick( user )
        this._stream.output[0].should.equal( f( "KICK %s %s\r\n", chan, user ) )
      })

      bit( "should kick Person objects", function() {
        const chan = o.channel( "#meanies" ).for( this )
            , user = o.person( "victim" )
        chan.kick( user )
        this._stream.output[0].should.equal( f( "KICK %s %s\r\n", chan, user.nick ) )
      })
    })

    describe( "notify", function() {
      bit( "should get notified", function() {
        const chan   = o.channel( "#notifications" ).for( this )
            , notice = "Important announcement"
        chan.notify( notice )
        this._stream.output[0].should.equal( f( "NOTICE %s :%s\r\n", chan, notice ) )
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
      bit( "should get kicked from a channel by name", function() {
        const prsn = o.person( "kicked1", "ki", "ck" ).for( this )
            , chan = "#namekick"
        prsn.kickFrom( chan )
        this._stream.output[0].should.equal( f( "KICK %s %s\r\n", chan, prsn.nick ) )
      })

      bit( "should get kicked from a Channel object", function() {
        const prsn = o.person( "kicked2", "bo", "om" ).for( this )
            , chan = o.channel( "#objkick" )
        prsn.kickFrom( chan )
        this._stream.output[0].should.equal( f( "KICK %s %s\r\n", chan.name, prsn.nick ) )
      })
    })

    describe( "inviteTo", function() {
      bit( "should get invited to a channel, by name or Channel object", function() {
        const prsn = o.person( "gf3", "eh", "canada" ).for( this )
            , chan = o.channel( "#america" )
        prsn.inviteTo( chan )
        this._stream.output[0].should.equal( f( "INVITE %s %s\r\n", prsn.nick, chan ) )

        prsn.inviteTo( "#america" )
        this._stream.output[0].should.equal( f( "INVITE %s %s\r\n", prsn.nick, chan ) )
      })
    })

    describe( "notify", function() {
      bit( "should get notified", function() {
        const person = o.person( "gf3" ).for( this )
            , notice = "Important announcement"
        person.notify( notice )
        this._stream.output[0].should.equal( f( "NOTICE %s :%s\r\n", person, notice ) )
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

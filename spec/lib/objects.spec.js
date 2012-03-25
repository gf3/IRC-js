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
    , EVENT   = cs.EVENT
    , REPLY   = cs.REPLY
    , MODE    = cs.MODE

const msgs = help.readFixture( "messages.json" )

describe( "objects", function() {
  describe( "Message", function() {
    describe( "send", function() {
      bit( "should send itself", function() {
        const txt = o.trailing( "Message, send thyself" )
            , msg = o.message( COMMAND.PRIVMSG, [ "#nlogax", txt ] ).with( this )
        msg.send()
        this._internal.socket.output[0].should.equal( f( "PRIVMSG #nlogax %s\r\n", txt ) )
      })
    })

    describe( "reply", function() {
      bit( "should reply to channel messages", function() {
        const msg = o.message( o.person( "gf3" ), COMMAND.PRIVMSG
                             , [ "#jquery-ot", ":wat" ] ).with( this )
        msg.reply( "Is these a bug?" )
        this._internal.socket.output[0].should.equal( "PRIVMSG #jquery-ot :Is these a bug?\r\n" )
      })

      bit( "should reply to direct messages", function() {
        const msg = o.message( o.person( "gf3" ), COMMAND.PRIVMSG
                             , [ this.config.nick, ":wat" ] ).with( this )
        msg.reply( "Is these a bug?" )
        this._internal.socket.output[0].should.equal( "PRIVMSG gf3 :Is these a bug?\r\n" )
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
        const chan  = o.channel( "#setowntopic" ).with( this )
            , topic = "My own topic should be set to this"
        chan.setTopic( topic )
        this._internal.socket.output[0].should.equal( f( "TOPIC %s :%s\r\n", chan, topic ) )
      })

      bit( "should keep its topic updated", function() {
        const chan  = this.channels.add( "#updatetopic" )
            , topic = "This topic is so up to date"
        this._internal.socket.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.config.nick, chan ) )
        this._internal.socket.emit( "data", f( ":%s JOIN %s\r\n", this.config.nick, chan ) )
        this._internal.socket.emit( "data", f( ":topic@setter.com TOPIC %s :%s\r\n", chan, topic ) )
        chan.topic.should.equal( topic )
      })
    })

    describe( "mode", function() {
      bit( "should record the channel mode", function() {
        const chan = o.channel( "#modez" )
        this.channels.add( chan )
        this._internal.socket.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.config.nick, chan ) )
        this._internal.socket.emit( "data", ":the.server.com MODE #modez +am-i\r\n" )
        chan.mode.should.equal( MODE.CHANNEL.ANONYMOUS | MODE.CHANNEL.MODERATED )
        this._internal.socket.emit( "data", ":the.server.com MODE #modez +i\r\n" )
        chan.mode.should.equal( MODE.CHANNEL.ANONYMOUS | MODE.CHANNEL.MODERATED | MODE.CHANNEL.INVITE )
        this._internal.socket.emit( "data", ":the.server.com MODE #modez -a\r\n" )
        chan.mode.should.equal( MODE.CHANNEL.MODERATED | MODE.CHANNEL.INVITE )
      })

      bit( "should set the channel mode from a mask", function() {
        // This is silly, but when turning the mask into a string, every mode *not* set is _un_set
        // @todo {jonas} Make unsilly
        const mode = "-a+i-mnpqrs+t-bOeIklov"
            , chan = o.channel( "#modez" )
        this.channels.add( chan )
        this._internal.socket.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.config.nick, chan ) )
        this._internal.socket.emit( "data", f( ":%s JOIN %s\r\n", this.config.nick, chan ) )
        chan.setMode( MODE.CHANNEL.INVITE | MODE.CHANNEL.TOPIC )
        this._internal.socket.output[0].should.equal( f( "MODE %s %s\r\n", chan, mode ) )
        this._internal.socket.emit( "data", f( ":lol@omg.com MODE %s %s\r\n", chan, mode ) )
        chan.mode.should.equal( MODE.CHANNEL.INVITE | MODE.CHANNEL.TOPIC )
      })

      bit( "should set the channel mode from a string", function() {
        const chan = this.channels.add( "#modez" )
            , mode = "+it"
        this._internal.socket.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.config.nick, chan ) )
        chan.setMode( "+it" )
        this._internal.socket.output[0].should.equal( f( "MODE %s %s\r\n", chan, mode ) )
        this._internal.socket.emit( "data", f( ":lol@omg.com MODE %s %s\r\n", chan, mode ) )
        chan.mode.should.equal( MODE.CHANNEL.INVITE | MODE.CHANNEL.TOPIC )
      })
    })

    describe( "invite", function() {
      bit( "should invite people by name", function() {
        const chan = o.channel( "#peoplewithnames" ).with( this )
            , user = "namedperson"
        chan.invite( user )
        this._internal.socket.output[0].should.equal( f( "INVITE %s %s\r\n", user, chan ) )
      })

      bit( "should invite Person objects", function() {
        const chan = o.channel( "#objectified" ).with( this )
            , user = o.person( "obj", "lol", "omg" )
        chan.invite( user )
        this._internal.socket.output[0].should.equal( f( "INVITE %s %s\r\n", user.nick, chan ) )
      })
    })

    describe( "join", function() {
      bit( "should join a Channel object", function() {
        const chan = o.channel( "#joiners" ).with( this )
        chan.join()
        this._internal.socket.output[0].should.equal( f( "JOIN %s\r\n", chan.name ) )
      })

      bit( "should join a Channel object with a key", function() {
        const chan = o.channel( "#keyjoin" ).with( this )
            , key = "keymaster"
        chan.join( key )
        this._internal.socket.output[0].should.equal( f( "JOIN %s %s\r\n", chan.name, key ) )
      })

      bit( "should join a Channel object with a callback", function( done ) {
        const chan = o.channel( "#callbackz" ).with( this )
        chan.join( function( ch ) {
          chan.should.equal( ch )
          done()
        })
        this._internal.socket.output[0].should.equal( f( "JOIN %s\r\n", chan.name ) )
        this._internal.socket.emit( "data", f( ":%s!~a@b.c JOIN %s\r\n", this.config.nick, chan ) )
        this._internal.socket.emit( "data"
          , f( ":card.freenode.net 353 %s @ %s :%s nlogax\r\n", this.config.nick, chan, this.config.nick ) )
      })
    })

    describe( "kick", function() {
      bit( "should kick people by name", function() {
        const chan = o.channel( "#meanies" ).with( this )
            , user = "victim"
        chan.kick( user )
        this._internal.socket.output[0].should.equal( f( "KICK %s %s\r\n", chan, user ) )
      })

      bit( "should kick Person objects", function() {
        const chan = o.channel( "#meanies" ).with( this )
            , user = o.person( "victim" )
        chan.kick( user )
        this._internal.socket.output[0].should.equal( f( "KICK %s %s\r\n", chan, user.nick ) )
      })
    })

    describe( "notify", function() {
      bit( "should get notified", function() {
        const chan   = o.channel( "#notifications" ).with( this )
            , notice = "Important announcement"
        chan.notify( notice )
        this._internal.socket.output[0].should.equal( f( "NOTICE %s :%s\r\n", chan, notice ) )
      })
    })

    describe( "factory function", function() {
      it( "should support convenient signatures", function() {
        o.channel( "lol" ).should.be.an.instanceof( o.Channel )
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
      bit( "should get kicked from a channel, by name or using a Channel object", function() {
        const prsn = o.person( "ada", "u", "h" ).with( this )
            , chan = o.channel( "#elitists" )
        prsn.kickFrom( chan )
        this._internal.socket.output[0].should.equal( f( "KICK %s %s\r\n", chan, prsn.nick ) )

        prsn.kickFrom( "#elitists" )
        this._internal.socket.output[0].should.equal( f( "KICK %s %s\r\n", chan, prsn.nick ) )
      })
    })

    describe( "inviteTo", function() {
      bit( "should get invited to a channel, by name or Channel object", function() {
        const prsn = o.person( "gf3", "eh", "canada" ).with( this )
            , chan = o.channel( "#america" )
        prsn.inviteTo( chan )
        this._internal.socket.output[0].should.equal( f( "INVITE %s %s\r\n", prsn.nick, chan ) )

        prsn.inviteTo( "#america" )
        this._internal.socket.output[0].should.equal( f( "INVITE %s %s\r\n", prsn.nick, chan ) )
      })
    })

    describe( "notify", function() {
      bit( "should get notified", function() {
        const person = o.person( "gf3" ).with( this )
            , notice = "Important announcement"
        person.notify( notice )
        this._internal.socket.output[0].should.equal( f( "NOTICE %s :%s\r\n", person, notice ) )
      })
    })

    describe( "factory function", function() {
      it( "should support convenient signatures", function() {
        var p = o.person( "lol" )
        p.should.be.an.instanceof( o.Person )
        p.nick.should.equal( "lol" )
        should.not.exist( p.user )
        should.not.exist( p.host )
        p = o.person( "lol", "omg" )
        p.should.be.an.instanceof( o.Person )
        p.nick.should.equal( "lol" )
        p.user.should.equal( "omg" )
        should.not.exist( p.host )
        p = o.person( "lol", "omg", "wtf" )
        p.should.be.an.instanceof( o.Person )
        p.nick.should.equal( "lol" )
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

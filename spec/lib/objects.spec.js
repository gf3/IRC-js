const f       = require( "util" ).format
    , path    = require( "path" )
    , bit     = require( path.join( __dirname, "..", "helpers" ) ).bit
    , lib     = path.join( __dirname, "..", "..", "lib" )
    , IRC     = require( path.join( lib, "irc" ) )
    , cs      = require( path.join( lib, "constants" ) )
    , o       = require( path.join( lib, "objects" ) )
    , COMMAND = cs.COMMAND
    , EVENT   = cs.EVENT
    , REPLY   = cs.REPLY
    , MODE    = cs.MODE

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

    it( "should have a factory function supporting convenient signatures", function() {
      o.message( COMMAND.LIST ).should.be.an.instanceof( o.Message )
      o.message( COMMAND.JOIN, [ "#jquery" ] )
        .should.be.an.instanceof( o.Message )
      o.message( COMMAND.PRIVMSG, [ "#jquery", ": Hey" ] )
        .should.be.an.instanceof( o.Message )
      o.message( o.person( "lol" ), COMMAND.PRIVMSG, [ "#jquery", ": Hey" ] )
        .should.be.an.instanceof( o.Message )
    })

    it( "should throw an error if factory function has no suitable signature", function() {
      o.message.bind( null, 1, 2, 3, 4 ).should.throw( /signature/ )
      o.message.bind( null ).should.throw( /signature/ )
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
        const chan  = o.channel( "#haskell" ).with( this )
            , topic = "A monad is just a monoid in the category of endofunctors, what's the problem?"
        chan.setTopic( topic )
        this._internal.socket.output[0].should.equal( f( "TOPIC %s :%s\r\n", chan, topic ) )
      })

      bit( "should keep its topic updated", function() {
        const chan  = this.channels.add( "#topicsoflove" )
            , topic = "We ♥ topics"
        this._internal.socket.emit( "data", f( ":topic@setter.com TOPIC %s :%s\r\n", chan, topic ) )
        chan.topic.should.equal( topic )
      })
      //:leguin.freenode.net 333 basic-irc-js-bot #nlogax basic-irc-js-bot!~irc-js@c-89-160-40-86.cust.bredband2.com 1332238371
    })

    describe( "mode", function() {
      bit( "should record the channel mode", function() {
        const chan = o.channel( "#modez" )
        this.channels.add( chan )
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
        chan.setMode( MODE.CHANNEL.INVITE | MODE.CHANNEL.TOPIC )
        this._internal.socket.output[0].should.equal( f( "MODE %s %s\r\n", chan, mode ) )
        this._internal.socket.emit( "data", f( ":lol@omg.com MODE %s %s\r\n", chan, mode ) )
        chan.mode.should.equal( MODE.CHANNEL.INVITE | MODE.CHANNEL.TOPIC )
      })

      bit( "should set the channel mode from a string", function() {
        const chan = this.channels.add( "#modez" )
            , mode = "+it"
        chan.setMode( "+it" )
        this._internal.socket.output[0].should.equal( f( "MODE %s %s\r\n", chan, mode ) )
        this._internal.socket.emit( "data", f( ":lol@omg.com MODE %s %s\r\n", chan, mode ) )
        chan.mode.should.equal( MODE.CHANNEL.INVITE | MODE.CHANNEL.TOPIC )
      })
    })

    describe( "invite", function() {
      bit( "should invite people by name", function() {
        const chan = o.channel( "#awesome" ).with( this )
            , user = "gf3"
        chan.invite( user )
        this._internal.socket.output[0].should.equal( f( "INVITE %s %s\r\n", chan, user ) )
      })

      bit( "should invite Person objects", function() {
        const chan = o.channel( "#awesome" ).with( this )
            , user = o.person( "gf3", "lol", "omg" )
        chan.invite( user )
        this._internal.socket.output[0].should.equal( f( "INVITE %s %s\r\n", chan, user.nick ) )
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

    it( "should have a factory function supporting convenient signatures", function() {
      o.channel( "lol" ).should.be.an.instanceof( o.Channel )
    })

    it( "should throw an error if factory function has no suitable signature", function() {
      o.channel.bind( null ).should.throw( /signature/ )
    })
  })

  describe( "Person", function() {
    it( "should serialize into its nick, user and host", function() {
      const p = o.person( "anick", "auser", "ahost" )
      p.toString().should.equal( "anick!auser@ahost" )
      p.user = null
      p.toString().should.equal( "anick@ahost" )
      p.host = null
      p.toString().should.equal( "anick" )
    })

    bit( "should get kicked from a channel", function() {
      const prsn = o.person( "ada", "u", "h" ).with( this )
          , chan = o.channel( "#elitists" )
      prsn.kickFrom( chan )
      this._internal.socket.output[0].should.equal( f( "KICK %s %s\r\n", chan, prsn.nick ) )

      prsn.kickFrom( "#elitists" )
      this._internal.socket.output[0].should.equal( f( "KICK %s %s\r\n", chan, prsn.nick ) )
    })

    bit( "should get invited to a channel", function() {
      const prsn = o.person( "gf3", "eh", "canada" ).with( this )
          , chan = o.channel( "#america" )
      prsn.inviteTo( chan )
      this._internal.socket.output[0].should.equal( f( "INVITE %s %s\r\n", chan, prsn.nick ) )

      prsn.inviteTo( "#america" )
      this._internal.socket.output[0].should.equal( f( "INVITE %s %s\r\n", chan, prsn.nick ) )
    })

    describe( "notify", function() {
      bit( "should get notified", function() {
        const person = o.person( "gf3" ).with( this )
            , notice = "Important announcement"
        person.notify( notice )
        this._internal.socket.output[0].should.equal( f( "NOTICE %s :%s\r\n", person, notice ) )
      })
    })

    it( "should have a factory function supporting convenient signatures", function() {
      o.person( "lol" ).should.be.an.instanceof( o.Person )
      o.person( "lol", "omg" ).should.be.an.instanceof( o.Person )
      o.person( "lol", "omg", "wtf" ).should.be.an.instanceof( o.Person )
    })

    it( "should throw an error if factory function has no suitable signature", function() {
      o.person.bind( null ).should.throw( /signature/ )
      o.person.bind( null, 1, 2, 3, 4 ).should.throw( /signature/ )
    })
  })
})

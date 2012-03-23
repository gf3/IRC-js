const f       = require( "util" ).format
    , path    = require( "path" )
    , fs      = require( "fs" )
    , should  = require( "should" )
    , libPath = path.join( __dirname, "..", "..", "lib" )
    , help    = require( path.join( __dirname, "..", "helpers" ) )
    , o       = require( path.join( libPath, "objects" ) )
    , cs      = require( path.join( libPath, "constants" ) )
    , bit     = help.bit
    , conf    = help.conf
    , COMMAND = cs.COMMAND
    , EVENT   = cs.EVENT
    , REPLY   = cs.REPLY
    , MODE    = cs.MODE

// Make sure config files are up to date
const defaultConf = JSON.parse( fs.readFileSync( path.join( libPath, "config.json" ) ) )
    , testingConf = JSON.parse( fs.readFileSync( path.join( __dirname, "config.json" ) ) )
    , exampleConf = JSON.parse( fs.readFileSync( path.join( __dirname, "..", "..", "examples", "basic", "config.json" ) ) )
    , noComments  = function( k ) { return k !== "//" } // :)

describe( "config", function() {
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

describe( "IRC", function() {
  describe( "send", function() {
    bit( "should append \"\\r\\n\" if not present", function() {
      this.send( o.message( COMMAND.PRIVMSG, [ "#nou", "NO U" ] ) )
      this._internal.socket.output[0].should.equal( "PRIVMSG #nou NO U\r\n" )
    })

    bit( "should truncate messages to 512 chars (including \"\\r\\n\")", function() {
      const longAssString = f( ":%s", Array( 567 ).join( "*" ) )
      this.send( o.message( COMMAND.PRIVMSG, [ "#longassstrings", longAssString ] ) )
      this._internal.socket.output[0].length.should.equal( 512 )
    })
  })

  describe( "connect", function() {
    // Pass is set in spec/lib/config.json
    bit( "should send the server password, if provided, on connect", function() {
      this._internal.socket.output[2].should.equal( f( "PASS %s\r\n", conf.user.password ) )
    })
    // Modes set in config
    bit( "should send user information with correct modes", function() {
      this._internal.socket.output[0]
          .should.equal( f( "USER %s 12 * :%s\r\n", conf.user.username, conf.user.realname ) )
    })
  })

  describe( "nick", function() {
    return // @todo fix
    bit( "should change the nickname", function() {
      // No prev nick
      this.nick( "pewpew" )
      this._internal.socket.output[0].should.equal( "NICK pewpew\r\n" )
      // Prev nick
      // @todo {jonas} Ask gf3 about this, can't find anything about it in the RFC
      //this._internal.nick = "pewpew"
      //this.nick( "wepwep" )
      //this._internal.socket.output[0].should.equal( ":" + this._internal.nick + " NICK wepwep\r\n" )
    })
  })

  describe( "quit", function() {
    bit( "should quit without a message", function() {
      this.quit()
      this._internal.socket.output[0].should.equal( "QUIT\r\n" )
    })

    bit( "should quit with a message", function() {
      this.quit( "LOL BAI" )
      this._internal.socket.output[0].should.equal( "QUIT :LOL BAI\r\n" )
    })

    bit( "should disconnect and end the socket", function() {
      this.quit()
      this._internal.socket.mockEnded.should.be.ok
    })
  })

  describe( "setMode", function() {
    bit( "should set various modes on the current user", function() {
      this.config.nick = "pewpew"
      this.setMode( "-o" )
      this._internal.socket.output[0].should.equal( f( "MODE %s -o\r\n", this.config.nick ) )
    })
  })

  describe( "list", function() {
    it( "should get the information for a given channel" )

    it( "should get the information for all channels on a server" )
  })

  describe( "version", function() {
    return
    bit( "should query the server for version information", function( done ) {
      this.version( function( v ) {
        v[0].should.equal( "one" )
        v[1].should.equal( "two" )
        v[2].should.equal( ":longer message" )
        done()
      })

      this._internal.socket.output[0].should.equal( "VERSION\r\n" )
      this._internal.socket.emit( 'data', ':the.server.com 351 js-irc one two :longer message\r\n' )
    })
  })

  describe( "send", function() {
    bit( "should send Message objects", function() {
      this.channels.add( "#asl" ).say( "hey sup everyone?" )
      this._internal.socket.output[0].should.equal( "PRIVMSG #asl :hey sup everyone?\r\n" )

      this.send( o.message( COMMAND.PRIVMSG, [ "#asl", ":Sending stuff" ] ) )
      this._internal.socket.output[0].should.equal( "PRIVMSG #asl :Sending stuff\r\n" )
    })

    // TODO reimplement
    bit( "should split long messages into multiple messages", function() {
      return
      const msg = new Array( 1200 ).join( "x" )
          , before = this._internal.socket.output.length
      this.send( o.message( COMMAND.PRIVMSG, [ "#asl", f( ":%s", msg ) ] ) )
      this._internal.socket.output.length.should.equal( before + 3 )
    })
  })

  describe( "channels", function() {
    bit( "should let you add channels by name", function() {
      this.channels.add( "#midi" )
      this.channels.contains( "#midi" ).should.equal( true )
    })

    bit( "should let you add Channel objects", function() {
      const chan = new o.Channel( "#midi" )
      this.channels.add( chan )
      this.channels.contains( "#midi" ).should.equal( true )
      this.channels.get( "#midi" ).should.equal( chan )
      this.channels.get( chan ).should.equal( chan )
      this.channels.get( chan ).name.should.equal( chan.name )
    })

    bit( "should add people to its list of users", function() {
      const chan = this.channels.add( "#midi" )
      this._internal.socket.emit( "data", ":protobot!~protobot@lol.com JOIN #midi\r\n" )
      should.exist( chan.people.get( "protobot" ) )
      chan.people.get( "protobot" ).should.be.an.instanceof( o.Person )
    })

    bit( "should remove people from its list of users", function() {
      const chan = this.channels.add( "#midi" )
      // Hit and run lol
      this._internal.socket.emit( "data", ":protobot!~protobot@rogers.com JOIN #midi\r\n" )
      this._internal.socket.emit( "data", ":protobot!~protobot@rogers.com PART #midi\r\n" )
      should.not.exist( this.channels.get( "#midi" ).people.get( "protobot" ) )
    })

    bit( "should create only one Person instance per user", function() {
      this.channels.add( "#hiphop" )
      this.channels.add( "#gardening" )
      this._internal.socket.emit( "data", ":akahn!~ak@ahn.com JOIN #hiphop\r\n" )
      this._internal.socket.emit( "data", ":akahn!~ak@ahn.com JOIN #gardening\r\n" )
      this.channels.get( "#gardening" ).people.get( "akahn" )
          .should.equal( this.channels.get( "#hiphop" ).people.get( "akahn" ) )
      this.channels.get( "#hiphop" ).people.get( "akahn" ).should.equal( this._people["akahn"] )
    })
  })

  bit( f( "should emit all events as a `%s` event with message as first parameter", EVENT.ANY ), function( done ) {
    this.listenOnce( EVENT.ANY, function( msg ) {
      msg.command.should.equal( COMMAND.PRIVMSG )
      done() 
    })

    this._internal.socket.emit( "data", ":gf3!n=gianni@pdpc/supporter/active/gf3 PRIVMSG #runlevel6 :NO U LOL\r\n")
  })
})

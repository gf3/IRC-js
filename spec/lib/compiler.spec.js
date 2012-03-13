const fs       = require( "fs" )
    , path     = require( "path" )
    , format   = require( "util" ).format
    , libPath  = path.join( __dirname , "..", "..", "lib" )
    , fixtPath = path.join( __dirname, "..", "fixtures" )
    , models   = require( path.join( libPath, "models" ) )
    , compiler = require( path.join( libPath, "compiler" ) )
    , MODE     = require( path.join( libPath, "constants" ) ).MODE


// Fixtures
const goodMessages = JSON.parse( fs.readFileSync( path.join( fixtPath, "messages_good.json" ), "utf8" ) )
    , badMessages  = JSON.parse( fs.readFileSync( path.join( fixtPath, "messages_bad.json" ), "utf8" ) )

// Tests
describe( "compiler", function() {
  describe( "compileMessage", function() {
    it( "should parse Freenode cloaks", function() {
      const m = compiler.compileMessage( ":frigg!~eir@freenode/utility-bot/frigg PRIVMSG protobot :VERSION\r\n" )
      m.prefix.host.should.equal( "freenode/utility-bot/frigg" )
    })

    it( "should parse server messages", function() {
      const m = compiler.compileMessage( ":brown.freenode.net 333 js-irc #runlevel6 gf3 1252481170=\r\n" )
      m.prefix.name.should.equal( "brown.freenode.net" )
    })

    it( "should parse asterisks in server names", function() {
      const m = compiler.compileMessage( ":*.quakenet.org MODE #altdeath +v Typone\r\n" )
      m.prefix.name.should.equal( "*.quakenet.org" )
    })

    it( "should parse server messages with no periods", function() {
      const m = compiler.compileMessage( ":localhost 333 js-irc #runlevel6 gf3 1252481170=\r\n" )
      m.prefix.name.should.equal( "localhost" )
    })

    it( "should parse nicks with backticks", function() {
      const m = compiler.compileMessage( ":nick`!u@h JOIN :#chan\r\n" )
      m.prefix.nick.should.equal( "nick`" )
    })

    it( "should parse nicks with slashes", function() {
      const m = compiler.compileMessage( ":ni\\ck!u@h JOIN :#chan\r\n" )
      m.prefix.nick.should.equal( "ni\\ck" )
    })

    it( "should parse nicks with slashes and backticks", function() {
      const m = compiler.compileMessage( ":davglass\\test`!~davglass@173-27-206-95.client.mchsi.com JOIN :#yui\r\n" )
      m.prefix.nick.should.equal( "davglass\\test`" )
    })

    it( "should parse users with slashes and carets", function() {
      const m = compiler.compileMessage( ":peol!~andree_^\\@h55eb1e56.selukra.dyn.perspektivbredband.net JOIN :#jquery\r\n" )
      m.prefix.user.should.equal( "~andree_^\\" )
    })

    it( "should parse users with backticks", function() {
      const m = compiler.compileMessage( ":luke`!~luke`@117.192.231.56 QUIT :Quit: luke`\r\n" )
      m.prefix.user.should.equal( "~luke`" )
    })

    it( "should parse multiple middle params properly", function() {
      const m = compiler.compileMessage( ":irc.server 353 nick = #chan :nick nick2\r\n" )
      m.params[0].should.equal( "nick" )
      m.params[1].should.equal( "=" )
      m.params[2].should.equal( "#chan" )
    })

    it( "should parse empty trailing parameters", function() {
      const m = compiler.compileMessage( ":vitor-br!vitor-p.c@189.105.71.49 QUIT :\r\n" )
      ":".should.equal( m.params[0] )
    })

    // Test the Message model
    it( "should return a Message object", function() {
      const m = compiler.compileMessage( ":brown.freenode.net 333 js-irc #runlevel6 gf3 1252481170=\r\n" )
      m.constructor.should.equal( models.Message )
    })

    it( "should have a prefix property of the correct type for a server", function() {
      const m = compiler.compileMessage( ":brown.freenode.net 333 js-irc #runlevel6 gf3 1252481170=\r\n" )
      m.prefix.constructor.should.equal( models.Server )
    })

    it( "should have a prefix property of the correct type for a person", function() {
      const m = compiler.compileMessage( ":gf3!n=gianni@pdpc/supporter/active/gf3 PRIVMSG #runlevel6 :oh hai\r\n" )
      m.prefix.constructor.should.equal( models.Person )
    })

    // Expected to succeed
    goodMessages.forEach( function( message, idx ) {
      it( format( "should successfully compile message #%d: \"%s\""
                , idx, message.slice( 0, -2 ) ), function() {
          compiler.compileMessage( message ).should.be.ok
      })
    })

    // Expected to fail
    badMessages.forEach( function( message, idx ) {
      it( format( "should throw an error on bad message #%d: \"%s\""
                , idx, message.slice( 0, -2 ) ), function() {
        // TODO throw more specific errors, though it is uncommon JS
        ( function() { return compiler.compileMessage( message ) } ).should.throw(/parse failed/)
      })
    })

    // Test if String to Message back to String is correct
    goodMessages.forEach( function( message, idx ) {
      it( format( "should serialize message #%d into an identical string: \"%s\""
                , idx, message.slice( 0, -2 ) ), function() {
          compiler.compileMessage( message ).toString().should.equal( message )
          // Sanity check :)
          // compiler.compileMessage( compiler.compileMessage( message ).toString() ).should.be.ok
      })
    })
  })

  describe( "compileMode", function() {
    Object.keys( MODE.CHAR.CHANNEL )
        .filter( function( m ) { return /[a-z]/i.test( m ) } )
        .forEach( function( m ) {
      it( format( "should parse channel mode +%s", m ), function() {
        const res = compiler.compileMode( format( "+%s", m ), true )
            , bit = MODE.CHAR.CHANNEL[m]
        res.should.be.ok
        res[0].should.equal( true )
        res[1] & bit .should.equal( bit )
      })

      it( format( "should parse channel mode -%s", m ), function() {
        const res = compiler.compileMode( format( "-%s", m ), true )
            , bit = MODE.CHAR.CHANNEL[m]
        res.should.be.ok
        res[0].should.equal( false )
        res[1] & bit .should.equal( bit )
      })
    })

    Object.keys( MODE.CHAR.USER )
        .filter( function( m ) { return /[a-z]/i.test( m ) } )
        .forEach( function( m ) {
      it( format( "should parse user mode +%s", m ), function() {
        const res = compiler.compileMode( format( "+%s", m ) )
            , bit = MODE.CHAR.USER[m]
        res.should.be.ok
        res[0].should.equal( true )
        res[1] & bit .should.equal( bit )
      })

      it( format( "should parse user mode -%s", m ), function() {
        const res = compiler.compileMode( format( "-%s", m ) )
            , bit = MODE.CHAR.USER[m]
        res.should.be.ok
        res[0].should.equal( false )
        res[1] & bit .should.equal( bit )
      })
    })
  })
})

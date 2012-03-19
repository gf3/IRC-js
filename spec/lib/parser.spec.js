const fs       = require( "fs" )
    , path     = require( "path" )
    , format   = require( "util" ).format
    , should   = require( "should" )
    , libPath  = path.join( __dirname , "..", "..", "lib" )
    , fixtPath = path.join( __dirname, "..", "fixtures" )
    , objects  = require( path.join( libPath, "objects" ) )
    , parser   = require( path.join( libPath, "parser" ) )
    , MODE     = require( path.join( libPath, "constants" ) ).MODE


// Fixtures
const readFixture = function( fileName ) {
  return JSON.parse( fs.readFileSync( path.join( fixtPath, fileName ), "utf8" ) )
}

const messages = readFixture( "messages.json" )
    , modes    = readFixture( "modes.json" )
    , prefixes = readFixture( "prefixes.json" )
    , channels = readFixture( "channels.json" )

// Tests
describe( "parser", function() {
  describe( "message", function() {
    it( "should parse Freenode cloaks", function() {
      const m = parser.message( ":frigg!~eir@freenode/utility-bot/frigg PRIVMSG protobot :VERSION\r\n" )
      m.prefix.host.should.equal( "freenode/utility-bot/frigg" )
    })

    it( "should parse server messages", function() {
      const m = parser.message( ":brown.freenode.net 333 js-irc #runlevel6 gf3 1252481170=\r\n" )
      m.prefix.name.should.equal( "brown.freenode.net" )
    })

    it( "should parse asterisks in server names", function() {
      const m = parser.message( ":*.quakenet.org MODE #altdeath +v Typone\r\n" )
      m.prefix.name.should.equal( "*.quakenet.org" )
    })

    it( "should parse server messages with no periods", function() {
      const m = parser.message( ":localhost 333 js-irc #runlevel6 gf3 1252481170=\r\n" )
      m.prefix.name.should.equal( "localhost" )
    })

    it( "should parse nicks with backticks", function() {
      const m = parser.message( ":nick`!u@h JOIN :#chan\r\n" )
      m.prefix.nick.should.equal( "nick`" )
    })

    it( "should parse nicks with slashes", function() {
      const m = parser.message( ":ni\\ck!u@h JOIN :#chan\r\n" )
      m.prefix.nick.should.equal( "ni\\ck" )
    })

    it( "should parse nicks with slashes and backticks", function() {
      const m = parser.message( ":davglass\\test`!~davglass@173-27-206-95.client.mchsi.com JOIN :#yui\r\n" )
      m.prefix.nick.should.equal( "davglass\\test`" )
    })

    it( "should parse users with slashes and carets", function() {
      const m = parser.message( ":peol!~andree_^\\@h55eb1e56.selukra.dyn.perspektivbredband.net JOIN :#jquery\r\n" )
      m.prefix.user.should.equal( "~andree_^\\" )
    })

    it( "should parse users with backticks", function() {
      const m = parser.message( ":luke`!~luke`@117.192.231.56 QUIT :Quit: luke`\r\n" )
      m.prefix.user.should.equal( "~luke`" )
    })

    it( "should parse multiple middle params properly", function() {
      const m = parser.message( ":irc.server 353 nick = #chan :nick nick2\r\n" )
      m.params[0].should.equal( "nick" )
      m.params[1].should.equal( "=" )
      m.params[2].should.equal( "#chan" )
    })

    it( "should parse empty trailing parameters", function() {
      const m = parser.message( ":vitor-br!vitor-p.c@189.105.71.49 QUIT :\r\n" )
      ":".should.equal( m.params[0] )
    })

    // Test the Message model
    it( "should return a Message object", function() {
      const m = parser.message( ":brown.freenode.net 333 js-irc #runlevel6 gf3 1252481170=\r\n" )
      m.constructor.should.equal( objects.Message )
    })

    it( "should have a prefix property of the correct type for a server", function() {
      const m = parser.message( ":brown.freenode.net 333 js-irc #runlevel6 gf3 1252481170=\r\n" )
      m.prefix.constructor.should.equal( objects.Server )
    })

    it( "should have a prefix property of the correct type for a person", function() {
      const m = parser.message( ":gf3!n=gianni@pdpc/supporter/active/gf3 PRIVMSG #runlevel6 :oh hai\r\n" )
      m.prefix.constructor.should.equal( objects.Person )
    })

    // Expected to succeed
    it( "should successfully parse all good messages", function() {
      messages.good.forEach( function( msg, ix ) {
        parser.message( msg, true ).should.be.ok
      })
    })

    // Expected to fail
    it( "should throw an error on bad messages", function() {
      messages.bad.forEach( function( msg, ix ) {
        parser.message.bind( null, msg, true ).should.throw( /parse/i )
      })
    })

    // Test if string to Message back to string is correct
    it( "should serialize message objects back into identical strings", function() {
      messages.good.forEach( function( msg, ix ) {
        const msg_ = msg.slice( 0, -2 )
        parser.message( msg ).toString().should.equal( msg_ )
        // Sanity check :)
        // parser.message( parser.message( msg ).toString() + "\r\n" ).should.be.ok
      })
    })
  })
  describe( "mode", function() {
    it( "should handle the same mode being set and unset at the same time", function() {
      parser.mode( "+o-o" ).should.eql( [ MODE.CHAR.CHANNEL['o'], MODE.CHAR.CHANNEL['o'] ] )
      parser.mode( "+it-i").should.eql( [ MODE.CHAR.CHANNEL['i'] | MODE.CHAR.CHANNEL['t'], MODE.CHAR.CHANNEL['i'] ] )
    })

    it( "should parse channel modes into bitmasks", function() {
      modes.channel.good.forEach( function( mode, idx ) {
        const res = parser.mode( mode, MODE.CHAR.CHANNEL )
            , chr = mode[1]
            , bit = MODE.CHAR.CHANNEL[chr]
        res[mode[0] === "+" ? 0 : 1] & bit .should.equal( bit )
      })
      modes.channel.bad.forEach( function( mode, idx ) {
        const res = parser.mode( mode, MODE.CHAR.CHANNEL )
        should.equal( res[0], 0 )
      })
    })

    it( "should parse user modes", function() {
      modes.user.good.forEach( function( mode, idx ) {
        const res = parser.mode( mode, MODE.CHAR.USER )
            , chr = mode[1]
            , bit = MODE.CHAR.USER[chr]
        res[mode[0] === "+" ? 0 : 1] & bit .should.equal( bit )
      })
    })
  })

  describe( "prefix", function() {
    it( "should parse stand-alone prefixes", function() {
      prefixes.good.forEach( function( prefix, ix ) {
        const res = parser.prefix( prefix )
        res.should.be.ok
      })
    })
  })

  describe( "channel", function() {
    it( "should parse good channel names", function() {
      channels.good.forEach( function( chan, ix ) {
        const res = parser.channel( chan, true )
        res.should.be.an.instanceof( objects.Channel )
      })
    })

    it( "should throw error on bad channel names", function() {
      channels.bad.forEach( function( chan, ix ) {
        parser.channel.bind( null, chan, true ).should.throw( /parse/i )
      })
    })
  })
})

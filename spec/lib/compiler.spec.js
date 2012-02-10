var fs = require( 'fs' )
  , path = require( 'path' )
  , Compiler
  , messages

Compiler = require( path.join( __dirname, '..', '..', 'lib', 'compiler' ) )

/* ------------------------------ Fixtures ------------------------------ */
messages = JSON.parse( fs.readFileSync( path.join( __dirname, '..', 'fixtures', 'messages.json' ) ).toString() )

/* ------------------------------ Tests ------------------------------ */
describe( 'Compiler', function() {
  describe( '.compile', function() {
    it( 'should parse Freenode cloaks', function() { var m
      m = Compiler.compile( ':frigg!~eir@freenode/utility-bot/frigg PRIVMSG protobot :VERSION\r\n' )
      'freenode/utility-bot/frigg'.should.equal( m.person.host )
    })

    it( 'should parse server messages', function() { var m
      m = Compiler.compile( ':brown.freenode.net 333 js-irc #runlevel6 gf3 1252481170=\r\n' )
      'brown.freenode.net'.should.equal( m.server )
    })

    it( 'should parse asterisks in server names', function() { var m
      m = Compiler.compile( ':*.quakenet.org MODE #altdeath +v Typone\r\n' )
      '*.quakenet.org'.should.equal( m.server )
    })

    it( 'should parse server messages with no periods', function() { var m
      m = Compiler.compile( ':localhost 333 js-irc #runlevel6 gf3 1252481170=\r\n' )
      'localhost'.should.equal( m.server )
    })

    it( 'should parse nicks with backticks', function() { var m
      m = Compiler.compile( ':nick`!u@h JOIN :#chan\r\n' )
      'nick`'.should.equal( m.person.nick )
    })

    it( 'should parse nicks with slashes', function() { var m
      m = Compiler.compile( ':ni\\ck!u@h JOIN :#chan\r\n' )
      'ni\\ck'.should.equal( m.person.nick )
    })

    it( 'should parse nicks with slashes and backticks', function() { var m
      m = Compiler.compile( ':davglass\\test`!~davglass@173-27-206-95.client.mchsi.com JOIN :#yui\r\n' )
      'davglass\\test`'.should.equal( m.person.nick )
    })

    it( 'should parse users with slashes and carets', function() { var m
      m = Compiler.compile( ':peol!~andree_^\\@h55eb1e56.selukra.dyn.perspektivbredband.net JOIN :#jquery\r\n' )
      '~andree_^\\'.should.equal( m.person.user )
    })

    it( 'should parse users with backticks', function() { var m
      m = Compiler.compile( ':luke`!~luke`@117.192.231.56 QUIT :Quit: luke`\r\n' )
      '~luke`'.should.equal( m.person.user )
    })

    it( 'should parse multiple middle params properly', function() { var m
      m = Compiler.compile( ':irc.server 353 nick = #chan :nick nick2\r\n' )
      'nick'.should.equal( m.params[0] )
      '='.should.equal( m.params[1] )
      '#chan'.should.equal( m.params[2] )
    })

    it( 'should parse empty trailing parameters', function() { var m
      m = Compiler.compile( ':vitor-br!vitor-p.c@189.105.71.49 QUIT :\r\n' )
      ''.should.equal( m.params[0] )
    })

    /* ------------------------------ Only Test Successful Compilation ------------------------------ */
    messages.forEach( function( message, idx ) {
      it( 'should successfully compile message #' + idx + ': "' + message.slice( 0, -2 ) + '"', function() {
        Compiler.compile( message ).should.be.ok
      })
    })
  })
})



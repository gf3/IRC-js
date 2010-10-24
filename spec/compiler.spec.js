var fs = require( 'fs' )
  , path = require( 'path' )
  , Compiler = require( path.join( __dirname, '..', 'lib', 'compiler' ) )
  , messages

/* ------------------------------ Fixtures ------------------------------ */
messages = JSON.parse( fs.readFileSync( path.join( __dirname, 'messages.json' ) ).toString() )

/* ------------------------------ Tests ------------------------------ */
exports[ 'Can parse Freenode cloaks' ] = function( test ) { var m
  m = Compiler.compile( ':frigg!~eir@freenode/utility-bot/frigg PRIVMSG protobot :VERSION\r\n' )
  test.equal( 'freenode/utility-bot/frigg', m.person.host )
  test.finish()
}

exports[ 'Can parse server messages' ] = function( test ) { var m
  m = Compiler.compile( ':brown.freenode.net 333 js-irc #runlevel6 gf3 1252481170=\r\n' )
  test.equal( 'brown.freenode.net', m.server )
  test.finish()
}

exports[ 'Can parse server messages with no periods' ] = function( test ) { var m
  m = Compiler.compile( ':localhost 333 js-irc #runlevel6 gf3 1252481170=\r\n' )
  test.equal( 'localhost', m.server )
  test.finish()
}

exports[ 'Can parse nicks with backticks' ] = function( test ) { var m
  m = Compiler.compile( ':nick`!u@h JOIN :#chan\r\n' )
  test.equal( 'nick`', m.person.nick )
  test.finish()
}

/* ------------------------------ Only Test Successful Compilation ------------------------------ */
messages.forEach( function( message, idx ) {
  exports[ 'Message compilation #' + idx + ': "' + message.slice( 0, -2 ) + '"' ] = function( test ) {
    test.ok( Compiler.compile( message ) )
    test.finish()
  }
})

/* ------------------------------ Run ------------------------------ */
if ( module == require.main )
  require( 'async_testing' ).run( __filename, process.ARGV )



var fs = require( 'fs' )
  , path = require( 'path' )
  , Compiler
  , messages

require.paths.unshift( path.join( __dirname, '..', 'node_modules' ) )
require.paths.unshift( path.join( __dirname, '..', 'lib' ) )

Compiler = require( path.join( __dirname, '..', 'lib', 'compiler' ) )

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

exports[ 'Can parse asterisks in server names' ] = function( test ) { var m
  m = Compiler.compile( ':*.quakenet.org MODE #altdeath +v Typone\r\n' )
  test.equal( '*.quakenet.org', m.server )
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

exports[ 'Can parse nicks with slashes' ] = function( test ) { var m
  m = Compiler.compile( ':ni\\ck!u@h JOIN :#chan\r\n' )
  test.equal( 'ni\\ck', m.person.nick )
  test.finish()
}

exports[ 'Can parse nicks with slashes and backticks' ] = function( test ) { var m
  m = Compiler.compile( ':davglass\\test`!~davglass@173-27-206-95.client.mchsi.com JOIN :#yui\r\n' )
  test.equal( 'davglass\\test`', m.person.nick )
  test.finish()
}

exports[ 'Can parse users with slashes and carets' ] = function( test ) { var m
  m = Compiler.compile( ':peol!~andree_^\\@h55eb1e56.selukra.dyn.perspektivbredband.net JOIN :#jquery\r\n' )
  test.equal( '~andree_^\\', m.person.user )
  test.finish()
}

exports[ 'Can parse users with backticks' ] = function( test ) { var m
  m = Compiler.compile( ':luke`!~luke`@117.192.231.56 QUIT :Quit: luke`\r\n' )
  test.equal( '~luke`', m.person.user )
  test.finish()
}

exports[ 'Can parse users with pipe' ] = function( test ) { var m
  m = Compiler.compile( ':|RicharD|!~|RicharD|@93-41-181-86.ip82.fastwebnet.it PRIVMSG #jquery :I want do a simple login with error\r\n' )
  test.equal( '~|RicharD|', m.person.user )
  test.finish()
}

exports[ 'Can parse multiple middle params properly' ] = function( test ) { var m
  m = Compiler.compile( ':irc.server 353 nick = #chan :nick nick2\r\n' )
  test.equal( 'nick', m.params[0] )
  test.equal( '=', m.params[1] )
  test.equal( '#chan', m.params[2] )
  test.finish()
}

exports[ 'Can parse empty trailing parameters' ] = function( test ) { var m
  m = Compiler.compile( ':vitor-br!vitor-p.c@189.105.71.49 QUIT :\r\n' )
  test.equal( '', m.params[0] )
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


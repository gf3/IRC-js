var Parser = require( 'parser' )
  , Walker = require( 'walker' )
  , Compiler = {}

/* ------------------------------ Compiler ------------------------------ */
Compiler.compile = function( input ) { var tree
  tree = Parser.parse( input )
  return Walker.walk( tree )
}

/* ------------------------------ Export ------------------------------ */
module.exports = Compiler


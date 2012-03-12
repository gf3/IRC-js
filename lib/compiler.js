const parser = require( "./parser" )
    , walker = require( "./walker" )

const compile = function( input ) {
  const tree = parser.parse( input )
  return walker.walk( tree )
}

exports.compile = compile

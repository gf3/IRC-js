// TODO DRY shit up
const messageParser = require( "./parser/message" )
    , modeParser    = require( "./parser/mode" )
    , prefixParser  = require( "./parser/prefix" )
    , walker = require( "./walker" )

const compileMessage = function( input ) {
  const tree = messageParser.parse( input )
  return walker.walkMessage( tree )
}

const compileMode = function( input ) {
  const tree = modeParser.parse( input )
  return walker.walkMode( tree )
}

const compilePrefix = function( input ) {
  const tree = prefixParser.parse( input )
  return walker.walkPrefix( tree )
}

exports.compileMessage = compileMessage
exports.compileMode    = compileMode
exports.compilePrefix  = compilePrefix

const ppgUtil = require( "PanPG/PanPG_util" )
    , models  = require( "./models" )

const rules =
  { Message:
      function( node, children ) {
        // Once we get here, there are four possible permutations:
        //  1. Command only
        //  2. Prefix and command
        //  3. Command and params
        //  4. Prefix, command and params
        // However, we always have an array of params, empty or not.
        // Then we have two possibilities:
        //  1. Command and params
        //  2. Prefix, command and params
        //  3. Profit! Sorry, no more possibilities
        const length  = children.length
            , prefix  = length === 3 ? children[ 0 ] : null
            , command = prefix === null ? children[ 0 ] : children[ 1 ]
            , params  = prefix === null ? children[ 1 ] : children[ 2 ]
        return new models.Message( prefix, command, params )
      }

  , Prefix:
      function( node, children ) { return children[ 0 ] }

  , Server:
      function( node ) {
        return new models.Server( node.text().trimRight() )
      }

  , Person:
      function( node, children ) {
        // There can never be a user without a host,
        // so that narrows the possibilities down to:
        //  1. Nick only
        //  2. Nick and host
        //  3. Nick, user and host
        // Which makes it easy to check using children.length
        const length = children.length
            , nick   = children[ 0 ]
            , user   = length === 3 ? children[ 1 ] : null
            , host   = user === null ? children [ 1 ] : children[ 2 ] || null
        return new models.Person( nick, user, host )
      }

  , Nick:
      function( node ) { return node.text().trimRight() }

  , User:
      function( node ) {
        return node.text().slice(1) // Slice away '!'
      }

  , Host:
      function( node ) {
        return node.text().slice(1) // Slice away '@'
      }

  , Command:
      function( node ) { return node.text() }

  , Params:
      function( node, children ) {
        return children // Just return the array of strings
      }

  , Middle:
      function( node ) {
        return node.text().trim() // Parameter
      }

  , Trailing:
      function( node ) {
        // We used to slice off the ":" prefix here,
        // but that makes it impossible to later assemble an identical message.
        return node.text()
      }
  }

function walk( tree ) {
  return ppgUtil.treeWalker( rules, tree )
}

function show( tree ) {
  return ppgUtil.showTree( tree )
}

exports.show = show
exports.walk = walk

const ppgUtil   = require( "PanPG/PanPG_util" )
    , models    = require( "./models" )
    , constants = require( "./constants" )
    , MODE      = constants.MODE

const prefixRules =
  { Prefix:
      /** @return {Channel|Person} */
      function( node, children ) { return children[ 0 ] }

  , Server:
      /** @return {Server} */
      function( node ) {
        return new models.Server( node.text().trimRight() )
      }

  , Person:
      /** @return {Person} */
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
      /** @return {string} */
      function( node ) { return node.text().trimRight() }

  , User:
      /** @return {string} */
      function( node ) {
        return node.text().slice( 1 ) // Slice away '!'
      }

  , Host:
      /** @return {string} */
      function( node ) {
        return node.text().slice( 1 ) // Slice away '@'
      }
}

const messageRules =
  { Message:
      /** @return {Message} */
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
      prefixRules.Prefix

  , Server:
      prefixRules.Server

  , Person:
      prefixRules.Person

  , Nick:
      prefixRules.Nick

  , User:
      prefixRules.User

  , Host:
      prefixRules.Host

  , Command:
      /** @return {string} */
      function( node ) { return node.text() }

  , Params:
      /** @return {Array.<string>} */
      function( node, children ) {
        return children // Just return the array of strings
      }

  , Middle:
      /** @return {string} */
      function( node ) {
        return node.text().trim() // Parameter
      }

  , Trailing:
      /** @return {string} */
      function( node ) {
        // Keep the ':' so that we can distinguish it later
        return node.text()
      }
  }

// Lame JS operators
const and = function( a, b ) { return a | b }

const makeModeRules = function( modes ) {
  const rules =
    { Mode:
        /** @return {number} Mode mask */
        function( node, children ) {
          const set = node.text().charCodeAt( 0 )
                    === 43 ? true : false
          return [ set ].concat( children.reduce( and, 0 ) )
        }
    , Flag:
        /** @return {number} Mode flag */
        function( node ) {
          return modes[ node.text() ]
        }
    }

  return rules
}

const walkChannelMode = makeModeRules( MODE.CHAR.CHANNEL )
const walkUserMode = makeModeRules( MODE.CHAR.USER )

// TODO make nice
const walkMode = function( tree, chan ) {
  return ppgUtil.treeWalker( chan ? walkChannelMode : walkUserMode, tree )
}

exports.show        = ppgUtil.showTree
exports.walkMessage = ppgUtil.treeWalker.bind( null, messageRules )
exports.walkMode    = walkMode
exports.walkPrefix  = ppgUtil.treeWalker.bind( null, prefixRules )

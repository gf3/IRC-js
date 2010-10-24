var PanPG_util = require( 'PanPG/PanPG_util' )
  , Walker = {}

/* ------------------------------ Utilities ------------------------------ */
function merge( objects ) { var obj
  obj = {}
  objects.forEach( function( o ){ var key, keys, i, length
    for (i = 0, keys = Object.keys( o ), length = keys.length; i < length; i++)
      key = keys[i], obj[key] = o[key]
  })
  return obj
}

/* ------------------------------ Rules ------------------------------ */
Walker.rules =
  { Message:  function( node, children ){ var msg = merge( children ); msg.raw = node.text(); return msg }

  , Prefix:   function( node, children ){ return children[0] }

  , Server:   function( node ){ return { server: node.text().trim() } }

  , Person:   function( node, children ){ return { person: merge( children ) } }
  , Nick:     function( node ){ return { nick: node.text().trim() } }
  , User:     function( node ){ return { user: node.text().slice(1).trim() } }
  , Host:     function( node ){ return { host: node.text().slice(1).trim() } }

  , Command:  function( node ){ return { command: node.text().toLowerCase() } }

  , Params:   function( node, children ){ return { params: children } }
  , Middle:   function( node ){ return node.text().trim() }
  , Trailing: function( node ){ return node.text().slice(1) }
  }

/* ------------------------------ Walk! ------------------------------ */
Walker.walk = function( tree ) {
  return PanPG_util.treeWalker( this.rules, tree )
}

Walker.show = function( tree ) {
  return PanPG_util.showTree( tree )
}

/* ------------------------------ Export ------------------------------ */
module.exports = Walker


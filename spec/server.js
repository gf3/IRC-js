/** @module server
 *  The idea is to test against this as if it were a standard IRC server.
 *  Still quite some code away from that.
 */
const net = require( "net" )
    , prs = require( "../lib/parser" )

const MSG = /(.+)(\r\n)?/g
    , SEP = "\r\n"

const log =
  { received: []
  , sent: []
  }

const mockServer = new net.Server( function( s ) {
  const buf = []

  s.setEncoding( "ascii" )
  mockServer.received = []
  mockServer.sent = []

  mockServer.on( "recite", function( data ) {
    if ( s.readyState !== "open" )
      return "GTFO"
    
    mockServer.sent.unshift( data )
    s.write( data )
  })

  s.on( "data", function( data ) {
    const parts = data.match( MSG )
        , out = []
    var i = 0
      , l = 0
      , msg = null
    if ( buf.length )
      parts.unshift.apply( parts, buf.splice( 0 ) )
    for ( l = parts.length ; i < l; ++i ) {
      out.push( parts[i] )
      if ( parts[i].lastIndexOf( SEP ) === parts[i].length - SEP.length ) {
        msg = out.splice( 0 ).join( "" )
        mockServer.received.unshift( msg )
        mockServer.emit( "message", msg )
      }
    }
    if ( out.length )
      buf.push.apply( buf, out )
  })

  s.on( "end", function() {
    mockServer.emit( "end" )
  })
})

mockServer.recite = function( stuff ) {
  mockServer.emit( "recite", stuff )
}

const onJoin = function( msg ) {
  const ch = prs.channel( msg.params[0] )
}

exports.server  = mockServer
exports.log     = log

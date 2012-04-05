const net = require( "net" )

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

  mockServer.recite = function( stuff ) {
    mockServer.emit( "recite", stuff )
  }

  s.on( "data", function( data ) {
    const parts = data.match( MSG )
        , out = []
    var i = 0
      , l = 0
      , msg = null
    if ( buf.length )
      parts.unshift.apply( parts, buf.splice( 0 ) )
    for ( var i = 0, l = parts.length ; i < l; ++i ) {
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

exports.server  = mockServer
exports.log     = log

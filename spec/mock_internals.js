var util = require( 'util' )
  , events = require( 'events' )
  , mockInternals
  , mockSocket

// Mock Stream
function MockSocket () {
  events.EventEmitter.call( this )
}
util.inherits( MockSocket, events.EventEmitter )

MockSocket.prototype.readyState = 'open'
MockSocket.prototype.output = []
MockSocket.prototype.write = function ( data ) { this.output.push( data ) }
MockSocket.prototype.setEncoding = function ( e ) { this.encoding = e }
MockSocket.prototype.setTimeout = function ( t ) { this.timeout = t }
MockSocket.prototype.connect = function () { console.log( 'Socket connected.' ) }
MockSocket.prototype.end = function () { console.log( 'Socket was ended.' ) }

// Mock  Internals
mockInternals = 
  { buffer: ''
  , connected: false
  , privmsg_queue: []
  , listener_cache: {}
  , single_listener_cache: {}
  , cache: {}
  , locks: {}
  , emitter: new events.EventEmitter()
  , socket: mockSocket new MockSocket()
  }

module.exports = mockInternals

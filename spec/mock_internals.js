var util = require( 'util' )
  , events = require( 'events' )

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
MockSocket.prototype.connect = function () { this.mockConnected = true }
MockSocket.prototype.end = function () { this.mockEnded = true }

// Mock  Internals
module.exports = 
  { buffer: ''
  , connected: false
  , privmsg_queue: []
  , listener_cache: {}
  , single_listener_cache: {}
  , cache: {}
  , locks: {}
  , emitter: new events.EventEmitter()
  , socket: new MockSocket()
  }


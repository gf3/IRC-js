var util = require( 'util' )
  , events = require( 'events' )
  , uid = 0
  , MockSocket

// Mock Stream
function makeMockSocket () {
  function MS () {
    events.EventEmitter.call( this )

    this.uid = uid++
    this.readyState = 'open'
    this.output = []
    this.write = function ( data ) { this.output.push( data ) }
    this.setEncoding = function ( e ) { this.encoding = e }
    this.setTimeout = function ( t ) { this.timeout = t }
    this.connect = function () { this.emit( 'connect' ); this.mockConnected = true }
    this.end = function () { this.emit( 'end' ); this.mockEnded = true }
  }

  util.inherits( MS, events.EventEmitter )

  return MS
}

MockSocket = makeMockSocket()

// Mock  Internals
function MockInternals() {
}

MockInternals.prototype =
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

MockInternals.prototype.resetNetwork = function() {
  var MS = makeMockSocket()
  this.emitter = new events.EventEmitter
  this.socket = new MS
}

module.exports = MockInternals


const util   = require( "util" )
    , events = require( "events" )

var uid = 0

// Mock Stream
function makeMockSocket() {
  function MS() {
    events.EventEmitter.call( this )

    this.uid = uid++
    this.readyState = 'open'
    this.output = []
    this.write = function( data ) { this.output.unshift( data ) }
    this.setEncoding = function( e ) { this.encoding = e }
    this.setTimeout = function( t ) { this.timeout = t }
    this.connect = function() {
      this.emit( 'connect' )
      this.mockConnected = true
    }
    this.end = function() {
      this.emit( 'end' )
      this.mockEnded = true
    }
  }

  util.inherits( MS, events.EventEmitter )

  return MS
}

const MockSocket = makeMockSocket()

// Mock internals
const MockInternals = function() {
  this.buffer = ''
  this.connected = false
  this.queue = []
  this.cache = {}
  this.locks = {}
  this.emitter = new events.EventEmitter
  this.socket = new MockSocket
}

MockInternals.prototype.resetNetwork = function() {
  const MS = makeMockSocket()
  this.emitter = new events.EventEmitter
  this.socket = new MS
}

module.exports = MockInternals

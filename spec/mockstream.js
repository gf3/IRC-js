const util   = require( "util" )
    , events = require( "events" )

var uid = 0

const MockStream = function() {
  this.readyState = "closed"
  this.mockConnected = false
  this.mockEnded = false
  this.output = []
  this.uid = uid++
}

util.inherits( MockStream, events.EventEmitter )

MockStream.prototype.connect = function( port, host, connectListener ) {
  this.readyState = "open"
  this.mockConnected = true
  this.mockEnded = false
  // Give IRC a chance to add connect listeners
  process.nextTick( this.emit.bind( this, "connect" ) )
  return this
}

MockStream.prototype.end = function( port, host, connectListener ) {
  this.readyState = "closed"
  this.mockConnected = false
  this.mockEnded = true
  this.emit( "end" )
  return this
}

MockStream.prototype.write = function( data ) {
  this.output.unshift( data )
  return this
}

MockStream.prototype.setEncoding = function( e ) {
  this.encoding = e
  return this
}

MockStream.prototype.setTimeout = function( t ) {
  this.timeout = t
  return this
}

MockStream.prototype.reset = function() {
  this.removeAllListeners()
  this.output.length = 0
}

const connect = function( port, host, connectListener ) {
  const ms = new MockStream()
  return ms.connect.apply( ms, arguments )
}

exports.MockStream    = MockStream
exports.connect       = connect

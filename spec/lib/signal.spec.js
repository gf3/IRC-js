/** @module signal.spec */

"use strict";

const path  = require("path");
const lib   = path.join(__dirname, "..", "..", "lib");
const irc   = require(path.join(lib, "irc"));
const sig   = require(path.join(lib, "signal"));

const SafeSignal  = sig.SafeSignal;
const Signal      = sig.Signal;

const COMMAND = irc.COMMAND;
const STATUS  = irc.STATUS;

describe("signal", function() {
  describe("Signal", function() {
    it("should add listeners", function(done) {
      const s = new Signal()
      s.receive(function(v) {
        done()
      });
      s.emit(null)
    });
    it("should remove listeners", function() {
      const s = new Signal()
      const stop = s.receive(function(v) { ++blips });
      var blips = 0
      s.emit("Weeee")
      blips.should.equal(1)
      stop()
      s.emit("Weeee")
      blips.should.equal(1)
    });
    it("should emit values to listeners", function(done) {
      const s = new Signal()
      const answer = 42
      s.receive(function(v) {
        v.should.equal(answer)
        done()
      });
      s.emit(answer)
    });
    it("should join two streams into a new stream", function() {
      const s1  = new Signal()
      const s2  = new Signal()
      const s3  = s1.join(s2)
          , acc = []
      s3.receive(function(v) {
        acc.push(v)
      });
      s1.emit(1)
      s1.emit(2)
      s2.emit(3)
      s2.emit(4)
      acc.should.eql([1, 2, 3, 4])
    });
    it("should emit a constant value", function() {
      const s   = new Signal()
      const val = 42
      const acc = []
      s.constant(val).receive(function(v) { acc.push(v) });
      s.emit(1)
      s.emit("LOL")
      s.emit(true)
      acc.should.eql([val, val, val])
    });
    it("should map a function over a stream, producing a new stream", function() {
      const s1  = new Signal()
      const fn  = function(v) { return v * 2 }
      const acc = []
          , s2  = s1.map(fn)
      s2.receive(acc.push.bind(acc))
      s1.emit(1)
      s1.emit(2)
      s1.emit(3)
      acc.should.eql([2, 4, 6])
    });
    it("should skip values of a stream", function() {
      const s1  = new Signal()
      const s2  = s1.skip(2)
      const acc = []
      s2.receive(acc.push.bind(acc))
      s1.emit(1)
      s1.emit(2)
      s1.emit(3)
      s1.emit(4)
      acc.should.eql([3, 4])
    });
    it("should swap streams", function() {
      var s3
      const s1  = new Signal()
      const acc = []
      const s2  = s1.swap(function(v) {
              s3 = new Signal()
              return s3
            });
      s2.receive(acc.push.bind(acc))
      s1.emit(true)
      s3.emit(Math.E)
      s3.emit(Math.PI)
      acc.should.eql([ Math.E, Math.PI ])
    });
    it("should take a specific number of values", function() {
      const s1  = new Signal()
      const s2  = s1.take(2)
      const acc = []
      s2.receive(acc.push.bind(acc))
      s1.emit(1)
      s1.emit(2)
      s1.emit(3)
      s1.emit(4)
      acc.should.eql([1, 2])
    });
    it("should take a values until another stream emits a value", function() {
      const s1  = new Signal()
      const s2  = new Signal()
      const s3  = s1.takeUntil(s2)
          , acc = []
      s3.receive(acc.push.bind(acc))
      s1.emit(1)
      s1.emit(2)
      s2.emit("BOO")
      s1.emit(4)
      acc.should.eql([1, 2])
    });
    it("should throttle a stream, queueing up values", function(done) {
      const s1  = new Signal()
      const s2  = s1.throttle(10)
      const acc = []
      s2.receive(acc.push.bind(acc))
      s1.emit(1)
      s1.emit(2)
      acc.should.eql([1])
      setTimeout(function() {
        s1.emit(3)
        s1.emit(4)
        acc.should.eql([1, 2, 3])
        done()
      }, 10)
    });
    it("should zip two streams into a stream of value pairs", function() {
      const s1  = new Signal()
      const s2  = new Signal()
      const sz  = s1.zip(s2)
          , acc = []
      sz.receive(acc.push.bind(acc))
      s1.emit(1)
      s2.emit(2)
      s1.emit(3)
      s2.emit(4)
      acc.should.eql([[1, 2], [3, 4]])
    });
    it("should remove a receiver based on status", function() {
      const s1  = new Signal()
      const rec = function(_) { return STATUS.REMOVE }
      s1.receive(rec)
      s1.emit(1)
      s1.connections.get(0).length.should.equal(0)
    });
    it("should stop emitting based on status", function() {
      const s1  = new Signal()
      const rc1 = function(_) {
              ++blips
              return STATUS.STOP
            }
          , rc2 = function(_) {
              ++blips
            }
      var blips = 0
      s1.receive(rc1)
      s1.receive(rc2)
      s1.emit(1)
      blips.should.equal(1)
    });
    it("should match an IRC message, and emit the matches", function() {
      const s1 = new Signal()
      const s2 = s1.match(/(lo+l) (om+g)/i)
      s2.receive(function(msg, lol, omg) {
        lol.should.equal("looool")
        omg.should.equal("ommmmg")
      });
      s1.emit(irc.message(COMMAND.PRIVMSG, [ "#foo", ":looool ommmmg" ]))
    });
  });
  describe("SafeSignal", function() {
    it("should catch receiver function errors", function() {
      const s1 = new SafeSignal()
      s1.receive(function(v) {
        causeError()
      });
      s1.emit("boom")
    });
  });
});

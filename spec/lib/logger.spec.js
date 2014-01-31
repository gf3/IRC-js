/** @module logger.spec */

"use strict";

path      = require("path");
should    = require("should");
lib       = path.join(__dirname, "..", "..", "lib");
logger    = require(path.join(lib, "logger"));
constants = require(path.join(lib, "constants"));
Logger    = logger.Logger;
LEVEL     = constants.LEVEL;

l = logger.get("speclog", LEVEL.ALL);

describe("logger", function() {
  describe("Logger", function() {
    describe("log", function() {
      it("should log debug messages", function() {
        l.level = LEVEL.DEBUG;
        l.log(LEVEL.DEBUG, "lol");
        logger._output[0].should.equal("lol");
        l.log(LEVEL.ERROR, "omg");
        logger._output[0].should.equal("lol");
      });

      it("should log info messages", function() {
        l.level = LEVEL.INFO;
        l.log(LEVEL.INFO, "lol");
        logger._output[0].should.equal("lol");
        l.log(LEVEL.ERROR, "omg");
        logger._output[0].should.equal("lol");
      });

      it("should log warning messages", function() {
        l.level = LEVEL.WARN;
        l.log(LEVEL.WARN, "lol");
        logger._output[0].should.equal("lol");
        l.log(LEVEL.ERROR, "omg");
        logger._output[0].should.equal("lol");
      });

      it("should log error messages", function() {
        l.level = LEVEL.ERROR;
        l.log(LEVEL.ERROR, "lol");
        logger._output[0].should.equal("lol");
        l.log(LEVEL.INFO, "omg");
        logger._output[0].should.equal("lol");
      });

      it("should mix and match log levels", function() {
        l.level = LEVEL.ERROR | LEVEL.DEBUG;
        l.log(LEVEL.ERROR, "lol");
        logger._output[0].should.equal("lol");
        l.log(LEVEL.INFO, "omg");
        logger._output[0].should.equal("lol");
        l.log(LEVEL.DEBUG, "omg");
        logger._output[0].should.equal("omg");
      });

      it("should not log anything if level is NONE", function() {
        before = logger._output.length;
        l.level = LEVEL.NONE;
        l.log(LEVEL.INFO, "lol");
        l.log(LEVEL.ALL, "omg");
        l.log(LEVEL.ERROR, "wtf");
        logger._output.length.should.equal(before);
      });

      it("should log everything if level is ALL", function() {
        input = ["lol", "omg", "wtf", "bbq"];
        l.level = LEVEL.ALL;
        l.log(LEVEL.DEBUG, input[3]);
        l.log(LEVEL.INFO,  input[2]);
        l.log(LEVEL.WARN,  input[1]);
        l.log(LEVEL.ERROR, input[0]);
        logger._output.splice(input.length);
        logger._output.should.eql(input);
      });
    });
  });

  describe("LEVEL", function() {
    describe("fromString", function() {
      it("should create a level value from a string", function() {
        var lvl = LEVEL.fromString("error");
        lvl.should.equal(LEVEL.ERROR);
        lvl = LEVEL.fromString("error (oh no!), info ? debug :)");
        lvl.should.equal(LEVEL.ERROR | LEVEL.INFO | LEVEL.DEBUG);
      });
    });
  });

  describe("get", function() {
    it("should get a logger by name if it exists", function() {
      name = "exists";
      aLog = logger.get(name, LEVEL.ALL);
      logger.get(name).should.equal(aLog);
      logger.get(name).level.should.equal(aLog.level);
    });

    it("should create a logger if it doesn't exist", function() {
      logger.get("newlog").should.be.ok;
    });
  });
});

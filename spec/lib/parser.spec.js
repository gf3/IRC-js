/** @module parser.spec */

"use strict";

fs      = require("fs");
path    = require("path");
format  = require("util").format;
should  = require("should");
lib     = path.join(__dirname , "..", "..", "lib");
help    = require(path.join(__dirname, "..", "helpers"));
irc     = require(path.join(lib, "irc"));
parser  = require(path.join(lib, "parser"));
MODE    = require(path.join(lib, "constants")).MODE;

messages = help.readFixture("messages.json");
modes    = help.readFixture("modes.json");
prefixes = help.readFixture("prefixes.json");
channels = help.readFixture("channels.json");
nicks    = help.readFixture("nicks.json");

function parse(str) {
  return parser.parse(new Buffer(str));
}

// Tests make test-parser  0.27s user 0.04s system 99% cpu 0.308 total
describe("parser", function() {
  describe("message", function() {
    it("should parse Freenode cloaks", function() {
      m = parse(":frigg!~eir@freenode/utility-bot/frigg PRIVMSG protobot :VERSION\r\n");
      m.from.host.should.equal("freenode/utility-bot/frigg");
    });

    it("should parse server messages", function() {
      m = parse(":brown.freenode.net 333 js-irc #runlevel6 gf3 1252481170=\r\n");
      m.from.name.should.equal("brown.freenode.net");
    });

    it("should parse asterisks in server names", function() {
      m = parse(":*.quakenet.org MODE #altdeath +v Typone\r\n");
      m.from.name.should.equal("*.quakenet.org");
    });

    it("should parse server messages with no periods", function() {
      m = parse(":localhost 333 js-irc #runlevel6 gf3 1252481170=\r\n");
      m.from.name.should.equal("localhost");
    });

    it("should parse nicks with backticks", function() {
      m = parse(":nick`!u@h JOIN :#chan\r\n");
      m.from.nick.should.equal("nick`");
    });

    it("should parse nicks with slashes", function() {
      m = parse(":ni\\ck!u@h JOIN :#chan\r\n");
      m.from.nick.should.equal("ni\\ck");
    });

    it("should parse nicks with slashes and backticks", function() {
      m = parse(":davglass\\test`!~davglass@173-27-206-95.client.mchsi.com JOIN :#yui\r\n");
      m.from.nick.should.equal("davglass\\test`");
    });

    it("should parse users with slashes and carets", function() {
      m = parse(":peol!~andree_^\\@h55eb1e56.selukra.dyn.perspektivbredband.net JOIN :#jquery\r\n");
      m.from.user.should.equal("~andree_^\\");
    });

    it("should parse users with backticks", function() {
      m = parse(":luke`!~luke`@117.192.231.56 QUIT :Quit: luke`\r\n");
      m.from.user.should.equal("~luke`");
    });

    it("should parse multiple middle params properly", function() {
      m = parse(":irc.server 353 nick = #chan :nick nick2\r\n");
      m.params[0].should.equal("nick");
      m.params[1].should.equal("=");
      m.params[2].should.equal("#chan");
    });

    it("should parse empty trailing parameters", function() {
      m = parse(":vitor-br!vitor-p.c@189.105.71.49 QUIT :\r\n");
      ":".should.equal(m.params[0]);
    });

    // Test the Message model
    it("should return a Message object", function() {
      m = parse(":brown.freenode.net 333 js-irc #runlevel6 gf3 1252481170=\r\n");
      m.should.be.an.instanceof(irc.Message);
    });

    it("should have a prefix property of the correct type for a server", function() {
      m = parse(":brown.freenode.net 333 js-irc #runlevel6 gf3 1252481170=\r\n");
      m.from.should.be.an.instanceof(irc.Server);
    });

    it("should have a prefix property of the correct type for a person", function() {
      m = parse(":gf3!n=gianni@pdpc/supporter/active/gf3 PRIVMSG #runlevel6 :oh hai\r\n");
      m.from.should.be.an.instanceof(irc.Person);
    });

    // Expected to succeed
    it("should successfully parse all good/weird messages", function() {
      messages.good.forEach(function(msg, ix) {
        parse(msg).should.be.ok;
      });
      messages.weird.forEach(function(msg, ix) {
        parse(msg).should.be.ok;
      });
    });

    // Expected to fail
    it("should throw an error on bad messages", function() {
      messages.bad.forEach(function(msg, ix) {
        (function() { parse(msg); }).should.throw(/Expected/i);
      });
    });

    // Test if string to Message back to string is correct
    it("should serialize message objects back into equivalent strings", function() {
      messages.good.forEach(function(msg, ix) {
        msg_ = msg.slice(0, -2);
        parse(msg).toString().should.eql(msg_);
        parse(parse(msg).toString() + "\r\n").should.be.ok
      });
    });

    // Buffer to Message to Buffer
    it("should serialize message objects back into equivalent buffers", function() {
      bigEnoughBuff = new Buffer(9001);
      messages.good.forEach(function(msg, ix) {
        parse(msg).toBuffer(bigEnoughBuff);
        len = bigEnoughBuff.readUInt16LE(0);
        bigEnoughBuff.toString(null, 4, len).should.eql(msg);
      });
    });
  });

  describe("mode", function() {
    it("should parse channel modes", function() {
      modes.channel.good.forEach(function(mode, idx) {
        res = parser.parseMode(mode);
        sgn = mode[0];  // '+' or '-'
        chr = mode[1];
        ix  = res.get(sgn.charCodeAt(0)).indexOf(chr);
        ix.should.not.equal(-1);
      });
      modes.channel.bad.forEach(function(mode, idx) {
        (function() { parser.parseMode(mode); }).should.throw();
      });
    });

    it("should parse user modes", function() {
      modes.user.good.forEach(function(mode, idx) {
        res = parser.parseMode(mode);
        chr = mode[1];
        res.get(mode[0].charCodeAt(0)).indexOf(chr).should.not.equal(-1);
      });
    });
  });

  describe("channel", function() {
    it("should parse good channel names", function() {
      channels.good.forEach(function(chan, ix) {
        res = parser.parseChannel(chan);
        res.should.be.an.instanceof(irc.Channel);
      });
    });

    it("should throw error on bad channel names", function() {
      channels.bad.forEach(function(chan, ix) {
        (function() {
          parser.parseChannel(chan);
        }).should.throw();
      });
    });
  });
});

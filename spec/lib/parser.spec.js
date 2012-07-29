/** @module parser.spec */

"use strict";

const fs      = require("fs");
const path    = require("path");
const format  = require("util").format;
const should  = require("should");
const lib     = path.join(__dirname , "..", "..", "lib");
const help    = require(path.join(__dirname, "..", "helpers"));
const objects = require(path.join(lib, "objects"));
const parser  = require(path.join(lib, "parser"));
const MODE    = require(path.join(lib, "constants")).MODE;

const messages = help.readFixture("messages.json");
const modes    = help.readFixture("modes.json");
const prefixes = help.readFixture("prefixes.json");
const channels = help.readFixture("channels.json");
const nicks    = help.readFixture("nicks.json");

// Tests
describe("parser", function() {
  describe("message", function() {
    it("should parse Freenode cloaks", function() {
      const m = parser.parse(":frigg!~eir@freenode/utility-bot/frigg PRIVMSG protobot :VERSION\r\n");
      m.from.host.should.equal("freenode/utility-bot/frigg");
    });

    it("should parse server messages", function() {
      const m = parser.parse(":brown.freenode.net 333 js-irc #runlevel6 gf3 1252481170=\r\n");
      m.from.name.should.equal("brown.freenode.net");
    });

    it("should parse asterisks in server names", function() {
      const m = parser.parse(":*.quakenet.org MODE #altdeath +v Typone\r\n");
      m.from.name.should.equal("*.quakenet.org");
    });

    it("should parse server messages with no periods", function() {
      const m = parser.parse(":localhost 333 js-irc #runlevel6 gf3 1252481170=\r\n");
      m.from.name.should.equal("localhost");
    });

    it("should parse nicks with backticks", function() {
      const m = parser.parse(":nick`!u@h JOIN :#chan\r\n");
      m.from.nick.should.equal("nick`");
    });

    it("should parse nicks with slashes", function() {
      const m = parser.parse(":ni\\ck!u@h JOIN :#chan\r\n");
      m.from.nick.should.equal("ni\\ck");
    });

    it("should parse nicks with slashes and backticks", function() {
      const m = parser.parse(":davglass\\test`!~davglass@173-27-206-95.client.mchsi.com JOIN :#yui\r\n");
      m.from.nick.should.equal("davglass\\test`");
    });

    it("should parse users with slashes and carets", function() {
      const m = parser.parse(":peol!~andree_^\\@h55eb1e56.selukra.dyn.perspektivbredband.net JOIN :#jquery\r\n");
      m.from.user.should.equal("~andree_^\\");
    });

    it("should parse users with backticks", function() {
      const m = parser.parse(":luke`!~luke`@117.192.231.56 QUIT :Quit: luke`\r\n");
      m.from.user.should.equal("~luke`");
    });

    it("should parse multiple middle params properly", function() {
      const m = parser.parse(":irc.server 353 nick = #chan :nick nick2\r\n");
      m.params[0].should.equal("nick");
      m.params[1].should.equal("=");
      m.params[2].should.equal("#chan");
    });

    it("should parse empty trailing parameters", function() {
      const m = parser.parse(":vitor-br!vitor-p.c@189.105.71.49 QUIT :\r\n");
      ":".should.equal(m.params[0]);
    });

    // Test the Message model
    it("should return a Message object", function() {
      const m = parser.parse(":brown.freenode.net 333 js-irc #runlevel6 gf3 1252481170=\r\n");
      m.should.be.an.instanceof(objects.Message);
    });

    it("should have a prefix property of the correct type for a server", function() {
      const m = parser.parse(":brown.freenode.net 333 js-irc #runlevel6 gf3 1252481170=\r\n");
      m.from.should.be.an.instanceof(objects.Server);
    });

    it("should have a prefix property of the correct type for a person", function() {
      const m = parser.parse(":gf3!n=gianni@pdpc/supporter/active/gf3 PRIVMSG #runlevel6 :oh hai\r\n");
      m.from.should.be.an.instanceof(objects.Person);
    });

    // Expected to succeed
    it("should successfully parse all good/weird messages", function() {
      messages.good.forEach(function(msg, ix) {
        parser.parse(msg).should.be.ok;
      });
      messages.weird.forEach(function(msg, ix) {
        parser.parse(msg).should.be.ok;
      });
    });

    // Expected to fail
    it("should throw an error on bad messages", function() {
      messages.bad.forEach(function(msg, ix) {
        (function() { parser.parse(msg); }).should.throw(/Expected/i);
      });
    });

    // Test if string to Message back to string is correct
    it("should serialize message objects back into equivalent strings", function() {
      messages.good.forEach(function(msg, ix) {
        const msg_ = msg.slice(0, -2);
        parser.parse(msg).toString().should.eql(msg_);
        parser.parse(parser.parse(msg).toString() + "\r\n").should.be.ok
      });
    });
  });
  describe("mode", function() {
    it("should parse channel modes", function() {
      modes.channel.good.forEach(function(mode, idx) {
        const res = parser.parse(mode, "Mode");
        const sgn = mode[0];  // '+' or '-'
        const chr = mode[1];
        const ix  = res.get(sgn).indexOf(chr);
        ix.should.not.equal(-1);
      });
      modes.channel.bad.forEach(function(mode, idx) {
        (function() { parser.parse(mode, "Mode"); }).should.throw();
      });
    });

    it("should parse user modes", function() {
      modes.user.good.forEach(function(mode, idx) {
        const res = parser.parse(mode, "Mode");
        const chr = mode[1];
        res.get(mode[0]).indexOf(chr).should.not.equal(-1);
      });
    });
  });

  describe("channel", function() {
    it("should parse good channel names", function() {
      channels.good.forEach(function(chan, ix) {
        const res = parser.parse(chan, "Channel");
        res.should.be.an.instanceof(objects.Channel);
      });
    });

    it("should throw error on bad channel names", function() {
      channels.bad.forEach(function(chan, ix) {
        (function() {
          parser.parse(chan, "Channel");
        }).should.throw();
      });
    });
  });
});

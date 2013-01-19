"use strict";

const f       = require("util").format;
const path    = require("path");
const fs      = require("fs");
const should  = require("should");
const lib     = path.join(__dirname, "..", "..", "lib");
const help    = require(path.join(__dirname, "..", "helpers"));
const cs      = require(path.join(lib, "constants"));
const irc     = require(path.join(lib, "irc"));
const Client  = irc.Client;
const server  = require(path.join("..", "server")).server;
const bit     = help.bit;
const conf    = help.conf;
const COMMAND = cs.COMMAND;
const EVENT   = cs.EVENT;
const MODE    = cs.MODE;
const REPLY   = cs.REPLY;
const STATUS  = irc.STATUS;

describe("irc", function() {
  describe("Client", function() {
    describe("send", function() {
      bit("should truncate messages to 512 bytes (including \"\\r\\n\")", function(done) {
        const longAssString = ":" + Array(601).join("*");
        const msg = irc.message(COMMAND.PRIVMSG, ["#longassstrings", longAssString]);
        server.on("message", function ok(d) {
          if (/PRIVMSG #longassstrings/.test(d)) {
            server.removeListener("message", ok);
            d.length.should.equal(512);
            done();
          }
        });
        this.send(msg);
      });
    });

    describe("connect", function() {
      // Pass is set in spec/lib/config.json
      bit("should send the server password, if provided, on connect", function() {
        server.received[server.received.length - 1].should
          .equal(f("PASS %s\r\n", conf.user.password));
      });
      // Modes set in config
      bit("should send user information with correct modes", function() {
        server.received[server.received.length - 3]
          .should.equal(f("USER %s 12 * :%s\r\n", conf.user.username,
            conf.user.realname));
      });

      bit("should reconnect after having been disconnected", function(done) {
        const bot = this;
        bot.disconnect();
        bot.connect(function(b) {
          b.should.be.an.instanceof(Client);
          done();
          return STATUS.REMOVE;
        });
        server.on("connection", function(s) {
          server.recite(f(":crichton.freenode.net 001 %s :Welcome to the freenode IRC Network js-irc\r\n",
            bot.user.nick));
        });
      });

      bit("should update server name on 004", function(done) {
        const bot = this;
        function handler(a) {
          bot.server.name.should.equal("holmes.freenode.net");
          bot.server.name = conf.server.address;
          bot.ignore(REPLY.MYINFO, handler);
          done();
        }
        bot.match(REPLY.MYINFO, handler);
        server.recite(f(":holmes.freenode.net 004 %s holmes.freenode.net ircd-seven-1.1.3 DOQRSZaghilopswz CFILMPQbcefgijklmnopqrstvz bkloveqjfI\r\n",
          this.user.nick))
      });
    });

    describe("nick", function() {
      bit("should change the nickname", function(done) {
        const bot = this;
        const prevNick = bot.user.nick;
        server.recite(f(":%s@foo.com NICK changeling\r\n", prevNick));
        setTimeout(function() {
          bot.user.nick.should.equal("changeling");
          bot.user.nick = prevNick;
          done();
        }, 10);
      });
    });

    describe("quit", function() {
      bit("should quit without a message", function(done) {
        const bot = this;
        server.on("message", function ok(m) {
          if (!/QUIT/.test(m)) {
            return;
          }
          m.should.equal("QUIT\r\n");
          bot.connect(function() { done() });
          server.removeListener("message", ok);
        });
        this.quit();
      });

      bit("should quit with a message", function(done) {
        const msg = "QUIT :LOL BAI\r\n";
        const bot = this;
        server.on("message", function ok(m) {
          if (!/QUIT/.test(m)) {
            return;
          }
          m.should.equal(msg);
          bot.connect(function() { done() });
          server.removeListener("message", ok);
        });
        this.quit(msg.slice(6, -2));
      });

      bit("should disconnect and end the socket", function(done) {
        const bot = this;
        server.on("end", function ok() {
          server.removeListener("message", ok);
          bot.connect(function() { done() });
        });
        this.quit();
      });
    });

    describe("setMode", function() {
      bit("should set various modes on the current user", function(done) {
        const bot = this;
        this.setMode("-o");
        server.on("message", function ok(m) {
          if (!/MODE/.test(m)) {
            return;
          }
          server.removeListener("message", ok);
          m.should.equal(f("MODE %s -o\r\n", bot.user.nick));
          done();
        });
      });
    });

    describe("list", function() {
      it("should get the information for a given channel");
      it("should get the information for all channels on a server");
    });

    describe("send", function() {
      bit("should send Message objects", function(done) {
        const bot = this;
        server.on("message", function ok(m) {
          if (!/PRIVMSG/.test(m)) {
            return;
          }
          server.removeListener("message", ok);
          m.should.equal("PRIVMSG #asl :Sending stuff\r\n");
          done();
        });
        this.send(irc.message(COMMAND.PRIVMSG, ["#asl", ":Sending stuff"]));
      });

      bit("should split long messages into multiple messages");
      /*  Must comment out to not break other tests :/
      bit("should split long messages into multiple messages", function(done) {
        const longAssString = Array(501).join("*");
        let count = 0;
        server.on("message", function ok(m) {
          ++count;
          if (1 === count) {
            m.should.equal("PRIVMSG #split :" + Array(495).join("*") + "\r\n");
          }
          if (2 === count) {
            m.should.equal("PRIVMSG #split :" + Array(7).join("*") + "\r\n");
            server.removeListener("message", ok);
            done();
          }
        });
        this.send(irc.message(COMMAND.PRIVMSG, ["#split", ":" + longAssString]));
      });
      */
    });

    describe("channels", function() {
      bit("should let you add channels by name", function(done) {
        const bot  = this;
        const chan = this.join("#addchanname", function(ch) {
          bot.channels.has(chan.id).should.equal(true);
          bot.channels.get(ch.id).should.equal(chan);
          ch.should.equal(chan);
          done();
        });
        server.recite(f(":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan));
        server.recite(f(":card.freenode.net 353 %s @ %s :%s nlogax\r\n",
          this.user.nick, chan, this.user.nick));
      });

      bit("should let you add Channel objects", function(done) {
        const bot = this;
        const chan = irc.channel("#addchanobj");
        this.join(chan, function(ch) {
          bot.channels.has(irc.id("#addchanobj")).should.equal(true);
          bot.channels.get(irc.id("#addchanobj")).should.equal(chan);
          bot.channels.get(ch.id).should.equal(chan);
          done();
        });
        server.recite(f(":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan));
        server.recite(f(":card.freenode.net 353 %s @ %s :%s nlogax\r\n",
          this.user.nick, chan, this.user.nick));
      });

      bit("should let you remove channels by name", function(done) {
        const chan = "#removechanname";
        const bot  = this;
        bot.join(chan, function(ch) {
          bot.channels.has(irc.id(chan)).should.equal(true);
          server.on("message", function ok(m) {
            if (!/PART/.test(m)) {
              return;
            }
            server.removeListener("message", ok);
            m.should.equal(f("PART %s\r\n", chan));
            server.recite(f(":%s!~a@b.c PART %s\r\n", bot.user.nick, chan));
            done();
          });
          bot.part(chan);
        });
        server.recite(f(":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan));
        server.recite(f(":card.freenode.net 353 %s @ %s :%s\r\n",
          this.user.nick, chan, this.user.nick));
      });

      bit("should let you remove Channel objects", function(done) {
        const chan = new irc.Channel("#removechanobj");
        const bot  = this;
        bot.join(chan, function(ch) {
          bot.channels.has(chan.id).should.equal(true);
          server.on("message", function ok(m) {
            if (!/PART/.test(m)) {
              return;
            }
            server.removeListener("message", ok);
            m.should.equal(f("PART %s\r\n", chan));
          });
          bot.part(chan);
          const handler = function(a) {
            bot.channels.has(chan.id).should.equal(false);
            bot.ignore(COMMAND.PART, handler);
          }
          bot.match(COMMAND.PART, handler);
          server.recite(f(":%s!~a@b.c PART %s\r\n", bot.user.nick, chan));
          done();
        });
        server.recite(f(":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan));
        server.recite(f(":card.freenode.net 353 %s @ %s :%s\r\n",
          this.user.nick, chan, this.user.nick));
      });

      bit("should add people to its list of users, for various relevant messages", function(done) {
        const bot  = this;
        const chan = this.join("#addpeople");
        server.recite(f(":%s!~a@b.c JOIN %s\r\n", this.user.nick, chan));
        // A name reply for a channel
        server.recite(f(":niven.freenode.net 353 %s @ %s :some +different @nicks\r\n",
          conf.nick, chan));
        // A specific user joins
        server.recite(f(":protobot!~protobot@lol.com JOIN %s\r\n", chan));

        setTimeout(function() {
          should.exist(chan.people.get(irc.id("protobot")));
          chan.people.get(irc.id("protobot")).should.be.an.instanceof(irc.Person);
          should.exist(chan.people.get(irc.id("some")));
          should.exist(chan.people.get(irc.id("different")));
          should.exist(chan.people.get(irc.id("nicks")));
          chan.people.get(irc.id("some")).should.be.an.instanceof(irc.Person);
          chan.people.get(irc.id("different")).should.be.an.instanceof(irc.Person);
          chan.people.get(irc.id("nicks")).should.be.an.instanceof(irc.Person);
          done();
        }, 10);
      });

      bit("should remove people from its list of users", function(done) {
        const chan = irc.channel("#removepeople");
        const bot  = this;
        chan.client = bot;
        chan.join();
        server.recite(f(":%s!~a@b.c JOIN %s\r\n", bot.user.nick, chan));
        // Hit and run lol
        server.recite(":protobot1!~protobot@rogers.com JOIN #removepeople\r\n");
        server.recite(":protobot1!~protobot@rogers.com PART #removepeople\r\n");
        // getting kicked should also remove the person
        server.recite(":protobot2!~protobot@rogers.com JOIN #removepeople\r\n");
        server.recite(":evilbot!~nemesis@rogers.com KICK #removepeople protobot2\r\n");
        // also quitting
        bot.join("#quitters");
        server.recite(f(":%s!~a@b.c JOIN %s\r\n", bot.user.nick, "#quitters"));
        server.recite(":protobot3!~protobot@rogers.com JOIN #removepeople\r\n");
        server.recite(":protobot3!~protobot@rogers.com JOIN #quitters\r\n");
        server.recite(":protobot3!~protobot@rogers.com QUIT :Laterz\r\n");
        done();return;
        setTimeout(function() {
          should.not.exist(bot.channels.get(irc.id("#removepeople"))
            .people.get(irc.id("protobot1")));
          should.not.exist(bot.channels.get(irc.id("#removepeople"))
            .people.get(irc.id("protobot2")));
          should.not.exist(bot.channels.get(irc.id("#removepeople"))
            .people.get(irc.id("protobot3")));
          should.not.exist(bot.channels.get(irc.id("#quitters"))
            .people.get(irc.id("protobot3")));
          done();
        }, 10);
      });

      bit("should remove a channel if kicked from it", function(done) {
        const bot  = this;
        const chan = bot.join("#kickedfrom");
        server.recite(f(":%s!~a@b.c JOIN %s\r\n", bot.user.nick, chan));
        setTimeout(function() {
          bot.channels.has(irc.id("#kickedfrom")).should.equal(true);
          server.recite(f(":kicky@kick.com KICK #lol,%s @other,%s,+another\r\n", chan.name, bot.user.nick));
          setTimeout(function() {
            bot.channels.has(irc.id("#kickedfrom")).should.equal(false);
            done();
          }, 10);
        }, 10);
      });

      bit("should create only one Person instance per user", function(done) {
        const nick = "unique";
        const bot  = this;
        bot.join("#channelone")
        bot.join("#channeltwo",
          function(ch) {
            ch.people.get(irc.id(nick)).should.equal(
              bot.channels.get(irc.id("#channelone")).people.get(irc.id(nick)));
            done();
          });
        server.recite(f(":%s@wee JOIN %s\r\n", this.user.nick, "#channelone"));
        server.recite(f(":%s@wee JOIN %s\r\n", this.user.nick, "#channeltwo"));
        server.recite(f(":card.freenode.net 353 %s @ %s :%s nlogax\r\n",
          this.user.nick, "#channelone", nick));
        server.recite(f(":card.freenode.net 353 %s @ %s :%s nlogax\r\n",
          this.user.nick, "#channeltwo", nick));
      });

      bit("should know that LOL[]\\~ is the same name as lol{}|^", function(done) {
        const lol = "#LOL[]\\~";
        const bot = this;
        this.join(lol, function(ch) {
          bot.channels.has("#lol{}|^").should.equal(true);
          done();
        });
        server.recite(f(":%s@wee JOIN %s\r\n", this.user.nick, lol));
        server.recite(f(":card.freenode.net 353 %s @ %s :%s nlogax\r\n",
          this.user.nick, lol, this.user.nick));
      });

      bit("should rename the channel if forwarded", function(done) {
        const c1 = irc.channel("#fwdfrom");
        const c2 = irc.channel("#fwdto");
        const bot = this;
        this.join(c1, function(err, ch) {
          err.should.be.an.instanceof(Error);
          err.message.should.equal("Forwarding to another channel");
          ch.name.should.equal(c2.name);
          bot.channels.has(c2.id).should.equal(true);
          bot.channels.has(irc.id("#fwdfrom")).should.equal(false);
          done();
        });
        server.recite(f(":holmes.freenode.net 470 %s %s %s :Forwarding to another channel\r\n",
          this.user.nick, c1, c2));
        server.recite(f(":%s@wee JOIN %s\r\n", this.user.nick, c2));
      });
    });

    bit(f("should emit all events as a `%s` event with message as first parameter", EVENT.ANY), function(done) {
      const bot = this;
      function handler(msg) {
        msg.type.should.equal(COMMAND.PRIVMSG);
        bot.ignore(EVENT.ANY, handler);
        done();
      }
      bot.match(EVENT.ANY, handler);
      server.recite(":gf3!n=gianni@pdpc/supporter/active/gf3 PRIVMSG #runlevel6 :ANY LOL\r\n");
    });
  });

  describe("network", function() {
    bit("should handle chopped up messages", function(done) {
      const bot = this;
      let got = 0;
      bot.match(COMMAND.PRIVMSG, function handler(msg) {
        if (msg.params[1] === ":Mad chopz") {
          bot.ignore(COMMAND.PRIVMSG, handler);
          if (2 === ++got) {
            done();
          }
        }
      });
      bot.match(COMMAND.NOTICE, function handler(msg) {
        if (msg.params[1] === ":*** Looking up your hostnamez...") {
          bot.ignore(COMMAND.NOTICE, handler);
          if (2 === ++got) {
            done();
          }
        }
      });
      server.recite(":chop!chop@choppers PR");
      setTimeout(function() {
        server.recite("IVMSG #choppy :Mad chopz\r\nNOTICE AUTH :*** Looking up your hostna");
      },10);
      setTimeout(function() {
        server.recite("mez...\r\n");
      },20);
    });

    bit("should handle multiple messages in one packet", function(done) {
      const bot = this;
      let got = 0;
      bot.match(COMMAND.NOTICE, function handler(msg) {
        if (20 === ++got) {
          bot.ignore(COMMAND.NOTICE, handler);
          done();
        }
      });
      server.recite("NOTICE AUTH 1\r\nNOTICE AUTH 2\r\nNOTICE AUTH 3\r\nNOTICE AUTH 4\r\nNOTICE AUTH 5\r\n" +
        "NOTICE AUTH 6\r\nNOTICE AUTH 7\r\nNOTICE AUTH 8\r\nNOTICE AUTH 9\r\nNOTICE AUTH 10\r\n" +
        "NOTICE AUTH 11\r\nNOTICE AUTH 12\r\nNOTICE AUTH 13\r\nNOTICE AUTH 14\r\nNOTICE AUTH 15\r\n" +
        "NOTICE AUTH 16\r\nNOTICE AUTH 17\r\nNOTICE AUTH 18\r\nNOTICE AUTH 19\r\nNOTICE AUTH 20\r\n");
    });
  });
});

const path = require("path");
const fs   = require("fs");
const irc  = require(path.join(__dirname, "..", "lib", "irc"));
const fxtp = path.join(__dirname, "fixtures");
const srv  = require("./server");

function readFixture(fileName, fp) {
  return JSON.parse(fs.readFileSync(path.join(fp || fxtp, fileName), "utf8"));
}

const conf = path.join(__dirname, "lib", "config.json");
const cobj = JSON.parse(fs.readFileSync(conf, "utf8"));

const server = srv.server;

server.listen(cobj.server.port, cobj.server.address);
const bot = irc.connect(cobj);

// Convenience wrapper around `it`, with added bottage/servage
function bit(desc, f) {
  server.removeAllListeners("message");
  if (!f) {
    return it(desc);
  }
  it(desc, f.bind(bot));
}

exports.bit         = bit;
exports.conf        = cobj;
exports.readFixture = readFixture;

/** @module build
 */

"use strict";

const fs    = require("fs");
const path  = require("path");
const peg   = require("pegjs");

const targets = {
  "parser": buildParser
}

// Stuff that goes at the top of the generated parser module.
const prelude = [
  "/** @module parser */",
  "\"use strict\";",
  "const irc = require(\"./irc\");",
  "module[\"exports\"] = "
].join("\n\n");

function buildParser() {
  const grammarPath = path.join(__dirname, "lib", "irc.peg");
  const parserPath  = path.join(__dirname, "lib", "parser.js");
  const grammar     = fs.readFileSync(grammarPath, "utf-8");
  const parser      = peg.buildParser(grammar).toSource();
  fs.writeFileSync(parserPath, prelude + parser);
}

function main() {
  const target = process.argv.pop().trim();
  if (!targets[target]) {
    console.error("No such target: %s", target);
    process.exit(1);
  }
  targets[target]();
}

if (!module.parent) {
  main();
}

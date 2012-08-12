/** @module parser
 *  Stopped being so lazy and wrote a non-RegExp, non-PEG parser.
 *  Given the extremely simple grammar, I'm not sure why I tried to avoid it.
 *
 *  It is quite liberal in what it accepts, but that might be a good thing?
 */

"use strict";

const channel   = require("./channel").channel;
const message   = require("./message").message;
const person    = require("./person").person;
const server    = require("./server").server;
const format    = require("util").format;

// A couple of char codes for convenience.
const BELL  = 0x7;  // BOOP!

const LINE_FEED         = 0x0A;
const CARRIAGE_RETURN   = 0x0D;
const SPACE             = 0x20;
const EXCLAMATION_MARK  = 0x21;
const NUMBER_SIGN       = 0x23;
const AMPERSAND         = 0x26;
const COMMA             = 0x2C;
const COLON             = 0x3A;
const COMMERCIAL_AT     = 0x40;

const LEFT_SQUARE_BRACKET   = 0x5B;
const RIGHT_SQUARE_BRACKET  = 0x5D;

const LEFT_CURLY_BRACKET   = 0x7B;
const RIGHT_CURLY_BRACKET  = 0x7D;

const PLUS_SIGN     = 0x2B;
const HYPHEN_MINUS  = 0x2D;

const END_OF_FILE = 0x0;

/** This can't be the Right Way(tm) to define exceptions? :/
 *  @constructor
 *  @param  {string=}   message
 */
function ParseError(message) {
  this.name     = this.constructor.name;
  this.message  = message ? message : "";
}

ParseError.prototype   = Error.prototype;
ParseError.constructor = ParseError;

/** @contructor
 *  @param    {Buffer?} buffer
 *  @property {Buffer}  buffer
 *  @property {number}  index
 *  @property {number}  char
 */
function Parser(buffer) {
  this.buffer = null;
  this.index  = 0;
  this.char   = END_OF_FILE;
  if (Buffer.isBuffer(buffer)) {
    this.buffer = buffer;
    this.char   = buffer[0];
  }
}

Parser.prototype.advance = function() {
  this.char = this.buffer[++this.index] || END_OF_FILE;
}

/** @param  {Buffer}  buffer
 *  @throws {ParseError}
 *  @return {Message}
 */
Parser.prototype.parse = function(buffer) {
  this.buffer = buffer;
  this.index  = 0;
  this.char   = buffer[0];
  const msg   = this.parseMessage();
  this.reset();
  return msg;
};

Parser.prototype.reset = function() {
  this.buffer = null;
  this.index  = 0;
  this.char   = END_OF_FILE;
};

/** Parse a complete message.
 *  @throws {ParseError}
 *  @return {Message}
 */
Parser.prototype.parseMessage = function() {
  const prefix  = this.isPrefix() ? this.parsePrefix() : null;
  const command = this.skipSpaces() || this.parseCommand();
  const params  = this.skipSpaces() || this.parseParams();

  if (!this.isEndOfMessage()) {
    this.throwParseError(format("expected '%s', followed by '%s'",
      printCC(CARRIAGE_RETURN), printCC(LINE_FEED)));
  }
  return message(prefix, command, params);
};

/** @return {Person|Server} */
Parser.prototype.parsePrefix = function() {
  this.advance();
  const start = this.index;
  while (true) {
    const char = this.char;
    if (char === SPACE) {
      return server(this.buffer.toString(null, start, this.index));
    }
    if (char === EXCLAMATION_MARK || char === COMMERCIAL_AT) {
      return this.parsePerson(this.buffer.toString(null, start, this.index));
    }
    this.advance();
  }
};

/** @throws {ParseError}
 *  @return {Person}
 */
Parser.prototype.parsePerson = function(nick) {
  let user = null;
  let host = null
  if (this.char === EXCLAMATION_MARK) {
    this.advance();
    const start = this.index;
    while (true) {
      if (this.char === COMMERCIAL_AT) {
        break;
      }
      if (isTerminating(this.char)) {
        this.throwParseError("premature end of input while parsing message prefix");
      }
      this.advance();
    }
    user = this.buffer.toString(null, start, this.index);
  }
  if (this.char === COMMERCIAL_AT) {
    this.advance();
    const start = this.index;
    while (true) {
      if (this.char === SPACE) {
        break;
      }
      this.advance();
    }
    host = this.buffer.toString(null, start, this.index);
  }
  return person(nick, user, host);
};

/** @return {string} */
Parser.prototype.parseCommand = function() {
  const start = this.index;
  if (isNumber(this.char)) {
    this.advance();
    this.advance();
    this.advance();
    return this.buffer.toString(null, start, this.index);
  }
  while (isLetter(this.char)) {
    this.advance();
  }
  const command = this.buffer.toString(null, start, this.index);
  return command;
};

/** @return {Array.<string>} */
Parser.prototype.parseParams  = function() {
  const params = [];
  while (true) {
    params.push(this.parseParam());
    this.skipSpaces();
    if (isTerminating(this.char)) {
      break;
    }
  }
  return params;
};

/** @return {string} */
Parser.prototype.parseParam = function() {
  const start = this.index;
  const isTrailing = this.char === COLON;
  while (true) {
    if (isTerminating(this.char) || !isTrailing && this.char === SPACE) {
      break;
    }
    this.advance();
  }
  return this.buffer.toString(null, start, this.index);
};

// Additional parsers, not used when parsing a message.

/** @throws {ParseError}
 *  @return {Map}
 */
Parser.prototype.parseMode = function() {
  const map = new Map();
  map.set(PLUS_SIGN, []);
  map.set(HYPHEN_MINUS, []);
  while (true) {
    const char = this.char;
    if (!(char === PLUS_SIGN || char === HYPHEN_MINUS)) {
      this.throwParseError(format("expected '%s' or '%s'",
        PLUS_SIGN.toString(16), HYPHEN_MINUS.toString(16)));
    }
    const sign = char;
    const arr  = map.get(sign);
    this.advance();
    while (isLetter(this.char)) {
      arr.push(String.fromCharCode(this.char));
      this.advance();
    }
    if (this.isEndOfBuffer()) {
      break;
    }
  }
  return map;
};

/** @throws {ParseError}
 *  @return {Channel}
 */
Parser.prototype.parseChannel = function() {
  const prefix = this.char;
  if (!(prefix === EXCLAMATION_MARK || prefix === NUMBER_SIGN ||
      prefix === AMPERSAND || prefix === PLUS_SIGN)) {
    this.throwParseError(format("expected one of '%s', '%s', '%s', or '%s'",
      printCC(EXCLAMATION_MARK), printCC(NUMBER_SIGN),
      printCC(AMPERSAND), printCC(PLUS_SIGN)));
  }
  while (true) {
    const chr = this.char;
    if (chr === SPACE || chr === BELL || chr === COMMA || chr === COLON) {
      this.throwParseError("can not be used in channel name");
    }
    this.advance();
    if (this.isEndOfBuffer()) {
      break;
    }
  }
  return channel(this.buffer.toString());
};

/** @return {boolean} */
Parser.prototype.isPrefix = function() {
  return this.char === COLON && this.index === 0;
};

/** @return {boolean} */
Parser.prototype.isEndOfMessage = function() {
  return this.char === CARRIAGE_RETURN &&
    this.buffer[this.index + 1] === LINE_FEED;
};

/** @return {boolean} */
Parser.prototype.isEndOfBuffer = function() {
  return this.index >= this.buffer.length - 1;
};

/** Advance until next non-space char. */
Parser.prototype.skipSpaces = function() {
  while (this.char === SPACE) {
    this.advance();
  }
};

/** @throws {ParseError}
 *  @param  {string=}     expected
 */
Parser.prototype.throwParseError = function(expected) {
  const expectation = expected ? "; " + expected : "";
  const message = format("Unexpected char '%s' at index %d%s",
    printCC(this.char), this.index, expectation);
  throw new ParseError(message);
}

/** @param  {number}  char
 *  @return {boolean}
 */
function isLetter(char) {
  return (0x41 <= char && char <= 0x5A) ||
    (0x61 <= char && char <= 0x7A);
}

/** @param  {number}  char
 *  @return {boolean}
 */
function isNumber(char) {
  return 0x30 <= char && char <= 0x39;
}

/** @param  {number}  char
 *  @return {boolean}
 */
function isAlphaNumeric(char) {
  return isLetter(char) || isNumber(char);
}

/** @param  {number}  char
 *  @return {boolean}
 */
function isTerminating(char) {
  return char === CARRIAGE_RETURN || char === LINE_FEED || char === END_OF_FILE;
}

// Convenience functions.

const parser = new Parser(null);

/** @param  {Buffer}
 *  @return {Message}
 */
function parse(buf) {
  return parser.parse(buf);
}

/** @param  {Buffer|string}
 *  @return {Message}
 */
function parseMode(buf) {
  if (!Buffer.isBuffer(buf)) {
    buf = new Buffer(buf);
  }
  return new Parser(buf).parseMode();
}

/** @param  {Buffer|string}
 *  @return {Message}
 */
function parseChannel(buf) {
  if (!Buffer.isBuffer(buf)) {
    buf = new Buffer(buf);
  }
  return new Parser(buf).parseChannel();
}

function printCC(cc) {
  return "0x" + cc.toString(16).toUpperCase();
}

exports.Parser        = Parser;
exports.ParseError    = ParseError;
exports.parse         = parse;
exports.parseChannel  = parseChannel;
exports.parseMode     = parseMode;

exports.isTerminating = isTerminating;

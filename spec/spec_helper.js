IRCExposeInternals = true

var MockInternals = require( './mock_internals' )
  , IRC = require( __dirname + '/../lib/irc' )

exports.MockInternals = MockInternals
exports.IRC = IRC
exports.bot = new IRC({ internal: MockInternals })


# Macro Definitions
CTAGS = jsctags
NODE  = node
MOCHA = ./node_modules/mocha/bin/mocha


# Explicit Rules
tags:
	$(CTAGS) lib/irc.js lib/parser.js spec/**/*.js

test:
	export IRCJS_TEST=1;\
	$(MOCHA) --reporter spec --globals names --require should spec/lib/*.js

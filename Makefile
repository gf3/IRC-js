# Macro Definitions
CTAGS= jsctags
NODE= node
MOCHA= ./node_modules/mocha/bin/mocha

# Explicit Rules
tags:
	$(CTAGS) lib/irc.js lib/compiler.js lib/walker.js spec/**/*.js

parser:
	$(NODE) util/generate.js

test:
	$(MOCHA) --reporter spec --globals names --require should spec/lib/*.js

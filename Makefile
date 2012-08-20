# Macro Definitions
CTAGS = jsctags
NODE  = node
MOCHA = ./node_modules/mocha/bin/_mocha


# Explicit Rules
tags:
	$(CTAGS) lib/irc.js lib/parser.js spec/**/*.js

test-irc:
	@export IRCJS_TEST=1;\
	node --harmony $(MOCHA) --reporter spec --require should spec/lib/irc.spec.js;\

test-logger:
	@export IRCJS_TEST=1;\
	node --harmony $(MOCHA) --reporter spec --require should spec/lib/logger.spec.js;\

test-objects:
	@export IRCJS_TEST=1;\
	node --harmony $(MOCHA) --reporter spec --require should spec/lib/objects.spec.js;\

test-parser:
	@export IRCJS_TEST=1;\
	node --harmony $(MOCHA) --reporter spec --require should spec/lib/parser.spec.js;\

# Macro Definitions
CTAGS = jsctags
NODE  = node
MOCHA = ./node_modules/mocha/bin/_mocha

SPECS	= spec/lib/*.js

# Explicit Rules
tags:
	$(CTAGS) lib/irc.js lib/parser.js spec/**/*.js

# One file at a time so that the node IRC server dies inbetween.
test:
	@export IRCJS_TEST=1 ; \
	for jsfile in $(SPECS) ; do \
		node --harmony $(MOCHA) --reporter spec --require should $$jsfile ; \
	done

test-irc:
	@node --harmony $(MOCHA) --reporter spec --require should spec/lib/irc.spec.js ; \

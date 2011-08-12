# Macro Definitions
CTAGS= jsctags
NODE= node

# Explicit Rules
tags:
	$(CTAGS) lib/irc.js lib/compiler.js lib/walker.js spec/**/*.js

parser:
	$(NODE) util/generate.js

test:
	$(NODE) spec/lib/*.js -a

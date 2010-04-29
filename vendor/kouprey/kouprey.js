/* kouprey.js - A Parsing Expression Grammar (PEG) library for JavaScript.
 * Copyright (C) 2009 Rob King <jking@deadpixi.com> 
 *
 * This file is part of Kouprey.
 *
 * Kouprey is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Kouprey is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with Kouprey.  If not, see <http://www.gnu.org/licenses/>.
 */

/* Set up the Kouprey namespace. */
if (this.com === undefined) {
    com = {};
}

if (com.deadpixi === undefined) {
    com.deadpixi = {};
}

if (com.deadpixi.kouprey === undefined) {
    com.deadpixi.kouprey = {};
}

/* Parser objects have a unique ID, to help identify rules' cachelines. */
com.deadpixi.kouprey.ParserID = 0;

/* Match objects represent something interesting in the input. */
com.deadpixi.kouprey.Match = function (label, length, offset) {
    this.type = label;
    this.matchlength = length;
    this.offset = offset;
    this.children = [];
    this.value = undefined;
};

/* Parser objects can be created using the Parser function. Every parser
 * has a set of parsing rules, and a root rule. The root rule is the goal of
 * the parser - any invocations of the parser will try to ensure that its
 * input matches that root rule. The root rule is identified by name. */
com.deadpixi.kouprey.Parser = function (rules, root, debug) {
    // Store the rules.
    this.rules = rules;
    this.root  = rules[root];

    // Was the root rule valid?
    if (this.root === null || this.root === undefined) {
        throw "Root rule '" + root + "' is not present in rule set.";
    }

    // Give this parser a unique ID.
    this.parserID = com.deadpixi.kouprey.ParserID++;

    // Parsers keep count of how often they've been initialized.
    this.initCount = 0;

    // Set the debug flag.
    this.debug = (debug === undefined) ? false : debug;

    // Print out a debug trace.
    this.getDebugTrace = function () {
        // Function scope variables.
        var i,  // Loop index.
            j,  // Loop index.
            o,  // The output.
            s;  // Prefix string.

        if (this.debug) {
            o = "Debug trace: \n" + this.cacheHits + " cache hits.\n";

            for (i = 0; i < this.debugStack.length; i++) {
                s = "";
                for (j = 0; j < this.debugStack[i][1]; j++) {
                    s = s + " ";
                }
    
                o = o + (s + this.debugStack[i][2] + ": " +
                             this.debugStack[i][0] + "\n");
            }

            return o;
        }

        return "No debug trace available.";
    };

    // The initialization function resets input and cache properties.
    this.init = function () {
        // Increment the initialization count of this parser. This helps
        // identify rule cache lines.
        this.initCount++;

        // Create an empty input string.
        this.input = "";

        // Initialize the cache. Note that we don't set up cache lines for
        // rules yet; we do that during the call to parse(). This makes sense
        // because we want to cache sub-rules of rules too, which aren't
        // visible to us until the rule is called.
        this.cache = {};

        // Start the UID counter. Every rule and subrule is identified by a
        // unique ID number.
        this.highUID = 0;

        // Keep track of the highest offset we've made it to in parser, to
        // help in error messages.
        this.highestOffset = 0;

        // Keep track of the number of cache hits.
        this.cacheHits = 0;

        // Update the initialization count.
        this.initCount++;

        // Update the debugging stack.
        this.debugStack = [];
        this.debugLength = 0;
    };

    // The parse function actually runs the parser. It expects up to three
    // arguments: the input to parse (as a string), the rule to use to parse
    // it (as a name), and the offset into the input string at which to
    // begin parsing. If the rule is not specified, the root rule is used.
    // If the offset is not specified, the offset is 0. If the input value is
    // null, it uses the previously-cached input. If input is provided, the
    // parser is reinitialized and that input is used.
    this.parse = function (input, offset, rule) {
        // Function scope variables.
        var count,  // Match count.
            i,      // Loop index.
            match,  // Match to return.
            prefix, // Rule UID prefix.
            rc;     // Temporary match.

        // If we don't have an input, use the cached one.
        if (input === null || input === undefined) {
            input = this.input;
        } else {
            // If new input is provided, reinitialize.
            this.init();
            this.input = input;
        }

        // If we don't have an offset, use zero.
        offset = (offset === undefined) ? 0 : offset;

        // If we don't have a rule, use the parser-specific root rule.
        rule = (rule === undefined) ? this.root : rule;

        // Figure out what rule we're in.
        if (this.debug) {
            this.debugLength++;
            if (typeof rule === "string" || rule instanceof String) {
                this.debugStack.push([rule, this.debugLength, offset]);
            } else {
                for (i in this.rules) {
                    if (this.rules[i] === rule) {
                        this.debugStack.push([i, this.debugLength, offset]);
                        break;
                    }
                }
            }
        }

        // The parse function handles terminals, which are presented as 
        // strings or regular expressions. It also handles sequences, 
        // represented as arrays. Everything else is represented as a function,
        // which the parse function will invoke using their call() methods.
        
        // If our offset is higher than the previous highest, update it.
        if (offset >= this.highestOffset) {
            this.highestOffset = offset;
        }

        // Give the rule a UID if it doesn't already have one and set up a
        // cache line for this rule.
        prefix = this.parserID + "-" + this.initCount + "-";
        if (rule.uid === undefined || rule.uid.indexOf(prefix) !== 0) {
            rule.uid = prefix + this.highUID++;
            this.cache[rule.uid] = {};
        }

        // Make sure the rule has a cacheline.
        if (this.cache[rule.uid] === undefined) {
            this.cache[rule.uid] = {};
        }
    
        // If this rule already has a cached rule at this offset, return the
        // cached result rather than run it again.
        if (this.cache[rule.uid][offset] !== undefined) {
            this.cacheHits++;
            this.debugLength--;
            return this.cache[rule.uid][offset];
        }

        // Parse using the given rule. First, check to see if it's a terminal.
        // The simplest type of terminal is a string.
        if (typeof rule === "string" || rule instanceof String) {
            // Check to see if the string matches the input at the offset.
            if (input.substring(offset, offset + rule.length) === rule) {
                // We matched. 
                match = new String(rule);
        
                // Note tha length of the match.
                match.matchlength = rule.length;

                // Cache the result.
                this.cache[rule.uid][offset] = match;

                // And return the match.
                this.debugLength--;
                return match;
            }

            // Nope, we didn't match. Consume no input and return null.
            this.cache[rule.uid][offset] = null;
            this.debugLength--;
            return null;
        }

        // The other type of terminal is the regular expression.
        if (rule instanceof RegExp) {
            // Check for a match.
            rc = rule.exec(input.substring(offset));

            // Did we get a match?
            if (rc !== null && rc !== undefined) {
                // We did. Create the match.
                match = new String(rc[0]);

                // Note the length of the match.
                match.matchlength = rc[0].length;

                // Cache the result.
                this.cache[rule.uid][offset] = match;
            
                // Return the match.
                this.debugLength--;
                return match;
            }

            // Didn't match. Consume no input and return null.
            this.cache[rule.uid][offset] = null;
            this.debugLength--;
            return null;
        }

        // It's an array, indicating a sequence. Check each predicate in turn.
        if (rule instanceof Array) {
            // We have to build the response piecewise.
            rc = [];
            count = 0;

            // Check each predicate.
            for (i = 0; i < rule.length; i++) {
                // Check the predicate from the index of the last match.
                match = this.parse(null, offset + count, rule[i]);

                // If we didn't get a match, fail.
                if (match === null || match === undefined) {
                    // Sequences have to match completely or not at all, so
                    // we can kill the whole thing here.
                    this.cache[rule.uid][offset] = null;
                    this.debugLength--;
                    return null;
                }

                // Otherwise, continue on.
                if (match.matchlength > 0) {
                    rc.push(match);
                    count = count + match.matchlength;
                }
            }

            // The whole thing matched. Horray. Update the length.
            rc.matchlength = count;

            // Update the cache.
            if (this.cache[rule.uid] === undefined) {
                this.cache[rule.uid] = [];
            }
            this.cache[rule.uid][offset] = rc;

            // And we're done.
            this.debugLength--;
            return rc;
        }

        // If it's a function, call it.
        if (typeof rule === "function" || rule instanceof Function) {
            // Invoke the rule.
            rc = rule.call(this, offset);
            if (this.cache[rule.uid] === undefined) {
                this.cache[rule.uid] = [];
            }
            this.cache[rule.uid][offset] = rc;
            this.debugLength--;
            return rc;
        }

        // We matched nothing.
        this.cache[rule.uid][offset] = null;
        this.debugLength--;
        return null;
    };
};

/* The End predicate matches the end of input. */
com.deadpixi.kouprey.End = function () {
    return function (offset) {
        return (offset >= this.input.length) ? {matchlength: 0} : null;
    };
};

/* The Start predicate matches the start of input. */
com.deadpixi.kouprey.Start = function (offset) {
    return function (offset) {
        return (offset === 0) ? {matchlength: 0} : null;
    };
};

/* Declare a Balanced rule. */
com.deadpixi.kouprey.Balanced = function (start, end, esc) {
    return function (offset) {
        // Function scope variables.
        var counter,    // The current count of values.
            eend,       // The escaped end string.
            estart,     // The escaped start string.
            leend,      // Length of escaped end string.
            lestart,    // Length of escaped start string.
            lend,       // Length of the end string.
            lstart,     // Length of the start string.
            s;          // String contents.

        // We start the counter at zero.
        counter = 0;

        // If there's an escape sequence, initialize the eend and estart stuff.
        if (esc !== undefined) {
            eend = esc + end;
            estart = esc + start;
            leend = eend.length;
            lestart = estart.length;
        } else {
            eend = null;
            estart = null;
        }

        // Grab the length of the start and end strings.
        lstart = start.length;
        lend   = end.length;

        // Initialize the string match.
        s = "";

        // If we don't start at the start position, we fail.
        if (this.input.substring(offset, offset + lstart) != start) {
            return null;
        }

        // Walk through the input. Every time we encounter the start string,
        // increase the counter. Every time we encounter the end string,
        // decrease the counter. If the counter hits zero, we're done.
        do {
            if (this.input.substring(offset, offset + lestart) == estart) {
                s = s + estart;
                offset = offset + lestart;
            } else if (this.input.substring(offset, offset + leend) == eend) {
                s = s + eend;
                offset = offset + leend;
            } else if (this.input.substring(offset, offset + lstart) == start) {
                counter++;
                s = s + start; 
                offset = offset + lstart;
            } else if (this.input.substring(offset, offset + lend) == end) {
                counter--;
                s = s + end;
                offset = offset + lend;
            } else {
                s = s + this.input.charAt(offset);
                offset++;
            }

            if (offset >= this.input.length) {
                return null;
            }
        } while (counter !== 0);

        // Return the match.
        s = new String(s);
        s.matchlength = s.length;
        return s;
    };
};

/* Declare an Or rule. */
com.deadpixi.kouprey.Or = function () {
    // Function scope variables.
    var options;    // Parsing options.

    // Copy the options over.
    options = arguments;

    // Return the closure.
    return function (offset) {
        // Function scope variables.
        var i,      // Loop index.
            match;  // Potential match.

        // Check out each alternative.
        for (i = 0; i < options.length; i++) {
            match = this.parse(null, offset, options[i]);
            if (match !== null) {
                return match;
            }
        }

        // We matched nothing.
        return null;
    };
};

/* Declare an Optional predicate. */
com.deadpixi.kouprey.Optional = function (rule) {
    return function (offset) {
        // Function scope variables.
        var match;  // Parsing match.

        // Check to see if we match.
        match = this.parse(null, offset, rule);

        // If we did, great.
        if (match !== null) {
            return match;
        }

        // If we didn't, that's okay too. We're optional.
        return {matchlength: 0};
    };
};

/* Declare an Any predicate. */
com.deadpixi.kouprey.Any = function (rule) {
    return function (offset) {
        // Function scope variables.
        var count,  // Number of symbols matched.
            match,  // The match.
            rc;     // The returned match.

        // We haven't matched anything yet.
        count = 0;

        // We always return something.
        rc = [];
        rc.matchlength = 0;

        // As long as we match, append the value.
        match = this.parse(null, offset, rule);
        while (match !== null && match.matchlength !== 0) {
            // Otherwise, append the match.
            rc.push(match);

            // Update the count.
            count = count + match.matchlength;

            // And reparse.
            match = this.parse(null, offset + count, rule);
        }

        // Return the match.
        rc.matchlength = count;
        return rc;
    };
};

/* Declare a Some predicate. */
com.deadpixi.kouprey.Some = function (rule) {
    return function (offset) {
        if (this.parse(null, offset, rule) !== null) {
            return this.parse(null, offset, com.deadpixi.kouprey.Any(rule));
        }

        return null;
    };
};

/* Declare an And rule. */
com.deadpixi.kouprey.And = function (rule) {
    return function (offset) {
        if (this.parse(null, offset, rule) !== null) {
            return {matchlength: 0};
        }

        return null;
    };
};

/* Declare a Not predicate. */
com.deadpixi.kouprey.Not = function (rule) {
    return function (offset) {
        if (this.parse(null, offset, rule) === null) {
            return {matchlength: 0};
        }

        return null;
    };
};

/* Allow for forward declarations. */
com.deadpixi.kouprey.Forward = function (name) {
    return function (offset) {
        return this.parse(null, offset, this.rules[name]);
    };
};

/* Mark a value as interesting. What this does is wrap a match in a
 * Match object. It walks through all of the children of a match (if it's an
 * object that can have children, like an array), and adds all of the 
 * interesting children to an array called children. */
com.deadpixi.kouprey.$ = function (rule, label) {
    return function (offset) {
        // Function scope variables. 
        var func,   // Function to grab interesting child nodes.
            match,  // The match.
            rc;     // The returned match.

        // Execute the match.
        match = this.parse(null, offset, rule);

        // If we didn't match, just return null.
        if (match === null) {
            return null;
        }

        // The function used to recursively search child nodes.
        func = function (node) {
            // Function scope variables.
            var i,          // Loop index.
                children,   // Matches on child nodes.
                rc;         // Returned match.

            // Initialize the list of children.
            rc = [];

            // Walk through and find all the interesting children.
            if (node instanceof Array) {
                for (i = 0; i < node.length; i++) {
                    if (node[i] instanceof com.deadpixi.kouprey.Match) {
                        rc = rc.concat(node[i]);
                    } else {
                        children = arguments.callee(node[i]);
                        if (children.length > 0) {
                            rc = rc.concat(children);
                        }
                    }
                }
            }

            // Return list of children.
            return rc;
        };

        // If the label wasn't provided, use the matched value.
        label = (label === undefined) ? match.toString() : label;

        // The returned match.
        rc = new com.deadpixi.kouprey.Match(label, match.matchlength, offset);

        // If it's an array, walk through and handle all its children.
        if (match instanceof Array) {
            rc.children = func(match);
        } else {
            // Just append the value itself.
            rc.value = match;
        }

        // And return the match.
        return rc;
    };
};

/* Add the Unicode block table. 
 * This code was substantially copied from the XRegExp Unicode plugin,
 * released under the MIT license. The MIT license is compatible with the
 * Lesser GNU General Public License, under which Kouprey is released.
 * Below is the copyright declaration and disclaimer as required by the MIT
 * license.
 *
 * Copyright (c) 2009 Steven Levithan
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */
com.deadpixi.kouprey.unicodeExps = {};
com.deadpixi.kouprey.unicodeExpsRep = {};
com.deadpixi.kouprey.unicodeInvExps = {};
com.deadpixi.kouprey.unicodeInvExpsRep = {};

com.deadpixi.kouprey.unicode = {
    c: "0000-001F007F-009F00AD0600-060306DD070F17B417B5200B-200F202A-202E2060-2064206A-206FD800DB7FDB80DBFFDC00DFFFE000F8FFFEFFFFF9-FFFB",
    l: "0041-005A0061-007A00AA00B500BA00C0-00D600D8-00F600F8-02C102C6-02D102E0-02E402EC02EE0370-037403760377037A-037D03860388-038A038C038E-03A103A3-03F503F7-0481048A-05230531-055605590561-058705D0-05EA05F0-05F20621-064A066E066F0671-06D306D506E506E606EE06EF06FA-06FC06FF07100712-072F074D-07A507B107CA-07EA07F407F507FA0904-0939093D09500958-096109710972097B-097F0985-098C098F09900993-09A809AA-09B009B209B6-09B909BD09CE09DC09DD09DF-09E109F009F10A05-0A0A0A0F0A100A13-0A280A2A-0A300A320A330A350A360A380A390A59-0A5C0A5E0A72-0A740A85-0A8D0A8F-0A910A93-0AA80AAA-0AB00AB20AB30AB5-0AB90ABD0AD00AE00AE10B05-0B0C0B0F0B100B13-0B280B2A-0B300B320B330B35-0B390B3D0B5C0B5D0B5F-0B610B710B830B85-0B8A0B8E-0B900B92-0B950B990B9A0B9C0B9E0B9F0BA30BA40BA8-0BAA0BAE-0BB90BD00C05-0C0C0C0E-0C100C12-0C280C2A-0C330C35-0C390C3D0C580C590C600C610C85-0C8C0C8E-0C900C92-0CA80CAA-0CB30CB5-0CB90CBD0CDE0CE00CE10D05-0D0C0D0E-0D100D12-0D280D2A-0D390D3D0D600D610D7A-0D7F0D85-0D960D9A-0DB10DB3-0DBB0DBD0DC0-0DC60E01-0E300E320E330E40-0E460E810E820E840E870E880E8A0E8D0E94-0E970E99-0E9F0EA1-0EA30EA50EA70EAA0EAB0EAD-0EB00EB20EB30EBD0EC0-0EC40EC60EDC0EDD0F000F40-0F470F49-0F6C0F88-0F8B1000-102A103F1050-1055105A-105D106110651066106E-10701075-1081108E10A0-10C510D0-10FA10FC1100-1159115F-11A211A8-11F91200-1248124A-124D1250-12561258125A-125D1260-1288128A-128D1290-12B012B2-12B512B8-12BE12C012C2-12C512C8-12D612D8-13101312-13151318-135A1380-138F13A0-13F41401-166C166F-16761681-169A16A0-16EA1700-170C170E-17111720-17311740-17511760-176C176E-17701780-17B317D717DC1820-18771880-18A818AA1900-191C1950-196D1970-19741980-19A919C1-19C71A00-1A161B05-1B331B45-1B4B1B83-1BA01BAE1BAF1C00-1C231C4D-1C4F1C5A-1C7D1D00-1DBF1E00-1F151F18-1F1D1F20-1F451F48-1F4D1F50-1F571F591F5B1F5D1F5F-1F7D1F80-1FB41FB6-1FBC1FBE1FC2-1FC41FC6-1FCC1FD0-1FD31FD6-1FDB1FE0-1FEC1FF2-1FF41FF6-1FFC2071207F2090-209421022107210A-211321152119-211D212421262128212A-212D212F-2139213C-213F2145-2149214E218321842C00-2C2E2C30-2C5E2C60-2C6F2C71-2C7D2C80-2CE42D00-2D252D30-2D652D6F2D80-2D962DA0-2DA62DA8-2DAE2DB0-2DB62DB8-2DBE2DC0-2DC62DC8-2DCE2DD0-2DD62DD8-2DDE2E2F300530063031-3035303B303C3041-3096309D-309F30A1-30FA30FC-30FF3105-312D3131-318E31A0-31B731F0-31FF34004DB54E009FC3A000-A48CA500-A60CA610-A61FA62AA62BA640-A65FA662-A66EA67F-A697A717-A71FA722-A788A78BA78CA7FB-A801A803-A805A807-A80AA80C-A822A840-A873A882-A8B3A90A-A925A930-A946AA00-AA28AA40-AA42AA44-AA4BAC00D7A3F900-FA2DFA30-FA6AFA70-FAD9FB00-FB06FB13-FB17FB1DFB1F-FB28FB2A-FB36FB38-FB3CFB3EFB40FB41FB43FB44FB46-FBB1FBD3-FD3DFD50-FD8FFD92-FDC7FDF0-FDFBFE70-FE74FE76-FEFCFF21-FF3AFF41-FF5AFF66-FFBEFFC2-FFC7FFCA-FFCFFFD2-FFD7FFDA-FFDC",
    m: "0300-036F0483-04890591-05BD05BF05C105C205C405C505C70610-061A064B-065E067006D6-06DC06DE-06E406E706E806EA-06ED07110730-074A07A6-07B007EB-07F30901-0903093C093E-094D0951-0954096209630981-098309BC09BE-09C409C709C809CB-09CD09D709E209E30A01-0A030A3C0A3E-0A420A470A480A4B-0A4D0A510A700A710A750A81-0A830ABC0ABE-0AC50AC7-0AC90ACB-0ACD0AE20AE30B01-0B030B3C0B3E-0B440B470B480B4B-0B4D0B560B570B620B630B820BBE-0BC20BC6-0BC80BCA-0BCD0BD70C01-0C030C3E-0C440C46-0C480C4A-0C4D0C550C560C620C630C820C830CBC0CBE-0CC40CC6-0CC80CCA-0CCD0CD50CD60CE20CE30D020D030D3E-0D440D46-0D480D4A-0D4D0D570D620D630D820D830DCA0DCF-0DD40DD60DD8-0DDF0DF20DF30E310E34-0E3A0E47-0E4E0EB10EB4-0EB90EBB0EBC0EC8-0ECD0F180F190F350F370F390F3E0F3F0F71-0F840F860F870F90-0F970F99-0FBC0FC6102B-103E1056-1059105E-10601062-10641067-106D1071-10741082-108D108F135F1712-17141732-1734175217531772177317B6-17D317DD180B-180D18A91920-192B1930-193B19B0-19C019C819C91A17-1A1B1B00-1B041B34-1B441B6B-1B731B80-1B821BA1-1BAA1C24-1C371DC0-1DE61DFE1DFF20D0-20F02DE0-2DFF302A-302F3099309AA66F-A672A67CA67DA802A806A80BA823-A827A880A881A8B4-A8C4A926-A92DA947-A953AA29-AA36AA43AA4CAA4DFB1EFE00-FE0FFE20-FE26",
    n: "0030-003900B200B300B900BC-00BE0660-066906F0-06F907C0-07C90966-096F09E6-09EF09F4-09F90A66-0A6F0AE6-0AEF0B66-0B6F0BE6-0BF20C66-0C6F0C78-0C7E0CE6-0CEF0D66-0D750E50-0E590ED0-0ED90F20-0F331040-10491090-10991369-137C16EE-16F017E0-17E917F0-17F91810-18191946-194F19D0-19D91B50-1B591BB0-1BB91C40-1C491C50-1C5920702074-20792080-20892153-21822185-21882460-249B24EA-24FF2776-27932CFD30073021-30293038-303A3192-31953220-32293251-325F3280-328932B1-32BFA620-A629A8D0-A8D9A900-A909AA50-AA59FF10-FF19",
    p: "0021-00230025-002A002C-002F003A003B003F0040005B-005D005F007B007D00A100AB00B700BB00BF037E0387055A-055F0589058A05BE05C005C305C605F305F40609060A060C060D061B061E061F066A-066D06D40700-070D07F7-07F90964096509700DF40E4F0E5A0E5B0F04-0F120F3A-0F3D0F850FD0-0FD4104A-104F10FB1361-1368166D166E169B169C16EB-16ED1735173617D4-17D617D8-17DA1800-180A1944194519DE19DF1A1E1A1F1B5A-1B601C3B-1C3F1C7E1C7F2010-20272030-20432045-20512053-205E207D207E208D208E2329232A2768-277527C527C627E6-27EF2983-299829D8-29DB29FC29FD2CF9-2CFC2CFE2CFF2E00-2E2E2E303001-30033008-30113014-301F3030303D30A030FBA60D-A60FA673A67EA874-A877A8CEA8CFA92EA92FA95FAA5C-AA5FFD3EFD3FFE10-FE19FE30-FE52FE54-FE61FE63FE68FE6AFE6BFF01-FF03FF05-FF0AFF0C-FF0FFF1AFF1BFF1FFF20FF3B-FF3DFF3FFF5BFF5DFF5F-FF65",
    s: "0024002B003C-003E005E0060007C007E00A2-00A900AC00AE-00B100B400B600B800D700F702C2-02C502D2-02DF02E5-02EB02ED02EF-02FF03750384038503F604820606-0608060B060E060F06E906FD06FE07F609F209F309FA0AF10B700BF3-0BFA0C7F0CF10CF20D790E3F0F01-0F030F13-0F170F1A-0F1F0F340F360F380FBE-0FC50FC7-0FCC0FCE0FCF109E109F13601390-139917DB194019E0-19FF1B61-1B6A1B74-1B7C1FBD1FBF-1FC11FCD-1FCF1FDD-1FDF1FED-1FEF1FFD1FFE20442052207A-207C208A-208C20A0-20B5210021012103-21062108210921142116-2118211E-2123212521272129212E213A213B2140-2144214A-214D214F2190-2328232B-23E72400-24262440-244A249C-24E92500-269D26A0-26BC26C0-26C32701-27042706-2709270C-27272729-274B274D274F-275227562758-275E2761-276727942798-27AF27B1-27BE27C0-27C427C7-27CA27CC27D0-27E527F0-29822999-29D729DC-29FB29FE-2B4C2B50-2B542CE5-2CEA2E80-2E992E9B-2EF32F00-2FD52FF0-2FFB300430123013302030363037303E303F309B309C319031913196-319F31C0-31E33200-321E322A-324332503260-327F328A-32B032C0-32FE3300-33FF4DC0-4DFFA490-A4C6A700-A716A720A721A789A78AA828-A82BFB29FDFCFDFDFE62FE64-FE66FE69FF04FF0BFF1C-FF1EFF3EFF40FF5CFF5EFFE0-FFE6FFE8-FFEEFFFCFFFD",
    z: "002000A01680180E2000-200A20282029202F205F3000",
    inbasiclatin: "0000-007F",
    inlatin1supplement: "0080-00FF",
    inlatinextendeda: "0100-017F",
    inlatinextendedb: "0180-024F",
    inipaextensions: "0250-02AF",
    inspacingmodifierletters: "02B0-02FF",
    incombiningdiacriticalmarks: "0300-036F",
    ingreekandcoptic: "0370-03FF",
    incyrillic: "0400-04FF",
    incyrillicsupplement: "0500-052F",
    inarmenian: "0530-058F",
    inhebrew: "0590-05FF",
    inarabic: "0600-06FF",
    insyriac: "0700-074F",
    inarabicsupplement: "0750-077F",
    inthaana: "0780-07BF",
    innko: "07C0-07FF",
    indevanagari: "0900-097F",
    inbengali: "0980-09FF",
    ingurmukhi: "0A00-0A7F",
    ingujarati: "0A80-0AFF",
    inoriya: "0B00-0B7F",
    intamil: "0B80-0BFF",
    intelugu: "0C00-0C7F",
    inkannada: "0C80-0CFF",
    inmalayalam: "0D00-0D7F",
    insinhala: "0D80-0DFF",
    inthai: "0E00-0E7F",
    inlao: "0E80-0EFF",
    intibetan: "0F00-0FFF",
    inmyanmar: "1000-109F",
    ingeorgian: "10A0-10FF",
    inhanguljamo: "1100-11FF",
    inethiopic: "1200-137F",
    inethiopicsupplement: "1380-139F",
    incherokee: "13A0-13FF",
    inunifiedcanadianaboriginalsyllabics: "1400-167F",
    inogham: "1680-169F",
    inrunic: "16A0-16FF",
    intagalog: "1700-171F",
    inhanunoo: "1720-173F",
    inbuhid: "1740-175F",
    intagbanwa: "1760-177F",
    inkhmer: "1780-17FF",
    inmongolian: "1800-18AF",
    inlimbu: "1900-194F",
    intaile: "1950-197F",
    innewtailue: "1980-19DF",
    inkhmersymbols: "19E0-19FF",
    inbuginese: "1A00-1A1F",
    inbalinese: "1B00-1B7F",
    insundanese: "1B80-1BBF",
    inlepcha: "1C00-1C4F",
    inolchiki: "1C50-1C7F",
    inphoneticextensions: "1D00-1D7F",
    inphoneticextensionssupplement: "1D80-1DBF",
    incombiningdiacriticalmarkssupplement: "1DC0-1DFF",
    inlatinextendedadditional: "1E00-1EFF",
    ingreekextended: "1F00-1FFF",
    ingeneralpunctuation: "2000-206F",
    insuperscriptsandsubscripts: "2070-209F",
    incurrencysymbols: "20A0-20CF",
    incombiningdiacriticalmarksforsymbols: "20D0-20FF",
    inletterlikesymbols: "2100-214F",
    innumberforms: "2150-218F",
    inarrows: "2190-21FF",
    inmathematicaloperators: "2200-22FF",
    inmiscellaneoustechnical: "2300-23FF",
    incontrolpictures: "2400-243F",
    inopticalcharacterrecognition: "2440-245F",
    inenclosedalphanumerics: "2460-24FF",
    inboxdrawing: "2500-257F",
    inblockelements: "2580-259F",
    ingeometricshapes: "25A0-25FF",
    inmiscellaneoussymbols: "2600-26FF",
    indingbats: "2700-27BF",
    inmiscellaneousmathematicalsymbolsa: "27C0-27EF",
    insupplementalarrowsa: "27F0-27FF",
    inbraillepatterns: "2800-28FF",
    insupplementalarrowsb: "2900-297F",
    inmiscellaneousmathematicalsymbolsb: "2980-29FF",
    insupplementalmathematicaloperators: "2A00-2AFF",
    inmiscellaneoussymbolsandarrows: "2B00-2BFF",
    inglagolitic: "2C00-2C5F",
    inlatinextendedc: "2C60-2C7F",
    incoptic: "2C80-2CFF",
    ingeorgiansupplement: "2D00-2D2F",
    intifinagh: "2D30-2D7F",
    inethiopicextended: "2D80-2DDF",
    incyrillicextendeda: "2DE0-2DFF",
    insupplementalpunctuation: "2E00-2E7F",
    incjkradicalssupplement: "2E80-2EFF",
    inkangxiradicals: "2F00-2FDF",
    inideographicdescriptioncharacters: "2FF0-2FFF",
    incjksymbolsandpunctuation: "3000-303F",
    inhiragana: "3040-309F",
    inkatakana: "30A0-30FF",
    inbopomofo: "3100-312F",
    inhangulcompatibilityjamo: "3130-318F",
    inkanbun: "3190-319F",
    inbopomofoextended: "31A0-31BF",
    incjkstrokes: "31C0-31EF",
    inkatakanaphoneticextensions: "31F0-31FF",
    inenclosedcjklettersandmonths: "3200-32FF",
    incjkcompatibility: "3300-33FF",
    incjkunifiedideographsextensiona: "3400-4DBF",
    inyijinghexagramsymbols: "4DC0-4DFF",
    incjkunifiedideographs: "4E00-9FFF",
    inyisyllables: "A000-A48F",
    inyiradicals: "A490-A4CF",
    invai: "A500-A63F",
    incyrillicextendedb: "A640-A69F",
    inmodifiertoneletters: "A700-A71F",
    inlatinextendedd: "A720-A7FF",
    insylotinagri: "A800-A82F",
    inphagspa: "A840-A87F",
    insaurashtra: "A880-A8DF",
    inkayahli: "A900-A92F",
    inrejang: "A930-A95F",
    incham: "AA00-AA5F",
    inhangulsyllables: "AC00-D7AF",
    inhighsurrogates: "D800-DB7F",
    inhighprivateusesurrogates: "DB80-DBFF",
    inlowsurrogates: "DC00-DFFF",
    inprivateusearea: "E000-F8FF",
    incjkcompatibilityideographs: "F900-FAFF",
    inalphabeticpresentationforms: "FB00-FB4F",
    inarabicpresentationformsa: "FB50-FDFF",
    invariationselectors: "FE00-FE0F",
    inverticalforms: "FE10-FE1F",
    incombininghalfmarks: "FE20-FE2F",
    incjkcompatibilityforms: "FE30-FE4F",
    insmallformvariants: "FE50-FE6F",
    inarabicpresentationformsb: "FE70-FEFF",
    inhalfwidthandfullwidthforms: "FF00-FFEF",
    inspecials: "FFF0-FFFF"
};

/* Initialize the Unicode table. */
(function () {
    // Function scope variables.
    var p,  // Loop index.
        s;  // Transformed string.

    for (p in com.deadpixi.kouprey.unicode) {
        if (com.deadpixi.kouprey.unicode.hasOwnProperty(p)) {
            s = com.deadpixi.kouprey.unicode[p].replace(/\w{4}/g, "\\u$&");
            com.deadpixi.kouprey.unicodeExps[p] =
                new RegExp("^[" + s + "]");
            com.deadpixi.kouprey.unicodeExpsRep[p] =
                new RegExp("^[" + s + "]+");

            com.deadpixi.kouprey.unicodeInvExps[p] =
                new RegExp("^[^" + s + "]");
            com.deadpixi.kouprey.unicodeInvExpsRep[p] =
                new RegExp("^[^" + s + "]+");
        }
    }
})();

/* Create the Unicode matching combinator. */
com.deadpixi.kouprey.u = function (block) {
    // Function scope variables.
    var exp;    // The expression we're going to return.

    // Fix the block to account for spaces and such in the block name.
    block = block.replace(/[- _^]+/g, "").toLowerCase();

    if (block.charAt(block.length - 1) === "+") {
        return com.deadpixi.kouprey.unicodeExpsRep[
            block.substring(0, block.length - 1)];
    } else {
        return com.deadpixi.kouprey.unicodeExps[block];
    }
};

/* Create the Unicode inverse matching combinator. */
com.deadpixi.kouprey.U = function (block) {
    // Function scope variables.
    var exp;    // The expression we're going to return.

    // Fix the block to account for spaces and such in the block name.
    block = block.replace(/[- _^]+/g, "").toLowerCase();

    if (block.charAt(block.length - 1) === "+") {
        return com.deadpixi.kouprey.unicodeInvExpsRep[
            block.substring(0, block.length - 1)];
    } else {
        return com.deadpixi.kouprey.unicodeInvExps[block];
    }
};

/* ------------------------------ EXPORTS ------------------------------ */
if (typeof module !== "undefined" && module.exports) module.exports = com;

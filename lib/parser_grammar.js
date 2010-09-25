var com = require("../vendor/kouprey/kouprey");

/* ------------------------------ Grammar ------------------------------ */
var Grammar = {};
with (com.deadpixi.kouprey) {
  with (Grammar) {
    // Forward declarations
    Grammar.Prefix    = Forward("Prefix");
    Grammar.Server    = Forward("Server");
    Grammar.Person    = Forward("Person");
    Grammar.Command   = Forward("Command");
    Grammar.Space     = Forward("Space");
    Grammar.Params    = Forward("Params");
    Grammar.Middle    = Forward("Middle");
    Grammar.Trailing  = Forward("Trailing");
    Grammar.Crlf      = Forward("Crlf");
    
    // Definition
    Grammar.Message   = $([Optional(Prefix), Command, $(Some(Params), "params"), Crlf], "message");
    Grammar.Prefix    = [":", Or(Server, Person), Space];
    Grammar.Server    = [$(/^[-\[\]|_\w\.]+/, "servername"), Not(/^(?:!|@)[-~\[\]|_\w\.]+/)];
    Grammar.Person    = $([$(/^[-\[\]|_\w`\\{}\^]+/, "nick"), Optional(["!", $(/^[-~\[\]|_=\w\.]+/, "user")]), Optional(["@", $(/^[-\[\]|_\/\w\.:]+/, "host")])], "person");
    Grammar.Space     = /^[ ]+/;
    Grammar.Command   = $(/^[a-zA-Z]+|\d{3}/, "command");
    Grammar.Params    = [Space, Optional(Or([":", $(/^[^\0\r\n]*/, "trailing")], $(/^[^:][^ \0\r\n]*/, "middle")))];
    Grammar.Crlf      = /^\r\n/;
  }
}

/* ------------------------------ EXPORTS ------------------------------ */
module.exports = new com.deadpixi.kouprey.Parser(Grammar, "Message", true);

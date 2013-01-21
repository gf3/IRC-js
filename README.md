IRC-js
=====

The best IRC library for node.js


Installation
------------

Via command-line:

``` sh
npm install irc-js
```

Via `package.json`:

``` json
{ "dependencies":
  { "irc-js": "2" }
}
```


Tests
-----

``` sh
make test
```


2.0 Notes
========

We recently released the first beta of IRC-js 2.0.
This release brings many changes, and documentation is not quite ready.

IRC-js 2.0 uses a couple of new ECMAScript features, so currently you must use
the `--harmony` flag when running it.

So, for the adventurous, here's how to get started with 2.0:

``` javascript
/* IRC-js 2.0 provides a set of objects representing IRC entities, such as:
 *    Client    An IRC client, create one of these first.
 *    Message   A client sends and receives instances of this object.
 *    Channel   An IRC channel.
 *    Person    An IRC user.
 * Here follows a simple bot demonstrating basic usage.
 */

var irc = require("irc-js");

/* First, lets create an IRC Client.
 * The quickest way is to use the laziness function `irc.connect()`.
 * It takes an object configuring the bot, and returns a Client instance.
 */
irc.connect({ nick: "bot500" }, function(bot) {
  /* This optional callback means the client has connected.
   * It receives one argument: the Client instance.
   * Use the `join()` method to join a channel:
   */
  bot.join("#irc-js", function(err, chan) {
    /* You get this callback when the client has joined the channel.
     * The argument here is any eventual Error, and the Channel joined.
     */
    if (err) {
      console.log("Could not join channel :(", err);
      return;
    }
    /*
     * Channels also have some handy methods:
     */
    chan.say("Hello!");
  });

  /* You can also access channels like this:
   * `bot.channels.get("#irc-js").say("Hello!");`
   */

  /* Often you want your bot to do something when it receives a specific type
   * of message, or when a message contains something of interest.
   * The `match()` method lets you do both.
   * Look for INVITE messages and join channels:
   */
  bot.match("INVITE", function(msg) {
    /* Here the argument is a Message instance.
     * You can look at the `from` property to see who sent it.
     * The `reply()` method sends a message to the appropriate channel or person:
     */
    msg.reply("Thanks for the invite! On my way.");
    /* Sometimes you need to know about the parameters an IRC message uses.
     * The INVITE message has two: invitee and channel.
     */
    bot.join(msg.params[1]);
  });

  /* You can look for messages matching a regular expression.
   * Each match group is passed as an argument to the callback function.
   */
  bot.match(/\bsomecommand\s+([a-z]+)\s+([0-9]+)/, function(msg, letters, digits) {
    /* Here, the `letters` argument contains the text matched by the first group.
     * And `digits` is the second match. More match groups means more arguments.
     */
  });
});
```


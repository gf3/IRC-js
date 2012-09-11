# IRC-js

An IRC library for node.js

[View Documentation](http://gf3.github.com/IRC-js/).

## Installation

```sh
npm install irc-js
```

## Tests

```sh
make test
```

# 2.0 Beta Notes

We recently released the first beta of IRC-js 2.0.
This release brings many changes, and documentation is not quite ready.
So, for the adventurous, here's how to get started with 2.0:

```js
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
 * It takes a path to a config file, and returns a Client instance.
 * You can find an example config file in the root of this package.
 */
irc.connect("conf.json", function(bot) {
  /* This optional callback means the client has connected.
   * It receives one argument: the Client instance.
   * Use the `join()` method to join a channel:
   */
  bot.join("#runlevel6", function(chan) {
    /* You get this callback when the client has joined the channel.
     * The argument here is a Channel instance.
     * Channels also have some handy methods:
     */
    chan.say("Hello!");
  });

  /* Often you want your bot to do something when it receives a specific type
   * of message, or when a message contains something of interest.
   * The `match()` method lets you do both.
   * Look for invites to channels:
   */
  bot.match(irc.COMMAND.INVITE, function(msg) {
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

  /* Look for messages matching a regular expression: */
  bot.match(/\bice\s+cream\b/, function(msg) {
    msg.reply("Yum, I love ice cream.");
  });

  /* Again, but with match groups: */
  bot.match(/^:google\s+(.+)/, function(msg, query) {
    /* Here, the `query` argument contains whatever the first group matched.
     * If you have more groups, you receive more arguments.
     */
  });
});

```

IRC-js 2.0 uses a couple of shiny new JavaScript features, so you must use the `--harmony` flag when running it.

# coloured-log

This project combines two projects:
[coloured](http://github.com/gf3/coloured)
and
[log.js](http://github.com/visionmedia/log.js).
It extends the functionality provided by `log.js` and colourizes your logs
using `coloured`.

## Installation

    npm install coloured-log

## Examples

Since `coloured-log` simply extends functionality provided by `log.js`, you
can use it just as you would use `log.js` normally.

The following code:

    var Log = require('coloured-log')
      , log = new Log(Log.DEBUG)
    
    log.emergency('Site just went down!');
    log.alert('Cannot connect to datastore!');
    log.critical('Request timeout');
    log.error('Exception thrown by controller');
    log.warning('Couldn\'t find the user\'s session');
    log.notice('Viewname wasn\'t defined');
    log.info('Connected to database');
    log.debug('Hello World');

...will output something like this:

![Example Logging](http://v3n.us/403507afa606f9e59228e54bb74c0c7d.png)

## Special Thanks

Thanks to
[TJ Holowaychuk](http://github.com/visionmedia)
and
[Gianni Chiappetta](http://github.com/gf3)
for making beautifully crafted softwares.

## License

This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>

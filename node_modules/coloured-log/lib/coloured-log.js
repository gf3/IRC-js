var Colour = require('coloured')
  , Log = require('log');

var colours = {};

colours[Log.EMERGENCY]	= { background: 'red',		foreground: 'yellow',	extra: 'bold' };
colours[Log.ALERT]		= { background: 'yellow',	foreground: 'red',		extra: 'bold' };
colours[Log.CRITICAL]	= { background: 'yellow',	foreground: 'black' };
colours[Log.ERROR]		= { foreground: 'red' };
colours[Log.WARNING]	= { foreground: 'yellow' };
colours[Log.NOTICE]		= { foreground: 'cyan' };
colours[Log.INFO]		= { foreground: 'green' };
colours[Log.DEBUG]		= {};

var ColouredLog = exports = module.exports = function ColouredLog(level, stream) {
	Log.call(this, level, stream);
};

ColouredLog.prototype = new Log;

ColouredLog.prototype.colours = colours;

// Need to inherit levels too
for (var level in Log) {
	ColouredLog[level] = Log[level];
}

ColouredLog.prototype.log = function (levelStr, msg) {
	if (Log[levelStr] <= this.level) {
		var message = ''
			+ '[' + new Date().toUTCString() + ']'
			+ Colour.extra('bold')
			+ ' ' + levelStr
			+ Colour.extra('clear');

		message += new Array(52 - message.length).join(' ');

		message = Colour.colourise(message, this.colours[Log[levelStr]]);

		message += Colour.extra('clear')
			+ msg
			+ Colour.extra('clear')
			+ '\n';

		this.stream.write(message);
	}
};

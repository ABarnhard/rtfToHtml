'use strict';

var parser    = require('./parser/parser');
var formatter = require('./formatters/html-formatter');
var fs        = require('fs');
var _options = {
	margins: [0, 0, 0, 0],
    vertAlign: 'top'
};

module.exports = {
	convertRtfFile: function(src, cb, options) {
		options = options || {};
		Object.keys(options).forEach(function(key) {
			_options[key] = options[key];
		});

		fs.readFile(src, 'utf8', function(err, data) {
			if (err) { return cb(err); }
			var parsedRtf = parser.parse(data);
			var htmlString = formatter(parsedRtf, _options);
			cb(null, htmlString);
		});
	}
};

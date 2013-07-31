var Settings = require('settings');
var config = new Settings(require('../config'));
var elastical = require('elastical');
var client = new elastical.Client(config.es.host);

var index = config.es.index;

client.deleteIndex(index, function(err){
	console.log(arguments);
});


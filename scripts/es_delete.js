var elastical = require('elastical');
var client = new elastical.Client();
var index = 'xtag';

client.deleteIndex(index, function(err){
	console.log(arguments);	
});


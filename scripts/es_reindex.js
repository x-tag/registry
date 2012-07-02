var elastical = require('elastical');
var client = new elastical.Client();
var index = 'xtag';


var createMapping = function(){
	client.putMapping(index, 'element', require('./es_mapping.js'), function(err, res){
		console.log("ES: put mapping response, ", err, res);
		//TODO: get all database items and reindex them
	});
}

client.deleteIndex(index, function(err){
	console.log(err);
	client.createIndex(index, {}, function(err, idx, data){
		if (err){
			console.log(err);
		}else{
			createMapping();
		}
	});
});


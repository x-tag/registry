var path = require('path');

module.exports.getJson = function(options,  callback){
	var http = options.https ? require('https') : require('http');
	this.options = options;
	http.get({
			host: options.host,
			path: options.path
		}, function(res){
			res.setEncoding('utf8');
			if (res.statusCode == 200){
				var data = '';
				res.on('data', function(chuck){
					data += chuck;
				});
				res.on('end', function(){
					try {
						var issues = JSON.parse(sanitize(data).xss());
						callback(null, issues).bind(this);
					} catch(e) { 
						callback("error parsing json: " + e + "\n" + data, null);
					}
				});
			} else {
				callback("request returned:" + res.statusCode, null);
			}
		}).on('error', function(err){	
			callback(err,null);
		});
	}
}
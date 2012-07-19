var path = require('path'),
	sanitize = require('validator').sanitize;

module.exports.getJson = function(options,  callback){
	var http = options.https ? require('https') : require('http');
	console.log("[http-request.getJson]", options);
	if (options.path[0] != '/') options.path = '/' + options.path;
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
						var json = JSON.parse(sanitize(data).xss());
						callback(null, json);
					} catch(e) { 
						callback("error parsing json: " + e + "\n" + data, null);
					}
				});
			} else {
				callback("[http-request.getJson] status:" + res.statusCode + " " + options.path, null);
			}
	}).on('error', function(err){	
			callback("[http-request.getJson] "+err, null);
	});
}

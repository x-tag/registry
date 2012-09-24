var path = require('path'),
	sanitize = require('validator').sanitize;

function getJson(options,  callback){
	getFile(options, function(err, file){
		if (err) return callback(err, file);
		try {
			var json = JSON.parse(sanitize(file).xss());
		} catch(e) { 
			return callback("error parsing json: " + e + "\n" + file, null);
		}
		callback(null, json);
	});	
}

function getFile(options, callback){
	var http = options.https ? require('https') : require('http');
	console.log("[http-request.get]", options);
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
					callback(null, data);
				});
			} else {
				callback("[http-request.get] status:" + res.statusCode + " " + options.path, null);
			}
	}).on('error', function(err){	
			callback("[http-request.get] "+err, null);
	});
}
module.exports.getFile = getFile;
module.exports.getJson = getJson;


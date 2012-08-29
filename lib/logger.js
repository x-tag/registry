
module.exports.postCommitLogger = function(req, res, next){
	var name = 'none';	
	try {
		var payload = JSON.parse(req.body.payload);
		if (payload.repository && payload.repository.owner && payload.repository.owner.name){
			name = payload.repository.owner.name;
		}
	} catch(e){
		console.log("INVALID payload:" ,  e, req.body);
	}
	
	var fn = function(msg){
		var XTagLog = global.db.import(__dirname + '/../models/xtagimportlog');		
		XTagLog.createEntry(name, msg);
	}
	req.on('log', fn);	
	next();
}

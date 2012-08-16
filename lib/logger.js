
module.exports.postCommitLogger = function(req, res, next){

	var name = 'none';
	console.log("init commitLogger");
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
		var log = XTagLog.create({
			user: name, 
			entry: msg
		}).success(function(entry){
			console.log("saved entry:", name);		
		}).error(function(err){
			console.log("error saving entry:", err);
		});
	}
	req.on('log', fn);	
	next();
}

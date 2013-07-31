var _ = require('underscore'),
	path = require('path');

module.exports.reqLogListener = function(req, res, next){
	try{
		var name = 'system';
		try {
			if (req.body && req.body.payload){
				var payload = JSON.parse(req.body.payload);
				if (payload.repository && payload.repository.owner && payload.repository.owner.name){
					name = payload.repository.owner.name;
				}
			} else if(req.query.repo){
				name = req.query.repo.split('/')[3];
			}
		} catch(e){
			XTagLog.createEntry(name, "error: " + JSON.stringify(e));
		}

		var fn = function(){
			var XTagLog = global.db.import(path.join(__dirname, '/../models/xtagimportlog'));
			var msg = _.toArray(arguments).map(function(item){
				if (typeof item == 'string') return item;
				return JSON.stringify(item);
			}).join(" ");
			XTagLog.createEntry(name, msg);
		}
		req.on('log', fn);
	} catch(e){
		console.log("Error reqLogListener:", e);
		throw e;
	}
	next();
};

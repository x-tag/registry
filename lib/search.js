var Settings = require('settings'),
	config = new Settings(require('../config')),
	es_client = new elastical.Client(config.es.host, 
		{ port: config.es.port }),
	sequelize = new Sequelize(config.db.database, 
		config.db.user, config.db.password, { host: config.db.host });

module.exports.findTags = function(query, callback){

	es_client.search(query, function(err, es_result, raw){
		console.log("ES search response", err, es_result);

		if (es_result && es_result.hits && es_result.hits.length){
			
			var ids = es_result.hits.map(function(h){ return h['_id']; });
			var query = "SELECT e.id, e.name, e.tag_name, e.url, e.category, " +
				"e.images, e.compatibility, e.demo_url, e.version, " + 
				"e.description, r.repo, r.title as repo_name, r.author, " +
				"r.forked, r.forked_from, r.issues FROM XTagElements e " +
				"JOIN XTagRepoes r ON e.`XTagRepoId` = r.id " +
				"WHERE e.id IN (" + ids.join(',')  + ")";

			var query = sequelize.query(query, {}, {raw: true});
			query.success(function(results){
				if (results && results.length){
					callback(null, { 
						data: es_result.hits.map(function(hit){
							// reorder to es sort
							var id = hit['_id'];
							for (var i = 0; i < results.length; i++ ){
								if (id == results[i].id){
									results[i].compatibility = JSON.parse(results[i].compatibility);
									results[i].category = results[i].category.split(',');
									results[i].images = results[i].images.split(',');
									results[i].versions = hit['_source'].versions;
									results[i].forked = results[i].forked ? true : false;
									return results[i];
								}
							}
						}
					)});
				} else {
					console.log("error finding IDs in DB", ids);
					callback("error finding IDs in DB", []);
				}	

			});
			query.failure(function(err){
				callback(err, []);
			});
		} else {
			callback(null, []);
		}
	});
}
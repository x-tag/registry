var Settings = require('settings'),
	config = new Settings(require('../config')),
	elastical = require('elastical'),
	Sequelize = require('sequelize'),
	es_client = new elastical.Client(config.es.host,
		{ port: config.es.port }),
	sequelize = new Sequelize(config.db.name,
		config.db.user, config.db.password, { host: config.db.host });

module.exports.findTags = function(query, callback){

	es_client.search(query, function(err, es_result, raw){

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
					callback(null, es_result.hits.map(function(hit){
							// reorder to es sort
							var id = hit['_id'];
							for (var i = 0; i < results.length; i++ ){
								if (id == results[i].id){
									results[i].compatibility = JSON.parse(results[i].compatibility);
									results[i].category = results[i].category.split(',');
									results[i].images = results[i].images.split(',');
									results[i].versions = hit['_source'].versions;
									results[i].forked = results[i].forked;
									results[i].issues = results[i].issues ? JSON.parse(results[i].issues) : null;
									return results[i];
								}
							}
						}
					).filter(function(item){
						return !!item;
					}));
				} else {
					console.log("error finding IDs in DB", ids);
					callback("error finding IDs in DB", []);
				}

			});
			query.failure(function(err){
				console.log('query failure: ', err);
				callback(err, []);
			});
		} else {
			console.log('Found 0 results: ', es_result, err);
			callback(null, []);
		}
	});
}
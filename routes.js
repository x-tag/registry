module.exports = function Routes(app){

	console.log("init routes");

	var mw = require('./lib/middleware'),
		Settings = require('settings'),
		config = new Settings(require('./config')), 
		logger = require('./lib/logger'), 
		path = require('path');

	var XTagElement = global.db.import(__dirname + '/models/xtagelement');
	var XTagRepo = global.db.import(__dirname + '/models/xtagrepo');
	var XTagImportLog = global.db.import(__dirname + '/models/xtagimportlog');

	app.use('/customtag', logger.postCommitLogger);

	app.post('/customtag', mw.validateGitHubData, function(req, res){
		req.emit('log','github post-commit hook data passed validation');
		res.send(200); // respond early to github

		console.log("Processing webhook data from:", req.data.github.repository.url);

		XTagRepo.addUpdateRepo(req, function(err, repo){
			if (err) {
				console.log("addUpdateRepo error:", err);
			} else {
				req.data.github.repoId = repo.id;
				req.data.github.repository.forked_from = repo.forked_from;
				req.data.github.branchUrl = req.data.github.repository.url + "/" + path.join("tree", req.data.github.ref.split('/')[2]);
				XTagElement.findElements(req);
			}
		});

	});

	app.get('/search', function(req, res){
		console.log("searching",req.query);		
		var query = {
			index: config.es.index,
			type: 'element',
			filter: { 'and' : []}
		};
		if (req.query.query){
			query.query = {
				"bool":{
					"should":[
						{ 
							"text": { "name": { "query": req.query.query, "boost": 3.0 }}
						},
						{ 
							"text": { "description": { "query": req.query.query, "boost": 2.0 }}
						},
						{ 
							"text": { "all": { "query": req.query.query, "boost": 1.0 }}
						},
					]
				}
			}
		}	
		if (req.query.category){		
			query.filter.and.push({
				"terms": { "categories": req.query.category.split(',') }
			});
		}
		if (req.query.compatibility){		
			_.each(req.query.compatibility, function(item, key){
				var range = { "range" : {} };
				range["range"]["compatibility." + key] = {
					"lte": Number(item),
				}
				query.filter.and.push(range);
			});
		}
		if (req.query.forked && req.query.forked == 'true'){
			// no filter?
		} else {
			query.filter.and.push({
				"term": { "forked": "false" }
			});
		}
		if (req.query.author){
			query.filter.and.push({
				"term": { "author": req.query.author }
			});
		}
		if (!req.query.query){
			query.size = 100;
			query.sort = [
					{ "created_at": { "order": "desc" } }
				]
		}
		if (!req.query.showDisabled){
			query.filter.and.push({
				"term": { "visible": "true" }
			});
		}

		require('./lib/search').findTags(query, function(err, tags){
			if (err){
				console.log("[/search/]"+err);
				res.json({ data: [], error: err }, 500);
			} else {
				res.json({ data: tags}, 200);
			}
		});
	});
	
	app.get('/logs/:user', function(req, res){
		console.log("df", req.param('user'));
		XTagImportLog.findAll({where: { user: req.param('user') }, order: 'createdAt DESC', limit: 500})
		.success(function(logs){
			res.json({ log: logs}, 200);
		});
	});
}
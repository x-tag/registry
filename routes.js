module.exports = function Routes(app, db){

	console.log("init routes");

	var mw = require('./lib/middleware'),
		Settings = require('settings'),
		config = new Settings(require('./config')),
		_ = require('underscore'),
		path = require('path');

	var XTagElement = db.import(__dirname + '/models/xtagelement');
	var XTagRepo = db.import(__dirname + '/models/xtagrepo');
	var XTagImportLog = db.import(__dirname + '/models/xtagimportlog');

	app.post('/customtag', mw.validateGitHubData, function(req, res){
		req.emit('log','======================================================');
		req.emit('log','=== Github post-commit hook data passed validation ===');
		req.emit('log','======================================================');
		res.send(200); // respond early to github

		req.emit('log','Processing webhook data from:', req.data.github.repository.url);
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

	app.get('/', function(req, res){
		res.render('search', {});
	});

	app.get('/search', function(req, res){
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
				req.emit('log', JSON.stringify(err));
				res.json({ data: [], error: err }, 500);
			} else {
				res.json({ data: tags}, 200);
			}
		});
	});

	// '/:user/:repo/:tagname/:version/demo/:path'
	app.get(/\/([\w\-]*)\/([\w\-]*)\/([\w\-]*)\/([\w\-]*)\/demo\/?(.*)/, function(req, res) {
		var asset_path = req.params[4];
		if (path.basename(asset_path) == 'x-tag.js') {
			// x-tag.js is automatically included in the demo page
			res.send('', { 'Content-Type': 'application/javascript' });
			return;
		}

		// :TODO: unless sequelize has lazy query-building that already does it...
		// :TODO: these 3 queries ought to be replaced with a single query using joins
		XTagRepo.find({
			where: { author: req.params[0], title: req.params[1] }
		}).success(function(repo) {

			var tag_query = { tag_name: req.params[2] };
			if (req.params[3] != 'latest') {
				tag_query.version = req.params[3];
			}

			repo.getXTagElements({
				where: tag_query,
				order: 'id DESC',
				limit: 1
			}).success(function(tags) {
				var tag = tags[0];
				if (!tag) { return res.send('Element Not Found', null, 404); }

				var asset_query = (asset_path) ? { path: asset_path } : { is_demo_html: true };
				tag.getXTagDemoAssets({
					where: asset_query,
					limit: 1
				}).success(function(assets) {
					var asset = assets[0];
					if (!asset) { return res.send('Asset not found at '+asset_path, null, 404); }

					// best-guess content-type from the file extension
					var content_type = require('mimetype').lookup(path.basename(asset.path));
					var content = new Buffer(asset.content, 'base64');
					if (/^text|^application/.test(content_type)) {
						content = content.toString();
					}
				
					tag.category = tag.category.split(',');

					if (asset.is_demo_html) {
						res.render('demo', {
							demo: content,
							tag_info: JSON.stringify(tag),
							author: repo.author,
							base_url: path.join(req.path, tag.demo_url) + '/'
						});
					} else {
						res.send(content, { 'Content-Type': content_type });
					}
				});
			});
		});
	});
	
	app.get('/logs/:user', function(req, res){
		XTagImportLog.findAll({where: { user: req.param('user') }, order: 'createdAt DESC', limit: 500})
		.success(function(logs) {
			res.render('userlog', {logs: logs});
		});
	});
};

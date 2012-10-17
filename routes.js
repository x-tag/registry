module.exports = function Routes(app, db){

	console.log("init routes");

	var mw = require('./lib/middleware'),
		Settings = require('settings'),
		config = new Settings(require('./config')),
		_ = require('underscore'),
		path = require('path'), 
		Sequelize = require('sequelize');
		
	var XTagElement = db.import(__dirname + '/models/xtagelement');
	var XTagElementAsset = db.import(__dirname + '/models/xtagelementasset');
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

	

	//'/:user/:repo/:tagname/:version'
	/*app.get('/:user/:repo/:tagname', function(req, res){
		res.render('tag_detail', {});

	});*/

///assets\/(\d+)\/(.*)/
	app.get(/assets\/(\d+)\/(.*)/, function(req, res){
		// return all other assets from this route
		// find asset by req.params.tagId and req.params[1] 

		//beware of sql injection 
		//must sanitize
		var query = 'SELECT a.* '+
		'FROM XTagRepoes r '+
		'JOIN XTagElements e on r.id = e.XTagRepoId ' + 
		'JOIN XTagElementAssets a on e.id = a.XTagElementId ' + 
		'WHERE a.XTagElementId=' + Number(req.params[0]) + 
		' AND a.path="'+ req.params[1] +'" LIMIT 1';

console.log("DEBUG:", query);

		query = db.query(query, {}, {raw: true});
		query.success(function(asset){
			
			if (asset.length){
				asset = asset[0];
				var content_type = require('mimetype').lookup(path.basename(asset.path));
				var content = new Buffer(asset.content, 'base64');
				if (/^text|^application/.test(content_type)) {
						content = content.toString();
				}
				res.send(content, { 'Content-Type': content_type });
			}
			else
			{
				res.render('404', {});
			}
			
		}).failure(function(err){
			res.json({err:err}, 500);
		});

	});

	// we can do something very similar for the test runner aka  /test
	
	app.get(/([\w-_]+)\/([\w-_]+)\/([\w-_]+)\/(\d\.\d\.\d)?\/?demo/, function(req, res) {
	//app.get('/:user/:repo/:tagname/:version/demo', function(req, res) {
		
		//beware of sql injection 
		//must sanitize
		var query = 'SELECT a.* '+
		'FROM XTagRepoes r '+
		'JOIN XTagElements e on r.id = e.XTagRepoId ' + 
		'JOIN XTagElementAssets a on e.id = a.XTagElementId ' + 
		'WHERE r.author="' + req.params[0] + 
		'" AND r.title="' + req.params[1] + 
		'" AND e.tag_name="' + req.params[2] + 
		'" AND a.path="demo/demo.html" LIMIT 1';

		query = db.query(query, {}, {raw: true});
		query.success(function(demoPage){
			
			if (demoPage.length){
				demoPage = demoPage[0];
				var content = new Buffer(demoPage.content, 'base64');
				res.render('demo', { demo: content });
			}
			else
			{
				res.render('404', {});
			}
			
		}).failure(function(err){
			res.render('500', {err:err});
		});

	});
	
	app.get('/logs/:user', function(req, res){
		XTagImportLog.findAll({where: { user: req.param('user') }, order: 'createdAt DESC', limit: 500})
		.success(function(logs) {
			res.render('userlog', {logs: logs});
		});
	});
};

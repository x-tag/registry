module.exports = function Routes(app, db){

	console.log("init routes");

	var path = require('path'),
		fs = require('fs'),
		http = require('https'),
		mw = require('./lib/middleware'),
		Settings = require('settings'),
		config = new Settings(require('./config')),
		github = require('./lib/github'),
		_ = require('underscore'),
		marked = require('marked'),
		semver = require('semver'); 
		
	marked.setOptions({
		gfm: true,
		pedantic: false,
		sanitize: false,
	});

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
	app.get(/([\w-_]+)\/([\w-_]+)\/([\w-_]+)\/(\d\.\d\.\d)?\/?view/, function(req, res){
		var user = req.params[0], 
			repo = req.params[1], 
			tag = req.params[2], 
			version = req.params[3];

		XTagElement.getElementId(user, repo, tag, version, function(err, id){

			if (err){
				return res.render('500', {err:err});
			}
			
			if (!id){
				return res.render('404', 404);
			}

			// todo: improve this.... fetch specific files
			// how to efficiently query for readme, xtag.json and theme files?
			XTagElementAsset.getAllAssets(id, function(err, files){

				if (err){
					return res.render('500', {err:err});
				}

				if (!files){
					console.log("error: Unable to find any files for element:", id);
					return res.render('404', 404);
				}

				// xtag.json
				var xtagJson = files.filter(function(file){
					return file.path == 'xtag.json';
				});

				if (xtagJson.length==1){
					xtagJson = JSON.parse(new Buffer(xtagJson[0].content, 'base64').toString());
					// perform a little normalization/cleanup
					if (xtagJson.categories){
						xtagJson.categories = xtagJson.categories.filter(function(c){
							return c.length > 0;
						});
					}
					if (xtagJson.documentation){
						// take any keys that are not nested in a tag name
						// and put them into the base tag name
						Object.keys(xtagJson.documentation).forEach(function(key){
							if (key != 'x-'){
								if(!xtagJson.documentation[xtagJson.tagName]){
									xtagJson.documentation[xtagJson.tagName] = {};
								}
								xtagJson.documentation[xtagJson.tagName][key] = xtagJson.documentation[key];
								delete xtagJson.documentation[key];
							}
						});
						
					}
				}
				else {
					res.render('404', 404);
					return;
				}

				// README.md
				var readme = files.filter(function(file){
					return file.path == 'README.md';
				});

				if (readme.length==1){
					readme = marked(new Buffer(readme[0].content, 'base64').toString());

					//markdown wraps everything in p tags, which messes up x-tags, 
					//replace p with div
					var rx = new RegExp('<p>(<' + xtagJson.tagName + '(?:.|[\\s])+?</' + xtagJson.tagName + '>)\\s+?</p>', 'gmi');
					readme = readme.replace(rx, function(match, group, offset){
						return "<div class='x-tag-element'>" + group + "</div>";
					});
				}
				else {
					readme = '';
				}

				// Themes
				var themes = files.filter(function(file){
					return file.path.indexOf('themes/')==0;
				});

				if (themes.length>0){
					themes = themes.map(function(theme){
						return theme.file_name;
					});
				}
				else {
					themes = [];
				}

				res.render('tag_detail', { 
					readme: readme, 
					xtagJson: xtagJson,
					themes: themes, 
					elementId: id,
					xtagVersion: req.query.xtagVersion || xtagJson.xtagVersion || '',
					resourceName: (xtagJson.tagName || '').replace('x-','')
				});
			});
		});
	});

	
	app.get(/([\w-_]+)\/([\w-_]+)\/([\w-_]+)\/(\d\.\d\.\d)?\/?demo/, function(req, res) {
		var user = req.params[0], 
				repo = req.params[1], 
				tag = req.params[2], 
				version = req.params[3];

		XTagElement.getElementId(user, repo, tag, version, function(err, id){

			if (err){
				return res.render('500', {err:err});
			}
			
			if (!id){
				return res.render('404', 404);
			}

			// todo: improve this.... fetch specific files
			// how to efficiently query for readme, xtag.json and theme files?
			XTagElementAsset.getAllAssets(id, function(err, files){

				if (err){
					return res.render('500', {err:err});
				}

				if (!files){
					console.log("error: Unable to find any files for element:", id);
					return res.render('404', 404);
				}

					// xtag.json
				var xtagJson = files.filter(function(file){
					return file.path == 'xtag.json';
				});

				if (xtagJson.length==1){
					xtagJson = JSON.parse(new Buffer(xtagJson[0].content, 'base64').toString());
					// perform a little normalization/cleanup
					if (xtagJson.categories){
						xtagJson.categories = xtagJson.categories.filter(function(c){
							return c.length > 0;
						});
					}
				}
				else {
					res.render('404', 404);
					return;
				}

				// DEMO
				var demo = files.filter(function(file){
					return file.path == xtagJson.demo + '/demo.html';
				});

				if (demo.length==1){
					demo = new Buffer(demo[0].content, 'base64').toString();
				}
				else {
					demo = '';
				}

				// Themes
				var themes = files.filter(function(file){
					return file.path.indexOf('themes/')==0;
				});

				if (themes.length>0){
					themes = themes.map(function(theme){
						return theme.file_name;
					});
				}
				else {
					themes = [];
				}

				res.render('demo', { 
					demo: demo, 
					xtagJson: xtagJson,
					themes: themes, 
					elementId: id,
					xtagVersion: req.query.xtagVersion || xtagJson.xtagVersion || '',
					resourceName: (xtagJson.tagName || '').replace('x-','')
				});
			});
		});
	});

	app.get(/assets\/(\d+)\/(.*)/, function(req, res){
		// find asset by req.params.tagId and req.params[1]

		var assetPath = /^[\w-_\.\/]+$/.test(req.params[1]) ? req.params[1] : '';

		var query = 'SELECT a.* '+
		'FROM XTagRepoes r '+
		'JOIN XTagElements e on r.id = e.XTagRepoId ' + 
		'JOIN XTagElementAssets a on e.id = a.XTagElementId ' + 
		'WHERE a.XTagElementId=' + Number(req.params[0]) + 
		' AND a.path="'+ assetPath +'" LIMIT 1';

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
			else {
				res.render('404', {});
			}
			
		}).failure(function(err){
			res.json({err:err}, 500);
		});
	});

	app.get('/js/x-tag.js', function(req, res){
		
		const latestXTagLib = "./public/js/x-tag/x-tag." +  config.xtagLibVersion + ".js";		
		var xtagFilePath = latestXTagLib;

		// If master then pull from github x-tag master
		if (req.query.v == 'master'){
			github.getFile('mozilla','x-tag','x-tag.js', 'master', function(err, file){
				if (err){
					res.render('500', {err:err});
				} 
				else {
					file = JSON.parse(file);
					res.send(new Buffer(file.content, file.encoding).toString(), {'Content-Type':'text/javascript'});
					res.end();
				}
			});
		} 
		else {

			if (semver.valid(req.query.v)){
				xtagFilePath = latestXTagLib.replace(config.xtagLibVersion, req.query.v);
			}

			path.exists(xtagFilePath, function(exists){
				if (!exists){
					console.log("[error-/js/x-tag.js] - unable to find x-tag library: ", xtagFilePath);
					xtagFilePath = latestXTagLib;
				}

				fs.readFile(xtagFilePath, function(err, data){
					if (err){
						res.render('500', {err:err});
					}
					else {
						res.send(data, {'Content-Type':'text/javascript'});
						res.end();
					}
				});
			});
		}
	});
	
	app.get('/logs/:user', function(req, res){
		XTagImportLog.findAll({where: { user: req.param('user') }, order: 'createdAt DESC', limit: 500})
		.success(function(logs) {
			res.render('userlog', {logs: logs});
		});
	});

	app.use(function(req, res){
	  res.render('404', {});
	});

	app.use(function(err, req, res, next){
	  console.error("500", err, err.stack);
	  res.render('500', {err:err});
	});
};


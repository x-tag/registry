var path = require('path'),
	_ = require('underscore'),
	express = require('express'),
	app = express.createServer(),
	exgf = require('amanda'),
	elastical = require('elastical'),	
	Sequelize = require('sequelize'),
	sanitize = require('validator').sanitize,
	Settings = require('settings');

var config = new Settings(require('./config'));

console.log("App starting: ", process.env, " db:",config.db.host, " es:", config.es.host);

var sequelize = new Sequelize(config.db.database, 
	config.db.user, config.db.password, { host: config.db.host });

var es_client = new elastical.Client(config.es.host, 
	{ port: config.es.port });

var XTagRepo 	= sequelize.import(__dirname + '/models/xtagrepo');
var XTagElement = sequelize.import(__dirname + '/models/xtagelement')
XTagRepo.hasMany(XTagElement);
sequelize.sync();

app.disable('view cache');
app.use(express.logger());
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

app.post('/customtag', function(req, res){
	var gitHubData = JSON.parse(sanitize(req.body.payload).xss() || '{}');
	exgf.validate(gitHubData, require('./lib/schemas').github, function(err){
		if (err){
			console.log("deal breaker:", gitHubData);
			return res.send(400);
		}

		// only analyize git tags that start with xtag
		if (gitHubData.ref.indexOf('refs/tags/xtag')!=0){
			console.log("Ignoring webhook for ", gitHubData.repository.url, gitHubData.ref);
			return res.send(200);
		}

		res.send(200); // respond early to github

		console.log("Processing webhook data from:", gitHubData.repository.url);

		XTagRepo.addUpdateRepo(gitHubData, function(err, repo){
			if (err) {
				console.log("addUpdateRepo error:", err);
			} else {
				gitHubData.repoId = repo.id;
				gitHubData.repository.forked_from = repo.forked_from;
				gitHubData.branchUrl = gitHubData.repository.url + "/" + path.join("tree", gitHubData.ref.split('/')[2]);
				XTagElement.findElements(gitHubData);
			}
		});
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


app.listen(process.env.PORT || process.env.VCAP_APP_PORT || 3000);

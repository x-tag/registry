var path = require('path'),
	express = require('express'),
	app = express.createServer(),
	exgf = require('amanda'),
	elastical = require('elastical'),	
	Sequelize = require('sequelize'),
	Settings = require('settings');

var config = new Settings(require('./config'));

console.log("App starting: ", process.env, " db:",config.db.host, " es:", config.es.host);

var sequelize = new Sequelize(config.db.database, 
	config.db.user, 
	config.db.password, { host: config.db.host });

var es_client = new elastical.Client(config.es.host, 
	{ port: config.es.port });

var XTagRepo = sequelize.import(__dirname + '/models/xtagrepo');
var XTagElement = sequelize.import(__dirname + '/models/xtagelement')
XTagRepo.hasMany(XTagElement);
sequelize.sync();

app.use(express.logger());
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

app.post('/customtag', function(req, res){
	var gitHubData = JSON.parse(req.body.payload || '{}');
	exgf.validate(gitHubData, require('./schemas').github, function(err){
		if (err){
			console.log("deal breaker:", gitHubData);
			return res.send(400);
		}

		// only analyize git tags that start with xtag
		if (gitHubData.ref.indexOf('refs/tags/xtag')!=0){
			console.log("Ignoring webhook for ", gitHubData.repository.url, gitHubData.ref);
			return res.send(200);
		}

		res.send(200); // respond early to gihub

		console.log("Processing webhook data from:", gitHubData.repository.url);

		addUpdateRepo(gitHubData, function(err, repoId){
			if (err) {
				console.log("addUpdateRepo error:", err);
			} else {
				gitHubData.repoId = repoId;
				gitHubData.branchUrl = path.join(gitHubData.repository.url, "tree", gitHubData.ref.split('/')[2]);
				findControls(gitHubData);
			} 
		});
	});
});


app.get('/search', function(req, res){
	console.log("searching",req.query);
	var query = {
		index: config.es.index,
		type: 'element'
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
						"text": { "all": { "query": req.query.query, "boost": 1.5 }}
					},
				]
			}
		}
	}
	if (req.query.category){
		query.filter = {
			"terms": { "categories": req.query.category.split(',') }
		}
	}

	es_client.search(query, function(err, es_result, raw){
		console.log("ES search response", err, es_result, raw);
		if (es_result && es_result.hits && es_result.hits.length){
			var ids = es_result.hits.map(function(h){ return h['_id']; });
			var query = "SELECT e.id, e.name, e.tag_name, e.url, e.category, " +
				"e.images, e.compatibility, e.demo_url, e.version, " + 
				"e.description, r.repo, r.title as repo_name, r.author FROM xtagelements e " +
				"JOIN xtagrepoes r ON e.`XTagRepoId` = r.id " +
				"WHERE e.id IN (" + ids.join(',')  + ")";		
			sequelize.query(query, {}, {raw: true}).success(function(results){

				res.json({ data: ids.map(function(id){
					// reorder to es sort
					for (var i = 0; i < results.length; i++ ){
						if (id == results[i].id){
							results[i].compatibility = JSON.parse(results[i].compatibility);
							results[i].category = results[i].category.split(',');
							results[i].images = results[i].images.split(',');
							return results[i];
						}
					}
				})}, 200);

			}).failure(function(err){
				res.json(err, 400);
			});
		} else{
			res.json({ data: []}, 200);
		}
	});
});


var addUpdateRepo = function(ghData, callback){	

	XTagRepo.find({where: {repo: ghData.repository.url}}).success(function(repo){		
		if (repo){
			repo.updateAttributes({ 
				title: ghData.repository.name,
				description: ghData.repository.description,
				email: ghData.repository.owner.email,			
			}).error(function(err){				
				callback("error updating repo: " + ghData.repository.url + ", " + err, null);
			}).success(function(){
				console.log("repo " + ghData.repository.url + " updated");
				callback(null, repo.id);
			});
		} else {
			repo = XTagRepo.create({
				repo: ghData.repository.url,
				title: ghData.repository.name, 
				description: ghData.repository.description,
				author: ghData.repository.owner.name,
				email: ghData.repository.owner.email,		
			}).error(function(err){				
				callback("error creating repo: " + ghData.repository.url + ", " + err, null);				
			}).success(function(){
				console.log("repo " + ghData.repository.url + " created");
				callback(null, repo.id);
			});
		}
	});

}

var findControls = function(ghData){

	var baseRepoUrl = buildXtagJsonUrl(ghData.repository.url, ghData.ref);
	var onComplete = function(err, xtagJson){
		if (err){
			console.log("error fetching xtag.json:", err);
			//contact user?
			return;
		}

		if (xtagJson.xtags){
			xtagJson.xtags.forEach(function(tagUrl){
				var tmpUrl = path.join(baseRepoUrl, tagUrl);
				fetchXtagJson(tmpUrl, function(err, xtagJson){
					if (xtagJson) xtagJson.controlLocation = path.join(ghData.branchUrl, tagUrl);
					onComplete(err, xtagJson);
				});
			});
		} 

		exgf.validate(xtagJson, require('./schemas').xtagJson, function(err){
			if (err) {
				if (!xtagJson.xtags){						
					console.log("invalid xtag.json", err, "\n-------\n",xtagJson, "\n-------\n");
				}
				return;
			}
			processXtagJson(ghData, xtagJson);
		});
	}

	try {
		fetchXtagJson(baseRepoUrl, function(err, xtagJson){
			if (xtagJson) xtagJson.controlLocation = ghData.branchUrl;
			onComplete(err, xtagJson);
		});
	} catch(e){
		console.log("error in fetchXtagJson", e);
	}

}

var processXtagJson = function(repoData, xtagJson){
	
	console.log("processing control\n-------\n", xtagJson, "\n-------\n");
	// create XTagElements
	// check to see if Element already exists
	// query by version, tagName && XTagRepoId
	XTagElement.find({ where: { 
		version: xtagJson.version, 
		tag_name: xtagJson.tagName,
		XTagRepoId: repoData.repoId
	}}).success(function(tag){
		if (!tag){
			XTagElement.create({
				name: xtagJson.name,
				tag_name: xtagJson.tagName, 
				description: xtagJson.description,
				category: (xtagJson.categories || []).join(','),
				images: (xtagJson.images || []).join(','),
				compatibility: JSON.stringify(xtagJson.compatibility),
				demo_url: xtagJson.demo,
				url: xtagJson.controlLocation,
				version: xtagJson.version,
				revision: repoData.after,
				ref: repoData.ref,
				raw: JSON.stringify(xtagJson),
				XTagRepoId: repoData.repoId
			}).success(function(tag){
				console.log("saved control", xtagJson.name);
				//index into ES
				es_client.index(config.es.index, 'element', {
					name: tag.name, 
					tag_name: tag.tag_name,
					description: tag.description, 
					categories: xtagJson.categories, 
					compatibility: xtagJson.compatibility, 
					created_at: tag.createdAt,
					all: tag.name + " " + tag.tag_name + " " + tag.description
				}, 
				{ 
					id: tag.id.toString(), refresh:true 
				}, 
				function(err, res){
					console.log("ES response", err, res);
				});
			}).error(function(err){
				console.log("error saving control", err);
			});
		} else{
			console.log("control already exists");
		}
	}).error(function(err){
		console.log("error finding xtagelement", err);
	});
	
}

var buildXtagJsonUrl = function(repoUrl, ref){
	var xtagJsonUrl = "/{user}/{repo}/{tag}";
	var urlParts = repoUrl.split('/');
	var branchParts = ref.split('/');
	return xtagJsonUrl.replace('{user}', urlParts[urlParts.length-2])
		.replace('{repo}', urlParts[urlParts.length-1])
		.replace('{tag}', branchParts[branchParts.length-1]);
}

var fetchXtagJson = function(url, callback){
	var host = 'raw.github.com';
	console.log("fetching", "https://" + host + url);
	var http = require('https');
	http.get({
		host: host,
		path: path.join(url, 'xtag.json')
	}, function(res){
		res.setEncoding('utf8');
		if (res.statusCode == 200){
			var data = '';
			res.on('data', function(chuck){
				data += chuck;
			});
			res.on('end', function(){
				try {
					var xtagJson = JSON.parse(data);
					xtagJson.xtagJsonRawPath = url;
					callback(null, xtagJson);
				} catch(e) { 
					callback("error parsing xtag.json: " + e + "\n" + data, null);
				}
			});
		} else {
			callback("request returned:" + res.statusCode, null);
		}
	}).on('error', function(err){	
		callback(err,null);
	});
}

app.listen(process.env.PORT || process.env.VCAP_APP_PORT || 3000);
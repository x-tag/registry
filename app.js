var express = require('express'),
	app = express.createServer(),
	exgf = require('amanda'),
	Sequelize = require('sequelize');

var sequelize = new Sequelize('heroku_c3396e57a4b4fb8', 'b9736dae691596', 'eb9d0764', {
	host: 'us-cdbr-east.cleardb.com'
});

var XTagRepo = sequelize.define('XTagRepo', {
	repo: 	{ type: Sequelize.STRING, unique: true, allowNull: false, validate:{ isUrl: true } },
	title: 	{ type: Sequelize.STRING, allowNull: false },
	description: Sequelize.TEXT,
	author: { type: Sequelize.STRING },
	email: 	{ type: Sequelize.STRING, validate: { isEmail: true }},
	revision: { type: Sequelize.STRING },
	ref: { type: Sequelize.STRING}
});

var XTagElement = sequelize.define('XTagElement', {	
	name: { type: Sequelize.STRING },
	description: { type: Sequelize.TEXT },
	category: { type: Sequelize.STRING }, 
	compatibility: { type: Sequelize.TEXT },
	demo_url: { type: Sequelize.STRING, validation: { isUrl: true }},
	raw: { type: Sequelize.TEXT }
});
XTagRepo.hasMany(XTagElement);

var githubSchema = {
	type: 'object',
	properties: {
		'repository':{
			required: true,
			type: 'object',
			properties: {
				'url': { type: 'string', required: true },
				'name': { type: 'string', required: true },
				'description': { type: 'string', required: true },
				'owner': {
					type: 'object',
					properties: {
						'email':  { type: 'string', required: true },
						'name':  { type: 'string', required: true },
					}
				}
			}
		},
		'after': {
			required: true,
			type: 'string',
			length: 40
		},
		'ref': {
			required: true,
			type: 'string'
		}

	}
}

console.log("db-sync:", sequelize.sync());

app.use(express.logger());
app.use(express.bodyParser());

app.post('/customtag', function(req, res){
	var gitHubData = JSON.parse(req.body.payload || '{}');
	exgf.validate(gitHubData, githubSchema, function(err){
		if (err){
			console.log("deal breaker:", gitHubData);
			return res.send(400);
		}

		console.log("Received webhook data from:", gitHubData.repository.url);

		addUpdateRepo(gitHubData, findControls);

		res.send(200);

	});
});

app.get('/search', function(req, res){

});

var addUpdateRepo = function(ghData, callback){	
	XTagRepo.find({ where: { repo: ghData.repository.url }}).success(function(repo){		
		if (repo){
			repo.updateAttributes({ 
				title: ghData.repository.name,
				description: ghData.repository.description,
				email: ghData.repository.owner.email,
				revision: ghData.after
			}).error(function(err){
				console.log("UPDATE-ERR", err, ghData.repository.url);				
			}).success(function(){
				console.log("repo " + ghData.repository.url + " updated");
				callback(ghData.repository.url, ghData.ref);
			});
		} else {
			repo = XTagRepo.create({ 
				repo: ghData.repository.url,
				title: ghData.repository.name, 
				description: ghData.repository.description,
				author: ghData.repository.owner.name,
				email: ghData.repository.owner.email,
				revision: ghData.after
			}).error(function(err){
				console.log("CREATE-ERR", err, ghData.repository.url);
			}).success(function(){
				console.log("repo " + ghData.repository.url + " created");
				callback(ghData.repository.url,  ghData.ref);
			});
		}
	});
}

var findControls = function(repoUrl, branch){
	if(!repoUrl || !branch) {
		console.log("[findControls] invalid params", arguments);
	} 
	//https://github.com/pennyfx/FlightDeck
	console.log("looking around for controls", repoUrl);
	var xtagJsonUrl = "https://raw.github.com/{user}/{repo}/{branch}/xtag.json";
	var urlParts = repoUrl.split('/');
	var branchParts = branch.split('/');
	xtagJsonUrl = xtagJsonUrl.replace('{user}', urlParts[urlParts.length-2])
		.replace('{repo}', urlParts[urlParts.length-1])
		.replace('{branch}', branchParts[branchParts.length-1]);
	console.log("fetching", xtagJsonUrl);
	//https://raw.github.com/sdepold/sequelize/master/xtag.json

}

app.listen(process.env.PORT || 3000);
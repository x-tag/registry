var Settings = require('settings');
var config = new Settings(require('../config'));
var Sequelize = require('sequelize');
var elastical = require('elastical');

var es_client = new elastical.Client(config.es.host, 
	{ port: config.es.port });

var sequelize = new Sequelize(config.db.database, 
	config.db.user, 
	config.db.password, { host: config.db.host });

var query = "SELECT e.name, e.tag_name, e.description, e.url, e.category, " +
	"e.images, e.compatibility, e.demo_url, e.version, e.revision, " +
	"e.ref, e.id, e.createdAt, e.is_current, r.id as repoId, " +
	"r.description as repoDescription, r.title as repoTitle, " +
	"r.updatedAt as repoUpdated, r.id as repoId, r.author, " + 
	"r.forked, r.forked_from, e.visible " +
	"FROM XTagElements e JOIN XTagRepoes r ON e.XTagRepoId = r.id " +
	"ORDER BY r.id, e.tag_name, e.is_current, e.version DESC";

sequelize.query(query, {}, {raw: true}).success(function(results){
	console.log("Found: ",results.length, "tags");

	var previousVersions = {};

	results.forEach(function(item){

		var key = item.tag_name + "-" + item.repoId;

		console.log(item);

		if (!previousVersions[key]){
			previousVersions[key] = [];
		}
		if (!item.is_current){
			previousVersions[key].push({ version: item.version, url: item.url });
			return;
		}

		es_client.index(config.es.index, 'element', {
				name: item.name,
				tag_name: item.tag_name,
				description: item.description,
				categories: item.category.split(','),
				compatibility: JSON.parse(item.compatibility),
				created_at: item.createdAt.toISOString(),
				demo_url: (item.demo_url) ? item.demo_url : '',
				url: item.url,
				version: item.version,
				revision: item.revision,
				repo_name: item.repoTitle,
				author: item.author,
				versions: previousVersions[key],
				forked: item.forked ? "true" : "false",
				forked_from: item.forked_from,
				visible: item.visible ? "true" : "false",
				all: item.name + " " + item.tag_name + " " + item.description
			},
			{
				id: item.id.toString(), refresh:true
			},
			function(err, res){
				console.log("ES response", err, res);
			});
	});
}).error(function(err){
	console.log(err);
});

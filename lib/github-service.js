var Sequelize = require('sequelize'), 
	Settings = require('settings'),
	github = require('./github'),
	async = require('async'),
	config = new Settings(require('../config'));

var sequelize = new Sequelize(config.db.database, 
	config.db.user, config.db.password, { host: config.db.host });

var XTagRepo 	= sequelize.import(__dirname + '/../models/xtagrepo');
var XTagUserLog	= sequelize.import(__dirname + '/../models/xtagimportlog');
var interval = 2 * 60 * 60 * 1000; // every 2 hours

module.exports.run = function(){
	setInterval(updateRepoIssues, interval);
}
function updateRepoIssues(){
	XTagRepo.findAll().on('success', function(repos){
		repos.forEach(function(repo){
			var parts = repo.repo.split('/');
			var repoName = parts[parts.length-1];
			var userName = parts[parts.length-2];
			github.getRepoIssues(userName, repoName, function(err, issues){
				if (err){
					XTagUserLog.createEntry(userName, 'Repo Issues Update Error: ' + err);
					return console.log("[githubService.getRepoIssues]", err);
				}
				XTagUserLog.createEntry(userName, 'Repo Issues Updated: ' + JSON.stringify(issues));
				repo.updateAttributes({ issues: JSON.stringify(issues)}).success(function(){
					console.log("Repo issues updated:", repo.title, issues);
				});
			});
		});
	});
}
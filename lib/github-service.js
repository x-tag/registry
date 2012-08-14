var Sequelize = require('sequelize');
var github = require('./github');
var async = require('async');
var config = new Settings(require('../config'));

var sequelize = new Sequelize(config.db.database, 
	config.db.user, config.db.password, { host: config.db.host });

var XTagRepo 	= sequelize.import(__dirname + '../models/xtagrepo');

module.exports.init = function(){
	return this;
}
function updateRepoIssues(){
	XTagRepo.findAll().on('success', function(repos){

		repos.forEach(function(repo){
			var parts = repo.repo.split('/');
			var repoName = parts[parts.length-2];
			var userName = parts[parts.length-1];
			github.getRepoIssues(userName, repoName, function(err, issues){
				if (err){
					return console.log("[githubService.getRepoIssues]", err);
				}

				repo.updateAttributes({ issues: issues}).success(function(){
					console.log("repo issues updated:", repo.title, issues);
				});
			});
		});
	});
}
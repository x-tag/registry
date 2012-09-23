var path = require('path'),
	request = require('./http-request'),
	githubHost = 'api.github.com';

module.exports = {
	getRepoIssues: function(user, repo, callback){
		var url = path.join('repos', user, repo, 'issues') + '?state=open'; 
		request.getJson({
			https: true,
			host: githubHost,
			path: url
		}, function(err, json){
			if (err){
				callback("[github.getRepoIssues]" + err, null);
			} else if (json){
				var repoIssues = { 
					issues: { 
						count: 0
					}, 
					pull_request:{
						count: 0
					}
				};
				json.forEach(function(issue){
					repoIssues.issues.count++;
					if (issue.pull_request.patch_url){
						repoIssues.pull_request.count++;
					}
					issue.labels.forEach(function(tag){
						if (repoIssues[tag.name]){
							repoIssues[tag.name].count++;
						} else {
							repoIssues[tag.name] = { 
								count: 1
							};
						}
					});
				});
				callback(null, repoIssues);
			}else{
				callback("Errror", null);
			}
		});
	}, 

	getRepo: function(user, repo, callback){
		request.getJson({
			https: true,
			host: githubHost,
			path: path.join('repos', user, repo)
		}, function(err, json){
			if (err){
				callback("[getRepo]" + err, null);
			} else {
				callback(null, json);
			}
		});
	},

	getTree: function(user, repo, ref, callback){
		request.getJson({
			https: true,
			host: githubHost,
			path: path.join('repos', user, repo, 'git/trees', ref)
		}, function(err, json){
			if (err){
				callback("[getRepo]" + err, null);
			} else {
				callback(null, json);
			}
		});
	}, 

	getFile: function(user, repo, file, ref, callback){
		request.getJson({
			https: true,
			host: githubHost,
			path: path.join('repos', user, repo, 'contents', file) + "?ref=" + (ref || "master")
		}, function(err, file){
			if (err){
				callback("[getFile]" + err, null);
			} else {
				callback(null, file);
			}
		});
	}
}

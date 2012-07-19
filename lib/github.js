var path = require('path'),
	request = require('./http-request'),
	githubHost = 'api.github.com';

module.exports = {
	getRepoIssues: function(user, repo, callback){
		request.getJson({
			https: true,
			host: githubHost,
			path: path.join('repos', user, repo, 'issues')
		}, function(err, json){
			if (err){
				callback("[github.getRepoIssues]" + err, null);
			} else {
				var repoIssues = { 
					issues: { 
						count: 0, 
						url: 'https://' + githubHost + this.options.path 
					}
				};
				json.forEach(function(issue){
					issue.tags.forEach(function(tag){
						repoIssues.issues.count++;
						if (repoIssues[tag.name]){
							repoIssues[tag.name].count++;
						} else {
							repoIssues[tag.name] = { 
								count: 1,
								url: tag.url
							};
						}
					});
				})
				callback(null, repoIssues);
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
				callback("[getRepo]"+err, null);
			} else {
				callback(null, json);
			}
		});
	}
}
var github = require('../lib/github');

module.exports = function(sequelize, DataTypes) {

	var XTagRepo = sequelize.define('XTagRepo', {
		repo: 	{ type: DataTypes.STRING, unique: true, allowNull: false, validate:{ isUrl: true } },
		title: 	{ type: DataTypes.STRING, allowNull: false },
		description: { type: DataTypes.TEXT },
		author: { type: DataTypes.STRING },
		email: 	{ type: DataTypes.STRING, validate: { isEmail: true }},
		forked: { type: DataTypes.BOOLEAN,  allowNull: false, defaultValue: false },
		forked_from: { type: DataTypes.STRING },
		issues: { type: DataTypes.STRING }
	});

	XTagRepo.addUpdateRepo = function(req, callback){
		var ghData = req.data.github;
			repoUrl = ghData.repository.html_url || ghData.repository.url;

		req.emit('log', 'Looking for existing repo by:' + repoUrl );

		XTagRepo.find({ where: {repo: repoUrl }}).success(function(repo){
			if (repo){
				req.emit('log', 'Found existing repo, updating a few values');
				repo.updateAttributes({
					title: ghData.repository.name,
					description: ghData.repository.description,
					email: ghData.repository.owner.email,
				}).error(function(err){
					callback("error updating repo: " + repoUrl + ", " + err, null);
				}).success(function(){
					console.log("repo " + repoUrl + " updated");
					callback(null, repo);
				});
			} else {
				req.emit('log', 'Repo doesn\'t exist, creating new one');
				function createRepo(forked_from){
					XTagRepo.create({
						repo: repoUrl,
						title: ghData.repository.name,
						description: ghData.repository.description,
						author: ghData.repository.owner.name || ghData.repository.owner.login,
						email: ghData.repository.owner.email,
						forked: ghData.repository.fork,
						forked_from: forked_from,
					}).error(function(err){
						req.emit('log', 'Repo creation failed: ' + err);
						callback("error creating repo: " + ghData.repository.html_url || repoUrl + ", " + err, null);
					}).success(function(repo){
						console.log("repo " + repoUrl + " created");
						req.emit('log', 'Repo created');
						callback(null, repo);
					});
				}

				if (ghData.repository.fork){
					req.emit('log', 'Repo is a fork.  Have you considered submitting a pull request for your contribution?');
					var split = repoUrl.split('/'),
						userName = split[split.length-2],
						repoName = split[split.length-1];
					github.getRepo(userName, repoName, function(err, data){
						createRepo(data && data.parent && data.parent.html_url ? data.parent.html_url : null);
					});

				} else {
					createRepo(null);
				}
			}
		});
	};
	return XTagRepo;
};

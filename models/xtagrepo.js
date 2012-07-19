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

	XTagRepo.addUpdateRepo = function(ghData, callback){

		XTagRepo.find({ where: {repo: ghData.repository.url }}).success(function(repo){		
			if (repo){
				repo.updateAttributes({ 
					title: ghData.repository.name,
					description: ghData.repository.description,
					email: ghData.repository.owner.email,			
				}).error(function(err){				
					callback("error updating repo: " + ghData.repository.url + ", " + err, null);
				}).success(function(){
					console.log("repo " + ghData.repository.url + " updated");
					callback(null, repo);
				});
			} else {

				var createRepo = function(forked_from){
					XTagRepo.create({
						repo: ghData.repository.url,
						title: ghData.repository.name, 
						description: ghData.repository.description,
						author: ghData.repository.owner.name,
						email: ghData.repository.owner.email,
						forked: ghData.repository.fork, 
						forked_from: forked_from,
					}).error(function(err){
						callback("error creating repo: " + ghData.repository.url + ", " + err, null);
					}).success(function(repo){
						console.log("repo " + ghData.repository.url + " created");
						callback(null, repo);
					});
				}

				if (ghData.repository.fork){
					var split = ghData.repository.url.split('/'),
						userName = split[split.length-2],
						repoName = split[split.length-1];

					github.getRepo(userName, repoName, function(err, data){
						createRepo(data ? data.parent.html_url : null);
					});
					
				} else {
					createRepo(null);
				}
			}
		});
	}

	return XTagRepo;

}

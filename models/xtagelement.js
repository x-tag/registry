var path = require('path'),
	exgf = require('amanda'),
	request = require('../lib/http-request'),
	Settings = require('settings'),
	config = new Settings(require('../config')),
	elastical = require('elastical'),
	es_client = new elastical.Client(config.es.host, 
		{ port: config.es.port }), 
	XTagElement = null;

module.exports = function(sequelize, DataTypes) {

	XTagElement = sequelize.define('XTagElement', {	
		name: { type: DataTypes.STRING },
		tag_name: { type: DataTypes.STRING },
		description: { type: DataTypes.TEXT },
		url: { type: DataTypes.STRING, validation: { isUrl: true } },
		category: { type: DataTypes.TEXT },
		images: { type: DataTypes.TEXT },
		compatibility: { type: DataTypes.TEXT },
		demo_url: { type: DataTypes.STRING, validation: { isUrl: true }},
		version: { type: DataTypes.STRING },
		revision: { type: DataTypes.STRING },
		ref: { type: DataTypes.STRING },
		raw: { type: DataTypes.TEXT },
		is_current: { type: DataTypes.BOOLEAN }, 
		visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
	});

	// Crawls repository and finds x-tag elements (xtag.json) files
	XTagElement.findElements = function(req, callback){
		req.emit('log', 'Finding elements for repo: ', req.data.github.repository.url);
		var ghData = req.data.github;
		var split = ghData.repository.url.replace('https://github.com/','').split('/');
		var ghUrl = {
			repo: split[1],
			author: split[0],
			directory: null,
			tag: ghData.ref.split('/')[2]
		};
		
		var crawlXtagJson = function(err, xtagJson){
			if (err){
				req.emit('log', 'Error fetching xtag.json:', xtagJson, "error:", err, " Returning");
				return;
			}

			if (xtagJson.xtags){
				xtagJson.xtags.forEach(function(tagUrl){
					ghUrl.directory = tagUrl;
					fetchXtagJson(req, ghUrl, function(err, xtagJson){
						if (xtagJson) xtagJson.controlLocation = ghData.branchUrl + "/" + tagUrl;
						crawlXtagJson(err, xtagJson);
					});
				});
			} 

			exgf.validate(xtagJson, require('../lib/schemas').xtagJson, function(err){
				if (err) {
					if (!xtagJson.xtags){
						req.emit('log',  "Invalid xtag.json :", xtagJson, "error:", err, " Returning");
					}
					return;
				}
				processXtagJson(req, ghData, ghUrl, xtagJson);
			});
		}

		try {
			fetchXtagJson(req, ghUrl, function(err, xtagJson){
				if (xtagJson) xtagJson.controlLocation = ghData.branchUrl;
				crawlXtagJson(err, xtagJson);
			});
		} catch(e){
			req.emit('log', 'Error in fetchXtagJson: ', e, ghUrl);
		}
	}

	function processXtagJson(req, repoData, repoUrl, xtagJson){

		req.emit('log', "Processing control:", xtagJson);

		elementHasChangedFromBase(req, repoData, xtagJson, function(isNew){

			// current control is a fork and has the same version, so we're skipping it
			if (!isNew) {
				return;
			}	
			XTagElement.findAll({ 
				where: {
					tag_name: xtagJson.tagName,
					XTagRepoId: repoData.repoId,
				}, order: 'id ASC'}).success(function(tags){

				// remove all previous versions from ES
				var alreadyExists = false;
				var previousVersions = [];
				(tags||[]).forEach(function(t){
					previousVersions.push({ version: t.version, url: t.url });
					if (t.version != xtagJson.version && t.is_current){
						t.is_current = false;
						t.save().success(function(t){
							es_client.delete(config.es.index, 'element', t.id, function(err, res){
								console.log("ES Delete old control version:", t.id, "  ERR:", err, "  RES:",res);
							});
						});
					} else if (t.version == xtagJson.version){
						alreadyExists = true;
					}
				});

				if (alreadyExists){
					req.emit('log', 'Control [' + xtagJson.tagName + '] already exists and has not been changed. Skipping...');
					return console.log("control already exists");
				}

				var categories = ["structural", "media", "input", "navigation", "behavioral"];

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
					XTagRepoId: repoData.repoId,
					is_current: true,
				}).success(function(tag){
					req.emit('log', 'Saved control: ' + xtagJson.name + ' version: ' + xtagJson.version + ' ref: ' + repoData.ref);
					//index into ES
					var element = {
						name: tag.name,
						tag_name: tag.tag_name,
						description: tag.description,
						categories: xtagJson.categories,
						compatibility: xtagJson.compatibility,
						created_at: tag.createdAt,
						demo_url: tag.demo_url,
						url: tag.url,
						version: tag.version,
						revision: tag.revision,
						repo_name: repoData.repository.name,
						author: repoData.repository.owner.name,
						versions: previousVersions,
						forked: repoData.repository.fork ? "true" : "false",
						forked_from: repoData.repository.forked_from,
						visible: tag.visible ? "true" : "false",
						all: tag.name + " " + tag.tag_name + " " + tag.description
					};
				
					es_client.index(config.es.index,
						'element', 
						element,
						{id: tag.id.toString(), refresh:true },
						function(err, res){
							console.log("ES response", err, res, element);
						}
					);

					// get demo assets
					if (tag.demo_url) {
						var XTagDemoAsset = sequelize.import(__dirname + '/xtagdemoasset');
						XTagDemoAsset.findAssets(req, repoUrl, tag);
					}
				}).error(function(err){
					req.emit('log', 'There was an issue saving [' + xtagJson.tagName + ']: ' + err);
				});
				
			}).error(function(err){
				req.emit('log', 'There was an error finding ['+xtagJson.tagName+']:' + err);
			});

		});
		
	}

	function elementHasChangedFromBase(req, repoData, xtagJson, callback){
		
		if (repoData.repository.fork){
			req.emit('log', 'This repo is a fork, checking to see if ['+xtagJson.tagName+'] is a different version.');
			var XTagRepo = sequelize.import(__dirname + '/xtagrepo');
			XTagRepo.find({
				where: { repo: repoData.repository.forked_from }
			}).success(function(repo){
				if (repo){
					XTagElement.findAll({ 
						where: {
							tag_name: xtagJson.tagName,
							XTagRepoId: repo.id, 
							version: xtagJson.version
						}, 
						order: 'id ASC'
					}).success(function(tags){
						if (tags.length){
							req.emit('log', 'Control ['+xtagJson.tagName+'] is fork and the same version.  Skipping...');
							callback(false);
						} else {
							callback(true);
						}
					}).error(function(err){
						req.emit('log', 'There was an error finding forked version of ['+xtagJson.tagName+']:' + err);
						callback(false);
					});
				} else {
					req.emit('log', 'Interesting... can\'t find the repo ['+repoData.repository.forked_from+'] that you forked from. Allowing your controls');
					callback(true);
				}
			}).error(function(err){
				req.emit('log', 'There was an error finding the repo you forked from ['+repoData.repository.forked_from+']:' + err);
				callback(false);
			});
		} else {
			callback(true);
		}
	}

	function fetchXtagJson(req, ghUrl, callback){

		var rpath = path.join('repos', ghUrl.author, 
			ghUrl.repo, 'contents', ghUrl.directory, 'xtag.json?ref=' + ghUrl.tag);

		req.emit('log', 'Fetching xtag.json: ', rpath);
		request.getJson({
			host: 'api.github.com', 
			path: rpath,
			https: true
		}, function(err, xtagJsonRaw){
			if (err){
				req.emit('log', 'Error fetching xtag.json @ ' + rpath + " , error:" + err);
				callback("[fetchXtagJson]" + err, null);
			} else {
				try {
					var buffer = new Buffer(xtagJsonRaw.content, 'base64');
					var xtagJson = JSON.parse(buffer.toString('utf8'));
					req.emit('log', 'Found xtag.json: ' + rpath);
					callback(null, xtagJson);	
				} catch(e){
					req.emit('log', 'Error parsing xtagJson.content for [', rpath, '] content:', buffer.toString('utf8'));
					callback("[fetchXtagJson.parse.content] "+e, null);
				}
			}
		});
	}
	return XTagElement;

};

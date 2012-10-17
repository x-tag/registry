var github = require('../lib/github');

module.exports = function(sequelize, DataTypes) {

	var XTagDemoAsset = sequelize.define('XTagDemoAsset', {
		path: { type: DataTypes.STRING, allowNull: false },
		content_encoding: { type: DataTypes.STRING },
		content: { type: DataTypes.TEXT },
		is_demo_html: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
	});

	XTagDemoAsset.findAssets = function(req, repoData, xtagJson) {
		req.emit('log', 'Finding assets for element ', repoUrl, ' at ', repoUrl, ",", tagId);
		return;
		getAssetContent(req, repoUrl, tagId, tag.demo_url); // start recursive grab
	};

	function getAssetContent(req, repoUrl, tagId, path) {
		github.getFile(repoUrl.author, repoUrl.repo, path, repoUrl.tag, function(err, content) {
			content = JSON.parse(content);
			if (err) { req.emit('log', err); return; }
			if (content.message) { req.emit('log', '[XTagDemoAsset.findAssets] '+content.message); return; }
			// individual file
			if (!Array.isArray(content)) {
				addAssetFile(req, tagId, content); // recursion exit
			}
			// directory
			else {
				content.forEach(function(entry) {
					getAssetContent(req, repoUrl, tagId, entry.path);
				});
			}
		});
	}

	function addAssetFile(req, tagId, file) {
		XTagDemoAsset.create({
			XTagElementId: tagId,
			path: file.path,
			content_encoding: file.encoding,
			content: file.content,
			is_demo_html: (/demo\.html$/.test(file.path))
		}).error(function(err){
			req.emit('log', 'There was an issue saving demo asset [' + file.path + ']: ' + err);
		});
	}

	return XTagDemoAsset;
};

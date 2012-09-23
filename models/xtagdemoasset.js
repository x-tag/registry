var github = require('../lib/github');

module.exports = function(sequelize, DataTypes) {

	var XTagDemoAsset = sequelize.define('XTagDemoAsset', {
		path: { type: DataTypes.STRING, allowNull: false },
		content_encoding: { type: DataTypes.STRING },
		content: { type: DataTypes.TEXT },
		is_demo_html: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
	});

	XTagDemoAsset.findAssets = function(req, repoUrl, tag) {
		req.emit('log', 'Finding assets for element ', tag.tag_name, ' at ', tag.demo_url);
		getAssetContent(req, repoUrl, tag, tag.demo_url); // start recursive grab
	};

	function getAssetContent(req, repoUrl, tag, path) {
		github.getFile(repoUrl.author, repoUrl.repo, path, repoUrl.tag, function(err, content) {
			if (err) { req.emit('log', err); return; }
			if (content.message) { req.emit('log', '[XTagDemoAsset.findAssets] '+content.message); return; }
			// individual file
			if (!Array.isArray(content)) {
				addAssetFile(req, tag, content); // recursion exit
			}
			// directory
			else {
				content.forEach(function(entry) {
					getAssetContent(req, repoUrl, tag, entry.path);
				});
			}
		});
	}

	function addAssetFile(req, tag, file) {
		// strip demo_url from path
		var path = (file.path.indexOf(tag.demo_url) != -1) ? file.path.substr(tag.demo_url.length) : file.path;
		if (path.charAt(0) == '/') { path = path.substr(1); }

		XTagDemoAsset.create({
			XTagElementId:tag.id,
			path: path,
			content_encoding: file.encoding,
			content: file.content,
			is_demo_html: (path == 'demo.html')
		}).error(function(err){
			req.emit('log', 'There was an issue saving demo asset [' + file.path + ']: ' + err);
		});
	}

	return XTagDemoAsset;
};

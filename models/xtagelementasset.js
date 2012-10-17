var github = require('../lib/github');

module.exports = function(sequelize, DataTypes) {

	var XTagElementAsset = sequelize.define('XTagElementAsset', {
		path: { type: DataTypes.STRING, allowNull: false },
		file_name: { type: DataTypes.STRING, allowNull: false },
		content_encoding: { type: DataTypes.STRING },
		content: { type: DataTypes.TEXT },
		size: { type: DataTypes.INTEGER }
	});

	XTagElementAsset.findAssets = function(req, author, repo, path, tag, id) {
		req.emit('log', 'Finding assets for element: ', author, repo, path, tag, id);
		getAssetContent(req, author, repo, path, tag, id, path); // start recursive grab
	};

	function getAssetContent(req, author, repo, path, tag, id, startPath) {
		req.emit('log', 'DEBUG: ---- ', author, repo, path, tag, id);
		github.getFile(author, repo, path, tag, function(err, file) {
			file = JSON.parse(file);
			if (err) { req.emit('log', "[XTagElementAssets.getFile error]",err); return; }
			if (file.message) { req.emit('log', '[XTagElementAsset.findAssets] '+file.message); return; }
			// individual file
			if (!Array.isArray(file)) {
				if (~['demo.html', 'test.html'].indexOf(file.name)){
					var content = adjustHtmlResourceUrls(req, file.content, file.encoding, id);
					file.content = content;
				}
				addAssetFile(req, id, file, startPath); // recursion exit
			} // directory
			else {
				file.forEach(function(entry) {
					getAssetContent(req, author, repo, entry.path, tag, id, startPath);
				});
			}
		});
	}

	function addAssetFile(req, tagId, file, rootPath) {
		req.emit('log','DEBUG: addAssetFile', tagId, file);
		XTagElementAsset.create({
			XTagElementId: tagId,
			path: file.path.replace(rootPath + "/", ''), //remove root path
			file_name: file.name,
			content_encoding: file.encoding,
			content: file.content,
			size: file.size
		}).error(function(err){
			req.emit('log', 'There was an issue saving demo asset [' + file.path + ']: ' + err);
		});
	}

	function adjustHtmlResourceUrls(req, content, encoding, tagId){
		var content = new Buffer(content, encoding);
		// TODO: replace all src="" and href="" with a  relative path to something like 
		//  /assetes/{elementId}  XTagElementId
		// jsdom or regex?
		// maybe move the resources from <head> to <body>, stripping everything else.

	}

	return XTagElementAsset;
};

var github = require('../lib/github'),
	path = require('path'),
	_ = require('underscore');

module.exports = function(sequelize, DataTypes) {

	var XTagElementAsset = sequelize.define('XTagElementAsset', {
		path: { type: DataTypes.STRING, allowNull: false },
		file_name: { type: DataTypes.STRING, allowNull: false },
		content_encoding: { type: DataTypes.STRING },
		content: { type: 'MEDIUMTEXT' },
		size: { type: DataTypes.INTEGER }
	});

	XTagElementAsset.getAsset = function(req, author, repo, tag, version, file_path, callback){

		var query = 'SELECT a.* '+
			'FROM XTagRepoes r '+
			'JOIN XTagElements e on r.id = e.XTagRepoId ' + 
			'JOIN XTagElementAssets a on e.id = a.XTagElementId ' + 
			'WHERE r.author="' + author + 
			'" AND r.title="' + repo + 
			'" AND e.tag_name="' + tag + 
			'" AND a.path="' + file_path + '"';

		if (/^\d+\.\d+\.\d+$/.test(version)){
			query += ' AND e.version="' + version + '"';
		}
		else {
			query += ' AND e.is_current=1';
		}

		query = sequelize.query(query,{}, { raw: true });
		query.success(function(files){
			callback(null, files[0]);
		}).failure(function(err){
			callback(err, null);
		});
	};

	XTagElementAsset.getAllAssets = function(id, callback){
		XTagElementAsset.findAll({where: { XTagElementId: id }})
			.success(function(files){
				callback(null, files);
			}).failure(function(err){
				callback(err, null);
			});
	};

	XTagElementAsset.importAssets = function(req, author, repo, dir, tag, id) {
		req.emit('log', 'Finding assets for element: ', author, repo, dir, tag, id);
		getAssetContent(req, author, repo, dir, tag, id, dir); // start recursive grab
	};

	function getAssetContent(req, author, repo, dir, tag, id, startPath) {
		//req.emit('log', 'DEBUG: ---- ', author, repo, dir, tag, id);
		github.getFile(author, repo, dir, tag, function(err, file) {
			file = JSON.parse(file);
			if (err) { req.emit('log', "[XTagElementAssets.getFile error]",err); return; }
			if (file.message) { req.emit('log', '[XTagElementAsset.importAssets] '+file.message); return; }
			// individual file
			if (!Array.isArray(file)) {
				// this sucks soooo bad
				if (~['demo.html', 'test.html','index.html'].indexOf(file.name)){
					try {
						dir = dir.replace(file.name, '').replace(startPath, '');
						var content = adjustHtmlResourceUrls(
							req, 
							new Buffer(file.content, file.encoding).toString(), 
							dir, 
							id
						);
						file.content = new Buffer(content).toString(file.encoding);;
					}
					catch(e) {
						req.emit('log', "error adjusting urls for:", file.name, e);
					}
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
		
		var assetPath =  file.path.replace(rootPath + "/", ''); //remove root path

		XTagElementAsset.find({where: {XTagElementId: tagId, path: assetPath, file_name: file.name }}).success(function(elem){
			if (elem){
				req.emit('log', 'This asset already exists [' + file.path + '], updating.');
				elem.updateAttributes({
					content: file.content, 
					size: file.size
				}).success(function(){}).error(function(err){
					req.emit('log', 'There was an issue updating this file [' + file.path + ']: ' + err);
				});
			}
			else {
				XTagElementAsset.create({
					XTagElementId: tagId,
					path: assetPath,
					file_name: file.name,
					content_encoding: file.encoding,
					content: file.content,
					size: file.size
				}).error(function(err){
					req.emit('log', 'There was an issue saving demo asset [' + file.path + ']: ' + err);
				});
			}
		}).error(function(err){
			req.emit('log', 'There was an issue checking to see if this asset already exists [' + file.path + ']: ' + err);
		});
	}

	function adjustHtmlResourceUrls(req, html, dir, tagId){

		html = html.replace(/(?:src|href|icon)="(.+)"/g, function(m, group, idx){
			return m.replace(group, adjustResourceUrl(path.join(dir, group), tagId));
		});

		return html;
	}

	function adjustResourceUrl(resourceUrl, tagId){
		if (~resourceUrl.indexOf('x-tag.js')){
			// the template already had this included, so make it ''
			resourceUrl = '';
		} 
		else {
			if (!/^http/.test(resourceUrl)){ // only adjust relative urls				
				resourceUrl = "/assets/" + tagId + "/" + resourceUrl;
			}
		}
		return resourceUrl;
	}

	function trimSlash(url){
		if (url[0] == '/'){
			return url.substr(1);
		}
		return url;
	}

	return XTagElementAsset;
};

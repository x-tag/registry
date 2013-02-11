var exgf = require('amanda'),
	sanitize = require('validator').sanitize;

module.exports.validateGitHubData = function(req, res, next){
	var gitHubData = JSON.parse(sanitize(req.body.payload).xss() || '{}');
	exgf.validate(gitHubData, require('./schemas').github, function(err){
		if (err){
			console.log("deal breaker:", gitHubData, err);
			req.emit('log', 'data did not pass validation' + JSON.stringify(gitHubData) + "\n" + JSON.stringify(err));
			return res.send(400);
		}

		// only analyize git tags that start with xtag
		if (gitHubData.ref.indexOf('refs/tags/xtag')!=0){
			console.log("Ignoring webhook for ", gitHubData.repository.url, gitHubData.ref);
			req.emit('log','Webhook isn\'t for x-tag registry, ignoring...  [' + gitHubData.ref + ']');
			return res.send(200);
		}
		req.data = {};
		req.data.github = gitHubData;

		next();
	});
}

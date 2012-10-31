var db = require('../database.js');
var argv = require('optimist')
	.usage('Usage: $0 -a mozilla -r x-tag-elements -p accordion -e x-accordion -v 0.0.1 -t [master]')
	.demand(['a', 'r'])
	.argv;

var XTagElementAsset = db.import(__dirname + '/../models/xtagelementasset');
var XTagElement = db.import(__dirname + '/../models/xtagelement');

var mockRequest = { 
	emit: function(type, msg){
		if (type == 'log'){
			console.log(arguments);
		}
	}
};

var	author = argv.a, 
	repo = argv.r, 
	path = argv.p || '',
	element = argv.e,
	version = argv.v,
	tag = argv.t;

if (author && repo && element){
	console.log(author, repo, element);
	XTagElement.getElement(author, repo, element, version, function(err, xTagElement){
		if (xTagElement){
			console.log("found element:", xTagElement.id, xTagElement.ref.split('/')[2]);
			XTagElementAsset.importAssets(
				mockRequest, 
				author, 
				repo, 
				path, 
				tag || xTagElement.ref.split('/')[2], 
				xTagElement.id
			);
		} else{
			console.log("unable to find control");
		}
	});

} else if (author && repo){ // fetch everything for a repo

	XTagElement.getElements(author, repo, function(err, elements){
		elements.forEach(function(elem){
			console.log("found element:", elem.id, elem.name, elem.ref.split('/')[2]);
			var xtagJson = JSON.parse(elem.raw);
			if (!xtagJson.controlPath){ // this is required to find the control
				console.log("error: ", elem.name, " Is missing controlPath" );
				return;
			}
			XTagElementAsset.importAssets(
				mockRequest, 
				author,
				repo,
				xtagJson.controlPath,
				tag || elem.ref.split('/')[2], 
				elem.id
			);
		});]
	});

}
else {
	console.log("Invalid arguments.  author:", author, " repo:", repo, " element:", element, " version:", version);
}

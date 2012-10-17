module.exports = function Database(){

	var Sequelize = require('sequelize'),
		Settings = require('settings'),
		config = new Settings(require('./config')),
		sequelize = new Sequelize(config.db.database, 
			config.db.user, config.db.password, { host: config.db.host, logging: false });

	var XTagRepo 	= sequelize.import(__dirname + '/models/xtagrepo');
	var XTagElement = sequelize.import(__dirname + '/models/xtagelement');
	var XTagElementAsset = sequelize.import(__dirname + '/models/xtagelementasset');
	var XTagImportLog = sequelize.import(__dirname + '/models/xtagimportlog');
	XTagRepo.hasMany(XTagElement);
	XTagElement.hasMany(XTagElementAsset);
	sequelize.sync();
	
	console.log("init db");
	global.db = sequelize;
	return sequelize;
}();
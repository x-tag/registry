module.exports = function Database(){

	var Sequelize = require('sequelize'),
		Settings = require('settings'),
		dbconfig = process.env.STACKATO_SERVICES ? JSON.parse(process.env.STACKATO_SERVICES)['xtag-db'] : new Settings(require('../config.js')).db;
		sequelize = new Sequelize(dbconfig.name,
			dbconfig.user, dbconfig.password, { host: dbconfig.host, logging: false });

	var XTagRepo 	= sequelize.import(__dirname + '/../models/xtagrepo');
	var XTagElement = sequelize.import(__dirname + '/../models/xtagelement');
	var XTagElementAsset = sequelize.import(__dirname + '/../models/xtagelementasset');
	var XTagImportLog = sequelize.import(__dirname + '/../models/xtagimportlog');
	XTagRepo.hasMany(XTagElement);
	XTagElement.hasMany(XTagElementAsset);
	sequelize.sync();

	global.db = sequelize;
	return sequelize;
}();
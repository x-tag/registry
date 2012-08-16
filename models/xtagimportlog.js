module.exports = function(sequelize, DataTypes) {

	var XTagImportLog = sequelize.define('XTagImportLog', {		
		user: 	{ type: DataTypes.STRING, allowNull: false },
		entry: { type: DataTypes.TEXT }
	});
	return XTagImportLog;
}
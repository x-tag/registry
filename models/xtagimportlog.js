module.exports = function(sequelize, DataTypes) {

	var XTagImportLog = sequelize.define('XTagImportLog', {		
		user: 	{ type: DataTypes.STRING, allowNull: false },
		entry: { type: DataTypes.TEXT }
	});
	XTagImportLog.createEntry = function(name, entry){
		XTagImportLog.create({
			user: name, 
			entry: entry
		}).success(function(){ })
		.error(function(err){ console.log("Error saving ImportLog:", name, "\nError:", err); });
	}
	return XTagImportLog;
}
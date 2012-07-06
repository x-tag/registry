module.exports = function(sequelize, DataTypes) {

	return sequelize.define('XTagElement', {	
		name: { type: DataTypes.STRING },
		tag_name: { type: DataTypes.STRING },
		description: { type: DataTypes.TEXT },
		url: { type: DataTypes.STRING, validation: { isUrl: true } },
		category: { type: DataTypes.TEXT },
		images: { type: DataTypes.TEXT },
		compatibility: { type: DataTypes.TEXT },
		demo_url: { type: DataTypes.STRING, validation: { isUrl: true }},
		version: { type: DataTypes.STRING },
		revision: { type: DataTypes.STRING },
		ref: { type: DataTypes.STRING },
		raw: { type: DataTypes.TEXT },
		is_current: { type: DataTypes.BOOLEAN }
	});

};

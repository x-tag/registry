module.exports = function(sequelize, DataTypes) {

	return sequelize.define('XTagRepo', {
		repo: 	{ type: DataTypes.STRING, unique: true, allowNull: false, validate:{ isUrl: true } },
		title: 	{ type: DataTypes.STRING, allowNull: false },
		description: { type: DataTypes.TEXT },
		author: { type: DataTypes.STRING },
		email: 	{ type: DataTypes.STRING, validate: { isEmail: true }}, 
		forked: { type: DataTypes.BOOLEAN,  allowNull: false, defaultValue: false }, 
		forked_from: { type: DataTypes.STRING }
	});

}

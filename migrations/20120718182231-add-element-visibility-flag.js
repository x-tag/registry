module.exports = {
  up: function(migration, DataTypes) {
    migration.addColumn('XTagElements','visible', { 
    	type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true  });
  },
  down: function(migration) {
     migration.addColumn('XTagElements','visible');
  }
}
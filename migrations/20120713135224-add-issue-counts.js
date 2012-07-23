module.exports = {
  up: function(migration, DataTypes) {
    // it's a json object
    migration.addColumn('XTagRepoes','issues', { type: DataTypes.STRING,  allowNull: true });

  },
  down: function(migration) {
    migration.removeColumn('XTagRepoes','issues');
  }
}
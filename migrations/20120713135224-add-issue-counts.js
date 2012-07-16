module.exports = {
  up: function(migration, DataTypes) {
    // add altering commands here
    // it's a json object
    migration.addColumn('XTagRepoes','issues', { type: DataTypes.STRING,  allowNull: true });

  },
  down: function(migration) {
    // add reverting commands here
    migration.removeColumn('XTagRepoes','issues');
  }
}
module.exports = {
  up: function(migration, DataTypes) {
    // add altering commands here
    migration.addColumn('XTagRepoes','forked', { type: DataTypes.BOOLEAN,  allowNull: false, defaultValue: false });
    migration.addColumn('XTagRepoes', 'forked_from', { type: DataTypes.STRING });
  },
  down: function(migration) {
    // add reverting commands here
    migration.removeColumn('XTagRepoes','forked');
    migration.removeColumn('XTagRepoes','forked_from');
  }
}
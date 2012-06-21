module.exports = {
  up: function(migration, DataTypes) {
    migration.addColumn('XTagRepoes', 'ref', DataTypes.STRING);
  },
  down: function(migration) {
    migration.removeColumn('XTagRepoes', 'ref');
  }
}
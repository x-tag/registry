module.exports = {
    up: function(migration, DataTypes) {
        migration.addIndex('XTagRepoes',['repo'])
    },
    down: function(migration, DataTypes) {
        migration.removeIndex('XTagRepoes', ['repo'])
    }
}
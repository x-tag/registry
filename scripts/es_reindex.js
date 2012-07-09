var Settings = require('settings');
var config = new Settings(require('../config'));
var Sequelize = require('sequelize');
var elastical = require('elastical');

var client = new elastical.Client(config.es.host, 
	{ port: config.es.port });

var sequelize = new Sequelize(config.db.database, 
	config.db.user, 
	config.db.password, { host: config.db.host });

var index = config.es.index;

//todo: pull from db, push into ES
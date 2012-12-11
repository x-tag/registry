module.exports = function Server(){

	var express = require('express'),
		app = express.createServer(),
		logger = require('./lib/logger');

	app.disable('view cache');
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.set('view options', { layout: false });
	app.set( "jsonp callback", true );
	app.use(express.logger());
	app.use(express.bodyParser());
	app.use(logger.reqLogListener);
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));	
	return app;

}();
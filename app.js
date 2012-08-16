module.exports = function App(){

	var express = require('express'),
		app = express.createServer();

	app.disable('view cache');
	app.use(express.logger());
	app.use(express.bodyParser());
	app.use(express.static(__dirname + '/public'));	
	return app;

}();
var app = require('./server'), 
	db = require('./database'),
	routes = require('./routes')(app, db);

var service = require('./lib/github-service');
service.run();

var port = process.env.PORT || process.env.VCAP_APP_PORT || 3001;
console.log("Registry listening on port:", port)
app.listen(port);
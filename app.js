var app = require('./server'), 
	db = require('./database'),
	routes = require('./routes')(app, db);

var service = require('./lib/github-service');
service.run();

app.listen(process.env.PORT || process.env.VCAP_APP_PORT || 3000);
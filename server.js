var app = require('./app'), 
	db = require('./database'),
	routes = require('./routes')(app);

app.listen(process.env.PORT || process.env.VCAP_APP_PORT || 3000);
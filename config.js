module.exports = {
	common: {
		db: {
			host: 'us-cdbr-east.cleardb.com',
			database: 'heroku_c3396e57a4b4fb8', 
			user: 'b9736dae691596', 
			password: 'eb9d0764'
		}, 
		es: {
			index: 'xtag', 
			host: 'localhost',
			port: '9200'
		}
	}, 
	production: {
		db: {
			host: '10.22.112.137',
			database: 'ddad73ff9e8c34d47ae0f3043382681de', 
			user: 'uNCtYqJA0ONam', 
			password: 'pES0T0eLb759n'
		},	
		es: {
			index: 'xtag',			
			host: 'elasticsearch1.vm.labs.scl3.mozilla.com',
			port: '9200'
		}
	}
}
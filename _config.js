module.exports = {
	common: {
		db: {
			host: 'localhost',
			database: 'xtag', 
			user: 'root', 
			password: null
		}, 
		es: {
			index: 'xtag', 
			host: 'localhost',
			port: '9200'
		},
		github:{
			username: '',
			password: '',
			host: ''
		}
	}, 
	production: {
		db: {
			host: '',
			database: '', 
			user: '', 
			password: ''
		},	
		es: {
			index: 'xtag',			
			host: '',
			port: '9200'
		}
	}
}
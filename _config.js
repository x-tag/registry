module.exports = {
	common: {
		db: {
			host: 'localhost',
			database: 'xtag',
			user: 'root',
			password: ''
		},
		es: {
			index: 'xtag',
			host: 'localhost',
			port: '9200',
			admin-secret: ''
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
			port: '9200',
			admin-secret: ''
		}
	}
}
module.exports.github = {
	type: 'object',
	properties: {
		'repository':{
			required: true,
			type: 'object',
			properties: {
				'url': { type: 'string', required: true },
				'name': { type: 'string', required: true },
				'description': { type: 'string', required: true },
				'owner': {
					type: 'object',
					properties: {
						'name':  { type: 'string', required: true },
					}
				}
			}
		},
		'after': {
			required: true,
			type: 'string',
			length: 40
		},
		'ref': {
			required: true,
			type: 'string'
		}
	}
}

module.exports.xtagJson = {
	type: 'object',
	properties: {
		'name': { type: 'string', required: true, minLength: 3, maxLength: 255},
		'tagName': { type: 'string', required: true, minLength: 3, maxLength: 255},
		'description': { type: 'string' },
		'version': { 
			type: 'string',
			required: true,
			pattern: '^\\d+\.\\d+\.\\d+$'
		},
		'images': {
			type: 'array'
		},
		'categories': {
			type: 'array'
		},
		'demo':{
			type: 'string',
		}

	}
}
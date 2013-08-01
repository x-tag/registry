module.exports = {
	"element":{
		"_source" : { "enabled" : true }, // do not save the source doc
		"_all" : { "enabled" : false }, // do not try searching the entire doc by default
		"properties":{
			"id": { "type": "string", "analyzer": "keyword", "stored": "yes" },
			"name": { "type": "string", "analyzer": "snowball" },
			"description": { "type": "string", "analyzer": "snowball" },
			"all": { "type": "string", "analyzer": "snowball" },
			"tag_name": { "type": "string", "analyzer": "keyword" },
			"categories": { "type": "string", "analyzer": "keyword" },
			"created_at" : { "type": "date" },
			"updated_at" : { "type": "date" }
		}
	}
}
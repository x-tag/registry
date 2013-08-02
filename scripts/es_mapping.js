module.exports = {
  "element":{
    "_source" : { "enabled" : true }, // do not save the source doc
    "_all" : { "enabled" : false }, // do not try searching the entire doc by default
    "properties":{
      "id": { "type": "string", "analyzer": "keyword", "stored": "yes" },
      "name": {
        "type": "multi_field",
        "fields": {
           "name": { "type": "string", "index": "analyzed", "store": "yes" },
           "raw_name": { "type": "string", "index": "not_analyzed", "store": "yes" }
        }
       },
      "description": { "type": "string", "analyzer": "snowball" },
      "all": { "type": "string", "analyzer": "snowball" },
      "tag_name": { "type": "string", "analyzer": "keyword" },
      "categories": { "type": "string", "analyzer": "keyword" },
      "compatibility": {
        "dynamic": "true",
        "properties": {
            "android": {
                "type": "double"
            },
            "chrome": {
                "type": "double"
            },
            "firefox": {
                "type": "double"
            },
            "ie": {
                "type": "double"
            },
            "ios": {
                "type": "double"
            },
            "opera": {
                "type": "double"
            }
        }
      },
      "created_at" : { "type": "date" },
      "updated_at" : { "type": "date" }
    }
  }
}
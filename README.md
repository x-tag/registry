## About
X-tag-registry is repository for xtags.

## Setup

Requirements:
* nodejs
* mysql
* elasticsearch


``` 
git clone https://github.com/pennyfx/x-tag-registry.git 
cd x-tag-registry
npm install
cp _config.js config.js

```

Edit config.js: enter your database and elasticsearch info

```
 # setup elasticsearch
 node scripts/es_setup.js

```


## Adding x-tags
X-tag registry uses github as its source for tags.  All you have to do is add a POST-COMMIT hook in your repository and add a xtag.json file to your repo and we will do the rest.

#### Sample xtag.json
```
{	
	"name": "Flipbox",
	"tagName": "x-flipbox",
	"version": "0.0.1",	
	"description": "The flipbox tag allows you to flip a content element with a CSS Animation to the other side to view additional content. An example use of flipbox, would be to flip and app's content to reveal a settings panel",
	"images": ["test.com/images/screen1.png"],	
	"categories": ["structural"],
	"compatibility": {	
		"firefox": 5,
		"chrome": 4,
		"opera": 12,
		"android": 2.1,
		"ios": 4
	}
}

```

OR if you have many x-tags in one repository you can have one xtag.json in your repository root that points to all other tags.

```
{
    "xtags":[
     	"flipbox",
		"map"
    ]
}
```

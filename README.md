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

 node app.js

```

Open your browser to localhost:3000 and voila!


## Adding x-tags
X-tag registry uses github as its source for tags.  All you have to do is add a POST-COMMIT hook in your repository and add a xtag.json file to your repo and we will do the rest.

Visit: 
``` https://github.com/[USERNAME]/[YOUR TAG REPO]/admin/hooks ``` 

Add a WebHook Url to:  https://xtag-registry.vcap.mozillalabs.com/customtag

Each time you commit to your repository we will get notice of it.  However, the registry will only update its data when you use a tag that begins with xtag.  For example:

```
# create a tag 
git tag xtag-v0.0.1 

# push it
git push --tags

```

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

For development you'll have to fake the POST-COMMIT hook to get data into your registry.  For example:


``` curl http://localhost:3000/customtag/  -H 'Content-type:application/json' -d @test/github_post_commit_hook_data.json  ```

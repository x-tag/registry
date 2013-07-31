module.exports = function Routes(app, db){

  var Settings = require('settings'),
    config = new Settings(require('../config.js')),
    path = require('path'),
    github = require('../lib/github'),
    request = require('../lib/http-request'),
    spawn = require('child_process').spawn;

  var XTagRepo = db.import(__dirname + '/../models/xtagrepo');
  var XTagElement = db.import(__dirname + '/../models/xtagelement');

  app.get('/admin/es/', validateRequest,  function(req, res){

    request.getJson({
        host: config.es.host,
        port: config.es.port,
        path: req.query.command
      }, function(err, result){
        res.send(result);
    });

  });

  app.get('/admin/es/delete', validateRequest,  function(req, res){

    var proc = spawn('node',['scripts/es_delete.js']);
    proc.stderr.pipe(process.stderr);
    proc.stdout.pipe(process.stdout);
    res.send("Deleted index");

  });

  app.get('/admin/es/setup', validateRequest,  function(req, res){

    var proc = spawn('node',['scripts/es_setup.js']);
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    res.send("Created new index and configure mapping.");

  });

  app.get('/admin/es/reindex', validateRequest,  function(req, res){
    var proc = spawn('node',['scripts/es_reindex.js']);
    proc.stderr.pipe(process.stderr);
    proc.stdout.pipe(process.stdout);
    res.send("Reindexing");

  });

 app.get('/admin/repo/add', validateRequest, function(req, res){
    var repoUrl = req.query.repo;
    // http://github.com/user/repo/
    var parts = repoUrl.split('/');

    github.getJSONFile(parts[3], parts[4], 'xtag.json', null, function(err, xtagJson){

      if(!xtagJson){
        req.emit('log', 'repo missing xtag.json file.');
        res.send(400);
        return;
      }

      github.getRepo(parts[3], parts[4], function(err, repo){

        req.data = { github:{
          repository: JSON.parse(repo),
          ref: 'ref/tag/' + xtagJson.version }};
        res.send(req.data);
        XTagRepo.addUpdateRepo(req, function(err, repo){
          if (err) {
            console.log("addUpdateRepo error:", err);
          } else {
            req.data.github.repoId = repo.id;
            req.data.github.repository.forked_from = repo.forked_from;
            req.data.github.branchUrl = req.data.github.repository.html_url + "/" + path.join("tree", req.data.github.ref.split('/')[2]);
            XTagElement.findElements(req);
          }
        });
      });
    });
  });

  function validateRequest(req, res, next){
    if (req.query.secret==config.admin.secret){
      next();
    }else{
      res.send(401);
      res.end();
    }

  }

}

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

  function validateRequest(req, res, next){
    if (req.query.secret==config.admin.secret){
      next();
    }else{
      res.send(401);
      res.end();
    }

  }

}

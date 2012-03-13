//
// CRUD /user/:username/application/:appname/repository/:repo
//

var Repository = require('./resource'),
   path = require('path'),
   haibu = require('../../../../lib/haibu'),
   utile = require('utile');

exports.createRoutes = function createRoutes(router) {
   var config = this.config;
   router.delete("/repository/:name", function deleteRepository(user, app, repo) {
      var res = this.res, target = {
         application: {
            user: user,
            name: app
         },
         name: repo
      };
      Repository.get(Repository.url(target), function repositoryRetrieved(err, repository) {
         console.error(arguments)
         if (err) res.json(500, err);
         else {
            res.json(200, target);
            Drones.forRepository(repository, function (err, drones) {
               if (err) res.json(500, err);
               else {
                  var errors = [];
                  var todo = drones.length;
                  function next(err) {
                     if (err) errors.push(err);
                     --todo;
                     if (todo === 0) {
                        if (errors.length) res.json(500, errors);
                        else res.json(200, target);
                     }
                  }
                  drones.forEach(function cleanDrone(drone) {
                     drone.kill();
                     drone.clean(next);
                  });
               }
            });
         }
      });
   });
   
   router.get("/repository/:name", function getRepository(user, app, repo) {
      var res = this.res, target = {
         application: {
            user: user,
            name: app
         },
         name: repo
      };
      console.error(Repository.url(target))
      Repository.get(Repository.url(target), function repositoryRetrieved(err, repo) {
         console.error(arguments)
         if (err) res.json(500, err);
         else res.json(200, repo);
      });
   });
   
   router.post("/repository/:name", function createRepository(user, app, repo) {
      var req = this.req, res = this.res, target = {
         application: {
            user: user,
            name: app
         },
         name: repo
      };
      target = utile.mixin(req.body || {}, target);
      target._id = Repository.url(target);
      console.error('saving', target);
      Repository.create(target, function repositoryCreated(err, repo) {
         console.error('saved', arguments)
         if (err) res.json(500, err);
         else res.json(200, repo);
      });
   });
   
   router.put("/repository/:name", function updateRepository(user, app, repo) {
      var res = this.res, target = {
         application: {
            user: user,
            name: app
         },
         name: repo
      };
      console.error('getting', target);
      Repository.update(Repository.url(target), target, function repositoryUpdated(err, repo) {
         if (err) res.json(500, err);
         else res.json(200, repo);
      });
   });
   
   //
   // Used to handle streamed deploys that are out of band from repo creation
   //
   router.put("/repository/:name/upload", function updateRepository(user, app, repo) {
      var req = this.req, res = this.res, target = {
         application: {
            user: user,
            name: app
         },
         name: repo
      };
      Repository.get(Repository.url(target), function repositoryUpdated(err, repo) {
         if (err) res.json(500, err);
         else if (repo.properties.local && repo.properties.local.type) res.json(400, new Error('Repository already has local copy'));
         else {
            //
            // Actually read the stream from the request into the destination file
            //
            var repositoriesDir = path.resolve(haibu.config.get('directories:repositories'));
            repo.streamSource({
               req: req,
               target: target,
               destination: path.join(repositoriesDir, 'user', user, 'application', app) + '.tgz'
            }, function sourceRetrieved(err) {
               repo.save();
               if (err) res.json(500, err);
               else res.json(200, target);
            });
         };
      });
   });
}
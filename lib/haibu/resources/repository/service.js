//
// CRUD /user/:username/application/:appname/repository/:repo
//

var Repository = require('./resource'),
   errs = require('errs'),
   path = require('path'),
   haibu = require('../../../../lib/haibu'),
   utile = require('utile');

exports.createRoutes = function createRoutes(router) {
   var config = this.config;
   
   //
   // Needs to delete all drones for the repository
   //
   router.delete("/repository/:name", function deleteRepository(user, app, repo) {
      var res = this.res, target = {
         application: {
            user: user,
            name: app
         },
         name: repo
      };
      Repository.get(Repository.url(target), function repositoryRetrieved(err, repository) {
         if (err) res.json(500, haibu.createSystemError(err, 'Problem retrieving repository'));
         else {
            Drones.forRepository(repository, function (err, drones) {
               if (err) res.json(500, haibu.createSystemError(err, 'Problem finding drones for repository'));
               else {
                  var done = false;
                  async.forEach(drones, function cleanDrone(drone, callback) {
                     drone.kill(function droneKilled(err) {
                        callback(err);
                     });
                  }, function dronesKilled(err) {
                     if (done) return;
                     done = true;
                     if (err) {
                        res.json(500, errs.merge(haibu.createSystemError(err, 'Problem killing drones repository')));
                     }
                     else {
                        repository.uninstall(function repositoryUninstalled(err) {
                           if (err) res.json(500, haibu.createSystemError(err, 'Problem uninstalling repository'));
                           else repository.destroy(function repositoryDestroyed(err) {
                              if (err) res.json(500, haibu.createSystemError(err, 'Problem destroying repository'));
                              else res.json(200, target);
                           });
                        });
                     }
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
      Repository.get(Repository.url(target), function repositoryRetrieved(err, repo) {
         if (err) res.json(500, haibu.createSystemError(err, 'Problem retrieving repository'));
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
      Repository.create(target, function repositoryCreated(err, repo) {
         if (err) res.json(500, haibu.createSystemError(err, 'Problem creating repository'));
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
      Repository.update(Repository.url(target), target, function repositoryUpdated(err, repo) {
         if (err) res.json(500, haibu.createSystemError(err, 'Problem updating repository'));
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
         if (err) res.json(500, haibu.createSystemError(err, 'Problem finding repository'));
         else if (repo.properties.local && repo.properties.local.type) res.json(400, haibu.createSystemError('Repository already has local copy'));
         else {
            //
            // Actually read the stream from the request into the destination file
            //
            repo.streamSource({
               req: req
            }, function sourceRetrieved(err) {
               if (err) res.json(500, haibu.createSystemError(err, 'Problem saving stream to file'));
               else {
                  repo.save(function repoSaved(err) {
                     if (err) res.json(500, haibu.createSystemError(err, 'Problem saving repository'));
                     res.json(200, target);
                  });
               }
            });
         };
      });
   });
}
//
// CRUD /user/:username/application/:appname/repository/:repo
//

var Repository = require('./resource');

exports.createRoutes = function createRoutes(router) {
   router.delete("/repository/:name", function deleteRepository(user, app, repo) {
      var res = this.res, target = {
         user: user,
         name: name
      };
      Repository.get(Repository.url(target), function repositoryRetrieved(err, repository) {
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
   
   router.get("/repository/:name", function getApplication(user, app, repo) {
      var res = this.res, target = {
         user: user,
         name: name
      };
      Application.get(Application.url(target), function applicationRetrieved(err, app) {
         if (err) res.json(500, err);
         else res.json(200, app);
      });
   });
   
   router.post("/repository/:name", function createApplication(user, app, repo) {
      var res = this.res, target = {
         user: user,
         name: name
      };
      Application.create(target, function applicationCreated(err, app) {
         if (err) res.json(500, err);
         else res.json(200, app);
      });
   });
   
   router.put("/application/:name", function updateApplication(user, app, repo) {
      var res = this.res, target = {
         user: user,
         name: name
      };
      Application.update(Application.url(target), target, function applicationUpdated(err, app) {
         if (err) res.json(500, err);
         else res.json(200, app);
      });
   });
}
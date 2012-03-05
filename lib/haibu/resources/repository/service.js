//
// CRUD /user/:username/application/:appname/repositories/:repo
//

var Repository = require('./resource');

exports.createRoutes = function createRoutes(router) {
   router.delete("/application/:name", function deleteApplication(user, app, repo) {
      var res = this.res, target = {
         user: user,
         name: name
      };
      Application.destroy(Application.url(target), function applicationDeleted(err) {
         if (err) res.json(500, err);
         else res.json(200, target);
      });
   });
   
   router.get("/application/:name", function getApplication(user, app, repo) {
      var res = this.res, target = {
         user: user,
         name: name
      };
      Application.get(Application.url(target), function applicationRetrieved(err, app) {
         if (err) res.json(500, err);
         else res.json(200, app);
      });
   });
   
   router.post("/application/:name", function createApplication(user, app, repo) {
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
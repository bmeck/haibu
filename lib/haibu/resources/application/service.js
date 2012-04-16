//
// CRUD /user/:username/application/:appname
//

var Application = require('./resource');

exports.createRoutes = function createRoutes(router) {

   router.get("/application/", function getApplications() {
      var res = this.res;
      Application.all(function applicationsRetrieved(err, applications) {
         if (err) res.json(500, err);
         else res.json(200, applications);
      });
   });
   
   router.delete("/application/:name", function deleteApplication(user, name) {
      var res = this.res, target = {
         user: user,
         name: name
      };
      Application.destroy(Application.url(target), function applicationDeleted(err) {
         if (err) res.json(500, err);
         else res.json(200, target);
      });
   });
   
   router.get("/application/:name", function getApplication(user, name) {
      var res = this.res, target = {
         user: user,
         name: name
      };
      Application.get(Application.url(target), function applicationRetrieved(err, app) {
         if (err) res.json(500, err);
         else res.json(200, app);
      });
   });
   
   router.post("/application/:name", function createApplication(user, name) {
      var res = this.res, target = {
         user: user,
         name: name
      };
      Application.create(target, function applicationCreated(err, app) {
         if (err) res.json(500, err);
         else res.json(200, app);
      });
   });
   
   router.put("/application/:name", function updateApplication(user, name) {
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
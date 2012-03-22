var Environment = require('./resource');

//
// CRUD /environment/:name
//

exports.createRoutes = function createRoutes(router) {
   router.delete("/environment/:name", function deleteEnvironment(name) {
      var res = this.res, target = {
         name: name
      };
      Environment.destroy(Environment.url(target), function environmentDeleted(err) {
         if (err) res.json(err.status || 500, err);
         else res.json(200, target);
      });
   });
   
   router.get("/environment/:name", function getEnvironment(name) {
      var res = this.res, target = {
         name: name
      };
      Environment.get(Environment.url(target), function environmentRetrieved(err, environment) {
         if (err) res.json(err.status || 500, err);
         else res.json(200, environment);
      });
   });
   
   router.post("/environment/:name", function createEnvironment(name) {
      var res = this.res, target = {
         name: name,
         env: JSON.parse(this.req.body || '{}')
      };
      Environment.create(target, function environmentCreated(err, environment) {
         if (err) res.json(500, err);
         else res.json(200, environment);
      });
   });
   
   router.put("/environment/:name", function updateEnvironment(name) {
      var res = this.res, target = {
         name: name
      };
      Environment.update(Environment.url(target), target, function environmentUpdated(err, environment) {
         if (err) res.json(err.status || 500, err);
         else res.json(200, environment);
      });
   });
}
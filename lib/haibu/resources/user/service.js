//
// CRUD /user/:username
//

var User = require('./resource');

exports.createRoutes = function createRoutes(router) {
   router.delete("/user/:name", function deleteUser(name) {
      var res = this.res, target = {
         name: name
      };
      User.destroy(User.url(target), function userDeleted(err) {
         if (err) res.json(500, err);
         else res.json(200, target);
      });
   });
   
   router.get("/user/:name", function getUser(name) {
      var res = this.res, target = {
         name: name
      };
      User.get(User.url(target), function userRetrieved(err, user) {
         if (err) res.json(500, err);
         else res.json(200, user);
      });
   });
   
   router.post("/user/:name", function createUser(name) {
      var res = this.res, target = {
         name: name
      };
      User.create(target, function userCreated(err, user) {
         if (err) res.json(500, err);
         else res.json(200, user);
      });
   });
   
   router.put("/user/:name", function updateUser(name) {
      var res = this.res, target = {
         name: name
      };
      User.update(User.url(target), target, function userUpdated(err, user) {
         if (err) res.json(500, err);
         else res.json(200, user);
      });
   });
}
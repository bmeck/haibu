var haibu = require('../../../haibu.js');
//
// TODO
//   - Really long urls...
//
// POST /environment/:envname/user/:user/application/:application/repository/:repository/drone
//   - Creates a new drone
// GET|DELETE /environment/:envname/user/:user/application/:application/repository/:repository/drone/:uid
//

exports.createRoutes = function createRoutes(router) {
   router.post('/drone', function createDrone(environment, user, application, repository) {
      var res = this.res, target = {
         environment: environment,
         repository: {
            name: repository,
            application: {
               name: application,
               user: user
            }
         }
      };
      haibu.resources.Environment.get(haibu.resources.Environment.url({name: environment}), function retrievedEnvironment(err, env) {
         env.createDrone(target.repository, function droneCreated(err, drone) {
            if (err) res.json(err.status || 500, err);
            else res.json(200, drone);
         });
      });
   });
   
   router.delete("/drone/:uid", function deleteEnvironment(name) {
      var res = this.res, target = {
         _id: uid
      };
      Drone.destroy(Drone.url(target), function environmentDeleted(err) {
         if (err) res.json(err.status || 500, err);
         else res.json(200, target);
      });
   });
   
   router.get("/drone/:uid", function getEnvironment(uid) {
      var res = this.res, target = {
         _id: uid
      };
      Drone.get(Drone.url(target), function environmentRetrieved(err, drone) {
         if (err) res.json(err.status || 500, err);
         else res.json(200, drone);
      });
   });
   
   //
   // Means to tail the logs of a drone
   //
   router.get("/drone/:uid/logs", function tailLogs() {
      var n = this.params.n || Infinity;
      Drone.get(Drone.url(target), function environmentRetrieved(err, drone) {
         if (err) res.json(500, err);
         else {
            res.writeHead(200);
            drone.onAny(function tailEvent() {
               var str;
               try {
                  str = JSON.stringify({
                     event: this.event,
                     arguments: [].slice.call(arguments)
                  });
               }
               catch (e) {
                  str = JSON.stringify({
                     event: this.event,
                     error: e
                  });
               }
               res.write(str);
               --n;
               if (n <= 0) {
                  drone.offAny(tailEvent);
               }
            });
         }
      });
   });
}
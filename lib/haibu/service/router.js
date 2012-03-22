var applicationService = require('../resources/application/service'),
   droneService = require('../resources/drone/service'),
   environmentService = require('../resources/environment/service'),
   repositoryService = require('../resources/repository/service'),
   userService = require('../resources/user/service');

exports.createRoutes = function createRouter(router) {
   
   userService.createRoutes(router);
   router.path('/user/:username', function addApplicationRoutes() {
      applicationService.createRoutes(this);
      
      this.path('/application/:appname', function addRepositoryRoutes() {
         repositoryService.createRoutes(this);
      });
   });
   
   environmentService.createRoutes(router);
   router.path('/environment/:envname/user/:username/application/:appname/repository/:repository', function addDroneRoutes() {
      droneService.createRoutes(this);
   });

}
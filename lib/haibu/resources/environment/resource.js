var resourceful = require('resourceful'),
  haibu = require('../../../haibu.js'),
  Environment = module.exports = resourceful.define(require('./schema.json'));

Object.defineProperty(Environment.prototype, '_id', {
    enumerable: true,
    configurable: false,
    get: function getId() {
        return Environment.url(this);
    }
});

Environment.url = function (params) {
    return '/environment/' + params.name;
}

//
// Creates a drone and ties it to this environment
//
// config : {
//    // use the repository to get user and application
//    repository: Repository
// }
//
Environment.prototype.createDrone = function createDrone(config, callback) {
    var self = this;
    haibu.resources.Repository.get(haibu.resources.Repository.url(config), function (err, repo) {
        console.error('grab repo',arguments, config)
        if (err) {
            callback(err);
            return;
        }
        haibu.resources.Drone.create({
            environment: self.name,
            repository: repo
        }, function (err, drone) {
        console.error('create drone',arguments)
            if (err) {
                callback(err);
                return;
            }
            drone.monitor.on('stop', function () {
                var index = self.drones.indexOf(drone);
                if (index !== -1) {
                    self.drones.splice(index, 1);
                }
            });
            self.drones = self.drones || [];
            self.drones.push(drone);
            callback(false, drone);
        });
    });
}
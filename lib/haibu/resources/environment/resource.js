function Environment(name) {
    if (this instanceof Environment) {
        this.name = name;
        this.drones = [];
        return this;
    }
    return new Environment(name);
}

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
    Repository.get(User.url({
        name: config.repository,
        application: {
            name: config.application,
            user: config.user
        }
    }), function (err, repo) {
        if (err) {
            callback(err);
            return;
        }
        Drone.create({
            environment: self,
            repository: repo
        }, function (err, drone) {
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
            self.drones.push(drone);
            callback(false, drone);
        });
    });
}
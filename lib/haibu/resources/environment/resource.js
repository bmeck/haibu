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

Environment.prototype.createDrone = function createDrone(repository) {
    var self = this;
    var drone = new Drone(application, self);
    drone.monitor.on('stop', function () {
        var index = self.drones.indexOf(drone);
        if (index !== -1) {
            self.drones.splice(index, 1);
        }
    });
    self.drones.push(drone);
    return drone;
}
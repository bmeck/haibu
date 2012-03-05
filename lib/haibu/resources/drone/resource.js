var resourceful = require('resourceful'),
  forever = require('forever'),
  Drone = module.exports = resourceful.define(require('./schema.json'));
  
Drone.after('create', function (event, obj, next) {
    obj.monitor = new forever.Monitor(obj.config.forever);
    next(false, obj);
});

//
// Installs dependencies and copies files to the directory
// Runs lifecycle scripts from this.pkg
//  preinstall
//  install
//  postinstall
//  prestart
//  start
//  poststart
//
Drone.prototype.bootstrap = function bootstrap() {
    lifecycle(this.pkg.scripts, [copy, 'preinstall', install, 'install', 'postinstall']);
}

//
// Restarts a process
//
Drone.prototype.restart = function restart() {
    this.monitor.restart();
}

//
// Duplicates another worker
//
Drone.prototype.clone = function clone(callback) {
    Drone.create(this, function () {
        ;
    });
}

//
// Completely removes the installation (including the directory)
//
Drone.prototype.clean = function clean() {
    ;
}

//
// Runs lifecycle scripts from this.pkg
//  prestop
//  stop
//  poststop
// Kills the directory
//
Drone.prototype.stop = function stop() {
    this.monitor.stop();
}
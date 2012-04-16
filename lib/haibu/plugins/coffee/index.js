var coffee = exports;

coffee.name = 'coffee';

coffee.init = function (done) {
  done();
};

coffee.attach = function attach(options) {
  haibu.config.stores.defaults['allowed-executables'].push('coffee');
  haibu.config.stores.defaults['file-extensions']['.coffee'] = 'coffee';
  
  var _getCarapaceArgv = Drone.prototype.getCarapaceArgv;
  Drone.prototype.getCarapaceArgv = function getCarapaceArgv(foreverOptions, callback) {
    _getCarapaceArgv.call(this, foreverOptions, function argvRetrieved(err, argv) {
      if (err) {
        callback(err);
        return;
      }
      if (foreverOptions.command === 'coffee') {
        callback(false, argv.concat(['--plugin', 'coffee', '--coffee', 'true']));
      }
      callback(false, argv.concat(['--plugin', 'coffee']));
    })
  }
}
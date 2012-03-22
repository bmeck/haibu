var haibu = require('../../../haibu'),
  path = require('path'),
  forever = require('forever'),
  fs = require('fs'),
  utile = require('utile'),
  Drone = require('./resource');

var defaultCarapace = path.join(__dirname, '..', '..', '..', '..', 'node_modules', '.bin', 'carapace');

Drone.prototype.getForeverOptions = function getForeverOptions(callback) {
  var self = this;
  haibu.resources.Environment.get(this.environment, function environmentRetrieved(err, environment) {
    //
    // If no environment is found, use empty env
    //
    if (err) {
      if (err.status !== 404) {
        callback(err);
        return;
      }
      environment = {
        env: process.env
      }
    }
    var env = {};
    Object.keys(environment.env || {}).forEach(function (key) {
      env[key] = environment.env[key];
    });
    Object.keys(self.repository.env || {}).forEach(function (key) {
      env[key] = self.repository.env[key];
    });
    Object.keys(self.env || {}).forEach(function (key) {
      env[key] = self.env[key];
    });
    var cwd = path.join(haibu.config.get('directories:root') || '/', haibu.config.get('directories:apps'), Drone.url(self));
    //
    // single and double quote strings, quoted literals
    //
    var args = self.repository.scripts.start.match(/'(?:\\[\s\S]|[^'])'|"(?:\\[\s\S]|[^"])"|(?:\\.|\S)+/g);
    var carapaceBin = self.carapace || defaultCarapace;
    var foreverOptions = {
      fork: true,
      silent: true,
      cwd: cwd,
      env: env,
      hideEnv:   haibu.config.get('hideEnv'),
      forkShim:  self.forkShim,
      minUptime: self.minUptime,
      options: [carapaceBin].concat(args),
      command: 'node'
    };
    callback(false, foreverOptions);
  });
}

//
// Create the forever monitor with the proper options
//
Drone.prototype.spawn = function spawn(callback) {
  var self = this,
      app  = self.repository,
      meta = { app: app.application.name, user: app.application.user },
      script = app.scripts.start,
      result,
      responded = false,
      stderr = [],
      stdout = [],
      options = [],
      foreverOptions,
      carapaceBin,
      error,
      child;

  haibu.emit('spawn:setup', 'info', meta);
  
  this.getForeverOptions(function spawnMonitor(err, foreverOptions) {
    if (err) {
      callback(err);
      return;
    }
    createChild(foreverOptions);
  });

  function createChild(foreverOptions) {
    if (self.maxRestart == null) {
      foreverOptions.forever = true;
    }
    else {
      foreverOptions.max = self.maxRestart;
    }
  
    //
    // Before we attempt to spawn, let's check if the startPath actually points to a file
    // Trapping this specific error is useful as the error indicates an incorrect
    // scripts.start property in the package.json
    //
    var scriptPath = path.join(haibu.config.get('directories:root') || '/', haibu.config.get('directories:apps'), path.join(Drone.url(self), script));
                               
    fs.stat(scriptPath, function (err, stats) {
      console.error(arguments)
      if (err) {
        callback(haibu.createUserError(
          new Error('package.json error: ' + 'can\'t find starting script: ' + script),
          'Package.json start script declared but not found'
        ));
        return;
      }
      
      carapaceBin = foreverOptions.options.shift();
      console.error(carapaceBin)
      child = new forever.Monitor(carapaceBin, foreverOptions);
      child.on('error', function () {
        //
        // 'error' event needs to be caught, otherwise
        // the haibu process will die
        //
      });
  
      haibu.emit(['spawn', 'begin'], 'info', {
        options: foreverOptions.options.join(' '),
        app: meta.app,
        user: meta.user,
        drone: child,
        pkg: app
      });
      
      console.error(123)
      //
      // Log data from `child.stdout` to haibu
      //
      function onStdout (data) {
        data = data.toString()
        
        haibu.emit(['drone', 'stdout'], 'info', data, meta);
  
        if (!responded) {
          stdout = stdout.concat(data.split('\n').filter(function (line) { return line.length > 0 }));
        }
      }
  
      //
      // Log data from `child.stderr` to haibu
      //
      function onStderr (data) {
        data = data.toString()
        
        haibu.emit(['drone', 'stderr'], 'error', data, meta);
  
        if (!responded) {
          stderr = stderr.concat(data.split('\n').filter(function (line) { return line.length > 0 }));
        }
      }
  
      //
      // If the `forever.Monitor` instance emits an error then
      // pass this error back up to the callback.
      //
      // (remark) this may not work if haibu starts two apps at the same time
      //
      function onError (err) {
        if (!responded) {
          errState = true;
          responded = true;
          callback(err);
  
          //
          // Remove listeners to related events.
          //
          child.removeListener('exit', onExit);
          child.removeListener('message', onCarapacePort);
        }
      }
  
      //
      // When the carapace provides the port that the child
      // has bound to then respond to the callback
      //
      function onCarapacePort (info) {
        if (!responded && info && info.event === 'port') {
          responded = true;
          self.socket = {
            host: self.host,
            port: info.data.port
          };
          
          child.minUptime = 0;
          
          haibu.emit(['drone', 'port'], 'info', {
            drone: child,
            pkg: app,
            info: info
          });
          
          callback(null, self);
          
          //
          // Remove listeners to related events
          //
          child.removeListener('exit', onExit);
          child.removeListener('error', onError);
        }
      }
  
      //
      // When the child starts, update the result that
      // we will respond with and continue to wait for
      // `*::carapace::port` from `haibu-carapace`.
      //
      function onStart (monitor, data) {
        result = {
          monitor: monitor,
          process: monitor.child,
          data: data
        };
        
        haibu.emit(['drone','start'], 'info', result);
      }
  
      //
      // If the child exits prematurely then respond with an error
      // containing the data we receieved from `stderr`
      //
      function onExit () {
        if (!responded) {
          errState = true;
          responded = true;
          error = haibu.createUSerError(
            new Error('Error spawning drone'),
            'Script prematurely exited'
          );
          error.stdout = stdout.join('\n');
          error.stderr = stderr.join('\n');
          callback(error);
  
          //
          // Remove listeners to related events.
          //
          child.removeListener('error', onError);
          child.removeListener('message', onCarapacePort);
        }
      }
  
      //
      console.error(1234)
      // Listen to the appropriate events and start the child process.
      //
      child.on('stdout', onStdout);
      child.on('stderr', onStderr);
      child.once('exit', onExit);
      child.once('error', onError);
      child.once('start', onStart);
      child.on('message', onCarapacePort);
      child.start();
      self.monitor = child;
    });
  }
};

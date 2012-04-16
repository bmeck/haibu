var haibu = require('../../../haibu.js'),
  path = require('path'),
  forever = require('forever'),
  fs = require('fs'),
  utile = require('utile'),
  Drone = require('./resource');

var defaultCarapace = path.join(__dirname, '..', '..', '..', '..', 'node_modules', '.bin', 'carapace');

Drone.prototype.getExecutable = function getExecutable(callback) {
  var self = this;
  haibu.resources.Repository.get(haibu.resources.Repository.url(self.repository), function (err, repository) {
    if (err) {
      callback(err);
      return;
    }
    var script =  repository.scripts.script;
    var scriptPath = path.join(haibu.config.get('directories:root'), haibu.config.get('directories:apps'), path.join(Drone.url(self), script));
    console.error(scriptPath)
    try {
      var fstream = fs.createReadStream(scriptPath);
    }
    catch (e) {
      console.error(e);
      throw e;
    }
    console.error('pok?');
    var line = '';
    var done = false;
    fstream.on('data',function fileRead(data) {
      line += data;
      if (/\r\n/.test(line)) {
        fstream.destroy();
        checkShebang();
      }
    });
    fstream.on('error', callback);
    fstream.on('end', function fileRead() {
      checkShebang();
    });
    function checkShebang() {
      if (done) return;
      //
      // Remove the actual '#!'
      // Remove /usr/bin/env
      //
      line = line.replace(/^(?:[/]usr(?:[/]local)?[/]bin[/]env\s*)?/, '');
      //
      // Strip out the command
      //
      var shebang = /(?:\\.|\S)+/.exec(line);
      var executable;
      if (shebang) {
        executable = path.basename(shebang[0]);
      }
      else {
        executable = haibu.config.get('file-extensions')[path.extname(script)];
      }
      if (haibu.config.get('allowed-executables').indexOf(executable) != -1) {
        callback(false, shebang);
      }
      else {
        callback(new Error('No allowed executable found'));
      }
    }
  });
}

Drone.prototype.getCarapaceArgv = function getCarapaceArgv(callback) {
  callback(false, []);
}

Drone.prototype.getForeverOptions = function getForeverOptions(callback) {
  var self = this;
  haibu.resources.Repository.get(haibu.resources.Repository.url(self.repository), function (err, repository) {
    if (err) {
      callback(err);
      return;
    }
    console.error(self)
    haibu.resources.Environment.get(haibu.resources.Environment.url(self.environment), function environmentRetrieved(err, environment) {
      //
      // If no environment is found, use empty env
      //
      console.error('forever has env',arguments)
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
      Object.keys(process.env).forEach(function (key) {
        env[key] = process.env[key];
      });
      Object.keys(environment.env || {}).forEach(function (key) {
        env[key] = environment.env[key];
      });
      Object.keys(repository.env || {}).forEach(function (key) {
        env[key] = self.repository.env[key];
      });
      Object.keys(self.env || {}).forEach(function (key) {
        env[key] = self.env[key];
      });
      var cwd = path.join(haibu.config.get('directories:apps'), path.dirname(Drone.url(self)));
      //
      // single and double quote strings, quoted literals
      //
      var args = repository.scripts.start.match(/'(?:\\[\s\S]|[^'])'|"(?:\\[\s\S]|[^"])"|(?:\\.|\S)+/g);
      var carapaceBin = self.carapace || defaultCarapace;
      console.error('getting executable')
      self.getExecutable(function executableRetrieved(err, executable) {
        console.error('got executable', arguments)
        if (err) {
          callback(err);
          return;
        }
        
        var foreverOptions = {
          fork: true,
          silent: true,
          cwd: cwd,
          env: env,
          hideEnv:   haibu.config.get('hideEnv'),
          forkShim:  self.forkShim,
          minUptime: self.minUptime,
          options: [carapaceBin].concat(args),
          command: executable
        };
        self.getCarapaceArgv(foreverOptions, function argvRetrieved(err, carapaceArgv) {
          if (err) {
            callback(err);
            return;
          }
          foreverOptions.options = [carapaceBin].concat(carapaceArgv, args);
          callback(false, foreverOptions);
        });
        
      });
    });
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

  console.error('spawning')
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
    var scriptPath = path.join(haibu.config.get('directories:root'), haibu.config.get('directories:apps'), path.join(Drone.url(self), script));
                               
    fs.stat(scriptPath, function (err, stats) {
      if (err) {
        callback(haibu.createUserError(
          new Error('package.json error: ' + 'can\'t find starting script: ' + script),
          'Package.json start script declared but not found'
        ));
        return;
      }
      
      carapaceBin = foreverOptions.options.shift();
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

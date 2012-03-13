var haibu = require('../../../haibu'),
   Drone = require('./resource');

Drone.prototype.spawn = function spawn(callback) {
  var self = this,
      app  = self.app,
      meta = { app: app.name, user: app.user },
      script = self.scripts.start,
      result,
      responded = false,
      stderr = [],
      stdout = [],
      options = [],
      foreverOptions,
      carapaceBin,
      error,
      drone;

  haibu.emit('spawn:setup', 'info', meta);
  
  try {
    var spawnOptions = self.getSpawnOptions(app);
  }
  catch (e) {
    return callback(e);
  }

  foreverOptions = {
    fork:      true,
    silent:    true,
    cwd:       haibu.config.get('directories:'),
    hideEnv:   haibu.config.get('hideEnv'),
    env:       spawnOptions.env,
    forkShim:  spawnOptions.forkShim,
    minUptime: this.minUptime,
    command:   spawnOptions.command,
    options:   [spawnOptions.carapaceBin].concat(options)
  };
  //
  // Concatenate the `argv` of any plugins onto the options
  // to be passed to the carapace script.
  //
  Object.keys(haibu.plugins).forEach(function (plugin) {
    var spawn;

    if (haibu.plugins[plugin].argv) {
      haibu.emit('plugin:argv', 'info', {
        app: app.name,
        user: app.user,
        plugin: plugin
      });

      spawn = haibu.plugins[plugin].argv(repo);

      if (spawn.script) {
        script = spawn.script
      }

      if (spawn.argv) {
        foreverOptions.options = foreverOptions.options.concat(spawn.argv);
      }
    }
  });

  foreverOptions.forever = typeof self.maxRestart === 'undefined';
  if (typeof self.maxRestart !== 'undefined') {
    foreverOptions.max = self.maxRestart;
  }

  //
  // Before we attempt to spawn, let's check if the startPath actually points to a file
  // Trapping this specific error is useful as the error indicates an incorrect
  // scripts.start property in the package.json
  //
  fs.stat(path.join(rootDir, script), function (err, stats) {
    if (err) {
      var err = new Error('package.json error: ' + 'can\'t find starting script: ' + repo.app.scripts.start);
      err.blame = {
        type: 'user',
        message: 'Package.json start script declared but not found'
      }
      return callback(err);
    }

    foreverOptions.options.push(script);
    carapaceBin = foreverOptions.options.shift();
    drone = new forever.Monitor(carapaceBin, foreverOptions);
    drone.on('error', function () {
      //
      // 'error' event needs to be caught, otherwise
      // the haibu process will die
      //
    });

    haibu.emit(['spawn', 'begin'], 'info', {
      options: foreverOptions.options.join(' '),
      app: meta.app,
      user: meta.user,
      drone: drone,
      pkg: app
    });

    //
    // Log data from `drone.stdout` to haibu
    //
    function onStdout (data) {
      data = data.toString()
      haibu.emit('drone:stdout', 'info', data, meta);

      if (!responded) {
        stdout = stdout.concat(data.split('\n').filter(function (line) { return line.length > 0 }));
      }
    }

    //
    // Log data from `drone.stderr` to haibu
    //
    function onStderr (data) {
      data = data.toString()
      haibu.emit('drone:stderr', 'error', data, meta);

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
        drone.removeListener('exit', onExit);
        drone.removeListener('message', onCarapacePort);
      }
    }

    //
    // When the carapace provides the port that the drone
    // has bound to then respond to the callback
    //
    function onCarapacePort (info) {
      if (!responded && info && info.event === 'port') {
        responded = true;
        result.socket = {
          host: self.host,
          port: info.data.port
        };
        
        drone.minUptime = 0;
        
        haibu.emit(['drone', 'port'], 'info', {
          drone: drone,
          pkg: app,
          info: info
        });
        
        callback(null, result);
        
        //
        // Remove listeners to related events
        //
        drone.removeListener('exit', onExit);
        drone.removeListener('error', onError);
      }
    }

    //
    // When the drone starts, update the result that
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
    // If the drone exits prematurely then respond with an error
    // containing the data we receieved from `stderr`
    //
    function onExit () {
      if (!responded) {
        errState = true;
        responded = true;
        error = new Error('Error spawning drone');
        error.blame = {
          type: 'user',
          message: 'Script prematurely exited'
        }
        error.stdout = stdout.join('\n');
        error.stderr = stderr.join('\n');
        callback(error);

        //
        // Remove listeners to related events.
        //
        drone.removeListener('error', onError);
        drone.removeListener('message', onCarapacePort);
      }
    }

    //
    // Listen to the appropriate events and start the drone process.
    //
    drone.on('stdout', onStdout);
    drone.on('stderr', onStderr);
    drone.once('exit', onExit);
    drone.once('error', onError);
    drone.once('start', onStart);
    drone.on('message', onCarapacePort);
    drone.start();
  });
};


Drone.prototype.getSpawnOptions = function getSpawnOptions (app, callback) {
  var env = app.env, 
      command = 'node',
      nodeDir,
      version,
      engine = (app.engines || app.engine || {node: app.engine}).node,
      cwd,
      engineDir = haibu.config.get('directories:node-installs'),
      nodeVersions = engineDir && fs.readdirSync(engineDir),
      carapaceDir = haibu.config.get('directories:carapace-installs'),
      carapaceVersions = carapaceDir && fs.readdirSync(carapaceDir);
      
  var options = {};
  if (nodeVersions) {
    engine = (app.engines || app.engine || {node: app.engine}).node;
    if (typeof engine !== 'string') {
      engine = '0.4.x';
    }
    version = semver.maxSatisfying(nodeVersions, engine);
    if (!version) {
      var err = new Error('Error spawning drone: no matching engine found');
      err.blame = {
        type: 'user',
        message: 'Repository configuration'
      }
      throw err;
    }
    nodeDir = path.join(engineDir, version);
  }
  if (carapaceVersions) {
    if (typeof engine !== 'string') {
      engine = '0.4.x';
    }
    version = semver.maxSatisfying(carapaceVersions, engine);
    if (!version) {
      var err = new Error('Error spawning drone: no matching carapace found');
      err.blame = {
        type: 'user',
        message: 'Repository configuration'
      }
      throw err;
    }
    options.carapaceBin = path.join(carapaceDir, version, 'node_modules', 'haibu-carapace', 'bin', 'carapace');
  }
  else {
    options.carapaceBin = path.join(require.resolve('haibu-carapace'), '..', '..', 'bin', 'carapace');
  }

  if (version) {
    //
    // Add node (should be configured with --no-npm) and -g modules to path of repo
    //
    if (semver.lt(version, '0.6.5')) {
      options.forkShim = carapaceVersions ? path.join(options.carapaceBin, '..', '..', '..', 'node-fork', 'lib', 'fork.js') : true;
    }
    if (env) {
      env.NODE_VERSION = 'v'+version;
      env.NODE_PREFIX = nodeDir;
      env.NODE_PATH = path.join(nodeDir, 'lib', 'node_modules');
      var concatPATH = (process.env.PATH ? ':' + process.env.PATH : '');
      env.PATH = path.join(nodeDir, 'bin') + ':' + path.join(nodeDir, 'node_modules') + concatPATH;
      var concatCPATH = (process.env.CPATH ? ':' + process.env.CPATH : '');
      env.CPATH = path.join(nodeDir, 'include') + ':' + path.join(nodeDir, 'include', 'node') + concatCPATH;
      var concatLIBRARY_PATH = (process.env.LIBRARY_PATH ? ':' + process.env.LIBRARY_PATH : '');
      env.LIBRARY_PATH = path.join(nodeDir, 'lib') + ':' + path.join(nodeDir, 'lib', 'node') + concatLIBRARY_PATH;
    }
    
    options.cwd = nodeDir;
    command = path.join(nodeDir, 'bin', 'node');
  }

  options.env = env;
  options.command = command;
  options.sourceDir = haibu.config.get('directories:apps'), ''
  
  return options;
}
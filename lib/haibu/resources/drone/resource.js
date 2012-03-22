var resourceful = require('resourceful'),
  fs = require('fs'),
  path = require('path'),
  spawn = require('child_process').spawn;
  lifecycle = require('../../common/lifecycle'),
  Drone = module.exports = resourceful.define(require('./schema.json'));
  
require('./spawner.js');

//
// Drones represent processes, these should be spawned immediately
//
Drone.after('create', function boostrapDrone(event, obj, next) {
    obj.bootstrap(function bootstrapped(err) {
        
        if (err) {
            next(err);
            return;
        }
        var validation = obj.validate();
        if (validation.valid) {
            obj.spawn(next);
        }
        else {
            next(validation.errors);
        }
    });
});

Drone.url = function (params) {
    return '/environment/' + params.environment
        + '/user/' + params.repository.application.user
        + '/application/' + params.repository.application.name
        + '/repository/' + params.repository.name
        + '/drone/' + params._id;
}

Drone.prototype.copy = function copy(callback) {
    var self = this;
    this.getForeverOptions(function configured(err, foreverOptions) {
        if (err) {
            callback(err);
            return;
        }
        self.repository.install(foreverOptions.cwd, function repositoryCopied(err) {
            if (err) {
                callback(err);
                return;
            }
            callback();
        });
    });
}

Drone.prototype.install = function install(callback) {
    this.getForeverOptions(function configured(err, foreverOptions) {
        if (err) {
            callback(err);
            return;
        }
        
        var npm = spawn('npm', ['install'], {
            cwd: foreverOptions.sourceDir
        });
        npm.stdout.on('data', function(data) {
            
        })
        npm.stderr.on('data', function(data) {
            
        })
        npm.on('exit', function npmInstalled(exitCode) {
            if (exitCode) {
                var err = new Error('NPM install failed');
                err.code = exitCode;
                callback(err);
                return;
            }
            callback();
        });
    });
}

Drone.prototype.toJSON = function toJSON() {
    var json = {};
    var self = this;
    Object.keys(this).forEach(function (key) {
        if (['monitor'].indexOf(key) === -1) {
            json[key] = self[key];
        }
    });
    return json;
}

Drone.prototype.npmScript = function npmScript(script) {
    var self = this;
    return function scriptRunner(callback) {
        var npmConfig = self.config.npm;
        spawn(npmConfig.bin || 'npm', ['run-script', script].concat(npmConfig.argv), {
            cwd: self.config.sourceDir,
            env: npmConfig.env
        });
        spawn.on('exit', function npmInstalled(exitCode) {
            if (exitCode) {
                var err = new Error('NPM run-script "' + script + '" failed');
                err.code = exitCode;
                callback(err);
                return;
            }
            callback();
        });
    }
}

//
// Installs dependencies and copies files to the directory
// Runs lifecycle scripts from this.pkg
//   preinstall
//   install
//   postinstall
//
Drone.prototype.bootstrap = function bootstrap(callback) {
    var self = this;
    this.getForeverOptions(function configured(err, foreverOptions) {
        if (err) {
            callback(err);
            return;
        }
        fs.stat(path.join(foreverOptions.sourceDir, self.repository.scripts.start), function (err) {
            var needsBootstrap = !!err;
            if (!needsBootstrap && typeof self.repository.dependencies === 'object' && self.repository.dependencies) {
                Object.keys(this.repository.dependencies).forEach(function checkDependency(dependency) {
                    var dependencyPackage;
                    try {
                        dependencyPackage = require(path.join(foreverOptions.sourceDir, 'node_modules', dependency, 'package.json'));
                    }
                    catch (e) {
                        needsBootstrap = true;
                        return;
                    }
                    var dependencyVersion = dependencyPackage.version;
                    if (!semver.valid(dependencyVersion, dependencies[dependency])) {
                        needsBootstrap = true;
                    }
                });
            }
            if (!needsBootstrap) {
                callback();
                return;
            }
            self.copy(function repositoryCopiedToLocal(err) {
                if (err) {
                    
                    callback(err);
                    return;
                }
                self.install(callback);
            });
        });
    });
}

//
// Restarts a process
//
Drone.prototype.restart = function restart() {
    this.monitor.restart();
}

//
// Completely removes the installation (including the directory)
//   preuninstall
//   uninstall
//   postuninstall
//
Drone.prototype.clean = function clean() {
    var self = this;
    lifecycle({
        cwd: this.config.sourceDir,
        scripts: this.pkg.scripts,
        timeout: bootstrapConfig.timeout || 10000
    }, [
        this.stop.bind(this),
        this.npmScript('preuninstall'),
        this.npmScript('uninstall'),
        function removeSource() {
            utile.rimraf(self.getForeverOptions().sourceDir);
        },
        this.npmScript('postuninstall')
        
    ], callback);
}

//
// Runs lifecycle scripts from this.pkg
//   prestop
//   stop
//   poststop
// Kills the directory
//
Drone.prototype.stop = function stop(callback) {
    lifecycle({
        cwd: this.config.sourceDir,
        scripts: this.pkg.scripts,
        timeout: bootstrapConfig.timeout || 10000
    }, [
        this.npmScript('prestop'),
        function (next) {
            this.monitor.stop();
            next();
        },
        this.npmScript('stop'),
        this.npmScript('poststop')
    ], callback);
}
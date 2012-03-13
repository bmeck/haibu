var resourceful = require('resourceful'),
  forever = require('forever'),
  libspawn = require('child_process').spawn,
  lifecycle = require('../../common/lifecycle'),
  Drone = module.exports = resourceful.define(require('./schema.json'));

//
// Drones represent processes, these should be spawned immediately
//
Drone.after('create', function boostrapDrone(event, obj, next) {
    obj.bootstrap(function bootstrapped(err) {
        if (err) {
            next(err);
            return;
        }
        obj.environment = obj.environment || process.env;
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
        + '/user/' + params.user
        + '/application/' + params.application
        + '/repository/' + params.repository
        + '/drone/' + params._id;
}

Drone.prototype.spawn = function spawn(callback) {
    this.spawn(callback);
}

Drone.prototype.copy = function copy(callback) {
    this.repository.copy(this.config.sourceDir, function repositoryCopied(err) {
        if (callback) {
            if (err) callback(err);
            else callback();
        }
    });
}

Drone.prototype.install = function install(callback) {
    var npmConfig = this.config.npm;
    spawn(npmConfig.bin || 'npm', ['install'].concat(npmConfig.argv), {
        cwd: this.config.sourceDir,
        env: npmConfig.env
    });
    spawn.on('exit', function npmInstalled(exitCode) {
        if (exitCode) {
            var err = new Error('NPM install failed');
            err.code = exitCode;
            callback(err);
            return;
        }
        callback();
    });
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
    var self = this, bootstrapConfig = this.config && this.config.bootstrap;
    callback();
    return;
    var dependencies = this.config.package.dependencies;
    var needsBootstrap;
    Object.keys(dependencies).forEach(function checkDependency(dependency) {
        var dependencyPackage;
        try {
            dependencyPackage = require(path.join(self.config.sourceDir, 'node_modules', dependency, 'package.json'));
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
    if (!needsBootstrap) {
        callback();
        return;
    }
    lifecycle({
        cwd: this.config.sourceDir,
        scripts: this.pkg.scripts,
        timeout: bootstrapConfig.timeout || 10000
    }, [
        this.copy.bind(this),
        this.npmScript('preinstall'),
        this.install.bind(this),
        this.npmScript('install'),
        this.npmScript('postinstall')
    ], callback);
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
            utile.rimraf(self.config.sourceDir);
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
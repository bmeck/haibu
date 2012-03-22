/*
 * haibu.js: Top level include for the haibu module
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'),
    errs = require('errs'),
    path = require('path'),
    flatiron = require('flatiron'),
    semver = require('semver');

var haibu = module.exports = new flatiron.App({
  delimiter: '.',
  root: path.join(__dirname, '..'),
  directories: {
    apps: '#ROOT/local',
    autostart: '#ROOT/autostart',
    config: '#ROOT/config',
    cache: '#ROOT/cache',
    tmp: '#ROOT/tmp'
  }
});

haibu.common = require('./haibu/common');

haibu.createUserError = function UserError(err, msg) {
  if (arguments.length === 1) {
    msg = err;
    err = errs.create('UserError : '+ msg);
  }
  else {
    err = errs.create(err);
  }
  return err.merge(err, {
    blame: {
      type: 'user',
      message: msg
    }
  });
}

haibu.createSystemError = function createSystemError(err, msg) {
  if (arguments.length === 1) {
    msg = err;
    err = errs.create('SystemError : '+ msg);
  }
  else {
    err = errs.create(err);
  }
  return err.merge({
    blame: {
      type: 'system',
      message: msg
    }
  });
}

//
// Expose version through `pkginfo`.
//
require('pkginfo')(module, 'version');

//
// Set up all the resources
//
haibu.resources  = require('./haibu/resources');

//
// Set the default allowed executables
//
haibu.config.defaults({
   'allowed-executables': ['node', 'coffee']
});

//
// TODO: Should be express compatible?? (untested)
//
haibu.createRoutes = require('./haibu/service/router').createRoutes;

//
// Dynamically pull in plugins from  /plugins, and the `core` plugins
//
haibu.plugins = {};
function addPluginsSync(pluginsDir) {
   fs.readdirSync(pluginsDir).forEach(function addPlugin(plugin) {
      var pluginPath = path.join(pluginsDir, plugin);
      try {
         pluginPath = require.resolve(pluginPath);
      }
      catch (e) {
         return;
      }
      //
      // Ignore non-loadable files
      //
      if (require.extensions[path.extname(path)]) {
         Object.defineProperty(haibu.plugins, {
            enumerable: true,
            configurable: false,
            get: function getPlugin() {
               return require(pluginPath);
            }
         });
      }
   });
}

//
// `core` plugins
//
addPluginsSync(path.join(__dirname, 'haibu', 'plugins'));

//
// `user` plugins
//
try {
   addPluginsSync(path.join(__dirname, '..', 'plugins'));
}
catch (e) {
   // ignore, user plugins dir is missing
}

haibu.use(require('./haibu/autostart/autostart.js'));

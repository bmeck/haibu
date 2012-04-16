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
  root: path.join(__dirname, '..')
});

haibu.use(flatiron.plugins.directories, {
  apps: '#ROOT/local',
  config: '#ROOT/config',
  db: '#ROOT/db',
  tmp: '#ROOT/tmp'
})

haibu.common = require('./haibu/common');

function arrayToErr(arr) {
  return new Error(arr.map(function massageObject(err) {
    if (err.property) {
      return 'Property ' + err.property + ' is invalid';
    }
    else if (err.message) {
      return err.message;
    }
    else {
      return '' + err;
    }
  }).join('; '));
}

haibu.createUserError = function UserError(err, msg) {
  if (typeof err !== 'object') {
    msg = err;
    err = errs.create('SystemError : '+ msg);
  }
  if (Array.isArray(err)) {
    err = arrayToErr(err);
  }
  return errs.merge(err, {
    blame: {
      type: 'user',
      message: msg
    }
  });
}
haibu.createSystemError = function createSystemError(err, msg) {
  if (typeof err !== 'object') {
    msg = err;
    err = errs.create('SystemError : '+ msg);
  }
  if (Array.isArray(err)) {
    err = arrayToErr(err);
  }
  return errs.merge(err, {
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
   'allowed-executables': ['node'],
   'file-extensions': {
    '.node': 'node',
    '.js': 'node'
   }
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
      if (require.extensions[path.extname(pluginPath)]) {
         Object.defineProperty(haibu.plugins, plugin, {
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

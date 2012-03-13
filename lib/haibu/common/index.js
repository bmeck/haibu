/*
 * index.js: Top level module include for utils module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var crypto = require('crypto'),
    fs = require('fs'),
    http = require('http'),
    path = require('path'),
    spawn = require('child_process').spawn,
    flatiron = require('flatiron'),
    async = flatiron.common.async,
    rimraf = flatiron.common.rimraf,
    haibu = require('../../haibu');

var common = module.exports = flatiron.common;

//
// **REALLY DONT DO THIS HERE! But where?**
//
if (!Error.prototype.toJSON) {
  Object.defineProperty(Error.prototype, "toJSON", { 
    enumerable: false, 
    value: function () { 
      return flatiron.common.mixin({ 
        message: this.message, 
        stack: this.stack, 
        arguments: this.arguments
      }, flatiron.common.clone(this));
    } 
  });
}

//
// ### Include Exports
// Export additional common components
//
var bin = common.bin = require('./bin');
var npm = common.npm = require('./npm');

//
// ### function showWelcome (mode, ipAddress, port)
// #### @mode {string} The mode that haibu is currently running in.
// #### @ipAddress {string} The IP Address / host that haibu is binding to.
// #### @port {int} The port that haibu is binding to.
// Prints the signature `haibu` welcome message using the colors module.
//
common.showWelcome = function (role, ipAddress, port) {
  var plugins = Object.keys(haibu.plugins),
      serverMsg;

  serverMsg = [
    'haibu'.yellow.bold,
    'started @'.grey,
    ipAddress.green.bold,
    'on port'.grey,
    port.toString().green.bold,
    'as'.grey,
    role.green.bold
  ].join(' ');

  console.log('      __                  __               '.yellow);
  console.log('     / /_    ______  __  / /_     __  __   '.yellow);
  console.log('    / __ \\  / __  / / / /  __ \\  / / / /   '.yellow);
  console.log('   / / / / / /_/ / / / /  /_/ / / /_/ /    '.yellow);
  console.log('  /_/ /_/  \\__,_/ /_/ /_/\\___/  \\__,_/     '.yellow);
  console.log('  ');
  console.log('  This is Open Source Software available under'.grey);
  console.log('  the MIT License.'.grey);
  console.log('  ');
  console.log('  © 2010 Nodejitsu Inc.'.grey);
  console.log('  All Rights Reserved - www.nodejitsu.com'.grey);

  console.log('  ' + serverMsg);

  //
  // If there are any active plugins then
  // indicate this via logged messages
  //
  if (plugins.length > 0) {
    plugins = plugins.map(function (p) { return p.yellow.bold }).join(', '.grey);
    console.log('    using plugins: '.grey + plugins);
  }
};

//
// ### function getIpAddresses (callback)
// #### @callback {function} The callback function to respond when complete
// Gets the IP Addresses bound to all known network interfaces
//
common.getIpAddresses = function (defaultAddress, callback) {
  var done = false;
  function once() {
    if (done) return;
    done = true;
    callback.apply(this, arguments);
  }
  var interfaces = require('os').networkInterfaces();
  var addresses = [];
  for(var nic in interfaces) {
    var ips = interfaces[nic];
    ips.forEach(function findIPv4(addr) {
      if (addr.family === 'IPv4') {
        addresses.push(addr.address);
      }
    });
  }
  if (addresses.length === 0) {
    addresses[0] = defaultAddress || '127.0.0.1';
  }
  return once(false, addresses);
};

//
// ### function getEndKey (startKey)
// #### @startKey {string} Startkey paramater for querying CouchDB.
// Returns the 'endkey' associated with the `startKey`, that is,
// the same string except with the last character alphabetically incremented.
//
// e.g. `char ==> chas`
//
common.getEndKey = function (startKey) {
  var length = startKey.length;
  return startKey.slice(0, length - 1) + String.fromCharCode(startKey.charCodeAt(length - 1) + 1);
};

//
// ### function rmApp (appsDir, app, callback)
// #### @appsDir {string} Root for all application source files.
// #### @app {App} Application to remove directories for.
// #### @callback {function} Continuation passed to respond to.
// Removes all source code associated with the specified `app`.
//
common.rmApp = function (appsDir, app, callback) {
  return rimraf(path.join(appsDir, app.user, app.name), callback);
};

//
// ### function rmApps (appsDir, callback)
// #### @appsDir {string} Root for all application source files.
// #### @callback {function} Continuation passed to respond to.
// Removes all source code associated with all users and all applications
// from this Haibu process.
//
common.rmApps = function (appsDir, callback) {
  if (!callback && typeof appsDir === 'function') {
    callback = appsDir;
    appsDir = null;
  }

  appsDir = appsDir || haibu.config.get('directories:apps');
  fs.readdir(appsDir, function (err, users) {
    if (err) {
      return callback(err);
    }

    async.forEach(users, function rmUser (user, next) {
      rimraf(path.join(appsDir, user), next);
    }, callback);
  });
};

//
// ### sanitizeAppname (name)
// Returns sanitized appname (with removed characters) concatenated with
// original name's hash
//
common.sanitizeAppname = function (name) {
  var sha1 = crypto.createHash('sha1');

  sha1.update(name);
  return name.replace(/[^a-z0-9\-\_]+/g, '-') + '-' + sha1.digest('hex');
};


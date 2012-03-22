var haibu = require('../../haibu.js'),
   fs = require('fs'),
   async = require('async'),
   path = require('path');

var autostartDirectory = path.join(__dirname, '..', '..', '..', 'autostart');

exports.name = 'multiple-nodes';

exports.attach = function attach() {
   //
   // Get list of installs at startup
   //
   var nodeInstallDir = haibu.config.get('directories:node-installs'),
      nodeVersions = nodeInstallDir && fs.readdirSync(nodeInstallDir),
      carapaceDir = haibu.config.get('directories:carapace-installs'),
      carapaceVersions = carapaceDir && fs.readdirSync(carapaceDir);
      
   var oldGetForeverOptions = haibu.resources.Drone.prototype.getForeverOptions;
   haibu.resources.Drone.prototype.getForeverOptions = function getForeverOptions(callback) {
      var self = this;
      oldGetForeverOptions.call(self, function getMultipleNodesForeverOptions(err, options) {
         if (err) {
            callback(err);
            return;
         }
         var env = options.env, 
           command = options.command,
           nodeDir,
           version,
           engine = (self.engines && self.engines.node) || self.engine,
           cwd;
           
        if (nodeVersions) {
            if (typeof engine !== 'string') {
               engine = '0.4.x';
            }
            version = semver.maxSatisfying(nodeVersions, engine);
            if (!version) {
               callback(haibu.createUserError(
                  new Error('Error spawning drone: no matching node version found'),
                  'Repository configuration'
               ));
               return;
            }
            nodeDir = path.join(nodeInstallDir, version);
         }
         if (carapaceVersions) {
            if (typeof engine !== 'string') {
               engine = '0.4.x';
            }
            version = semver.maxSatisfying(carapaceVersions, engine);
            if (!version) {
               callback(haibu.createUserError(
                  new Error('Error spawning drone: no matching carapace version found'),
                  'Repository configuration'
               ));
               return;
            }
            //
            // Replace the carapace script
            //
            options.options.splice(0, 1, path.join(carapaceDir, version, 'node_modules', 'haibu-carapace', 'bin', 'carapace'));
         }
     
         if (version) {
            //
            // Add node (should be configured with --no-npm) and -g modules to path of repo
            //
            if (semver.lt(version, '0.6.5')) {
               options.forkShim = carapaceVersions ? path.join(options.carapaceBin, '..', '..', '..', 'node-fork', 'lib', 'fork.js') : true;
            }
            env.NODE_VERSION = 'v'+version;
            env.NODE_PREFIX = nodeDir;
            env.NODE_PATH = path.join(nodeDir, 'lib', 'node_modules');
            var concatPATH = (process.env.PATH ? ':' + process.env.PATH : '');
            env.PATH = path.join(nodeDir, 'bin') + ':' + path.join(nodeDir, 'node_modules') + concatPATH;
            var concatCPATH = (process.env.CPATH ? ':' + process.env.CPATH : '');
            env.CPATH = path.join(nodeDir, 'include') + ':' + path.join(nodeDir, 'include', 'node') + concatCPATH;
            var concatLIBRARY_PATH = (process.env.LIBRARY_PATH ? ':' + process.env.LIBRARY_PATH : '');
            env.LIBRARY_PATH = path.join(nodeDir, 'lib') + ':' + path.join(nodeDir, 'lib', 'node') + concatLIBRARY_PATH;
         
            options.cwd = nodeDir;
            options.command = path.join(nodeDir, 'bin', 'node');
         }
         options.sourceDir = haibu.config.get('directories:apps'), ''
         callback(false, options);
      });
   };
}
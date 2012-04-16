//
// source : {
//   type: 'git',
//   repository: 'git@github.com/bmeck/hello-coffee'
// }
//
// destination : '/root/.../blah.tgz'
//

var path = require('path'),
   exec = require('child_process').exec,
   haibu = require('../../../../haibu.js'),
   mkdirp = require('utile').mkdirp;
   
exports.save = function save(source, destination, callback) {
   var done = false;
   function once() {
      if (done) return;
      done = true;
      callback.apply(this, arguments);
   }
   mkdirp(path.dirname(destination), function directoryReady(err) {
      if (err) once(err, 'Unable to create final destination for git repository');
      else {
         var remoteDescription = /([^#]+)(?:[#](.*))?/.exec(source.repository);
         var remoteUrl = remoteDescription[1];
         var commitish = remoteDescription[2] || 'HEAD';
         var tmpdir = path.join(haibu.config.get('directories:root'), haibu.config.get('directories:tmp'), 'git', encodeURIComponent(remoteUrl));
         mkdirp(path.dirname(tmpdir), function gitDirectoryReady(err) {
            if (err) {
               once(err, 'Unable to create temporary destination for git repository');
               return
            }
            var cmd = '([ -d ' + tmpdir + ' ] || git clone ' + JSON.stringify(remoteUrl) + ' ' + tmpdir + ') && ' +
               'cd '+tmpdir+' && ' +
               'git fetch --all && ' +
               'git fetch --tag && ' +
               'git checkout ' + JSON.stringify(commitish) + ' && ' +
               '(git archive --format=tgz ' + JSON.stringify(commitish) + ' > ' + JSON.stringify(destination) + ')';
            exec(cmd, function gitFinished(error, stderr, stdout) {
               if (error) {
                  once(new Error(stderr), 'Unable to fetch git repository');
                  return;
               }
               once();
            });
         });
      }
   });
}
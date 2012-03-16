//
// source : {
//   type: 'local',
//   file: '/x/y.tgz'
// }
//
// destination : '/root/.../blah.tgz'
//

var path = require('path');

exports.save = function save(source, destination, callback) {
   var done = false;
   function once() {
      if (done) return;
      done = true;
      callback.apply(this, arguments);
   }
   mkdirp(path.dirname(destination), function directoryReady(err) {
      if (err) once(err);
      else if (source.file) {
         var mime, file = source.file, fstream = fs.createWriteStream(destination)
            .on('error', once);
         switch (path.ext(file)) {
            case '.gz':
                var originalExtension = /(\.[^\.])\.gz$/.exec(file);
                switch(originalExtension) {
                    case '.tar':
                        mime = 'application/x-compressed-tar';
                        break;
                }
                break;
            case '.tar':
                mime = 'application/tar';
                break;
            case '.tgz':
                mime = 'application/x-compressed-tar';
                break;
         }
         if (mime) {
            var archiveStream = fs.createReadStream(file)
                .on('error', once);
            Repository.getConsumer(mime).saveStream(archiveStream, fstream, once);
         }
         else {
            var unknownFileTypeErr = new Error('Unknown file type for local repository');
            once(unknownFileTypeErr);
         }
      }
      else {
         var missingOriginErr = new Error('Local repository must have a file or directory as it\'s origin');
         once(missingOriginErr);
      }
   });
}
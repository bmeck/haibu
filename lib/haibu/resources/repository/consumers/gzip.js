var zlib = require('zlib');

exports.saveStream = function saveStream(source, destination, callback) {
   return source
      .pipe(zlib.createUnzip())
      .pipe(destination)
      .on('error', callback)
      .on('end', callback);
}
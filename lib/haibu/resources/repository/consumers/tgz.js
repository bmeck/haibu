exports.saveStream = function saveStream(source, destination, callback) {
   var done = false;
   function once() {
      if (done) return;
      done = true;
      callback.apply(this, arguments);
   }
   destination.on('error', once);
   source.on('end', once);
   return source
      .pipe(destination);
}
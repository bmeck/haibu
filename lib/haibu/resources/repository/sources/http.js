//
// source : {
//   type: 'http',
//   href: 'https://x:y@10.10.10.10:80/',
//   content-type: 'application/x-compressed-tar'
// }
//
// destination : '/root/.../blah.tgz'
//

var path = require('path'),
   Repository = require('../resource'),
   fs = require('fs'),
   request = require('request'),
   mkdirp = require('utile').mkdirp;

exports.save = function save(source, destination, callback) {
   var done = false;
   function once() {
      if (done) return;
      done = true;
      callback.apply(this, arguments);
   }
   mkdirp(path.dirname(destination), function directoryReady(err) {
      if (err) once(err);
      else {
         var fstream = fs.createWriteStream(destination)
            .on('error', once);
         request(source.href, function (err, res, body) {
            var mime = source['content-type'] || res.headers['content-type'] || 'application/x-compressed-tar';
            if (mime === 'application/octet-stream') {
               mime = 'application/x-compressed-tar';
            }
            if (res.statusCode === 200) {
               Repository.getConsumer(mime).saveStream(res, fstream, once);
            }
            else {
               once(new Error('Invalid status code: ' + res.statusCode));
            }
         });
      }
   });
}
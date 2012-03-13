var resourceful = require('resourceful'),
    zlib = require('zlib'),
    utile = require('utile'),
    path = require('path'),
    fs = require('fs'),
    tar = require('tar');

module.exports = Repository = resourceful.define(require('./schema'));
Repository.timestamps();

Repository.url = function (params) {
    return '/user/' + params.application.user
        + '/application/' + params.application.name
        + '/repository/' + params.name;
}

Repository.after('create', function (event, repo, next) {
    var repositorySource = repo.repository;
    var source = Repository._sources[repositorySource.type];
    if (source) {
        var repositoriesDirectory = haibu.config.get('directories:repositories');
        var application = repo.application;
        var filePath = path.join(repositoriesDirectory, 'user', application.user, 'application', application.name) + '.tgz'; 
        source.save(repositorySource, filePath, function repositorySaved(err) {
            repo.local = {
                type: 'application/x-compressed-tar',
                file: filePath
            } 
        });
    }
    else next(); 
});


Repository._sources = {};
Repository.registerSource = function registerSource(type, loader) {
    Repository._sources[type] = loader;
}
//Repository.registerSource('local', require('./sources/local'));
Repository.registerSource('http', require('./sources/http'));
Repository.registerSource('git', require('./sources/git'));


Repository._consumers = {};
Repository.registerConsumer = function registerConsumer(mime, streamer) {
    Repository._consumers[mime] = streamer;
}
Repository.registerConsumer('application/tar', require('./consumers/tar'));
//Repository.registerConsumer('application/x-gzip', require('./consumers/gzip'));
Repository.registerConsumer('application/x-compressed-tar', require('./consumers/tgz'));

Repository.prototype.streamSource = function streamSource(source, callback) {
    var mime = source.req.headers['content-type'] || 'application/x-compressed-tar';
    var done = false;
    function once() {
        if (done) return;
        done = true;
        callback.apply(this, arguments);
    }
    console.error('streamSource', source)
    utile.mkdirp(path.dirname(source.destination), function (err) {
        if (err) once(err);
        else {
            var fstream = fs.createWriteStream(source.destination)
               .on('error', once);
            Repository._consumers[mime].saveStream(source.req, fstream, once);
        }
    });
}

//
// Copy the repository into a directory
//
Repository.prototype.copy = function copy(dir, callback) {
    var local = this.local;
    var done = false;
    function once() {
        if (done) return;
        done = true;
        callback.apply(this, arguments);
    }
    if (local) {
        console.error(this)
        if (local.type === 'application/x-compressed-tar') {
            fs.createReadStream(local.file)
                .on('error', once)
                .pipe(zlib.createUnzip())
                .pipe(tar.Extract(dir))
                .on('error', once)
                .on('end', once);
        }
        else {
            once(new Error('Unknown local Repository file type'));
        }
    }
    else {
        once(new Error('No local copy available. Please upload.'));
    }
}
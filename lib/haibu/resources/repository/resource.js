var resourceful = require('resourceful'),
    haibu = require('../../../haibu.js'),
    zlib = require('zlib'),
    EventEmitter = require('eventemitter2'),
    utile = require('utile'),
    path = require('path'),
    fs = require('fs'),
    tar = require('tar');

var Repository = module.exports = resourceful.define(require('./schema'));
Repository.timestamps();

Repository.url = function (params) {
    return '/user/' + params.application.user
        + '/application/' + params.application.name
        + '/repository/' + params.name;
}

Object.defineProperty(Repository.prototype, '_id', {
    enumerable: true,
    configurable: false,
    get: function getId() {
        return Repository.url(this);
    }
});

Repository.before('create', function (repo, next) {
    console.error(repo)
    var repositorySource = repo.repository;
    if (repositorySource && !repo.local) {
        var source = Repository._sources[repositorySource.type];
        if (source) {
            var repositoriesDirectory = haibu.config.get('directories:db');
            var application = repo.application;
            var filePath = path.join(repositoriesDirectory, 'tgz', encodeURIComponent(Repository.url(repo)) + '.tgz'); 
            source.save(repositorySource, filePath, function repositorySaved(err) {
                console.error(arguments,'?')
                if (err) next(err);
                else {
                    repo.local = {
                        type: 'application/x-compressed-tar',
                        file: filePath
                    }
                    next();
                }
            });
            return;
        }
    }
    next(); 
});

Repository.after('create', function (event, repo, next) {
    repo.save();
    next();
});


Repository._sources = {};
Repository.registerSource = function registerSource(type, loader) {
    Repository._sources[type] = loader;
}
Repository.registerSource('local', require('./sources/local'));
Repository.registerSource('http', require('./sources/http'));
Repository.registerSource('git', require('./sources/git'));


Repository._consumers = {};
Repository.registerConsumer = function registerConsumer(mime, streamer) {
    Repository._consumers[mime] = streamer;
}
Repository.registerConsumer('application/tar', require('./consumers/tar'));
Repository.registerConsumer('application/x-compressed-tar', require('./consumers/tgz'));

//
// Source {
//    req: stream modeled after HttpRequest
// }
//
Repository.prototype.streamSource = function streamSource(source, callback) {
    var self = this;
    var mime = source.req.headers['content-type'] || 'application/x-compressed-tar';
    var done = false;
    var repositoryFile = path.join(
        haibu.config.get('directories:db'),
        'tgz',
        this._id + '.tgz'
    );
    function once(err) {
        if (done) return;
        done = true;
        if (err) {
            callback.apply(this, arguments);
            return;
        }
        self.local = {
            type: mime,
            file: repositoryFile
        }
        self.save(callback);
    }
    
    utile.mkdirp(path.dirname(repositoryFile), function repositoryDirectoryReady(err) {
        if (err) once(err);
        else {
            var fstream = fs.createWriteStream(repositoryFile)
               .on('error', once);
            Repository._consumers[mime].saveStream(source.req, fstream, once);
        }
    });
}

//
// Copy the repository into a directory
//
Repository.prototype.install = function install(dir, callback) {
    var local = this.local;
    var done = false;
    function once() {
        if (done) return;
        done = true;
        callback.apply(this, arguments);
    }
    if (local) {
        if (local.type === 'application/x-compressed-tar') {
            
            fs.createReadStream(local.file)
                .on('error', once.bind(null, 'error'))
                .pipe(zlib.createUnzip())
                .pipe(tar.Extract({ path: dir }))
                .on('error', once.bind(null, 'error'))
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

//
// Install all of the dependencies
//
Repository.prototype.npmInstall = function npmInstall(options, callback) {
    var ee = new EventEmitter();
    var npmInstall = spawn(options.command || 'npm', options.args || ['install'], {
        cwd: path.join(haibu.config.get('directories:apps'), this._id),
        env: utile.mixin({}, this.env || {}, options.env || {})
    });
    
    npmInstall.stdout.on('data', ee.emit.bind(ee, 'stdout'));
    npmInstall.stderr.on('data', ee.emit.bind(ee, 'stderr'));
    
    npmInstall.on('exit', function (code) {
        ee.emit('exit', code);
        if (code) {
            var err = new Error('NPM exited with code: ' + code);
            callback(err);
        }
        else callback();
    });
    
    return ee;
}

//
// Remove all traces of this on the file system
//
Repository.prototype.uninstall = function uninstall(callback) {
    utile.rimraf();
}
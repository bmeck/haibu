var resourceful = require('resourceful');
var index = require('./index');

module.exports = Repository = resourceful.define(index.schema);

Repository.prototype.install = function install(dir, options, callback) {
    options = options || {};
    var installer = options.installer || npm.install;
}
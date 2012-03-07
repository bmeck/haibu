var resourceful = require('resourceful');

module.exports = Repository = resourceful.define(require('./schema'));
Repository.timestamps();


Repository._repositoryTypes = {};
Repository.registerType = function registerType(type, constructor) {
    Repository._repositoryTypes[type] = constructor;
}
Repository.registerType('local', require('./repositories-refactor/local'));
//Repository.registerType('zip', require('./repositories-refactor/zip'));
//Repository.registerType('tar', require('./repositories-refactor/tar'));
//Repository.registerType('git', require('./repositories-refactor/git'));
//Repository.registerType('hg', require('./repositories-refactor/hg'));
//Repository.registerType('remote', require('./repositories-refactor/remote'));


var oldCreate = Repository.create;
Repository.create = function create(obj, callback) {
    var repositoryType = obj.repository && obj.repository.type;
    var constructor = Repository._repositoryTypes[repositoryType] || Repository;
    console.error(arguments);
    return oldCreate.apply(constructor, arguments);
}

//
// Copy the repository into a directory
//
Repository.prototype.copy = function copy(dir, callback) {
    //
    // SubTypes should override this
    //
    callback(new Error('Not implemented'));
}
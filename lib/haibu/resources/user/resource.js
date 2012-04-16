var resourceful = require('resourceful');

var User = module.exports = resourceful.define(require('./schema.json'));

User.url = function (params) {
    return '/user/' + params.name;
}

Object.defineProperty(User.prototype, '_id', {
    enumerable: true,
    configurable: false,
    get: function getId() {
        return User.url(this);
    }
});

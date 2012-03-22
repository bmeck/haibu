var resourceful = require('resourceful');
var Application = module.exports = resourceful.define(require('./schema.json'));

Object.defineProperty(Application.prototype, '_id', {
    enumerable: true,
    configurable: false,
    get: function getId() {
        return Application.url(this);
    }
});

Application.url = function (params) {
    return '/user/' + params.user + '/application/' + params.name;
}

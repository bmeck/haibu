var resourceful = require('resourceful');
var Application = module.exports = resourceful.define(require('./schema.json'));

Application.after('create', function (event, obj, next) {
    obj._id = Application.url(this.properties);
    next(false, obj);
});

Application.url = function (params) {
    return '/user/' + params.user + '/application/' + params.name;
}

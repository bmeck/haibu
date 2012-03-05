var EventEmitter = require('events').EventEmitter;
function Hookable() {
    EventEmitter.call(this);
    return this;
}
util.inherits(EventEmitter, Hookable);
Hookable.prototype.trigger = function trigger(event, args, callback) {
    var todos = {};
    var index = 0;
    var finished = false;
    function next(key, err) {
        if (finished) return;
        delete todos[key];
        if (Object.keys(todos).length === 0) {
            finished = true;
            callback(err);
        }
        else if (err) {
            finished = true;
            callback(err);
        }
    }
    function defer(worker) {
        if (!worker) return worker;
        var workerIndex = ++index;
        todos[workerIndex] = true;
        var boundNext = next.bind(null, workerIndex);
        worker(boundNext);
        return boundNext;
    }
    this.emit.apply(this, [event].concat(args || []).concat(defer));
}
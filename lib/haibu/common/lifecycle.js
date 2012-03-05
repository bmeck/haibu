var child_process = require('child_process'),
  EventEmitter = require('events').EventEmitter;

//
// options {
//    cwd: path
//    scripts: {k:v}
//    env: {k:v}
//    timeout: ms
// }
//
exports.lifecycle = function lifecycle(options, events, callback) {
    //
    // Clone the events to prevent modification from async nature
    //
    var ee = new EventEmitter();
    var finished = false;
    var todo = events.concat();
    var timeout = options.timeout;
    function next(err) {
        if (todo.lengh === 0 && !finished) {
            finished = true;
            callback(err);
        }
        else if (!finished && err) {
            finished = true;
            callback(err);
        }
        else {
            var event = todo.shift();
            if (typeof event === 'string') {
                var script = options.scripts && options.scripts[event]; 
                if (script) {
                    var child = child_process.spawn(script, [], {
                        cwd: options.cwd,
                        env: options.env || process.env
                    });
                    var timer;
                    if (timeout) {
                        timer = setTimeout(function () {
                            if (!finished) {
                                next(new Error('timeout'));
                            }
                        }, timeout);
                    }
                    child.on('stderr', function (data) {
                        ee.emit('stderr', data);
                    })
                    child.on('stdout', function (data) {
                        ee.emit('stdout', data);
                    });
                    child.on('exit', function onExit(exitCode) {
                        clearTimeout(timer);
                        ee.emit('exit', exitCode);
                        if (exitCode) {
                            next(new Error('script exited with code : ' + exitCode))
                            return;
                        }
                        next();
                    });
                    ee.emit('spawn', child);
                }
                else {
                    next();
                }
            }
            else if (typeof event === 'function') {
                ee.emit('invoke', event);
                event(next);
            }
            //
            // Ignore unknowns
            //
            else {
                next();
            }
        }
    }
    next();
    return ee;
}
function sayHello(req, res) {
   res.end(process.env.msg);
}
var http = require('http'),
   server = http.createServer(sayHello);
server.listen(9000);
//console.error('address', server.address());
//console.log('Server is listening on port', server.address().port);

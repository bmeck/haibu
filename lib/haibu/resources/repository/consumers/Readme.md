Consumers are used to transform one kind of data into .tar.gz files.

Consumers should take in a stream `source` and create a x-compressed-tar data stream to be piped to a stream `destination`.

```javascript
exports.saveStream = function saveStream(source, destination, callback) {
   // implementation
}
```
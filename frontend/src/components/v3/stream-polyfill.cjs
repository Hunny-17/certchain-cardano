function EventEmitter() {
  this._events = Object.create(null);
}

EventEmitter.prototype.on = function on(event, listener) {
  const listeners = this._events[event] || [];
  listeners.push(listener);
  this._events[event] = listeners;
  return this;
};

EventEmitter.prototype.addListener = EventEmitter.prototype.on;

EventEmitter.prototype.once = function once(event, listener) {
  const self = this;
  function wrapped() {
    self.removeListener(event, wrapped);
    listener.apply(self, arguments);
  }
  return this.on(event, wrapped);
};

EventEmitter.prototype.removeListener = function removeListener(event, listener) {
  const listeners = this._events[event] || [];
  this._events[event] = listeners.filter(function filter(candidate) {
    return candidate !== listener;
  });
  return this;
};

EventEmitter.prototype.emit = function emit(event) {
  const listeners = this._events[event] || [];
  const args = Array.prototype.slice.call(arguments, 1);
  listeners.forEach(function call(listener) {
    listener.apply(this, args);
  }, this);
  return listeners.length > 0;
};

function Stream() {
  EventEmitter.call(this);
}

Stream.prototype = Object.create(EventEmitter.prototype);
Stream.prototype.constructor = Stream;

function Readable() {
  Stream.call(this);
}

Readable.prototype = Object.create(Stream.prototype);
Readable.prototype.constructor = Readable;
Readable.prototype.read = function read() {
  return null;
};

function Writable() {
  Stream.call(this);
}

Writable.prototype = Object.create(Stream.prototype);
Writable.prototype.constructor = Writable;
Writable.prototype.write = function write(_chunk, _encoding, callback) {
  if (typeof _encoding === 'function') _encoding();
  if (typeof callback === 'function') callback();
  return true;
};
Writable.prototype.end = function end(callback) {
  if (typeof callback === 'function') callback();
  this.emit('finish');
  return this;
};

function Duplex() {
  Stream.call(this);
}

Duplex.prototype = Object.create(Stream.prototype);
Duplex.prototype.constructor = Duplex;
Duplex.prototype.read = Readable.prototype.read;
Duplex.prototype.write = Writable.prototype.write;
Duplex.prototype.end = Writable.prototype.end;

Stream.Stream = Stream;
Stream.EventEmitter = EventEmitter;
Stream.Readable = Readable;
Stream.Writable = Writable;
Stream.Duplex = Duplex;

module.exports = Stream;
module.exports.Stream = Stream;
module.exports.EventEmitter = EventEmitter;
module.exports.Readable = Readable;
module.exports.Writable = Writable;
module.exports.Duplex = Duplex;

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

module.exports = EventEmitter;
module.exports.EventEmitter = EventEmitter;

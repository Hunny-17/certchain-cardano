type Listener = (...args: unknown[]) => void;

export class EventEmitter {
  private listeners = new Map<string | symbol, Set<Listener>>();

  on(event: string | symbol, listener: Listener) {
    const existing = this.listeners.get(event) ?? new Set<Listener>();
    existing.add(listener);
    this.listeners.set(event, existing);
    return this;
  }

  addListener(event: string | symbol, listener: Listener) {
    return this.on(event, listener);
  }

  once(event: string | symbol, listener: Listener) {
    const wrapped: Listener = (...args) => {
      this.off(event, wrapped);
      listener(...args);
    };
    return this.on(event, wrapped);
  }

  off(event: string | symbol, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  removeListener(event: string | symbol, listener: Listener) {
    return this.off(event, listener);
  }

  emit(event: string | symbol, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((listener) => listener(...args));
    return true;
  }
}

export default EventEmitter;

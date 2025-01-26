type Listener = () => void;

class CreditsEventEmitter {
  private listeners: Set<Listener> = new Set();

  emit() {
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const creditsEvent = new CreditsEventEmitter();

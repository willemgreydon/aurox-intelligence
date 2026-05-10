import type { NormalizedMarketStreamEvent } from './types';

type Listener = (event: NormalizedMarketStreamEvent) => void;

export class MarketEventBus {
  private listeners = new Set<Listener>();

  emit(event: NormalizedMarketStreamEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

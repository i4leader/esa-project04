import { EdgeKV } from './types.js';

/**
 * In-memory mock implementation of Edge KV for local development and testing
 */
export class MockEdgeKV implements EdgeKV {
  private store: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  // Helper methods for testing
  clear(): void {
    this.store.clear();
  }

  getAll(): Map<string, string> {
    return new Map(this.store);
  }
}

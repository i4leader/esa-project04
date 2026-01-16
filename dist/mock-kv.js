/**
 * In-memory mock implementation of Edge KV for local development and testing
 */
export class MockEdgeKV {
    store = new Map();
    async get(key) {
        return this.store.get(key) ?? null;
    }
    async put(key, value) {
        this.store.set(key, value);
    }
    async delete(key) {
        this.store.delete(key);
    }
    // Helper methods for testing
    clear() {
        this.store.clear();
    }
    getAll() {
        return new Map(this.store);
    }
}
//# sourceMappingURL=mock-kv.js.map
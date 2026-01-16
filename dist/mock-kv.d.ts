import { EdgeKV } from './types.js';
/**
 * In-memory mock implementation of Edge KV for local development and testing
 */
export declare class MockEdgeKV implements EdgeKV {
    private store;
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): void;
    getAll(): Map<string, string>;
}
//# sourceMappingURL=mock-kv.d.ts.map
import { Message, EdgeKV } from './types.js';
/**
 * Storage manager for Edge KV operations with bucket strategy
 */
export declare class StorageManager {
    private kv;
    constructor(kv: EdgeKV);
    /**
     * Generate bucket key in format d:YYYYMMDD:b:XX
     * @param date - Date string in YYYYMMDD format
     * @param bucketIndex - Bucket index (0-99)
     */
    getBucketKey(date: string, bucketIndex: number): string;
    /**
     * Save a message to Edge KV
     * @param message - The message to save
     */
    saveMessage(message: Message): Promise<void>;
    /**
     * Get all messages for a specific date
     * @param date - Date string in YYYYMMDD format
     */
    getMessagesForDate(date: string): Promise<Message[]>;
}
//# sourceMappingURL=storage-manager.d.ts.map
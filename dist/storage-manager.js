import { MAX_BUCKET_SIZE } from './types.js';
import { timeUtility } from './time-utility.js';
/**
 * Storage manager for Edge KV operations with bucket strategy
 */
export class StorageManager {
    kv;
    constructor(kv) {
        this.kv = kv;
    }
    /**
     * Generate bucket key in format d:YYYYMMDD:b:XX
     * @param date - Date string in YYYYMMDD format
     * @param bucketIndex - Bucket index (0-99)
     */
    getBucketKey(date, bucketIndex) {
        const paddedIndex = String(bucketIndex).padStart(2, '0');
        return `d:${date}:b:${paddedIndex}`;
    }
    /**
     * Save a message to Edge KV
     * @param message - The message to save
     */
    async saveMessage(message) {
        const dateStr = timeUtility.getDateString(message.createdAt);
        // Find appropriate bucket
        let bucketIndex = 0;
        let bucketKey = this.getBucketKey(dateStr, bucketIndex);
        let messages = [];
        // Try to find existing bucket with space
        while (true) {
            const existing = await this.kv.get(bucketKey);
            if (existing === null) {
                // Empty bucket, use it
                messages = [];
                break;
            }
            messages = JSON.parse(existing);
            const currentSize = new TextEncoder().encode(existing).length;
            const messageSize = new TextEncoder().encode(JSON.stringify(message)).length;
            // Check if adding message would exceed limit
            if (currentSize + messageSize + 1 < MAX_BUCKET_SIZE) {
                // Has space, use this bucket
                break;
            }
            // Bucket full, try next one
            bucketIndex++;
            bucketKey = this.getBucketKey(dateStr, bucketIndex);
        }
        // Add message and save
        messages.push(message);
        await this.kv.put(bucketKey, JSON.stringify(messages));
    }
    /**
     * Get all messages for a specific date
     * @param date - Date string in YYYYMMDD format
     */
    async getMessagesForDate(date) {
        const allMessages = [];
        let bucketIndex = 0;
        // Read all buckets for this date
        while (true) {
            const bucketKey = this.getBucketKey(date, bucketIndex);
            const data = await this.kv.get(bucketKey);
            if (data === null) {
                // No more buckets
                break;
            }
            const messages = JSON.parse(data);
            allMessages.push(...messages);
            bucketIndex++;
            // Safety limit to prevent infinite loops
            if (bucketIndex > 99)
                break;
        }
        return allMessages;
    }
}
//# sourceMappingURL=storage-manager.js.map
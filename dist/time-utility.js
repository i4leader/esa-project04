import { MESSAGE_TTL_MS } from './types.js';
/**
 * Time utility for handling timestamps and expiration logic
 */
export class TimeUtility {
    /**
     * Get current timestamp in milliseconds
     */
    getCurrentTimestamp() {
        return Date.now();
    }
    /**
     * Check if a message has expired (older than 24 hours)
     * @param createdAt - Creation timestamp in milliseconds
     * @param now - Optional current timestamp for testing
     */
    isExpired(createdAt, now) {
        const currentTime = now ?? this.getCurrentTimestamp();
        return currentTime - createdAt > MESSAGE_TTL_MS;
    }
    /**
     * Convert timestamp to date string in YYYYMMDD format
     * @param timestamp - Unix timestamp in milliseconds
     */
    getDateString(timestamp) {
        const date = new Date(timestamp);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }
    /**
     * Get date string for the previous day
     * @param timestamp - Unix timestamp in milliseconds
     */
    getPreviousDateString(timestamp) {
        const previousDay = timestamp - 24 * 60 * 60 * 1000;
        return this.getDateString(previousDay);
    }
}
// Singleton instance
export const timeUtility = new TimeUtility();
//# sourceMappingURL=time-utility.js.map
/**
 * Time utility for handling timestamps and expiration logic
 */
export declare class TimeUtility {
    /**
     * Get current timestamp in milliseconds
     */
    getCurrentTimestamp(): number;
    /**
     * Check if a message has expired (older than 24 hours)
     * @param createdAt - Creation timestamp in milliseconds
     * @param now - Optional current timestamp for testing
     */
    isExpired(createdAt: number, now?: number): boolean;
    /**
     * Convert timestamp to date string in YYYYMMDD format
     * @param timestamp - Unix timestamp in milliseconds
     */
    getDateString(timestamp: number): string;
    /**
     * Get date string for the previous day
     * @param timestamp - Unix timestamp in milliseconds
     */
    getPreviousDateString(timestamp: number): string;
}
export declare const timeUtility: TimeUtility;
//# sourceMappingURL=time-utility.d.ts.map
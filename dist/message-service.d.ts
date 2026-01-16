import { Message, EdgeKV } from './types.js';
import { TimeUtility } from './time-utility.js';
import { MessageValidator } from './message-validator.js';
/**
 * Core message service for creating and retrieving messages
 */
export declare class MessageService {
    private storage;
    private time;
    private validator;
    constructor(kv: EdgeKV, time?: TimeUtility, validator?: MessageValidator);
    /**
     * Create a new message
     * @param content - The message content
     * @returns The created message
     * @throws Error if validation fails
     */
    createMessage(content: string): Promise<Message>;
    /**
     * Get feed of non-expired messages
     * @returns Array of messages sorted by creation time (newest first)
     */
    getFeed(): Promise<Message[]>;
}
//# sourceMappingURL=message-service.d.ts.map
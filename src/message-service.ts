import { Message, EdgeKV } from './types.js';
import { StorageManager } from './storage-manager.js';
import { TimeUtility, timeUtility } from './time-utility.js';
import { MessageValidator, messageValidator } from './message-validator.js';

/**
 * Core message service for creating and retrieving messages
 */
export class MessageService {
  private storage: StorageManager;
  private time: TimeUtility;
  private validator: MessageValidator;

  constructor(kv: EdgeKV, time?: TimeUtility, validator?: MessageValidator) {
    this.storage = new StorageManager(kv);
    this.time = time ?? timeUtility;
    this.validator = validator ?? messageValidator;
  }

  /**
   * Create a new message
   * @param content - The message content
   * @returns The created message
   * @throws Error if validation fails
   */
  async createMessage(content: string): Promise<Message> {
    // Validate content
    const validation = this.validator.validateContent(content);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Create message object
    const message: Message = {
      id: crypto.randomUUID(),
      content: content,
      createdAt: this.time.getCurrentTimestamp(),
    };

    // Save to storage
    await this.storage.saveMessage(message);

    return message;
  }

  /**
   * Get feed of non-expired messages
   * @returns Array of messages sorted by creation time (newest first)
   */
  async getFeed(): Promise<Message[]> {
    const now = this.time.getCurrentTimestamp();
    const todayStr = this.time.getDateString(now);
    const yesterdayStr = this.time.getPreviousDateString(now);

    // Get messages from today and yesterday
    const [todayMessages, yesterdayMessages] = await Promise.all([
      this.storage.getMessagesForDate(todayStr),
      this.storage.getMessagesForDate(yesterdayStr),
    ]);

    // Combine and filter expired messages
    const allMessages = [...todayMessages, ...yesterdayMessages];
    const validMessages = allMessages.filter(
      (msg) => !this.time.isExpired(msg.createdAt, now)
    );

    // Sort by creation time (newest first)
    validMessages.sort((a, b) => b.createdAt - a.createdAt);

    return validMessages;
  }
}

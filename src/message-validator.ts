import { ValidationResult, MAX_MESSAGE_LENGTH } from './types.js';

/**
 * Validator for message content
 */
export class MessageValidator {
  /**
   * Validate message content
   * @param content - The message content to validate
   * @returns ValidationResult with valid flag and optional error message
   */
  validateContent(content: string): ValidationResult {
    // Check if content is empty or only whitespace
    if (!content || content.trim().length === 0) {
      return {
        valid: false,
        error: 'Message content cannot be empty',
      };
    }

    // Check if content exceeds maximum length
    if (content.length > MAX_MESSAGE_LENGTH) {
      return {
        valid: false,
        error: `Message content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
      };
    }

    return { valid: true };
  }
}

// Singleton instance
export const messageValidator = new MessageValidator();

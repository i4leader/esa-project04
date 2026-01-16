import { ValidationResult } from './types.js';
/**
 * Validator for message content
 */
export declare class MessageValidator {
    /**
     * Validate message content
     * @param content - The message content to validate
     * @returns ValidationResult with valid flag and optional error message
     */
    validateContent(content: string): ValidationResult;
}
export declare const messageValidator: MessageValidator;
//# sourceMappingURL=message-validator.d.ts.map
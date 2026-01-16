/**
 * Core type definitions for Ephemeral Message Board
 */
export interface Message {
    id: string;
    content: string;
    createdAt: number;
}
export interface Bucket {
    key: string;
    messages: Message[];
    size: number;
}
export interface ValidationResult {
    valid: boolean;
    error?: string;
}
export interface CreateMessageRequest {
    content: string;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface CreateMessageResponse extends ApiResponse<Message> {
}
export interface GetFeedResponse extends ApiResponse<Message[]> {
}
export interface EdgeKV {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
}
export declare const MAX_MESSAGE_LENGTH = 1000;
export declare const MAX_BUCKET_SIZE: number;
export declare const MESSAGE_TTL_MS: number;
//# sourceMappingURL=types.d.ts.map
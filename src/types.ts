/**
 * Core type definitions for Ephemeral Message Board
 */

// Message entity
export interface Message {
  id: string;
  content: string;
  createdAt: number; // Unix timestamp in milliseconds
}

// Storage bucket structure
export interface Bucket {
  key: string;
  messages: Message[];
  size: number; // Current size in bytes
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// API Request types
export interface CreateMessageRequest {
  content: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateMessageResponse extends ApiResponse<Message> {}

export interface GetFeedResponse extends ApiResponse<Message[]> {}

// Edge KV interface (ESA Edge KV API)
export interface EdgeKV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

// Constants
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_BUCKET_SIZE = 1.5 * 1024 * 1024; // 1.5 MB (safety margin from 1.8 MB limit)
export const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

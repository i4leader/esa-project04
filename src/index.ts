/**
 * Edge Routine Entry Point for Ephemeral Message Board
 * 
 * This is the main entry point for ESA Edge Routine.
 * It handles incoming HTTP requests and routes them to the appropriate handlers.
 */

import { handleRequest } from './api-handler.js';
import { EdgeKV } from './types.js';

// Declare the global KV namespace binding (provided by ESA Edge Routine runtime)
declare const MESSAGE_KV: EdgeKV;

/**
 * Main fetch handler for Edge Routine
 * This function is called for every incoming request
 */
async function handleFetch(request: Request): Promise<Response> {
  return handleRequest(request, MESSAGE_KV);
}

// Export for Edge Routine
export default {
  fetch: handleFetch,
};

// Also export handleRequest for testing
export { handleRequest };

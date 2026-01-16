/**
 * Edge Routine Entry Point for Ephemeral Message Board
 *
 * This is the main entry point for ESA Edge Routine.
 * It handles incoming HTTP requests and routes them to the appropriate handlers.
 */
import { handleRequest } from './api-handler.js';
/**
 * Main fetch handler for Edge Routine
 * This function is called for every incoming request
 */
async function handleFetch(request) {
    return handleRequest(request, MESSAGE_KV);
}
// Export for Edge Routine
export default {
    fetch: handleFetch,
};
// Also export handleRequest for testing
export { handleRequest };
//# sourceMappingURL=index.js.map
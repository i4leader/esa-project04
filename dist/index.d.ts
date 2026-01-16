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
declare function handleFetch(request: Request): Promise<Response>;
declare const _default: {
    fetch: typeof handleFetch;
};
export default _default;
export { handleRequest };
//# sourceMappingURL=index.d.ts.map
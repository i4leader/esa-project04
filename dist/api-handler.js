import { MessageService } from './message-service.js';
/**
 * CORS headers for all responses
 */
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};
/**
 * Create a JSON response with CORS headers
 */
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: CORS_HEADERS,
    });
}
/**
 * Create an error response
 */
function errorResponse(message, status) {
    return jsonResponse({ success: false, error: message }, status);
}
/**
 * Handle POST /api/post - Create a new message
 */
async function handleCreateMessage(request, service) {
    try {
        const body = await request.json();
        if (!body || typeof body.content !== 'string') {
            return errorResponse('Missing or invalid content field', 400);
        }
        const message = await service.createMessage(body.content);
        const response = {
            success: true,
            data: message,
        };
        return jsonResponse(response, 201);
    }
    catch (error) {
        if (error instanceof SyntaxError) {
            return errorResponse('Invalid JSON body', 400);
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        // Check if it's a validation error
        if (message.includes('empty') || message.includes('exceeds')) {
            return errorResponse(message, 400);
        }
        // Internal server error - don't expose details
        return errorResponse('Internal server error', 500);
    }
}
/**
 * Handle GET /api/feed - Get message feed
 */
async function handleGetFeed(service) {
    try {
        const messages = await service.getFeed();
        const response = {
            success: true,
            data: messages,
        };
        return jsonResponse(response);
    }
    catch {
        return errorResponse('Internal server error', 500);
    }
}
/**
 * Handle OPTIONS request for CORS preflight
 */
function handleOptions() {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    });
}
/**
 * Main request handler for Edge Routine
 */
export async function handleRequest(request, kv) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    // Handle CORS preflight
    if (method === 'OPTIONS') {
        return handleOptions();
    }
    // Initialize service
    const service = new MessageService(kv);
    // Route requests
    if (path === '/api/post' && method === 'POST') {
        return handleCreateMessage(request, service);
    }
    if (path === '/api/feed' && method === 'GET') {
        return handleGetFeed(service);
    }
    // Method not allowed for known paths
    if (path === '/api/post' || path === '/api/feed') {
        return errorResponse('Method not allowed', 405);
    }
    // Not found
    return errorResponse('Not found', 404);
}
//# sourceMappingURL=api-handler.js.map
/**
 * Edge Routine Entry Point for Ephemeral Message Board
 * 
 * This is the main entry point for ESA Edge Routine.
 * It handles incoming HTTP requests and routes them to the appropriate handlers.
 */

// Simple JavaScript version without TypeScript compilation

const MAX_MESSAGE_LENGTH = 1000;
const MAX_BUCKET_SIZE = 1.5 * 1024 * 1024; // 1.5 MB
const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// CORS headers for all responses
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Time utility functions
function getCurrentTimestamp() {
  return Date.now();
}

function isExpired(createdAt, now = getCurrentTimestamp()) {
  return now - createdAt > MESSAGE_TTL_MS;
}

function getDateString(timestamp) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function getPreviousDateString(timestamp) {
  const previousDay = timestamp - 24 * 60 * 60 * 1000;
  return getDateString(previousDay);
}

// Message validation
function validateContent(content) {
  if (!content || content.trim().length === 0) {
    return {
      valid: false,
      error: 'Message content cannot be empty',
    };
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
    };
  }

  return { valid: true };
}

// Storage functions
function getBucketKey(date, bucketIndex) {
  const paddedIndex = String(bucketIndex).padStart(2, '0');
  return `d:${date}:b:${paddedIndex}`;
}

async function saveMessage(kv, message) {
  const dateStr = getDateString(message.createdAt);
  
  let bucketIndex = 0;
  let bucketKey = getBucketKey(dateStr, bucketIndex);
  let messages = [];

  while (true) {
    const existing = await kv.get(bucketKey);
    
    if (existing === null) {
      messages = [];
      break;
    }

    messages = JSON.parse(existing);
    const currentSize = new TextEncoder().encode(existing).length;
    const messageSize = new TextEncoder().encode(JSON.stringify(message)).length;

    if (currentSize + messageSize + 1 < MAX_BUCKET_SIZE) {
      break;
    }

    bucketIndex++;
    bucketKey = getBucketKey(dateStr, bucketIndex);
  }

  messages.push(message);
  await kv.put(bucketKey, JSON.stringify(messages));
}

async function getMessagesForDate(kv, date) {
  const allMessages = [];
  let bucketIndex = 0;

  while (true) {
    const bucketKey = getBucketKey(date, bucketIndex);
    const data = await kv.get(bucketKey);

    if (data === null) {
      break;
    }

    const messages = JSON.parse(data);
    allMessages.push(...messages);
    bucketIndex++;

    if (bucketIndex > 99) break;
  }

  return allMessages;
}

// Response helpers
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

function errorResponse(message, status) {
  return jsonResponse({ success: false, error: message }, status);
}

// Message service
async function createMessage(kv, content) {
  const validation = validateContent(content);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const message = {
    id: crypto.randomUUID(),
    content: content,
    createdAt: getCurrentTimestamp(),
  };

  await saveMessage(kv, message);
  return message;
}

async function getFeed(kv) {
  const now = getCurrentTimestamp();
  const todayStr = getDateString(now);
  const yesterdayStr = getPreviousDateString(now);

  const [todayMessages, yesterdayMessages] = await Promise.all([
    getMessagesForDate(kv, todayStr),
    getMessagesForDate(kv, yesterdayStr),
  ]);

  const allMessages = [...todayMessages, ...yesterdayMessages];
  const validMessages = allMessages.filter(
    (msg) => !isExpired(msg.createdAt, now)
  );

  validMessages.sort((a, b) => b.createdAt - a.createdAt);
  return validMessages;
}

// API handlers
async function handleCreateMessage(request, kv) {
  try {
    const body = await request.json();
    
    if (!body || typeof body.content !== 'string') {
      return errorResponse('Missing or invalid content field', 400);
    }

    const message = await createMessage(kv, body.content);
    
    return jsonResponse({
      success: true,
      data: message,
    }, 201);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse('Invalid JSON body', 400);
    }
    
    const message = error.message || 'Unknown error';
    
    if (message.includes('empty') || message.includes('exceeds')) {
      return errorResponse(message, 400);
    }
    
    return errorResponse('Internal server error', 500);
  }
}

async function handleGetFeed(kv) {
  try {
    const messages = await getFeed(kv);
    
    return jsonResponse({
      success: true,
      data: messages,
    });
  } catch {
    return errorResponse('Internal server error', 500);
  }
}

function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// Main request handler
async function handleRequest(request, kv) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === 'OPTIONS') {
    return handleOptions();
  }

  if (path === '/api/post' && method === 'POST') {
    return handleCreateMessage(request, kv);
  }

  if (path === '/api/feed' && method === 'GET') {
    return handleGetFeed(kv);
  }

  if (path === '/api/post' || path === '/api/feed') {
    return errorResponse('Method not allowed', 405);
  }

  return errorResponse('Not found', 404);
}

// Export for Edge Routine
export default {
  async fetch(request, env) {
    return handleRequest(request, env.MESSAGE_KV);
  },
};
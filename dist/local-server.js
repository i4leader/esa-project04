/**
 * Local development server for testing the Ephemeral Message Board API
 * Run with: npx tsx src/local-server.ts
 */
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { handleRequest } from './api-handler.js';
import { MockEdgeKV } from './mock-kv.js';
const PORT = 3000;
const mockKV = new MockEdgeKV();
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};
/**
 * Serve static files from public directory
 */
async function serveStatic(url, res) {
    let filePath = url === '/' ? '/index.html' : url;
    const fullPath = join(process.cwd(), 'public', filePath);
    try {
        const content = await readFile(fullPath);
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Convert Node.js IncomingMessage to Web Request
 */
async function toWebRequest(req) {
    const url = `http://localhost:${PORT}${req.url}`;
    const method = req.method || 'GET';
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
            headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        }
    }
    let body;
    if (method !== 'GET' && method !== 'HEAD') {
        body = await new Promise((resolve) => {
            let data = '';
            req.on('data', (chunk) => (data += chunk));
            req.on('end', () => resolve(data));
        });
    }
    return new Request(url, {
        method,
        headers,
        body: body || undefined,
    });
}
/**
 * Convert Web Response to Node.js ServerResponse
 */
async function sendWebResponse(webRes, res) {
    res.statusCode = webRes.status;
    webRes.headers.forEach((value, key) => {
        res.setHeader(key, value);
    });
    const body = await webRes.text();
    res.end(body);
}
const server = createServer(async (req, res) => {
    const url = req.url || '/';
    try {
        // API routes
        if (url.startsWith('/api/')) {
            const webRequest = await toWebRequest(req);
            const webResponse = await handleRequest(webRequest, mockKV);
            await sendWebResponse(webResponse, res);
            console.log(`${req.method} ${url} -> ${webResponse.status}`);
            return;
        }
        // Static files
        const served = await serveStatic(url, res);
        if (served) {
            console.log(`${req.method} ${url} -> 200 (static)`);
            return;
        }
        // 404
        res.statusCode = 404;
        res.end('Not Found');
        console.log(`${req.method} ${url} -> 404`);
    }
    catch (error) {
        console.error('Server error:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
    }
});
server.listen(PORT, () => {
    console.log('');
    console.log('🌳 树洞 - Ephemeral Message Board');
    console.log('================================');
    console.log(`   http://localhost:${PORT}`);
    console.log('');
    console.log('打开浏览器访问上面的地址即可使用');
    console.log('按 Ctrl+C 停止服务器');
    console.log('');
});
//# sourceMappingURL=local-server.js.map
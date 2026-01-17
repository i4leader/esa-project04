/**
 * Ephemeral Message Board - Shared Storage Version
 * 
 * This version uses server-side storage that all users can see
 */

const MAX_MESSAGE_LENGTH = 1000;
const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Global storage that persists across requests (Cloudflare Durable Objects style)
// In a real Edge Runtime, this would be replaced with proper persistent storage
let globalMessages = [];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function getCurrentTimestamp() {
  return Date.now();
}

function isExpired(createdAt, now = getCurrentTimestamp()) {
  return now - createdAt > MESSAGE_TTL_MS;
}

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

function cleanExpiredMessages() {
  const now = getCurrentTimestamp();
  globalMessages = globalMessages.filter(msg => !isExpired(msg.createdAt, now));
}

function saveMessage(message) {
  cleanExpiredMessages();
  globalMessages.push(message);
}

function getValidMessages() {
  cleanExpiredMessages();
  return globalMessages
    .slice() // Create a copy
    .sort((a, b) => b.createdAt - a.createdAt);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

function errorResponse(message, status) {
  return jsonResponse({ success: false, error: message }, status);
}

function createMessage(content) {
  const validation = validateContent(content);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const message = {
    id: crypto.randomUUID(),
    content: content,
    createdAt: getCurrentTimestamp(),
  };

  saveMessage(message);
  return message;
}

function getFeed() {
  return getValidMessages();
}

async function handleCreateMessage(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return errorResponse('Invalid JSON body', 400);
    }
    
    if (!body || typeof body.content !== 'string') {
      return errorResponse('Missing or invalid content field', 400);
    }

    try {
      const message = createMessage(body.content);
      
      return jsonResponse({
        success: true,
        data: message,
      }, 201);
    } catch (createError) {
      const message = createError.message || 'Unknown error';
      
      if (message.includes('empty') || message.includes('exceeds')) {
        return errorResponse(message, 400);
      }
      
      return errorResponse('Internal server error', 500);
    }
  } catch (error) {
    return errorResponse('Internal server error', 500);
  }
}

async function handleGetFeed() {
  try {
    const messageList = getFeed();
    
    return jsonResponse({
      success: true,
      data: messageList,
    });
  } catch (error) {
    return errorResponse('Internal server error', 500);
  }
}

function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// Static HTML content
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>树洞 - 说出你的秘密</title>
  <style>
    :root {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --bg-tertiary: #0f3460;
      --bg-card: rgba(255, 255, 255, 0.05);
      --bg-input: rgba(0, 0, 0, 0.3);
      --text-primary: #e8e8e8;
      --text-secondary: #888;
      --text-muted: #666;
      --border-color: rgba(255, 255, 255, 0.1);
      --warning-bg: rgba(255, 193, 7, 0.1);
      --warning-border: rgba(255, 193, 7, 0.3);
      --warning-text: #ffc107;
      --accent-start: #00d9ff;
      --accent-end: #00ff88;
      --shadow: rgba(0, 0, 0, 0.3);
    }

    [data-theme="light"] {
      --bg-primary: #f5f7fa;
      --bg-secondary: #e8ecf1;
      --bg-tertiary: #dde3ea;
      --bg-card: rgba(255, 255, 255, 0.8);
      --bg-input: rgba(255, 255, 255, 0.9);
      --text-primary: #2c3e50;
      --text-secondary: #5a6c7d;
      --text-muted: #8899a6;
      --border-color: rgba(0, 0, 0, 0.1);
      --warning-bg: rgba(255, 193, 7, 0.15);
      --warning-border: rgba(255, 152, 0, 0.4);
      --warning-text: #e65100;
      --accent-start: #0099cc;
      --accent-end: #00aa66;
      --shadow: rgba(0, 0, 0, 0.1);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--bg-tertiary) 100%);
      min-height: 100vh;
      color: var(--text-primary);
      transition: background 0.3s, color 0.3s;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px 40px;
    }

    @media (max-width: 768px) {
      .container {
        padding: 16px;
      }
    }

    header {
      text-align: center;
      padding: 40px 0 20px;
      position: relative;
    }

    header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      background: linear-gradient(90deg, var(--accent-start), var(--accent-end));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    header p {
      color: var(--text-secondary);
      font-size: 0.95rem;
    }

    .theme-toggle {
      position: absolute;
      top: 40px;
      right: 0;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 25px;
      padding: 8px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary);
      font-size: 0.85rem;
      transition: all 0.3s;
    }

    .theme-toggle:hover {
      border-color: var(--accent-start);
      color: var(--accent-start);
    }

    .guidelines {
      background: var(--warning-bg);
      border: 1px solid var(--warning-border);
      border-radius: 12px;
      padding: 16px 24px;
      margin-bottom: 30px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .guidelines-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .guidelines-content h3 {
      color: var(--warning-text);
      font-size: 0.95rem;
      margin-bottom: 8px;
    }

    .guidelines-content p {
      color: var(--text-secondary);
      font-size: 0.85rem;
      line-height: 1.6;
    }

    .guidelines-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
      margin-top: 10px;
      list-style: none;
    }

    .guidelines-list li {
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    .post-section {
      margin-bottom: 40px;
    }

    .section-title {
      font-size: 1.2rem;
      margin-bottom: 16px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .post-form {
      background: var(--bg-card);
      border-radius: 16px;
      padding: 24px;
      backdrop-filter: blur(10px);
      border: 1px solid var(--border-color);
    }

    .post-form textarea {
      width: 100%;
      height: 150px;
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 16px;
      color: var(--text-primary);
      font-size: 1rem;
      resize: none;
      outline: none;
      transition: border-color 0.3s;
    }

    .post-form textarea:focus {
      border-color: var(--accent-start);
    }

    .post-form textarea::placeholder {
      color: var(--text-muted);
    }

    .form-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
    }

    .char-count {
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .char-count.warning {
      color: #ff6b6b;
    }

    .post-btn {
      background: linear-gradient(90deg, var(--accent-start), var(--accent-end));
      border: none;
      padding: 12px 32px;
      border-radius: 25px;
      color: #1a1a2e;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .post-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px var(--shadow);
    }

    .post-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .post-hint {
      color: var(--text-muted);
      font-size: 0.8rem;
      margin-top: 12px;
      text-align: center;
    }

    .feed-section {
      margin-top: 20px;
    }

    .feed-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .refresh-btn {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      padding: 6px 14px;
      border-radius: 15px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .refresh-btn:hover {
      border-color: var(--accent-start);
      color: var(--accent-start);
    }

    .messages {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .message {
      background: var(--bg-card);
      border-radius: 16px;
      padding: 20px;
      backdrop-filter: blur(10px);
      border: 1px solid var(--border-color);
      animation: fadeIn 0.3s ease;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .message:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px var(--shadow);
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .message-content {
      font-size: 0.95rem;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      color: var(--text-primary);
    }

    .message-time {
      color: var(--text-muted);
      font-size: 0.75rem;
      margin-top: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .message-time::before {
      content: '🕐';
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }

    .empty-state .icon {
      font-size: 4rem;
      margin-bottom: 16px;
    }

    .loading {
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
    }

    .toast {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 12px 24px;
      border-radius: 25px;
      font-size: 0.9rem;
      opacity: 0;
      transition: all 0.3s;
      z-index: 1000;
    }

    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }

    .toast.success {
      background: linear-gradient(90deg, var(--accent-start), var(--accent-end));
      color: #1a1a2e;
    }

    .toast.error {
      background: #ff6b6b;
    }

    footer {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🌳 树洞</h1>
      <p>说出你的秘密，24小时后它将消失在风中...</p>
      <button class="theme-toggle" onclick="toggleTheme()">
        <span id="themeIcon">🌙</span>
        <span id="themeText">深色模式</span>
      </button>
    </header>

    <div class="guidelines">
      <span class="guidelines-icon">⚠️</span>
      <div class="guidelines-content">
        <h3>内容发布规范</h3>
        <p>树洞是一个分享心情的地方，请文明发言，共同维护良好的社区环境。</p>
        <ul class="guidelines-list">
          <li>🚫 政治敏感内容</li>
          <li>🚫 诈骗/广告信息</li>
          <li>🚫 他人隐私信息</li>
          <li>🚫 色情/暴力内容</li>
          <li>💡 保护个人隐私</li>
        </ul>
      </div>
    </div>

    <div class="post-section">
      <h2 class="section-title">✏️ 写下你的心声</h2>
      <div class="post-form">
        <textarea 
          id="messageInput" 
          placeholder="在这里写下你想说的话...

可以是今天的心情、一个小秘密、或者任何想倾诉的事情。
记住：不要分享敏感的个人信息哦~"
          maxlength="1000"
        ></textarea>
        <div class="form-footer">
          <span class="char-count" id="charCount">0 / 1000</span>
          <button class="post-btn" id="postBtn" onclick="postMessage()">投入树洞</button>
        </div>
        <p class="post-hint">按 Ctrl + Enter 快速发送 | 消息将在 24 小时后自动消失 ✨</p>
      </div>
    </div>

    <div class="feed-section">
      <div class="feed-header">
        <h2 class="section-title">📜 树洞里的秘密</h2>
        <button class="refresh-btn" onclick="loadMessages()">🔄 刷新</button>
      </div>
      <div class="messages" id="messageList">
        <div class="loading">加载中...</div>
      </div>
    </div>

    <footer>
      <p>🌲 树洞 - 一个安全倾诉的地方 | 所有消息 24 小时后自动消失</p>
    </footer>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const API_BASE = '';
    const messageInput = document.getElementById('messageInput');
    const charCount = document.getElementById('charCount');
    const postBtn = document.getElementById('postBtn');
    const messageList = document.getElementById('messageList');
    const toast = document.getElementById('toast');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');

    function getTheme() {
      return localStorage.getItem('theme') || 'dark';
    }

    function setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      updateThemeButton(theme);
    }

    function updateThemeButton(theme) {
      if (theme === 'dark') {
        themeIcon.textContent = '🌙';
        themeText.textContent = '深色模式';
      } else {
        themeIcon.textContent = '☀️';
        themeText.textContent = '浅色模式';
      }
    }

    function toggleTheme() {
      const current = getTheme();
      setTheme(current === 'dark' ? 'light' : 'dark');
    }

    setTheme(getTheme());

    messageInput.addEventListener('input', () => {
      const len = messageInput.value.length;
      charCount.textContent = \`\${len} / 1000\`;
      charCount.className = len > 900 ? 'char-count warning' : 'char-count';
    });

    function showToast(message, type = 'success') {
      toast.textContent = message;
      toast.className = \`toast \${type} show\`;
      setTimeout(() => {
        toast.className = 'toast';
      }, 3000);
    }

    function timeAgo(timestamp) {
      const seconds = Math.floor((Date.now() - timestamp) / 1000);
      
      if (seconds < 60) return '刚刚';
      if (seconds < 3600) return \`\${Math.floor(seconds / 60)} 分钟前\`;
      if (seconds < 86400) return \`\${Math.floor(seconds / 3600)} 小时前\`;
      return '即将消失...';
    }

    async function postMessage() {
      const content = messageInput.value.trim();
      
      if (!content) {
        showToast('请输入内容', 'error');
        return;
      }

      postBtn.disabled = true;
      postBtn.textContent = '发送中...';

      try {
        const response = await fetch(\`\${API_BASE}/api/post\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });

        const data = await response.json();

        if (data.success) {
          messageInput.value = '';
          charCount.textContent = '0 / 1000';
          showToast('已投入树洞 🌳');
          loadMessages();
        } else {
          showToast(data.error || '发送失败', 'error');
        }
      } catch (error) {
        showToast('网络错误，请重试', 'error');
      } finally {
        postBtn.disabled = false;
        postBtn.textContent = '投入树洞';
      }
    }

    async function loadMessages() {
      try {
        const response = await fetch(\`\${API_BASE}/api/feed\`);
        const data = await response.json();

        if (data.success && data.data) {
          if (data.data.length === 0) {
            messageList.innerHTML = \`
              <div class="empty-state">
                <div class="icon">🌲</div>
                <p>树洞里还没有秘密...</p>
                <p>成为第一个分享的人吧！</p>
              </div>
            \`;
          } else {
            messageList.innerHTML = data.data.map(msg => \`
              <div class="message">
                <div class="message-content">\${escapeHtml(msg.content)}</div>
                <div class="message-time">\${timeAgo(msg.createdAt)}</div>
              </div>
            \`).join('');
          }
        }
      } catch (error) {
        messageList.innerHTML = \`
          <div class="empty-state">
            <div class="icon">😢</div>
            <p>加载失败，请刷新页面重试</p>
          </div>
        \`;
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        postMessage();
      }
    });

    loadMessages();
    setInterval(loadMessages, 30000);
  </script>
</body>
</html>`;

// Main request handler
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === 'OPTIONS') {
    return handleOptions();
  }

  // API routes
  if (path === '/api/post' && method === 'POST') {
    return handleCreateMessage(request);
  }

  if (path === '/api/feed' && method === 'GET') {
    return handleGetFeed();
  }

  // Test endpoint
  if (path === '/api/test' && method === 'GET') {
    return jsonResponse({
      success: true,
      message: 'API is working with shared storage',
      messageCount: globalMessages.length,
      timestamp: getCurrentTimestamp()
    });
  }

  if (path.startsWith('/api/')) {
    return errorResponse('API endpoint not found', 404);
  }

  // Serve HTML for all other routes
  return new Response(HTML_CONTENT, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

// Export for Edge Routine
export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request);
    } catch (error) {
      console.error('Edge Routine error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};
# 临时消息板 (Ephemeral Message Board)

一个轻量级的匿名消息系统，消息会在 24 小时后自动消失。基于 ESA Edge Routine + Edge KV 构建。

## 特性

- 🌳 匿名发布消息到"树洞"
- ⏰ 消息 24 小时后自动消失
- 🌍 全球边缘节点分发，低延迟访问
- 💾 无需传统数据库，使用 Edge KV 存储

## 快速开始

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

### API 使用

**发布消息：**

```bash
curl -X POST http://localhost:3000/api/post \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello, 树洞!"}'
```

**获取消息列表：**

```bash
curl http://localhost:3000/api/feed
```

## API 文档

### POST /api/post

创建新消息。

**请求体：**
```json
{
  "content": "消息内容（最多 1000 字符）"
}
```

**成功响应 (201)：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "消息内容",
    "createdAt": 1705401600000
  }
}
```

### GET /api/feed

获取所有未过期的消息（24 小时内）。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "content": "消息内容",
      "createdAt": 1705401600000
    }
  ]
}
```

## 部署到 ESA Edge Routine

1. 在阿里云 ESA 控制台创建 Edge KV 命名空间

2. 更新 `esa.jsonc` 中的 KV 命名空间 ID：
   ```json
   {
     "entry": "src/index.js",
     "kv": [
       {
         "binding": "MESSAGE_KV",
         "namespace": "your-actual-kv-namespace-id"
       }
     ]
   }
   ```

3. 推送代码到 GitHub 仓库

4. 在 ESA 控制台创建 Edge Routine 并关联 GitHub 仓库

5. 绑定域名并配置路由

## 项目结构

```
src/
├── types.ts           # 类型定义
├── time-utility.ts    # 时间工具
├── message-validator.ts # 消息验证
├── storage-manager.ts # 存储管理（Edge KV）
├── message-service.ts # 消息服务
├── api-handler.ts     # API 处理器
├── index.ts           # Edge Routine 入口
├── mock-kv.ts         # 本地开发用的 Mock KV
└── local-server.ts    # 本地开发服务器
```

## 致谢
![阿里云 ESA](./public/aliyun.png)

**本项目由阿里云 ESA 提供加速、计算和保护**

## License

MIT

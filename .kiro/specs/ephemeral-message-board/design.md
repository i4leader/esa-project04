# Design Document: Ephemeral Message Board

## Overview

临时消息板是一个基于 ESA Edge Routine 和 Edge KV 的轻量级匿名消息系统。系统采用无服务器架构，利用边缘计算能力在全球范围内提供低延迟访问。核心设计理念是"消息临时性"——所有消息在 24 小时后自动失效，无需后台任务清理。

系统使用日期分桶策略存储消息，通过客户端过滤实现消息过期，避免了复杂的 TTL 管理。这种设计特别适合"低频写入、高频读取"的场景，如匿名树洞、临时公告板等应用。

## Architecture

### High-Level Architecture

```
用户请求
    ↓
ESA Edge Routine (API Handler)
    ↓
Message Service (业务逻辑)
    ↓
Edge KV Storage (分布式键值存储)
    ↓
全球 POP 节点同步
```

### Component Layers

1. **API Layer (Edge Routine)**
   - 处理 HTTP 请求路由
   - 请求验证和错误处理
   - CORS 配置

2. **Service Layer**
   - 消息创建和验证逻辑
   - 消息过期过滤
   - 分桶管理

3. **Storage Layer (Edge KV)**
   - 键值对存储
   - 全球同步机制

## Components and Interfaces

### 1. API Handler (Edge Routine Entry Point)

**职责：** 处理所有 HTTP 请求，路由到相应的处理函数

**接口：**
```typescript
async function handleRequest(request: Request): Promise<Response>
```

**路由：**
- `POST /api/post` → createMessage()
- `GET /api/feed` → getFeed()

### 2. Message Service

**职责：** 核心业务逻辑，包括消息创建、验证、存储和检索

**接口：**
```typescript
interface MessageService {
  createMessage(content: string): Promise<Message>
  getFeed(): Promise<Message[]>
  validateMessage(content: string): ValidationResult
}
```

**关键方法：**

- `createMessage(content: string)`: 创建新消息
  - 验证内容（非空、长度限制）
  - 生成唯一 ID 和时间戳
  - 存储到适当的日期分桶
  - 返回创建的消息对象

- `getFeed()`: 获取消息列表
  - 读取当前日期和前一天的所有分桶
  - 过滤掉超过 24 小时的消息
  - 按时间倒序排序
  - 返回消息数组

- `validateMessage(content: string)`: 验证消息内容
  - 检查是否为空
  - 检查长度是否超过 1000 字符
  - 返回验证结果

### 3. Storage Manager

**职责：** 管理 Edge KV 的读写操作和分桶策略

**接口：**
```typescript
interface StorageManager {
  saveMessage(message: Message): Promise<void>
  getMessagesForDate(date: string): Promise<Message[]>
  getBucketKey(date: string, bucketIndex: number): string
}
```

**分桶策略：**
- 键格式：`d:YYYYMMDD:b:XX`（例如：`d:20260116:b:01`）
- 每个桶存储一个 JSON 数组
- 单桶大小限制：1.5 MB（留有安全边界，Edge KV 限制 1.8 MB）
- 当桶接近容量时，创建新桶（递增索引）

**关键方法：**

- `saveMessage(message)`: 保存消息到 KV
  - 确定当前日期
  - 查找或创建适当的分桶
  - 将消息追加到桶的 JSON 数组
  - 写入 Edge KV

- `getMessagesForDate(date)`: 读取指定日期的所有消息
  - 遍历该日期的所有分桶（b:01, b:02, ...）
  - 合并所有消息
  - 返回消息数组

### 4. Time Utility

**职责：** 处理时间相关的计算和格式化

**接口：**
```typescript
interface TimeUtility {
  getCurrentTimestamp(): number
  isExpired(createdAt: number): boolean
  getDateString(timestamp: number): string
}
```

## Data Models

### Message

```typescript
interface Message {
  id: string           // 唯一标识符（UUID v4）
  content: string      // 消息内容（最大 1000 字符）
  createdAt: number    // 创建时间戳（毫秒）
}
```

### Bucket

```typescript
interface Bucket {
  key: string          // KV 键（例如：d:20260116:b:01）
  messages: Message[]  // 消息数组
  size: number         // 当前大小（字节）
}
```

### API Request/Response

**POST /api/post Request:**
```typescript
{
  content: string
}
```

**POST /api/post Response:**
```typescript
{
  success: boolean
  message?: Message
  error?: string
}
```

**GET /api/feed Response:**
```typescript
{
  success: boolean
  messages?: Message[]
  error?: string
}
```


## Correctness Properties

正确性属性是系统应该在所有有效执行中保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。

### Property 1: 消息创建完整性

*对于任何*有效的消息内容（非空且不超过 1000 字符），创建消息应该返回包含唯一 ID、原始内容和当前时间戳的消息对象

**Validates: Requirements 1.1, 1.5, 3.5**

### Property 2: 消息存储往返一致性

*对于任何*创建的消息，将其存储到 Edge KV 然后读取回来，应该得到具有相同 id、content 和 createdAt 的消息对象

**Validates: Requirements 1.2, 3.2**

### Property 3: 空内容拒绝

*对于任何*仅由空白字符组成的字符串（包括空字符串、空格、制表符等），尝试创建消息应该被拒绝并返回错误

**Validates: Requirements 1.3**

### Property 4: 长度限制强制

*对于任何*长度超过 1000 字符的字符串，尝试创建消息应该被拒绝并返回错误

**Validates: Requirements 1.4**

### Property 5: ID 唯一性

*对于任何*一批创建的消息，所有消息的 ID 应该是唯一的，没有重复

**Validates: Requirements 1.5**

### Property 6: 过期消息过滤

*对于任何*消息集合（包含已过期和未过期的消息），获取 feed 应该只返回创建时间在 24 小时内的消息

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 7: 时间倒序排序

*对于任何*返回的消息列表，消息应该按 createdAt 降序排列（最新的在前）

**Validates: Requirements 2.4**

### Property 8: 分桶键格式正确性

*对于任何*日期和分桶索引，生成的 KV 键应该符合格式 `d:YYYYMMDD:b:XX`，其中日期为 8 位数字，分桶索引为 2 位数字

**Validates: Requirements 3.1**

### Property 9: 分桶大小限制

*对于任何*存储操作后的分桶，其序列化后的大小应该不超过 1.8 MB

**Validates: Requirements 3.3**

### Property 10: 自动分桶创建

*对于任何*接近容量限制的分桶，当添加新消息时，系统应该创建新的分桶而不是超出限制

**Validates: Requirements 3.4**

### Property 11: JSON 响应格式

*对于任何*成功的 API 请求，响应应该是有效的 JSON 格式，并包含 success 字段

**Validates: Requirements 4.3**

### Property 12: 错误状态码正确性

*对于任何*无效的请求参数，API 应该返回 400 状态码和包含错误描述的响应

**Validates: Requirements 4.4, 5.2**

### Property 13: CORS 头存在性

*对于任何*API 响应，应该包含必要的 CORS 头（Access-Control-Allow-Origin 等）

**Validates: Requirements 4.5**

### Property 14: 错误信息安全性

*对于任何*错误响应，返回的错误信息不应该包含内部实现细节（如堆栈跟踪、文件路径等）

**Validates: Requirements 5.5**

### Property 15: 并发写入正确性

*对于任何*并发创建的消息集合，所有消息都应该被正确存储，并且可以在后续的 feed 读取中找到

**Validates: Requirements 6.3**

## Error Handling

### 错误类型和处理策略

1. **验证错误 (400 Bad Request)**
   - 空消息内容
   - 消息内容过长
   - 缺少必需参数
   - 响应：`{ success: false, error: "描述性错误消息" }`

2. **方法不允许 (405 Method Not Allowed)**
   - 不支持的 HTTP 方法
   - 响应：`{ success: false, error: "Method not allowed" }`

3. **服务器错误 (500 Internal Server Error)**
   - Edge KV 读写失败
   - JSON 序列化/反序列化失败
   - 未预期的异常
   - 响应：`{ success: false, error: "Internal server error" }`
   - 注意：不暴露具体的内部错误细节

### 错误处理原则

- 所有错误都应该被捕获并转换为适当的 HTTP 响应
- 错误消息应该对用户友好，但不暴露系统内部信息
- 记录详细的错误日志用于调试（如果 Edge Routine 支持）
- 使用 try-catch 包装所有 KV 操作
- 验证所有用户输入

## Testing Strategy

### 测试方法

系统将采用**双重测试策略**，结合单元测试和基于属性的测试：

1. **单元测试**：验证特定示例、边缘情况和错误条件
2. **属性测试**：验证跨所有输入的通用属性

这两种测试方法是互补的，共同提供全面的覆盖：
- 单元测试捕获具体的 bug 和已知的边缘情况
- 属性测试通过随机化验证一般正确性

### 基于属性的测试配置

**测试框架选择：** 使用 `fast-check`（JavaScript/TypeScript 的属性测试库）

**配置要求：**
- 每个属性测试最少运行 100 次迭代（由于随机化）
- 每个测试必须引用其设计文档中的属性
- 标签格式：`Feature: ephemeral-message-board, Property {number}: {property_text}`

### 测试覆盖范围

#### 单元测试重点

1. **API 端点测试**
   - POST /api/post 端点存在并正常工作
   - GET /api/feed 端点存在并正常工作
   - 不支持的方法返回 405

2. **边缘情况**
   - 空字符串消息
   - 恰好 1000 字符的消息
   - 恰好 1001 字符的消息
   - 特殊字符和 Unicode 处理

3. **错误场景**
   - KV 操作失败时的错误处理（使用 mock）
   - 无效 JSON 输入
   - 缺少必需字段

#### 属性测试重点

1. **消息创建和存储**
   - Property 1: 消息创建完整性
   - Property 2: 消息存储往返一致性
   - Property 3: 空内容拒绝
   - Property 4: 长度限制强制
   - Property 5: ID 唯一性

2. **消息检索和过滤**
   - Property 6: 过期消息过滤
   - Property 7: 时间倒序排序

3. **存储管理**
   - Property 8: 分桶键格式正确性
   - Property 9: 分桶大小限制
   - Property 10: 自动分桶创建

4. **API 行为**
   - Property 11: JSON 响应格式
   - Property 12: 错误状态码正确性
   - Property 13: CORS 头存在性
   - Property 14: 错误信息安全性

5. **并发和性能**
   - Property 15: 并发写入正确性

### 测试数据生成策略

使用 `fast-check` 的生成器创建测试数据：

- **消息内容**：`fc.string()` 生成各种长度和字符的字符串
- **时间戳**：`fc.integer()` 生成不同的时间戳
- **日期字符串**：`fc.date()` 转换为 YYYYMMDD 格式
- **并发场景**：`fc.array()` 生成消息数组

### 测试隔离

- 每个测试应该独立运行，不依赖其他测试的状态
- 使用 mock 或测试专用的 KV 命名空间
- 测试前清理数据，测试后恢复状态

### 持续验证

- 所有属性测试必须在代码提交前通过
- 单元测试覆盖率目标：核心逻辑 > 80%
- 属性测试应该在 CI/CD 流程中运行

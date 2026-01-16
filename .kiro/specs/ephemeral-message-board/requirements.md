# Requirements Document

## Introduction

临时消息板（树洞）是一个轻量级的匿名消息发布系统，消息会在 24 小时后自动消失。系统使用 ESA Edge Routine 和 Edge KV 实现，无需传统数据库，适合低频写入、高频读取的场景。核心特性是消息的临时性和全球边缘节点分发。

## Glossary

- **Message_Board**: 消息板系统，处理消息的发布和读取
- **Edge_Routine**: ESA 边缘函数，处理 API 请求
- **Edge_KV**: ESA 边缘键值存储，分布在全球 POP 节点
- **Message**: 用户发布的消息内容
- **Feed**: 消息列表，展示所有未过期的消息
- **Bucket**: 按日期和分片存储消息的容器

## Requirements

### Requirement 1: 发布消息

**User Story:** 作为用户，我想发布匿名消息到树洞，以便分享我的想法和感受

#### Acceptance Criteria

1. WHEN 用户提交消息内容 THEN THE Message_Board SHALL 创建包含时间戳的消息记录
2. WHEN 消息被创建 THEN THE Message_Board SHALL 将消息存储到 Edge_KV 的日期分桶中
3. WHEN 消息内容为空 THEN THE Message_Board SHALL 拒绝创建并返回错误
4. WHEN 消息内容超过 1000 字符 THEN THE Message_Board SHALL 拒绝创建并返回错误
5. THE Message_Board SHALL 为每条消息生成唯一标识符

### Requirement 2: 读取消息列表

**User Story:** 作为用户，我想浏览所有未过期的消息，以便了解其他人分享的内容

#### Acceptance Criteria

1. WHEN 用户请求消息列表 THEN THE Message_Board SHALL 返回所有未过期的消息
2. WHEN 计算消息是否过期 THEN THE Message_Board SHALL 使用当前时间减去创建时间判断是否超过 24 小时
3. WHEN 消息创建时间超过 24 小时 THEN THE Message_Board SHALL 从返回结果中过滤该消息
4. THE Message_Board SHALL 按时间倒序返回消息（最新的在前）
5. WHEN Edge_KV 同步延迟 THEN THE Message_Board SHALL 正常处理可能的短暂不一致

### Requirement 3: 消息存储结构

**User Story:** 作为系统架构师，我想使用高效的存储结构，以便优化性能和成本

#### Acceptance Criteria

1. THE Message_Board SHALL 使用日期和分桶编号作为 Edge_KV 的键格式（例如：d:20260116:b:03）
2. WHEN 存储消息 THEN THE Message_Board SHALL 将消息序列化为 JSON 数组存储在对应的桶中
3. THE Message_Board SHALL 确保单个桶的大小不超过 1.8 MB
4. WHEN 单个桶接近容量限制 THEN THE Message_Board SHALL 创建新的分桶
5. THE Message_Board SHALL 在消息对象中包含 id、content、createdAt 字段

### Requirement 4: API 路由处理

**User Story:** 作为开发者，我想通过 RESTful API 访问消息板功能，以便集成到前端应用

#### Acceptance Criteria

1. THE Edge_Routine SHALL 处理 POST /api/post 请求用于创建消息
2. THE Edge_Routine SHALL 处理 GET /api/feed 请求用于获取消息列表
3. WHEN API 请求成功 THEN THE Edge_Routine SHALL 返回 JSON 格式的响应
4. WHEN API 请求失败 THEN THE Edge_Routine SHALL 返回适当的 HTTP 状态码和错误信息
5. THE Edge_Routine SHALL 设置适当的 CORS 头以支持跨域请求

### Requirement 5: 错误处理

**User Story:** 作为用户，我想在出现错误时收到清晰的提示，以便了解问题所在

#### Acceptance Criteria

1. WHEN Edge_KV 操作失败 THEN THE Message_Board SHALL 返回 500 错误和描述性消息
2. WHEN 请求参数无效 THEN THE Message_Board SHALL 返回 400 错误和验证失败原因
3. WHEN 请求方法不支持 THEN THE Edge_Routine SHALL 返回 405 错误
4. THE Message_Board SHALL 记录错误日志以便调试
5. WHEN 发生错误 THEN THE Message_Board SHALL 不暴露内部实现细节

### Requirement 6: 性能和可扩展性

**User Story:** 作为系统管理员，我想确保系统能够处理合理的负载，以便提供稳定的服务

#### Acceptance Criteria

1. THE Message_Board SHALL 支持每天至少 1000 条消息的发布
2. THE Message_Board SHALL 在 200ms 内响应读取请求（不考虑网络延迟）
3. WHEN 多个用户同时发布消息 THEN THE Message_Board SHALL 正确处理并发写入
4. THE Message_Board SHALL 利用 Edge_KV 的全球分发特性提供低延迟访问
5. THE Message_Board SHALL 接受 Edge_KV 同步可能需要最多 20 秒的延迟

# Implementation Plan: Ephemeral Message Board

## Overview

本实施计划将临时消息板功能分解为增量式的开发任务。每个任务都建立在前面的任务之上，确保代码逐步集成。实现将使用 TypeScript 和 ESA Edge Routine 环境。

## Tasks

- [x] 1. 设置项目结构和核心类型定义
  - 创建项目目录结构
  - 定义 TypeScript 接口：Message, Bucket, API 请求/响应类型
  - 配置 TypeScript 编译选项（如果需要）
  - 设置测试框架（Vitest 或 Jest + fast-check）
  - _Requirements: 3.5, 4.1, 4.2_

- [x] 2. 实现时间工具模块
  - [x] 2.1 创建 TimeUtility 类
    - 实现 getCurrentTimestamp() 方法
    - 实现 isExpired(createdAt: number) 方法（24 小时判断）
    - 实现 getDateString(timestamp: number) 方法（返回 YYYYMMDD 格式）
    - _Requirements: 2.2_

  - [ ]* 2.2 编写 TimeUtility 的属性测试
    - **Property 6: 过期消息过滤** - 验证 isExpired 正确判断 24 小时边界
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ]* 2.3 编写 TimeUtility 的单元测试
    - 测试日期格式化的正确性
    - 测试边界情况（恰好 24 小时）
    - _Requirements: 2.2_

- [x] 3. 实现消息验证逻辑
  - [x] 3.1 创建 MessageValidator 类
    - 实现 validateContent(content: string) 方法
    - 检查空白字符串（trim 后为空）
    - 检查长度限制（> 1000 字符）
    - 返回验证结果对象 { valid: boolean, error?: string }
    - _Requirements: 1.3, 1.4_

  - [ ]* 3.2 编写消息验证的属性测试
    - **Property 3: 空内容拒绝** - 生成各种空白字符串，验证都被拒绝
    - **Property 4: 长度限制强制** - 生成超长字符串，验证都被拒绝
    - **Validates: Requirements 1.3, 1.4**

  - [ ]* 3.3 编写消息验证的单元测试
    - 测试空字符串
    - 测试恰好 1000 字符
    - 测试恰好 1001 字符
    - 测试只包含空格/制表符的字符串
    - _Requirements: 1.3, 1.4_

- [x] 4. 实现存储管理器
  - [x] 4.1 创建 StorageManager 类
    - 实现 getBucketKey(date: string, bucketIndex: number) 方法
    - 实现 saveMessage(message: Message) 方法（写入 Edge KV）
    - 实现 getMessagesForDate(date: string) 方法（从 Edge KV 读取）
    - 实现分桶逻辑：检查当前桶大小，超过 1.5MB 时创建新桶
    - _Requirements: 1.2, 3.1, 3.2, 3.3, 3.4_

  - [ ]* 4.2 编写存储管理器的属性测试
    - **Property 8: 分桶键格式正确性** - 验证生成的键符合 d:YYYYMMDD:b:XX 格式
    - **Property 9: 分桶大小限制** - 验证桶不超过 1.8MB
    - **Property 10: 自动分桶创建** - 验证接近容量时创建新桶
    - **Validates: Requirements 3.1, 3.3, 3.4**

  - [ ]* 4.3 编写存储管理器的单元测试
    - 测试键格式生成
    - 测试空桶读取
    - 使用 mock KV 测试读写操作
    - _Requirements: 3.1, 3.2_

- [x] 5. 检查点 - 确保基础模块测试通过
  - 确保所有测试通过，如有问题请询问用户

- [x] 6. 实现消息服务核心逻辑
  - [x] 6.1 创建 MessageService 类
    - 注入 StorageManager 和 TimeUtility 依赖
    - 实现 createMessage(content: string) 方法
      - 调用验证器验证内容
      - 生成唯一 ID（使用 crypto.randomUUID()）
      - 获取当前时间戳
      - 创建 Message 对象
      - 调用 StorageManager 保存消息
      - 返回创建的消息
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 6.2 实现 getFeed() 方法
    - 获取当前日期和前一天的日期
    - 从 StorageManager 读取两天的所有消息
    - 过滤掉过期消息（使用 TimeUtility.isExpired）
    - 按 createdAt 降序排序
    - 返回消息数组
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 6.3 编写消息服务的属性测试
    - **Property 1: 消息创建完整性** - 验证创建的消息包含所有必需字段
    - **Property 2: 消息存储往返一致性** - 验证存储后读取的消息一致
    - **Property 5: ID 唯一性** - 验证批量创建的消息 ID 唯一
    - **Property 7: 时间倒序排序** - 验证 feed 返回的消息按时间排序
    - **Validates: Requirements 1.1, 1.2, 1.5, 2.4**

  - [ ]* 6.4 编写消息服务的单元测试
    - 测试创建消息的完整流程
    - 测试 getFeed 过滤过期消息
    - 测试空 feed 情况
    - _Requirements: 1.1, 2.1_

- [x] 7. 实现 API 处理器（Edge Routine 入口）
  - [x] 7.1 创建 handleRequest(request: Request) 函数
    - 解析请求 URL 和方法
    - 路由到相应的处理函数
    - 实现 CORS 头设置
    - 实现全局错误处理（try-catch）
    - _Requirements: 4.1, 4.2, 4.5_

  - [x] 7.2 实现 POST /api/post 处理器
    - 解析 JSON 请求体
    - 提取 content 字段
    - 调用 MessageService.createMessage()
    - 返回成功响应或错误响应
    - 处理验证错误（返回 400）
    - _Requirements: 4.1, 4.3, 4.4_

  - [x] 7.3 实现 GET /api/feed 处理器
    - 调用 MessageService.getFeed()
    - 返回消息列表的 JSON 响应
    - 处理可能的错误（返回 500）
    - _Requirements: 4.2, 4.3, 4.4_

  - [x] 7.4 实现错误响应格式化
    - 创建统一的错误响应格式
    - 确保不暴露内部错误细节
    - 根据错误类型返回适当的状态码
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [ ]* 7.5 编写 API 处理器的属性测试
    - **Property 11: JSON 响应格式** - 验证所有成功响应是有效 JSON
    - **Property 12: 错误状态码正确性** - 验证无效请求返回 400
    - **Property 13: CORS 头存在性** - 验证所有响应包含 CORS 头
    - **Property 14: 错误信息安全性** - 验证错误响应不包含敏感信息
    - **Validates: Requirements 4.3, 4.4, 4.5, 5.2, 5.5**

  - [ ]* 7.6 编写 API 处理器的单元测试
    - 测试 POST /api/post 端点
    - 测试 GET /api/feed 端点
    - 测试不支持的方法（返回 405）
    - 测试无效 JSON 输入
    - 测试缺少必需字段
    - _Requirements: 4.1, 4.2, 5.3_

- [x] 8. 检查点 - 确保所有核心功能测试通过
  - 确保所有测试通过，如有问题请询问用户

- [x] 9. 集成和部署准备
  - [x] 9.1 创建 Edge Routine 入口文件
    - 导入所有模块
    - 初始化 MessageService 和依赖
    - 导出 handleRequest 作为默认处理器
    - 配置 Edge KV 绑定
    - _Requirements: 4.1, 4.2_

  - [x] 9.2 添加环境配置
    - 配置 Edge KV 命名空间绑定
    - 添加必要的环境变量（如果需要）
    - _Requirements: 1.2_

  - [ ]* 9.3 编写集成测试
    - 测试完整的请求-响应流程
    - 测试创建消息后立即读取
    - 测试多条消息的创建和读取
    - _Requirements: 1.1, 2.1_

- [ ]* 10. 并发测试
  - [ ]* 10.1 编写并发写入属性测试
    - **Property 15: 并发写入正确性** - 验证并发创建的消息都被正确存储
    - **Validates: Requirements 6.3**

- [x] 11. 最终检查点
  - 运行所有测试确保通过
  - 验证 API 端点可以正常工作
  - 如有问题请询问用户

## Notes

- 标记 `*` 的任务是可选的，可以跳过以加快 MVP 开发
- 每个任务都引用了具体的需求以便追溯
- 检查点确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证特定示例和边缘情况
- 所有代码应该逐步集成，没有孤立的未使用代码

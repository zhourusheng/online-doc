基于 Tiptap 实现简易协同编辑器，建议采用以下方案：

前端框架：Tiptap + Y.js
Tiptap 提供富文本编辑功能
Y.js 提供 CRDT 算法支持，解决冲突问题
通信层：WebSocket
使用 y-websocket 提供的连接器
直接连接架构（简易系统可不需 BFF）
后端服务：
轻量级 WebSocket 服务器（如 y-websocket 提供的服务器）
简单的文档存储（MongoDB/PostgreSQL）

前端实现：
创建 Tiptap 编辑器
集成 Y.js 的协作扩展
连接 WebSocket 服务
后端实现：
部署 y-websocket 服务器
实现文档持久化存储

实现简单，开发成本低
CRDT 算法自动处理冲突
支持离线编辑（Y.js 内置）
社区支持良好
对于简易协同编辑器，这种方案可以快速实现基本功能，同时避免复杂的 BFF 架构带来的额外开发成本。

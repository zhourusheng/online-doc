# 协同文档编辑器 (Online Doc)

一个基于Vue 3、Tiptap、Y.js和WebSocket的实时协同文档编辑系统，支持多用户同时编辑、光标同步和自动冲突解决。

## 项目概述

协同文档编辑器是一个现代化的在线文档协作平台，允许多个用户同时编辑同一文档，实时查看彼此的编辑内容和光标位置。系统使用CRDT（无冲突复制数据类型）算法自动解决并发编辑冲突，确保所有用户看到的文档内容保持一致。

主要特点：
- 实时协同编辑，所有更改即时同步
- 多用户光标位置实时显示
- 支持离线编辑，重新连接后自动同步
- 简洁现代的用户界面
- 完整的文档管理功能

## 技术栈

### 前端
- **Vue 3**: 渐进式JavaScript框架，提供响应式UI
- **TypeScript**: 类型安全的JavaScript超集
- **Pinia**: Vue的状态管理库
- **Vue Router**: Vue官方路由管理器
- **Vite**: 现代前端构建工具
- **Ant Design Vue**: 基于Ant Design的Vue组件库
- **TailwindCSS**: 实用优先的CSS框架
- **Less**: CSS预处理器
- **Tiptap**: 基于ProseMirror的富文本编辑器框架
- **Y.js**: 用于协同编辑的CRDT实现
- **y-websocket**: Y.js的WebSocket提供程序

### 后端
- **Express**: Node.js Web应用框架
- **TypeScript**: 类型安全的JavaScript超集
- **MongoDB**: NoSQL文档数据库
- **Mongoose**: MongoDB对象建模工具
- **WebSocket**: 实时通信协议
- **y-websocket**: Y.js的WebSocket服务器
- **JWT**: JSON Web Token用于身份验证
- **bcryptjs**: 密码哈希库

## 系统架构

系统采用前后端分离架构：

1. **前端**:
   - Vue 3提供响应式UI框架
   - Tiptap作为富文本编辑器
   - Y.js处理协同编辑逻辑和冲突解决
   - Pinia管理应用状态
   - WebSocket与后端保持实时连接

2. **后端**:
   - Express提供REST API服务
   - MongoDB存储文档元数据（标题、创建时间等）
   - WebSocket服务器处理实时数据同步
   - Y.js在服务端管理文档内容的合并和同步

3. **数据流**:
   - 文档元数据通过REST API管理
   - 文档内容通过Y.js和WebSocket实时同步
   - 用户编辑操作在本地应用后立即通过WebSocket广播给其他用户

## 项目结构

```
online-doc/
├── frontend/                 # 前端项目
│   ├── src/                  # 源代码
│   │   ├── assets/           # 静态资源
│   │   ├── components/       # Vue组件
│   │   │   └── CollaborativeEditor.vue  # 协同编辑器组件
│   │   ├── router/           # 路由配置
│   │   ├── stores/           # Pinia状态管理
│   │   │   ├── document.ts   # 文档状态管理
│   │   │   └── user.ts       # 用户状态管理
│   │   ├── views/            # 页面视图
│   │   │   ├── EditorView.vue  # 编辑器页面
│   │   │   └── HomeView.vue    # 主页/文档列表
│   │   ├── App.vue           # 根组件
│   │   └── main.ts           # 应用入口
│   ├── public/               # 公共静态资源
│   └── ...                   # 其他配置文件
│
└── backend/                  # 后端项目
    ├── src/                  # 源代码
    │   ├── middleware/       # 中间件
    │   ├── models/           # 数据模型
    │   │   ├── Document.ts   # 文档模型
    │   │   └── User.ts       # 用户模型
    │   ├── routes/           # API路由
    │   │   ├── auth.ts       # 认证相关路由
    │   │   └── document.ts   # 文档相关路由
    │   ├── types/            # 类型定义
    │   └── index.ts          # 服务器入口
    └── ...                   # 其他配置文件
```

## 功能特性

- **实时协同编辑**：多用户可同时编辑同一文档，变更实时同步
- **用户光标同步**：实时显示其他用户的光标位置和选择区域
- **文档管理**：创建、查看、编辑和删除文档
- **用户认证**：注册、登录和权限控制
- **离线编辑支持**：网络断开时可继续编辑，重连后自动同步
- **自动冲突解决**：基于CRDT算法自动处理并发编辑冲突
- **响应式设计**：适配不同屏幕尺寸的设备

## 安装与配置

### 前提条件

- Node.js (v16+)
- pnpm (v7+)
- MongoDB (v5+)

### 安装步骤

1. 克隆仓库
```bash
git clone <repository-url>
cd online-doc
```

2. 安装依赖
```bash
# 安装工作区依赖
pnpm install

# 或分别安装前后端依赖
cd frontend
pnpm install

cd ../backend
pnpm install
```

3. 配置环境变量

后端环境变量 (创建 backend/.env 文件):
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/online-doc
JWT_SECRET=your-secret-key
```

前端环境变量 (创建 frontend/.env 文件):
```
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
```

## 开发指南

### 开发模式

```bash
# 同时启动前后端开发服务器
pnpm dev

# 或分别启动
# 前端开发服务器 (http://localhost:5173)
pnpm dev:frontend

# 后端开发服务器 (http://localhost:3001)
pnpm dev:backend
```

### 构建项目

```bash
# 构建整个项目
pnpm build

# 或分别构建
# 构建前端
pnpm build:frontend

# 构建后端
pnpm build:backend
```

### 运行生产版本

```bash
# 启动后端服务器 (会自动提供前端静态文件)
pnpm start
```

## 部署说明

### 生产环境部署

1. **前端部署**
   - 构建前端: `cd frontend && pnpm build`
   - 将 `frontend/dist` 目录部署到任意静态文件服务器
   - 配置API和WebSocket地址指向后端服务器

2. **后端部署**
   - 构建后端: `cd backend && pnpm build`
   - 配置环境变量
   - 启动Node.js服务: `node dist/index.js`
   - 确保WebSocket端口开放

3. **数据库配置**
   - 配置MongoDB连接URI
   - 考虑为生产环境配置数据库认证

### Docker部署 (可选)

可以创建Docker配置文件，简化部署流程。

## 扩展与维护

### 添加新功能

1. **添加新的编辑器功能**
   - 通过Tiptap的扩展系统添加新的编辑功能
   - 参考Tiptap官方文档: https://tiptap.dev/extensions

2. **添加新的API端点**
   - 在 `backend/src/routes` 中创建新的路由处理器
   - 更新前端API调用

### 性能优化

- 大型文档考虑分段加载
- 针对高并发场景优化WebSocket服务器
- 为MongoDB添加适当的索引

## 常见问题

### Q: 文档内容如何保存？
A: 文档内容使用Y.js通过WebSocket协议管理，而不是直接存储在数据库中。MongoDB只存储文档的元数据（如标题、创建时间等）。

### Q: 如何处理网络断连情况？
A: 得益于Y.js的CRDT算法，用户在离线状态下仍然可以继续编辑文档。当网络恢复时，系统会自动同步本地更改到服务器，并从服务器获取其他用户的更改，自动合并所有变更而不会产生冲突。

### Q: 系统的性能瓶颈可能在哪里？
A: 大型文档的加载和同步可能会占用较多资源；同时在线的用户数量过多时，WebSocket服务器可能成为瓶颈；数据库性能在文档数量大幅增长时需要关注。

## 许可证

ISC License

## 贡献指南

欢迎提交问题报告和功能请求。如果您想贡献代码，请先讨论您想要进行的更改。 
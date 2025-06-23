# 协同文档编辑器

一个基于Tiptap、Y.js和WebSocket的简易协同文档编辑器。

## 技术栈

### 前端
- Vue 3
- Pinia
- TypeScript
- Vite
- Vue Router
- Ant Design Vue
- TailwindCSS
- Less
- Tiptap 编辑器
- Y.js CRDT 算法

### 后端
- Express
- TypeScript
- MongoDB
- WebSocket (y-websocket)

## 项目结构

```
online-doc/
├── frontend/         # 前端项目
│   ├── src/          # 源代码
│   ├── public/       # 静态资源
│   └── ...           # 其他配置文件
│
└── backend/          # 后端项目
    ├── src/          # 源代码
    └── ...           # 其他配置文件
```

## 开发指南

### 安装依赖

```bash
# 安装前端依赖
cd frontend
pnpm install

# 安装后端依赖
cd ../backend
pnpm install
```

### 开发模式

```bash
# 运行前端开发服务器
cd frontend
pnpm dev

# 运行后端开发服务器
cd ../backend
pnpm dev
```

### 构建项目

```bash
# 构建前端
cd frontend
pnpm build

# 构建后端
cd ../backend
pnpm build
```

## 功能特性

- 实时协同编辑
- 多用户光标同步
- 文档列表管理
- 自动冲突解决
- 离线编辑支持

## 部署说明

- 前端可部署在任意静态文件服务器
- 后端需要Node.js环境和MongoDB数据库
- WebSocket服务需要端口开放 
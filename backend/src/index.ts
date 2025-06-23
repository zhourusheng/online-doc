import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';
import mongoose from 'mongoose';
import { documentRouter } from './routes/document';
import { authRouter } from './routes/auth';
import { optionalAuthMiddleware } from './middleware/auth';
import jwt from 'jsonwebtoken';
import url from 'url';

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;
const DISABLE_DB = process.env.DISABLE_DB === 'true' || false;

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/auth', authRouter);
app.use('/api/documents', optionalAuthMiddleware, documentRouter);

// 健康检查
app.get('/api/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'ok', message: '服务正常运行' });
});

// 创建HTTP服务器
const server = http.createServer(app);

// 扩展WebSocket类型
interface AuthenticatedWebSocket extends WebSocket {
  user?: any;
}

// 创建WebSocket服务器
const wss = new WebSocketServer({ server });

wss.on('connection', (conn: AuthenticatedWebSocket, req) => {
  // 获取token
  const urlParams = url.parse(req.url || '', true).query;
  const token = urlParams.token as string;
  
  // 可选的认证验证
  if (token) {
    try {
      // 验证token
      const decoded = jwt.verify(token, JWT_SECRET);
      // 可以将用户信息添加到连接对象
      conn.user = decoded;
    } catch (error) {
      // token无效，但仍允许连接（只是不设置用户信息）
      console.log('WebSocket连接使用了无效的token');
    }
  }
  
  // 设置Y.js WebSocket连接
  setupWSConnection(conn, req, {
    // 可以在这里添加Y.js的选项
    gc: true // 启用垃圾回收
  });
  
  console.log('WebSocket连接已建立');
  
  conn.on('close', () => {
    console.log('WebSocket连接已关闭');
  });
});

// 连接MongoDB
const connectDB = async () => {
  if (DISABLE_DB) {
    console.log('数据库连接已禁用，使用内存模式运行');
    return;
  }
  
  try {
    // 使用本地MongoDB或者MongoDB Atlas
    await mongoose.connect('mongodb://localhost:27017/online-doc');
    console.log('已连接到MongoDB');
  } catch (error) {
    console.error('MongoDB连接失败:', error);
    console.log('将使用内存模式运行');
  }
};

// 启动服务器
const startServer = async () => {
  try {
    // 连接数据库
    await connectDB();
    
    // 启动服务器
    server.listen(PORT, () => {
      console.log(`服务器已启动在端口 ${PORT}`);
      console.log(`HTTP API: http://localhost:${PORT}`);
      console.log(`WebSocket: ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
  }
};

startServer(); 
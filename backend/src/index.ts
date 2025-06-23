import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';
import mongoose from 'mongoose';
import { documentRouter } from './routes/document';
import { authRouter } from './routes/auth';
import { authMiddleware } from './middleware/auth';
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
app.use('/api/documents', documentRouter); // 注意：路由内部已经添加了authMiddleware

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
  
  // WebSocket连接必须验证
  if (!token) {
    console.log('WebSocket连接没有提供token，拒绝连接');
    conn.close(1000, '未经授权');
    return;
  }
  
  try {
    // 验证token
    const decoded = jwt.verify(token, JWT_SECRET);
    // 添加用户信息到连接对象
    conn.user = decoded;
  } catch (error) {
    // token无效，拒绝连接
    console.log('WebSocket连接使用了无效的token，拒绝连接');
    conn.close(1000, '无效的token');
    return;
  }
  
  // 设置Y.js WebSocket连接
  setupWSConnection(conn, req, {
    // 可以在这里添加Y.js的选项
    gc: true, // 启用垃圾回收
    // 添加权限检查回调
    docAccess: async (docName: string) => {
      try {
        // 如果用户已验证
        if (conn.user) {
          // 从文档名称中提取文档ID
          // 文档名称格式通常是 document-{documentId}
          const documentId = docName.replace('document-', '');
          
          if (!DISABLE_DB) {
            // 查询数据库验证文档所有权
            const Document = mongoose.model('Document');
            const doc = await Document.findById(documentId);
            
            if (!doc) {
              console.log(`文档不存在: ${documentId}`);
              return false;
            }
            
            // 验证文档所有者是否为当前用户
            if (doc.owner && doc.owner.toString() === conn.user.id) {
              console.log(`用户 ${conn.user.username} 有权限访问文档 ${documentId}`);
              return true;
            } else {
              console.log(`用户 ${conn.user.username} 没有权限访问文档 ${documentId}`);
              return false;
            }
          } else {
            // 内存模式下的验证
            const inMemoryDocuments = require('./routes/document').inMemoryDocuments;
            const doc = inMemoryDocuments.find(d => d.id === documentId);
            
            if (!doc) {
              console.log(`文档不存在: ${documentId}`);
              return false;
            }
            
            if (doc.ownerId === conn.user.id) {
              console.log(`用户 ${conn.user.username} 有权限访问文档 ${documentId}`);
              return true;
            } else {
              console.log(`用户 ${conn.user.username} 没有权限访问文档 ${documentId}`);
              return false;
            }
          }
        }
        
        console.log('未登录用户尝试访问文档');
        return false; // 未登录用户拒绝访问
      } catch (error) {
        console.error('文档访问权限验证错误:', error);
        return false; // 出错时拒绝访问
      }
    }
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

    // 检查是否有没有所有者的文档
    const Document = mongoose.model('Document');
    const User = mongoose.model('User');
    
    const documentsWithoutOwner = await Document.countDocuments({ owner: { $exists: false } });
    
    if (documentsWithoutOwner > 0) {
      console.log(`发现 ${documentsWithoutOwner} 个没有所有者的文档，尝试修复...`);
      
      // 查找一个用户作为默认所有者
      const defaultUser = await User.findOne();
      if (defaultUser) {
        console.log(`使用用户 ${defaultUser.username} 作为默认所有者`);
        
        // 批量更新所有没有所有者的文档
        await Document.updateMany(
          { owner: { $exists: false } },
          { $set: { owner: defaultUser._id } }
        );
        
        console.log('文档修复完成');
      } else {
        console.warn('找不到任何用户，无法修复文档。请先创建用户，然后运行迁移脚本');
      }
    }
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
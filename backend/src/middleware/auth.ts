import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 扩展Request接口，添加user属性
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// 验证JWT中间件
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 从请求头获取token
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未授权，请登录' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // 验证token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: '无效的token，请重新登录' });
  }
};

// 可选的认证中间件，不强制要求登录
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 从请求头获取token
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // 验证token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    // 不处理错误，继续执行
  }
  
  next();
}; 
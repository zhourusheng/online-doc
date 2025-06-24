import { Request, Response, NextFunction } from 'express';
import DocumentModel from '../models/Document';
import mongoose from 'mongoose';

// 文档协作权限验证中间件
export const checkDocumentAccess = (requiredPermission: 'read' | 'comment' | 'edit' | 'owner') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docId = req.params.id;
      
      // 验证文档ID格式
      if (!mongoose.Types.ObjectId.isValid(docId)) {
        return res.status(400).json({ message: '无效的文档ID格式' });
      }
      
      // 查找文档
      const document = await DocumentModel.findById(docId);
      if (!document) {
        return res.status(404).json({ message: '文档不存在' });
      }

      // 如果需要的是所有者权限，只检查所有者
      if (requiredPermission === 'owner') {
        // 如果用户没有登录，拒绝访问
        if (!req.user) {
          return res.status(401).json({ message: '需要登录以访问此文档' });
        }
        
        // 检查用户是否为文档所有者
        if (document.owner.toString() === req.user.id) {
          req.document = document;
          return next();
        }
        
        return res.status(403).json({ message: '只有文档所有者可以执行此操作' });
      }

      // 检查是否访问链接
      const { accessToken } = req.query;
      if (accessToken && document.accessLink?.token === accessToken) {
        // 验证访问链接是否过期
        if (document.accessLink.expiresAt && new Date() > new Date(document.accessLink.expiresAt)) {
          return res.status(403).json({ message: '访问链接已过期' });
        }

        // 检查访问链接权限是否满足需求
        const permissionLevels = ['read', 'comment', 'edit'];
        const linkPermission = permissionLevels.indexOf(document.accessLink.permission);
        const requiredLevel = permissionLevels.indexOf(requiredPermission);

        if (linkPermission >= requiredLevel) {
          // 权限足够，继续处理
          req.document = document;
          return next();
        }
      }
      
      // 如果用户没有登录，拒绝访问
      if (!req.user) {
        return res.status(401).json({ message: '需要登录以访问此文档' });
      }
      
      // 检查用户是否为文档所有者
      if (document.owner.toString() === req.user.id) {
        // 所有者拥有所有权限
        req.document = document;
        return next();
      }
      
      // 检查用户是否为协作者
      const collaborator = document.collaborators?.find(
        (c) => c.user.toString() === req.user.id
      );

      if (collaborator) {
        // 检查协作者是否有足够的权限
        const permissionLevels = ['read', 'comment', 'edit'];
        const userPermission = permissionLevels.indexOf(collaborator.permission);
        const requiredLevel = permissionLevels.indexOf(requiredPermission);

        if (userPermission >= requiredLevel) {
          // 权限足够，继续处理
          req.document = document;
          return next();
        }
      }
      
      // 如果没有足够的权限，拒绝访问
      return res.status(403).json({ message: '没有足够的权限访问此文档' });
    } catch (error) {
      console.error('文档访问权限检查失败:', error);
      return res.status(500).json({ message: '服务器错误，请稍后再试' });
    }
  };
};

// 扩展Request接口，添加document属性
declare global {
  namespace Express {
    interface Request {
      document?: any;
    }
  }
} 
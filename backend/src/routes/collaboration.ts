import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { checkDocumentAccess } from '../middleware/collaboration';
import Document, { IDocument } from '../models/Document';
import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import User from '../models/User';

const router: Router = Router();

// 生成独特的访问令牌
const generateAccessToken = () => {
  return crypto.randomBytes(16).toString('hex');
};

// 添加协作者到文档
router.post('/:id/collaborators', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, permission } = req.body;
    
    // 验证权限值是否有效
    if (!['read', 'comment', 'edit'].includes(permission)) {
      return res.status(400).json({ message: '无效的权限值，必须是 read、comment 或 edit' });
    }

    // 验证用户ID格式
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: '无效的用户ID格式' });
    }

    // 验证用户存在
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    const docId = req.params.id;
    
    // 验证文档ID格式
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ message: '无效的文档ID格式' });
    }
    
    // 查找文档并验证所有权
    const document = await Document.findById(docId);
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }
    
    if (document.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: '只有文档所有者能添加协作者' });
    }
    
    // 检查用户是否已经是协作者
    const existingCollaborator = document.collaborators?.find(
      c => c.user.toString() === userId
    );
    
    if (existingCollaborator) {
      // 更新现有协作者的权限
      existingCollaborator.permission = permission as 'read' | 'comment' | 'edit';
    } else {
      // 添加新的协作者
      if (!document.collaborators) {
        document.collaborators = [];
      }
      document.collaborators.push({
        user: new Types.ObjectId(userId),
        permission: permission as 'read' | 'comment' | 'edit'
      });
    }
    
    await document.save();
    
    res.status(200).json({
      message: '协作者添加成功',
      collaborator: { userId, permission }
    });
  } catch (error) {
    console.error('添加协作者失败:', error);
    res.status(500).json({ message: '添加协作者失败', error });
  }
});

// 移除协作者
router.delete('/:id/collaborators/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const docId = req.params.id;
    const userId = req.params.userId;
    
    // 验证文档ID格式
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ message: '无效的文档ID格式' });
    }
    
    // 验证用户ID格式
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: '无效的用户ID格式' });
    }
    
    // 查找文档并验证所有权
    const document = await Document.findById(docId);
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }
    
    if (document.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: '只有文档所有者能移除协作者' });
    }
    
    // 检查用户是否是协作者
    if (!document.collaborators?.some(c => c.user.toString() === userId)) {
      return res.status(404).json({ message: '该用户不是此文档的协作者' });
    }
    
    // 移除协作者
    document.collaborators = document.collaborators.filter(
      c => c.user.toString() !== userId
    );
    
    await document.save();
    
    res.status(200).json({ message: '协作者移除成功' });
  } catch (error) {
    console.error('移除协作者失败:', error);
    res.status(500).json({ message: '移除协作者失败', error });
  }
});

// 获取文档的所有协作者
router.get('/:id/collaborators', authMiddleware, async (req: Request, res: Response) => {
  try {
    const docId = req.params.id;
    
    // 验证文档ID格式
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ message: '无效的文档ID格式' });
    }
    
    // 查找文档并验证所有权或协作权限
    const document = await Document.findById(docId).populate('collaborators.user', 'username');
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }
    
    // 验证是所有者或者协作者
    const isOwner = document.owner.toString() === req.user.id;
    const isCollaborator = document.collaborators?.some(c => {
      // 安全地访问user属性，考虑它可能是ObjectId或已填充的User对象
      const userId = c.user._id ? c.user._id.toString() : c.user.toString();
      return userId === req.user.id;
    });
    
    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: '没有权限查看此文档的协作者' });
    }
    
    res.status(200).json({ collaborators: document.collaborators || [] });
  } catch (error) {
    console.error('获取协作者列表失败:', error);
    res.status(500).json({ message: '获取协作者列表失败', error });
  }
});

// 创建访问链接
router.post('/:id/access-link', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { permission, expiresInHours } = req.body;
    
    // 验证权限值是否有效
    if (!['read', 'comment', 'edit'].includes(permission)) {
      return res.status(400).json({ message: '无效的权限值，必须是 read、comment 或 edit' });
    }
    
    const docId = req.params.id;
    
    // 验证文档ID格式
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ message: '无效的文档ID格式' });
    }
    
    // 查找文档并验证所有权
    const document = await Document.findById(docId);
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }
    
    if (document.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: '只有文档所有者能创建访问链接' });
    }
    
    // 生成访问链接
    const token = generateAccessToken();
    let expiresAt: Date | null = null;
    
    // 设置过期时间(如果指定了)
    if (expiresInHours && !isNaN(Number(expiresInHours))) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + Number(expiresInHours));
    }
    
    // 更新文档的访问链接
    document.accessLink = {
      token,
      expiresAt: expiresAt || undefined as any, // 类型转换以满足模型要求
      permission: permission as 'read' | 'comment' | 'edit'
    };
    
    await document.save();
    
    // 构建完整的访问链接URL (前端需要处理此链接)
    const accessUrl = `/document/${docId}?accessToken=${token}`;
    
    res.status(200).json({
      message: '访问链接创建成功',
      accessLink: {
        url: accessUrl,
        token,
        expiresAt,
        permission
      }
    });
  } catch (error) {
    console.error('创建访问链接失败:', error);
    res.status(500).json({ message: '创建访问链接失败', error });
  }
});

// 获取文档的访问链接
router.get('/:id/access-link', authMiddleware, async (req: Request, res: Response) => {
  try {
    const docId = req.params.id;
    
    // 验证文档ID格式
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ message: '无效的文档ID格式' });
    }
    
    // 查找文档并验证所有权
    const document = await Document.findById(docId);
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }
    
    if (document.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: '只有文档所有者能查看访问链接' });
    }
    
    // 如果没有访问链接，返回null
    if (!document.accessLink || !document.accessLink.token) {
      return res.status(200).json({ accessLink: null });
    }
    
    // 构建完整的访问链接URL
    const accessUrl = `/document/${docId}?accessToken=${document.accessLink.token}`;
    
    res.status(200).json({
      accessLink: {
        url: accessUrl,
        token: document.accessLink.token,
        expiresAt: document.accessLink.expiresAt || null,
        permission: document.accessLink.permission
      }
    });
  } catch (error) {
    console.error('获取访问链接失败:', error);
    res.status(500).json({ message: '获取访问链接失败', error });
  }
});

// 删除访问链接
router.delete('/:id/access-link', authMiddleware, async (req: Request, res: Response) => {
  try {
    const docId = req.params.id;
    
    // 验证文档ID格式
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ message: '无效的文档ID格式' });
    }
    
    // 查找文档并验证所有权
    const document = await Document.findById(docId);
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }
    
    if (document.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: '只有文档所有者能删除访问链接' });
    }
    
    // 删除访问链接
    document.accessLink = undefined as any; // 类型转换以满足模型要求
    
    await document.save();
    
    res.status(200).json({ message: '访问链接已删除' });
  } catch (error) {
    console.error('删除访问链接失败:', error);
    res.status(500).json({ message: '删除访问链接失败', error });
  }
});

// 通过访问令牌访问文档
router.get('/:id/shared', async (req: Request, res: Response) => {
  try {
    const docId = req.params.id;
    const { accessToken } = req.query;
    
    // 验证文档ID格式
    if (!mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({ message: '无效的文档ID格式' });
    }
    
    // 验证访问令牌存在
    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(400).json({ message: '缺少访问令牌' });
    }
    
    // 查找文档
    const document = await Document.findById(docId);
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }
    
    // 验证访问令牌
    if (!document.accessLink || document.accessLink.token !== accessToken) {
      return res.status(403).json({ message: '无效的访问令牌' });
    }
    
    // 验证访问链接是否过期
    if (document.accessLink.expiresAt && new Date() > new Date(document.accessLink.expiresAt)) {
      return res.status(403).json({ message: '访问链接已过期' });
    }
    
    // 返回文档内容和权限信息
    res.status(200).json({
      document: {
        id: document._id,
        title: document.title,
        content: document.content,
        updatedAt: document.updatedAt,
        permission: document.accessLink.permission
      }
    });
  } catch (error) {
    console.error('通过访问令牌访问文档失败:', error);
    res.status(500).json({ message: '访问文档失败', error });
  }
});

export default router; 
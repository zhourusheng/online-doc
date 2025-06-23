import { Router, Request, Response } from 'express';
import Document from '../models/Document';
import { authMiddleware } from '../middleware/auth'; // 引入必需的身份验证中间件

const router: Router = Router();

// 内存存储，用于在没有MongoDB的情况下运行
const inMemoryDocuments: any[] = [];
let nextId = 1;

// 检查是否使用内存模式
const useMemoryMode = process.env.DISABLE_DB === 'true' || false;

// 获取用户的文档 - 需要认证
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (useMemoryMode) {
      // 过滤只返回当前用户的文档
      const userDocuments = inMemoryDocuments.filter(doc => doc.ownerId === req.user.id);
      return res.status(200).json(userDocuments);
    }
    
    const documents = await Document.find({ owner: req.user.id }).sort({ updatedAt: -1 });
    res.status(200).json(documents);
  } catch (error) {
    console.error('获取文档列表失败:', error);
    res.status(500).json({ message: '获取文档列表失败', error });
  }
});

// 获取单个文档 - 需要认证并且只能访问自己的文档
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (useMemoryMode) {
      const document = inMemoryDocuments.find(doc => doc.id === req.params.id);
      if (!document) {
        return res.status(404).json({ message: '文档不存在' });
      }
      
      // 验证文档所有权
      if (document.ownerId !== req.user.id) {
        return res.status(403).json({ message: '没有权限访问此文档' });
      }
      
      return res.status(200).json(document);
    }
    
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }
    
    // 验证文档所有权
    if (!document.owner) {
      console.error('文档缺少所有者信息:', document);
      return res.status(500).json({ message: '文档数据不完整' });
    }
    
    if (document.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: '没有权限访问此文档' });
    }
    
    res.status(200).json(document);
  } catch (error) {
    console.error('获取文档失败:', error);
    res.status(500).json({ message: '获取文档失败', error });
  }
});

// 创建文档 - 需要认证
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ message: '标题是必填项' });
    }

    if (useMemoryMode) {
      const now = new Date();
      const newDoc = {
        id: String(nextId++),
        title,
        content: '',
        ownerId: req.user.id, // 设置所有者ID
        createdAt: now,
        updatedAt: now
      };
      inMemoryDocuments.push(newDoc);
      return res.status(201).json(newDoc);
    }

    const document = new Document({
      title,
      content: '',
      owner: req.user.id, // 设置所有者
    });

    await document.save();
    res.status(201).json(document);
  } catch (error) {
    console.error('创建文档失败:', error);
    res.status(500).json({ message: '创建文档失败', error });
  }
});

// 更新文档 - 需要认证并且只能更新自己的文档
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    
    if (useMemoryMode) {
      const index = inMemoryDocuments.findIndex(doc => doc.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ message: '文档不存在' });
      }
      
      // 验证文档所有权
      if (inMemoryDocuments[index].ownerId !== req.user.id) {
        return res.status(403).json({ message: '没有权限更新此文档' });
      }
      
      inMemoryDocuments[index] = {
        ...inMemoryDocuments[index],
        title,
        updatedAt: new Date()
      };
      
      return res.status(200).json(inMemoryDocuments[index]);
    }
    
    // 先查找文档以验证所有权
    const existingDoc = await Document.findById(req.params.id);
    if (!existingDoc) {
      return res.status(404).json({ message: '文档不存在' });
    }
    
    // 验证文档所有权
    if (!existingDoc.owner) {
      console.error('文档缺少所有者信息:', existingDoc);
      return res.status(500).json({ message: '文档数据不完整' });
    }
    
    if (existingDoc.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: '没有权限更新此文档' });
    }
    
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      { title },
      { new: true, runValidators: true }
    );

    if (!document) {
      return res.status(404).json({ message: '更新失败，文档不存在' });
    }

    res.status(200).json(document);
  } catch (error) {
    console.error('更新文档失败:', error);
    res.status(500).json({ message: '更新文档失败', error });
  }
});

// 删除文档 - 需要认证并且只能删除自己的文档
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (useMemoryMode) {
      const index = inMemoryDocuments.findIndex(doc => doc.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ message: '文档不存在' });
      }
      
      // 验证文档所有权
      if (inMemoryDocuments[index].ownerId !== req.user.id) {
        return res.status(403).json({ message: '没有权限删除此文档' });
      }
      
      inMemoryDocuments.splice(index, 1);
      return res.status(200).json({ message: '文档已删除' });
    }
    
    // 先查找文档以验证所有权
    const existingDoc = await Document.findById(req.params.id);
    if (!existingDoc) {
      return res.status(404).json({ message: '文档不存在' });
    }
    
    // 验证文档所有权 - 添加更多的空值检查
    if (!existingDoc.owner) {
      console.error('文档缺少所有者信息:', existingDoc);
      return res.status(500).json({ message: '文档数据不完整' });
    }
    
    if (existingDoc.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: '没有权限删除此文档' });
    }
    
    const document = await Document.findByIdAndDelete(req.params.id);
    if (!document) {
      return res.status(404).json({ message: '删除失败，文档不存在' });
    }
    
    res.status(200).json({ message: '文档已删除' });
  } catch (error) {
    console.error('删除文档失败:', error);
    res.status(500).json({ message: '删除文档失败', error });
  }
});

export { router as documentRouter, inMemoryDocuments }; 
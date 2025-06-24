import { Router, Request, Response } from 'express';
import Document from '../models/Document';
import { authMiddleware } from '../middleware/auth'; // 引入必需的身份验证中间件
import { checkDocumentAccess } from '../middleware/collaboration'; // 引入协作中间件

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
    
    // 查询用户拥有的文档
    const ownedDocuments = await Document.find({ owner: req.user.id }).sort({ updatedAt: -1 });
    
    // 查询用户作为协作者的文档
    const collaboratedDocuments = await Document.find({
      'collaborators.user': req.user.id
    }).populate('owner', 'username') // 填充所有者信息
      .sort({ updatedAt: -1 });
    
    // 为协作文档添加权限信息
    const processedCollaboratedDocs = collaboratedDocuments.map(doc => {
      const collaborator = doc.collaborators.find(
        (c: any) => c.user.toString() === req.user.id
      );
      
      const docObject = doc.toObject();
      
      // 添加所有者名称
      (docObject as any).ownerName = doc.owner ? (doc.owner as any).username : '未知用户';
      
      // 添加当前用户的权限
      (docObject as any).permission = collaborator ? collaborator.permission : 'read';
      
      return docObject;
    });
    
    // 合并结果
    const allDocuments = [...ownedDocuments, ...processedCollaboratedDocs];
    
    // 按更新时间排序
    allDocuments.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    res.status(200).json(allDocuments);
  } catch (error) {
    console.error('获取文档列表失败:', error);
    res.status(500).json({ message: '获取文档列表失败', error });
  }
});

// 获取单个文档 - 使用协作中间件验证权限
router.get('/:id', authMiddleware, checkDocumentAccess('read'), async (req: Request, res: Response) => {
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
    
    // 使用req.document从协作中间件获取已验证权限的文档
    if (req.document) {
      const document = req.document;
      
      // 将文档转换为普通对象，以便添加权限信息
      const docObject = document.toObject ? document.toObject() : document;
      
      // 添加用户权限信息
      if (document.owner.toString() === req.user.id) {
        // 如果是所有者，添加所有者权限
        (docObject as any).permission = 'owner';
      } else {
        // 查找用户作为协作者的权限
        const collaborator = document.collaborators?.find(
          (c: any) => c.user.toString() === req.user.id
        );
        
        if (collaborator) {
          // 添加协作者权限
          (docObject as any).permission = collaborator.permission;
        } else if (req.query.accessToken && document.accessLink?.token === req.query.accessToken) {
          // 使用访问链接的权限
          (docObject as any).permission = document.accessLink.permission;
        } else {
          // 默认权限为只读
          (docObject as any).permission = 'read';
        }
      }
      
      return res.status(200).json(docObject);
    }
    
    // 如果没有req.document，可能是因为中间件未正确设置
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
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
    const { title = '未命名文档' } = req.body;
    
    if (useMemoryMode) {
      const newDoc = {
        id: String(nextId++),
        title,
        content: '',
        ownerId: req.user.id,
        ownerName: req.user.username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      inMemoryDocuments.push(newDoc);
      return res.status(201).json(newDoc);
    }
    
    // 创建新文档 - 设置当前用户为所有者
    const document = new Document({
      title,
      owner: req.user.id
    });
    
    await document.save();
    res.status(201).json(document);
  } catch (error) {
    console.error('创建文档失败:', error);
    res.status(500).json({ message: '创建文档失败', error });
  }
});

// 更新文档 - 使用协作中间件验证编辑权限
router.put('/:id', authMiddleware, checkDocumentAccess('edit'), async (req: Request, res: Response) => {
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
    
    // 使用req.document从协作中间件获取已验证权限的文档
    if (!req.document) {
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

// 删除文档 - 只有所有者可以删除
router.delete('/:id', authMiddleware, checkDocumentAccess('owner'), async (req: Request, res: Response) => {
  try {
    if (useMemoryMode) {
      const docIndex = inMemoryDocuments.findIndex(doc => doc.id === req.params.id);
      
      if (docIndex === -1) {
        return res.status(404).json({ message: '文档不存在' });
      }
      
      // 验证文档所有权（内存模式）
      if (inMemoryDocuments[docIndex].ownerId !== req.user.id) {
        return res.status(403).json({ message: '没有权限删除此文档' });
      }
      
      // 删除文档
      inMemoryDocuments.splice(docIndex, 1);
      return res.status(200).json({ message: '文档已删除' });
    }
    
    // 由于使用了checkDocumentAccess('owner')中间件，如果代码执行到这里，已经验证用户是文档所有者
    const document = await Document.findByIdAndDelete(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }
    
    res.status(200).json({ message: '文档已删除' });
  } catch (error) {
    console.error('删除文档失败:', error);
    res.status(500).json({ message: '删除文档失败', error });
  }
});

export { router as documentRouter, inMemoryDocuments }; 
import { Router, Request, Response } from 'express';
import Document from '../models/Document';

const router = Router();

// 内存存储，用于在没有MongoDB的情况下运行
const inMemoryDocuments: any[] = [];
let nextId = 1;

// 检查是否使用内存模式
const useMemoryMode = process.env.DISABLE_DB === 'true' || false;

// 获取所有文档
router.get('/', async (req: Request, res: Response) => {
  try {
    if (useMemoryMode) {
      return res.status(200).json(inMemoryDocuments);
    }
    
    const documents = await Document.find().sort({ updatedAt: -1 });
    res.status(200).json(documents);
  } catch (error) {
    console.error('获取文档列表失败:', error);
    res.status(500).json({ message: '获取文档列表失败', error });
  }
});

// 获取单个文档
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (useMemoryMode) {
      const document = inMemoryDocuments.find(doc => doc.id === req.params.id);
      if (!document) {
        return res.status(404).json({ message: '文档不存在' });
      }
      return res.status(200).json(document);
    }
    
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

// 创建文档
router.post('/', async (req: Request, res: Response) => {
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
        createdAt: now,
        updatedAt: now
      };
      inMemoryDocuments.push(newDoc);
      return res.status(201).json(newDoc);
    }

    const document = new Document({
      title,
      content: '',
    });

    await document.save();
    res.status(201).json(document);
  } catch (error) {
    console.error('创建文档失败:', error);
    res.status(500).json({ message: '创建文档失败', error });
  }
});

// 更新文档
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    
    if (useMemoryMode) {
      const index = inMemoryDocuments.findIndex(doc => doc.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ message: '文档不存在' });
      }
      
      inMemoryDocuments[index] = {
        ...inMemoryDocuments[index],
        title,
        updatedAt: new Date()
      };
      
      return res.status(200).json(inMemoryDocuments[index]);
    }
    
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      { title },
      { new: true, runValidators: true }
    );

    if (!document) {
      return res.status(404).json({ message: '文档不存在' });
    }

    res.status(200).json(document);
  } catch (error) {
    console.error('更新文档失败:', error);
    res.status(500).json({ message: '更新文档失败', error });
  }
});

// 删除文档
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (useMemoryMode) {
      const index = inMemoryDocuments.findIndex(doc => doc.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ message: '文档不存在' });
      }
      
      inMemoryDocuments.splice(index, 1);
      return res.status(200).json({ message: '文档已删除' });
    }
    
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

export { router as documentRouter }; 
import { Router, Request, Response } from 'express';
import User, { IUser } from '../models/User';
import jwt from 'jsonwebtoken';

const router: Router = Router();

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 内存模式用户存储
const inMemoryUsers: any[] = [];

// 检查是否使用内存模式
const useMemoryMode = process.env.DISABLE_DB === 'true' || false;

// 注册新用户
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // 验证请求数据
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码是必填项' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: '密码不能少于6个字符' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ message: '用户名长度应在3-20个字符之间' });
    }

    if (useMemoryMode) {
      // 检查用户名是否已存在
      if (inMemoryUsers.some(user => user.username === username)) {
        return res.status(400).json({ message: '用户名已存在' });
      }

      // 创建新用户（简化版，实际应该哈希密码）
      const newUser = {
        id: String(inMemoryUsers.length + 1),
        username,
        password, // 注意：这里应该哈希密码，但为了简化内存模式，暂不处理
        createdAt: new Date(),
        updatedAt: new Date()
      };

      inMemoryUsers.push(newUser);

      // 生成JWT
      const token = jwt.sign({ id: newUser.id, username }, JWT_SECRET, { expiresIn: '24h' });

      return res.status(201).json({
        message: '注册成功',
        token,
        user: {
          id: newUser.id,
          username: newUser.username
        }
      });
    }

    // MongoDB模式
    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 创建新用户
    const user = new User({
      username,
      password
    });

    await user.save();

    // 生成JWT
    const token = jwt.sign({ id: user._id, username }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user._id,
        username: user.username
      }
    });
  } catch (error) {
    res.status(500).json({ message: '注册失败', error });
  }
});

// 用户登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // 验证请求数据
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码是必填项' });
    }

    if (useMemoryMode) {
      // 查找用户
      const user = inMemoryUsers.find(u => u.username === username);
      if (!user) {
        return res.status(401).json({ message: '用户名或密码不正确' });
      }

      // 验证密码（简化版）
      if (user.password !== password) {
        return res.status(401).json({ message: '用户名或密码不正确' });
      }

      // 生成JWT
      const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '24h' });

      return res.status(200).json({
        message: '登录成功',
        token,
        user: {
          id: user.id,
          username: user.username
        }
      });
    }

    // MongoDB模式
    // 查找用户
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    // 验证密码
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }

    // 生成JWT
    const token = jwt.sign({ id: user._id, username }, JWT_SECRET, { expiresIn: '24h' });

    res.status(200).json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        username: user.username
      }
    });
  } catch (error) {
    res.status(500).json({ message: '登录失败', error });
  }
});

export { router as authRouter }; 
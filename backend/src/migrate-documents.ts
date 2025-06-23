import mongoose from 'mongoose';
import Document from './models/Document';
import User from './models/User';

// 连接MongoDB
const connectDB = async () => {
  try {
    // 使用本地MongoDB或者MongoDB Atlas
    await mongoose.connect('mongodb://localhost:27017/online-doc');
    console.log('已连接到MongoDB');
    return true;
  } catch (error) {
    console.error('MongoDB连接失败:', error);
    return false;
  }
};

// 迁移文档数据
const migrateDocuments = async () => {
  try {
    // 连接数据库
    const connected = await connectDB();
    if (!connected) {
      console.error('数据库连接失败，无法执行迁移');
      process.exit(1);
    }

    // 查找第一个用户作为默认所有者
    const defaultUser = await User.findOne();
    if (!defaultUser) {
      console.error('找不到任何用户，请先创建至少一个用户');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`将使用用户 ${defaultUser.username} (ID: ${defaultUser._id}) 作为默认所有者`);

    // 查找所有没有owner字段的文档
    const documents = await Document.find({ owner: { $exists: false } });
    console.log(`找到 ${documents.length} 个没有所有者的文档`);

    // 为每个文档添加默认所有者
    for (const doc of documents) {
      doc.owner = defaultUser._id;
      await doc.save();
      console.log(`已为文档 "${doc.title}" (ID: ${doc._id}) 设置所有者`);
    }

    console.log('迁移完成');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// 执行迁移
migrateDocuments(); 
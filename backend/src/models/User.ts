import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username: string;
  password: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// 创建一个明确的模式接口
interface IUserDocument extends mongoose.Document {
  username: string;
  password: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUserDocument>(
  {
    username: {
      type: String,
      required: [true, '用户名是必填项'],
      unique: true,
      trim: true,
      minlength: [3, '用户名不能少于3个字符'],
      maxlength: [20, '用户名不能超过20个字符'],
    },
    password: {
      type: String,
      required: [true, '密码是必填项'],
      minlength: [6, '密码不能少于6个字符'],
    },
  },
  {
    timestamps: true,
  }
);

// 保存前对密码进行哈希处理
UserSchema.pre<IUserDocument>('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// 比较密码
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUserDocument>('User', UserSchema); 
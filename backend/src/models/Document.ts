import mongoose, { Schema, Document } from 'mongoose';

export interface IDocument extends Document {
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, '标题是必填项'],
      trim: true,
      maxlength: [100, '标题不能超过100个字符'],
    },
    content: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IDocument>('Document', DocumentSchema); 
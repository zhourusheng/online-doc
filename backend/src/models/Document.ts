import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICollaborator {
  user: Types.ObjectId;
  permission: 'read' | 'comment' | 'edit';
}

export interface IAccessLink {
  token: string;
  expiresAt?: Date;
  permission: 'read' | 'comment' | 'edit';
}

export interface IDocument extends Document {
  title: string;
  content: string;
  owner: Types.ObjectId;
  collaborators: ICollaborator[];
  accessLink?: IAccessLink;
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
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    collaborators: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      permission: {
        type: String,
        enum: ['read', 'comment', 'edit'],
        default: 'read'
      }
    }],
    accessLink: {
      token: String,
      expiresAt: Date,
      permission: {
        type: String,
        enum: ['read', 'comment', 'edit'],
        default: 'read'
      }
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IDocument>('Document', DocumentSchema); 
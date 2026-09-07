import mongoose, { Schema, Document, model } from "mongoose";
export enum TaskPriority {
    LOW = 'Low',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
}

export enum TaskStatus {
    TO_DO = 'TO_DO',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    ARCHIVED = 'ARCHIVED'
}
export interface ISubTask {
    title: string,
    isCompleted: boolean
}

export interface ITask {
    userId: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date;
    tags: string[];
    subtasks: ISubTask[];
    metadata?: Record<string, unknown>
}

export interface ITaskDocument extends ITask, Document {
    createdAt: Date;
    updatedAt: Date
}

const SubtaskSchema = new Schema<ISubTask>(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        isCompleted: {
            type: Boolean,
            default: false
        }
    },
    {
        _id: true
    }
)

const TaskSchema = new Schema<ITaskDocument>(
    {
        userId: {
            type: String,
            required: true
        },
        title:{
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxLength:[120, "Title cannot exceed 120 characters"]
        },
        description:{
            type:String,
            trim:true,
            default:''
        },
        status:{
            type:String,
            enum: Object.values(TaskStatus),
            default: TaskStatus.TO_DO
        },
        priority:{
            type: String,
            enum: Object.values(TaskPriority),
            default: TaskPriority.MEDIUM,
        },
        dueDate:{
            type: Date,
            default: null
        },
        tags:{
            type: [String],
            default:[],
            index:true
        },
        subtasks:[SubtaskSchema],
        metadata:{
            type:Schema.Types.Mixed,
            default:{}
        }
    },{
        timestamps:true
    }
)
TaskSchema.index({ userId:1, title:1, status:1}) // to make query faster by including prefix(left most variable) in the query 

export const Task = model<ITaskDocument>('Task', TaskSchema)
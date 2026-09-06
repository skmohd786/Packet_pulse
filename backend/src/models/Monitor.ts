import mongoose, { Schema, Document } from 'mongoose';

export interface IMonitor extends Document {
    name: string;
    domain: string;
    url: string;
    interval: number;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    lastStatusCode?: number | null;
    lastResponseTime?: number | null;
    uptime: number;
    createdAt: Date;
    updatedAt: Date;
}

const MonitorSchema = new Schema<IMonitor>(
    {
        name: { type: String, required: true },
        domain: { type: String, required: true, unique: true, index: true },
        url: { type: String, required: true },
        interval: { type: Number, required: true, default: 5 },
        status: {
            type: String,
            enum: ['HEALTHY', 'WARNING', 'CRITICAL'],
            default: 'HEALTHY',
        },
        lastStatusCode: { type: Number, default: null },
        lastResponseTime: { type: Number, default: null },
        uptime: { type: Number, default: 100 },
    },
    { timestamps: true }
);

export const MonitorModel = mongoose.model<IMonitor>('Monitor', MonitorSchema);

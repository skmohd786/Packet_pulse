import mongoose, { Schema, Document } from 'mongoose';

export interface IMetric extends Document {
    monitorId: mongoose.Types.ObjectId | string;
    domain: string;
    httpStatus?: number | null;
    responseTime: number;
    dnsTime: number;
    isUp: boolean;
    uptime: number;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    errorMessage?: string | null;
    timestamp: Date;
}

const MetricSchema = new Schema<IMetric>(
    {
        monitorId: { type: Schema.Types.ObjectId, ref: 'Monitor', required: true, index: true },
        domain: { type: String, required: true, index: true },
        httpStatus: { type: Number, default: null },
        responseTime: { type: Number, required: true },
        dnsTime: { type: Number, default: 0 },
        isUp: { type: Boolean, required: true, default: true },
        uptime: { type: Number, default: 100 },
        status: { type: String, required: true },
        errorMessage: { type: String, default: null },
        timestamp: { type: Date, default: Date.now, index: true },
    }
);

MetricSchema.index({ monitorId: 1, timestamp: -1 });

export const MetricModel = mongoose.model<IMetric>('Metric', MetricSchema);

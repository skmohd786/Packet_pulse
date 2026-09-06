import mongoose, { Schema, Document } from 'mongoose';

export interface IIncident extends Document {
    monitorId: mongoose.Types.ObjectId | string;
    domain: string;
    severity: 'CRITICAL' | 'WARNING';
    message: string;
    details: string;
    relevantMetricValues?: Record<string, any>;
    resolvedStatus: 'OPEN' | 'RESOLVED';
    timestamp: Date;
    resolvedAt?: Date | null;
}

const IncidentSchema = new Schema<IIncident>(
    {
        monitorId: { type: Schema.Types.ObjectId, ref: 'Monitor', required: true, index: true },
        domain: { type: String, required: true, index: true },
        severity: { type: String, enum: ['CRITICAL', 'WARNING'], required: true },
        message: { type: String, required: true },
        details: { type: String, required: true },
        relevantMetricValues: { type: Object, default: {} },
        resolvedStatus: { type: String, enum: ['OPEN', 'RESOLVED'], default: 'OPEN' },
        timestamp: { type: Date, default: Date.now, index: true },
        resolvedAt: { type: Date, default: null },
    }
);

IncidentSchema.index({ monitorId: 1, resolvedStatus: 1 });

export const IncidentModel = mongoose.model<IIncident>('Incident', IncidentSchema);

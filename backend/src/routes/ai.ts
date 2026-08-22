import { Router, Request, Response } from 'express';
import { dbGetIncidents, dbGetMetricsByMonitorId } from '../db';
import { analyzeIncidentTelemetry } from '../services/aiService';

const router = Router();

// POST /api/ai/analyze-incident
router.post('/analyze-incident', async (req: Request, res: Response) => {
    try {
        const { incidentId } = req.body;
        if (!incidentId) {
            return res.status(400).json({ success: false, error: 'incidentId is required' });
        }

        // Fetch incident from MongoDB
        const incidents = await dbGetIncidents(100);
        const incident = incidents.find((i) => String(i.id || i._id) === String(incidentId));

        if (!incident) {
            return res.status(404).json({ success: false, error: 'Incident not found' });
        }

        // Fetch historical metrics for incident's monitor
        const metrics = await dbGetMetricsByMonitorId(incident.monitor_id || incident.monitorId!, 30);

        // Analyze using LLM AI Service
        const analysis = await analyzeIncidentTelemetry(incident, metrics);

        res.json({
            success: true,
            incidentId,
            analysis,
        });
    } catch (err: any) {
        if (err.code === 'LLM_API_KEY_MISSING') {
            return res.status(400).json({
                success: false,
                code: 'LLM_API_KEY_MISSING',
                message: 'Configure LLM_API_KEY in environment variables to enable AI observability intelligence.',
            });
        }

        res.status(500).json({
            success: false,
            error: err.message || 'AI incident analysis failed',
        });
    }
});

export default router;

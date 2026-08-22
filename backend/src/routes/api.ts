import { Router, Request, Response } from 'express';
import {
    dbGetMonitors,
    dbInsertMonitor,
    dbDeleteMonitor,
    dbGetMetricsByMonitorId,
    dbGetIncidents,
    dbResolveIncident,
    dbGetMonitorById
} from '../db';
import { performHealthCheck } from '../services/healthChecker';

const router = Router();

// GET /api/monitors - List all monitors
router.get('/monitors', async (req: Request, res: Response) => {
    try {
        const monitors = await dbGetMonitors();
        res.json({ success: true, monitors });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/monitors - Add a new domain to monitor
router.post('/monitors', async (req: Request, res: Response) => {
    try {
        const { domain, name, interval } = req.body;
        if (!domain || typeof domain !== 'string') {
            return res.status(400).json({ success: false, error: 'Domain is required' });
        }

        const cleanDomain = domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
        const monitorName = name && name.trim() ? name.trim() : cleanDomain;
        const targetUrl = domain.trim().startsWith('http') ? domain.trim() : `https://${cleanDomain}`;
        const checkInterval = parseInt(interval) || 5;

        // Perform instant initial check to validate domain reachability
        const initialCheck = await performHealthCheck(targetUrl);

        const newMonitor = await dbInsertMonitor(
            monitorName,
            cleanDomain,
            targetUrl,
            checkInterval
        );

        res.status(201).json({
            success: true,
            monitor: newMonitor,
            initialCheck
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/monitors/:id/metrics - Get metrics history for charts
router.get('/monitors/:id/metrics', async (req: Request, res: Response) => {
    try {
        const monitorId = parseInt(req.params.id);
        const limit = parseInt(req.query.limit as string) || 50;
        const metrics = await dbGetMetricsByMonitorId(monitorId, limit);
        res.json({ success: true, metrics });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/monitors/:id - Remove a monitor
router.delete('/monitors/:id', async (req: Request, res: Response) => {
    try {
        const monitorId = parseInt(req.params.id);
        const deleted = await dbDeleteMonitor(monitorId);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Monitor not found' });
        }
        res.json({ success: true, message: 'Monitor deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/incidents - List incidents
router.get('/incidents', async (req: Request, res: Response) => {
    try {
        const incidents = await dbGetIncidents(50);
        res.json({ success: true, incidents });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/incidents/:id/resolve - Resolve incident
router.post('/incidents/:id/resolve', async (req: Request, res: Response) => {
    try {
        const incidentId = parseInt(req.params.id);
        const resolved = await dbResolveIncident(incidentId);
        if (!resolved) {
            return res.status(404).json({ success: false, error: 'Incident not found' });
        }
        res.json({ success: true, incident: resolved });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;

import { Router } from 'express';
import { listTechnicians } from '../services/sdpClient';
import { mockListTechnicians } from '../services/mockData';
import { loadSettings } from '../services/settingsStore';
import { logger } from '../logger';

export const techniciansRouter = Router();

techniciansRouter.get('/', async (_req, res) => {
  const settings = loadSettings();
  if (!settings.configured) {
    return res.json({ technicians: mockListTechnicians(), mock: true });
  }
  try {
    const technicians = await listTechnicians();
    res.json({ technicians, mock: false });
  } catch (err: any) {
    logger.error('Failed to fetch technicians', { err: err.message });
    res.status(err.status || 500).json({ message: err.message || 'Failed to fetch technicians' });
  }
});

import { Router } from 'express';
import { loadSettings, saveSettings, toPublicSettings } from '../services/settingsStore';
import { testConnection, invalidateTokenCache } from '../services/sdpClient';
import { logger } from '../logger';

export const settingsRouter = Router();

settingsRouter.get('/', (_req, res) => {
  res.json(toPublicSettings(loadSettings()));
});

settingsRouter.put('/', (req, res) => {
  const { dataCenter, portalName, clientId, clientSecret, refreshToken } = req.body || {};
  const update: Record<string, string> = {};
  if (dataCenter) update.dataCenter = dataCenter;
  if (typeof portalName === 'string') update.portalName = portalName.trim();
  if (typeof clientId === 'string') update.clientId = clientId.trim();
  if (typeof clientSecret === 'string' && clientSecret.length > 0) update.clientSecret = clientSecret.trim();
  if (typeof refreshToken === 'string' && refreshToken.length > 0) update.refreshToken = refreshToken.trim();

  const saved = saveSettings(update as any);
  invalidateTokenCache();
  res.json(toPublicSettings(saved));
});

settingsRouter.post('/test-connection', async (_req, res) => {
  try {
    const result = await testConnection();
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err: any) {
    logger.error('Test connection failed', { err: err.message });
    res.status(500).json({ ok: false, message: err.message || 'Unexpected error testing connection.' });
  }
});

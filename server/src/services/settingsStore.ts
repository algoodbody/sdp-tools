import fs from 'fs';
import path from 'path';
import { SdpSettings, PublicSdpSettings } from '../types';
import { logger } from '../logger';

const dataDir = path.join(__dirname, '..', '..', 'data');
const settingsFile = path.join(dataDir, 'settings.json');

const defaults: SdpSettings = {
  dataCenter: 'eu',
  portalName: '',
  clientId: '',
  clientSecret: '',
  refreshToken: '',
  configured: false
};

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function loadSettings(): SdpSettings {
  ensureDataDir();
  if (!fs.existsSync(settingsFile)) {
    return { ...defaults };
  }
  try {
    const raw = fs.readFileSync(settingsFile, 'utf-8');
    return { ...defaults, ...JSON.parse(raw) };
  } catch (err) {
    logger.error('Failed to read settings file, falling back to defaults', { err: String(err) });
    return { ...defaults };
  }
}

export function saveSettings(partial: Partial<SdpSettings>): SdpSettings {
  ensureDataDir();
  const current = loadSettings();
  const next: SdpSettings = { ...current, ...partial };
  next.configured = Boolean(next.clientId && next.clientSecret && next.refreshToken && next.portalName);
  fs.writeFileSync(settingsFile, JSON.stringify(next, null, 2), 'utf-8');
  logger.info('Settings updated', { portalName: next.portalName, dataCenter: next.dataCenter, configured: next.configured });
  return next;
}

export function toPublicSettings(settings: SdpSettings): PublicSdpSettings {
  const { clientSecret, refreshToken, ...rest } = settings;
  return {
    ...rest,
    clientSecretSet: Boolean(clientSecret),
    refreshTokenSet: Boolean(refreshToken)
  };
}

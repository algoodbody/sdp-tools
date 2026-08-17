import { Router } from 'express';
import crypto from 'crypto';
import { loadSettings, saveSettings, toPublicSettings } from '../services/settingsStore';
import {
  testConnection,
  invalidateTokenCache,
  getAccountsHost,
  exchangeAuthorizationCode,
  OAUTH_SCOPE
} from '../services/sdpClient';
import { logger } from '../logger';
import { DataCenter } from '../types';

export const settingsRouter = Router();

// Prefer X-Forwarded-* (set by the Vite dev proxy with xfwd: true) so the redirect URI and
// post-login destination point back at the browser's real origin (e.g. the Vite dev server on
// :5173) instead of the origin Express itself is listening on.
function getPublicOrigin(req: import('express').Request): string {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || req.protocol;
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.get('host');
  return `${proto}://${host}`;
}

function buildRedirectUri(req: import('express').Request): string {
  return `${getPublicOrigin(req)}/api/settings/oauth/callback`;
}

interface PendingOAuthState {
  expiresAt: number;
  clientId: string;
  clientSecret: string;
  dataCenter: DataCenter;
}

// Single-user local app: in-memory pending states are sufficient CSRF protection for the OAuth
// authorization-code round trip (no multi-tenant session store needed). Keyed by state value so
// multiple concurrent Connect attempts (e.g. two tabs) don't clobber each other. Each entry also
// snapshots the exact client/data-center identity that was sent to Zoho's consent screen, so the
// callback exchanges the code with those same credentials (not whatever happens to be saved by
// the time the callback arrives) and can detect if settings changed mid-flow.
const pendingOAuthStates = new Map<string, PendingOAuthState>();
const OAUTH_STATE_TTL_MS = 5 * 60_000;

function prunePendingOAuthStates() {
  const now = Date.now();
  for (const [state, entry] of pendingOAuthStates) {
    if (now > entry.expiresAt) pendingOAuthStates.delete(state);
  }
}

settingsRouter.get('/', (_req, res) => {
  res.json(toPublicSettings(loadSettings()));
});

settingsRouter.put('/', (req, res) => {
  const { dataCenter, portalName, clientId, clientSecret, refreshToken } = req.body || {};
  const current = loadSettings();
  const update: Record<string, string> = {};
  if (dataCenter) update.dataCenter = dataCenter;
  if (typeof portalName === 'string') update.portalName = portalName.trim();
  if (typeof clientId === 'string') update.clientId = clientId.trim();
  if (typeof clientSecret === 'string' && clientSecret.length > 0) update.clientSecret = clientSecret.trim();
  if (typeof refreshToken === 'string' && refreshToken.length > 0) update.refreshToken = refreshToken.trim();

  // A stored refresh token is only valid for the client/data-center pairing it was issued under.
  // If either identity changes without a new token being supplied in the same request, clear the
  // old one instead of silently pairing it with the new identity — otherwise the app can keep
  // reporting "connected" while actually authenticating as the wrong client, and a cancelled or
  // failed reconnect attempt would leave a previously-working connection broken with no signal.
  const identityChanged =
    (update.dataCenter !== undefined && update.dataCenter !== current.dataCenter) ||
    (update.clientId !== undefined && update.clientId !== current.clientId);
  if (identityChanged && !update.refreshToken) {
    update.refreshToken = '';
  }

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

// One-click OAuth connect: authorize -> Zoho consent screen -> callback exchanges the code for
// a refresh token automatically, so the user never has to generate or paste one by hand.

settingsRouter.get('/oauth/redirect-uri', (req, res) => {
  res.json({ redirectUri: buildRedirectUri(req) });
});

settingsRouter.get('/oauth/authorize', (req, res) => {
  const settings = loadSettings();
  if (!settings.clientId || !settings.portalName || !settings.clientSecret) {
    return res
      .status(400)
      .send('Save your data center, portal name, Client ID, and Client secret in Settings before connecting.');
  }

  prunePendingOAuthStates();
  const state = crypto.randomBytes(16).toString('hex');
  pendingOAuthStates.set(state, {
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    dataCenter: settings.dataCenter
  });

  const authUrl = `https://${getAccountsHost(settings.dataCenter)}/oauth/v2/auth?${new URLSearchParams({
    scope: OAUTH_SCOPE,
    client_id: settings.clientId,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    redirect_uri: buildRedirectUri(req),
    state
  }).toString()}`;

  res.redirect(authUrl);
});

settingsRouter.get('/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const appSettingsUrl = `${getPublicOrigin(req)}/settings`;

  if (error) {
    return res.redirect(`${appSettingsUrl}?oauth=error&message=${encodeURIComponent(String(error))}`);
  }

  prunePendingOAuthStates();
  const stateKey = typeof state === 'string' ? state : '';
  const pending = pendingOAuthStates.get(stateKey);
  if (!pending) {
    return res.redirect(
      `${appSettingsUrl}?oauth=error&message=${encodeURIComponent(
        'The connection attempt expired or could not be verified. Please try connecting again.'
      )}`
    );
  }
  pendingOAuthStates.delete(stateKey);

  // Settings may have been edited (in another tab, say) while the user was on Zoho's consent
  // screen. Refuse to persist a token obtained under the identity that was current at the start
  // of this flow if that identity no longer matches what's currently saved — otherwise the new
  // refresh token would silently end up paired with different, unrelated credentials.
  const current = loadSettings();
  if (current.clientId !== pending.clientId || current.dataCenter !== pending.dataCenter) {
    return res.redirect(
      `${appSettingsUrl}?oauth=error&message=${encodeURIComponent(
        'Settings changed while connecting. Please try connecting again.'
      )}`
    );
  }

  try {
    await exchangeAuthorizationCode(String(code), buildRedirectUri(req), {
      clientId: pending.clientId,
      clientSecret: pending.clientSecret,
      dataCenter: pending.dataCenter
    });
    res.redirect(`${appSettingsUrl}?oauth=success`);
  } catch (err: any) {
    logger.error('OAuth callback failed', { err: err.message });
    res.redirect(`${appSettingsUrl}?oauth=error&message=${encodeURIComponent(err.message || 'Failed to connect.')}`);
  }
});

import { FormEvent, useEffect, useState } from 'react';
import {
  apiErrorMessage,
  getOAuthRedirectUri,
  getSettings,
  oauthAuthorizeUrl,
  testConnection,
  updateSettings
} from '../lib/api';
import { DataCenter, PublicSettings } from '../lib/types';

const DATA_CENTERS: { value: DataCenter; label: string }[] = [
  { value: 'com', label: 'United States (.com)' },
  { value: 'eu', label: 'Europe (.eu)' },
  { value: 'in', label: 'India (.in)' },
  { value: 'au', label: 'Australia (.com.au)' },
  { value: 'jp', label: 'Japan (.jp)' },
  { value: 'uk', label: 'United Kingdom (.uk)' },
  { value: 'ca', label: 'Canada (.ca)' },
  { value: 'cn', label: 'China (.com.cn)' }
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [dataCenter, setDataCenter] = useState<DataCenter>('eu');
  const [portalName, setPortalName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function loadSettings() {
    return getSettings().then((s) => {
      setSettings(s);
      setDataCenter(s.dataCenter);
      setPortalName(s.portalName);
      setClientId(s.clientId);
      return s;
    });
  }

  useEffect(() => {
    loadSettings();
    getOAuthRedirectUri()
      .then(setRedirectUri)
      .catch(() => {});

    const params = new URLSearchParams(window.location.search);
    const oauthResult = params.get('oauth');
    if (oauthResult === 'success') {
      setMessage({ type: 'success', text: 'Connected to ServiceDesk Plus.' });
      loadSettings();
    } else if (oauthResult === 'error') {
      setMessage({ type: 'error', text: params.get('message') || 'Failed to connect to ServiceDesk Plus.' });
    }
    if (oauthResult) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveDetails(): Promise<PublicSettings> {
    const saved = await updateSettings({
      dataCenter,
      portalName,
      clientId,
      ...(clientSecret ? { clientSecret } : {}),
      ...(refreshToken ? { refreshToken } : {})
    });
    setSettings(saved);
    setClientSecret('');
    setRefreshToken('');
    return saved;
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await saveDetails();
      setMessage({ type: 'success', text: 'Settings saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: apiErrorMessage(err, 'Failed to save settings') });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setMessage(null);
    try {
      const result = await testConnection();
      setMessage({ type: result.ok ? 'success' : 'error', text: result.message });
    } catch (err) {
      setMessage({ type: 'error', text: apiErrorMessage(err, 'Connection test failed') });
    } finally {
      setTesting(false);
    }
  }

  async function handleConnect() {
    // Always save the current form values first so Connect can never send the browser through
    // authorization with stale credentials from a previous save (e.g. after editing the data
    // center or Client ID without clicking "Save details" first).
    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveDetails();
      if (!saved.clientId || !saved.portalName || !saved.clientSecretSet) {
        setMessage({ type: 'error', text: 'Data center, portal name, Client ID, and Client secret are all required to connect.' });
        return;
      }
      window.location.href = oauthAuthorizeUrl();
    } catch (err) {
      setMessage({ type: 'error', text: apiErrorMessage(err, 'Failed to save settings before connecting') });
    } finally {
      setSaving(false);
    }
  }

  const canConnect = Boolean(settings?.clientId && settings?.portalName && settings?.clientSecretSet);

  return (
    <div className="mx-auto max-w-2xl overflow-y-auto p-6">
      <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
      <p className="mt-1 text-sm text-slate-500">
        Connect this app to your ManageEngine ServiceDesk Plus (Cloud) portal via a Zoho OAuth app. Create a{' '}
        <span className="font-medium">Server-based Application</span> (not a Self Client) at{' '}
        <span className="font-medium">api-console.zoho.{dataCenter === 'com' ? 'com' : dataCenter}</span>, and add
        the redirect URI below to its list of authorized redirect URIs.
      </p>

      <form onSubmit={handleSave} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Data center</label>
          <select
            value={dataCenter}
            onChange={(e) => setDataCenter(e.target.value as DataCenter)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {DATA_CENTERS.map((dc) => (
              <option key={dc.value} value={dc.value}>
                {dc.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Portal name</label>
          <input
            value={portalName}
            onChange={(e) => setPortalName(e.target.value)}
            placeholder="your-portal-name"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Client ID</label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Client secret {settings?.clientSecretSet && <span className="text-xs text-emerald-600">(currently set)</span>}
          </label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={settings?.clientSecretSet ? '••••••••  (leave blank to keep)' : ''}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Redirect URI</label>
          <input
            readOnly
            value={redirectUri}
            onFocus={(e) => e.target.select()}
            className="w-full cursor-text rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600"
          />
          <p className="mt-1 text-xs text-slate-400">
            Add this exact URL to your OAuth app's authorized redirect URIs in the Zoho API console.
          </p>
        </div>

        {message && (
          <div
            className={`rounded-md px-3 py-2 text-sm ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save details'}
          </button>
          <button
            type="button"
            onClick={handleConnect}
            disabled={!canConnect || saving}
            title={canConnect ? undefined : 'Enter your data center, portal name, Client ID, and Client secret first'}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Connect to ServiceDesk Plus…'}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {testing ? 'Testing…' : 'Test connection'}
          </button>
          {settings && (
            <span className={`ml-auto text-xs font-medium ${settings.configured ? 'text-emerald-600' : 'text-slate-400'}`}>
              {settings.configured ? 'Connected' : 'Not yet connected — showing demo data'}
            </span>
          )}
        </div>

        <details className="border-t border-slate-100 pt-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
            Advanced: paste a refresh token manually instead
          </summary>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Refresh token {settings?.refreshTokenSet && <span className="text-xs text-emerald-600">(currently set)</span>}
            </label>
            <input
              type="password"
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              placeholder={settings?.refreshTokenSet ? '••••••••  (leave blank to keep)' : ''}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-400">
              For a Self Client OAuth app where you've generated a refresh token yourself. Click "Save details" after
              pasting it here — the Connect button above isn't needed in that case.
            </p>
          </div>
        </details>
      </form>
    </div>
  );
}

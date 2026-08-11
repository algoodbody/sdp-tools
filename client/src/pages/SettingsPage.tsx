import { FormEvent, useEffect, useState } from 'react';
import { apiErrorMessage, getSettings, testConnection, updateSettings } from '../lib/api';
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
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setDataCenter(s.dataCenter);
      setPortalName(s.portalName);
      setClientId(s.clientId);
    });
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
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

  return (
    <div className="mx-auto max-w-2xl overflow-y-auto p-6">
      <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
      <p className="mt-1 text-sm text-slate-500">
        Connect this app to your ManageEngine ServiceDesk Plus (Cloud) portal using a Zoho self-client OAuth
        app. Create one at{' '}
        <span className="font-medium">api-console.zoho.{dataCenter === 'com' ? 'com' : dataCenter}</span> with
        scope <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">SDPOnDemand.requests.ALL,SDPOnDemand.technicians.READ</code>.
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

        <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save settings'}
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
              {settings.configured ? 'Connection configured' : 'Not yet configured — showing demo data'}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

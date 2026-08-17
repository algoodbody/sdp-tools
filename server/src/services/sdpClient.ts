import axios, { AxiosInstance } from 'axios';
import { loadSettings, saveSettings } from './settingsStore';
import { logger } from '../logger';
import {
  CloseRequestPayload,
  DataCenter,
  RequestsQuery,
  SdpRequest,
  SdpTechnician
} from '../types';

interface DcDomains {
  accounts: string;
  api: string;
}

const DC_DOMAINS: Record<DataCenter, DcDomains> = {
  com: { accounts: 'accounts.zoho.com', api: 'sdpondemand.manageengine.com' },
  eu: { accounts: 'accounts.zoho.eu', api: 'sdpondemand.manageengine.eu' },
  in: { accounts: 'accounts.zoho.in', api: 'sdpondemand.manageengine.in' },
  au: { accounts: 'accounts.zoho.com.au', api: 'sdpondemand.manageengine.com.au' },
  jp: { accounts: 'accounts.zoho.jp', api: 'sdpondemand.manageengine.jp' },
  uk: { accounts: 'accounts.zoho.uk', api: 'sdpondemand.manageengine.uk' },
  ca: { accounts: 'accounts.zohocloud.ca', api: 'sdpondemand.manageengine.ca' },
  cn: { accounts: 'accounts.zoho.com.cn', api: 'sdpondemand.manageengine.cn' }
};

export function getAccountsHost(dc: DataCenter): string {
  return DC_DOMAINS[dc].accounts;
}

class SdpAuthError extends Error {}
export class SdpApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const settings = loadSettings();
  if (!settings.configured) {
    throw new SdpAuthError('ServiceDesk Plus connection is not configured. Please set it up in Settings.');
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const dc = DC_DOMAINS[settings.dataCenter];
  const url = `https://${dc.accounts}/oauth/v2/token`;
  try {
    const res = await axios.post(
      url,
      null,
      {
        params: {
          refresh_token: settings.refreshToken,
          client_id: settings.clientId,
          client_secret: settings.clientSecret,
          grant_type: 'refresh_token'
        }
      }
    );
    const { access_token, expires_in } = res.data;
    if (!access_token) {
      throw new SdpAuthError('Did not receive an access token from Zoho OAuth. Check your credentials.');
    }
    cachedToken = { token: access_token, expiresAt: Date.now() + (expires_in || 3600) * 1000 };
    logger.info('Refreshed SDP OAuth access token');
    return access_token;
  } catch (err: any) {
    logger.error('Failed to refresh SDP OAuth access token', { err: err?.response?.data || String(err) });
    throw new SdpAuthError('Failed to authenticate with ServiceDesk Plus. Check your Settings credentials.');
  }
}

async function client(): Promise<AxiosInstance> {
  const settings = loadSettings();
  const token = await getAccessToken();
  const dc = DC_DOMAINS[settings.dataCenter];
  return axios.create({
    baseURL: `https://${dc.api}/app/${encodeURIComponent(settings.portalName)}/api/v3`,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      Accept: 'application/vnd.manageengine.sdp.v3+json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 20_000
  });
}

function handleAxiosError(err: any, action: string): never {
  const status = err?.response?.status || 500;
  const message =
    err?.response?.data?.response_status?.messages?.[0]?.message ||
    err?.response?.data?.message ||
    err.message ||
    `Failed to ${action}`;
  logger.error(`SDP API error while trying to ${action}`, { status, message, data: err?.response?.data });
  throw new SdpApiError(message, status);
}

function mapRequest(raw: any): SdpRequest {
  return {
    id: String(raw.id),
    subject: raw.subject || '',
    status: raw.status?.name || 'Unknown',
    priority: raw.priority?.name,
    requester: raw.requester?.name,
    technician: raw.technician?.name,
    technicianId: raw.technician?.id ? String(raw.technician.id) : undefined,
    createdTime: raw.created_time?.display_value,
    dueByTime: raw.due_by_time?.display_value,
    category: raw.category?.name,
    subcategory: raw.subcategory?.name,
    item: raw.item?.name,
    group: raw.group?.name,
    requestType: raw.request_type?.name,
    isOverdue: Boolean(raw.is_overdue)
  };
}

export async function listTechnicians(): Promise<SdpTechnician[]> {
  const c = await client();
  const technicians: SdpTechnician[] = [];
  let startIndex = 1;
  const rowCount = 100;
  try {
    // Paginate through all technicians so the filter dropdown is complete.
    for (let i = 0; i < 20; i++) {
      const input_data = JSON.stringify({
        list_info: { row_count: rowCount, start_index: startIndex, get_total_count: true }
      });
      const res = await c.get('/technicians', { params: { input_data } });
      const rows = res.data.technicians || [];
      for (const t of rows) {
        technicians.push({ id: String(t.id), name: t.name, email: t.email_id });
      }
      const hasMore = res.data.list_info?.has_more_rows;
      if (!hasMore || rows.length === 0) break;
      startIndex += rowCount;
    }
    technicians.sort((a, b) => a.name.localeCompare(b.name));
    return technicians;
  } catch (err) {
    handleAxiosError(err, 'load technicians');
  }
}

export async function listRequests(query: RequestsQuery): Promise<{ requests: SdpRequest[]; totalCount: number }> {
  const c = await client();
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 50;

  const searchCriteria: any[] = [];
  if (query.technicianId) {
    searchCriteria.push({ field: 'technician.id', condition: 'is', value: query.technicianId });
  }
  if (query.status) {
    searchCriteria.push({ field: 'status.name', condition: 'is', value: query.status });
  }
  if (query.search) {
    searchCriteria.push({ field: 'subject', condition: 'contains', value: query.search });
  }

  const list_info: any = {
    row_count: pageSize,
    start_index: (page - 1) * pageSize + 1,
    get_total_count: true
  };
  if (query.sortField) {
    list_info.sort_field = query.sortField;
    list_info.sort_order = query.sortOrder === 'desc' ? 'desc' : 'asc';
  }
  if (searchCriteria.length === 1) {
    list_info.search_criteria = searchCriteria[0];
  } else if (searchCriteria.length > 1) {
    list_info.search_criteria = searchCriteria.map((c, idx) => ({
      ...c,
      logical_operator: idx === 0 ? undefined : 'AND'
    }));
  }

  try {
    const input_data = JSON.stringify({ list_info });
    const res = await c.get('/requests', { params: { input_data } });
    const rows = (res.data.requests || []).map(mapRequest);
    const totalCount = res.data.list_info?.total_count ?? rows.length;
    return { requests: rows, totalCount };
  } catch (err) {
    handleAxiosError(err, 'load requests');
  }
}

export async function closeRequest(id: string, payload: CloseRequestPayload): Promise<void> {
  const c = await client();
  const request: any = {
    closure_info: {
      closure_comments: payload.resolution,
      closure_code: { name: payload.closureCode || 'Success' }
    },
    resolution: {
      content: payload.resolution
    }
  };
  if (payload.category) request.category = { name: payload.category };
  if (payload.subcategory) request.subcategory = { name: payload.subcategory };
  if (payload.item) request.item = { name: payload.item };

  try {
    const input_data = JSON.stringify({ request });
    await c.put(`/requests/${encodeURIComponent(id)}/close`, new URLSearchParams({ input_data }).toString());
    logger.info('Closed request', { id });
  } catch (err) {
    handleAxiosError(err, `close request ${id}`);
  }
}

export async function bulkCloseRequests(
  ids: string[],
  payload: CloseRequestPayload
): Promise<{ id: string; success: boolean; error?: string }[]> {
  const results: { id: string; success: boolean; error?: string }[] = [];
  for (const id of ids) {
    try {
      await closeRequest(id, payload);
      results.push({ id, success: true });
    } catch (err: any) {
      results.push({ id, success: false, error: err.message || 'Unknown error' });
    }
  }
  return results;
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    cachedToken = null;
    await getAccessToken();
    const c = await client();
    await c.get('/requests', {
      params: { input_data: JSON.stringify({ list_info: { row_count: 1, start_index: 1 } }) }
    });
    return { ok: true, message: 'Connected to ServiceDesk Plus successfully.' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Connection failed.' };
  }
}

export const OAUTH_SCOPE = 'SDPOnDemand.requests.ALL,SDPOnDemand.technicians.READ';

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  dataCenter: DataCenter;
}

// Takes the client/data-center identity explicitly (snapshotted by the caller at the moment the
// authorization redirect was issued) rather than reloading current settings, so a change made to
// settings while the user is on Zoho's consent screen can't cause the code to be exchanged under
// a different identity than the one Zoho actually granted it for.
export async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string,
  credentials: OAuthCredentials
): Promise<void> {
  const { clientId, clientSecret, dataCenter } = credentials;
  const dc = DC_DOMAINS[dataCenter];
  try {
    const res = await axios.post(`https://${dc.accounts}/oauth/v2/token`, null, {
      params: {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      }
    });
    const { refresh_token, access_token, expires_in } = res.data;
    if (!refresh_token) {
      throw new SdpApiError(
        res.data?.error ||
          'Zoho did not return a refresh token. Make sure the OAuth client is a "Server-based Application" (not a Self Client), and that you have not already authorized this app without revoking prior access first (Zoho only issues a refresh token on first-time consent).',
        400
      );
    }
    saveSettings({ refreshToken: refresh_token });
    if (access_token) {
      cachedToken = { token: access_token, expiresAt: Date.now() + (expires_in || 3600) * 1000 };
    }
    logger.info('Connected to ServiceDesk Plus via OAuth authorization flow');
  } catch (err: any) {
    if (err instanceof SdpApiError) throw err;
    const message = err?.response?.data?.error_description || err?.response?.data?.error || err.message;
    logger.error('OAuth authorization code exchange failed', { err: err?.response?.data || String(err) });
    throw new SdpApiError(message || 'Failed to exchange authorization code for a refresh token.', 400);
  }
}

export function buildTicketUrl(id: string): string {
  const settings = loadSettings();
  const dc = DC_DOMAINS[settings.dataCenter];
  return `https://${dc.api}/app/${encodeURIComponent(settings.portalName)}/ui/requests/${encodeURIComponent(id)}`;
}

export function invalidateTokenCache(): void {
  cachedToken = null;
}

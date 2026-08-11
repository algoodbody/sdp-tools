import axios from 'axios';
import {
  CloseTicketPayload,
  PublicSettings,
  RequestsResponse,
  SdpTechnician
} from './types';

const api = axios.create({ baseURL: '/api' });

export interface RequestsFilters {
  page: number;
  pageSize: number;
  technicianId?: string;
  status?: string;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function fetchRequests(filters: RequestsFilters): Promise<RequestsResponse> {
  const { data } = await api.get<RequestsResponse>('/requests', { params: filters });
  return data;
}

export async function fetchTechnicians(): Promise<{ technicians: SdpTechnician[]; mock: boolean }> {
  const { data } = await api.get('/technicians');
  return data;
}

export async function fetchTicketUrl(id: string): Promise<string> {
  const { data } = await api.get(`/requests/${id}/url`);
  return data.url;
}

export async function closeTicket(id: string, payload: CloseTicketPayload): Promise<void> {
  await api.post(`/requests/${id}/close`, payload);
}

export async function bulkCloseTickets(
  ids: string[],
  payload: CloseTicketPayload
): Promise<{ succeeded: number; failed: number; results: { id: string; success: boolean; error?: string }[] }> {
  const { data } = await api.post('/requests/bulk-close', { ids, ...payload });
  return data;
}

export async function getSettings(): Promise<PublicSettings> {
  const { data } = await api.get('/settings');
  return data;
}

export async function updateSettings(payload: Partial<{
  dataCenter: string;
  portalName: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}>): Promise<PublicSettings> {
  const { data } = await api.put('/settings', payload);
  return data;
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  const { data } = await api.post('/settings/test-connection');
  return data;
}

export async function fetchLogs(lines = 500): Promise<string[]> {
  const { data } = await api.get('/logs', { params: { lines } });
  return data.lines;
}

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || err.message || fallback;
  }
  return fallback;
}

import { SdpRequest, SdpTechnician } from '../types';

const TECHNICIANS: SdpTechnician[] = [
  { id: 't1', name: 'Alice Byrne', email: 'alice.byrne@example.com' },
  { id: 't2', name: 'Conor Doyle', email: 'conor.doyle@example.com' },
  { id: 't3', name: 'Emma Walsh', email: 'emma.walsh@example.com' },
  { id: 't4', name: 'Liam Kelly', email: 'liam.kelly@example.com' },
  { id: 't5', name: 'Sinead Murphy', email: 'sinead.murphy@example.com' }
];

const STATUSES = ['Open', 'In Progress', 'On Hold', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const CATEGORIES = ['Hardware', 'Software', 'Network', 'Access Management'];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

const MOCK_REQUESTS: SdpRequest[] = Array.from({ length: 138 }).map((_, i) => {
  const tech = pick(TECHNICIANS, i);
  const status = pick(STATUSES, i + 1);
  const created = new Date(Date.now() - i * 3600_000 * 7);
  return {
    id: String(100000 + i),
    subject: `Sample request #${100000 + i} - ${pick(['Laptop issue', 'VPN access', 'Password reset', 'New starter setup', 'Printer not working'], i)}`,
    status,
    priority: pick(PRIORITIES, i + 2),
    requester: `User ${i % 40}`,
    technician: tech.name,
    technicianId: tech.id,
    createdTime: created.toISOString(),
    dueByTime: new Date(created.getTime() + 3600_000 * 48).toISOString(),
    category: pick(CATEGORIES, i),
    subcategory: 'General',
    item: 'Standard',
    group: 'IT Support',
    requestType: 'Incident',
    isOverdue: i % 11 === 0
  };
});

export function mockListTechnicians(): SdpTechnician[] {
  return TECHNICIANS;
}

export function mockListRequests(params: {
  page: number;
  pageSize: number;
  technicianId?: string;
  status?: string;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}): { requests: SdpRequest[]; totalCount: number } {
  let rows = [...MOCK_REQUESTS];
  if (params.technicianId) {
    rows = rows.filter((r) => r.technicianId === params.technicianId);
  }
  if (params.status) {
    rows = rows.filter((r) => r.status === params.status);
  }
  if (params.search) {
    const s = params.search.toLowerCase();
    rows = rows.filter((r) => r.subject.toLowerCase().includes(s) || r.id.includes(s));
  }
  if (params.sortField) {
    const field = params.sortField as keyof SdpRequest;
    rows.sort((a, b) => {
      const av = String(a[field] ?? '');
      const bv = String(b[field] ?? '');
      return params.sortOrder === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
    });
  }
  const totalCount = rows.length;
  const start = (params.page - 1) * params.pageSize;
  const paged = rows.slice(start, start + params.pageSize);
  return { requests: paged, totalCount };
}

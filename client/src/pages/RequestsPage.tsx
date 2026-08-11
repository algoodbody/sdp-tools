import { useEffect, useState } from 'react';
import { RowSelectionState } from '@tanstack/react-table';
import {
  apiErrorMessage,
  bulkCloseTickets,
  closeTicket,
  fetchRequests,
  fetchTechnicians,
  fetchTicketUrl
} from '../lib/api';
import { CloseTicketPayload, SdpRequest, SdpTechnician } from '../lib/types';
import TechnicianFilter from '../components/TechnicianFilter';
import RequestsTable from '../components/RequestsTable';
import BulkActionsBar from '../components/BulkActionsBar';
import CloseTicketModal from '../components/CloseTicketModal';

const STATUSES = ['Open', 'In Progress', 'On Hold', 'Resolved', 'Closed'];

export default function RequestsPage() {
  const [requests, setRequests] = useState<SdpRequest[]>([]);
  const [technicians, setTechnicians] = useState<SdpTechnician[]>([]);
  const [technicianId, setTechnicianId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const [closeTarget, setCloseTarget] = useState<{ ids: string[]; label?: string } | null>(null);

  useEffect(() => {
    fetchTechnicians()
      .then((res) => setTechnicians(res.technicians))
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load technicians')));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchRequests({ page: 1, pageSize: 1000, technicianId, status })
      .then((res) => {
        setRequests(res.requests);
        setMock(res.mock);
        setRowSelection({});
      })
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load requests')))
      .finally(() => setLoading(false));
  }, [technicianId, status]);

  async function refresh() {
    const res = await fetchRequests({ page: 1, pageSize: 1000, technicianId, status });
    setRequests(res.requests);
    setMock(res.mock);
  }

  async function handleOpenTicket(id: string) {
    try {
      const url = await fetchTicketUrl(id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to open ticket'));
    }
  }

  async function handleModalSubmit(payload: CloseTicketPayload) {
    if (!closeTarget) return;
    if (closeTarget.ids.length === 1) {
      await closeTicket(closeTarget.ids[0], payload);
    } else {
      const result = await bulkCloseTickets(closeTarget.ids, payload);
      if (result.failed > 0) {
        throw new Error(`${result.failed} of ${closeTarget.ids.length} requests failed to close.`);
      }
    }
    setCloseTarget(null);
    setRowSelection({});
    await refresh();
  }

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Requests</h2>
          <p className="text-sm text-slate-500">
            {loading ? 'Loading…' : `${requests.length} request${requests.length === 1 ? '' : 's'} loaded`}
            {mock && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Demo data — configure your connection in Settings
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={status ?? ''}
            onChange={(e) => setStatus(e.target.value || undefined)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <TechnicianFilter technicians={technicians} value={technicianId} onChange={setTechnicianId} />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <BulkActionsBar
        count={selectedIds.length}
        onBulkClose={() => setCloseTarget({ ids: selectedIds })}
        onClearSelection={() => setRowSelection({})}
      />

      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-400">Loading requests…</div>
        ) : (
          <RequestsTable
            data={requests}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            onOpenTicket={handleOpenTicket}
            onCloseTicket={(id, subject) => setCloseTarget({ ids: [id], label: subject })}
          />
        )}
      </div>

      {closeTarget && (
        <CloseTicketModal
          requestIds={closeTarget.ids}
          requestLabel={closeTarget.label}
          onClose={() => setCloseTarget(null)}
          onSubmit={handleModalSubmit}
        />
      )}
    </div>
  );
}

import { useMemo, useRef, useState } from 'react';
import { SdpTechnician } from '../lib/types';

interface Props {
  technicians: SdpTechnician[];
  value?: string;
  onChange: (technicianId: string | undefined) => void;
}

export default function TechnicianFilter({ technicians, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = technicians.find((t) => t.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return technicians;
    return technicians.filter(
      (t) => t.name.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q)
    );
  }, [technicians, query]);

  return (
    <div className="relative w-64" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-left shadow-sm hover:border-slate-400"
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected ? selected.name : 'Filter by technician…'}
        </span>
        <span className="ml-2 text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search technicians…"
              className="w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <ul className="max-h-64 overflow-auto py-1 text-sm">
            <li>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left text-slate-500 hover:bg-slate-50"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                  setQuery('');
                }}
              >
                All technicians
              </button>
            </li>
            {filtered.length === 0 && (
              <li className="px-3 py-1.5 text-slate-400">No technicians found</li>
            )}
            {filtered.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`w-full truncate px-3 py-1.5 text-left hover:bg-brand-50 ${
                    t.id === value ? 'bg-brand-50 font-medium text-brand-700' : ''
                  }`}
                  onClick={() => {
                    onChange(t.id);
                    setOpen(false);
                    setQuery('');
                  }}
                  title={t.email}
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}

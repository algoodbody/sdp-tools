import { useRef, useState } from 'react';
import { Table } from '@tanstack/react-table';
import { SdpRequest } from '../lib/types';

export default function ColumnChooser({ table }: { table: Table<SdpRequest> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const columns = table.getAllLeafColumns().filter((c) => c.getCanHide());

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-400"
      >
        Columns
        <span className="text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          <div className="mb-1 flex items-center justify-between px-1 text-xs font-semibold uppercase text-slate-400">
            <span>Show columns</span>
            <button
              type="button"
              className="text-brand-600 hover:underline"
              onClick={() => table.toggleAllColumnsVisible(true)}
            >
              Reset
            </button>
          </div>
          <ul className="max-h-72 overflow-auto">
            {columns.map((col) => (
              <li key={col.id}>
                <label className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={col.getToggleVisibilityHandler()}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="capitalize">{typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
    </div>
  );
}

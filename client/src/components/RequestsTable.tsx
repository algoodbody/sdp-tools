import { useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
  VisibilityState
} from '@tanstack/react-table';
import { SdpRequest } from '../lib/types';
import ColumnChooser from './ColumnChooser';

interface Props {
  data: SdpRequest[];
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (value: RowSelectionState) => void;
  onOpenTicket: (id: string) => void;
  onCloseTicket: (id: string, subject: string) => void;
}

const statusColors: Record<string, string> = {
  Open: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  'On Hold': 'bg-purple-100 text-purple-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-slate-200 text-slate-600'
};

export default function RequestsTable({
  data,
  globalFilter,
  onGlobalFilterChange,
  rowSelection,
  onRowSelectionChange,
  onOpenTicket,
  onCloseTicket
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const columns = useMemo<ColumnDef<SdpRequest>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected();
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 32
      },
      {
        accessorKey: 'id',
        header: 'Request ID',
        cell: ({ getValue }) => (
          <button
            type="button"
            onClick={() => onOpenTicket(getValue<string>())}
            className="font-medium text-brand-600 hover:underline"
          >
            #{getValue<string>()}
          </button>
        )
      },
      { accessorKey: 'subject', header: 'Subject', cell: (c) => <span className="line-clamp-1">{c.getValue<string>()}</span> },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const val = getValue<string>();
          return (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[val] || 'bg-slate-100 text-slate-600'}`}>
              {val}
            </span>
          );
        }
      },
      { accessorKey: 'priority', header: 'Priority' },
      { accessorKey: 'requester', header: 'Requester' },
      { accessorKey: 'technician', header: 'Technician' },
      { accessorKey: 'group', header: 'Group' },
      { accessorKey: 'requestType', header: 'Type' },
      { accessorKey: 'category', header: 'Category' },
      { accessorKey: 'subcategory', header: 'Sub-category' },
      { accessorKey: 'item', header: 'Item' },
      {
        accessorKey: 'createdTime',
        header: 'Created',
        cell: ({ getValue }) => formatDate(getValue<string>())
      },
      {
        accessorKey: 'dueByTime',
        header: 'Due by',
        cell: ({ row, getValue }) => (
          <span className={row.original.isOverdue ? 'font-medium text-red-600' : ''}>{formatDate(getValue<string>())}</span>
        )
      },
      {
        id: 'actions',
        header: 'Actions',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status !== 'Closed' ? (
            <button
              type="button"
              onClick={() => onCloseTicket(row.original.id, row.original.subject)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              Close
            </button>
          ) : null
      }
    ],
    [onOpenTicket, onCloseTicket]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(rowSelection) : updater;
      onRowSelectionChange(next);
    },
    onGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    initialState: { pagination: { pageSize: 25 } }
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 pb-3">
        <input
          value={globalFilter}
          onChange={(e) => onGlobalFilterChange(e.target.value)}
          placeholder="Search requests…"
          className="w-72 rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <ColumnChooser table={table} />
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="sticky top-0 bg-slate-50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={header.column.getCanSort() ? 'flex cursor-pointer select-none items-center gap-1' : ''}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: '▲', desc: '▼' }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={row.getIsSelected() ? 'bg-brand-50/60' : 'hover:bg-slate-50'}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">
                  No requests match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-3 text-sm text-slate-600">
        <div>
          Showing{' '}
          {table.getRowModel().rows.length === 0
            ? 0
            : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
          {'–'}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </span>
          <button
            type="button"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

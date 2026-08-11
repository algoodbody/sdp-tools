interface Props {
  count: number;
  onBulkClose: () => void;
  onClearSelection: () => void;
}

export default function BulkActionsBar({ count, onBulkClose, onClearSelection }: Props) {
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-between rounded-md border border-brand-200 bg-brand-50 px-4 py-2">
      <div className="text-sm text-brand-800">
        <span className="font-semibold">{count}</span> request{count === 1 ? '' : 's'} selected
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClearSelection}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
        >
          Clear selection
        </button>
        <button
          type="button"
          onClick={onBulkClose}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Bulk close…
        </button>
      </div>
    </div>
  );
}

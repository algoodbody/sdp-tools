import { FormEvent, useState } from 'react';
import { CloseTicketPayload } from '../lib/types';

interface Props {
  requestIds: string[];
  requestLabel?: string;
  onClose: () => void;
  onSubmit: (payload: CloseTicketPayload) => Promise<void>;
}

const CLOSURE_CODES = ['Success', 'Cancelled', 'Failed', 'Unable to Reproduce'];

export default function CloseTicketModal({ requestIds, requestLabel, onClose, onSubmit }: Props) {
  const [resolution, setResolution] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [item, setItem] = useState('');
  const [closureCode, setClosureCode] = useState(CLOSURE_CODES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBulk = requestIds.length > 1;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!resolution.trim()) {
      setError('Resolution is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        resolution: resolution.trim(),
        category: category.trim() || undefined,
        subcategory: subcategory.trim() || undefined,
        item: item.trim() || undefined,
        closureCode
      });
    } catch (err: any) {
      setError(err.message || 'Failed to close ticket(s).');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              {isBulk ? `Bulk close ${requestIds.length} requests` : `Close request #${requestLabel || requestIds[0]}`}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {isBulk
                ? 'These details will be applied to every selected request.'
                : 'Enter the details required to close this request.'}
            </p>
          </div>

          <div className="max-h-[65vh] space-y-4 overflow-y-auto px-5 py-4">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Resolution *</label>
              <textarea
                required
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="Describe how this request was resolved…"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="e.g. Hardware"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Sub-category</label>
                <input
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="e.g. Laptop"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Item</label>
                <input
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="e.g. Dell Latitude"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Closure code</label>
              <select
                value={closureCode}
                onChange={(e) => setClosureCode(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                {CLOSURE_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Closing…' : isBulk ? `Close ${requestIds.length} requests` : 'Close request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

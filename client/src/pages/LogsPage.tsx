import { useEffect, useRef, useState } from 'react';
import { fetchLogs } from '../lib/api';

export default function LogsPage() {
  const [lines, setLines] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const l = await fetchLogs(1000);
      setLines(l);
    } catch {
      // ignore transient errors while polling
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [lines]);

  function levelColor(line: string) {
    if (line.includes('[ERROR]')) return 'text-red-400';
    if (line.includes('[WARN]')) return 'text-amber-400';
    return 'text-slate-300';
  }

  return (
    <div className="flex h-full flex-col gap-3 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Logs</h2>
          <p className="text-sm text-slate-500">Recent server activity, including ServiceDesk Plus API calls and errors.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresh
          </label>
          <button
            type="button"
            onClick={load}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh now
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-slate-900 p-4 font-mono text-xs shadow-inner">
        {lines.length === 0 ? (
          <div className="text-slate-500">No log entries yet.</div>
        ) : (
          lines.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap ${levelColor(line)}`}>
              {line}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

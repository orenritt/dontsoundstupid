"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";

export function useAdminData<T>(source: string, params?: Record<string, string>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const paramsKey = JSON.stringify(params);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const parsedParams = JSON.parse(paramsKey) as Record<string, string> | undefined;
      const searchParams = new URLSearchParams({ source, ...parsedParams });
      const res = await fetch(`/api/admin/data-explorer?${searchParams}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [source, paramsKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-white/40 mt-1">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1">{String(value)}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  onRowClick,
  emptyMessage,
}: {
  columns: { key: string; label: string; render?: (val: unknown, row: Record<string, unknown>) => ReactNode }[];
  rows: Record<string, unknown>[];
  onRowClick?: (row: Record<string, unknown>) => void;
  emptyMessage?: string;
}) {
  if (!rows || rows.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-white/30 text-sm">
        {emptyMessage || "No data found"}
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-white/40 font-medium whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-white/5 ${
                  onRowClick
                    ? "cursor-pointer hover:bg-white/5 transition-colors"
                    : ""
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-white/70 whitespace-nowrap max-w-xs truncate">
                    {col.render
                      ? col.render(row[col.key], row)
                      : renderValue(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderValue(val: unknown): ReactNode {
  if (val === null || val === undefined) return <span className="text-white/20">null</span>;
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "object") return JSON.stringify(val).slice(0, 100);
  return String(val);
}

export function JsonViewer({ data, label }: { data: unknown; label?: string }) {
  const [expanded, setExpanded] = useState(false);

  if (data === null || data === undefined) return null;

  const json = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const preview = json.slice(0, 200);
  const isLong = json.length > 200;

  return (
    <div className="mt-2">
      {label && (
        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">
          {label}
        </p>
      )}
      <pre className="bg-black/30 border border-white/10 rounded-lg p-3 text-xs text-white/60 overflow-x-auto whitespace-pre-wrap break-words">
        {expanded ? json : preview}
        {isLong && !expanded && "..."}
      </pre>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-400 mt-1 hover:underline"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      )}
    </div>
  );
}

export function Badge({
  children,
  color = "gray",
}: {
  children: ReactNode;
  color?: "gray" | "green" | "red" | "yellow" | "blue" | "purple";
}) {
  const colors = {
    gray: "bg-white/10 text-white/60",
    green: "bg-green-500/20 text-green-400",
    red: "bg-red-500/20 text-red-400",
    yellow: "bg-yellow-500/20 text-yellow-400",
    blue: "bg-blue-500/20 text-blue-400",
    purple: "bg-purple-500/20 text-purple-400",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${colors[color]}`}
    >
      {children}
    </span>
  );
}

export function Pagination({
  offset,
  limit,
  total,
  onChange,
}: {
  offset: number;
  limit: number;
  total: number;
  onChange: (newOffset: number) => void;
}) {
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-white/50">
      <span>
        Page {page} of {totalPages} ({total} total)
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onChange(offset + limit)}
          disabled={offset + limit >= total}
          className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function formatDate(val: unknown): string {
  if (!val) return "-";
  try {
    return new Date(String(val)).toLocaleString();
  } catch {
    return String(val);
  }
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-pulse text-white/30">Loading data...</div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
      <p className="text-red-400 text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-sm text-white/50 hover:text-white underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function FilterBar({
  filters,
  value,
  onChange,
}: {
  filters: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            value === f.value
              ? "bg-white/15 text-white"
              : "bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

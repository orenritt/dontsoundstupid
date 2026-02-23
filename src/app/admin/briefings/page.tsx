"use client";

import { useState } from "react";
import {
  useAdminData,
  PageHeader,
  Badge,
  Pagination,
  LoadingState,
  ErrorState,
  formatDate,
} from "../components";

interface BriefingRow {
  id: string;
  user_id: string;
  items: { id: string; reason: string; reasonLabel: string; topic: string; content: string; sourceUrl: string | null; sourceLabel: string | null; attribution: string | null }[];
  model_used: string;
  prompt_tokens: number;
  completion_tokens: number;
  generated_at: string;
  email: string;
  user_name: string;
}

export default function BriefingsPage() {
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 20;

  const { data, loading, error, refetch } = useAdminData<{ rows: BriefingRow[] }>(
    "briefings",
    { limit: String(limit), offset: String(offset) }
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const rows = data?.rows ?? [];

  return (
    <>
      <PageHeader
        title="Briefings"
        description="Generated intelligence briefings with items and token usage"
      />

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-white/30 text-sm">
            No briefings found
          </div>
        ) : (
          rows.map((b) => {
            const items = Array.isArray(b.items) ? b.items : [];
            return (
              <div
                key={b.id}
                className="bg-white/5 border border-white/10 rounded-xl p-5 cursor-pointer hover:bg-white/8 transition-colors"
                onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-semibold">
                      {formatDate(b.generated_at)}
                    </span>
                    <Badge color="blue">{items.length} items</Badge>
                    <Badge>{b.model_used}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span>{b.email || b.user_name}</span>
                    <span>
                      {b.prompt_tokens + b.completion_tokens} tokens
                    </span>
                  </div>
                </div>

                {!expandedId || expandedId !== b.id ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {items.slice(0, 3).map((item) => (
                      <span key={item.id} className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
                        {item.topic?.slice(0, 40) || item.content?.slice(0, 40)}
                      </span>
                    ))}
                    {items.length > 3 && (
                      <span className="text-xs text-white/30">+{items.length - 3} more</span>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                    <div className="grid grid-cols-3 gap-4 text-xs text-white/40 mb-4">
                      <div>Prompt tokens: {b.prompt_tokens}</div>
                      <div>Completion tokens: {b.completion_tokens}</div>
                      <div className="font-mono text-white/30">{b.id}</div>
                    </div>
                    {items.map((item, idx) => (
                      <div key={item.id} className="bg-black/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white/30 text-xs font-mono">#{idx + 1}</span>
                          <Badge color="purple">{item.reasonLabel}</Badge>
                          {item.sourceLabel && <Badge>{item.sourceLabel}</Badge>}
                        </div>
                        <p className="text-sm text-white/80 mt-1">{item.content}</p>
                        {item.attribution && (
                          <p className="text-xs text-white/30 mt-1 italic">{item.attribution}</p>
                        )}
                        {item.sourceUrl && (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline mt-1 inline-block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.sourceUrl.slice(0, 60)}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Pagination offset={offset} limit={limit} total={rows.length >= limit ? (offset + limit + 1) : (offset + rows.length)} onChange={setOffset} />
    </>
  );
}

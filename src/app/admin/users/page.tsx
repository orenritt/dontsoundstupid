"use client";

import { useState } from "react";
import {
  useAdminData,
  PageHeader,
  Badge,
  JsonViewer,
  LoadingState,
  ErrorState,
  formatDate,
} from "../components";

interface UserRow {
  id: string;
  email: string;
  name: string;
  title: string;
  company: string;
  linkedin_url: string;
  onboarding_status: string;
  created_at: string;
  parsed_initiatives: string[] | null;
  parsed_concerns: string[] | null;
  parsed_topics: string[] | null;
  parsed_knowledge_gaps: string[] | null;
  parsed_expert_areas: string[] | null;
  parsed_weak_areas: string[] | null;
  rapid_fire_classifications: unknown;
  delivery_channel: string;
  delivery_time: string;
  delivery_timezone: string;
  conversation_input_method: string;
  transcript_preview: string;
}

const STATUS_COLORS: Record<string, "green" | "yellow" | "gray"> = {
  completed: "green",
  in_progress: "yellow",
  not_started: "gray",
};

export default function UsersPage() {
  const { data, loading, error, refetch } = useAdminData<{ rows: UserRow[] }>("users");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const rows = data?.rows ?? [];

  return (
    <>
      <PageHeader
        title="Users & Profiles"
        description="All user accounts with parsed profile data and delivery preferences"
      />

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center text-white/30 text-sm">
            No users found
          </div>
        ) : (
          rows.map((u) => (
            <div
              key={u.id}
              className="bg-white/5 border border-white/10 rounded-xl p-5 cursor-pointer hover:bg-white/8 transition-colors"
              onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-white font-semibold">{u.name || u.email}</span>
                  <Badge color={STATUS_COLORS[u.onboarding_status] || "gray"}>
                    {u.onboarding_status}
                  </Badge>
                  {u.delivery_channel && <Badge color="blue">{u.delivery_channel}</Badge>}
                </div>
                <span className="text-xs text-white/30">{formatDate(u.created_at)}</span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
                <span>{u.email}</span>
                {u.title && <span>{u.title}</span>}
                {u.company && <span>at {u.company}</span>}
              </div>

              {expandedId === u.id && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-white/30">User ID:</span>{" "}
                      <span className="text-white/50 font-mono">{u.id}</span>
                    </div>
                    {u.linkedin_url && (
                      <div>
                        <span className="text-white/30">LinkedIn:</span>{" "}
                        <a href={u.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {u.linkedin_url}
                        </a>
                      </div>
                    )}
                    {u.delivery_time && (
                      <div>
                        <span className="text-white/30">Delivery:</span>{" "}
                        <span className="text-white/50">{u.delivery_time} {u.delivery_timezone}</span>
                      </div>
                    )}
                    {u.conversation_input_method && (
                      <div>
                        <span className="text-white/30">Input Method:</span>{" "}
                        <span className="text-white/50">{u.conversation_input_method}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <JsonViewer data={u.parsed_topics} label="Topics" />
                    <JsonViewer data={u.parsed_initiatives} label="Initiatives" />
                    <JsonViewer data={u.parsed_concerns} label="Concerns" />
                    <JsonViewer data={u.parsed_knowledge_gaps} label="Knowledge Gaps" />
                    <JsonViewer data={u.parsed_expert_areas} label="Expert Areas" />
                    <JsonViewer data={u.parsed_weak_areas} label="Weak Areas" />
                  </div>

                  {u.rapid_fire_classifications ? (
                    <JsonViewer data={u.rapid_fire_classifications} label="Rapid Fire Classifications" />
                  ) : null}

                  {u.transcript_preview && (
                    <JsonViewer data={u.transcript_preview} label="Conversation Transcript (Preview)" />
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}

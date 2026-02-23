"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RapidFireClassification {
  topic: string;
  context: string;
  response: string;
}

interface ProfileData {
  name: string;
  title: string;
  company: string;
  linkedinUrl: string;
  transcript: string;
  topics: string[];
  initiatives: string[];
  concerns: string[];
  knowledgeGaps: string[];
  expertAreas: string[];
  weakAreas: string[];
  rapidFireClassifications: RapidFireClassification[];
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="h-4 bg-white/10 rounded w-1/4" />
        <div className="h-5 bg-white/10 rounded w-1/2" />
        <div className="h-4 bg-white/10 rounded w-1/3" />
      </div>
      <div className="h-40 bg-white/10 rounded-lg" />
      <div className="flex gap-2">
        <div className="h-7 bg-white/10 rounded-full w-20" />
        <div className="h-7 bg-white/10 rounded-full w-24" />
        <div className="h-7 bg-white/10 rounded-full w-16" />
      </div>
    </div>
  );
}

function EditableTagList({
  label,
  tags,
  onChange,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
    setAdding(false);
  }

  function handleRemove(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  return (
    <div>
      <h3 className="text-sm font-medium text-white/60 mb-2">{label}</h3>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {tags.map((tag) => (
            <motion.span
              key={tag}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group px-3 py-1 text-sm bg-white/5 border border-white/10 rounded-full text-white/80 flex items-center gap-1.5"
            >
              {tag}
              <button
                onClick={() => handleRemove(tag)}
                className="w-4 h-4 flex items-center justify-center rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                aria-label={`Remove ${tag}`}
              >
                <svg width={8} height={8} viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                  <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" />
                </svg>
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        {adding ? (
          <span className="flex items-center gap-1">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setInput("");
                  setAdding(false);
                }
              }}
              onBlur={() => {
                if (input.trim()) handleAdd();
                else setAdding(false);
              }}
              className="px-3 py-1 text-sm bg-white/5 border border-white/20 rounded-full text-white focus:outline-none w-40"
              placeholder="Type and Enter"
            />
          </span>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1 text-sm border border-dashed border-white/20 rounded-full text-white/40 hover:text-white/70 hover:border-white/30 transition-colors"
          >
            + Add
          </button>
        )}
      </div>
    </div>
  );
}

function EditableRapidFire({
  classifications,
  onChange,
}: {
  classifications: RapidFireClassification[];
  onChange: (c: RapidFireClassification[]) => void;
}) {
  if (!classifications.length) return null;

  const responses = [
    { value: "know-tons", label: "Expert", color: "text-green-400 border-green-400/20 bg-green-400/5" },
    { value: "need-more", label: "Learning", color: "text-yellow-400 border-yellow-400/20 bg-yellow-400/5" },
    { value: "not-relevant", label: "Skipped", color: "text-white/30 border-white/5 bg-white/5" },
  ] as const;

  function cycleResponse(topic: string) {
    const order = ["know-tons", "need-more", "not-relevant"];
    onChange(
      classifications.map((c) => {
        if (c.topic !== topic) return c;
        const idx = order.indexOf(c.response);
        return { ...c, response: order[(idx + 1) % order.length] };
      })
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-white/60 mb-1">
        Rapid-Fire Classifications
      </h3>
      <p className="text-xs text-white/30 mb-3">Click a tag to cycle its classification</p>
      <div className="flex flex-wrap gap-2">
        {classifications.map((c) => {
          const style = responses.find((r) => r.value === c.response) || responses[2];
          return (
            <button
              key={c.topic}
              onClick={() => cycleResponse(c.topic)}
              className={`px-3 py-1 text-sm border rounded-full transition-colors hover:ring-1 hover:ring-white/20 ${style.color}`}
              title={`${c.context} — click to change`}
            >
              {c.topic} — {style.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [draft, setDraft] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data: ProfileData) => {
        setProfile(data);
        setDraft({ ...data });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function isDirty() {
    if (!profile || !draft) return false;
    return JSON.stringify(profile) !== JSON.stringify(draft);
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: draft.transcript,
          linkedinUrl: draft.linkedinUrl,
          topics: draft.topics,
          initiatives: draft.initiatives,
          concerns: draft.concerns,
          knowledgeGaps: draft.knowledgeGaps,
          expertAreas: draft.expertAreas,
          weakAreas: draft.weakAreas,
          rapidFireClassifications: draft.rapidFireClassifications,
        }),
      });
      setProfile({ ...draft });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-12"
    >
      <h2 className="text-xl font-semibold mb-6">Profile &amp; Context</h2>

      {loading ? (
        <Skeleton />
      ) : draft ? (
        <div className="space-y-8">
          {/* User info */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-5">
            <div className="space-y-3">
              <p className="text-lg font-medium">{draft.name}</p>
              {draft.title && (
                <p className="text-sm text-white/60">
                  {draft.title}
                  {draft.company && ` at ${draft.company}`}
                </p>
              )}
              <div>
                <label className="block text-xs text-white/40 mb-1">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={draft.linkedinUrl || ""}
                  onChange={(e) =>
                    setDraft((d) => d && { ...d, linkedinUrl: e.target.value })
                  }
                  placeholder="https://www.linkedin.com/in/..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                />
              </div>
            </div>
          </div>

          {/* Transcript editor */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Conversation Transcript
            </label>
            <textarea
              value={draft.transcript || ""}
              onChange={(e) =>
                setDraft((d) => d && { ...d, transcript: e.target.value })
              }
              rows={8}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm leading-relaxed placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-y"
              placeholder="Your onboarding conversation transcript..."
            />
          </div>

          {/* Editable parsed data */}
          <div className="space-y-5">
            <EditableTagList
              label="Topics"
              tags={draft.topics || []}
              onChange={(tags) => setDraft((d) => d && { ...d, topics: tags })}
            />
            <EditableTagList
              label="Initiatives"
              tags={draft.initiatives || []}
              onChange={(tags) => setDraft((d) => d && { ...d, initiatives: tags })}
            />
            <EditableTagList
              label="Concerns"
              tags={draft.concerns || []}
              onChange={(tags) => setDraft((d) => d && { ...d, concerns: tags })}
            />
            <EditableTagList
              label="Knowledge Gaps"
              tags={draft.knowledgeGaps || []}
              onChange={(tags) => setDraft((d) => d && { ...d, knowledgeGaps: tags })}
            />
            <EditableTagList
              label="Expert Areas"
              tags={draft.expertAreas || []}
              onChange={(tags) => setDraft((d) => d && { ...d, expertAreas: tags })}
            />
            <EditableTagList
              label="Weak Areas"
              tags={draft.weakAreas || []}
              onChange={(tags) => setDraft((d) => d && { ...d, weakAreas: tags })}
            />
          </div>

          {/* Rapid-fire classifications */}
          <EditableRapidFire
            classifications={draft.rapidFireClassifications || []}
            onChange={(c) =>
              setDraft((d) => d && { ...d, rapidFireClassifications: c })
            }
          />

          {/* Save bar */}
          <div className="sticky bottom-4 md:bottom-0">
            <div className="flex items-center gap-3 bg-[#0a0a0a]/90 backdrop-blur-sm py-3">
              <button
                onClick={handleSave}
                disabled={saving || !isDirty()}
                className="px-5 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              {isDirty() && !saving && (
                <span className="text-xs text-white/40">Unsaved changes</span>
              )}
              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-green-400"
                >
                  Saved
                </motion.span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-white/40 text-sm">Failed to load profile.</p>
      )}
    </motion.div>
  );
}

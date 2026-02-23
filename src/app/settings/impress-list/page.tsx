"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DeepDiveData {
  interests: string[];
  focusAreas: string[];
  recentActivity: string[];
  talkingPoints: string[];
  companyContext: string;
  summary: string;
}

interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  photoUrl: string | null;
  linkedinUrl: string;
  researchStatus: "none" | "pending" | "completed" | "failed";
  deepDiveData: DeepDiveData | null;
}

export default function ImpressListPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchContacts = useCallback(() => {
    fetch("/api/user/impress")
      .then((res) => res.json())
      .then((data) => setContacts(data.contacts || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchContacts();
    setLoading(false);
  }, [fetchContacts]);

  useEffect(() => {
    const hasPending = contacts.some((c) => c.researchStatus === "pending");
    if (!hasPending) return;
    const interval = setInterval(fetchContacts, 5000);
    return () => clearInterval(interval);
  }, [contacts, fetchContacts]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleResearch(contactId: string) {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId ? { ...c, researchStatus: "pending" as const } : c
      )
    );
    try {
      await fetch("/api/user/impress/deep-dive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
    } catch {
      // polling will pick up the actual status
    }
  }

  async function handleRemove(contactId: string) {
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
    try {
      const res = await fetch("/api/user/impress", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) {
        const orig = contacts;
        setContacts(orig);
      }
    } catch {
      // revert handled above on error response
    }
  }

  async function handleAdd() {
    if (!newUrl.trim()) return;
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/user/impress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedinUrl: newUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAddError(data.error || "Failed to add contact");
        return;
      }
      const data = await res.json();
      if (data.contact) {
        setContacts((prev) => [...prev, data.contact]);
      }
      setNewUrl("");
    } catch {
      setAddError("Something went wrong");
    } finally {
      setAdding(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-12"
    >
      <h2 className="text-xl font-semibold mb-2">Impress List</h2>
      <p className="text-sm text-white/50 mb-6">
        People you want to stay sharp about. We&apos;ll track what matters to
        them.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-4"
            >
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {contacts.length === 0 && (
            <p className="text-white/30 text-sm mb-6">
              No contacts yet. Add someone below.
            </p>
          )}

          <div className="space-y-2 mb-8">
            <AnimatePresence>
              {contacts.map((contact) => (
                <motion.div
                  key={contact.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/5 border border-white/10 rounded-lg overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-4">
                    {contact.photoUrl ? (
                      <img
                        src={contact.photoUrl}
                        alt={contact.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm text-white/50">
                        {contact.name?.[0] || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {contact.name}
                        </p>
                        <ResearchBadge
                          status={contact.researchStatus}
                          onResearch={() => handleResearch(contact.id)}
                        />
                      </div>
                      <p className="text-xs text-white/50 truncate">
                        {contact.title}
                        {contact.company && ` @ ${contact.company}`}
                      </p>
                    </div>
                    {contact.researchStatus === "completed" &&
                      contact.deepDiveData && (
                        <button
                          onClick={() => toggleExpand(contact.id)}
                          className="flex items-center justify-center w-7 h-7 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                          aria-label="Toggle details"
                        >
                          <svg
                            width={12}
                            height={12}
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`transition-transform ${expanded.has(contact.id) ? "rotate-180" : ""}`}
                          >
                            <path d="M2 4l4 4 4-4" />
                          </svg>
                        </button>
                      )}
                    <button
                      onClick={() => handleRemove(contact.id)}
                      className="flex items-center justify-center w-7 h-7 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                      aria-label={`Remove ${contact.name}`}
                    >
                      <svg
                        width={14}
                        height={14}
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                      >
                        <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
                      </svg>
                    </button>
                  </div>
                  <AnimatePresence>
                    {expanded.has(contact.id) && contact.deepDiveData && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <DeepDivePanel data={contact.deepDiveData} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Add contact */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-5">
            <h3 className="text-sm font-medium mb-3">Add Contact</h3>
            <div className="flex gap-2">
              <input
                type="url"
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value);
                  setAddError("");
                }}
                placeholder="LinkedIn profile URL"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !adding) handleAdd();
                }}
              />
              <button
                onClick={handleAdd}
                disabled={adding || !newUrl.trim()}
                className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {adding ? "Adding..." : "Add"}
              </button>
            </div>
            {addError && (
              <p className="text-red-400 text-sm mt-2">{addError}</p>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

function ResearchBadge({
  status,
  onResearch,
}: {
  status: Contact["researchStatus"];
  onResearch: () => void;
}) {
  switch (status) {
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-yellow-500/10 text-yellow-400">
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="5" />
          </svg>
          Researching
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400">
          <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 5.5l2 2 4-4.5" />
          </svg>
          Researched
        </span>
      );
    case "failed":
      return (
        <button
          onClick={onResearch}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
            <path d="M5 3v3M5 7.5v0" />
          </svg>
          Retry
        </button>
      );
    case "none":
    default:
      return (
        <button
          onClick={onResearch}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 transition-colors"
        >
          Research
        </button>
      );
  }
}

function DeepDivePanel({ data }: { data: DeepDiveData }) {
  return (
    <div className="px-4 pb-4 pt-0 border-t border-white/5 space-y-3">
      <p className="text-xs text-white/60 leading-relaxed mt-3">
        {data.summary}
      </p>
      {data.interests.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5">
            Interests
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.interests.map((interest) => (
              <span
                key={interest}
                className="px-2 py-0.5 rounded-full text-[11px] bg-white/5 text-white/50"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}
      {data.focusAreas.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5">
            Focus Areas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.focusAreas.map((area) => (
              <span
                key={area}
                className="px-2 py-0.5 rounded-full text-[11px] bg-blue-500/10 text-blue-300/60"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}
      {data.talkingPoints.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5">
            Talking Points
          </p>
          <ul className="space-y-1">
            {data.talkingPoints.map((point) => (
              <li
                key={point}
                className="text-xs text-white/50 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1 before:h-1 before:rounded-full before:bg-white/20"
              >
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.companyContext && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5">
            Company Context
          </p>
          <p className="text-xs text-white/50">{data.companyContext}</p>
        </div>
      )}
    </div>
  );
}

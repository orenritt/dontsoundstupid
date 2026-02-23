"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  photoUrl: string | null;
  linkedinUrl: string;
}

export default function ImpressListPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    fetch("/api/user/impress")
      .then((res) => res.json())
      .then((data) => setContacts(data.contacts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
      setContacts((prev) => [...prev, data.contact]);
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
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg p-4"
                >
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
                    <p className="text-sm font-medium truncate">
                      {contact.name}
                    </p>
                    <p className="text-xs text-white/50 truncate">
                      {contact.title}
                      {contact.company && ` @ ${contact.company}`}
                    </p>
                  </div>
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

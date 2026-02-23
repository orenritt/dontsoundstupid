"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Contact {
  name: string;
  photoUrl: string;
}

interface ImpressListStepProps {
  userPhoto?: string;
  onComplete: (contacts: Contact[]) => void;
  onBack?: () => void;
  initialContacts?: Contact[];
}

const MAX_SLOTS = 5;

function SmallOrb({ photoUrl, name, onRemove }: { photoUrl?: string; name?: string; onRemove?: () => void }) {
  const filled = !!photoUrl;
  return (
    <motion.div
      layout
      className="relative flex flex-col items-center gap-1"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      <div className="relative">
        <div
          className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border ${
            filled ? "border-white/20" : "border-white/10 bg-white/5"
          }`}
        >
          {filled ? (
            <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl text-gray-500">+</span>
          )}
        </div>
        {filled && onRemove && (
          <motion.button
            type="button"
            onClick={onRemove}
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/80 text-xs text-white hover:bg-red-500"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            ×
          </motion.button>
        )}
      </div>
      {filled && name && (
        <span className="max-w-[70px] truncate text-xs text-gray-400">{name}</span>
      )}
    </motion.div>
  );
}

export function ImpressListStep({ userPhoto, onComplete, onBack, initialContacts }: ImpressListStepProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts ?? []);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slots = Array.from({ length: MAX_SLOTS }, (_, i) => i);
  const isValid = contacts.length >= 1;

  const handleAddContact = async () => {
    if (!urlInput.includes("linkedin.com/in/")) {
      setError("Please enter a valid LinkedIn profile URL");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/impress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedinUrls: [urlInput] }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add contact");
      }

      const contact = data.contacts?.[0];
      if (contact) {
        setContacts((prev) => [...prev, { name: contact.name, photoUrl: contact.photoUrl }]);
        setUrlInput("");
        setAddingIndex(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contact");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveContact = (index: number) => {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;
    onComplete(contacts);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      {onBack && (
        <button
          onClick={onBack}
          className="fixed top-4 left-4 z-50 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 12L6 8l4-4" />
          </svg>
        </button>
      )}

      {/* Main orb cluster (small, scaled, at top) */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{ scale: 0.6 }}
      >
        <div className="relative flex items-center justify-center">
          <svg width={120} height={120} viewBox="-60 -60 120 120" className="overflow-visible">
            <circle
              cx={0}
              cy={0}
              r={40}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
            />
            <circle
              cx={0}
              cy={0}
              r={30}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={1}
              strokeDasharray="3 6"
            />
            <circle
              cx={0}
              cy={0}
              r={20}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          </svg>
          {userPhoto && (
            <div className="absolute left-1/2 top-1/2 h-[76%] w-[76%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-white/20">
              <img src={userPhoto} alt="" className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      </motion.div>

      <h1 className="mb-8 text-center text-[24px] font-medium text-white">
        Who do we need to impress?
      </h1>

      {/* Row of orbs */}
      <form onSubmit={handleSubmit} className="flex w-full max-w-lg flex-col items-center gap-6">
        <div className="flex flex-wrap items-start justify-center gap-4">
          {slots.map((slotIndex) => {
            const contact = contacts[slotIndex];
            const isAdding = addingIndex === slotIndex;

            if (contact) {
              return (
                <SmallOrb
                  key={slotIndex}
                  photoUrl={contact.photoUrl}
                  name={contact.name}
                  onRemove={() => handleRemoveContact(slotIndex)}
                />
              );
            }

            if (isAdding) {
              return (
                <motion.div
                  key={`add-${slotIndex}`}
                  layout
                  className="flex flex-col items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste LinkedIn URL"
                    className="w-48 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-white/20 focus:outline-none"
                    autoFocus
                    disabled={loading}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAddingIndex(null);
                        setUrlInput("");
                        setError(null);
                      }}
                      className="rounded px-3 py-1 text-sm text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddContact}
                      disabled={loading}
                      className="rounded bg-white px-3 py-1 text-sm font-medium text-black disabled:opacity-50"
                    >
                      {loading ? "Adding…" : "Add"}
                    </button>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.button
                key={slotIndex}
                type="button"
                onClick={() => setAddingIndex(slotIndex)}
                className="flex h-14 w-14 flex-col items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-gray-500 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-gray-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                +
              </motion.button>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <p className="text-center text-sm text-gray-500">
          Anyone else? You can always add more later.
        </p>

        <motion.button
          type="submit"
          disabled={!isValid || loading}
          className="w-full max-w-md rounded-lg bg-white px-6 py-3 font-medium text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          whileHover={isValid && !loading ? { scale: 1.02 } : {}}
          whileTap={isValid && !loading ? { scale: 0.98 } : {}}
        >
          Next
        </motion.button>
      </form>
    </div>
  );
}

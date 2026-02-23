"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface ProfileData {
  name: string;
  title: string;
  company: string;
  linkedinUrl: string;
  transcript: string;
  topics: string[];
  initiatives: string[];
  concerns: string[];
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

function TagList({ label, tags }: { label: string; tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div>
      <h3 className="text-sm font-medium text-white/60 mb-2">{label}</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 text-sm bg-white/5 border border-white/10 rounded-full text-white/80"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data: ProfileData) => {
        setProfile(data);
        setTranscript(data.transcript || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  const dirty = profile ? transcript !== (profile.transcript || "") : false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-12"
    >
      <h2 className="text-xl font-semibold mb-6">Profile &amp; Context</h2>

      {loading ? (
        <Skeleton />
      ) : profile ? (
        <div className="space-y-8">
          {/* User info */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-5">
            <div className="space-y-2">
              <p className="text-lg font-medium">{profile.name}</p>
              {profile.title && (
                <p className="text-sm text-white/60">
                  {profile.title}
                  {profile.company && ` at ${profile.company}`}
                </p>
              )}
              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm text-blue-400 hover:underline"
                >
                  LinkedIn Profile →
                </a>
              )}
            </div>
          </div>

          {/* Transcript editor */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Conversation Transcript
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={12}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm leading-relaxed placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-y"
              placeholder="Your onboarding conversation transcript..."
            />
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className="px-5 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save"}
              </button>
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

          {/* Parsed data */}
          <div className="space-y-5">
            <TagList label="Topics" tags={profile.topics || []} />
            <TagList label="Initiatives" tags={profile.initiatives || []} />
            <TagList label="Concerns" tags={profile.concerns || []} />
          </div>
        </div>
      ) : (
        <p className="text-white/40 text-sm">Failed to load profile.</p>
      )}
    </motion.div>
  );
}

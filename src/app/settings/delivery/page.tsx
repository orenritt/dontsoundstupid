"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const CHANNELS = [
  { id: "email", label: "Email", available: true },
  { id: "slack", label: "Slack", available: false },
  { id: "sms", label: "SMS", available: false },
  { id: "whatsapp", label: "WhatsApp", available: false },
] as const;

const TIME_SLOTS = Array.from({ length: 33 }, (_, i) => {
  const totalMinutes = 6 * 60 + i * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const label = `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  const value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  return { label, value };
});

const TIMEZONES = [
  { label: "Pacific Time (US)", value: "America/Los_Angeles" },
  { label: "Mountain Time (US)", value: "America/Denver" },
  { label: "Central Time (US)", value: "America/Chicago" },
  { label: "Eastern Time (US)", value: "America/New_York" },
  { label: "Atlantic Time", value: "America/Halifax" },
  { label: "GMT / UTC", value: "UTC" },
  { label: "Central European Time", value: "Europe/Berlin" },
  { label: "Eastern European Time", value: "Europe/Bucharest" },
  { label: "Israel Time", value: "Asia/Jerusalem" },
  { label: "India Standard Time", value: "Asia/Kolkata" },
  { label: "China Standard Time", value: "Asia/Shanghai" },
  { label: "Japan Standard Time", value: "Asia/Tokyo" },
  { label: "Australia Eastern", value: "Australia/Sydney" },
];

interface DeliveryPrefs {
  channel: string;
  time: string;
  timezone: string;
}

export default function DeliverySettingsPage() {
  const [prefs, setPrefs] = useState<DeliveryPrefs>({
    channel: "email",
    time: "07:00",
    timezone: "America/New_York",
  });
  const [original, setOriginal] = useState<DeliveryPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/delivery")
      .then((res) => res.json())
      .then((data: DeliveryPrefs) => {
        setPrefs(data);
        setOriginal(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/user/delivery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      setOriginal({ ...prefs });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  const dirty = original
    ? prefs.channel !== original.channel ||
      prefs.time !== original.time ||
      prefs.timezone !== original.timezone
    : false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-12"
    >
      <h2 className="text-xl font-semibold mb-2">Delivery Preferences</h2>
      <p className="text-sm text-white/50 mb-8">
        Choose how and when you receive your daily briefing.
      </p>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-white/10 rounded-lg" />
          <div className="h-12 bg-white/10 rounded-lg" />
          <div className="h-12 bg-white/10 rounded-lg" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Channel selection */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-3">
              Channel
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CHANNELS.map((ch) => (
                <div key={ch.id} className="relative">
                  <button
                    onClick={() => {
                      if (ch.available) {
                        setPrefs((p) => ({ ...p, channel: ch.id }));
                        setTooltip(null);
                      } else {
                        setTooltip(
                          tooltip === ch.id ? null : ch.id
                        );
                      }
                    }}
                    className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors ${
                      prefs.channel === ch.id
                        ? "bg-white text-black border-white"
                        : ch.available
                          ? "bg-white/5 text-white/70 border-white/10 hover:border-white/20"
                          : "bg-white/5 text-white/30 border-white/10 cursor-default"
                    }`}
                  >
                    {ch.label}
                  </button>
                  {tooltip === ch.id && !ch.available && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg text-xs text-white/70 whitespace-nowrap z-10"
                    >
                      Coming soon
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Time picker */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Delivery Time
            </label>
            <select
              value={prefs.time}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, time: e.target.value }))
              }
              className="w-full sm:w-60 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 appearance-none cursor-pointer"
            >
              {TIME_SLOTS.map((slot) => (
                <option
                  key={slot.value}
                  value={slot.value}
                  className="bg-[#1a1a1a] text-white"
                >
                  {slot.label}
                </option>
              ))}
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              Timezone
            </label>
            <select
              value={prefs.timezone}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, timezone: e.target.value }))
              }
              className="w-full sm:w-80 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/20 appearance-none cursor-pointer"
            >
              {TIMEZONES.map((tz) => (
                <option
                  key={tz.value}
                  value={tz.value}
                  className="bg-[#1a1a1a] text-white"
                >
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
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
      )}
    </motion.div>
  );
}

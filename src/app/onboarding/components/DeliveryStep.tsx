"use client";

import { useState, useEffect } from "react";

type Channel = "email" | "slack" | "sms" | "whatsapp";

interface DeliveryStepProps {
  onComplete: () => void;
}

const CHANNELS: { id: Channel; label: string; icon: string }[] = [
  { id: "email", label: "Email", icon: "✉" },
  { id: "slack", label: "Slack", icon: "💬" },
  { id: "sms", label: "SMS", icon: "📱" },
  { id: "whatsapp", label: "WhatsApp", icon: "📲" },
];

export function DeliveryStep({ onComplete }: DeliveryStepProps) {
  const [channel, setChannel] = useState<Channel>("email");
  const [time, setTime] = useState("07:00");
  const [timezone, setTimezone] = useState("");
  const [editingTimezone, setEditingTimezone] = useState(false);
  const [customTimezone, setCustomTimezone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const displayTimezone = editingTimezone ? customTimezone || timezone : timezone;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const tz = editingTimezone && customTimezone ? customTimezone : timezone;
      const res = await fetch("/api/onboarding/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, time, timezone: tz }),
      });
      if (res.ok) onComplete();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12">
      <div className="w-full max-w-lg mx-auto">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-900 mb-3">
              Delivery channel
            </p>
            <div className="grid grid-cols-2 gap-3">
              {CHANNELS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannel(c.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                    channel === c.id
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl">{c.icon}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {c.label}
                  </span>
                  {channel === c.id && (
                    <span className="text-gray-900 text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="time"
              className="block text-sm font-medium text-gray-900 mb-2"
            >
              What time works best?
            </label>
            <input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">Timezone</p>
            {editingTimezone ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTimezone}
                  onChange={(e) => setCustomTimezone(e.target.value)}
                  placeholder={timezone}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
                />
                <button
                  onClick={() => {
                    setEditingTimezone(false);
                    if (customTimezone) setTimezone(customTimezone);
                  }}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{displayTimezone}</span>
                <button
                  onClick={() => setEditingTimezone(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-8 w-full rounded-lg bg-gray-900 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          Start My Briefings
        </button>
      </div>
    </div>
  );
}

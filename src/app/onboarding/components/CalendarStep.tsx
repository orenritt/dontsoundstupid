"use client";

interface CalendarStepProps {
  onComplete: () => void;
  onBack?: () => void;
}

const PROVIDERS = [
  { id: "google", name: "Google Calendar", icon: "📅" },
  { id: "outlook", name: "Outlook", icon: "📆" },
];

export function CalendarStep({ onComplete, onBack }: CalendarStepProps) {
  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12">
      <div className="w-full max-w-lg mx-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 12L6 8l4-4" />
            </svg>
            Back
          </button>
        )}
        <div className="space-y-4">
          {PROVIDERS.map((p) => (
            <div
              key={p.id}
              className="relative bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4"
            >
              <span className="text-3xl">{p.icon}</span>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900">
                  {p.name}
                </h3>
              </div>
              <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                Coming Soon
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onComplete}
          className="mt-8 text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

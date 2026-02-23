"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/admin" }],
  },
  {
    title: "Data Sources",
    items: [
      { label: "Signals", href: "/admin/signals" },
      { label: "News", href: "/admin/news" },
      { label: "Syndication Feeds", href: "/admin/syndication" },
      { label: "Newsletters", href: "/admin/newsletters" },
      { label: "Email Forwards", href: "/admin/email-forwards" },
      { label: "Narratives", href: "/admin/narratives" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "Briefings", href: "/admin/briefings" },
      { label: "Knowledge Graph", href: "/admin/knowledge" },
      { label: "Feedback", href: "/admin/feedback" },
      { label: "Provenance", href: "/admin/provenance" },
      { label: "Reply Sessions", href: "/admin/replies" },
      { label: "Calendar", href: "/admin/calendar" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Users & Profiles", href: "/admin/users" },
      { label: "Pipeline Runs", href: "/admin/pipeline" },
      { label: "Cron Jobs", href: "/admin/cron" },
      { label: "Impress Contacts", href: "/admin/impress" },
      { label: "Peer Orgs", href: "/admin/peers" },
      { label: "API Tokens", href: "/admin/api-tokens" },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState<"loading" | "ok" | "denied">("loading");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/data-explorer?source=overview")
      .then((res) => {
        if (res.status === 403) {
          setAuthed("denied");
          return;
        }
        if (!res.ok) throw new Error();
        setAuthed("ok");
      })
      .catch(() => router.replace("/auth/login"));
  }, [router]);

  if (authed === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (authed === "denied") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-white mb-2">Access Denied</h1>
          <p className="text-gray-500 text-sm">This area is restricted to admins.</p>
          <Link href="/briefing" className="text-blue-400 text-sm mt-4 inline-block hover:underline">
            Back to Briefing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold tracking-tight">Admin</h1>
        </div>
        <Link href="/briefing" className="text-xs text-white/40 hover:text-white/70">
          Exit
        </Link>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-0 left-0 z-50 h-screen w-64 border-r border-white/10
            bg-[#0a0a0a] overflow-y-auto flex flex-col transition-transform duration-200
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <div className="hidden lg:flex items-center justify-between p-5 border-b border-white/10">
            <h1 className="text-lg font-semibold tracking-tight">Admin</h1>
            <Link href="/briefing" className="text-xs text-white/40 hover:text-white/70">
              Exit
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-6">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2 px-3">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active =
                      item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          active
                            ? "text-white bg-white/10"
                            : "text-white/50 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-h-screen overflow-x-hidden">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

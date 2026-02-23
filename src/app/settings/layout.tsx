"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { label: "Profile", href: "/settings" },
  { label: "Impress List", href: "/settings/impress-list" },
  { label: "Newsletters", href: "/settings/newsletters" },
  { label: "Delivery", href: "/settings/delivery" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    fetch("/api/user/status")
      .then((res) => {
        if (!res.ok) throw new Error();
        setAuthed(true);
      })
      .catch(() => router.replace("/auth/login"));
  }, [router]);

  if (!authed) {
    return <div className="min-h-screen bg-[#0a0a0a]" />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Mobile header */}
      <div className="md:hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Link
            href="/briefing"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors"
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11.25 4.5L6.75 9l4.5 4.5" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold flex-1">Settings</h1>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="text-xs text-white/40 hover:text-red-400 transition-colors px-2 py-1"
          >
            Log Out
          </button>
        </div>
        <nav className="flex border-b border-white/10">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 text-center py-3 text-sm font-medium transition-colors ${
                  active
                    ? "text-white border-b-2 border-white"
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex min-h-screen">
        <aside className="w-64 border-r border-white/10 p-6 flex flex-col">
          <Link
            href="/briefing"
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-8"
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back to Briefing
          </Link>
          <h1 className="text-xl font-semibold mb-6">Settings</h1>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
          </nav>
          <div className="mt-auto pt-6">
            <button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors w-full"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Log Out
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile content */}
      <div className="md:hidden">
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

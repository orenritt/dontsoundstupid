import AppNav from "@/app/components/AppNav";

export default function BriefingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AppNav />
      {/* Desktop: offset for sidebar. Mobile: offset for bottom bar */}
      <main className="md:ml-16 pb-16 md:pb-0">{children}</main>
    </div>
  );
}

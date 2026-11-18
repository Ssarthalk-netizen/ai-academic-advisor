"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, BookOpen, CalendarCheck2, Calculator, ClipboardList, Compass, LayoutDashboard, LogOut, MessageCircle, Radar, Settings } from "lucide-react";
import { Logo } from "../ui";
import { api } from "@/lib/client/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/academics", label: "My records", icon: BookOpen },
  { href: "/risk", label: "Risk radar", icon: Radar },
  { href: "/cgpa", label: "CGPA simulator", icon: Calculator },
  { href: "/planner", label: "Study planner", icon: CalendarCheck2 },
  { href: "/deadlines", label: "Deadlines & exams", icon: ClipboardList },
  { href: "/advisor", label: "AI advisor", icon: MessageCircle },
  { href: "/career", label: "Career paths", icon: Compass },
  { href: "/models", label: "How the AI works", icon: BarChart3 },
];

export function Sidebar({ name }: { name: string }) {
  const path = usePathname();
  const router = useRouter();
  const active = (href: string) => path === href || path.startsWith(href + "/");

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-6 hidden h-[calc(100dvh-48px)] w-[232px] shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
        <div className="px-2"><Logo href="/dashboard" /></div>
        <nav aria-label="App" className="mt-8 flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] font-medium transition-colors ${active(href) ? "bg-butter text-ink" : "text-ink-soft hover:bg-butter-soft hover:text-ink"}`}>
              <Icon className="size-[18px]" aria-hidden />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t border-line pt-4">
          <Link href="/settings" aria-current={active("/settings") ? "page" : undefined}
            className={`flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] font-medium ${active("/settings") ? "bg-butter" : "text-ink-soft hover:bg-butter-soft"}`}>
            <Settings className="size-[18px]" aria-hidden />Settings
          </Link>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] font-medium text-ink-soft hover:bg-butter-soft">
            <LogOut className="size-[18px]" aria-hidden />Sign out
          </button>
          <p className="mt-3 truncate px-3 text-[12px] text-ink-faint">Signed in as {name}</p>
        </div>
      </aside>

      {/* Mobile */}
      <div className="border-b border-line lg:hidden">
        <div className="flex items-center justify-between px-4 pt-4">
          <Logo href="/dashboard" />
          <div className="flex gap-1">
            <Link href="/settings" className="btn btn-ghost px-2.5" aria-label="Settings"><Settings className="size-5" /></Link>
            <button onClick={signOut} className="btn btn-ghost px-2.5" aria-label="Sign out"><LogOut className="size-5" /></button>
          </div>
        </div>
        <nav aria-label="App" className="flex gap-1 overflow-x-auto px-3 py-3">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium ${active(href) ? "bg-butter text-ink" : "bg-butter-soft/60 text-ink-soft"}`}>{label}</Link>
          ))}
        </nav>
      </div>
    </>
  );
}

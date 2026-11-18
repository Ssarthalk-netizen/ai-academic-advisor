import Link from "next/link";
import { Logo } from "./ui";

export function PublicNav() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-5 pt-5 sm:px-10 sm:pt-7">
      <Logo />
      <nav aria-label="Main" className="hidden items-center gap-1 rounded-[14px] bg-paper px-2 py-1.5 shadow-[0_6px_20px_-12px_rgba(120,70,0,.35)] md:flex">
        <Link href="/#features" className="btn btn-ghost px-3 py-1.5">Features</Link>
        <Link href="/#how-it-works" className="btn btn-ghost px-3 py-1.5">How it works</Link>
        <Link href="/privacy" className="btn btn-ghost px-3 py-1.5">Privacy</Link>
      </nav>
      <div className="flex items-center gap-2">
        <Link href="/login" className="btn btn-soft">Sign in</Link>
        <Link href="/signup" className="btn btn-primary">Create account</Link>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-6 text-[13px] text-ink-soft sm:px-10">
      <p>AI Academic Advisor, an AIML Essentials course project at Ajeenkya D Y Patil University</p>
      <nav aria-label="Legal" className="flex gap-4">
        <Link href="/privacy" className="hover:text-ink">Privacy policy</Link>
        <Link href="/terms" className="hover:text-ink">Terms of use</Link>
      </nav>
    </footer>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1240px] p-3 sm:p-6">
      <div className="sheet overflow-hidden">
        <PublicNav />
        {children}
        <PublicFooter />
      </div>
    </div>
  );
}

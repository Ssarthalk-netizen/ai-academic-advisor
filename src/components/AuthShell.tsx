import { Logo } from "./ui";

export function AuthShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="sheet w-full max-w-[440px] p-7 sm:p-9">
        <Logo />
        <h1 className="display mt-8 text-[32px]">{title}</h1>
        <p className="mb-6 mt-2 text-ink-soft">{intro}</p>
        {children}
      </div>
    </main>
  );
}

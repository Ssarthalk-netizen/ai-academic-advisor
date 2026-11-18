import { PublicShell } from "./PublicNav";
import { SITE } from "@/lib/site/config";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PublicShell>
      <article className="mx-auto max-w-[44rem] px-5 pb-6 pt-14 sm:px-0">
        <h1 className="display text-[40px]">{title}</h1>
        <p className="mt-2 text-[13px] text-ink-faint">Last updated {SITE.updated}</p>
        <div className="legal mt-8 space-y-6 text-[15.5px] leading-[1.75] text-ink-soft [&_h2]:mt-10 [&_h2]:text-[18px] [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink">
          {children}
        </div>
      </article>
    </PublicShell>
  );
}

export function Contact() {
  return SITE.contactEmail
    ? <a className="underline" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
    : <span>the contact address on the project&apos;s GitHub page</span>;
}

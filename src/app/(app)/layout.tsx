import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/Sidebar";

/** Every page in this group requires a signed-in, onboarded user (checked on the server). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name,onboarded").eq("id", user.id).single();
  if (!profile?.onboarded) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-[1440px] p-2 sm:p-5">
      <div className="sheet flex min-h-[calc(100dvh-40px)] flex-col lg:flex-row">
        <Sidebar name={profile.full_name || user.email || "student"} />
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

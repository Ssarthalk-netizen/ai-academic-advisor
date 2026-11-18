import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <main className="mx-auto max-w-[760px] p-3 sm:p-6">{children}</main>;
}

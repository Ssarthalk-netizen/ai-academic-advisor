import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" intro="Free for students. Your records stay private to you.">
      <Suspense><AuthForm mode="signup" /></Suspense>
    </AuthShell>
  );
}

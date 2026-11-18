import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" intro="Sign in to see your dashboard.">
      <Suspense><AuthForm mode="login" /></Suspense>
    </AuthShell>
  );
}

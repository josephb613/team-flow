"use client";

import { NeonAuthUIProvider, AuthView } from "@neondatabase/auth-ui";
import { authClient } from "@/lib/auth/client";

export const dynamicParams = false;

export default function AuthPage() {
  return (
    <NeonAuthUIProvider authClient={authClient}>
      <AuthView pathname="sign-in" />
    </NeonAuthUIProvider>
  );
}

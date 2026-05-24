"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useAppStore, useHasHydrated } from "@/lib/store";
import { LoginPage } from "@/components/login-page";
import { MainApp } from "@/components/main-app";
import { useBootstrapData } from "@/hooks/use-bootstrap-data";
import { AppSkeleton } from "@/components/app-skeleton";

export default function Home() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const hasHydrated = useHasHydrated();
  const [mounted, setMounted] = useState(false);

  // Bootstrap data loading - only enabled when authenticated AND hydrated
  const { isLoading: isBootstrapLoading, isError } = useBootstrapData({
    enabled: isAuthenticated && mounted && hasHydrated,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync Neon Auth session to Zustand store
  useEffect(() => {
    if (session?.user) {
      setCurrentUser({
        id: session.user.id,
        name: session.user.name || "Utilisateur",
        email: session.user.email || "",
        avatar: session.user.image || "",
        role: (session.user as { role?: string }).role || "member",
      });
    }
  }, [session, setCurrentUser]);

  // Before hydration (Zustand localStorage sync) or during session loading, show skeleton
  if (!mounted || !hasHydrated || isSessionPending) {
    return <AppSkeleton variant="auth" />;
  }

  // Not logged in
  if (!session) {
    return <LoginPage />;
  }

  // Loading initial data - show app skeleton with sidebar
  if (isBootstrapLoading && !isError) {
    return <AppSkeleton variant="app" />;
  }

  return <MainApp />;
}

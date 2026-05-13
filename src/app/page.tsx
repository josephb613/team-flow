"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { LoginPage } from "@/components/login-page";
import { MainApp } from "@/components/main-app";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  // Synchroniser la session next-auth avec le store Zustand
  useEffect(() => {
    if (session?.user) {
      setCurrentUser({
        id: (session.user as { id: string }).id,
        name: session.user.name || "Utilisateur",
        email: session.user.email || "",
        avatar: session.user.image || "",
        role: (session.user as { role: string }).role || "member",
      });
    }
  }, [session, setCurrentUser]);

  // Charger les donnees reelles depuis l'API apres la connexion
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      try {
        const wsRes = await fetch("/api/workspaces");
        if (wsRes.ok) {
          const workspaces = await wsRes.json();
          useAppStore.getState().setWorkspaces(workspaces);
          // Charger les colonnes pour le workspace actif
          const activeWsId = workspaces[0]?.id;
          if (activeWsId) {
            const [taskColsRes, oppColsRes] = await Promise.all([
              fetch(`/api/workspaces/${activeWsId}/columns?boardType=tasks`),
              fetch(`/api/workspaces/${activeWsId}/columns?boardType=opportunities`),
            ]);
            if (taskColsRes.ok) {
              useAppStore.getState().setColumns(await taskColsRes.json());
            }
            if (oppColsRes.ok) {
              useAppStore.getState().setColumnsOpportunity(await oppColsRes.json());
            }
          }
          // Fetch users scoped to the first workspace (or all user workspaces)
          const usersRes = await fetch(
            `/api/users${activeWsId ? `?workspaceId=${activeWsId}` : ""}`,
          );
          if (usersRes.ok) {
            const users = await usersRes.json();
            useAppStore.getState().setUsers(users);
          }
          // Fetch channels for the active workspace
          const channelsRes = await fetch("/api/channels");
          if (channelsRes.ok) {
            const channels = await channelsRes.json();
            useAppStore.getState().setChannels(channels);
          }
        }
      } catch (err) {
        console.error("Erreur chargement donnees:", err);
      }
    };

    loadData();
  }, [isAuthenticated]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <LoginPage />;
  }

  return <MainApp />;
}

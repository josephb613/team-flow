"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  MoreHorizontal,
  Users,
  Pencil,
  Trash2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useApiData } from "@/hooks/use-api-data";
import { useTranslation } from "@/lib/i18n";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Team, User } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ApiTeamMember {
  user: { id: string; name: string; email: string; avatar?: string };
}

interface ApiTeam {
  id: string;
  name: string;
  description?: string;
  color: string;
  workspaceId?: string;
  createdAt?: string;
  teamMembers?: ApiTeamMember[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const avatarGradients = [
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-cyan-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-pink-400 to-rose-500",
  "from-orange-400 to-amber-500",
  "from-teal-400 to-cyan-500",
  "from-violet-400 to-purple-500",
];

function getUserInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("");
}

function getUserGradient(index: number) {
  return avatarGradients[index % avatarGradients.length];
}

// ─── Animation ───────────────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ─── Avatar Stack Component ──────────────────────────────────────────────────
function AvatarStack({
  members,
  max = 4,
}: {
  members: { id: string; name: string }[];
  max?: number;
}) {
  const display = members.slice(0, max);
  const remaining = members.length - max;

  return (
    <div className="flex -space-x-2">
      {display.map((m, i) => (
        <Avatar
          key={m.id}
          className="h-7 w-7 ring-2 ring-background shadow-sm transition-transform hover:scale-110 hover:z-10"
          style={{ zIndex: max - i }}
        >
          <AvatarFallback
            className={cn(
              "text-[8px] font-bold bg-gradient-to-br text-white",
              getUserGradient(i),
            )}
          >
            {getUserInitials(m.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {remaining > 0 && (
        <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center shadow-sm">
          <span className="text-[9px] font-semibold text-muted-foreground">
            +{remaining}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Transform API data to Team type ─────────────────────────────────────────
function normalizeTeam(t: ApiTeam | Team, idx: number): Team {
  // If data comes from API (has teamMembers)
  if ("teamMembers" in t && Array.isArray(t.teamMembers)) {
    return {
      id: t.id,
      name: t.name,
      description: t.description || "",
      color: t.color,
      members: t.teamMembers.map((tm: ApiTeamMember) => tm.user?.id || "").filter(Boolean),
      projects: [],
    };
  }
  // Mock data format
  return t as Team;
}

function getTeamMembers(
  team: Team,
  users: User[],
): { id: string; name: string }[] {
  return team.members
    .map((memberId) => {
      // Could be userId or user object depending on format
      const userId = typeof memberId === "string" ? memberId : (memberId as unknown as { id: string }).id;
      const user = users.find((u) => u.id === userId);
      return user ? { id: user.id, name: user.name } : null;
    })
    .filter((m): m is { id: string; name: string } => m !== null);
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function TeamsView() {
  const { t } = useTranslation();
  const {
    setCreateTeamDialogOpen,
    deletedTeamIds,
    addDeletedTeamId,
    teamRefetchKey,
    setTeamManagementId,
    setActivePage,
  } = useAppStore();

  // ─── Delete confirmation state ─────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── API Data ──────────────────────────────────────────────────────────
  const { data: teamsData, isLoading, refetch } = useApiData("/api/teams");
  const { data: usersData } = useApiData("/api/users");

  const rawTeams = (teamsData as (ApiTeam | Team)[]) ?? [];
  const users = (usersData as User[]) ?? [];

  // Normalize API data to match Team type
  const teams = rawTeams
    .map((t, idx) => normalizeTeam(t, idx))
    .filter((t) => !deletedTeamIds.includes(t.id));

  // ─── Refetch when teamRefetchKey changes ───────────────────────────────
  useEffect(() => {
    if (teamRefetchKey > 0) {
      refetch();
    }
  }, [teamRefetchKey]);
  // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Actions ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget || isDeleting) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/teams/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete team");
      }

      addDeletedTeamId(deleteTarget.id);
      toast.success(t.toast.teamDeleted);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting team:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete team",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.teams.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {teams.length} {t.teams.title.toLowerCase()} · Manage team
            structures
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateTeamDialogOpen(true)}
          className="gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.50_0.15_165)] hover:from-[oklch(0.50_0.15_160)] hover:to-[oklch(0.45_0.15_165)] shadow-sm shadow-[oklch(0.55_0.15_160/0.2)] text-white"
        >
          <Plus className="h-4 w-4" /> {t.teams.createTeam}
        </Button>
      </div>

      {/* ─── Teams Grid ──────────────────────────────────────────────────── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {teams.map((team) => {
          const memberList = getTeamMembers(team, users);
          return (
            <motion.div key={team.id} variants={item}>
              <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-border/60 overflow-hidden">
                {/* Colored accent strip */}
                <div
                  className="h-1.5"
                  style={{
                    background: `linear-gradient(90deg, ${team.color}, ${team.color}99)`,
                  }}
                />

                <CardContent className="p-5">
                  {/* Team header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm border border-white/10"
                        style={{
                          backgroundColor: team.color + "20",
                          color: team.color,
                        }}
                      >
                        {team.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">
                          {team.name}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]">
                          {team.description}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            // TODO: Edit team dialog
                            toast.info("Edit team coming soon");
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Edit Team
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            // TODO: Manage members dialog
                            toast.info("Manage members coming soon");
                          }}
                        >
                          <Users className="h-4 w-4 mr-2" /> Manage Members
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(team)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 rounded-md bg-muted/50">
                        <Users className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {memberList.length} {t.teams.members}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 rounded-md bg-muted/50">
                        <svg
                          className="h-3 w-3 text-muted-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                          />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {team.projects.length} {t.teams.projects}
                      </span>
                    </div>
                  </div>

                  {/* Avatar stack */}
                  <div className="flex items-center justify-between pt-3 border-t border-dashed">
                    <AvatarStack members={memberList} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 hover:text-primary"
                      onClick={() => {
                        setTeamManagementId(team.id);
                        setActivePage("team-management");
                      }}
                    >
                      View <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Create Team Card */}
        <motion.div variants={item}>
          <Card
            className="border-dashed border-2 hover:border-[oklch(0.55_0.15_160/0.4)] transition-all duration-300 cursor-pointer group hover:shadow-md"
            onClick={() => setCreateTeamDialogOpen(true)}
          >
            <CardContent className="p-5 flex flex-col items-center justify-center min-h-[200px]">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[oklch(0.55_0.15_160/0.1)] to-[oklch(0.55_0.15_160/0.05)] border border-[oklch(0.55_0.15_160/0.15)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="h-5 w-5 text-[oklch(0.55_0.15_160)]" />
              </div>
              <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {t.teams.createNewTeam}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {t.teams.organizeMembers}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ─── Delete Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg">Delete Team</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone and all team members will be
              unassigned.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="px-6 py-4 border-t flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deleting...
                </span>
              ) : (
                "Delete Team"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

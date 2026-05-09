"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  MoreHorizontal,
  UserPlus,
  Shield,
  Target,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ManageMemberDialog } from "@/components/manage-member-dialog";
import { ManageTeamRolesDialog } from "@/components/manage-team-roles-dialog";
import { ManageTeamScopesDialog } from "@/components/manage-team-scopes-dialog";
import { AddTeamMemberDialog } from "@/components/add-team-member-dialog";
import { useApiData } from "@/hooks/use-api-data";
import { mockUsers } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { TeamMemberDetailed, TeamRole, TeamScope } from "@/lib/types";

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

// ─── Constants ───────────────────────────────────────────────────────────────
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

// ─── Main Component ──────────────────────────────────────────────────────────
export function TeamManagementView() {
  const {
    teamManagementId,
    setTeamManagementId,
    setActivePage,
    users,
    setUsers,
  } = useAppStore();

  const [members, setMembers] = useState<TeamMemberDetailed[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [scopes, setScopes] = useState<TeamScope[]>([]);
  const [loading, setLoading] = useState(true);

  // Team info
  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState("#10b981");
  const [teamDesc, setTeamDesc] = useState("");

  // Dialog states
  const [manageMemberTarget, setManageMemberTarget] = useState<TeamMemberDetailed | null>(null);
  const [rolesDialogOpen, setRolesDialogOpen] = useState(false);
  const [scopesDialogOpen, setScopesDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

  // Delete member state
  const [deleteTarget, setDeleteTarget] = useState<TeamMemberDetailed | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch workspace users
  const { data: usersData } = useApiData("/api/users", { fallback: mockUsers });
  const allUsers = (usersData as typeof mockUsers) ?? [];

  useEffect(() => {
    if (allUsers.length > 0 && users.length === 0) {
      setUsers(allUsers);
    }
  }, [allUsers]);

  // Fetch team data
  async function fetchData() {
    if (!teamManagementId) return;
    setLoading(true);
    try {
      const [membersRes, rolesRes, scopesRes, teamRes] = await Promise.all([
        fetch(`/api/teams/${teamManagementId}/members`),
        fetch(`/api/teams/${teamManagementId}/roles`),
        fetch(`/api/teams/${teamManagementId}/scopes`),
        fetch(`/api/teams/${teamManagementId}`),
      ]);

      if (membersRes.ok) setMembers(await membersRes.json());
      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (scopesRes.ok) setScopes(await scopesRes.json());

      if (teamRes.ok) {
        const team = await teamRes.json();
        setTeamName(team.name);
        setTeamColor(team.color);
        setTeamDesc(team.description || "");
      }
    } catch {
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [teamManagementId]);

  // ─── Actions ───────────────────────────────────────────────────────────
  function handleBack() {
    setTeamManagementId(null);
    setActivePage("teams");
  }

  async function handleRemoveMember() {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/teams/${teamManagementId}/members/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to remove member");
      setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      toast.success("Member removed from team");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setIsDeleting(false);
    }
  }

  const existingMemberIds = members.map((m) => m.userId);

  if (!teamManagementId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No team selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {loading ? "Loading..." : teamName}
            </h2>
            {teamDesc && (
              <p className="text-sm text-muted-foreground mt-0.5">{teamDesc}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRolesDialogOpen(true)}
            className="gap-1.5"
          >
            <Shield className="h-3.5 w-3.5" />
            Roles
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScopesDialogOpen(true)}
            className="gap-1.5"
          >
            <Target className="h-3.5 w-3.5" />
            Scopes
          </Button>
          <Button
            size="sm"
            onClick={() => setAddMemberDialogOpen(true)}
            className="gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.50_0.15_165)] text-white shadow-sm shadow-[oklch(0.55_0.15_160/0.2)]"
          >
            <UserPlus className="h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      {/* ─── Content ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : members.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              No members in this team yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Add members to start managing roles and scopes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {members.map((member, idx) => {
            const memberRole = member.role;
            return (
              <motion.div key={member.id} variants={item}>
                <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-border/60 overflow-hidden">
                  {/* Colored accent strip */}
                  <div
                    className="h-1.5"
                    style={{
                      background: `linear-gradient(90deg, ${memberRole?.color || teamColor}, ${memberRole?.color || teamColor}99)`,
                    }}
                  />

                  <CardContent className="p-5">
                    {/* Member header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                          <AvatarFallback
                            className={cn(
                              "text-xs font-bold bg-gradient-to-br text-white",
                              getUserGradient(idx),
                            )}
                          >
                            {getUserInitials(member.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-sm font-semibold">{member.user.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {member.user.email}
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
                          <DropdownMenuItem onClick={() => setManageMemberTarget(member)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Role & Scopes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget(member)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove from Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Role badge */}
                    <div className="mb-3">
                      {memberRole ? (
                        <Badge
                          className="gap-1 px-2 py-0.5 text-xs"
                          style={{
                            backgroundColor: memberRole.color + "18",
                            color: memberRole.color,
                            borderColor: memberRole.color + "30",
                          }}
                          variant="outline"
                        >
                          <span>{memberRole.icon}</span>
                          {memberRole.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          No role
                        </Badge>
                      )}
                    </div>

                    {/* Scope badges */}
                    {member.scopes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {member.scopes.map((ms) => (
                          <Badge
                            key={ms.id}
                            variant="outline"
                            className={cn(
                              "gap-1 px-1.5 py-0.5 text-[10px]",
                              ms.permission === "admin"
                                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                                : ms.permission === "write"
                                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                            )}
                          >
                            <span>{ms.scope.icon}</span>
                            {ms.scope.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No scopes assigned</p>
                    )}

                    {/* Divider + quick edit */}
                    <div className="flex items-center justify-end pt-3 mt-3 border-t border-dashed">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setManageMemberTarget(member)}
                      >
                        <Pencil className="h-3 w-3" />
                        Edit Role & Scopes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {/* Add member card */}
          <motion.div variants={item}>
            <Card
              className="border-dashed border-2 hover:border-[oklch(0.55_0.15_160/0.4)] transition-all duration-300 cursor-pointer group hover:shadow-md"
              onClick={() => setAddMemberDialogOpen(true)}
            >
              <CardContent className="p-5 flex flex-col items-center justify-center min-h-[200px]">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[oklch(0.55_0.15_160/0.1)] to-[oklch(0.55_0.15_160/0.05)] border border-[oklch(0.55_0.15_160/0.15)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <UserPlus className="h-5 w-5 text-[oklch(0.55_0.15_160)]" />
                </div>
                <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  Add a member
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Invite from workspace
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* ─── Dialogs ──────────────────────────────────────────────────────── */}
      <ManageMemberDialog
        open={manageMemberTarget !== null}
        teamId={teamManagementId}
        member={manageMemberTarget}
        onClose={() => setManageMemberTarget(null)}
        onMemberUpdated={fetchData}
      />

      <ManageTeamRolesDialog
        open={rolesDialogOpen}
        teamId={teamManagementId}
        onClose={() => setRolesDialogOpen(false)}
        onRolesChanged={fetchData}
      />

      <ManageTeamScopesDialog
        open={scopesDialogOpen}
        teamId={teamManagementId}
        onClose={() => setScopesDialogOpen(false)}
        onScopesChanged={fetchData}
      />

      <AddTeamMemberDialog
        open={addMemberDialogOpen}
        teamId={teamManagementId}
        workspaceUsers={users.length > 0 ? users : allUsers}
        existingMemberIds={existingMemberIds}
        onClose={() => setAddMemberDialogOpen(false)}
        onMemberAdded={fetchData}
      />

      {/* ─── Remove Confirmation ─────────────────────────────────────────── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-[400px] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg">Remove Member</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              Remove{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.user.name}
              </span>{" "}
              from this team? Their role and scope assignments will be lost.
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
              onClick={handleRemoveMember}
              disabled={isDeleting}
              className="flex-1"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Removing...
                </span>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

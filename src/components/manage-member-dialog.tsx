"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TeamRole, TeamScope, TeamMemberDetailed, ScopePermission } from "@/lib/types";

interface Props {
  open: boolean;
  teamId: string;
  member: TeamMemberDetailed | null;
  onClose: () => void;
  onMemberUpdated: () => void;
}

const PERMISSION_LABELS: Record<ScopePermission, string> = {
  read: "Read only",
  write: "Read & Write",
  admin: "Full access",
};

export function ManageMemberDialog({ open, teamId, member, onClose, onMemberUpdated }: Props) {
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [scopes, setScopes] = useState<TeamScope[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [scopePermissions, setScopePermissions] = useState<Record<string, ScopePermission>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (open && teamId && member) {
      setLoadingData(true);
      Promise.all([
        fetch(`/api/teams/${teamId}/roles`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/teams/${teamId}/scopes`).then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([rolesData, scopesData]) => {
          setRoles(rolesData);
          setScopes(scopesData);
          setSelectedRoleId(member.roleId || "none");

          // Build current scope permissions map
          const perms: Record<string, ScopePermission> = {};
          member.scopes.forEach((ms) => {
            perms[ms.scopeId] = ms.permission;
          });
          setScopePermissions(perms);
        })
        .catch(() => {})
        .finally(() => setLoadingData(false));
    }
  }, [open, teamId, member]);

  function toggleScopePermission(scopeId: string) {
    setScopePermissions((prev) => {
      const next = { ...prev };
      if (next[scopeId]) {
        // Cycle: read -> write -> admin -> remove
        if (next[scopeId] === "read") next[scopeId] = "write";
        else if (next[scopeId] === "write") next[scopeId] = "admin";
        else delete next[scopeId];
      } else {
        next[scopeId] = "read";
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!member || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const roleId = selectedRoleId === "none" ? null : selectedRoleId || null;
      const scopesArray = Object.entries(scopePermissions).map(([scopeId, permission]) => ({
        scopeId,
        permission,
      }));

      const res = await fetch(`/api/teams/${teamId}/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, scopes: scopesArray }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update member");
      }

      toast.success("Member updated");
      onMemberUpdated();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update member");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="h-9 w-9">
              <AvatarFallback className={cn(
                "text-xs font-bold bg-gradient-to-br text-white",
                "from-amber-400 to-orange-500"
              )}>
                {member.user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-lg">{member.user.name}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {member.user.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loadingData ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[450px] overflow-y-auto">
            {/* Role selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Team Role</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="No role assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No role</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center gap-2">
                        <span>{r.icon}</span>
                        <span>{r.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRoleId !== "none" && selectedRoleId && (
                <p className="text-xs text-muted-foreground">
                  {roles.find((r) => r.id === selectedRoleId)?.description || ""}
                </p>
              )}
            </div>

            {/* Scope permissions */}
            {scopes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Scopes</Label>
                <p className="text-xs text-muted-foreground">Click a scope to cycle through permission levels: read → write → admin → remove</p>
                <div className="space-y-1.5">
                  {scopes.map((s) => {
                    const perm = scopePermissions[s.id];
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                          perm
                            ? "bg-accent/50 border-accent"
                            : "bg-card/50 border-border/50 hover:border-border"
                        )}
                        onClick={() => toggleScopePermission(s.id)}
                      >
                        <span className="text-lg">{s.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.type}</p>
                        </div>
                        {perm ? (
                          <Badge
                            className={cn(
                              "text-[10px] px-1.5",
                              perm === "admin" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                              perm === "write" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                              perm === "read" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            )}
                          >
                            {PERMISSION_LABELS[perm]}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            No access
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {scopes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No scopes defined for this team. Create scopes first.
              </p>
            )}

            <DialogFooter className="pt-2 border-t flex-row gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.50_0.15_165)] text-white"
              >
                {isSubmitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

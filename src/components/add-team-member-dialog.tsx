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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { User, TeamRole } from "@/lib/types";

interface Props {
  open: boolean;
  teamId: string;
  workspaceUsers: User[];
  existingMemberIds: string[];
  onClose: () => void;
  onMemberAdded: () => void;
}

export function AddTeamMemberDialog({
  open,
  teamId,
  workspaceUsers,
  existingMemberIds,
  onClose,
  onMemberAdded,
}: Props) {
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Users not yet in the team
  const availableUsers = workspaceUsers.filter((u) => !existingMemberIds.includes(u.id));

  useEffect(() => {
    if (open && teamId) {
      setLoadingRoles(true);
      fetch(`/api/teams/${teamId}/roles`)
        .then((res) => (res.ok ? res.json() : []))
        .then(setRoles)
        .catch(() => {})
        .finally(() => setLoadingRoles(false));
      setUserId("");
      setRoleId("");
    }
  }, [open, teamId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          roleId: roleId || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add member");
      }

      toast.success("Member added to team");
      onMemberAdded();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">Add Team Member</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Select a workspace member to add to this team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {availableUsers.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                All workspace members are already in this team.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Member <span className="text-destructive">*</span>
                </Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select a member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[8px] bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                              {u.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{u.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Role (optional)</Label>
                <Select value={roleId} onValueChange={setRoleId} disabled={loadingRoles}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={loadingRoles ? "Loading..." : "No role assigned"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No role</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.icon} {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <DialogFooter className="pt-2 border-t flex-row gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!userId || isSubmitting || availableUsers.length === 0}
              className="flex-1 gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.50_0.15_165)] text-white"
            >
              {isSubmitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Add Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

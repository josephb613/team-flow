"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Badge,
} from "@/components/ui/badge";
import {
  Crown,
  User,
  Eye,
  X,
  Clock,
  Mail,
  CheckCircle2,
} from "lucide-react";
import type { Invitation, MemberRole } from "@/lib/types";

const roleOptions: { value: MemberRole; labelKey: string; icon: React.ElementType }[] = [
  { value: "admin", labelKey: "admin", icon: Crown },
  { value: "member", labelKey: "member", icon: User },
  { value: "guest", labelKey: "guest", icon: Eye },
];

const statusConfig = {
  pending: { color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock },
  accepted: { color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
  declined: { color: "text-rose-600", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: X },
};

export function InviteMemberDialog() {
  const {
    inviteMemberDialogOpen,
    setInviteMemberDialogOpen,
    activeWorkspaceId,
    workspaces,
    setWorkspaces,
    pendingInvitations,
    setPendingInvitations,
  } = useAppStore();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localInvitations, setLocalInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  // Fetch pending invitations when dialog opens
  const fetchInvitations = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoadingInvitations(true);
    try {
      const response = await fetch(
        `/api/workspaces/${activeWorkspaceId}/invitations?status=pending`,
      );
      if (response.ok) {
        const data = await response.json();
        setLocalInvitations(data);
        setPendingInvitations(data);
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setLoadingInvitations(false);
    }
  }, [activeWorkspaceId, setPendingInvitations]);

  useEffect(() => {
    if (inviteMemberDialogOpen) {
      fetchInvitations();
    }
  }, [inviteMemberDialogOpen, fetchInvitations]);

  // Refresh workspace data after successful invite
  const refreshWorkspace = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const response = await fetch(`/api/workspaces/${activeWorkspaceId}`);
      if (response.ok) {
        const updatedWorkspace = await response.json();
        setWorkspaces(
          workspaces.map((w) =>
            w.id === activeWorkspaceId ? {
              ...w,
              members: updatedWorkspace.members,
              ...updatedWorkspace,
            } : w,
          ),
        );
      }
    } catch (error) {
      console.error("Error refreshing workspace:", error);
    }
  }, [activeWorkspaceId, workspaces, setWorkspaces]);

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleInvite = async () => {
    if (!email.trim() || !validateEmail(email) || isSubmitting || !activeWorkspaceId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/workspaces/${activeWorkspaceId}/invitations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), role }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast.error(result.error || t.invite.userAlreadyMember);
          return;
        }
        throw new Error(result.error || t.invite.invitationError);
      }

      if (result.type === "member") {
        toast.success(t.invite.invitationSent);
        // Refresh workspace to get updated members list
        await refreshWorkspace();
      } else if (result.type === "invitation") {
        toast.success(t.invite.invitationPending);
        await fetchInvitations();
      }

      setEmail("");
      setRole("member");
      setInviteMemberDialogOpen(false);
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error(
        error instanceof Error ? error.message : t.invite.invitationError,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!activeWorkspaceId) return;
    try {
      const response = await fetch(
        `/api/workspaces/${activeWorkspaceId}/invitations/${invitationId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        setLocalInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
        toast.success(t.invite.cancellationConfirmed);
      } else {
        const err = await response.json();
        toast.error(err.error || "Failed to cancel invitation");
      }
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast.error("Failed to cancel invitation");
    }
  };

  const handleOpenChange = (open: boolean) => {
    setInviteMemberDialogOpen(open);
    if (!open) {
      setEmail("");
      setRole("member");
    }
  };

  const isEmailValid = email.length === 0 || validateEmail(email);

  return (
    <Dialog open={inviteMemberDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 gap-0 overflow-hidden">
        {/* Gradient Header */}
        <div className="relative px-6 pt-6 pb-4">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              background: `linear-gradient(135deg, #10b981 0%, transparent 60%)`,
            }}
          />
          <DialogHeader className="relative">
            <DialogTitle className="text-lg font-semibold">
              {t.invite.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {activeWorkspace?.name
                ? `${t.members.inviteMember} — ${activeWorkspace.name}`
                : t.members.inviteMember}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-2 space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="invite-email" className="text-sm font-medium">
              {t.invite.emailLabel}
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder={t.invite.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "h-10",
                email.length > 0 && !isEmailValid && "border-rose-500 focus-visible:ring-rose-500",
              )}
            />
            {email.length > 0 && !isEmailValid && (
              <p className="text-xs text-rose-500 mt-1">
                Please enter a valid email address
              </p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t.invite.roleLabel}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map((opt) => {
                const isActive = role === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all",
                      isActive
                        ? "bg-[oklch(0.55_0.15_160/0.1)] border-[oklch(0.55_0.15_160/0.3)] text-[oklch(0.45_0.15_160)] shadow-sm"
                        : "bg-muted/30 border-transparent hover:bg-muted/50 text-muted-foreground",
                    )}
                    onClick={() => setRole(opt.value)}
                  >
                    <Icon className="h-4 w-4" />
                    {t.members[opt.value as keyof typeof t.members] as string}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pending Invitations */}
          {(localInvitations.length > 0 || loadingInvitations) && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t.invite.pendingInvitations}
              </Label>
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {loadingInvitations ? (
                  <div className="flex items-center justify-center py-4">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[oklch(0.55_0.15_160)] border-t-transparent" />
                  </div>
                ) : (
                  localInvitations.map((inv) => {
                    const sc = statusConfig[inv.status as keyof typeof statusConfig];
                    const StatusIcon = sc.icon;
                    return (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {inv.email}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {t.invite.invitedBy}{" "}
                              {inv.invitedBy?.name || "..."}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-2 py-0 gap-1 font-medium",
                              sc.bg,
                              sc.color,
                              sc.border,
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {t.invite[inv.status as keyof typeof t.invite] as string}
                          </Badge>
                          {inv.status === "pending" && (
                            <button
                              type="button"
                              className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => handleCancelInvitation(inv.id)}
                              title={t.invite.cancelInvitation}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t mt-2 flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="flex-1"
          >
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleInvite}
            disabled={
              !email.trim() || !isEmailValid || isSubmitting
            }
            className="flex-1 bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.50_0.15_160)] text-white"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t.invite.sendingInvitation}
              </span>
            ) : (
              t.invite.sendInvitation
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  X,
  Mail,
  Shield,
  Crown,
  User,
  Eye,
  Clock,
  Calendar,
  MoreHorizontal,
  CheckCircle2,
  MessageSquare,
  Trash2,
} from "lucide-react";
import type { MemberRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Role Config ─────────────────────────────────────────────────────────────
const roleConfig: Record<
  MemberRole,
  {
    color: string;
    bg: string;
    border: string;
    icon: React.ElementType;
    gradient: string;
    label: string;
  }
> = {
  admin: {
    color: "text-teal-700",
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    icon: Crown,
    gradient: "from-teal-500 to-teal-600",
    label: "Admin",
  },
  member: {
    color: "text-emerald-700",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: User,
    gradient: "from-emerald-500 to-emerald-600",
    label: "Member",
  },
  guest: {
    color: "text-amber-700",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: Eye,
    gradient: "from-amber-500 to-amber-600",
    label: "Guest",
  },
};

// ─── Status Config ───────────────────────────────────────────────────────────
const statusConfig: Record<
  string,
  { color: string; ring: string; label: string; pulse: boolean; textColor: string }
> = {
  online: {
    color: "bg-emerald-500",
    ring: "ring-emerald-500/20",
    label: "Online",
    pulse: true,
    textColor: "text-emerald-600",
  },
  away: {
    color: "bg-amber-500",
    ring: "ring-amber-500/20",
    label: "Away",
    pulse: false,
    textColor: "text-amber-600",
  },
  busy: {
    color: "bg-rose-500",
    ring: "ring-rose-500/20",
    label: "Busy",
    pulse: false,
    textColor: "text-rose-600",
  },
  offline: {
    color: "bg-slate-400",
    ring: "ring-slate-400/20",
    label: "Offline",
    pulse: false,
    textColor: "text-slate-500",
  },
};

// ─── Avatar Gradients ────────────────────────────────────────────────────────
const avatarGradients = [
  "from-teal-400 to-cyan-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-cyan-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-pink-400 to-rose-500",
  "from-orange-400 to-amber-500",
  "from-violet-400 to-purple-500",
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarGradients[Math.abs(hash) % avatarGradients.length];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function MemberDetailDrawer() {
  const {
    memberDetailOpen,
    setMemberDetailOpen,
    selectedMember,
    setSelectedMember,
  } = useAppStore();
  const { t } = useTranslation();
  const [currentRole, setCurrentRole] = useState<MemberRole | null>(null);

  if (!selectedMember) return null;

  const member = selectedMember;
  const role = roleConfig[(currentRole || member.workspaceRole || member.role) as MemberRole] || roleConfig.member;
  const status = statusConfig[member.status] || statusConfig.offline;
  const RoleIcon = role.icon;
  const gradient = getAvatarGradient(member.name);

  const handleRoleChange = (newRole: MemberRole) => {
    setCurrentRole(newRole);
    // Update the member in store
    setSelectedMember({ ...member, workspaceRole: newRole });
    const cfg = roleConfig[newRole];
    toast.success(
      `${t.members.roleChangedTo || "Role changed to"} ${cfg.label}`,
    );
  };

  const handleRemoveFromWorkspace = () => {
    toast.success(`${member.name} ${t.members.removedFromWorkspace || "has been removed from workspace"}`);
    setMemberDetailOpen(false);
  };

  const handleSendMessage = () => {
    // Naviguer vers la vue messages
    useAppStore.getState().setActivePage("messages");
    setMemberDetailOpen(false);
    toast.info(`${t.members.openingMessages || "Opening messages with"} ${member.name}`);
  };

  return (
    <Sheet open={memberDetailOpen} onOpenChange={setMemberDetailOpen}>
      <SheetContent className="w-full sm:max-w-[480px] p-0 gap-0 overflow-y-auto [&>button]:hidden">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Large Avatar */}
              <div className="relative">
                <div
                  className={cn(
                    "h-16 w-16 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xl font-bold shadow-lg",
                    gradient,
                  )}
                >
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                {/* Status indicator */}
                <div
                  className={cn(
                    "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-background ring-2",
                    status.color,
                    status.ring,
                  )}
                >
                  {status.pulse && (
                    <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                  )}
                </div>
              </div>
              <div>
                <SheetTitle className="text-lg leading-tight">
                  {member.name}
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {member.email}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-2 py-0.5 gap-1 font-medium",
                      role.bg,
                      role.color,
                      role.border,
                    )}
                  >
                    <RoleIcon className="h-3 w-3" />
                    {role.label}
                  </Badge>
                  <span
                    className={cn(
                      "text-[11px] font-medium flex items-center gap-1",
                      status.textColor,
                    )}
                  >
                    <span
                      className={cn("w-1.5 h-1.5 rounded-full", status.color)}
                    />
                    {status.label}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleSendMessage}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {t.members.sendMessage || "Send Message"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleRemoveFromWorkspace}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t.members.removeFromWorkspace || "Remove from workspace"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMemberDetailOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {/* Contact Info */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t.members.contactInfo || "Contact Information"}
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className="h-8 w-8 rounded-lg bg-[oklch(0.55_0.15_160)/10] flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-[oklch(0.55_0.15_160)]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t.members.email || "Email"}
                  </p>
                  <p className="text-sm font-medium">{member.email}</p>
                </div>
              </div>

              {member.joinedAt && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="h-8 w-8 rounded-lg bg-[oklch(0.55_0.15_160)/10] flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-[oklch(0.55_0.15_160)]" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t.members.joinedAt || "Joined at"}
                    </p>
                    <p className="text-sm font-medium">
                      {formatDate(member.joinedAt)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className="h-8 w-8 rounded-lg bg-[oklch(0.55_0.15_160)/10] flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-[oklch(0.55_0.15_160)]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t.members.status || "Status"}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-medium capitalize",
                      status.textColor,
                    )}
                  >
                    {status.label}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Role Management */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t.members.changeRole || "Change Role"}
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              {t.members.changeRoleDesc ||
                "Select a new workspace role for this member"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(roleConfig) as MemberRole[]).map((key) => {
                const cfg = roleConfig[key];
                const CfgIcon = cfg.icon;
                const isActive =
                  (currentRole || member.workspaceRole || member.role) === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleRoleChange(key)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 text-center",
                      isActive
                        ? `${cfg.bg} ${cfg.border} ${cfg.color} shadow-sm ring-1 ring-offset-1 ring-offset-background ${cfg.border}`
                        : "border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-border",
                    )}
                  >
                    <CfgIcon
                      className={cn(
                        "h-5 w-5",
                        isActive ? "" : "text-muted-foreground",
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isActive ? "" : "text-muted-foreground",
                      )}
                    >
                      {cfg.label}
                    </span>
                    {isActive && (
                      <CheckCircle2 className="h-3 w-3 absolute top-1 right-1 text-[oklch(0.55_0.15_160)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t.members.actions || "Actions"}
            </h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-sm h-10"
                onClick={handleSendMessage}
              >
                <MessageSquare className="h-4 w-4 mr-2 text-[oklch(0.55_0.15_160)]" />
                {t.members.sendMessage || "Send Message"}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-sm h-10 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={handleRemoveFromWorkspace}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t.members.removeFromWorkspace || "Remove from workspace"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

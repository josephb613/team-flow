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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { TeamRole } from "@/lib/types";

interface Props {
  open: boolean;
  teamId: string;
  onClose: () => void;
  onRolesChanged: () => void;
}

const ROLE_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4",
];
const ROLE_ICONS = ["👤", "👑", "⭐", "🛡️", "🎯", "💡", "🔧", "📋"];

export function ManageTeamRolesDialog({ open, teamId, onClose, onRolesChanged }: Props) {
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [icon, setIcon] = useState("👤");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && teamId) {
      fetchRoles();
    }
  }, [open, teamId]);

  async function fetchRoles() {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/roles`);
      if (res.ok) setRoles(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setDescription("");
    setColor("#6366f1");
    setIcon("👤");
    setEditId(null);
  }

  function startEdit(role: TeamRole) {
    setEditId(role.id);
    setName(role.name);
    setDescription(role.description || "");
    setColor(role.color);
    setIcon(role.icon);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const url = editId
        ? `/api/teams/${teamId}/roles/${editId}`
        : `/api/teams/${teamId}/roles`;
      const method = editId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, color, icon }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save role");
      }

      toast.success(editId ? "Role updated" : "Role created");
      resetForm();
      fetchRoles();
      onRolesChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save role");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(roleId: string, roleName: string) {
    if (!confirm(`Delete role "${roleName}"? Members with this role will be unassigned.`)) return;

    try {
      const res = await fetch(`/api/teams/${teamId}/roles/${roleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete role");
      toast.success("Role deleted");
      fetchRoles();
      onRolesChanged();
    } catch {
      toast.error("Failed to delete role");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">Manage Team Roles</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Create and customize roles for this team.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
          {/* Existing roles list */}
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : roles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No roles yet. Create your first role below.
            </p>
          ) : (
            <div className="space-y-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors"
                >
                  <span className="text-lg">{role.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{role.name}</p>
                    {role.description && (
                      <p className="text-xs text-muted-foreground truncate">{role.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(role)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(role.id, role.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create / Edit form */}
          <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {editId ? "Edit Role" : "New Role"}
              </Label>
              {editId && (
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={resetForm}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {/* Icon selector */}
              <div className="flex flex-wrap gap-1 p-2 border rounded-lg bg-muted/30">
                {ROLE_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    className={`w-8 h-8 flex items-center justify-center rounded text-base transition-colors ${
                      icon === ic ? "bg-background ring-2 ring-primary shadow-sm" : "hover:bg-background/50"
                    }`}
                    onClick={() => setIcon(ic)}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {ROLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="role-name"
                placeholder="e.g. Lead Tech, Reviewer, QA"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-desc" className="text-sm font-medium">Description</Label>
              <Textarea
                id="role-desc"
                placeholder="Optional description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>

            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="w-full gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.50_0.15_165)] text-white"
            >
              {isSubmitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : editId ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editId ? "Update Role" : "Create Role"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

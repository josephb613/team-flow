"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { TeamScope, ScopeType } from "@/lib/types";

interface Props {
  open: boolean;
  teamId: string;
  onClose: () => void;
  onScopesChanged: () => void;
}

const SCOPE_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4",
];
const SCOPE_ICONS = ["🎨", "⚛️", "🚀", "🧪", "🔒", "📊", "💬", "📝", "🔄", "👁️"];

export function ManageTeamScopesDialog({ open, teamId, onClose, onScopesChanged }: Props) {
  const [scopes, setScopes] = useState<TeamScope[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ScopeType>("functional");
  const [icon, setIcon] = useState("🎯");
  const [color, setColor] = useState("#6366f1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && teamId) fetchScopes();
  }, [open, teamId]);

  async function fetchScopes() {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/scopes`);
      if (res.ok) setScopes(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setDescription("");
    setType("functional");
    setIcon("🎯");
    setColor("#6366f1");
    setEditId(null);
  }

  function startEdit(s: TeamScope) {
    setEditId(s.id);
    setName(s.name);
    setDescription(s.description || "");
    setType(s.type);
    setIcon(s.icon);
    setColor(s.color);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const url = editId
        ? `/api/teams/${teamId}/scopes/${editId}`
        : `/api/teams/${teamId}/scopes`;
      const method = editId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, type, icon, color }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save scope");
      }

      toast.success(editId ? "Scope updated" : "Scope created");
      resetForm();
      fetchScopes();
      onScopesChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save scope");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(scopeId: string, scopeName: string) {
    if (!confirm(`Delete scope "${scopeName}"? All member assignments will be removed.`)) return;

    try {
      const res = await fetch(`/api/teams/${teamId}/scopes/${scopeId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete scope");
      toast.success("Scope deleted");
      fetchScopes();
      onScopesChanged();
    } catch {
      toast.error("Failed to delete scope");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">Manage Team Scopes</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Define functional domains and permission areas for this team.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
          {/* Existing scopes */}
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : scopes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No scopes yet. Create your first scope below.
            </p>
          ) : (
            <div className="space-y-2">
              {scopes.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors"
                >
                  <span className="text-lg">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{s.name}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {s.type}
                      </Badge>
                    </div>
                    {s.description && (
                      <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(s.id, s.name)}
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
                {editId ? "Edit Scope" : "New Scope"}
              </Label>
              {editId && (
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={resetForm}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-1 p-2 border rounded-lg bg-muted/30">
              {SCOPE_ICONS.map((ic) => (
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

            <div className="flex gap-2">
              {SCOPE_COLORS.map((c) => (
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
              <Label htmlFor="scope-type" className="text-sm font-medium">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ScopeType)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="functional">Functional (domain)</SelectItem>
                  <SelectItem value="permission">Permission (access)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope-name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="scope-name"
                placeholder="e.g. Frontend Dev, Code Review, Deploy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope-desc" className="text-sm font-medium">Description</Label>
              <Textarea
                id="scope-desc"
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
              {editId ? "Update Scope" : "Create Scope"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

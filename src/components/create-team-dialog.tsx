"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS = [
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#84cc16",
  "#6366f1",
];

export function CreateTeamDialog() {
  const {
    createTeamDialogOpen,
    setCreateTeamDialogOpen,
    activeWorkspaceId,
    triggerTeamRefetch,
  } = useAppStore();
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#10b981");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setColor("#10b981");
  };

  const handleOpenChange = (open: boolean) => {
    setCreateTeamDialogOpen(open);
    if (!open) resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    if (!activeWorkspaceId) {
      toast.error(t.errors.noWorkspaceSelected || "Veuillez selectionner un espace de travail");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
          workspaceId: activeWorkspaceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create team");
      }

      toast.success(t.toast.teamCreated || "Équipe créée avec succès");
      triggerTeamRefetch();
      setCreateTeamDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating team:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create team",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={createTeamDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">{t.createTeam.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="team-name" className="text-sm font-medium">
              {t.createTeam.teamName}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="team-name"
              placeholder={t.createTeam.teamNamePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-desc" className="text-sm font-medium">
              {t.createTeam.description}
            </Label>
            <Textarea
              id="team-desc"
              placeholder={t.createTeam.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t.createTeam.color}
            </Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "h-8 w-8 rounded-full transition-all flex items-center justify-center",
                    color === c
                      ? "ring-2 ring-offset-2 ring-offset-background scale-110"
                      : "hover:scale-110",
                  )}
                  style={{
                    backgroundColor: c,
                    ...(color === c
                      ? {
                          boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${c}`,
                        }
                      : {}),
                  }}
                  onClick={() => setColor(c)}
                >
                  {color === c && (
                    <svg
                      className="h-3.5 w-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-xl border bg-muted/30 overflow-hidden">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm border border-white/10 shrink-0"
                style={{ backgroundColor: color + "20", color }}
              >
                {name.trim() ? name.trim().charAt(0).toUpperCase() : "?"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {name || t.createTeam.teamNamePlaceholder}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {description || t.createTeam.descriptionPlaceholder}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t.createTeam.cancel}
            </Button>
            <Button
              type="submit"
              className="bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.48_0.15_160)] text-white"
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t.createTeam.create}...
                </span>
              ) : (
                t.createTeam.create
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

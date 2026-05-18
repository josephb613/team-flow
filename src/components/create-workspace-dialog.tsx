"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EMOJI_OPTIONS = [
  "🏢",
  "🏠",
  "🚀",
  "🎨",
  "💡",
  "🔧",
  "📊",
  "🎯",
  "⚡",
  "🔥",
  "💎",
  "🌟",
  "🎪",
  "🎲",
  "🧩",
  "🎵",
  "📱",
  "🌍",
  "🏆",
  "🛡️",
  "⚙️",
  "🔬",
  "📐",
];

const COLOR_OPTIONS = [
  "#10b981",
  "#14b8a6",
  "#059669",
  "#0d9488",
  "#f59e0b",
  "#d97706",
  "#ef4444",
  "#dc2626",
  "#8b5cf6",
  "#7c3aed",
  "#ec4899",
  "#db2777",
  "#06b6d4",
  "#0891b2",
  "#84cc16",
  "#65a30d",
  "#f97316",
  "#ea580c",
  "#6366f1",
  "#4f46e5",
];

export function CreateWorkspaceDialog() {
  const {
    createWorkspaceDialogOpen,
    setCreateWorkspaceDialogOpen,
    addWorkspace,
  } = useAppStore();
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🏢");
  const [selectedColor, setSelectedColor] = useState("#10b981");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          description: description.trim() || null,
          color: selectedColor,
          icon: selectedEmoji,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create workspace");
      }

      const createdWorkspace = await response.json();

      addWorkspace({
        id: createdWorkspace.id,
        name: createdWorkspace.name,
        slug: createdWorkspace.slug,
        color: createdWorkspace.color,
        icon: createdWorkspace.icon,
        createdAt: createdWorkspace.createdAt,
      });

      toast.success(t.toast.workspaceCreated);
      setCreateWorkspaceDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating workspace:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create workspace",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedEmoji("🏢");
    setSelectedColor("#10b981");
  };

  const handleOpenChange = (open: boolean) => {
    setCreateWorkspaceDialogOpen(open);
    if (!open) resetForm();
  };

  return (
    <Dialog open={createWorkspaceDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Gradient Header */}
        <div className="relative px-5 pt-4 pb-3 shrink-0">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              background: `linear-gradient(135deg, ${selectedColor} 0%, transparent 60%)`,
            }}
          />
          <DialogHeader className="relative">
            <DialogTitle className="text-base font-semibold">
              {t.createWorkspace.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t.createWorkspace.descriptionPlaceholder}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 space-y-3 overflow-y-auto flex-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="ws-name" className="text-xs font-medium">
              {t.createWorkspace.name}
            </Label>
            <Input
              id="ws-name"
              placeholder={t.createWorkspace.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ws-desc" className="text-xs font-medium">
              {t.createWorkspace.description}
            </Label>
            <Textarea
              id="ws-desc"
              placeholder={t.createWorkspace.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[52px] resize-none"
            />
          </div>

          {/* Icon Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {t.createWorkspace.icon}
            </Label>
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center text-sm transition-all",
                    selectedEmoji === emoji
                      ? "bg-[oklch(0.55_0.15_160/0.15)] ring-2 ring-[oklch(0.55_0.15_160)] scale-110"
                      : "hover:bg-muted/50",
                  )}
                  onClick={() => setSelectedEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {t.createWorkspace.color}
            </Label>
            <div className="grid grid-cols-10 gap-1">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "h-6 w-6 rounded-full transition-all flex items-center justify-center",
                    selectedColor === color
                      ? "ring-2 ring-offset-2 ring-offset-background scale-110"
                      : "hover:scale-110",
                  )}
                  style={{
                    backgroundColor: color,
                    ...(selectedColor === color
                      ? {
                          boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${color}`,
                        }
                      : {}),
                  }}
                  onClick={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <svg
                      className="h-2.5 w-2.5 text-white"
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
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {t.createWorkspace.preview}
            </Label>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-base font-bold shadow-sm"
                  style={{ backgroundColor: selectedColor }}
                >
                  {selectedEmoji}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {name || t.createWorkspace.namePlaceholder}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {description || t.createWorkspace.descriptionPlaceholder}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 border-t flex-row gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="flex-1"
          >
            {t.createWorkspace.cancel}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || isSubmitting}
            className="flex-1 bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.50_0.15_160)] text-white"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t.createWorkspace.create}...
              </span>
            ) : (
              t.createWorkspace.create
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

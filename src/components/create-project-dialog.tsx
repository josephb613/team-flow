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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const colorOptions = [
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#f97316",
  "#14b8a6",
];

const iconOptions = [
  "🌐",
  "📱",
  "⚡",
  "📢",
  "📊",
  "🔒",
  "🎨",
  "🚀",
  "📋",
  "🏠",
];

export function CreateProjectDialog() {
  const {
    createProjectDialogOpen,
    setCreateProjectDialogOpen,
    activeWorkspaceId,
  } = useAppStore();
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#10b981");
  const [icon, setIcon] = useState("📋");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setColor("#10b981");
    setIcon("📋");
    setDueDate("");
  };

  const handleOpenChange = (open: boolean) => {
    setCreateProjectDialogOpen(open);
    if (!open) resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
          icon,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          workspaceId: activeWorkspaceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create project");
      }

      toast.success(t.toast.projectCreated);
      setCreateProjectDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t.toast.projectCreated + " failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={createProjectDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">{t.createProject.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-sm font-medium">
              {t.createProject.projectName}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project-name"
              placeholder={t.createProject.projectNamePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-desc" className="text-sm font-medium">
              {t.createProject.description}
            </Label>
            <Textarea
              id="project-desc"
              placeholder={t.createProject.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-dueDate" className="text-sm font-medium">
              {t.tasks.dueDate}
            </Label>
            <Input
              id="project-dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Icon & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t.createProject.icon}
              </Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="w-fit h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((i) => (
                    <SelectItem key={i} value={i}>
                      <span className="text-lg">{i}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t.createProject.color}
              </Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger className="w-fit h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      <span
                        className="inline-block w-4 h-4 rounded-full border border-border mr-2"
                        style={{ backgroundColor: c }}
                      />
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-xl border bg-muted/30 overflow-hidden">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: color + "20", color }}
              >
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {name || t.createProject.projectNamePlaceholder}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {description || t.createProject.descriptionPlaceholder}
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
              {t.createProject.cancel}
            </Button>
            <Button
              type="submit"
              className="bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.48_0.15_160)] text-white"
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t.createProject.create}...
                </span>
              ) : (
                t.createProject.create
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

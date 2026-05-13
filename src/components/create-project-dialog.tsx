"use client";

import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Upload, X, ImageIcon } from "lucide-react";

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
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [color, setColor] = useState("#10b981");
  const [icon, setIcon] = useState("📋");
  const [dueDate, setDueDate] = useState("");
  const [logo, setLogo] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSourceUrl("");
    setColor("#10b981");
    setIcon("📋");
    setDueDate("");
    setLogo("");
    setLogoFile(null);
    setLogoPreview("");
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation côté client
    const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez PNG, JPG, SVG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    setLogo("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return logo || null;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", logoFile);

      const res = await fetch("/api/projects/upload-logo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec du téléversement du logo");
      }

      const data = await res.json();
      return data.url;
    } catch (error) {
      console.error("Logo upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Échec du téléversement",
      );
      return null;
    } finally {
      setIsUploadingLogo(false);
    }
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
      // Upload du logo d'abord si présent
      const logoUrl = await uploadLogo();
      if (logoFile && !logoUrl) {
        // L'upload a échoué, on arrête
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          logo: logoUrl || null,
          sourceUrl: sourceUrl.trim() || null,
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
      queryClient.invalidateQueries({ queryKey: ["projects"] });
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
            <Label htmlFor="project-sourceUrl" className="text-sm font-medium">
              {t.createProject.sourceUrl}
            </Label>
            <Input
              id="project-sourceUrl"
              type="url"
              placeholder={t.createProject.sourceUrlPlaceholder}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="h-10"
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

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t.createProject.logo}
            </Label>
            <div className="flex items-start gap-3">
              {/* Preview or upload button */}
              <div className="relative">
                {logoPreview ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border bg-muted/30">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-[oklch(0.55_0.15_160)]/50 hover:text-[oklch(0.55_0.15_160)] transition-colors bg-muted/20"
                  >
                    <ImageIcon className="h-5 w-5" />
                    <span className="text-[9px] font-medium">Logo</span>
                  </button>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-2">
                  {t.createProject.logoHint}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {logoPreview ? t.createProject.changeLogo : t.createProject.uploadLogo}
                </Button>
              </div>
            </div>
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
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 overflow-hidden"
                style={{ backgroundColor: color + "20", color }}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  icon
                )}
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

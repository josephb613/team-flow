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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Hash, Lock, User } from "lucide-react";

const typeOptions = [
  { value: "team", labelKey: "typeTeam" as const, icon: Hash },
  { value: "project", labelKey: "typeProject" as const, icon: Lock },
  { value: "direct", labelKey: "typeDirect" as const, icon: User },
];

export function CreateChannelDialog() {
  const {
    createChannelDialogOpen,
    setCreateChannelDialogOpen,
    activeWorkspaceId,
    addChannel,
  } = useAppStore();
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [type, setType] = useState("team");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setType("team");
  };

  const handleOpenChange = (open: boolean) => {
    setCreateChannelDialogOpen(open);
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
      const response = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          workspaceId: activeWorkspaceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create channel");
      }

      const newChannel = await response.json();
      addChannel(newChannel);
      toast.success(t.toast.channelCreated);
      setCreateChannelDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error creating channel:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t.toast.channelCreated + " failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTypeOption = typeOptions.find((o) => o.value === type);
  const TypeIcon = selectedTypeOption?.icon || Hash;

  return (
    <Dialog open={createChannelDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg">{t.createChannel.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="channel-name" className="text-sm font-medium">
              {t.createChannel.channelName}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="channel-name"
              placeholder={t.createChannel.channelNamePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t.createChannel.type}
            </Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <opt.icon className="h-4 w-4 text-muted-foreground" />
                      {t.createChannel[opt.labelKey]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-xl border bg-muted/30 overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[oklch(0.55_0.15_160/0.12)]">
                <TypeIcon className="h-5 w-5 text-[oklch(0.55_0.15_160)]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {name || t.createChannel.channelNamePlaceholder}
                </p>
                <p className="text-xs text-muted-foreground">
                  {type === "team"
                    ? t.createChannel.typeTeam
                    : type === "project"
                      ? t.createChannel.typeProject
                      : t.createChannel.typeDirect}
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
              {t.createChannel.cancel}
            </Button>
            <Button
              type="submit"
              className="bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.48_0.15_160)] text-white"
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t.createChannel.create}...
                </span>
              ) : (
                t.createChannel.create
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Target,
  FileText,
  CircleDot,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { OpportunityStatus } from "@/lib/types";

const STATUSES: OpportunityStatus[] = [
  "prospection",
  "qualification",
  "proposition",
  "negociation",
  "gagnee",
  "perdue",
];

export function CreateOpportunityDialog() {
  const { t } = useTranslation();
  const createDialogOpen = useAppStore(
    (s) => s.createOpportunityDialogOpen,
  );
  const setCreateDialogOpen = useAppStore(
    (s) => s.setCreateOpportunityDialogOpen,
  );
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<OpportunityStatus>("prospection");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleError, setTitleError] = useState("");

  // Reset form on close
  const handleOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setTitle("");
      setDescription("");
      setStatus("prospection");
      setDueDate(undefined);
      setTitleError("");
      setIsSubmitting(false);
    }
  };

  const validate = (): boolean => {
    if (!title.trim()) {
      setTitleError(t.createOpportunity.titleRequired);
      return false;
    }
    setTitleError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          status,
          dueDate: dueDate?.toISOString() || null,
          workspaceId: activeWorkspaceId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Creation failed");
      }

      toast.success(t.toast.opportunityCreated);
      setCreateDialogOpen(false);
      // Force refetch
      window.location.reload();
    } catch {
      toast.error("Erreur lors de la création de l'opportunité");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={createDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-[oklch(0.55_0.15_160/0.12)] to-[oklch(0.55_0.15_160/0.04)] px-6 py-5 border-b border-border/40">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-[oklch(0.55_0.15_160)]" />
              {t.createOpportunity.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t.createOpportunity.title}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              {t.createOpportunity.opportunityTitle}
            </label>
            <Input
              placeholder={t.createOpportunity.opportunityTitlePlaceholder}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError("");
              }}
              maxLength={200}
              className={cn(titleError && "border-red-500")}
            />
            {titleError && (
              <p className="text-xs text-red-500">{titleError}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {t.createOpportunity.description}
            </label>
            <Textarea
              placeholder={t.createOpportunity.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Status + Due Date row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <CircleDot className="h-3.5 w-3.5" />
                {t.createOpportunity.status}
              </label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as OpportunityStatus)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            s === "prospection"
                              ? "bg-blue-500"
                              : s === "qualification"
                                ? "bg-indigo-500"
                                : s === "proposition"
                                  ? "bg-amber-500"
                                  : s === "negociation"
                                    ? "bg-orange-500"
                                    : s === "gagnee"
                                      ? "bg-emerald-500"
                                      : "bg-red-500",
                          )}
                        />
                        {t.opportunities.statuses[
                          s as keyof typeof t.opportunities.statuses
                        ] || s}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {t.createOpportunity.dueDate}
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal text-sm",
                      !dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarDays className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    {dueDate
                      ? dueDate.toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : t.createOpportunity.selectDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isSubmitting}
              size="sm"
            >
              {t.createOpportunity.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.55_0.15_180)] text-white hover:opacity-90"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t.createOpportunity.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { useApiQuery } from "@/hooks/use-api-query";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DEFAULT_OPPORTUNITY_COLUMNS } from "@/lib/column-utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Sparkles,
  Type,
  FileText,
  CircleDot,
  UserCircle,
  CalendarDays,
  Building2,
} from "lucide-react";

const TITLE_MAX_LENGTH = 200;

export function CreateOpportunityDialog() {
  const { createOpportunityDialogOpen, setCreateOpportunityDialogOpen, activeWorkspaceId, workspaces, editingOpportunity, setEditingOpportunity } = useAppStore();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const isEditMode = editingOpportunity !== null;

  const effectiveWorkspaceId = activeWorkspaceId || workspaces[0]?.id || "";

  // useApiQuery auto-adds workspaceId when scoped=true (default)
  const { data: usersData } = useApiQuery<User[]>("/api/users");
  const users = usersData || [];

  const [title, setTitle] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("nouveau");
  const [responsableId, setResponsableId] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pré-remplir le formulaire en mode édition
  useEffect(() => {
    if (editingOpportunity && createOpportunityDialogOpen) {
      setTitle(editingOpportunity.title || "");
      setOrganisation(editingOpportunity.organisation || "");
      setDescription(editingOpportunity.description || "");
      setStatus(editingOpportunity.status || "nouveau");
      setResponsableId(editingOpportunity.responsableId || "");
      setDueDate(editingOpportunity.dueDate ? new Date(editingOpportunity.dueDate) : undefined);
      setTitleError("");
    }
  }, [editingOpportunity, createOpportunityDialogOpen]);

  const resetForm = useCallback(() => {
    setTitle("");
    setOrganisation("");
    setDescription("");
    setStatus("nouveau");
    setResponsableId("");
    setDueDate(undefined);
    setTitleError("");
  }, []);

  const handleOpenChange = (open: boolean) => {
    setCreateOpportunityDialogOpen(open);
    if (!open) {
      resetForm();
      setEditingOpportunity(null);
    }
  };

  const validate = (): boolean => {
    if (!title.trim()) {
      setTitleError(t.createOpportunity.titleRequired);
      return false;
    }
    setTitleError("");
    if (!effectiveWorkspaceId && !isEditMode) {
      toast.error("Aucun espace de travail actif");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const method = isEditMode ? "PATCH" : "POST";
      const url = isEditMode ? `/api/opportunities/${editingOpportunity!.id}` : "/api/opportunities";
      const body: Record<string, unknown> = {
        title: title.trim(),
        organisation: organisation.trim() || null,
        description: description.trim() || null,
        status,
        responsableId: responsableId || null,
        dueDate: dueDate?.toISOString() || null,
      };
      if (!isEditMode) {
        body.workspaceId = effectiveWorkspaceId;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to ${isEditMode ? "update" : "create"} opportunity`);
      }

      toast.success(isEditMode ? t.toast.opportunityUpdated : t.toast.opportunityCreated);
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      setCreateOpportunityDialogOpen(false);
      resetForm();
      setEditingOpportunity(null);
    } catch (error) {
      toast.error(`Erreur lors de la ${isEditMode ? "mise a jour" : "creation"} de l'opportunite`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedResponsable = users.find((u) => u.id === responsableId);

  const columnsOpp = useAppStore((s) => s.columnsOpportunity);
  const statusOptions = useMemo(() => {
    const cols = columnsOpp.length > 0 ? columnsOpp : DEFAULT_OPPORTUNITY_COLUMNS;
    return cols
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        value: c.slug,
        label: c.name,
        color: c.color,
      }));
  }, [columnsOpp]);

  return (
    <Dialog open={createOpportunityDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[540px] max-h-[90vh] p-0 gap-0 overflow-y-auto"
        showCloseButton={false}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {/* Gradient Header */}
          <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-[oklch(0.55_0.15_160/0.08)] via-[oklch(0.55_0.15_160/0.04)] to-transparent border-b">
            <div className="absolute top-3 right-4 text-[oklch(0.55_0.15_160/0.15)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-[oklch(0.55_0.15_160)] to-[oklch(0.48_0.12_160)] text-white shadow-sm">
                  <Target className="h-4 w-4" />
                </div>
                <span className="bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.45_0.12_160)] bg-clip-text text-transparent font-bold">
                  {isEditMode ? t.createOpportunity.editTitle : t.createOpportunity.title}
                </span>
              </DialogTitle>
              <DialogDescription className="sr-only">
                {isEditMode ? t.createOpportunity.editTitle : t.createOpportunity.title}
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label
                htmlFor="opp-title"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <Type className="h-3.5 w-3.5 text-muted-foreground" />
                {t.createOpportunity.opportunityTitle}{" "}
                <span className="text-destructive text-xs">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="opp-title"
                  placeholder={t.createOpportunity.opportunityTitlePlaceholder}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value.slice(0, TITLE_MAX_LENGTH));
                    if (titleError) setTitleError("");
                  }}
                  className={cn(
                    "h-10 pr-16",
                    titleError
                      ? "border-destructive focus-visible:ring-destructive/30"
                      : "focus-visible:ring-[oklch(0.55_0.15_160/0.3)]",
                  )}
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums">
                  {title.length}/{TITLE_MAX_LENGTH}
                </span>
              </div>
              <AnimatePresence>
                {titleError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-xs text-destructive"
                  >
                    {titleError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Organisation */}
            <div className="space-y-2">
              <Label
                htmlFor="opp-org"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                {t.createOpportunity.organisation}
              </Label>
              <Input
                id="opp-org"
                placeholder={t.createOpportunity.organisationPlaceholder}
                value={organisation}
                onChange={(e) => setOrganisation(e.target.value)}
                className="h-10 focus-visible:ring-[oklch(0.55_0.15_160/0.3)]"
              />
            </div>

            {/* Status & Responsable row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
                  {t.createOpportunity.status}
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-10 focus:ring-[oklch(0.55_0.15_160/0.3)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: opt.color }}
                          />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  {t.createOpportunity.responsable}
                </Label>
                <Select value={responsableId} onValueChange={setResponsableId}>
                  <SelectTrigger className="h-10 focus:ring-[oklch(0.55_0.15_160/0.3)]">
                    <SelectValue placeholder={t.createOpportunity.selectResponsable}>
                      {selectedResponsable ? (
                        <span className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.55_0.15_160)] to-[oklch(0.48_0.12_160)] text-white text-[10px] font-medium shrink-0">
                            {selectedResponsable.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                          <span className="truncate">
                            {selectedResponsable.name}
                          </span>
                        </span>
                      ) : (
                        t.createOpportunity.selectResponsable
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <span className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.55_0.15_160)] to-[oklch(0.48_0.12_160)] text-white text-[10px] font-medium shrink-0">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                          <span className="truncate">{user.name}</span>
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full ml-auto shrink-0",
                              user.status === "online"
                                ? "bg-emerald-500"
                                : user.status === "away"
                                  ? "bg-amber-500"
                                  : user.status === "busy"
                                    ? "bg-rose-500"
                                    : "bg-muted-foreground/40",
                            )}
                          />
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                {t.createOpportunity.dueDate}
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-10 w-full justify-start text-left font-normal focus:ring-[oklch(0.55_0.15_160/0.3)]",
                      !dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dueDate
                      ? dueDate.toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : t.createOpportunity.selectDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date: Date | undefined) => {
                      setDueDate(date);
                      setCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes (Description) */}
            <div className="space-y-2">
              <Label
                htmlFor="opp-desc"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                {t.createOpportunity.description}
              </Label>
              <Textarea
                id="opp-desc"
                placeholder={t.createOpportunity.descriptionPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] resize-none focus-visible:ring-[oklch(0.55_0.15_160/0.3)]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                {t.createOpportunity.cancel}
              </Button>
              <Button
                type="submit"
                disabled={!title.trim() || isSubmitting}
                className="bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.48_0.12_160)] hover:from-[oklch(0.50_0.15_160)] hover:to-[oklch(0.44_0.12_160)] text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {isEditMode ? t.createOpportunity.updating : t.createOpportunity.create}...
                  </span>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-1.5" />
                    {isEditMode ? t.createOpportunity.update : t.createOpportunity.create}
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
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
import { useApiQuery } from "@/hooks/use-api-query";
import type { User, Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  GitBranch,
  Sparkles,
  Type,
  FileText,
  CircleDot,
  UserCircle,
  FolderKanban,
} from "lucide-react";

const NAME_MAX_LENGTH = 200;

export function CreatePhaseDialog() {
  const {
    createPhaseDialogOpen,
    setCreatePhaseDialogOpen,
    activeWorkspaceId,
    workspaces,
  } = useAppStore();
  const queryClient = useQueryClient();

  const effectiveWorkspaceId = activeWorkspaceId || workspaces[0]?.id || "";

  // useApiQuery auto-adds workspaceId when scoped=true (default)
  const { data: usersData } = useApiQuery<User[]>("/api/users");
  const users = usersData || [];

  const { data: projectsData } = useApiQuery<Project[]>("/api/projects");
  const projects = projectsData || [];

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("pending");
  const [order, setOrder] = useState(0);
  const [projectId, setProjectId] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const [nameError, setNameError] = useState("");
  const [projectError, setProjectError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setStatus("pending");
    setOrder(0);
    setProjectId("");
    setResponsableId("");
    setNameError("");
    setProjectError("");
  }, []);

  const handleOpenChange = (open: boolean) => {
    setCreatePhaseDialogOpen(open);
    if (!open) resetForm();
  };

  const validate = (): boolean => {
    let valid = true;
    if (!name.trim()) {
      setNameError("Le nom de la phase est requis");
      valid = false;
    } else {
      setNameError("");
    }
    if (!projectId) {
      setProjectError("Le projet est requis");
      valid = false;
    } else {
      setProjectError("");
    }
    if (!effectiveWorkspaceId) {
      toast.error("Aucun espace de travail actif");
      valid = false;
    }
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        status,
        order,
        projectId,
        responsableId: responsableId || null,
        workspaceId: effectiveWorkspaceId,
      };

      const response = await fetch("/api/phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create phase");
      }

      toast.success("Phase créée avec succès");
      queryClient.invalidateQueries({ queryKey: ["phases"] });
      setCreatePhaseDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Erreur lors de la création de la phase");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedResponsable = users.find((u) => u.id === responsableId);

  return (
    <Dialog open={createPhaseDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[520px] max-h-[90vh] p-0 gap-0 overflow-y-auto"
        showCloseButton={false}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-[oklch(0.55_0.15_160/0.08)] via-[oklch(0.55_0.15_160/0.04)] to-transparent border-b">
            <div className="absolute top-3 right-4 text-[oklch(0.55_0.15_160/0.15)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-lg">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-[oklch(0.55_0.15_160)] to-[oklch(0.48_0.12_160)] text-white shadow-sm">
                  <GitBranch className="h-4 w-4" />
                </div>
                <span className="bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.45_0.12_160)] bg-clip-text text-transparent font-bold">
                  Nouvelle phase
                </span>
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label
                htmlFor="phase-name"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <Type className="h-3.5 w-3.5 text-[oklch(0.55_0.15_160)]" />
                Nom de la phase
              </Label>
              <Input
                id="phase-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value.slice(0, NAME_MAX_LENGTH));
                  if (nameError) setNameError("");
                }}
                placeholder="Ex: Analyse & Cadrage, Développement..."
                maxLength={NAME_MAX_LENGTH}
                className={cn(nameError && "border-rose-500")}
                autoFocus
              />
              {nameError && (
                <p className="text-xs text-rose-500">{nameError}</p>
              )}
              <p className="text-xs text-muted-foreground text-right">
                {name.length}/{NAME_MAX_LENGTH}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label
                htmlFor="phase-desc"
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <FileText className="h-3.5 w-3.5 text-[oklch(0.55_0.15_160)]" />
                Description
              </Label>
              <Textarea
                id="phase-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de la phase..."
                rows={2}
              />
            </div>

            {/* Project + Status row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Project */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <FolderKanban className="h-3.5 w-3.5 text-[oklch(0.55_0.15_160)]" />
                  Projet
                </Label>
                <Select
                  value={projectId}
                  onValueChange={(v) => {
                    setProjectId(v);
                    if (projectError) setProjectError("");
                  }}
                >
                  <SelectTrigger
                    className={cn(projectError && "border-rose-500")}
                  >
                    <SelectValue placeholder="Sélectionner un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.icon} {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {projectError && (
                  <p className="text-xs text-rose-500">{projectError}</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <CircleDot className="h-3.5 w-3.5 text-[oklch(0.55_0.15_160)]" />
                  Statut
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">À venir</SelectItem>
                    <SelectItem value="active">En cours</SelectItem>
                    <SelectItem value="completed">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Order + Responsable row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Order */}
              <div className="space-y-2">
                <Label
                  htmlFor="phase-order"
                  className="flex items-center gap-1.5 text-sm font-medium"
                >
                  <GitBranch className="h-3.5 w-3.5 text-[oklch(0.55_0.15_160)]" />
                  Ordre
                </Label>
                <Input
                  id="phase-order"
                  type="number"
                  min={0}
                  value={order}
                  onChange={(e) =>
                    setOrder(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  className="w-24"
                />
              </div>

              {/* Responsable */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <UserCircle className="h-3.5 w-3.5 text-[oklch(0.55_0.15_160)]" />
                  Responsable
                </Label>
                <Select value={responsableId} onValueChange={setResponsableId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Non assigné">
                      {selectedResponsable && (
                        <span>{selectedResponsable.name}</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non assigné</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreatePhaseDialogOpen(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.48_0.15_160)] hover:from-[oklch(0.48_0.15_160)] hover:to-[oklch(0.42_0.15_160)] text-white shadow-sm"
              >
                <GitBranch className="h-4 w-4" />
                {isSubmitting ? "Création..." : "Créer la phase"}
              </Button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

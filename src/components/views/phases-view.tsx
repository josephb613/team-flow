"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GitBranch,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  Calendar,
  Pencil,
  Trash2,
  AlertCircle,
  Search,
  Clock,
  Flag,
  FolderKanban,
  GripVertical,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/query-utils";
import { toast } from "sonner";
import type { ProjectPhase, PhaseStatus } from "@/lib/types";

// UI Alert Dialog pour confirmation de suppression
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// DnD Kit
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Constantes de colonnes ──────────────────────────────────────────────────
const PHASE_COLUMNS: Record<
  PhaseStatus,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
    headerBg: string;
    badge: string;
    border: string;
    progressColor: string;
    gradient: string;
  }
> = {
  pending: {
    label: "À venir",
    icon: <Clock className="h-4 w-4" />,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    headerBg: "bg-amber-100 dark:bg-amber-900/40",
    badge: "bg-amber-500",
    border: "border-l-amber-400 dark:border-l-amber-600",
    progressColor: "[&>div]:bg-amber-500",
    gradient:
      "from-amber-50 to-amber-50/50 dark:from-amber-950/20 dark:to-amber-950/5",
  },
  active: {
    label: "En cours",
    icon: <Flag className="h-4 w-4" />,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    headerBg: "bg-blue-100 dark:bg-blue-900/40",
    badge: "bg-blue-500",
    border: "border-l-blue-400 dark:border-l-blue-600",
    progressColor: "[&>div]:bg-blue-500",
    gradient:
      "from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/5",
  },
  completed: {
    label: "Terminées",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    headerBg: "bg-emerald-100 dark:bg-emerald-900/40",
    badge: "bg-emerald-500",
    border: "border-l-emerald-400 dark:border-l-emerald-600",
    progressColor: "[&>div]:bg-emerald-500",
    gradient:
      "from-emerald-50 to-emerald-50/50 dark:from-emerald-950/20 dark:to-emerald-950/5",
  },
};

const COLUMN_ORDER: PhaseStatus[] = ["pending", "active", "completed"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getUserInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Carte de phase (contenu) ───────────────────────────────────────────────
function PhaseCardContent({
  phase,
  isDragOverlay,
  onEdit,
  onComplete,
  onDelete,
}: {
  phase: ProjectPhase;
  isDragOverlay?: boolean;
  onEdit?: (phase: ProjectPhase) => void;
  onComplete?: (phase: ProjectPhase) => void;
  onDelete?: (phase: ProjectPhase) => void;
}) {
  const col = PHASE_COLUMNS[phase.status];

  return (
    <div
      className={cn(
        "group relative bg-card rounded-xl border shadow-sm overflow-hidden",
        "border-l-[3px]",
        col.border,
        isDragOverlay && "shadow-xl rotate-1",
      )}
    >
      <div className="p-3">
        {/* En-tête : projet + menu */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[oklch(0.55_0.15_160/0.1)] text-[oklch(0.55_0.15_160)] text-[10px] font-medium whitespace-nowrap">
              <FolderKanban className="h-3 w-3" />
              <span className="truncate max-w-[80px]">
                {phase.project?.name || "Sans projet"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="opacity-0 group-hover:opacity-40 transition-opacity cursor-grab p-0.5">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(phase)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                {phase.status !== "completed" && (
                  <DropdownMenuItem onClick={() => onComplete?.(phase)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Marquer comme terminée
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-rose-500"
                  onClick={() => onDelete?.(phase)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Titre */}
        <h4 className="text-sm font-semibold mb-1 leading-snug">
          {phase.name}
        </h4>

        {/* Description */}
        {phase.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5">
            {phase.description}
          </p>
        )}

        {/* Barre de progression */}
        <div className="flex items-center gap-2 mb-2.5">
          <Progress
            value={phase.progress}
            className={cn("h-1.5 flex-1", col.progressColor)}
          />
          <span className="text-[10px] font-bold text-muted-foreground tabular-nums w-8 text-right">
            {phase.progress}%
          </span>
        </div>

        {/* Footer : dates + responsable */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(phase.startDate)} → {formatDate(phase.endDate)}
          </span>
          {phase.responsable && (
            <span className="flex items-center gap-1">
              <span className="h-4 w-4 rounded-full bg-[oklch(0.55_0.15_160/0.15)] text-[oklch(0.55_0.15_160)] flex items-center justify-center text-[7px] font-bold">
                {getUserInitials(phase.responsable.name)}
              </span>
              <span className="truncate max-w-[60px]">
                {phase.responsable.name}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Carte triable (wrapper DnD) ─────────────────────────────────────────────
function SortablePhaseCard({
  phase,
  onEdit,
  onComplete,
  onDelete,
}: {
  phase: ProjectPhase;
  onEdit?: (phase: ProjectPhase) => void;
  onComplete?: (phase: ProjectPhase) => void;
  onDelete?: (phase: ProjectPhase) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id, data: { type: "phase", phase } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <PhaseCardContent
        phase={phase}
        onEdit={onEdit}
        onComplete={onComplete}
        onDelete={onDelete}
      />
    </motion.div>
  );
}

// ─── Colonne Kanban ──────────────────────────────────────────────────────────
function PhaseKanbanColumn({
  status,
  phases,
  isOver,
  children,
}: {
  status: PhaseStatus;
  phases: ProjectPhase[];
  isOver: boolean;
  children: React.ReactNode;
}) {
  const col = PHASE_COLUMNS[status];
  const { setNodeRef } = useDroppable({
    id: `col-${status}`,
    data: { type: "column", status },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "shrink-0 w-[260px] sm:w-[280px] transition-all duration-200",
        isOver &&
          "ring-2 ring-[oklch(0.55_0.15_160)]/40 ring-offset-2 ring-offset-background rounded-2xl",
      )}
    >
      {/* En-tête de colonne */}
      <div
        className={cn(
          "flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl",
          col.headerBg,
        )}
      >
        <div className={cn("p-1.5 rounded-lg", col.bg)}>
          <span className={col.color}>{col.icon}</span>
        </div>
        <span className="text-sm font-bold">{col.label}</span>
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white",
            col.badge,
          )}
        >
          {phases.length}
        </span>
      </div>

      {/* Zone des cartes */}
      <div
        className={cn(
          "space-y-2.5 min-h-[200px] p-2 rounded-xl bg-gradient-to-b transition-colors duration-200",
          col.gradient,
          isOver && "bg-[oklch(0.55_0.15_160)]/5",
        )}
      >
        <AnimatePresence>
          {phases.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-10 text-center"
            >
              <div className={cn("p-3 rounded-xl mb-2 opacity-40", col.bg)}>
                <span className={col.color}>{col.icon}</span>
              </div>
              <p className="text-xs text-muted-foreground/60 font-medium">
                Aucune phase
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        {children}
      </div>
    </div>
  );
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────
function PhasesSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMN_ORDER.map((status) => {
        const col = PHASE_COLUMNS[status];
        return (
          <div key={status} className="shrink-0 w-[260px] sm:w-[280px]">
            <div
              className={cn(
                "flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl",
                col.headerBg,
              )}
            >
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              <div className="h-5 w-5 bg-muted rounded-full animate-pulse ml-auto" />
            </div>
            <div className="space-y-2.5 p-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-xl border border-l-[3px] border-l-muted shadow-sm p-3 space-y-2"
                >
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                  <div className="h-1.5 w-full bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function PhasesEmpty({ hasSearch }: { hasSearch: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <GitBranch className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <p className="text-muted-foreground font-medium">
        {hasSearch
          ? "Aucune phase ne correspond à votre recherche"
          : "Aucune phase trouvée"}
      </p>
      {!hasSearch && (
        <p className="text-sm text-muted-foreground/60 mt-1">
          Créez votre première phase de projet pour suivre son avancement.
        </p>
      )}
    </motion.div>
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────
function PhasesError({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-rose-500/60" />
      </div>
      <p className="text-muted-foreground font-medium">
        Erreur lors du chargement des phases
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Réessayer
      </Button>
    </motion.div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────
export function PhasesView() {
  const { t } = useTranslation();
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const queryClient = useQueryClient();
  const phaseFilter = useAppStore((s) => s.phaseFilter);
  const setPhaseFilter = useAppStore((s) => s.setPhaseFilter);
  const setCreatePhaseDialogOpen = useAppStore(
    (s) => s.setCreatePhaseDialogOpen,
  );
  const setEditingPhase = useAppStore((s) => s.setEditingPhase);
  const wsParams = activeWorkspaceId
    ? { workspaceId: activeWorkspaceId }
    : undefined;

  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");

  // État pour la confirmation de suppression
  const [phaseToDelete, setPhaseToDelete] = useState<ProjectPhase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [filter, setFilterState] = useState<PhaseStatus | "all">(() => {
    const urlFilter = searchParams.get("filter");
    if (
      urlFilter === "all" ||
      urlFilter === "pending" ||
      urlFilter === "active" ||
      urlFilter === "completed"
    ) {
      return urlFilter;
    }
    return phaseFilter;
  });

  const handleFilterChange = useCallback(
    (v: string) => {
      const typed = v as PhaseStatus | "all";
      setFilterState(typed);
      setPhaseFilter(typed);
      const params = new URLSearchParams(searchParams.toString());
      if (typed === "all") {
        params.delete("filter");
      } else {
        params.set("filter", typed);
      }
      const newUrl = params.toString()
        ? `?${params.toString()}`
        : window.location.pathname;
      router.replace(newUrl, { scroll: false });
    },
    [searchParams, router, setPhaseFilter],
  );

  const kanbanMode = filter === "all";

  const {
    data: apiPhases,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["phases", activeWorkspaceId],
    queryFn: () =>
      fetchJson<ProjectPhase[]>(
        `/api/phases${wsParams ? `?${new URLSearchParams(wsParams).toString()}` : ""}`,
      ),
  });

  const phases = apiPhases ?? [];

  const filteredPhases = useMemo(() => {
    let result =
      filter === "all" ? phases : phases.filter((p) => p.status === filter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.project?.name && p.project.name.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [phases, filter, searchQuery]);

  const phasesByStatus = useMemo(() => {
    const map: Record<PhaseStatus, ProjectPhase[]> = {
      pending: [],
      active: [],
      completed: [],
    };
    for (const p of filteredPhases) {
      map[p.status]?.push(p);
    }
    return map;
  }, [filteredPhases]);

  const stats = useMemo(() => {
    const total = phases.length;
    const active = phases.filter((p) => p.status === "active").length;
    const completed = phases.filter((p) => p.status === "completed").length;
    return { total, active, completed };
  }, [phases]);

  const setProjectPhases = useAppStore((s) => s.setProjectPhases);
  useEffect(() => {
    if (apiPhases) {
      setProjectPhases(apiPhases);
      useAppStore.getState().setPhaseCount(apiPhases.length);
    }
  }, [apiPhases, setProjectPhases]);

  // ─── Actions sur les phases ─────────────────────────────────────────────
  const handleEdit = useCallback(
    (phase: ProjectPhase) => {
      setEditingPhase(phase);
      setCreatePhaseDialogOpen(true);
    },
    [setEditingPhase, setCreatePhaseDialogOpen],
  );

  const handleComplete = useCallback(
    async (phase: ProjectPhase) => {
      const previousStatus = phase.status;
      // Optimistic update
      queryClient.setQueryData<ProjectPhase[]>(
        ["phases", activeWorkspaceId],
        (old) =>
          old?.map((p) =>
            p.id === phase.id
              ? { ...p, status: "completed" as PhaseStatus }
              : p,
          ) ?? [],
      );
      try {
        const res = await fetch(`/api/phases/${phase.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        queryClient.invalidateQueries({ queryKey: ["phases"] });
        toast.success("Phase marquée comme terminée");
      } catch {
        queryClient.setQueryData<ProjectPhase[]>(
          ["phases", activeWorkspaceId],
          (old) =>
            old?.map((p) =>
              p.id === phase.id ? { ...p, status: previousStatus } : p,
            ) ?? [],
        );
        toast.error("Erreur lors de la mise à jour");
      }
    },
    [activeWorkspaceId, queryClient],
  );

  const handleDelete = useCallback((phase: ProjectPhase) => {
    setPhaseToDelete(phase);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!phaseToDelete) return;
    setIsDeleting(true);
    const phase = phaseToDelete;
    // Optimistic removal
    queryClient.setQueryData<ProjectPhase[]>(
      ["phases", activeWorkspaceId],
      (old) => old?.filter((p) => p.id !== phase.id) ?? [],
    );
    try {
      const res = await fetch(`/api/phases/${phase.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      queryClient.invalidateQueries({ queryKey: ["phases"] });
      toast.success("Phase supprimée");
    } catch {
      queryClient.invalidateQueries({ queryKey: ["phases"] });
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
      setPhaseToDelete(null);
    }
  }, [phaseToDelete, activeWorkspaceId, queryClient]);

  // ─── DnD state ──────────────────────────────────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<PhaseStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activePhase = activeId ? phases.find((p) => p.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverColumn(null);

    if (!over) return;

    let targetStatus: PhaseStatus | null = null;
    const overId = over.id as string;

    if (overId.startsWith("col-")) {
      targetStatus = overId.replace("col-", "") as PhaseStatus;
    } else {
      const overPhase = phases.find((p) => p.id === overId);
      if (overPhase) targetStatus = overPhase.status;
    }

    if (!targetStatus) return;

    const draggedPhase = phases.find((p) => p.id === active.id);
    if (!draggedPhase || draggedPhase.status === targetStatus) return;

    const previousStatus = draggedPhase.status;

    queryClient.setQueryData<ProjectPhase[]>(
      ["phases", activeWorkspaceId],
      (old) =>
        old?.map((p) =>
          p.id === active.id ? { ...p, status: targetStatus } : p,
        ) ?? [],
    );

    fetch(`/api/phases/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetStatus }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        queryClient.invalidateQueries({ queryKey: ["phases"] });
      })
      .catch(() => {
        queryClient.setQueryData<ProjectPhase[]>(
          ["phases", activeWorkspaceId],
          (old) =>
            old?.map((p) =>
              p.id === active.id ? { ...p, status: previousStatus } : p,
            ) ?? [],
        );
        toast.error("Erreur lors de la mise à jour du statut");
      });
  }

  if (isLoading) return <PhasesSkeleton />;
  if (error) return <PhasesError onRetry={refetch} />;

  const totalFiltered = filteredPhases.length;
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* ─── En-tête ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-[oklch(0.55_0.15_160)] to-[oklch(0.42_0.12_160)] text-white shadow-sm">
              <GitBranch className="h-4 w-4" />
            </div>
            {t.nav.phases || "Phases"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            <span className="font-semibold text-foreground">{stats.total}</span>{" "}
            phases ·{" "}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {stats.active}
            </span>{" "}
            en cours ·{" "}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.completed}
            </span>{" "}
            terminées
          </p>
        </div>
        <Button
          className="gap-2 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.48_0.15_160)] hover:from-[oklch(0.48_0.15_160)] hover:to-[oklch(0.42_0.15_160)] text-white shadow-sm shadow-[oklch(0.55_0.15_160)]/20"
          size="sm"
          onClick={() => setCreatePhaseDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Nouvelle phase
        </Button>
      </div>

      {/* ─── Barre de recherche + onglets ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg p-0.5">
          {(
            [
              { value: "all", label: "Kanban" },
              { value: "active", label: "En cours" },
              { value: "pending", label: "À venir" },
              { value: "completed", label: "Terminées" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleFilterChange(tab.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                filter === tab.value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une phase..."
            className="pl-9 h-9 bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160)]/30 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ─── Contenu ─────────────────────────────────────────────────── */}
      {totalFiltered === 0 ? (
        <PhasesEmpty hasSearch={isSearching} />
      ) : kanbanMode ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-260px)] scrollbar-thin">
            {COLUMN_ORDER.map((status) => {
              const columnPhases = phasesByStatus[status];
              const isOver = overColumn === status;

              return (
                <PhaseKanbanColumn
                  key={status}
                  status={status}
                  phases={columnPhases}
                  isOver={isOver}
                >
                  <SortableContext
                    items={columnPhases.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <AnimatePresence>
                      {columnPhases.map((phase) => (
                        <SortablePhaseCard
                          key={phase.id}
                          phase={phase}
                          onEdit={handleEdit}
                          onComplete={handleComplete}
                          onDelete={handleDelete}
                        />
                      ))}
                    </AnimatePresence>
                  </SortableContext>
                </PhaseKanbanColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activePhase ? (
              <div className="w-[260px] sm:w-[280px]">
                <PhaseCardContent phase={activePhase} isDragOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* Vue filtrée (une seule colonne) */
        <div className="max-w-[440px]">
          {(() => {
            const col = PHASE_COLUMNS[filter as PhaseStatus];
            return (
              <div
                className={cn(
                  "flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl",
                  col.headerBg,
                )}
              >
                <div className={cn("p-1.5 rounded-lg", col.bg)}>
                  <span className={col.color}>{col.icon}</span>
                </div>
                <span className="text-sm font-bold">{col.label}</span>
                <span
                  className={cn(
                    "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white",
                    col.badge,
                  )}
                >
                  {totalFiltered}
                </span>
              </div>
            );
          })()}
          <div className="space-y-2.5">
            <AnimatePresence>
              {filteredPhases.map((phase) => (
                <motion.div
                  key={phase.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                >
                  <PhaseCardContent
                    phase={phase}
                    onEdit={handleEdit}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ─── Dialog de confirmation de suppression ──────────────────── */}
      <AlertDialog
        open={phaseToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPhaseToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              </div>
              Supprimer la phase
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la phase{" "}
              <span className="font-semibold text-foreground">
                &quot;{phaseToDelete?.name}&quot;
              </span>{" "}
              ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={confirmDelete}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

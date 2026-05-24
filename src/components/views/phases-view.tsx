"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  Circle,
  Calendar,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/query-utils";
import type { ProjectPhase, PhaseStatus } from "@/lib/types";

// ─── Badge de statut ─────────────────────────────────────────────────────────
function PhaseStatusBadge({ status }: { status: PhaseStatus }) {
  const config: Record<PhaseStatus, { label: string; className: string }> = {
    pending: { label: "À venir", className: "bg-muted text-muted-foreground" },
    active: {
      label: "En cours",
      className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    completed: {
      label: "Terminé",
      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
  };
  const c = config[status];
  return (
    <Badge variant="outline" className={cn("text-[11px]", c.className)}>
      {c.label}
    </Badge>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Animation ───────────────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ─── Skeleton loader ─────────────────────────────────────────────────────────
function PhasesSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <Skeleton className="h-3 w-3 rounded-full mt-1" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function PhasesEmpty({ filter }: { filter: string }) {
  const all = filter === "all";
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Circle className="h-10 w-10 mx-auto mb-3 opacity-30" />
      <p>{all ? "Aucune phase trouvée" : "Aucune phase dans ce filtre"}</p>
      {all && (
        <p className="text-sm mt-1">
          Créez votre première phase de projet pour suivre son avancement.
        </p>
      )}
    </div>
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────
function PhasesError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <AlertCircle className="h-10 w-10 mx-auto mb-3 text-rose-500/60" />
      <p>Erreur lors du chargement des phases</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────
export function PhasesView() {
  const { t } = useTranslation();
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const phaseFilter = useAppStore((s) => s.phaseFilter);
  const setPhaseFilter = useAppStore((s) => s.setPhaseFilter);
  const wsParams = activeWorkspaceId
    ? { workspaceId: activeWorkspaceId }
    : undefined;

  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialiser le filtre : priorité à l'URL, puis au store
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

  // Wrapper qui met à jour le state local, le store ET l'URL
  const handleFilterChange = useCallback(
    (v: string) => {
      const typed = v as PhaseStatus | "all";
      setFilterState(typed);
      setPhaseFilter(typed);
      // Synchroniser l'URL sans rechargement
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

  const filteredPhases =
    filter === "all" ? phases : phases.filter((p) => p.status === filter);

  // Sync au store
  const setProjectPhases = useAppStore((s) => s.setProjectPhases);
  useEffect(() => {
    if (apiPhases) {
      setProjectPhases(apiPhases);
      useAppStore.getState().setPhaseCount(apiPhases.length);
    }
  }, [apiPhases, setProjectPhases]);

  if (isLoading) return <PhasesSkeleton />;
  if (error) return <PhasesError onRetry={refetch} />;

  return (
    <motion.div
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-[oklch(0.55_0.15_160)]" />
            {t.nav.phases || "Phases"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Suivez l&apos;avancement de chaque phase de vos projets
          </p>
        </div>
        <Button
          className="gap-2"
          size="sm"
          onClick={() => useAppStore.getState().setCreatePhaseDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Nouvelle phase
        </Button>
      </div>

      {/* Filtres */}
      <Tabs value={filter} onValueChange={handleFilterChange}>
        <TabsList>
          <TabsTrigger value="all">Toutes</TabsTrigger>
          <TabsTrigger value="active">En cours</TabsTrigger>
          <TabsTrigger value="pending">À venir</TabsTrigger>
          <TabsTrigger value="completed">Terminées</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Timeline des phases */}
      {filteredPhases.length === 0 ? (
        <PhasesEmpty filter={filter} />
      ) : (
        <div className="space-y-4">
          {filteredPhases.map((phase) => (
            <motion.div key={phase.id} variants={item}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Indicateur vertical */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <div
                        className={cn(
                          "h-3 w-3 rounded-full border-2",
                          phase.status === "completed"
                            ? "bg-emerald-500 border-emerald-500"
                            : phase.status === "active"
                              ? "bg-blue-500 border-blue-500"
                              : "bg-muted border-muted-foreground/30",
                        )}
                      />
                      <div
                        className={cn(
                          "w-0.5 flex-1 min-h-10",
                          phase.status === "completed"
                            ? "bg-emerald-500/40"
                            : "bg-border",
                        )}
                      />
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground font-mono">
                              #{phase.order}
                            </span>
                            <h3 className="font-semibold">{phase.name}</h3>
                            <PhaseStatusBadge status={phase.status} />
                          </div>
                          {phase.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {phase.description}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            {phase.status !== "completed" && (
                              <DropdownMenuItem>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Marquer comme terminée
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-rose-500">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Barre de progression */}
                      <div className="flex items-center gap-3">
                        <Progress
                          value={phase.progress}
                          className="h-2 flex-1"
                        />
                        <span className="text-sm font-medium text-muted-foreground w-10 text-right">
                          {phase.progress}%
                        </span>
                      </div>

                      {/* Métadonnées */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(phase.startDate)} →{" "}
                          {formatDate(phase.endDate)}
                        </span>
                        {phase.project && (
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            {phase.project.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

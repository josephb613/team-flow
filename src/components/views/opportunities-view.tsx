"use client";

import { useMemo, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import { useApiData } from "@/hooks/use-api-data";
import { mockOpportunities } from "@/lib/mock-data";
import type { Opportunity, OpportunityStatus } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Search,
  Plus,
  Columns3,
  List,
  CalendarDays,
  MoreHorizontal,
  XCircle,
  CheckCircle2,
  Filter,
  MessageSquare,
  FileText,
  Target,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ---- Status Configuration ----
const STATUSES: OpportunityStatus[] = [
  "prospection",
  "qualification",
  "proposition",
  "negociation",
  "gagnee",
  "perdue",
];

const statusConfig: Record<
  OpportunityStatus,
  {
    color: string;
    dotColor: string;
    solidBg: string;
    solidText: string;
    borderColor: string;
    icon: React.ReactNode;
  }
> = {
  prospection: {
    color: "text-blue-600 dark:text-blue-400",
    dotColor: "bg-blue-500",
    solidBg: "bg-blue-100 dark:bg-blue-900/50",
    solidText: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-500",
    icon: <Search className="h-3 w-3" />,
  },
  qualification: {
    color: "text-indigo-600 dark:text-indigo-400",
    dotColor: "bg-indigo-500",
    solidBg: "bg-indigo-100 dark:bg-indigo-900/50",
    solidText: "text-indigo-700 dark:text-indigo-300",
    borderColor: "border-indigo-500",
    icon: <Filter className="h-3 w-3" />,
  },
  proposition: {
    color: "text-amber-600 dark:text-amber-400",
    dotColor: "bg-amber-500",
    solidBg: "bg-amber-100 dark:bg-amber-900/50",
    solidText: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-500",
    icon: <FileText className="h-3 w-3" />,
  },
  negociation: {
    color: "text-orange-600 dark:text-orange-400",
    dotColor: "bg-orange-500",
    solidBg: "bg-orange-100 dark:bg-orange-900/50",
    solidText: "text-orange-700 dark:text-orange-300",
    borderColor: "border-orange-500",
    icon: <MessageSquare className="h-3 w-3" />,
  },
  gagnee: {
    color: "text-emerald-600 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
    solidBg: "bg-emerald-100 dark:bg-emerald-900/50",
    solidText: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-500",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  perdue: {
    color: "text-red-600 dark:text-red-400",
    dotColor: "bg-red-500",
    solidBg: "bg-red-100 dark:bg-red-900/50",
    solidText: "text-red-700 dark:text-red-300",
    borderColor: "border-red-500",
    icon: <XCircle className="h-3 w-3" />,
  },
};

// ---- Helpers ----
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isOverdue(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

// ---- Sortable Card ----
function OpportunityCard({
  opportunity,
  isDragOverlay,
  onRefresh,
}: {
  opportunity: Opportunity;
  isDragOverlay?: boolean;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const config = statusConfig[opportunity.status];
  const overdue = isOverdue(opportunity.dueDate);

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/opportunities/${opportunity.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Opportunité supprimée");
      onRefresh();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const cardContent = (
    <div
      className={cn(
        "mb-2 cursor-grab active:cursor-grabbing rounded-lg border bg-card p-3 transition-shadow hover:shadow-md relative",
        isDragOverlay && "shadow-lg rotate-2",
      )}
      style={style}
    >
      {/* Left border strip */}
      <div
        className={cn("rounded-full absolute left-0 top-1 bottom-1", config.dotColor)}
        style={{ width: 3 }}
      />

      {/* Header with status badge */}
      <div className="flex items-center justify-between mb-1.5 ml-1">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
            config.solidBg,
            config.solidText,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
          {t.opportunities.statuses[opportunity.status as keyof typeof t.opportunities.statuses]}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              className="text-red-600 dark:text-red-400 text-xs"
              onClick={handleDelete}
            >
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm mb-1 ml-1 line-clamp-2">{opportunity.title}</h4>

      {/* Description */}
      {opportunity.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 ml-1">
          {opportunity.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 ml-1">
        {/* Due date */}
        {opportunity.dueDate ? (
          <span
            className={cn(
              "text-[10px] flex items-center gap-1",
              overdue ? "text-red-500 font-medium" : "text-muted-foreground",
            )}
          >
            <CalendarDays className="h-3 w-3" />
            {new Date(opportunity.dueDate).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
          </span>
        ) : (
          <span />
        )}

        {/* Creator avatar */}
        {opportunity.creator && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[8px] bg-muted">
                    {getInitials(opportunity.creator.name)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{opportunity.creator.name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );

  if (isDragOverlay) return <div>{cardContent}</div>;

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      {cardContent}
    </div>
  );
}

// ---- Kanban Column ----
function KanbanColumn({
  status,
  opportunities,
  onRefresh,
}: {
  status: OpportunityStatus;
  opportunities: Opportunity[];
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const config = statusConfig[status];

  return (
    <div className="flex-shrink-0 w-[272px] flex flex-col max-h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", config.dotColor)} />
          <h3 className={cn("text-sm font-semibold", config.color)}>
            {t.opportunities.statuses[status as keyof typeof t.opportunities.statuses]}
          </h3>
          <Badge variant="secondary" className="text-[10px] px-1.5">
            {opportunities.length}
          </Badge>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-0 min-h-[60px]">
        <SortableContext
          items={opportunities.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {opportunities.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} onRefresh={onRefresh} />
          ))}
        </SortableContext>

        {opportunities.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground/50">
            Aucune
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Main Component ----
export function OpportunitiesView() {
  const { t } = useTranslation();
  const opportunityViewMode = useAppStore((s) => s.opportunityViewMode);
  const setOpportunityViewMode = useAppStore(
    (s) => s.setOpportunityViewMode,
  );
  const setCreateOpportunityDialogOpen = useAppStore(
    (s) => s.setCreateOpportunityDialogOpen,
  );
  const setOpportunityCount = useAppStore((s) => s.setOpportunityCount);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeDrag, setActiveDrag] = useState<Opportunity | null>(null);

  const {
    data: apiData,
    isLoading,
    error,
    refetch,
  } = useApiData<Opportunity[]>("/api/opportunities", {
    fallback: mockOpportunities,
  });

  const apiOpps = useMemo(() => apiData || [], [apiData]);

  // Update sidebar badge
  useMemo(() => {
    setOpportunityCount(apiOpps.length);
  }, [apiOpps, setOpportunityCount]);

  // Filtered opportunities
  const opportunities = useMemo(() => {
    if (!searchQuery.trim()) return apiOpps;
    const q = searchQuery.toLowerCase();
    return apiOpps.filter((o) => o.title.toLowerCase().includes(q));
  }, [apiOpps, searchQuery]);

  // Group by status
  const opportunitiesByStatus = useMemo(() => {
    const map: Record<OpportunityStatus, Opportunity[]> = {} as Record<
      OpportunityStatus,
      Opportunity[]
    >;
    for (const status of STATUSES) {
      map[status] = opportunities.filter((o) => o.status === status);
    }
    return map;
  }, [opportunities]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = event.active.id as string;
      const opp = opportunities.find((o) => o.id === id) || null;
      setActiveDrag(opp);
    },
    [opportunities],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDrag(null);
      const { active, over } = event;
      if (!over) return;

      const oppId = active.id as string;
      let newStatus: OpportunityStatus | null = null;

      // Check if dropped on a column
      const overId = over.id as string;
      if (STATUSES.includes(overId as OpportunityStatus)) {
        newStatus = overId as OpportunityStatus;
      } else {
        const overOpp = opportunities.find((o) => o.id === overId);
        if (overOpp) newStatus = overOpp.status;
      }

      if (!newStatus) return;

      const opp = opportunities.find((o) => o.id === oppId);
      if (!opp || opp.status === newStatus) return;

      // PATCH API and refetch
      fetch(`/api/opportunities/${oppId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("Update failed");
          return res.json();
        })
        .then(() => refetch())
        .catch(() => {
          toast.error("Erreur lors du changement de statut");
        });
    },
    [opportunities, refetch],
  );

  // Computed
  const totalCount = opportunities.length;
  const wonCount = opportunities.filter((o) => o.status === "gagnee").length;
  const lostCount = opportunities.filter((o) => o.status === "perdue").length;

  // ------- RENDER: Loading -------
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ------- RENDER: Error -------
  if (error && !apiData) {
    return (
      <div className="p-6">
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Erreur de chargement
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs"
            >
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ------- RENDER: Main -------
  return (
    <div className="flex flex-col h-full">
      {/* Stats Bar */}
      <div className="flex items-center justify-between px-6 pt-5 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {t.opportunities.title}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{totalCount} total</span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {wonCount} {t.opportunities.statuses.gagnee.toLowerCase()}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {lostCount} {t.opportunities.statuses.perdue.toLowerCase()}
            </span>
          </div>
        </div>
        <Button
          onClick={() => setCreateOpportunityDialogOpen(true)}
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.55_0.15_180)] text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t.opportunities.newOpportunity}
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.opportunities.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Tabs
          value={opportunityViewMode}
          onValueChange={(v) =>
            setOpportunityViewMode(v as "list" | "kanban")
          }
        >
          <TabsList className="h-9">
            <TabsTrigger value="kanban" className="gap-1.5 text-xs h-7">
              <Columns3 className="h-3.5 w-3.5" />
              {t.opportunities.kanban}
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5 text-xs h-7">
              <List className="h-3.5 w-3.5" />
              {t.opportunities.list}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <AnimatePresence mode="wait">
          {opportunityViewMode === "kanban" ? (
            <motion.div
              key="kanban"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="h-full"
            >
              {opportunities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    {t.opportunities.noResults}
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div className="h-full overflow-x-auto">
                    <div className="flex gap-4 h-full min-w-max pb-4">
                      {STATUSES.map((status) => (
                        <KanbanColumn
                          key={status}
                          status={status}
                          opportunities={opportunitiesByStatus[status]}
                          onRefresh={refetch}
                        />
                      ))}
                    </div>
                  </div>
                  <DragOverlay>
                    {activeDrag && (
                      <OpportunityCard
                        opportunity={activeDrag}
                        isDragOverlay
                        onRefresh={refetch}
                      />
                    )}
                  </DragOverlay>
                </DndContext>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="h-full overflow-auto"
            >
              {opportunities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    {t.opportunities.noResults}
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                        {t.opportunities.columns.title}
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                        {t.opportunities.columns.status}
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                        {t.opportunities.columns.dueDate}
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                        {t.opportunities.columns.creator}
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                        {t.opportunities.columns.createdAt}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {opportunities.map((opp) => {
                      const config = statusConfig[opp.status];
                      const overdue = isOverdue(opp.dueDate);
                      return (
                        <tr
                          key={opp.id}
                          className="border-b border-border/30 hover:bg-muted/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-sm font-medium">
                                {opp.title}
                              </p>
                              {opp.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                  {opp.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                config.solidBg,
                                config.solidText,
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  config.dotColor,
                                )}
                              />
                              {t.opportunities.statuses[
                                opp.status as keyof typeof t.opportunities.statuses
                              ]}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {opp.dueDate ? (
                              <span
                                className={cn(
                                  "text-xs flex items-center gap-1",
                                  overdue
                                    ? "text-red-500 font-medium"
                                    : "text-muted-foreground",
                                )}
                              >
                                <CalendarDays className="h-3 w-3" />
                                {new Date(
                                  opp.dueDate,
                                ).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                                {overdue && (
                                  <span className="text-[10px] text-red-400 ml-1">
                                    (en retard)
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[8px] bg-muted">
                                  {opp.creator
                                    ? getInitials(opp.creator.name)
                                    : "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {opp.creator?.name || "—"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {new Date(opp.createdAt).toLocaleDateString(
                              "fr-FR",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

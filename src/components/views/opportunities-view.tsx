"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Filter,
  List,
  Columns3,
  Calendar,
  GripVertical,
  MoreHorizontal,
  Search,
  Building2,
  User as UserIcon,
  Trash2,
  Pencil,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/query-utils";
import { useTranslation } from "@/lib/i18n";
import type { Opportunity, User, BoardColumn } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { buildStatusConfig, DEFAULT_OPPORTUNITY_COLUMNS, getColumnLabel } from "@/lib/column-utils";
import { AddColumnButton, ColumnHeaderMenu } from "@/components/column-manager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// DnD Kit imports
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getUserInitials(id: string | undefined, users?: User[]) {
  if (!id) return "??";
  const u = users?.find((u) => u.id === id);
  return u
    ? u.name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "??";
}

function getUserName(id: string | undefined, users?: User[]) {
  if (!id) return "—";
  return users?.find((u) => u.id === id)?.name || "Unknown";
}

function isOverdue(dueDate: string) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

// ── Sort types ───────────────────────────────────────────────────────────────

type SortField = "title" | "organisation" | "dueDate" | "status" | "responsable";
type SortDirection = "asc" | "desc";

// ── Opportunity Card (Kanban) ────────────────────────────────────────────────

function OppCardContent({
  opportunity,
  onClick,
  onDelete,
  users,
  statusConfig,
}: {
  opportunity: Opportunity;
  onClick?: () => void;
  onDelete?: () => void;
  users?: User[];
  statusConfig: Record<string, ReturnType<typeof buildStatusConfig>[string]>;
}) {
  const { t } = useTranslation();
  const cfg = statusConfig[opportunity.status] || {
    color: "text-muted-foreground",
    bg: "bg-muted/50",
    gradient: "from-muted/20 to-transparent",
    headerBg: "bg-muted/50",
    dotColor: "bg-muted-foreground",
    icon: null,
  };
  const overdue = isOverdue(opportunity.dueDate);
  const sl: Record<string, string> = {
    nouveau: t.opportunities.statuses.nouveau,
    en_preparation: t.opportunities.statuses.en_preparation,
    soumis: t.opportunities.statuses.soumis,
    entretien: t.opportunities.statuses.entretien,
    accepte: t.opportunities.statuses.accepte,
    refuse: t.opportunities.statuses.refuse,
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-card rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
    >
      <div className="p-3">
        {/* Top row: organisation badge + menu */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {opportunity.organisation ? (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 font-medium bg-muted/60 flex items-center gap-1"
              >
                <Building2 className="h-2.5 w-2.5" />
                {opportunity.organisation}
              </Badge>
            ) : (
              <span />
            )}
          </div>
          <div
            className="flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
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
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={() => onDelete?.()}
                >
                  {t.common.delete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium mb-1 leading-snug truncate">
          {opportunity.title}
        </h4>

        {/* Description / Notes */}
        {opportunity.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 overflow-hidden break-words">
            {opportunity.description}
          </p>
        )}

        {/* Status badge */}
        <div className="mb-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
              cfg.bg,
              cfg.color,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
            {sl[opportunity.status] || opportunity.status}
          </span>
        </div>

        {/* Footer: responsable + due date */}
        <div className="flex items-center justify-between">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5 ring-1 ring-background">
                    <AvatarFallback className="text-[7px] bg-muted font-medium">
                      {getUserInitials(opportunity.responsableId, users)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[80px]">
                    {getUserName(opportunity.responsableId, users)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  {getUserName(opportunity.responsableId, users)}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div
            className={cn(
              "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md",
              overdue
                ? "text-rose-600 dark:text-rose-400 bg-rose-500/10"
                : "text-muted-foreground",
            )}
          >
            <Calendar className="h-3 w-3" />
            {opportunity.dueDate
              ? new Date(opportunity.dueDate).toLocaleDateString("fr-FR", {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sortable Opportunity Card ────────────────────────────────────────────────

function SortableOppCard({
  opportunity,
  onClick,
  onDelete,
  users,
  statusConfig,
}: {
  opportunity: Opportunity;
  onClick: () => void;
  onDelete?: () => void;
  users?: User[];
  statusConfig: Record<string, ReturnType<typeof buildStatusConfig>[string]>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity.id, data: { type: "opportunity", opportunity } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <OppCardContent
        opportunity={opportunity}
        onClick={onClick}
        onDelete={onDelete}
        users={users}
        statusConfig={statusConfig}
      />
    </motion.div>
  );
}

// ── Droppable Kanban Column ──────────────────────────────────────────────────

function DroppableKanbanColumn({
  status,
  label,
  opportunities,
  isOver,
  config,
  column,
  allColumns,
  boardType,
  workspaceId,
  onColumnsChanged,
  children,
}: {
  status: string;
  label: string;
  opportunities: Opportunity[];
  isOver: boolean;
  config: ReturnType<typeof buildStatusConfig>[string];
  column?: BoardColumn;
  allColumns?: BoardColumn[];
  boardType?: "tasks" | "opportunities";
  workspaceId?: string;
  onColumnsChanged?: (columns: BoardColumn[]) => void;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[280px] min-w-0 max-w-[280px] sm:w-[300px] sm:max-w-[300px] transition-all duration-200",
        isOver &&
          "ring-2 ring-[oklch(0.55_0.15_160)]/40 ring-offset-2 ring-offset-background rounded-2xl",
      )}
    >
      {/* Column header */}
      <div
        className={cn(
          "flex items-center justify-between mb-3 px-3 py-2.5 rounded-xl",
          config.headerBg,
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn("p-1 rounded-md", config.bg)}>
            <span className={config.color}>{config.icon}</span>
          </div>
          <span className="text-sm font-bold">{label}</span>
          <span
            className={cn(
              "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white",
              config.dotColor,
            )}
          >
            {opportunities.length}
          </span>
        </div>
        {column && allColumns && boardType && workspaceId && onColumnsChanged ? (
          <ColumnHeaderMenu
            column={column}
            columns={allColumns}
            boardType={boardType}
            workspaceId={workspaceId}
            itemCount={opportunities.length}
            onColumnsChanged={onColumnsChanged}
          />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Cards area */}
      <div
        className={cn(
          "space-y-2.5 min-h-[200px] p-2 rounded-xl bg-gradient-to-b transition-colors duration-200",
          config.gradient,
          isOver && "bg-[oklch(0.55_0.15_160)]/5",
        )}
      >
        {children}
      </div>
    </div>
  );
}

// ── Kanban View with DnD ─────────────────────────────────────────────────────

function KanbanView({
  opportunities: initialOpps,
  users,
  onCardClick,
  onDelete,
}: {
  opportunities: Opportunity[];
  users: User[];
  onCardClick?: (opp: Opportunity) => void;
  onDelete?: (opp: Opportunity) => void;
}) {
  const { setCreateOpportunityDialogOpen } = useAppStore();
  const queryClient = useQueryClient();
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const allColumns = useAppStore((s) => s.columnsOpportunity);
  const columns = useMemo(
    () => allColumns.filter((c) => c.workspaceId === activeWorkspaceId),
    [allColumns, activeWorkspaceId],
  );
  const setColumnsOpportunity = useAppStore((s) => s.setColumnsOpportunity);
  const { t } = useTranslation();

  const colsForDisplay = useMemo(
    () => (columns.length > 0 ? columns : DEFAULT_OPPORTUNITY_COLUMNS),
    [columns],
  );
  const statusConfig = useMemo(
    () => buildStatusConfig(colsForDisplay),
    [colsForDisplay],
  );
  const statuses = useMemo(() => {
    return [...colsForDisplay].sort((a, b) => a.order - b.order).map((c) => c.slug);
  }, [colsForDisplay]);
  const sl: Record<string, string> = useMemo(() => {
    return Object.fromEntries(colsForDisplay.map((c) => [c.slug, c.name]));
  }, [colsForDisplay]);

  // Map slug -> full column object for ColumnHeaderMenu
  const columnBySlug: Record<string, BoardColumn> = useMemo(() => {
    return Object.fromEntries(colsForDisplay.map((c) => [c.slug, c]));
  }, [colsForDisplay]);

  const [opps, setOpps] = useState<Opportunity[]>([...initialOpps]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [activeOppOriginalStatus, setActiveOppOriginalStatus] = useState<string | null>(null);

  // Synchronise l'état local quand les données react-query changent
  useEffect(() => { setOpps(initialOpps); }, [initialOpps]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeOpp = activeId ? opps.find((o) => o.id === activeId) : null;

  function findContainer(id: string): string | undefined {
    if (id.startsWith("column-")) {
      return id.replace("column-", "");
    }
    const opp = opps.find((o) => o.id === id);
    return opp?.status;
  }

  function handleDragStart(event: DragStartEvent) {
    const draggedOpp = opps.find((o) => o.id === event.active.id);
    setActiveOppOriginalStatus(draggedOpp?.status ?? null);
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      setOverColumn(null);
      return;
    }

    setOverColumn(overContainer);

    setOpps((prev) =>
      prev.map((opp) =>
        opp.id === active.id ? { ...opp, status: overContainer as Opportunity["status"] } : opp,
      ),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    const overContainer = over ? findContainer(over.id as string) : undefined;
    const oppId = active.id as string;
    const originalStatus = activeOppOriginalStatus;

    setActiveId(null);
    setOverColumn(null);
    setActiveOppOriginalStatus(null);

    if (!over || !overContainer || !originalStatus) return;
    if (originalStatus === overContainer) return;

    fetch(`/api/opportunities/${oppId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: overContainer }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      })
      .catch(() => {
        setOpps((prev) =>
          prev.map((opp) =>
            opp.id === oppId
              ? { ...opp, status: originalStatus as Opportunity["status"] }
              : opp,
          ),
        );
        toast.error("Échec de la mise à jour du statut");
      });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-220px)] scrollbar-thin">
        {statuses.map((status) => {
          const config = statusConfig[status];
          const columnOpps = opps.filter((o) => o.status === status);

          return (
            <DroppableKanbanColumn
              key={status}
              status={status}
              label={sl[status] || status}
              opportunities={columnOpps}
              isOver={overColumn === status}
              config={config}
              column={columnBySlug[status]}
              allColumns={colsForDisplay}
              boardType="opportunities"
              workspaceId={activeWorkspaceId}
              onColumnsChanged={(fresh) => setColumnsOpportunity(fresh)}
            >
              <SortableContext
                items={columnOpps.map((o) => o.id)}
                strategy={verticalListSortingStrategy}
              >
                <AnimatePresence>
                  {columnOpps.map((opp) => (
                    <SortableOppCard
                      key={opp.id}
                      opportunity={opp}
                      onClick={() => onCardClick?.(opp)}
                      onDelete={() => onDelete?.(opp)}
                      users={users}
                      statusConfig={statusConfig}
                    />
                  ))}
                </AnimatePresence>
              </SortableContext>

              {/* Add opportunity button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setCreateOpportunityDialogOpen(true)}
                className="w-full p-3 text-xs text-muted-foreground hover:text-foreground border-2 border-dashed border-muted-foreground/20 hover:border-[oklch(0.55_0.15_160)]/40 hover:bg-[oklch(0.55_0.15_160)]/5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.opportunities.newOpportunity}
              </motion.button>
            </DroppableKanbanColumn>
          );
        })}
        <AddColumnButton
          boardType="opportunities"
          workspaceId={activeWorkspaceId}
          onColumnsChanged={(fresh) => setColumnsOpportunity(fresh)}
        />
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeOpp ? (
          <div className="w-[280px] sm:w-[300px] rotate-2 opacity-90 shadow-2xl">
            <OppCardContent
              opportunity={activeOpp}
              users={users}
              statusConfig={statusConfig}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ── List View ────────────────────────────────────────────────────────────────

function ListView({
  opportunities: propOpps,
  users,
  onCardClick,
  onDelete,
}: {
  opportunities: Opportunity[];
  users: User[];
  onCardClick?: (opp: Opportunity) => void;
  onDelete?: (opp: Opportunity) => void;
}) {
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const allColumns = useAppStore((s) => s.columnsOpportunity);
  const columns = useMemo(
    () => allColumns.filter((c) => c.workspaceId === activeWorkspaceId),
    [allColumns, activeWorkspaceId],
  );
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const statusConfig = useMemo(
    () => buildStatusConfig(columns.length > 0 ? columns : DEFAULT_OPPORTUNITY_COLUMNS),
    [columns],
  );
  const sl: Record<string, string> = useMemo(() => {
    const cols = columns.length > 0 ? columns : DEFAULT_OPPORTUNITY_COLUMNS;
    return Object.fromEntries(cols.map((c) => [c.slug, c.name]));
  }, [columns]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredAndSortedOpps = useMemo(() => {
    let result = propOpps.filter(
      (opp) =>
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opp.organisation &&
          opp.organisation.toLowerCase().includes(searchQuery.toLowerCase())),
    );

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "organisation":
          cmp = (a.organisation || "").localeCompare(b.organisation || "");
          break;
        case "dueDate":
          cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "responsable":
          cmp = getUserName(a.responsableId, users).localeCompare(
            getUserName(b.responsableId, users),
          );
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [searchQuery, sortField, sortDir, propOpps, users]);

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.opportunities.search}
            className="pl-9 h-9 bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160)]/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden shadow-sm">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_120px_110px_130px_150px_1fr] gap-4 px-4 py-2.5 bg-muted/50 border-b">
          <button
            onClick={() => handleSort("title")}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {t.opportunities.columns.title}
          </button>
          <button
            onClick={() => handleSort("organisation")}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {t.opportunities.columns.organisation}
          </button>
          <button
            onClick={() => handleSort("dueDate")}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {t.opportunities.columns.dueDate}
          </button>
          <button
            onClick={() => handleSort("status")}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {t.opportunities.columns.status}
          </button>
          <button
            onClick={() => handleSort("responsable")}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {t.opportunities.columns.responsable}
          </button>
          <span className="text-xs font-semibold text-muted-foreground">
            {t.opportunities.columns.notes}
          </span>
        </div>

        {/* Rows */}
        <div>
          {filteredAndSortedOpps.map((opp, idx) => {
            const cfg = statusConfig[opp.status] || {
              color: "text-muted-foreground",
              bg: "bg-muted/50",
              gradient: "from-muted/20 to-transparent",
              headerBg: "bg-muted/50",
              dotColor: "bg-muted-foreground",
              icon: null,
            };
            const overdue = isOverdue(opp.dueDate);

            return (
              <motion.div
                key={opp.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => onCardClick?.(opp)}
                className={cn(
                  "grid grid-cols-[1fr_120px_110px_130px_150px_1fr] gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors cursor-pointer",
                  idx % 2 === 1 && "bg-muted/10",
                )}
              >
                {/* Title + description snippet */}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{opp.title}</p>
                  {opp.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {opp.description}
                    </p>
                  )}
                </div>

                {/* Organisation */}
                <div className="min-w-0">
                  {opp.organisation ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 font-normal bg-muted/40 flex items-center gap-1 w-fit"
                    >
                      <Building2 className="h-2.5 w-2.5" />
                      <span className="truncate">{opp.organisation}</span>
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </div>

                {/* Deadline */}
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    overdue
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-muted-foreground",
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  {opp.dueDate
                    ? new Date(opp.dueDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                  {overdue && (
                    <span className="text-[10px] text-rose-400 ml-1">
                      (en retard)
                    </span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      cfg.bg,
                      cfg.color,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
                    {sl[opp.status] || opp.status}
                  </span>
                </div>

                {/* Responsable */}
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5 ring-1 ring-background">
                    <AvatarFallback className="text-[7px] bg-muted font-medium">
                      {getUserInitials(opp.responsableId, users)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate">
                    {getUserName(opp.responsableId, users)}
                  </span>
                </div>

                {/* Notes */}
                <div className="min-w-0">
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {opp.description || "—"}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Opportunities View ──────────────────────────────────────────────────

export function OpportunitiesView() {
  const { opportunityViewMode, setOpportunityViewMode, setCreateOpportunityDialogOpen, setOpportunityCount } =
    useAppStore();
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const wsParams = activeWorkspaceId ? `?workspaceId=${activeWorkspaceId}` : "";

  const { data: apiOpps, isLoading } = useQuery({
    queryKey: ["opportunities", activeWorkspaceId],
    queryFn: () => fetchJson<Opportunity[]>(`/api/opportunities${wsParams}`),
  });

  const opportunities = apiOpps ?? [];

  // Update sidebar badge
  useEffect(() => {
    setOpportunityCount(opportunities.length);
  }, [opportunities.length, setOpportunityCount]);

  const { data: apiUsers } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetchJson<User[]>("/api/users"),
  });
  const users = apiUsers ?? [];

  const wonCount = opportunities.filter((o) => o.status === "accepte").length;
  const lostCount = opportunities.filter((o) => o.status === "refuse").length;

  const allColumnsMain = useAppStore((s) => s.columnsOpportunity);
  const columns = useMemo(
    () => allColumnsMain.filter((c) => c.workspaceId === activeWorkspaceId),
    [allColumnsMain, activeWorkspaceId],
  );
  const statusConfig = useMemo(
    () => buildStatusConfig(columns.length > 0 ? columns : DEFAULT_OPPORTUNITY_COLUMNS),
    [columns],
  );
  const statusLabels: Record<string, string> = useMemo(() => {
    const cols = columns.length > 0 ? columns : DEFAULT_OPPORTUNITY_COLUMNS;
    return Object.fromEntries(cols.map((c) => [c.slug, c.name]));
  }, [columns]);

  const handleDelete = useCallback(
    async (opp: Opportunity) => {
      try {
        const res = await fetch(`/api/opportunities/${opp.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast.success("Opportunité supprimée");
        queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      } catch {
        toast.error("Échec de la suppression");
      }
    },
    [queryClient],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {t.opportunities.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-semibold text-foreground">
              {opportunities.length}
            </span>{" "}
            total ·{" "}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {wonCount}
            </span>{" "}
            {t.opportunities.statuses.accepte.toLowerCase()} ·{" "}
            <span className="font-semibold text-red-500">
              {lostCount}
            </span>{" "}
            {t.opportunities.statuses.refuse.toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs
            value={opportunityViewMode}
            onValueChange={(v) =>
              setOpportunityViewMode(v as typeof opportunityViewMode)
            }
          >
            <TabsList className="h-8 bg-muted/50 p-0.5">
              <TabsTrigger
                value="kanban"
                className={cn(
                  "text-xs px-2.5 h-7 rounded-md gap-1 data-[state=active]:bg-background data-[state=active]:shadow-sm",
                )}
              >
                <Columns3 className="h-3.5 w-3.5" /> {t.opportunities.kanban}
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="text-xs px-2.5 h-7 rounded-md gap-1 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <List className="h-3.5 w-3.5" /> {t.opportunities.list}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            size="sm"
            onClick={() => setCreateOpportunityDialogOpen(true)}
            className="h-8 gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.48_0.15_160)] hover:from-[oklch(0.48_0.15_160)] hover:to-[oklch(0.42_0.15_160)] text-white shadow-sm shadow-[oklch(0.55_0.15_160)]/20"
          >
            <Plus className="h-3.5 w-3.5" /> {t.opportunities.newOpportunity}
          </Button>
        </div>
      </div>

      {/* Views */}
      <AnimatePresence mode="wait">
        {isLoading && opportunities.length === 0 && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-20"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-[oklch(0.55_0.15_160)]" />
              <span className="text-sm text-muted-foreground">
                {t.common.loading}
              </span>
            </div>
          </motion.div>
        )}
        {!isLoading && opportunityViewMode === "kanban" && (
          <KanbanView
            key="kanban"
            opportunities={opportunities}
            users={users}
            onCardClick={setSelectedOpp}
            onDelete={handleDelete}
          />
        )}
        {!isLoading && opportunityViewMode === "list" && (
          <ListView
            key="list"
            opportunities={opportunities}
            users={users}
            onCardClick={setSelectedOpp}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>

      {/* Detail Dialog */}
      <Dialog open={!!selectedOpp} onOpenChange={(open) => !open && setSelectedOpp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {selectedOpp?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedOpp && (
            <div className="space-y-4">
              {/* Organisation */}
              {selectedOpp.organisation && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{selectedOpp.organisation}</span>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t.opportunities.columns.status}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    statusConfig[selectedOpp.status]?.bg,
                    statusConfig[selectedOpp.status]?.color,
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig[selectedOpp.status]?.dotColor)} />
                  {statusLabels[selectedOpp.status] || selectedOpp.status}
                </span>
              </div>

              {/* Deadline */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className={cn(
                  "text-sm",
                  isOverdue(selectedOpp.dueDate) && "text-rose-600 dark:text-rose-400 font-medium",
                )}>
                  {selectedOpp.dueDate
                    ? new Date(selectedOpp.dueDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                  {isOverdue(selectedOpp.dueDate) && " (en retard)"}
                </span>
              </div>

              {/* Responsable */}
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <Avatar className="h-5 w-5 ring-1 ring-background">
                  <AvatarFallback className="text-[7px] bg-muted font-medium">
                    {getUserInitials(selectedOpp.responsableId, users)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{getUserName(selectedOpp.responsableId, users)}</span>
              </div>

              {/* Description / Notes */}
              {selectedOpp.description && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-1">{t.opportunities.columns.notes}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedOpp.description}
                  </p>
                </div>
              )}

              {/* Created */}
              <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                <p>Créé le {new Date(selectedOpp.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>

              {/* Delete button */}
              <div className="pt-2 border-t">
                {/* Edit button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 mb-2"
                  onClick={() => {
                    useAppStore.getState().setEditingOpportunity(selectedOpp!);
                    setSelectedOpp(null);
                    useAppStore.getState().setCreateOpportunityDialogOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t.common.edit}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => {
                    setSelectedOpp(null);
                    handleDelete(selectedOpp);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t.common.delete}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

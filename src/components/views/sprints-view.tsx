'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Zap,
  Plus,
  Search,
  Calendar,
  Target,
  TrendingUp,
  ListChecks,
  Clock,
  ArrowRight,
  Sparkles,
  GripVertical,
} from 'lucide-react';
import { useAppData } from '@/hooks/use-app-data';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  avgSprintVelocityInPeriod,
  compareCounts,
  countActiveSprintsCreatedInPeriod,
  getPeriodBounds,
} from '@/lib/analytics';
import type { Sprint, SprintStatus } from '@/lib/types';
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function isMeaningfulTrend(change: string): boolean {
  return change !== '0' && change !== '0%' && change !== '+0' && change !== '+0%';
}

// ── Sprint Status Config ──────────────────────────────────────────────────────

const sprintStatusConfig: Record<SprintStatus, {
  color: string;
  bg: string;
  solidBg: string;
  solidText: string;
  dotColor: string;
  borderColor: string;
  icon: React.ReactNode;
}> = {
  planning: {
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-500/10',
    solidBg: 'bg-cyan-100 dark:bg-cyan-900/50',
    solidText: 'text-cyan-700 dark:text-cyan-300',
    dotColor: 'bg-cyan-500',
    borderColor: 'border-cyan-500/20',
    icon: <Clock className="h-3 w-3" />,
  },
  active: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    solidBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    solidText: 'text-emerald-700 dark:text-emerald-300',
    dotColor: 'bg-emerald-500',
    borderColor: 'border-emerald-500/20',
    icon: <Zap className="h-3 w-3" />,
  },
  completed: {
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-500/10',
    solidBg: 'bg-slate-100 dark:bg-slate-800/50',
    solidText: 'text-slate-600 dark:text-slate-300',
    dotColor: 'bg-slate-400',
    borderColor: 'border-slate-500/20',
    icon: <ListChecks className="h-3 w-3" />,
  },
};

const FILTER_SELECT_TRIGGER_CLASS = (isActive: boolean) =>
  cn(
    'h-8 w-auto min-w-[140px] max-w-[170px] text-xs px-3 rounded-lg gap-2 border shadow-none transition-all duration-200',
    '[&_svg:not([class*="size-"])]:size-3.5',
    'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    isActive
      ? 'bg-[oklch(0.55_0.15_160)]/5 border-[oklch(0.55_0.15_160)]/30 text-[oklch(0.55_0.15_160)] font-medium'
      : 'bg-background hover:bg-muted/50 border-border text-muted-foreground hover:text-foreground'
  );

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getSprintStats(sprint: Sprint, allTasks: import('@/lib/types').Task[]) {
  const sprintTasks = allTasks.filter((t) => sprint.taskIds.includes(t.id));
  const completed = sprintTasks.filter((t) => t.status === 'done').length;
  const total = sprintTasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, progress };
}

// ── Animation Variants ────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ── Sprint Card ───────────────────────────────────────────────────────────────

function SprintCard({
  sprint,
  dragHandleProps,
}: {
  sprint: Sprint;
  dragHandleProps?: {
    attributes: React.HTMLAttributes<HTMLButtonElement>;
    listeners?: React.HTMLAttributes<HTMLButtonElement>;
  };
}) {
  const { t } = useTranslation();
  const { openMyTasksWithSprintFilter } = useAppStore();
  const { tasks, projects, getProjectName } = useAppData();
  const config = sprintStatusConfig[sprint.status];
  const projectName = getProjectName(sprint.projectId);
  const project = projects.find((p) => p.id === sprint.projectId);
  const stats = getSprintStats(sprint, tasks);
  const statusLabels: Record<SprintStatus, string> = {
    planning: t.sprints.planning,
    active: t.sprints.active,
    completed: t.sprints.completed,
  };

  return (
    <div className="group">
      <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300 border-0 shadow-sm">
        {/* Accent strip */}
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, ${project?.color || '#10b981'}, ${project?.color || '#10b981'}88)`,
          }}
        />

        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-2.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                type="button"
                aria-label="Drag sprint"
                className="flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing touch-none"
                onClick={(e) => e.stopPropagation()}
                {...dragHandleProps?.attributes}
                {...dragHandleProps?.listeners}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate">{sprint.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground font-medium truncate">{projectName}</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
                      config.solidBg,
                      config.solidText
                    )}
                  >
                    {config.icon}
                    {statusLabels[sprint.status]}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Goal */}
          <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed pl-0">
            {sprint.goal}
          </p>

          {/* Date range */}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-3 font-medium">
            <Calendar className="h-3 w-3" />
            {formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openMyTasksWithSprintFilter(sprint.id);
                }}
                className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground hover:underline cursor-pointer transition-colors"
              >
                {stats.completed}/{stats.total} {t.sprints.tasks}
              </button>
              <span className="text-[10px] font-bold" style={{ color: project?.color || '#10b981' }}>
                {stats.progress}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' as const }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${project?.color || '#10b981'}, ${project?.color || '#10b981'}dd)`,
                }}
              />
            </div>
          </div>

          {/* Footer: task count + velocity */}
          <div className="flex items-center justify-between pt-2.5 border-t">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
              <ListChecks className="h-3 w-3" />
              {stats.total} {t.sprints.tasks}
            </div>
            {sprint.velocity !== undefined && sprint.velocity > 0 && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                        'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                      )}
                    >
                      <TrendingUp className="h-3 w-3" />
                      {sprint.velocity} pts
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">{t.sprints.velocity}: {sprint.velocity}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const MemoizedSprintCard = memo(
  SprintCard,
  (prevProps, nextProps) => {
    return (
      prevProps.sprint.id === nextProps.sprint.id &&
      prevProps.sprint.status === nextProps.sprint.status &&
      prevProps.sprint.name === nextProps.sprint.name &&
      prevProps.sprint.goal === nextProps.sprint.goal &&
      prevProps.sprint.startDate === nextProps.sprint.startDate &&
      prevProps.sprint.endDate === nextProps.sprint.endDate &&
      prevProps.sprint.velocity === nextProps.sprint.velocity
    );
  }
);

function SortableSprintCard({ sprint }: { sprint: Sprint }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sprint.id, data: { type: 'sprint', sprint } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <MemoizedSprintCard sprint={sprint} dragHandleProps={{ attributes, listeners }} />
    </div>
  );
}

function DroppableSprintColumn({
  status,
  label,
  color,
  dotColor,
  sprints,
  isOver,
  children,
}: {
  status: SprintStatus;
  label: string;
  color: string;
  dotColor: string;
  sprints: Sprint[];
  isOver: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: `column-${status}`, data: { type: 'column', status } });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'space-y-3 min-h-[240px] transition-shadow duration-200',
        isOver && 'ring-2 ring-[oklch(0.55_0.15_160)]/40 ring-offset-2 ring-offset-background rounded-2xl p-1'
      )}
    >
      <div className={cn('flex items-center justify-between rounded-xl px-3 py-2.5', color)}>
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', dotColor)} />
          <span className="text-xs font-semibold">{label}</span>
          <span className="text-[10px] font-bold text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded-full">
            {sprints.length}
          </span>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SprintBoard({
  columns,
  filteredSprints,
  emptyLabel,
}: {
  columns: { status: SprintStatus; label: string; color: string; dotColor: string }[];
  filteredSprints: Sprint[];
  emptyLabel: string;
}) {
  const { sprints: appSprints, updateSprintStatus } = useAppData();
  const [dragSprints, setDragSprints] = useState<Sprint[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<SprintStatus | null>(null);

  const sprints = dragSprints ?? appSprints;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeSprint = activeId ? sprints.find((s) => s.id === activeId) : null;

  function findContainer(id: string, sourceSprints = sprints): SprintStatus | undefined {
    if (id.startsWith('column-')) {
      return id.replace('column-', '') as SprintStatus;
    }
    return sourceSprints.find((s) => s.id === id)?.status;
  }

  function handleDragStart(event: DragStartEvent) {
    setDragSprints([...appSprints]);
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) {
      if (overColumn !== null) setOverColumn(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) {
      if (overColumn !== null) setOverColumn(null);
      return;
    }

    if (activeContainer !== overContainer) {
      setOverColumn(overContainer);
      setDragSprints((prev) => {
        const list = prev ?? appSprints;
        return list.map((sprint) =>
          sprint.id === activeId ? { ...sprint, status: overContainer } : sprint
        );
      });
    } else {
      if (overColumn !== overContainer) {
        setOverColumn(overContainer);
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const currentSprints = dragSprints ?? appSprints;
    const sprintId = active.id as string;
    const originalSprint = appSprints.find((s) => s.id === sprintId);

    setActiveId(null);
    setOverColumn(null);
    setDragSprints(null);

    if (!over || !originalSprint) return;

    const overContainer = findContainer(over.id as string, currentSprints);

    if (!overContainer || originalSprint.status === overContainer) return;

    void updateSprintStatus(sprintId, overContainer);
  }

  const boardSprints = filteredSprints.map(
    (sprint) => sprints.find((s) => s.id === sprint.id) ?? sprint
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {columns.map((col) => {
          const columnSprints = boardSprints.filter((s) => s.status === col.status);

          return (
            <DroppableSprintColumn
              key={col.status}
              status={col.status}
              label={col.label}
              color={col.color}
              dotColor={col.dotColor}
              sprints={columnSprints}
              isOver={overColumn === col.status}
            >
              <SortableContext
                items={columnSprints.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {columnSprints.map((sprint) => (
                  <SortableSprintCard key={sprint.id} sprint={sprint} />
                ))}
              </SortableContext>
              {columnSprints.length === 0 && (
                <div className="border-2 border-dashed rounded-xl p-6 text-center">
                  <p className="text-xs text-muted-foreground">{emptyLabel}</p>
                </div>
              )}
            </DroppableSprintColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeSprint ? (
          <div className="rotate-2 opacity-90 shadow-2xl">
            <MemoizedSprintCard sprint={activeSprint} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  trend,
  gradient,
  iconBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  gradient: string;
  iconBg: string;
}) {
  return (
    <motion.div variants={item} whileHover={{ y: -2 }} className="group">
      <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 relative">
          <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300', gradient)} />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconBg)}>
                {icon}
              </div>
              {trend && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-emerald-500/20 text-emerald-600 bg-emerald-500/10">
                  {trend}
                </Badge>
              )}
            </div>
            <p className="text-xl font-extrabold tracking-tight">{value}</p>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Sprints View ─────────────────────────────────────────────────────────

export function SprintsView() {
  const { t } = useTranslation();
  const { sprints, projects } = useAppData();
  const { setCreateSprintDialogOpen } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Compute stats
  const stats = useMemo(() => {
    const total = sprints.length;
    const active = sprints.filter((s) => s.status === 'active').length;
    const velocities = sprints.filter((s) => s.velocity && s.velocity > 0);
    const avgVelocity = velocities.length > 0
      ? Math.round(velocities.reduce((sum, s) => sum + (s.velocity || 0), 0) / velocities.length)
      : 0;
    const tasksInSprints = sprints.reduce((sum, s) => sum + s.taskIds.length, 0);
    return { total, active, avgVelocity, tasksInSprints };
  }, [sprints]);

  const trends = useMemo(() => {
    const { currentStart, previousStart, now } = getPeriodBounds(7);
    const weekAgo = currentStart;

    const activeThisWeek = countActiveSprintsCreatedInPeriod(sprints, currentStart, now);
    const activeLastWeek = countActiveSprintsCreatedInPeriod(sprints, previousStart, weekAgo);
    const activeTrend = compareCounts(activeThisWeek, activeLastWeek, 'absolute');

    const velocityThisWeek = avgSprintVelocityInPeriod(sprints, currentStart, now);
    const velocityLastWeek = avgSprintVelocityInPeriod(sprints, previousStart, weekAgo);
    const velocityTrend = compareCounts(velocityThisWeek, velocityLastWeek, 'absolute');

    return { activeTrend, velocityTrend };
  }, [sprints]);

  // Filter sprints
  const filteredSprints = useMemo(() => {
    return sprints.filter((sprint) => {
      const matchesSearch =
        sprint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sprint.goal.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProject = projectFilter === 'all' || sprint.projectId === projectFilter;
      const matchesStatus = statusFilter === 'all' || sprint.status === statusFilter;
      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [searchQuery, projectFilter, statusFilter, sprints]);

  // Group by status
  const columns: { status: SprintStatus; label: string; color: string; dotColor: string }[] = [
    { status: 'planning', label: t.sprints.planning, color: 'bg-cyan-500/10', dotColor: 'bg-cyan-500' },
    { status: 'active', label: t.sprints.active, color: 'bg-emerald-500/10', dotColor: 'bg-emerald-500' },
    { status: 'completed', label: t.sprints.completed, color: 'bg-slate-500/10', dotColor: 'bg-slate-400' },
  ];

  return (
    <div className="space-y-5">
      {/* Sleek, Modern Tier 1 Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title and Badges */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{t.sprints.title}</h2>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-muted border border-border/80 text-muted-foreground">
                {stats.total} {t.sprints.title.toLowerCase()}
              </span>
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                {stats.active} {t.sprints.active.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Main Action Button */}
        <Button
          size="sm"
          className="h-8 gap-1.5 rounded-lg bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.48_0.15_160)] hover:from-[oklch(0.48_0.15_160)] hover:to-[oklch(0.42_0.15_160)] text-white shadow-sm font-medium"
          onClick={() => setCreateSprintDialogOpen(true)}
        >
          <Sparkles className="h-3.5 w-3.5" /> {t.sprints.newSprint}
        </Button>
      </div>

      {/* Stats Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <StatCard
          icon={<Zap className="h-4 w-4 text-emerald-600" />}
          label={t.sprints.title}
          value={stats.total}
          gradient="bg-gradient-to-br from-emerald-500/5 via-emerald-500/[0.02] to-transparent"
          iconBg="bg-emerald-500/10 border border-emerald-500/20"
        />
        <StatCard
          icon={<Target className="h-4 w-4 text-[oklch(0.55_0.15_160)]" />}
          label={t.sprints.active}
          value={stats.active}
          trend={isMeaningfulTrend(trends.activeTrend.change) ? trends.activeTrend.change : undefined}
          gradient="bg-gradient-to-br from-[oklch(0.55_0.15_160/0.05)] via-[oklch(0.55_0.15_160/0.02)] to-transparent"
          iconBg="bg-[oklch(0.55_0.15_160/0.1)] border border-[oklch(0.55_0.15_160/0.2)]"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-amber-600" />}
          label={t.sprints.velocity}
          value={`${stats.avgVelocity} pts`}
          trend={isMeaningfulTrend(trends.velocityTrend.change) ? trends.velocityTrend.change : undefined}
          gradient="bg-gradient-to-br from-amber-500/5 via-amber-500/[0.02] to-transparent"
          iconBg="bg-amber-500/10 border border-amber-500/20"
        />
        <StatCard
          icon={<ListChecks className="h-4 w-4 text-cyan-600" />}
          label={t.sprints.tasks}
          value={stats.tasksInSprints}
          gradient="bg-gradient-to-br from-cyan-500/5 via-cyan-500/[0.02] to-transparent"
          iconBg="bg-cyan-500/10 border border-cyan-500/20"
        />
      </motion.div>

      {/* Sleek Tier 2: Search and Contextual Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-muted/15 dark:bg-muted/5 rounded-xl border border-border/60">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Projects Select */}
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger
              size="sm"
              className={FILTER_SELECT_TRIGGER_CLASS(projectFilter !== 'all')}
            >
              <SelectValue placeholder={t.milestones.project} />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              <SelectItem value="all">{t.sprints.all} {t.milestones.project}s</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Select */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger
              size="sm"
              className={FILTER_SELECT_TRIGGER_CLASS(statusFilter !== 'all')}
            >
              <SelectValue placeholder={t.sprints.status} />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              <SelectItem value="all">{t.sprints.all}</SelectItem>
              <SelectItem value="planning">{t.sprints.planning}</SelectItem>
              <SelectItem value="active">{t.sprints.active}</SelectItem>
              <SelectItem value="completed">{t.sprints.completed}</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filter Button */}
          {(projectFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setProjectFilter('all');
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="h-8 text-xs hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg px-2.5 gap-1.5"
            >
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Inline Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t.sprints.search}
            className="pl-9 pr-8 h-8 bg-background border-border hover:border-muted-foreground/30 text-xs rounded-lg transition-colors focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery.trim() !== '' && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Sprint Board - 3 columns */}
      <SprintBoard
        columns={columns}
        filteredSprints={filteredSprints}
        emptyLabel={t.sprints.noResults}
      />
    </div>
  );
}

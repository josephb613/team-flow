'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  Filter,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  List,
  Columns3,
  User,
  Calendar,
  GripVertical,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronRight,
  Flame,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  Target,
  AlertTriangle,
  SlidersHorizontal,
  Zap,
  Flag,
} from 'lucide-react';
import { useAppData } from '@/hooks/use-app-data';
import { useTranslation } from '@/lib/i18n';
import type { Task, TaskStatus, TaskPriority } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// DnD Kit imports
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Config Maps ──────────────────────────────────────────────────────────────

const statusConfig: Record<TaskStatus, { color: string; icon: React.ReactNode; bg: string; gradient: string; headerBg: string; dotColor: string }> = {
  todo: {
    color: 'text-slate-600 dark:text-slate-400',
    icon: <Circle className="h-4 w-4" />,
    bg: 'bg-slate-500/10',
    gradient: 'from-slate-50 to-slate-100/50 dark:from-slate-950/50 dark:to-slate-900/30',
    headerBg: 'bg-slate-100 dark:bg-slate-800/60',
    dotColor: 'bg-slate-400',
  },
  in_progress: {
    color: 'text-cyan-600 dark:text-cyan-400',
    icon: <Clock className="h-4 w-4" />,
    bg: 'bg-cyan-500/10',
    gradient: 'from-cyan-50/80 to-cyan-100/30 dark:from-cyan-950/40 dark:to-cyan-900/20',
    headerBg: 'bg-cyan-100 dark:bg-cyan-900/40',
    dotColor: 'bg-cyan-500',
  },
  review: {
    color: 'text-amber-600 dark:text-amber-400',
    icon: <AlertCircle className="h-4 w-4" />,
    bg: 'bg-amber-500/10',
    gradient: 'from-amber-50/80 to-amber-100/30 dark:from-amber-950/40 dark:to-amber-900/20',
    headerBg: 'bg-amber-100 dark:bg-amber-900/40',
    dotColor: 'bg-amber-500',
  },
  done: {
    color: 'text-blue-600 dark:text-blue-400',
    icon: <CheckCircle2 className="h-4 w-4" />,
    bg: 'bg-blue-500/10',
    gradient: 'from-blue-50/80 to-blue-100/30 dark:from-blue-950/40 dark:to-blue-900/20',
    headerBg: 'bg-blue-100 dark:bg-blue-900/40',
    dotColor: 'bg-blue-500',
  },
};

const priorityConfig: Record<TaskPriority, { color: string; bg: string; strip: string; icon: React.ReactNode; dotColor: string; gradientFrom: string }> = {
  urgent: {
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10 border-rose-200 dark:border-rose-800',
    strip: 'border-l-rose-500',
    icon: <Flame className="h-3 w-3" />,
    dotColor: 'bg-rose-500',
    gradientFrom: 'from-rose-500',
  },
  high: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-200 dark:border-amber-800',
    strip: 'border-l-amber-500',
    icon: <ArrowUpRight className="h-3 w-3" />,
    dotColor: 'bg-amber-500',
    gradientFrom: 'from-amber-500',
  },
  medium: {
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-200 dark:border-cyan-800',
    strip: 'border-l-cyan-500',
    icon: <ArrowRight className="h-3 w-3" />,
    dotColor: 'bg-cyan-500',
    gradientFrom: 'from-cyan-500',
  },
  low: {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10 border-blue-200 dark:border-blue-800',
    strip: 'border-l-blue-500',
    icon: <ArrowDownRight className="h-3 w-3" />,
    dotColor: 'bg-blue-500',
    gradientFrom: 'from-blue-500',
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function isOverdue(dueDate: string, status: TaskStatus) {
  if (status === 'done') return false;
  return new Date(dueDate) < new Date();
}

function filterTasksBySprintAndMilestone(
  tasks: Task[],
  sprintFilter: string,
  milestoneFilter: string
): Task[] {
  return tasks.filter((task) => {
    if (sprintFilter !== 'all' && task.sprintId !== sprintFilter) return false;
    if (milestoneFilter !== 'all' && task.milestoneId !== milestoneFilter) return false;
    return true;
  });
}

// ── Toolbar styles ───────────────────────────────────────────────────────────

const VIEW_TAB_TRIGGER_CLASS =
  'text-xs px-2.5 h-7 rounded-md gap-1 data-[state=active]:bg-background data-[state=active]:shadow-sm';

const FILTER_SELECT_TRIGGER_CLASS = (isActive: boolean) =>
  cn(
    'h-7 w-auto min-w-[140px] max-w-[170px] text-xs px-2.5 rounded-md gap-1 border-transparent shadow-none',
    '[&_svg:not([class*="size-"])]:size-3.5',
    'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    isActive
      ? 'bg-background shadow-sm text-foreground'
      : 'bg-transparent text-muted-foreground hover:text-foreground'
  );

// ── Sort types ───────────────────────────────────────────────────────────────

type SortField = 'title' | 'priority' | 'dueDate' | 'status' | 'project';
type SortDirection = 'asc' | 'desc';

const priorityOrder: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

// ── Task Card (Kanban) - base card without sortable ──────────────────────────

function TaskCardContent({
  task,
  onClick,
  dragHandleProps,
}: {
  task: Task;
  onClick?: () => void;
  dragHandleProps?: {
    attributes: React.HTMLAttributes<HTMLButtonElement>;
    listeners: React.HTMLAttributes<HTMLButtonElement>;
  };
}) {
  const { openEditTaskDialog } = useAppStore();
  const { t } = useTranslation();
  const { users, getUserName, getUserInitials } = useAppData();
  const subtaskTotal = task.subtasks.length;
  const subtaskDone = task.subtasks.filter((s) => s.completed).length;
  const priority = priorityConfig[task.priority];
  const overdue = isOverdue(task.dueDate, task.status);
  const pl: Record<TaskPriority, string> = { urgent: t.tasks.urgent, high: t.tasks.high, medium: t.tasks.medium, low: t.tasks.low };
  const assigneeStatus = users.find((u) => u.id === task.assigneeId)?.status || 'offline';

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-card rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden',
        'border-l-[3px]',
        priority.strip
      )}
    >
      <div className="p-3 pl-3.5">
        {/* Top row: priority badge + drag handle + menu */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 font-semibold gap-0.5 flex items-center',
                priority.bg,
                priority.color
              )}
            >
              {priority.icon}
              {pl[task.priority]}
            </Badge>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Drag task"
              className="opacity-0 group-hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing p-0.5 touch-none"
              onClick={(e) => e.stopPropagation()}
              {...dragHandleProps?.attributes}
              {...dragHandleProps?.listeners}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => openEditTaskDialog(task.id)}>
                  {t.common.edit}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditTaskDialog(task.id)}>
                  {t.tasks.assignee}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">{t.common.delete}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium mb-1.5 leading-snug">{task.title}</h4>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{task.description}</p>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-muted/80 font-medium">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Subtask progress */}
        {subtaskTotal > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground font-medium">{t.tasks.subtasks}</span>
              <span className="text-[10px] font-bold">{subtaskDone}/{subtaskTotal}</span>
            </div>
            <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full bg-gradient-to-r transition-all',
                  subtaskDone === subtaskTotal
                    ? 'from-blue-400 to-blue-500'
                    : 'from-[oklch(0.60_0.18_250)] to-[oklch(0.5_0.12_170)]'
                )}
                style={{ width: `${(subtaskDone / subtaskTotal) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer: assignee + due date */}
        <div className="flex items-center justify-between">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-5 w-5 ring-1 ring-background">
                      <AvatarFallback className="text-[7px] bg-muted font-medium">
                        {getUserInitials(task.assigneeId)}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator */}
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-background',
                        assigneeStatus === 'online' ? 'bg-blue-500' :
                        assigneeStatus === 'away' ? 'bg-amber-400' :
                        assigneeStatus === 'busy' ? 'bg-rose-500' :
                        'bg-slate-300 dark:bg-slate-600'
                      )}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{getUserName(task.assigneeId)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{getUserName(task.assigneeId)} · {assigneeStatus}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div
            className={cn(
              'flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md',
              overdue
                ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                : 'text-muted-foreground'
            )}
          >
            {overdue ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <Calendar className="h-3 w-3" />
            )}
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sortable Task Card (wraps TaskCardContent with useSortable) ──────────────

function SortableTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCardContent
        task={task}
        onClick={onClick}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}

// ── Droppable Kanban Column ──────────────────────────────────────────────────

function DroppableKanbanColumn({
  status,
  statusLabel,
  tasks,
  isOver,
  onAddTask,
  children,
}: {
  status: TaskStatus;
  statusLabel: string;
  tasks: Task[];
  isOver: boolean;
  onAddTask: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { setNodeRef } = useDroppable({ id: `column-${status}`, data: { type: 'column', status } });
  const config = statusConfig[status];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-[280px] sm:w-[300px] transition-all duration-200',
        isOver && 'ring-2 ring-[oklch(0.55_0.18_250)]/40 ring-offset-2 ring-offset-background rounded-2xl'
      )}
    >
      {/* Column header */}
      <div className={cn('flex items-center justify-between mb-3 px-3 py-2.5 rounded-xl', config.headerBg)}>
        <div className="flex items-center gap-2">
          <div className={cn('p-1 rounded-md', config.bg)}>
            <span className={config.color}>{config.icon}</span>
          </div>
          <span className="text-sm font-bold">{statusLabel}</span>
          <span
            className={cn(
              'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white',
              config.dotColor
            )}
          >
            {tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-black/5 dark:hover:bg-white/10"
          onClick={onAddTask}
          aria-label={t.tasks.addTask}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Cards area with subtle gradient background */}
      <div
        className={cn(
          'space-y-2.5 min-h-[200px] p-2 rounded-xl bg-gradient-to-b transition-colors duration-200',
          config.gradient,
          isOver && 'bg-[oklch(0.55_0.18_250)]/5'
        )}
      >
        {children}
      </div>
    </div>
  );
}

// ── Kanban View with DnD ─────────────────────────────────────────────────────

function KanbanView({
  sprintFilter,
  milestoneFilter,
  searchQuery,
}: {
  sprintFilter: string;
  milestoneFilter: string;
  searchQuery: string;
}) {
  const { setSelectedTask, openCreateTaskDialog } = useAppStore();
  const { t } = useTranslation();
  const { tasks: appTasks, updateTaskStatus } = useAppData();
  const statuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
  const sl: Record<TaskStatus, string> = { todo: t.tasks.todo, in_progress: t.tasks.inProgress, review: t.tasks.inReview, done: t.tasks.done };

  const [dragTasks, setDragTasks] = useState<Task[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  const filteredTasks = useMemo(() => {
    let result = filterTasksBySprintAndMilestone(appTasks, sprintFilter, milestoneFilter);
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    return result;
  }, [appTasks, sprintFilter, milestoneFilter, searchQuery]);

  const tasks = dragTasks ?? filteredTasks;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  function findContainer(id: string, sourceTasks = tasks): TaskStatus | undefined {
    // Check if id is a column id
    if (id.startsWith('column-')) {
      return id.replace('column-', '') as TaskStatus;
    }
    // Otherwise find which column the task is in
    const task = sourceTasks.find((t) => t.id === id);
    return task?.status;
  }

  function handleDragStart(event: DragStartEvent) {
    setDragTasks([...filteredTasks]);
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

    // Set over column for visual feedback
    setOverColumn(overContainer);

    setDragTasks((prev) =>
      (prev ?? filteredTasks).map((task) =>
        task.id === active.id ? { ...task, status: overContainer } : task
      )
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const currentTasks = dragTasks ?? filteredTasks;
    const taskId = active.id as string;
    const originalTask = appTasks.find((t) => t.id === taskId);

    setActiveId(null);
    setOverColumn(null);
    setDragTasks(null);

    if (!over || !originalTask) return;

    const overContainer = findContainer(over.id as string, currentTasks);

    if (!overContainer || originalTask.status === overContainer) return;

    void updateTaskStatus(taskId, overContainer);
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task as unknown as Record<string, unknown>);
  };

  if (filteredTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground min-h-[calc(100vh-220px)]">
        <Search className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">{t.myTasks.noResults}</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-220px)] scrollbar-thin">
        {statuses.map((status) => {
          const config = statusConfig[status];
          const columnTasks = tasks.filter((task) => task.status === status);

          return (
            <DroppableKanbanColumn
              key={status}
              status={status}
              statusLabel={sl[status]}
              tasks={columnTasks}
              isOver={overColumn === status}
              onAddTask={() => openCreateTaskDialog({ status })}
            >
              <SortableContext
                items={columnTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {columnTasks.map((task) => (
                  <SortableTaskCard
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                  />
                ))}
              </SortableContext>

              {/* Add task button with dashed border */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => openCreateTaskDialog({ status })}
                className="w-full p-3 text-xs text-muted-foreground hover:text-foreground border-2 border-dashed border-muted-foreground/20 hover:border-[oklch(0.55_0.18_250)]/40 hover:bg-[oklch(0.55_0.18_250)]/5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.tasks.addTask}
              </motion.button>
            </DroppableKanbanColumn>
          );
        })}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? (
          <div className="w-[280px] sm:w-[300px] rotate-2 opacity-90 shadow-2xl">
            <TaskCardContent task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ── List View ────────────────────────────────────────────────────────────────

function SortHeader({ field, label, currentField, currentDir, onSort }: { field: SortField; label: string; currentField: SortField; currentDir: SortDirection; onSort: (f: SortField) => void }) {
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 hover:text-foreground transition-colors',
        currentField === field ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      <span className="text-xs font-semibold">{label}</span>
      {currentField === field ? (
        currentDir === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
      ) : (
        <SortAsc className="h-3 w-3 opacity-30" />
      )}
    </button>
  );
}

function ListView({
  sprintFilter,
  milestoneFilter,
}: {
  sprintFilter: string;
  milestoneFilter: string;
}) {
  const { setSelectedTask } = useAppStore();
  const { t } = useTranslation();
  const { tasks, projects, getUserName, getUserInitials, getProjectName } = useAppData();
  const getProjectColor = (id: string) => projects.find((p) => p.id === id)?.color || '#3b82f6';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const sl: Record<TaskStatus, string> = { todo: t.tasks.todo, in_progress: t.tasks.inProgress, review: t.tasks.inReview, done: t.tasks.done };
  const pl: Record<TaskPriority, string> = { urgent: t.tasks.urgent, high: t.tasks.high, medium: t.tasks.medium, low: t.tasks.low };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    let result = filterTasksBySprintAndMilestone(tasks, sprintFilter, milestoneFilter);

    result = result.filter(
      (task) =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (filterPriority !== 'all') {
      result = result.filter((task) => task.priority === filterPriority);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'priority':
          cmp = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'dueDate':
          cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'project':
          cmp = getProjectName(a.projectId).localeCompare(getProjectName(b.projectId));
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [searchQuery, sortField, sortDir, filterPriority, tasks, getProjectName, sprintFilter, milestoneFilter]);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.tasks.searchTasks}
            className="pl-9 h-9 bg-muted/30 border-transparent focus:border-[oklch(0.55_0.18_250)]/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 text-xs gap-1.5',
              filterPriority !== 'all' && 'bg-[oklch(0.55_0.18_250)]/10 border-[oklch(0.55_0.18_250)]/30 text-[oklch(0.55_0.18_250)]'
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t.tasks.filter}
          </Button>
          <div className="flex items-center gap-1">
            {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((p) => (
              <Button
                key={p}
                variant="ghost"
                size="sm"
                onClick={() => setFilterPriority(p)}
                className={cn(
                  'h-7 text-[10px] px-2 rounded-md',
                  filterPriority === p
                    ? 'bg-[oklch(0.55_0.18_250)]/10 text-[oklch(0.55_0.18_250)] font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p === 'all' ? t.projects.all : pl[p as TaskPriority]}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden shadow-sm">
        {/* Header row */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 bg-muted/50 border-b">
          <span className="w-6"></span>
          <SortHeader field="title" label={t.tasks.task} currentField={sortField} currentDir={sortDir} onSort={handleSort} />
          <span className="hidden sm:block w-24"><SortHeader field="project" label={t.tasks.project} currentField={sortField} currentDir={sortDir} onSort={handleSort} /></span>
          <span className="hidden md:block w-20"><SortHeader field="priority" label={t.tasks.priority} currentField={sortField} currentDir={sortDir} onSort={handleSort} /></span>
          <span className="hidden md:block w-24"><SortHeader field="assignee" label={t.tasks.assignee} currentField={sortField} currentDir={sortDir} onSort={handleSort} /></span>
          <span className="w-20"><SortHeader field="dueDate" label={t.tasks.dueDate} currentField={sortField} currentDir={sortDir} onSort={handleSort} /></span>
        </div>

        {/* Rows */}
        <div>
          {filteredAndSortedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">{t.myTasks.noResults}</p>
            </div>
          ) : filteredAndSortedTasks.map((task, idx) => {
            const status = statusConfig[task.status];
            const priority = priorityConfig[task.priority];
            const overdue = isOverdue(task.dueDate, task.status);

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => setSelectedTask(task as unknown as Record<string, unknown>)}
                className={cn(
                  'grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors cursor-pointer',
                  idx % 2 === 1 && 'bg-muted/10'
                )}
              >
                <Checkbox className="h-4 w-4" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', priority.dotColor)} />
                    <p className="text-sm font-medium truncate">{task.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md', status.bg, status.color)}>
                      {status.icon}
                      {sl[task.status]}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 w-24">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getProjectColor(task.projectId) }}
                  />
                  <span className="text-xs truncate text-muted-foreground">{getProjectName(task.projectId)}</span>
                </div>
                <div className="hidden md:block w-20">
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] px-1.5 py-0 font-medium gap-0.5', priority.bg, priority.color)}
                  >
                    {priority.icon}
                    {pl[task.priority]}
                  </Badge>
                </div>
                <div className="hidden md:flex items-center gap-1.5 w-24">
                  <Avatar className="h-5 w-5 ring-1 ring-background">
                    <AvatarFallback className="text-[7px] bg-muted font-medium">
                      {getUserInitials(task.assigneeId)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate text-muted-foreground">{getUserName(task.assigneeId)}</span>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs w-20 font-medium',
                    overdue ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
                  )}
                >
                  {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                  {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── My Tasks View ────────────────────────────────────────────────────────────

function MyTasksView({
  sprintFilter,
  milestoneFilter,
}: {
  sprintFilter: string;
  milestoneFilter: string;
}) {
  const { setSelectedTask, currentUser } = useAppStore();
  const { t } = useTranslation();
  const { tasks, projects, getProjectName, updateTaskPriority } = useAppData();
  const getProjectColor = (id: string) => projects.find((p) => p.id === id)?.color || '#3b82f6';
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());

  const myTasks = useMemo(() => {
    const filtered = filterTasksBySprintAndMilestone(tasks, sprintFilter, milestoneFilter);
    return filtered.filter((task) => task.assigneeId === currentUser?.id);
  }, [tasks, currentUser?.id, sprintFilter, milestoneFilter]);

  // Group by project
  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    myTasks.forEach((task) => {
      const pid = task.projectId;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(task);
    });
    return map;
  }, [myTasks]);

  const toggleCollapse = (pid: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const totalTasks = myTasks.length;
  const doneTasks = myTasks.filter((t) => t.status === 'done').length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const sl: Record<TaskStatus, string> = { todo: t.tasks.todo, in_progress: t.tasks.inProgress, review: t.tasks.inReview, done: t.tasks.done };
  const pl: Record<TaskPriority, string> = { urgent: t.tasks.urgent, high: t.tasks.high, medium: t.tasks.medium, low: t.tasks.low };

  const handlePriorityChange = (taskId: string, newPriority: TaskPriority) => {
    void updateTaskPriority(taskId, newPriority);
  };

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <Card className="bg-gradient-to-r from-[oklch(0.55_0.18_250)]/5 to-[oklch(0.55_0.18_250)]/10 border-[oklch(0.55_0.18_250)]/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-[oklch(0.55_0.18_250)]" />
              <span className="text-sm font-semibold">{t.tasks.assignedToYou}</span>
            </div>
            <span className="text-xs font-bold text-[oklch(0.55_0.18_250)]">
              {doneTasks}/{totalTasks} {t.tasks.tasksCompleted}
            </span>
          </div>
          <div className="h-2 w-full bg-[oklch(0.55_0.18_250)]/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-[oklch(0.60_0.18_250)] to-[oklch(0.50_0.18_250)]"
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">{progressPct}% {t.tasks.tasksCompleted}</span>
            <div className="flex items-center gap-3">
              {(['todo', 'in_progress', 'review', 'done'] as TaskStatus[]).map((s) => {
                const count = myTasks.filter((t) => t.status === s).length;
                if (count === 0) return null;
                const cfg = statusConfig[s];
                return (
                  <span key={s} className={cn('text-[10px] font-medium flex items-center gap-1', cfg.color)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dotColor)} />
                    {count} {sl[s]}
                  </span>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped tasks */}
      {grouped.size === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Target className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">{t.myTasks.noResults}</p>
        </div>
      ) : (
      <div className="space-y-3">
        {Array.from(grouped.entries()).map(([projectId, tasks]) => {
          const collapsed = collapsedProjects.has(projectId);
          const projectColor = getProjectColor(projectId);
          const projectName = getProjectName(projectId);
          const projectDone = tasks.filter((t) => t.status === 'done').length;

          return (
            <div key={projectId} className="rounded-xl border overflow-hidden">
              {/* Project header */}
              <button
                onClick={() => toggleCollapse(projectId)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: projectColor }}
                  />
                  <span className="text-sm font-semibold">{projectName}</span>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {projectDone}/{tasks.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${tasks.length > 0 ? (projectDone / tasks.length) * 100 : 0}%`,
                        backgroundColor: projectColor,
                      }}
                    />
                  </div>
                </div>
              </button>

              {/* Tasks */}
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y">
                      {tasks.map((task) => {
                        const priority = priorityConfig[task.priority];
                        const status = statusConfig[task.status];
                        const overdue = isOverdue(task.dueDate, task.status);
                        const isDone = task.status === 'done';

                        return (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTask(task as unknown as Record<string, unknown>)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
                          >
                            <Checkbox
                              checked={isDone}
                              className={cn(
                                'h-4 w-4',
                                isDone && 'data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500'
                              )}
                            />
                            <div
                              className={cn(
                                'w-1 h-8 rounded-full flex-shrink-0',
                                priority.strip.replace('border-l-', 'bg-')
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-sm font-medium truncate', isDone && 'line-through text-muted-foreground')}>
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md', status.bg, status.color)}>
                                  {status.icon}
                                  {sl[task.status]}
                                </span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex"
                                    >
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          'text-[10px] px-1.5 py-0 font-medium gap-0.5 h-4 cursor-pointer hover:opacity-80 transition-opacity',
                                          priority.bg,
                                          priority.color
                                        )}
                                      >
                                        {priority.icon}
                                        {pl[task.priority]}
                                      </Badge>
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="w-40" onClick={(e) => e.stopPropagation()}>
                                    {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                                      <DropdownMenuItem
                                        key={p}
                                        onClick={() => handlePriorityChange(task.id, p)}
                                        className={cn('gap-2 text-xs', task.priority === p && 'bg-muted')}
                                      >
                                        <span className={cn('w-2 h-2 rounded-full', priorityConfig[p].dotColor)} />
                                        {pl[p]}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            <div
                              className={cn(
                                'flex items-center gap-1 text-[10px] font-medium flex-shrink-0',
                                overdue ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
                              )}
                            >
                              {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

// ── Main Tasks View ──────────────────────────────────────────────────────────

export function TasksView() {
  const {
    taskViewMode,
    setTaskViewMode,
    openCreateTaskDialog,
    activeSprintId,
    activeMilestoneId,
    setActiveSprintId,
    setActiveMilestoneId,
  } = useAppStore();
  const { tasks: appTasks, sprints, milestones } = useAppData();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sprintFilter, setSprintFilter] = useState('all');
  const [milestoneFilter, setMilestoneFilter] = useState('all');

  useEffect(() => {
    if (activeSprintId) {
      setSprintFilter(activeSprintId);
      setMilestoneFilter('all');
      setActiveSprintId(null);
    }
  }, [activeSprintId, setActiveSprintId]);

  useEffect(() => {
    if (activeMilestoneId) {
      setMilestoneFilter(activeMilestoneId);
      setSprintFilter('all');
      setActiveMilestoneId(null);
    }
  }, [activeMilestoneId, setActiveMilestoneId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.tasks.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-semibold text-foreground">{appTasks.length}</span> {t.dashboard.tasks} · <span className="font-semibold text-blue-600 dark:text-blue-400">{appTasks.filter((task) => task.status === 'done').length}</span> {t.tasks.tasksCompleted}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={taskViewMode} onValueChange={(v) => setTaskViewMode(v as typeof taskViewMode)}>
            <TabsList className="h-8 bg-muted/50 p-0.5">
              <TabsTrigger value="kanban" className={VIEW_TAB_TRIGGER_CLASS}>
                <Columns3 className="h-3.5 w-3.5" /> {t.tasks.kanban}
              </TabsTrigger>
              <TabsTrigger value="list" className={VIEW_TAB_TRIGGER_CLASS}>
                <List className="h-3.5 w-3.5" /> {t.tasks.list}
              </TabsTrigger>
              <TabsTrigger value="my-tasks" className={VIEW_TAB_TRIGGER_CLASS}>
                <User className="h-3.5 w-3.5" /> {t.tasks.myTasks}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {taskViewMode === 'kanban' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterOpen(!filterOpen)}
              className={cn(
                'h-8 text-xs gap-1.5',
                (filterOpen || searchQuery.trim()) && 'bg-[oklch(0.55_0.18_250)]/10 border-[oklch(0.55_0.18_250)]/30 text-[oklch(0.55_0.18_250)]'
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              {t.tasks.filter}
            </Button>
          )}

          <div className="inline-flex h-8 items-center justify-center rounded-lg bg-muted/50 p-0.5 gap-0.5">
            <Select value={sprintFilter} onValueChange={setSprintFilter}>
              <SelectTrigger
                size="sm"
                className={FILTER_SELECT_TRIGGER_CLASS(sprintFilter !== 'all')}
              >
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <SelectValue placeholder={t.nav.sprints} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.myTasks.allSprints}</SelectItem>
                {sprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={milestoneFilter} onValueChange={setMilestoneFilter}>
              <SelectTrigger
                size="sm"
                className={FILTER_SELECT_TRIGGER_CLASS(milestoneFilter !== 'all')}
              >
                <Flag className="h-3.5 w-3.5 shrink-0" />
                <SelectValue placeholder={t.nav.milestones} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.myTasks.allMilestones}</SelectItem>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            onClick={() => openCreateTaskDialog()}
            className="h-8 gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.18_250)] hover:from-[oklch(0.48_0.18_250)] hover:to-[oklch(0.42_0.18_250)] text-white shadow-sm shadow-[oklch(0.55_0.18_250)]/20"
          >
            <Plus className="h-3.5 w-3.5" /> {t.tasks.newTask}
          </Button>
        </div>
      </div>

      {/* Filter bar (collapsible) */}
      <AnimatePresence>
        {filterOpen && taskViewMode === 'kanban' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.tasks.searchTasks}
                  className="pl-9 h-8 bg-background border-transparent text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Views */}
      <AnimatePresence mode="wait">
        {taskViewMode === 'kanban' && (
          <KanbanView
            key="kanban"
            sprintFilter={sprintFilter}
            milestoneFilter={milestoneFilter}
            searchQuery={searchQuery}
          />
        )}
        {taskViewMode === 'list' && (
          <ListView
            key="list"
            sprintFilter={sprintFilter}
            milestoneFilter={milestoneFilter}
          />
        )}
        {taskViewMode === 'my-tasks' && (
          <MyTasksView
            key="my-tasks"
            sprintFilter={sprintFilter}
            milestoneFilter={milestoneFilter}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

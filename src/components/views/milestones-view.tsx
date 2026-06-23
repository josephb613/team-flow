'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Flag,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ListChecks,
  ArrowUpRight,
} from 'lucide-react';
import { useAppData } from '@/hooks/use-app-data';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Milestone, MilestoneStatus } from '@/lib/types';

// ── Milestone Status Config ───────────────────────────────────────────────────

const milestoneStatusConfig: Record<MilestoneStatus, {
  color: string;
  bg: string;
  solidBg: string;
  solidText: string;
  dotColor: string;
  borderColor: string;
  icon: React.ReactNode;
  accentColor: string;
}> = {
  upcoming: {
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-500/10',
    solidBg: 'bg-cyan-100 dark:bg-cyan-900/50',
    solidText: 'text-cyan-700 dark:text-cyan-300',
    dotColor: 'bg-cyan-500',
    borderColor: 'border-cyan-500/20',
    icon: <Clock className="h-3 w-3" />,
    accentColor: '#06b6d4',
  },
  in_progress: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    solidBg: 'bg-amber-100 dark:bg-amber-900/50',
    solidText: 'text-amber-700 dark:text-amber-300',
    dotColor: 'bg-amber-500',
    borderColor: 'border-amber-500/20',
    icon: <ArrowUpRight className="h-3 w-3" />,
    accentColor: '#f59e0b',
  },
  completed: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    solidBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    solidText: 'text-emerald-700 dark:text-emerald-300',
    dotColor: 'bg-emerald-500',
    borderColor: 'border-emerald-500/20',
    icon: <CheckCircle2 className="h-3 w-3" />,
    accentColor: '#10b981',
  },
  overdue: {
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10',
    solidBg: 'bg-rose-100 dark:bg-rose-900/50',
    solidText: 'text-rose-700 dark:text-rose-300',
    dotColor: 'bg-rose-500',
    borderColor: 'border-rose-500/20',
    icon: <AlertTriangle className="h-3 w-3" />,
    accentColor: '#ef4444',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr + 'T00:00:00Z');
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function getMilestoneProgress(milestone: Milestone, allTasks: import('@/lib/types').Task[]) {
  const msTasks = allTasks.filter((t) => milestone.taskIds.includes(t.id));
  const completed = msTasks.filter((t) => t.status === 'done').length;
  const total = msTasks.length;
  return { completed, total, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
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

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  gradient,
  iconBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  gradient: string;
  iconBg: string;
}) {
  return (
    <motion.div variants={item} whileHover={{ y: -2 }} className="group">
      <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 relative">
          <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300', gradient)} />
          <div className="relative z-10">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-2', iconBg)}>
              {icon}
            </div>
            <p className="text-xl font-extrabold tracking-tight">{value}</p>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Milestone Card ────────────────────────────────────────────────────────────

function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const { t } = useTranslation();
  const { openMyTasksWithMilestoneFilter } = useAppStore();
  const { tasks, projects, getProjectName } = useAppData();
  const config = milestoneStatusConfig[milestone.status];
  const projectName = getProjectName(milestone.projectId);
  const project = projects.find((p) => p.id === milestone.projectId);
  const { completed, total, progress } = getMilestoneProgress(milestone, tasks);
  const daysUntil = getDaysUntil(milestone.dueDate);
  const statusLabels: Record<MilestoneStatus, string> = {
    upcoming: t.milestones.upcoming,
    in_progress: t.milestones.inProgress,
    completed: t.milestones.completed,
    overdue: t.milestones.overdue,
  };

  const daysLabel = milestone.status === 'completed'
    ? t.milestones.completed
    : daysUntil < 0
      ? `${Math.abs(daysUntil)}d overdue`
      : daysUntil === 0
        ? t.planning.today
        : `${daysUntil}d left`;

  return (
    <motion.div variants={item} whileHover={{ y: -3, transition: { duration: 0.2 } }} className="group">
      <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300 border-0 shadow-sm">
        {/* Color accent strip */}
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, ${milestone.color}, ${milestone.color}88)`,
          }}
        />

        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: milestone.color + '18' }}
              >
                <Flag className="h-4 w-4" style={{ color: milestone.color }} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate">{milestone.title}</h3>
                <p className="text-[10px] text-muted-foreground font-medium">{projectName}</p>
              </div>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ml-2',
                config.solidBg,
                config.solidText
              )}
            >
              {config.icon}
              {statusLabels[milestone.status]}
            </span>
          </div>

          {/* Description */}
          <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
            {milestone.description}
          </p>

          {/* Due date */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
              <Calendar className="h-3 w-3" />
              {formatDate(milestone.dueDate)}
            </div>
            <span
              className={cn(
                'text-[10px] font-semibold',
                milestone.status === 'overdue' ? 'text-rose-600' :
                milestone.status === 'completed' ? 'text-emerald-600' :
                daysUntil <= 7 ? 'text-amber-600' : 'text-muted-foreground'
              )}
            >
              {daysLabel}
            </span>
          </div>

          {/* Task progress */}
          {total > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openMyTasksWithMilestoneFilter(milestone.id);
                  }}
                  className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground hover:underline cursor-pointer transition-colors"
                >
                  {completed}/{total} {t.milestones.tasks}
                </button>
                <span className="text-[10px] font-bold" style={{ color: milestone.color }}>
                  {progress}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' as const }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${milestone.color}, ${milestone.color}dd)`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2.5 border-t">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
              <ListChecks className="h-3 w-3" />
              {total} {t.milestones.tasks}
            </div>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-4 h-4 rotate-45" style={{ backgroundColor: config.accentColor }}>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">{statusLabels[milestone.status]}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Milestones View ──────────────────────────────────────────────────────

export function MilestonesView() {
  const { t } = useTranslation();
  const { milestones, projects } = useAppData();
  const { setCreateMilestoneDialogOpen } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Compute stats
  const stats = useMemo(() => {
    const total = milestones.length;
    const upcoming = milestones.filter((m) => m.status === 'upcoming').length;
    const inProgress = milestones.filter((m) => m.status === 'in_progress').length;
    const overdue = milestones.filter((m) => m.status === 'overdue').length;
    return { total, upcoming, inProgress, overdue };
  }, [milestones]);

  // Filter milestones
  const filteredMilestones = useMemo(() => {
    return milestones.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProject = projectFilter === 'all' || m.projectId === projectFilter;
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [searchQuery, projectFilter, statusFilter, milestones]);

  // Group by project
  const grouped = useMemo(() => {
    const groups: Record<string, { name: string; color: string; icon: string; milestones: typeof filteredMilestones }> = {};
    filteredMilestones.forEach((m) => {
      const project = projects.find((p) => p.id === m.projectId);
      if (!groups[m.projectId]) {
        groups[m.projectId] = {
          name: project?.name || 'Unknown',
          color: project?.color || '#64748b',
          icon: project?.icon || '📋',
          milestones: [],
        };
      }
      groups[m.projectId].milestones.push(m);
    });
    return groups;
  }, [filteredMilestones]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.milestones.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-semibold text-foreground">{stats.total}</span> {t.milestones.title.toLowerCase()} ·{' '}
            <span className="font-semibold text-amber-600 dark:text-amber-400">{stats.inProgress}</span> {t.milestones.inProgress.toLowerCase()}
            {stats.overdue > 0 && (
              <> · <span className="font-semibold text-rose-600 dark:text-rose-400">{stats.overdue}</span> {t.milestones.overdue.toLowerCase()}</>
            )}
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.48_0.15_160)] hover:from-[oklch(0.48_0.15_160)] hover:to-[oklch(0.42_0.15_160)] text-white shadow-sm"
          onClick={() => setCreateMilestoneDialogOpen(true)}
        >
          <Sparkles className="h-3.5 w-3.5" /> {t.milestones.newMilestone}
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
          icon={<Flag className="h-4 w-4 text-emerald-600" />}
          label={t.milestones.title}
          value={stats.total}
          gradient="bg-gradient-to-br from-emerald-500/5 via-emerald-500/[0.02] to-transparent"
          iconBg="bg-emerald-500/10 border border-emerald-500/20"
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-cyan-600" />}
          label={t.milestones.upcoming}
          value={stats.upcoming}
          gradient="bg-gradient-to-br from-cyan-500/5 via-cyan-500/[0.02] to-transparent"
          iconBg="bg-cyan-500/10 border border-cyan-500/20"
        />
        <StatCard
          icon={<ArrowUpRight className="h-4 w-4 text-amber-600" />}
          label={t.milestones.inProgress}
          value={stats.inProgress}
          gradient="bg-gradient-to-br from-amber-500/5 via-amber-500/[0.02] to-transparent"
          iconBg="bg-amber-500/10 border border-amber-500/20"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
          label={t.milestones.overdue}
          value={stats.overdue}
          gradient="bg-gradient-to-br from-rose-500/5 via-rose-500/[0.02] to-transparent"
          iconBg="bg-rose-500/10 border border-rose-500/20"
        />
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.milestones.search}
            className="pl-9 h-9 bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160)]/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="h-9 w-[180px] text-xs bg-muted/30 border-transparent">
            <SelectValue placeholder={t.milestones.project} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.sprints.all} {t.milestones.project}s</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px] text-xs bg-muted/30 border-transparent">
            <SelectValue placeholder={t.milestones.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.milestones.all}</SelectItem>
            <SelectItem value="upcoming">{t.milestones.upcoming}</SelectItem>
            <SelectItem value="in_progress">{t.milestones.inProgress}</SelectItem>
            <SelectItem value="completed">{t.milestones.completed}</SelectItem>
            <SelectItem value="overdue">{t.milestones.overdue}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grouped milestone cards */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([projectId, group]) => (
          <div key={projectId}>
            {/* Project group header */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                style={{ backgroundColor: group.color + '18' }}
              >
                {group.icon}
              </div>
              <h3 className="text-sm font-bold">{group.name}</h3>
              <span className="text-[10px] text-muted-foreground font-medium">
                {group.milestones.length} {t.milestones.title.toLowerCase()}
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
            </div>

            {/* Milestone cards grid */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              {group.milestones.map((milestone) => (
                <MilestoneCard key={milestone.id} milestone={milestone} />
              ))}
            </motion.div>
          </div>
        ))}

        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Flag className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">{t.milestones.noResults}</p>
          </div>
        )}
      </div>
    </div>
  );
}

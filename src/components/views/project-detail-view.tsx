'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Flag,
  FolderKanban,
  LayoutGrid,
  ListChecks,
  PauseCircle,
  Archive,
  Pencil,
  Target,
  Users,
} from 'lucide-react';
import { useAppData } from '@/hooks/use-app-data';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { taskStatusLabels, taskPriorityColors } from '@/lib/data-mappers';
import type { Milestone, ProjectStatus, Task, TaskStatus } from '@/lib/types';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const statusConfig: Record<
  ProjectStatus,
  { icon: React.ReactNode; dotColor: string; solidBg: string; solidText: string }
> = {
  active: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    dotColor: 'bg-blue-500',
    solidBg: 'bg-blue-100 dark:bg-blue-900/50',
    solidText: 'text-blue-700 dark:text-blue-300',
  },
  on_hold: {
    icon: <PauseCircle className="h-3 w-3" />,
    dotColor: 'bg-amber-500',
    solidBg: 'bg-amber-100 dark:bg-amber-900/50',
    solidText: 'text-amber-700 dark:text-amber-300',
  },
  completed: {
    icon: <CheckCircle2 className="h-3 w-3" />,
    dotColor: 'bg-blue-500',
    solidBg: 'bg-blue-100 dark:bg-blue-900/50',
    solidText: 'text-blue-700 dark:text-blue-300',
  },
  archived: {
    icon: <Archive className="h-3 w-3" />,
    dotColor: 'bg-slate-400',
    solidBg: 'bg-slate-100 dark:bg-slate-800/50',
    solidText: 'text-slate-600 dark:text-slate-300',
  },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}dd)` }}
      />
    </div>
  );
}

function AvatarStack({ memberIds, max = 5 }: { memberIds: string[]; max?: number }) {
  const { getUserName, getUserInitials } = useAppData();

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {memberIds.slice(0, max).map((id) => (
          <TooltipProvider key={id} delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-muted/50">
                  <AvatarFallback className="text-[9px] bg-muted font-semibold">
                    {getUserInitials(id)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{getUserName(id)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      {memberIds.length > max && (
        <span className="text-[10px] text-muted-foreground ml-2 font-medium">
          +{memberIds.length - max}
        </span>
      )}
    </div>
  );
}

function formatDate(dateStr: string, locale: string, fallback: string): string {
  if (!dateStr) return fallback;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function EmptyState({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <FolderKanban className="h-14 w-14 text-muted-foreground/30 mb-4" />
      <h3 className="text-lg font-semibold">{t.projectDetail.noProjectSelected}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {t.projectDetail.noProjectSelectedDesc}
      </p>
      <Button variant="outline" size="sm" className="mt-6 gap-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
        {t.projectDetail.backToProjects}
      </Button>
    </div>
  );
}

export function ProjectDetailView() {
  const { t, locale } = useTranslation();
  const { projects, tasks, milestones, sprints, teams, getUserName } = useAppData();
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const setActivePage = useAppStore((s) => s.setActivePage);
  const openEditProjectDialog = useAppStore((s) => s.openEditProjectDialog);

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const projectTasks = useMemo(
    () => (project ? tasks.filter((task) => task.projectId === project.id) : []),
    [tasks, project]
  );

  const projectMilestones = useMemo(
    () =>
      project
        ? milestones
            .filter((m) => m.projectId === project.id)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        : [],
    [milestones, project]
  );

  const projectTeams = useMemo(
    () => (project ? teams.filter((team) => team.projectIds.includes(project.id)) : []),
    [teams, project]
  );

  const projectSprints = useMemo(
    () => (project ? sprints.filter((s) => s.projectId === project.id) : []),
    [sprints, project]
  );

  const recentTasks = useMemo(
    () =>
      [...projectTasks]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5),
    [projectTasks]
  );

  const upcomingMilestones = useMemo(
    () =>
      projectMilestones
        .filter((m) => m.status !== 'completed')
        .slice(0, 4),
    [projectMilestones]
  );

  const goToProjects = () => setActivePage('projects');

  const navigateTo = (page: Parameters<typeof setActivePage>[0]) => {
    setActivePage(page);
  };

  if (!activeProjectId) {
    return <EmptyState onBack={goToProjects} />;
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <FolderKanban className="h-14 w-14 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold">{t.projectDetail.projectNotFound}</h3>
        <Button variant="outline" size="sm" className="mt-6 gap-2" onClick={goToProjects}>
          <ArrowLeft className="h-4 w-4" />
          {t.projectDetail.backToProjects}
        </Button>
      </div>
    );
  }

  const status = statusConfig[project.status];
  const statusLabels: Record<ProjectStatus, string> = {
    active: t.projects.active,
    on_hold: t.projects.onHold,
    completed: t.projects.completed,
    archived: t.projects.archived,
  };

  const quickActions = [
    { page: 'planning' as const, label: t.nav.planning, icon: LayoutGrid, color: 'text-[oklch(0.55_0.18_250)]' },
    { page: 'my-tasks' as const, label: t.nav['my-tasks'], icon: ListChecks, color: 'text-emerald-600' },
    { page: 'sprints' as const, label: t.nav.sprints, icon: Target, color: 'text-amber-600' },
    { page: 'milestones' as const, label: t.nav.milestones, icon: Flag, color: 'text-rose-600' },
    { page: 'calendar' as const, label: t.nav.calendar, icon: Calendar, color: 'text-cyan-600' },
  ];

  const stats = [
    {
      label: t.dashboard.projectProgress,
      value: `${project.progress}%`,
      sub: `${project.completedTasks}/${project.taskCount} ${t.dashboard.tasks}`,
      accent: project.color,
    },
    {
      label: t.projectDetail.members,
      value: String(project.memberIds.length),
      sub: t.projectDetail.teamMembers,
      accent: undefined,
    },
    {
      label: t.projectDetail.sprints,
      value: String(projectSprints.length),
      sub: t.projectDetail.activeSprints.replace(
        '{count}',
        String(projectSprints.filter((s) => s.status === 'active').length)
      ),
      accent: undefined,
    },
    {
      label: t.tasks.dueDate,
      value: formatDate(project.dueDate, locale, t.projects.noDueDate),
      sub: `${t.projectDetail.startDate}: ${formatDate(project.startDate, locale, '—')}`,
      accent: undefined,
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Back + header */}
      <motion.div variants={item}>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 -ml-2 mb-4 text-muted-foreground hover:text-foreground"
          onClick={goToProjects}
        >
          <ArrowLeft className="h-4 w-4" />
          {t.projectDetail.backToProjects}
        </Button>

        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card">
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{ background: `linear-gradient(135deg, ${project.color}, transparent 60%)` }}
          />
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ backgroundColor: project.color }}
          />
          <div className="relative p-6 pl-7">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 ring-1 ring-black/[0.04] dark:ring-white/[0.08]"
                  style={{ backgroundColor: `${project.color}14`, color: project.color }}
                >
                  {project.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full',
                        status.solidBg,
                        status.solidText
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full', status.dotColor)} />
                      {statusLabels[project.status]}
                    </span>
                  </div>
                  {project.description ? (
                    <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                      {project.description}
                    </p>
                  ) : null}
                  {projectTeams.length > 0 ? (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {projectTeams.map((team) => (
                        <Badge
                          key={team.id}
                          variant="secondary"
                          className="text-[10px] font-medium"
                          style={{ borderColor: `${team.color}40` }}
                        >
                          {team.name}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => openEditProjectDialog(project.id)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t.projectDetail.editProject}
                </Button>
                <AvatarStack memberIds={project.memberIds} max={6} />
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t.dashboard.projectProgress}
                </span>
                <span className="text-xl font-bold tabular-nums" style={{ color: project.color }}>
                  {project.progress}%
                </span>
              </div>
              <ProgressBar value={project.progress} color={project.color} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-xl border-border/50 shadow-none py-0 gap-0">
            <CardContent className="p-4">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </p>
              <p
                className="text-2xl font-bold mt-1 tabular-nums"
                style={stat.accent ? { color: stat.accent } : undefined}
              >
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={item}>
        <h3 className="text-sm font-semibold mb-3">{t.projectDetail.quickActions}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map((action) => (
            <motion.button
              key={action.page}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigateTo(action.page)}
              className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-sm transition-all text-left"
            >
              <div className={cn('p-2 rounded-lg bg-muted/50', action.color)}>
                <action.icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground/50" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Recent tasks + milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={item}>
          <Card className="rounded-xl border-border/50 shadow-none h-full py-0 gap-0">
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{t.projectDetail.recentTasks}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => navigateTo('my-tasks')}
                >
                  {t.projectDetail.viewAll}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0">
              {recentTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  {t.projectDetail.noTasks}
                </p>
              ) : (
                <div className="space-y-2">
                  {recentTasks.map((task) => (
                    <TaskRow key={task.id} task={task} locale={locale} getUserName={getUserName} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="rounded-xl border-border/50 shadow-none h-full py-0 gap-0">
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  {t.projectDetail.upcomingMilestones}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => navigateTo('milestones')}
                >
                  {t.projectDetail.viewAll}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0">
              {upcomingMilestones.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  {t.projectDetail.noMilestones}
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingMilestones.map((milestone) => (
                    <MilestoneRow
                      key={milestone.id}
                      milestone={milestone}
                      locale={locale}
                      noDueDate={t.projects.noDueDate}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

function TaskRow({
  task,
  locale,
  getUserName,
}: {
  task: Task;
  locale: string;
  getUserName: (id: string) => string;
}) {
  const statusLabel = taskStatusLabels[locale === 'fr' ? 'fr' : 'en'][task.status as TaskStatus];
  const priorityStyle = taskPriorityColors[task.priority];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{getUserName(task.assigneeId)}</p>
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0">
        {statusLabel}
      </Badge>
      <Badge
        variant="outline"
        className={cn('text-[10px] shrink-0', priorityStyle?.bg, priorityStyle?.text)}
      >
        {task.priority}
      </Badge>
    </div>
  );
}

function MilestoneRow({
  milestone,
  locale,
  noDueDate,
}: {
  milestone: Milestone;
  locale: string;
  noDueDate: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
      <div
        className="w-2 h-8 rounded-full shrink-0"
        style={{ backgroundColor: milestone.color }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{milestone.title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {formatDate(milestone.dueDate, locale, noDueDate)}
        </p>
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
        {milestone.status.replace('_', ' ')}
      </Badge>
    </div>
  );
}

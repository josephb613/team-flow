'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Plus,
  LayoutGrid,
  List,
  Search,
  Calendar,
  FolderKanban,
  CheckCircle2,
  PauseCircle,
  Archive,
  Users,
  ArrowUpRight,
  Sparkles,
  Pencil,
} from 'lucide-react';
import { useAppData } from '@/hooks/use-app-data';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import type { Project, ProjectStatus } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ── Status Configuration ─────────────────────────────────────────────────────

const FILTER_SELECT_TRIGGER_CLASS = (isActive: boolean) =>
  cn(
    'h-8 w-auto min-w-[140px] max-w-[170px] text-xs px-3 rounded-lg gap-2 border shadow-none transition-all duration-200',
    '[&_svg:not([class*="size-"])]:size-3.5',
    'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    isActive
      ? 'bg-[oklch(0.55_0.18_250)]/5 border-[oklch(0.55_0.18_250)]/30 text-[oklch(0.55_0.18_250)] font-medium'
      : 'bg-background hover:bg-muted/50 border-border text-muted-foreground hover:text-foreground'
  );

const statusConfig: Record<ProjectStatus, { color: string; bg: string; icon: React.ReactNode; dotColor: string; solidBg: string; solidText: string }> = {
  active: {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10 border-blue-200 dark:border-blue-800',
    icon: <CheckCircle2 className="h-3 w-3" />,
    dotColor: 'bg-blue-500',
    solidBg: 'bg-blue-100 dark:bg-blue-900/50',
    solidText: 'text-blue-700 dark:text-blue-300',
  },
  on_hold: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-200 dark:border-amber-800',
    icon: <PauseCircle className="h-3 w-3" />,
    dotColor: 'bg-amber-500',
    solidBg: 'bg-amber-100 dark:bg-amber-900/50',
    solidText: 'text-amber-700 dark:text-amber-300',
  },
  completed: {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10 border-blue-200 dark:border-blue-800',
    icon: <CheckCircle2 className="h-3 w-3" />,
    dotColor: 'bg-blue-500',
    solidBg: 'bg-blue-100 dark:bg-blue-900/50',
    solidText: 'text-blue-700 dark:text-blue-300',
  },
  archived: {
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-500/10 border-slate-200 dark:border-slate-800',
    icon: <Archive className="h-3 w-3" />,
    dotColor: 'bg-slate-400',
    solidBg: 'bg-slate-100 dark:bg-slate-800/50',
    solidText: 'text-slate-600 dark:text-slate-300',
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function AvatarStack({ memberIds, max = 4, size = 'sm' }: { memberIds: string[]; max?: number; size?: 'sm' | 'md' }) {
  const { getUserName, getUserInitials } = useAppData();
  const dims = size === 'sm' ? { avatar: 'h-6 w-6', text: 'text-[8px]', overlap: '-space-x-2', moreText: 'text-[10px]' }
    : { avatar: 'h-7 w-7', text: 'text-[9px]', overlap: '-space-x-2', moreText: 'text-[10px]' };

  return (
    <div className="flex items-center">
      <div className={cn('flex', dims.overlap)}>
        {memberIds.slice(0, max).map((id, idx) => (
          <TooltipProvider key={id} delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className={cn(dims.avatar, 'border-2 border-background ring-1 ring-muted/50', idx > 0 && 'ml-0')}>
                  <AvatarFallback className={cn(dims.text, 'bg-muted font-semibold')}>
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
        <span className={cn(dims.moreText, 'text-muted-foreground ml-2 font-medium')}>
          +{memberIds.length - max}
        </span>
      )}
    </div>
  );
}

// ── Animation Variants ───────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

function formatProjectDueDate(dueDate: string, locale: string, fallback: string): string {
  if (!dueDate) return fallback;
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ── Progress Bar with Label ──────────────────────────────────────────────────

function ProgressBar({ value, color, size = 'md' }: { value: number; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const height = size === 'sm' ? 'h-1.5' : size === 'md' ? 'h-2' : 'h-2.5';
  return (
    <div className={cn('w-full bg-muted/50 rounded-full overflow-hidden', height)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' as const }}
        className={cn('h-full rounded-full', height)}
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
        }}
      />
    </div>
  );
}

// ── Project Grid Card ────────────────────────────────────────────────────────

function ProjectGridCard({
  project,
  onOpen,
  onEdit,
}: {
  project: Project;
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
}) {
  const { t, locale } = useTranslation();
  const status = statusConfig[project.status];
  const statusLabels: Record<ProjectStatus, string> = { active: t.projects.active, on_hold: t.projects.onHold, completed: t.projects.completed, archived: t.projects.archived };
  const dueDateLabel = formatProjectDueDate(project.dueDate, locale, t.projects.noDueDate);

  return (
    <motion.div
      variants={item}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="group"
    >
      <Card
        role="button"
        tabIndex={0}
        onClick={() => onOpen(project)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(project);
          }
        }}
        className="relative overflow-hidden cursor-pointer gap-0 py-0 rounded-2xl border border-border/50 bg-card shadow-none hover:shadow-md hover:border-border/80 transition-all duration-300"
      >
        <div
          className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity pointer-events-none"
          style={{ background: `linear-gradient(145deg, ${project.color}, transparent 65%)` }}
        />
        <div
          className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full"
          style={{ backgroundColor: project.color }}
        />

        <CardContent className="relative p-5 pl-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ring-1 ring-black/[0.04] dark:ring-white/[0.08]"
                style={{ backgroundColor: `${project.color}14`, color: project.color }}
              >
                {project.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold truncate tracking-tight">{project.name}</h3>
                {project.description ? (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                }}
                aria-label={t.projectDetail.editProject}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
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
          </div>

          <div className="mb-5">
            <div className="flex items-end justify-between mb-2.5">
              <span className="text-[11px] font-medium text-muted-foreground">{t.dashboard.projectProgress}</span>
              <span className="text-2xl font-bold tabular-nums leading-none" style={{ color: project.color }}>
                {project.progress}
                <span className="text-sm font-semibold opacity-60">%</span>
              </span>
            </div>
            <ProgressBar value={project.progress} color={project.color} size="md" />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            <AvatarStack memberIds={project.memberIds} max={4} size="sm" />
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3 w-3 opacity-50" />
                {project.completedTasks}/{project.taskCount}
              </span>
              <span className="inline-flex items-center gap-1 font-medium">
                <Calendar className="h-3 w-3 opacity-50" />
                {dueDateLabel}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Project List Row ─────────────────────────────────────────────────────────

function ProjectListRow({
  project,
  onOpen,
  onEdit,
}: {
  project: Project;
  onOpen: (project: Project) => void;
  onEdit: (project: Project) => void;
}) {
  const { t, locale } = useTranslation();
  const status = statusConfig[project.status];
  const statusLabels: Record<ProjectStatus, string> = { active: t.projects.active, on_hold: t.projects.onHold, completed: t.projects.completed, archived: t.projects.archived };

  return (
    <motion.div
      variants={item}
      whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(project)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(project);
        }
      }}
      className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-3.5 items-center cursor-pointer transition-colors"
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0 shadow-sm"
        style={{ backgroundColor: project.color + '18', color: project.color }}
      >
        {project.icon}
      </div>

      {/* Name + Description */}
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{project.name}</p>
        <p className="text-xs text-muted-foreground truncate">{project.description}</p>
      </div>

      {/* Status badge */}
      <div className="hidden sm:block w-24">
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full',
            status.solidBg,
            status.solidText
          )}
        >
          {status.icon}
          {statusLabels[project.status]}
        </span>
      </div>

      {/* Progress */}
      <div className="hidden md:flex items-center gap-2.5 w-36">
        <div className="flex-1">
          <ProgressBar value={project.progress} color={project.color} size="sm" />
        </div>
        <span className="text-[10px] font-bold text-muted-foreground w-8 text-right">{project.progress}%</span>
      </div>

      {/* Members */}
      <div className="hidden lg:flex items-center w-24">
        <AvatarStack memberIds={project.memberIds} max={3} size="sm" />
      </div>

      {/* Due Date + Task count */}
      <div className="flex items-center gap-2 w-36 justify-end">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(project);
          }}
          aria-label={t.projectDetail.editProject}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
          <Calendar className="h-3 w-3" />
          {formatProjectDueDate(project.dueDate, locale, t.projects.noDueDate)}
        </div>
      </div>
    </motion.div>
  );
}

// ── Status Filter Tabs ───────────────────────────────────────────────────────

function StatusFilterTabs({
  statusFilter,
  setStatusFilter,
  projects,
}: {
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  projects: import('@/lib/types').Project[];
}) {
  const { t } = useTranslation();
  const tabs = [
    { value: 'all', label: t.projects.all, icon: null },
    { value: 'active', label: t.projects.active, icon: <CheckCircle2 className="h-3 w-3" /> },
    { value: 'on_hold', label: t.projects.onHold, icon: <PauseCircle className="h-3 w-3" /> },
    { value: 'completed', label: t.projects.completed, icon: <CheckCircle2 className="h-3 w-3" /> },
    { value: 'archived', label: t.projects.archived, icon: <Archive className="h-3 w-3" /> },
  ];

  const counts: Record<string, number> = {
    all: projects.length,
    active: projects.filter((p) => p.status === 'active').length,
    on_hold: projects.filter((p) => p.status === 'on_hold').length,
    completed: projects.filter((p) => p.status === 'completed').length,
    archived: projects.filter((p) => p.status === 'archived').length,
  };

  return (
    <div className="relative flex items-center gap-1 bg-muted/30 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => setStatusFilter(tab.value)}
          className={cn(
            'relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
            statusFilter === tab.value
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.icon}
          {tab.label}
          <span
            className={cn(
              'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold',
              statusFilter === tab.value
                ? 'bg-[oklch(0.55_0.18_250)]/10 text-[oklch(0.55_0.18_250)]'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {counts[tab.value] || 0}
          </span>
        </button>
      ))}
      {/* Animated underline */}
      <motion.div
        className="absolute bottom-0 h-0.5 bg-[oklch(0.55_0.18_250)] rounded-full"
        layoutId="statusUnderline"
        style={{ display: 'none' }} // Hidden since using pill style
      />
    </div>
  );
}

// ── Main Projects View ───────────────────────────────────────────────────────

export function ProjectsView() {
  const { t } = useTranslation();
  const { projects, teams } = useAppData();
  const setCreateProjectDialogOpen = useAppStore((s) => s.setCreateProjectDialogOpen);
  const openProject = useAppStore((s) => s.openProject);
  const openEditProjectDialog = useAppStore((s) => s.openEditProjectDialog);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  const handleOpenProject = (project: Project) => {
    openProject(project.id);
  };

  const handleEditProject = (project: Project) => {
    openEditProjectDialog(project.id);
  };

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesTeam =
      teamFilter === 'all' ||
      teams.some(
        (team) => team.id === teamFilter && team.projectIds.includes(project.id)
      );
    return matchesSearch && matchesStatus && matchesTeam;
  });

  const activeCount = projects.filter((p) => p.status === 'active').length;
  const totalCount = projects.length;

  return (
    <div className="space-y-5">
      {/* Sleek, Modern Two-Tier Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tier 1 Left: Title and Status Badges */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{t.projects.title}</h2>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-muted border border-border/80 text-muted-foreground">
                {totalCount} {t.projects.title.toLowerCase()}
              </span>
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                {activeCount} {t.projects.active.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Tier 1 Right: View Toggle Tabs & Main Action */}
        <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
            <TabsList className="h-8 bg-muted/50 p-0.5 rounded-lg border border-border/60">
              <TabsTrigger
                value="grid"
                className="text-xs px-2.5 h-7 rounded-md gap-1 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> {t.projects.grid}
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="text-xs px-2.5 h-7 rounded-md gap-1 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <List className="h-3.5 w-3.5" /> {t.projects.list}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            size="sm"
            onClick={() => setCreateProjectDialogOpen(true)}
            className="h-8 gap-1.5 rounded-lg bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.18_250)] hover:from-[oklch(0.48_0.18_250)] hover:to-[oklch(0.42_0.18_250)] text-white shadow-sm shadow-[oklch(0.55_0.18_250)]/20 font-medium"
          >
            <Sparkles className="h-3.5 w-3.5" /> {t.projects.newProject}
          </Button>
        </div>
      </div>

      {/* Tier 2: Status, Search and Team Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 bg-muted/15 dark:bg-muted/5 rounded-xl border border-border/60">
        {/* Status Tabs Left */}
        <div className="flex-1 overflow-x-auto scrollbar-none py-0.5">
          <StatusFilterTabs statusFilter={statusFilter} setStatusFilter={setStatusFilter} projects={projects} />
        </div>

        {/* Right side: Search and Team dropdown */}
        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
          {/* Team Filter */}
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger
              size="sm"
              className={FILTER_SELECT_TRIGGER_CLASS(teamFilter !== 'all')}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              <SelectValue placeholder={t.projects.team} />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              <SelectItem value="all">{t.projects.all} {t.projects.team}s</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t.projects.search}
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

          {/* Reset button */}
          {(statusFilter !== 'all' || teamFilter !== 'all' || searchQuery.trim() !== '') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setTeamFilter('all');
                setSearchQuery('');
              }}
              className="h-8 text-xs hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg px-2.5 gap-1.5"
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {filteredProjects.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">{t.projects.noResults}</p>
                <p className="text-xs mt-1 text-muted-foreground/70">Try adjusting your filters</p>
              </div>
            ) : (
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredProjects.map((project) => (
                  <ProjectGridCard
                    key={project.id}
                    project={project}
                    onOpen={handleOpenProject}
                    onEdit={handleEditProject}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {filteredProjects.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">{t.projects.noResults}</p>
                <p className="text-xs mt-1 text-muted-foreground/70">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden shadow-sm">
                {/* Table header */}
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 bg-muted/50 border-b text-xs font-semibold text-muted-foreground">
                  <span className="w-9"></span>
                  <span>{t.projects.title}</span>
                  <span className="hidden sm:block w-24">{t.projects.status}</span>
                  <span className="hidden md:block w-36">{t.dashboard.projectProgress}</span>
                  <span className="hidden lg:block w-24">{t.projects.team}</span>
                  <span className="w-32">{t.tasks.dueDate}</span>
                </div>

                {/* Table rows */}
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="divide-y"
                >
                  {filteredProjects.map((project) => (
                    <ProjectListRow
                      key={project.id}
                      project={project}
                      onOpen={handleOpenProject}
                      onEdit={handleEditProject}
                    />
                  ))}
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

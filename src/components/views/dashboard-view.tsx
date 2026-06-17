'use client';

import { useEffect, useState, useMemo, useSyncExternalStore } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Plus,
  UserPlus,
  Zap,
  Edit3,
  Trash2,
  LogIn,
  Shield,
  Bell,
  CheckCircle,
  AlertTriangle,
  FolderKanban,
  Gauge,
  Timer,
  Target,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import {
  taskStatusColors,
  taskStatusLabels,
  taskPriorityColors,
  projectStatusColors,
  projectStatusLabels,
} from '@/lib/data-mappers';
import {
  avgSprintVelocityInPeriod,
  buildProjectProgressTrend,
  compareCounts,
  compareCountsInverted,
  completionRateAt,
  countActiveProjects,
  countOverdueTasks,
  countProjectsActivatedInPeriod,
  countTasksCompletedInPeriod,
  getPeriodBounds,
  sumTimeEntriesInPeriod,
} from '@/lib/analytics';
import { useAppData } from '@/hooks/use-app-data';
import { useApiData } from '@/hooks/use-pmp-data';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { appendWorkspaceQuery } from '@/lib/workspace-query';
import { scoreColor } from '@/lib/risk-utils';
import type { TaskStatus, TaskPriority } from '@/lib/types';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';

const chartTooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
  padding: '8px 12px',
};

function DashboardPanelCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('gap-0 overflow-hidden border-border/50 bg-card py-0 shadow-none', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/40 px-5 py-4">
        <div className="min-w-0 space-y-0.5">
          <CardTitle className="text-[13px] font-semibold tracking-tight">{title}</CardTitle>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="px-5 py-4">{children}</CardContent>
    </Card>
  );
}

function DashboardLinkButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        'h-7 shrink-0 px-2 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground',
        className
      )}
    >
      {children}
      <ChevronRight className="ml-0.5 h-3 w-3 opacity-50" />
    </Button>
  );
}

// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const spring = useSpring(0, { duration });
  const transformed = useTransform(spring, (latest) => Math.round(latest));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = transformed.on('change', (v) => {
      setDisplay(v);
    });
    return unsubscribe;
  }, [transformed]);

  return <span>{display}</span>;
}

// ─── Relative Time ───────────────────────────────────────────────────────────
function getRelativeTime(dateStr: string, locale: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (locale === 'fr') {
    if (diffMins < 1) return "à l'instant";
    if (diffMins < 60) return `il y a ${diffMins}m`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays < 7) return `il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  }
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Animation Variants ──────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.02, y: -4, transition: { duration: 0.25, ease: 'easeOut' } },
};

// ─── Main Component ──────────────────────────────────────────────────────────
export function DashboardView() {
  const { t, locale } = useTranslation();
  const { setActivePage, setCreateTaskDialogOpen, setCreateProjectDialogOpen, currentUser, activeOrganizationId } = useAppStore();
  const {
    tasks,
    projects,
    sprints,
    timeEntries,
    calendarEvents,
    auditLogs,
    users,
    getUserName,
  } = useAppData();
  const risksUrl = activeOrganizationId
    ? appendWorkspaceQuery('/api/risks?activeOnly=true&minScore=10', activeOrganizationId)
    : null;
  const { data: alertRisks } = useApiData<Array<{
    id: string;
    title: string;
    score: number;
    probability: number;
    impact: number;
    status: string;
    project?: { id: string; name: string; icon: string };
  }>>(risksUrl);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // ─── Compute PM stats from app data ─────────────────────────────────────
  const tasksCompletedThisWeek = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return tasks.filter((task) => task.status === 'done' && new Date(task.updatedAt) >= weekAgo).length;
  }, [tasks]);

  const inReviewCount = useMemo(() => {
    return tasks.filter((task) => task.status === 'review').length;
  }, [tasks]);

  const totalTimeSpentThisWeek = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return timeEntries
      .filter((te) => new Date(te.date) >= weekAgo)
      .reduce((sum, te) => sum + te.hours, 0);
  }, [timeEntries]);

  const sprintVelocity = useMemo(() => {
    const activeSprints = sprints.filter((s) => s.status === 'active');
    if (activeSprints.length === 0) return 0;
    return Math.round(activeSprints.reduce((sum, s) => sum + (s.velocity || 0), 0) / activeSprints.length);
  }, [sprints]);

  // ─── Chart Data: Tâches par statut (bar chart) ─────────────────────────
  const tasksByStatusData = useMemo(() => {
    const statusLabels = locale === 'fr'
      ? { todo: 'À faire', in_progress: 'En cours', review: 'En revue', done: 'Terminé' }
      : { todo: 'To Do', in_progress: 'In Progress', review: 'In Review', done: 'Done' };
    const statuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
    return statuses.map((status) => ({
      name: statusLabels[status],
      count: tasks.filter((t) => t.status === status).length,
    }));
  }, [locale, tasks]);

  // ─── Chart Data: Avancement des projets (area chart) ────────────────────
  const projectProgressData = useMemo(() => {
    return buildProjectProgressTrend(projects, tasks, 6, locale);
  }, [locale, projects, tasks]);

  // ─── Chart Data: Répartition par priorité (pie chart) ───────────────────
  const priorityDistributionData = useMemo(() => {
    const priorityLabels = locale === 'fr'
      ? { urgent: 'Urgent', high: 'Élevée', medium: 'Moyenne', low: 'Basse' }
      : { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };
    const colors: Record<TaskPriority, string> = { urgent: '#ef4444', high: '#f59e0b', medium: '#06b6d4', low: '#64748b' };
    const priorities: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];
    return priorities.map((p) => ({
      name: priorityLabels[p],
      value: tasks.filter((t) => t.priority === p).length,
      color: colors[p],
    })).filter((d) => d.value > 0);
  }, [locale, tasks]);

  // ─── Recent Activity from Audit Logs ───────────────────────────────────
  const recentActivity = useMemo(() => {
    return auditLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [auditLogs]);

  const auditActionConfig: Record<string, { icon: React.ElementType; color: string; dotColor: string }> = {
    create: { icon: Zap, color: 'text-teal-500', dotColor: 'bg-teal-500' },
    update: { icon: Edit3, color: 'text-amber-500', dotColor: 'bg-amber-500' },
    delete: { icon: Trash2, color: 'text-rose-500', dotColor: 'bg-rose-500' },
    assign: { icon: UserPlus, color: 'text-cyan-500', dotColor: 'bg-cyan-500' },
    move: { icon: ArrowUpRight, color: 'text-emerald-500', dotColor: 'bg-emerald-500' },
    archive: { icon: CheckCircle2, color: 'text-slate-500', dotColor: 'bg-slate-500' },
    login: { icon: LogIn, color: 'text-cyan-500', dotColor: 'bg-cyan-500' },
    logout: { icon: LogIn, color: 'text-slate-500', dotColor: 'bg-slate-500' },
    permission_change: { icon: Shield, color: 'text-violet-500', dotColor: 'bg-violet-500' },
  };

  const entityTypeIcon: Record<string, React.ElementType> = {
    task: CheckCircle2,
    project: FolderKanban,
    user: UserPlus,
    sprint: Gauge,
  };

  // ─── Upcoming Calendar Events ──────────────────────────────────────────
  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return calendarEvents
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);
  }, [calendarEvents]);

  // ─── Active Sprints for Progress Section ───────────────────────────────
  const sprintsForProgress = useMemo(() => {
    return sprints.filter((s) => s.status === 'active').map((sprint) => {
      const sprintTasks = tasks.filter((t) => t.sprintId === sprint.id);
      const doneTasks = sprintTasks.filter((t) => t.status === 'done').length;
      const progress = sprintTasks.length > 0 ? Math.round((doneTasks / sprintTasks.length) * 100) : 0;
      return { ...sprint, progress, doneTasks, totalTasks: sprintTasks.length };
    });
  }, [sprints, tasks]);

  // ─── Stats Config (valeurs + tendances calculées depuis les données réelles) ─
  const statsConfig = useMemo(() => {
    const { currentStart, previousStart, now } = getPeriodBounds(7);
    const weekAgo = currentStart;

    const completedThisWeek = countTasksCompletedInPeriod(tasks, currentStart, now);
    const completedLastWeek = countTasksCompletedInPeriod(tasks, previousStart, weekAgo);
    const tasksTrend = compareCounts(completedThisWeek, completedLastWeek, 'percent');

    const velocityThisWeek = avgSprintVelocityInPeriod(sprints, currentStart, now);
    const velocityLastWeek = avgSprintVelocityInPeriod(sprints, previousStart, weekAgo);
    const velocityTrend = compareCounts(velocityThisWeek, velocityLastWeek, 'absolute');

    const hoursThisWeek = sumTimeEntriesInPeriod(timeEntries, currentStart, now);
    const hoursLastWeek = sumTimeEntriesInPeriod(timeEntries, previousStart, weekAgo);
    const hoursTrend = compareCounts(hoursThisWeek, hoursLastWeek, 'hours');

    const rateNow =
      projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length) : 0;
    const rateLastWeek = completionRateAt(tasks, weekAgo);
    const rateTrend = compareCounts(rateNow, rateLastWeek, 'points');

    const activeNow = countActiveProjects(projects);
    const activatedThisWeek = countProjectsActivatedInPeriod(projects, currentStart, now);
    const activatedLastWeek = countProjectsActivatedInPeriod(projects, previousStart, weekAgo);
    const activeTrend = compareCounts(activatedThisWeek, activatedLastWeek, 'absolute');

    const overdueNow = countOverdueTasks(tasks, now);
    const overdueLastWeek = countOverdueTasks(tasks, weekAgo);
    const overdueTrend = compareCountsInverted(overdueNow, overdueLastWeek);

    return [
      {
        title: t.dashboard.totalTasks,
        value: tasksCompletedThisWeek,
        change: tasksTrend.change,
        trend: tasksTrend.trend,
        icon: CheckCircle2,
        gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
        iconBg: 'bg-emerald-500/15',
        iconColor: 'text-emerald-600',
        borderAccent: 'border-emerald-500/20',
        glowColor: 'shadow-emerald-500/5',
      },
      {
        title: t.dashboard.activeProjects,
        value: sprintVelocity,
        change: velocityTrend.change,
        trend: velocityTrend.trend,
        icon: Gauge,
        gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
        iconBg: 'bg-amber-500/15',
        iconColor: 'text-amber-600',
        borderAccent: 'border-amber-500/20',
        glowColor: 'shadow-amber-500/5',
      },
      {
        title: t.dashboard.inProgress,
        value: Math.round(totalTimeSpentThisWeek),
        suffix: 'h',
        change: hoursTrend.change,
        trend: hoursTrend.trend,
        icon: Timer,
        gradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
        iconBg: 'bg-cyan-500/15',
        iconColor: 'text-cyan-600',
        borderAccent: 'border-cyan-500/20',
        glowColor: 'shadow-cyan-500/5',
      },
      {
        title: t.dashboard.completionRate,
        value: rateNow,
        isPercent: true,
        change: rateTrend.change,
        trend: rateTrend.trend,
        icon: Target,
        gradient: 'from-teal-500/10 via-teal-500/5 to-transparent',
        iconBg: 'bg-teal-500/15',
        iconColor: 'text-teal-600',
        borderAccent: 'border-teal-500/20',
        glowColor: 'shadow-teal-500/5',
      },
      {
        title: t.dashboard.activeProjectsCount,
        value: activeNow,
        change: activeTrend.change,
        trend: activeTrend.trend,
        icon: FolderKanban,
        gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
        iconBg: 'bg-amber-500/15',
        iconColor: 'text-amber-600',
        borderAccent: 'border-amber-500/20',
        glowColor: 'shadow-amber-500/5',
      },
      {
        title: t.dashboard.activeTasks,
        value: overdueNow,
        change: overdueTrend.change,
        trend: overdueTrend.trend,
        icon: AlertTriangle,
        gradient: 'from-rose-500/10 via-rose-500/5 to-transparent',
        iconBg: 'bg-rose-500/15',
        iconColor: 'text-rose-600',
        borderAccent: 'border-rose-500/20',
        glowColor: 'shadow-rose-500/5',
      },
    ];
  }, [
    t.dashboard,
    tasks,
    sprints,
    timeEntries,
    projects,
    tasksCompletedThisWeek,
    sprintVelocity,
    totalTimeSpentThisWeek,
  ]);

  // ─── Quick Actions ─────────────────────────────────────────────────────
  const quickActions = [
    { icon: Plus, label: t.dashboard.quickActionNewTask, onClick: () => setCreateTaskDialogOpen(true), color: 'text-teal-600 hover:bg-teal-500/10 hover:border-teal-500/30' },
    { icon: FolderKanban, label: t.dashboard.quickActionNewProject, onClick: () => setCreateProjectDialogOpen(true), color: 'text-amber-600 hover:bg-amber-500/10 hover:border-amber-500/30' },
    { icon: Timer, label: t.dashboard.quickActionScheduleMeeting, onClick: () => setActivePage('time-tracking'), color: 'text-cyan-600 hover:bg-cyan-500/10 hover:border-cyan-500/30' },
    { icon: UserPlus, label: t.dashboard.quickActionInviteMember, onClick: () => setActivePage('members'), color: 'text-emerald-600 hover:bg-emerald-500/10 hover:border-emerald-500/30' },
  ];

  // ─── User color helper ─────────────────────────────────────────────────
  const getUserColor = (id: string) => {
    const colors = [
      'bg-teal-500/20 text-teal-700',
      'bg-amber-500/20 text-amber-700',
      'bg-cyan-500/20 text-cyan-700',
      'bg-rose-500/20 text-rose-700',
      'bg-emerald-500/20 text-emerald-700',
      'bg-orange-500/20 text-orange-700',
    ];
    const idx = users.findIndex((u) => u.id === id);
    return colors[idx % colors.length];
  };

  // ─── Welcome name ──────────────────────────────────────────────────────
  const welcomeName = currentUser?.name?.split(' ')[0] || 'Alex';

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 relative">
      {/* ─── Welcome Greeting Section ────────────────────────────────────── */}
      <motion.div variants={item} className="flex items-start justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-2xl sm:text-3xl font-bold tracking-tight"
          >
            {locale === 'fr' ? `Bon retour, ${welcomeName} !` : `Welcome back, ${welcomeName}!`}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-center gap-2 mt-1"
          >
            <span className="text-sm text-muted-foreground">
              {mounted ? new Date().toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* ─── Quick Actions Row ───────────────────────────────────────────── */}
      <motion.div
        variants={item}
        className="flex items-center gap-2 flex-wrap"
      >
        {quickActions.map((action, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={action.onClick}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/50 text-xs font-medium transition-all duration-200 ${action.color}`}
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </motion.button>
        ))}
      </motion.div>

      {/* ─── Stats Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        {statsConfig.map((stat, i) => {
          const IconComp = stat.icon;
          return (
            <motion.div key={i} variants={item}>
              <motion.div
                variants={cardHover}
                initial="rest"
                whileHover="hover"
                className="relative group"
              >
                <Card
                  className={`relative overflow-hidden border ${stat.borderAccent} shadow-md ${stat.glowColor} hover:shadow-lg transition-shadow duration-300`}
                >
                  {/* Gradient Background */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-500`}
                  />
                  {/* Decorative Circle */}
                  <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-current/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ color: stat.iconColor.includes('emerald') ? '#10b981' : stat.iconColor.includes('amber') ? '#f59e0b' : stat.iconColor.includes('cyan') ? '#06b6d4' : stat.iconColor.includes('rose') ? '#f43f5e' : stat.iconColor.includes('teal') ? '#14b8a6' : '#10b981' }} />

                  <CardContent className="relative p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <div className="flex items-baseline gap-1">
                          <p className="text-3xl font-extrabold tracking-tight">
                            {stat.isPercent ? (
                              <>
                                <AnimatedCounter value={stat.value} />
                                <span className="text-lg font-semibold text-muted-foreground ml-0.5">%</span>
                              </>
                            ) : (
                              <>
                                <AnimatedCounter value={stat.value} />
                                {stat.suffix && <span className="text-lg font-semibold text-muted-foreground ml-0.5">{stat.suffix}</span>}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className={`p-3 rounded-2xl ${stat.iconBg} backdrop-blur-sm border border-white/10 shadow-sm`}>
                        <IconComp className={`h-5 w-5 ${stat.iconColor}`} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3">
                      <motion.div
                        className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          stat.trend === 'up'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-rose-500/10 text-rose-600'
                        }`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                      >
                        {stat.trend === 'up' ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {stat.change}
                      </motion.div>
                      <span className="text-[11px] text-muted-foreground">{t.dashboard.vsLastWeek}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Charts Section ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={item}>
          <DashboardPanelCard
            title={t.dashboard.weeklyActivity}
            subtitle={locale === 'fr' ? 'Tâches par statut' : 'Tasks by status'}
            action={<DashboardLinkButton>{t.dashboard.viewDetails}</DashboardLinkButton>}
          >
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={tasksByStatusData} barGap={6}>
                  <CartesianGrid stroke="var(--border)" strokeOpacity={0.6} vertical={false} />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    stroke="var(--muted-foreground)"
                    dy={6}
                  />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    stroke="var(--muted-foreground)"
                    dx={-4}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                    name={locale === 'fr' ? 'Tâches' : 'Tasks'}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </DashboardPanelCard>
        </motion.div>

        <motion.div variants={item}>
          <DashboardPanelCard
            title={t.dashboard.sprintBurndown}
            subtitle={locale === 'fr' ? 'Objectif vs avancement réel' : 'Target vs actual progress'}
            action={<DashboardLinkButton>{t.dashboard.viewDetails}</DashboardLinkButton>}
          >
            <div className="mb-3 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-px w-4 border-t-2 border-dashed border-muted-foreground/50" />
                <span className="text-[11px] text-muted-foreground">{locale === 'fr' ? 'Objectif' : 'Target'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full bg-primary" />
                <span className="text-[11px] text-muted-foreground">{locale === 'fr' ? 'Réel' : 'Actual'}</span>
              </div>
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectProgressData}>
                  <defs>
                    <linearGradient id="projectGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeOpacity={0.6} vertical={false} />
                  <XAxis
                    dataKey="name"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    stroke="var(--muted-foreground)"
                    dy={6}
                  />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    stroke="var(--muted-foreground)"
                    dx={-4}
                    width={28}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="target"
                    stroke="var(--muted-foreground)"
                    fill="none"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    strokeOpacity={0.5}
                    name={locale === 'fr' ? 'Objectif' : 'Target'}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="var(--primary)"
                    fill="url(#projectGradient)"
                    strokeWidth={2}
                    name={locale === 'fr' ? 'Réel' : 'Actual'}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </DashboardPanelCard>
        </motion.div>

        <motion.div variants={item}>
          <DashboardPanelCard
            title={t.dashboard.contentTypeBreakdown}
            subtitle={locale === 'fr' ? 'Répartition par priorité' : 'Distribution by priority'}
          >
            <div className="flex items-center gap-6">
              <div className="h-[140px] w-[140px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={priorityDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={58}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="var(--card)"
                    >
                      {priorityDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(value: number) => [value, '']}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-1 flex-col gap-2.5">
                {priorityDistributionData.map((entry, idx) => {
                  const total = priorityDistributionData.reduce((sum, d) => sum + d.value, 0);
                  const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                  return (
                    <div key={idx} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="truncate text-xs text-muted-foreground">{entry.name}</span>
                      </div>
                      <div className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
                        <span className="text-xs font-semibold">{entry.value}</span>
                        <span className="text-[10px] text-muted-foreground/70">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </DashboardPanelCard>
        </motion.div>
      </div>

      {/* ─── Recent Activity + Upcoming ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={item}>
          <DashboardPanelCard
            className="h-full"
            title={t.dashboard.recentActivity}
            action={<DashboardLinkButton>{t.dashboard.seeAll}</DashboardLinkButton>}
          >
            <div className="divide-y divide-border/40">
              {recentActivity.map((log, idx) => {
                const config = auditActionConfig[log.action] || auditActionConfig.create;
                const EntityIcon = entityTypeIcon[log.entityType] || CheckCircle2;

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.25 }}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/50">
                      <EntityIcon className={cn('h-3.5 w-3.5', config.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-relaxed text-foreground">{log.details}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {getUserName(log.userId)}
                        <span className="mx-1.5 text-border">·</span>
                        {getRelativeTime(log.timestamp, locale)}
                      </p>
                    </div>
                    <div className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', config.dotColor)} />
                  </motion.div>
                );
              })}
            </div>
          </DashboardPanelCard>
        </motion.div>

        <motion.div variants={item} className="flex flex-col gap-4">
          <DashboardPanelCard
            title={t.dashboard.criticalRisks}
            subtitle={t.dashboard.criticalRisksDesc}
            action={
              <DashboardLinkButton onClick={() => setActivePage('risks')}>
                {t.dashboard.viewRisks}
              </DashboardLinkButton>
            }
          >
            {(alertRisks ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t.dashboard.noCriticalRisks}</p>
            ) : (
              <div className="divide-y divide-border/40">
                {(alertRisks ?? []).slice(0, 4).map((risk) => (
                  <div key={risk.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className={cn('h-8 w-8 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0', scoreColor(risk.score))}>
                      {risk.score}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{risk.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {risk.project ? `${risk.project.icon} ${risk.project.name}` : ''}
                        <span className="mx-1.5 text-border">·</span>
                        {t.dashboard.riskScore} {risk.probability}×{risk.impact}
                      </p>
                    </div>
                    <ShieldAlert className="h-4 w-4 shrink-0 text-rose-500" />
                  </div>
                ))}
              </div>
            )}
          </DashboardPanelCard>

          <DashboardPanelCard title={t.dashboard.upcomingDeadlines}>
            <div className="divide-y divide-border/40">
              {tasks
                .filter((task) => task.status !== 'done')
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .slice(0, 4)
                .map((task) => {
                  const dueDate = new Date(task.dueDate);
                  const now = new Date();
                  const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);
                  const isOverdue = daysUntil < 0;
                  const isSoon = daysUntil >= 0 && daysUntil <= 3;
                  const project = projects.find((p) => p.id === task.projectId);

                  return (
                    <div key={task.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{task.title}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{project?.name}</p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium tabular-nums',
                          isOverdue
                            ? 'bg-rose-500/10 text-rose-600'
                            : isSoon
                              ? 'bg-amber-500/10 text-amber-700'
                              : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isOverdue
                          ? `${Math.abs(daysUntil)}d ${locale === 'fr' ? 'retard' : 'overdue'}`
                          : daysUntil === 0
                            ? locale === 'fr'
                              ? "Aujourd'hui"
                              : 'Today'
                            : `${daysUntil}d`}
                      </span>
                    </div>
                  );
                })}
            </div>
          </DashboardPanelCard>

          <DashboardPanelCard
            title={t.dashboard.projectProgress}
            subtitle={locale === 'fr' ? 'Sprints actifs' : 'Active sprints'}
            action={
              <DashboardLinkButton onClick={() => setActivePage('projects')}>
                {t.dashboard.viewAllProjects}
              </DashboardLinkButton>
            }
          >
            {sprintsForProgress.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Gauge className="mb-2 h-6 w-6 opacity-25" />
                <p className="text-xs">{locale === 'fr' ? 'Aucun sprint actif' : 'No active sprints'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sprintsForProgress.map((sprint) => {
                  const project = projects.find((p) => p.id === sprint.projectId);
                  const color = project?.color || 'var(--primary)';

                  return (
                    <div key={sprint.id}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{sprint.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {sprint.totalTasks} {locale === 'fr' ? 'tâches' : 'tasks'}
                            <span className="mx-1.5 text-border">·</span>
                            {sprint.velocity || 0} {locale === 'fr' ? 'pts' : 'pts'}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color }}>
                          {sprint.progress}%
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-muted/60">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${sprint.progress}%` }}
                          transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DashboardPanelCard>
        </motion.div>
      </div>
    </motion.div>
  );
}

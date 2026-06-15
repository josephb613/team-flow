'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart as PieChartIcon,
  CheckCircle2,
  Gauge,
  Target,
  Timer,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAppData } from '@/hooks/use-app-data';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  avgSprintVelocityInPeriod,
  buildUserWorkload,
  buildWeeklyTaskTrend,
  compareCounts,
  completionRateAt,
  countSprintsCompletedInPeriod,
  countTasksCompletedInPeriod,
  getPeriodBounds,
  onTimeDeliveryRate,
  onTimeDeliveryRateInPeriod,
  sumTimeEntriesInPeriod,
} from '@/lib/analytics';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ─── Animation ───────────────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const COLORS = ['#10b981', '#f59e0b', '#06b6d4', '#ef4444', '#8b5cf6'];
const PIE_COLORS = ['#ef4444', '#f59e0b', '#06b6d4', '#64748b'];

// ─── Period selector options ─────────────────────────────────────────────────
const periods = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '1y', label: '1a' },
] as const;

type Period = typeof periods[number]['key'];

// ─── Main Component ──────────────────────────────────────────────────────────
export function StatisticsView() {
  const { t, locale } = useTranslation();
  const { tasks, sprints, timeEntries, users } = useAppData();
  const [period, setPeriod] = useState<Period>('30d');

  // ─── Compute PM Metrics ────────────────────────────────────────────────
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'done').length, [tasks]);
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const sprintsDelivered = useMemo(() => sprints.filter(s => s.status === 'completed').length, [sprints]);
  const avgVelocity = useMemo(() => {
    const activeSprints = sprints.filter(s => s.status === 'active' || s.status === 'completed');
    if (activeSprints.length === 0) return 0;
    return Math.round(activeSprints.reduce((sum, s) => sum + (s.velocity || 0), 0) / activeSprints.length);
  }, [sprints]);

  const totalTimeSpent = useMemo(() => timeEntries.reduce((sum, te) => sum + te.hours, 0), [timeEntries]);

  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;

  // ─── Chart Data: Task completion trend ──────────────────────────────────
  const taskTrendData = useMemo(() => {
    const weeks = period === '7d' ? 7 : period === '30d' ? 12 : 12;
    return buildWeeklyTaskTrend(tasks, weeks);
  }, [period, tasks]);

  // ─── Chart Data: Team workload ─────────────────────────────────────────
  const workloadData = useMemo(() => buildUserWorkload(users, tasks), [users, tasks]);

  // ─── Chart Data: Priority distribution ─────────────────────────────────
  const priorityData = useMemo(() => {
    const priorityLabels = locale === 'fr'
      ? { urgent: 'Urgent', high: 'Élevée', medium: 'Moyenne', low: 'Basse' }
      : { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };
    return [
      { name: priorityLabels.urgent, value: tasks.filter(t => t.priority === 'urgent').length },
      { name: priorityLabels.high, value: tasks.filter(t => t.priority === 'high').length },
      { name: priorityLabels.medium, value: tasks.filter(t => t.priority === 'medium').length },
      { name: priorityLabels.low, value: tasks.filter(t => t.priority === 'low').length },
    ];
  }, [locale, tasks]);

  const stats = useMemo(() => {
    const { currentStart, previousStart, now } = getPeriodBounds(periodDays);
    const periodEnd = period === '7d' ? now : currentStart;

    const completedInPeriod = countTasksCompletedInPeriod(tasks, currentStart, now);
    const completedPrevPeriod = countTasksCompletedInPeriod(tasks, previousStart, periodEnd);
    const tasksTrend = compareCounts(completedInPeriod, completedPrevPeriod, 'percent');

    const sprintsInPeriod = countSprintsCompletedInPeriod(sprints, currentStart, now);
    const sprintsPrevPeriod = countSprintsCompletedInPeriod(sprints, previousStart, periodEnd);
    const sprintsTrend = compareCounts(sprintsInPeriod, sprintsPrevPeriod, 'absolute');

    const velocityInPeriod = avgSprintVelocityInPeriod(sprints, currentStart, now);
    const velocityPrevPeriod = avgSprintVelocityInPeriod(sprints, previousStart, periodEnd);
    const velocityTrend = compareCounts(velocityInPeriod, velocityPrevPeriod, 'absolute');

    const rateTrend = compareCounts(completionRate, completionRateAt(tasks, periodEnd), 'points');

    const hoursInPeriod = sumTimeEntriesInPeriod(timeEntries, currentStart, now);
    const hoursPrevPeriod = sumTimeEntriesInPeriod(timeEntries, previousStart, periodEnd);
    const hoursTrend = compareCounts(hoursInPeriod, hoursPrevPeriod, 'hours');

    const onTimeNow = onTimeDeliveryRate(tasks);
    const onTimePrev = onTimeDeliveryRateInPeriod(tasks, previousStart, periodEnd);
    const onTimeTrend = compareCounts(onTimeNow, onTimePrev, 'points');

    return [
      {
        title: t.statistics.tasksCompleted,
        value: completedTasks,
        change: tasksTrend.change,
        trend: tasksTrend.trend,
        icon: CheckCircle2,
        gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
        iconBg: 'bg-emerald-500/15',
        iconColor: 'text-emerald-600',
        borderAccent: 'border-emerald-500/20',
      },
      {
        title: t.statistics.sprintsDelivered,
        value: sprintsDelivered,
        change: sprintsTrend.change,
        trend: sprintsTrend.trend,
        icon: Gauge,
        gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
        iconBg: 'bg-amber-500/15',
        iconColor: 'text-amber-600',
        borderAccent: 'border-amber-500/20',
      },
      {
        title: t.statistics.velocity,
        value: avgVelocity,
        change: velocityTrend.change,
        trend: velocityTrend.trend,
        icon: Zap,
        gradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
        iconBg: 'bg-cyan-500/15',
        iconColor: 'text-cyan-600',
        borderAccent: 'border-cyan-500/20',
      },
      {
        title: t.statistics.completionRate,
        value: `${completionRate}%`,
        change: rateTrend.change,
        trend: rateTrend.trend,
        icon: Target,
        gradient: 'from-teal-500/10 via-teal-500/5 to-transparent',
        iconBg: 'bg-teal-500/15',
        iconColor: 'text-teal-600',
        borderAccent: 'border-teal-500/20',
      },
      {
        title: t.statistics.timeSpent,
        value: `${Math.round(totalTimeSpent)}h`,
        change: hoursTrend.change,
        trend: hoursTrend.trend,
        icon: Timer,
        gradient: 'from-rose-500/10 via-rose-500/5 to-transparent',
        iconBg: 'bg-rose-500/15',
        iconColor: 'text-rose-600',
        borderAccent: 'border-rose-500/20',
      },
      {
        title: t.statistics.onTimeDelivery,
        value: `${onTimeNow}%`,
        change: onTimeTrend.change,
        trend: onTimeTrend.trend,
        icon: TrendingUp,
        gradient: 'from-[oklch(0.55_0.18_160/0.1)] via-[oklch(0.55_0.18_160/0.05)] to-transparent',
        iconBg: 'bg-[oklch(0.55_0.18_160/0.15)]',
        iconColor: 'text-[oklch(0.55_0.18_160)]',
        borderAccent: 'border-[oklch(0.55_0.18_160/0.2)]',
      },
    ];
  }, [
    t.statistics,
    periodDays,
    period,
    tasks,
    sprints,
    timeEntries,
    completedTasks,
    sprintsDelivered,
    avgVelocity,
    completionRate,
    totalTimeSpent,
  ]);

  const tooltipStyle = {
    backgroundColor: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    fontSize: '12px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    padding: '10px 14px',
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.statistics.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {locale === 'fr' ? 'Mesurez les performances de vos projets et équipes' : 'Measure your projects and team performance'}
          </p>
        </div>
        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
          {periods.map(p => (
            <Button
              key={p.key}
              variant={period === p.key ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 text-xs px-3',
                period === p.key && 'bg-[oklch(0.55_0.18_160)] hover:bg-[oklch(0.50_0.18_160)] text-white shadow-sm',
              )}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ─── Key Metrics ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((stat, i) => {
          const IconComp = stat.icon;
          return (
            <motion.div key={i} variants={item}>
              <Card className={`relative overflow-hidden border ${stat.borderAccent} shadow-sm hover:shadow-md transition-shadow duration-300`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-60`} />
                <CardContent className="relative p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${stat.iconBg}`}>
                      <IconComp className={`h-3.5 w-3.5 ${stat.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-lg font-extrabold tracking-tight">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.title}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <div className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${stat.trend === 'up' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                      {stat.trend === 'up' ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                      {stat.change}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Charts Row 1 ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Area Chart - Task completion trend */}
        <motion.div variants={item}>
          <Card className="overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
                    <Activity className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{t.statistics.tasksCompleted}</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {locale === 'fr' ? 'Tâches terminées vs créées' : 'Tasks completed vs created'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 hover:bg-emerald-500/5">
                  {locale === 'fr' ? 'Détails' : 'Details'} <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={taskTrendData}>
                    <defs>
                      <linearGradient id="statsCompletedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="statsCreatedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" dy={8} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" dx={-4} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--muted)', radius: 4 }} />
                    <Area type="monotone" dataKey="completed" stroke="#10b981" fill="url(#statsCompletedGrad)" strokeWidth={2.5} name={locale === 'fr' ? 'Terminées' : 'Completed'} />
                    <Area type="monotone" dataKey="created" stroke="#f59e0b80" fill="url(#statsCreatedGrad)" strokeWidth={2} strokeDasharray="5 5" name={locale === 'fr' ? 'Créées' : 'Created'} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bar Chart - Team workload */}
        <motion.div variants={item}>
          <Card className="overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/15">
                    <BarChart3 className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{locale === 'fr' ? 'Charge de travail' : 'Team Workload'}</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {locale === 'fr' ? 'Tâches par membre de l\'équipe' : 'Tasks per team member'}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" dy={8} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" dx={-4} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--muted)', radius: 4 }} />
                    <Bar dataKey="taches" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} name={locale === 'fr' ? 'Tâches' : 'Tasks'} />
                    <Bar dataKey="terminees" fill="#10b98130" radius={[6, 6, 0, 0]} maxBarSize={40} name={locale === 'fr' ? 'Terminées' : 'Completed'} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Charts Row 2 ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pie Chart - Priority distribution */}
        <motion.div variants={item}>
          <Card className="overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/15">
                    <PieChartIcon className="h-4 w-4 text-rose-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{locale === 'fr' ? 'Répartition par priorité' : 'Priority Distribution'}</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {locale === 'fr' ? 'Distribution des tâches par priorité' : 'Task distribution by priority'}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {priorityData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                      fontSize={12}
                      formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sprint Velocity Insights */}
        <motion.div variants={item}>
          <Card className="overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/15">
                  <Sparkles className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">{locale === 'fr' ? 'Insights sprint' : 'Sprint Insights'}</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {locale === 'fr' ? 'Recommandations basées sur vos données' : 'Recommendations based on your data'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    title: locale === 'fr' ? 'Vélocité moyenne' : 'Average velocity',
                    value: `${avgVelocity} pts`,
                    description: locale === 'fr' ? 'La vélocité de votre équipe est stable cette semaine' : 'Your team velocity is stable this week',
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-500/10',
                  },
                  {
                    title: locale === 'fr' ? 'Taux de livraison' : 'Delivery rate',
                    value: `${completionRate}%`,
                    description: locale === 'fr' ? `${completedTasks} tâches terminées sur ${totalTasks} au total` : `${completedTasks} tasks completed out of ${totalTasks} total`,
                    color: 'text-amber-600',
                    bg: 'bg-amber-500/10',
                  },
                  {
                    title: locale === 'fr' ? 'Temps moyen par tâche' : 'Avg. time per task',
                    value: totalTimeSpent > 0 ? `${Math.round(totalTimeSpent / Math.max(completedTasks, 1))}h` : '0h',
                    description: locale === 'fr' ? 'Durée moyenne pour compléter une tâche' : 'Average time to complete a task',
                    color: 'text-cyan-600',
                    bg: 'bg-cyan-500/10',
                  },
                  {
                    title: locale === 'fr' ? 'Sprints en cours' : 'Active sprints',
                    value: `${sprints.filter(s => s.status === 'active').length}`,
                    description: locale === 'fr' ? 'Nombre de sprints actuellement actifs' : 'Number of currently active sprints',
                    color: 'text-teal-600',
                    bg: 'bg-teal-500/10',
                  },
                ].map((insight, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.08 }}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className={cn('p-2 rounded-lg', insight.bg)}>
                      <TrendingUp className={cn('h-4 w-4', insight.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{insight.title}</p>
                        <span className={cn('text-xs font-semibold', insight.color)}>{insight.value}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{insight.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

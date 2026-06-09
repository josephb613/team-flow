'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle2,
  TrendingUp,
  Clock,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  ChevronRight,
  Sparkles,
  FileSpreadsheet,
  FileJson,
  Clipboard,
  Check,
  PauseCircle,
  FolderKanban,
  Timer,
} from 'lucide-react';
import {
  mockTasks,
  mockProjects,
  mockSprints,
  mockTimeEntries,
  mockUsers,
  mockMilestones,
  getUserName,
  projectStatusLabels,
  taskStatusLabels,
} from '@/lib/mock-data';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  exportToCSV,
  exportToJSON,
  copyToClipboard,
} from '@/lib/export-utils';

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

// ─── Project Health Colors ────────────────────────────────────────────────────
const projectHealthColors: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  on_hold: { bg: 'bg-amber-500/10', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { bg: 'bg-slate-500/10', text: 'text-slate-600', dot: 'bg-slate-400' },
  archived: { bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-300' },
};

// ─── Export Type ─────────────────────────────────────────────────────────────
type ExportType = 'tasks' | 'projects' | 'time';

// ─── Main Component ──────────────────────────────────────────────────────────
export function ReportsView() {
  const { t, locale } = useTranslation();
  const [copiedType, setCopiedType] = useState<ExportType | null>(null);

  // ─── Compute PM Metrics ────────────────────────────────────────────────
  const totalTasks = mockTasks.length;
  const completedTasks = mockTasks.filter(t => t.status === 'done').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const avgTaskDuration = useMemo(() => {
    const doneTasks = mockTasks.filter(t => t.status === 'done' && t.estimatedHours && t.estimatedHours > 0);
    if (doneTasks.length === 0) return 0;
    return Math.round(doneTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) / doneTasks.length);
  }, []);

  const activeContributors = useMemo(() => {
    const assigneeIds = new Set(mockTasks.map(t => t.assigneeId));
    return assigneeIds.size;
  }, []);

  const totalHoursLogged = useMemo(() => mockTimeEntries.reduce((sum, te) => sum + te.hours, 0), []);

  // ─── Chart Data ───────────────────────────────────────────────────────
  const taskTrendData = useMemo(() => [
    { name: 'S18', terminees: 4, creees: 6 },
    { name: 'S19', terminees: 6, creees: 5 },
    { name: 'S20', terminees: 3, creees: 7 },
    { name: 'S21', terminees: 8, creees: 4 },
    { name: 'S22', terminees: 5, creees: 6 },
    { name: 'S23', terminees: 7, creees: 3 },
    { name: 'S24', terminees: 9, creees: 5 },
  ], []);

  const tasksByStatusData = useMemo(() => {
    const statusLabels = locale === 'fr'
      ? { todo: 'À faire', in_progress: 'En cours', review: 'En revue', done: 'Terminé' }
      : { todo: 'To Do', in_progress: 'In Progress', review: 'In Review', done: 'Done' };
    const colors: Record<string, string> = { todo: '#64748b', in_progress: '#f59e0b', review: '#06b6d4', done: '#10b981' };
    return ['todo', 'in_progress', 'review', 'done'].map(s => ({
      name: statusLabels[s as keyof typeof statusLabels],
      value: mockTasks.filter(t => t.status === s).length,
      color: colors[s],
    }));
  }, [locale]);

  const teamWorkloadData = useMemo(() => {
    return mockUsers.slice(0, 6).map(user => ({
      name: user.name.split(' ')[0],
      taches: user.taskCount,
      terminees: Math.floor(user.taskCount * 0.6),
    }));
  }, []);

  // ─── Export Handlers ───────────────────────────────────────────────────
  const getExportData = useCallback((type: ExportType) => {
    switch (type) {
      case 'tasks':
        return mockTasks.map(t => ({
          Titre: t.title, Statut: t.status, Priorité: t.priority, Projet: mockProjects.find(p => p.id === t.projectId)?.name || '', Assigné: getUserName(t.assigneeId), 'Heures estimées': t.estimatedHours || 0, 'Heures loguées': t.loggedHours, 'Date d\'échéance': t.dueDate,
        }));
      case 'projects':
        return mockProjects.map(p => ({
          Nom: p.name, Statut: p.status, 'Tâches': p.taskCount, 'Terminées': p.completedTasks, 'Progression': `${p.progress}%`, 'Date de début': p.startDate, 'Date de fin': p.dueDate,
        }));
      case 'time':
        return mockTimeEntries.map(te => ({
          Tâche: mockTasks.find(t => t.id === te.taskId)?.title || '', Projet: mockProjects.find(p => p.id === te.projectId)?.name || '', Utilisateur: getUserName(te.userId), Date: te.date, Heures: te.hours, Description: te.description, Facturable: te.billable ? 'Oui' : 'Non',
        }));
    }
  }, []);

  const handleExportCSV = useCallback((type: ExportType) => {
    const data = getExportData(type);
    exportToCSV(data, `teamflow-${type}-${new Date().toISOString().split('T')[0]}`);
  }, [getExportData]);

  const handleExportJSON = useCallback((type: ExportType) => {
    const data = getExportData(type);
    exportToJSON(data, `teamflow-${type}-${new Date().toISOString().split('T')[0]}`);
  }, [getExportData]);

  const handleCopyToClipboard = useCallback(async (type: ExportType) => {
    const data = getExportData(type);
    const success = await copyToClipboard(data, 'csv');
    if (success) {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }
  }, [getExportData]);

  const stats = [
    {
      title: t.reports.totalTasks,
      value: totalTasks,
      change: '+18%',
      trend: 'up' as const,
      icon: FolderKanban,
      gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-600',
      borderAccent: 'border-emerald-500/20',
      glowColor: 'shadow-emerald-500/5',
    },
    {
      title: t.reports.completionRate,
      value: `${completionRate}%`,
      isPercent: true,
      change: '+5%',
      trend: 'up' as const,
      icon: TrendingUp,
      gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-600',
      borderAccent: 'border-amber-500/20',
      glowColor: 'shadow-amber-500/5',
    },
    {
      title: t.reports.avgCompletionTime,
      value: `${avgTaskDuration}h`,
      isString: true,
      change: '-8%',
      trend: 'up' as const,
      icon: Clock,
      gradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
      iconBg: 'bg-cyan-500/15',
      iconColor: 'text-cyan-600',
      borderAccent: 'border-cyan-500/20',
      glowColor: 'shadow-cyan-500/5',
    },
    {
      title: t.reports.activeContributors,
      value: activeContributors,
      change: '+2',
      trend: 'up' as const,
      icon: Users,
      gradient: 'from-teal-500/10 via-teal-500/5 to-transparent',
      iconBg: 'bg-teal-500/15',
      iconColor: 'text-teal-600',
      borderAccent: 'border-teal-500/20',
      glowColor: 'shadow-teal-500/5',
    },
  ];

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
          <h2 className="text-xl font-bold tracking-tight">{t.reports.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t.reports.subtitle}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.18_160)] to-[oklch(0.50_0.18_160)] hover:from-[oklch(0.50_0.15_160)] hover:to-[oklch(0.45_0.18_160)] shadow-sm shadow-[oklch(0.55_0.18_160/0.2)] text-white"
            >
              <Download className="h-4 w-4" /> {t.reports.exportReport}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {/* Tasks Export */}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              {t.reports.exportTasks}
            </div>
            <DropdownMenuItem onClick={() => handleExportCSV('tasks')} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>{t.reports.exportAsCSV}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportJSON('tasks')} className="gap-2 cursor-pointer">
              <FileJson className="h-4 w-4 text-amber-600" />
              <span>{t.reports.exportAsJSON}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCopyToClipboard('tasks')} className="gap-2 cursor-pointer">
              {copiedType === 'tasks' ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Clipboard className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{copiedType === 'tasks' ? t.reports.copied : t.reports.copyToClipboard}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Projects Export */}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              {t.reports.exportProjects}
            </div>
            <DropdownMenuItem onClick={() => handleExportCSV('projects')} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>{t.reports.exportAsCSV}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportJSON('projects')} className="gap-2 cursor-pointer">
              <FileJson className="h-4 w-4 text-amber-600" />
              <span>{t.reports.exportAsJSON}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCopyToClipboard('projects')} className="gap-2 cursor-pointer">
              {copiedType === 'projects' ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Clipboard className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{copiedType === 'projects' ? t.reports.copied : t.reports.copyToClipboard}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Time Tracking Export */}
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              {t.reports.exportTimeTracking}
            </div>
            <DropdownMenuItem onClick={() => handleExportCSV('time')} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>{t.reports.exportAsCSV}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportJSON('time')} className="gap-2 cursor-pointer">
              <FileJson className="h-4 w-4 text-amber-600" />
              <span>{t.reports.exportAsJSON}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCopyToClipboard('time')} className="gap-2 cursor-pointer">
              {copiedType === 'time' ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Clipboard className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{copiedType === 'time' ? t.reports.copied : t.reports.copyToClipboard}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ─── Summary Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const IconComp = stat.icon;
          return (
            <motion.div key={i} variants={item}>
              <motion.div
                initial="rest"
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="relative group"
              >
                <Card className={`relative overflow-hidden border ${stat.borderAccent} shadow-md ${stat.glowColor} hover:shadow-lg transition-shadow duration-300`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-current/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ color: stat.iconColor.includes('emerald') ? '#10b981' : stat.iconColor.includes('amber') ? '#f59e0b' : stat.iconColor.includes('teal') ? '#14b8a6' : '#06b6d4' }} />
                  <CardContent className="relative p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <p className="text-3xl font-extrabold tracking-tight">{stat.value}</p>
                      </div>
                      <div className={`p-3 rounded-2xl ${stat.iconBg} backdrop-blur-sm border border-white/10 shadow-sm`}>
                        <IconComp className={`h-5 w-5 ${stat.iconColor}`} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3">
                      <div className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${stat.trend === 'up' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                        {stat.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {stat.change}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{t.dashboard.vsLastPeriod}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Charts Row 1 ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Task Trend Chart */}
        <motion.div variants={item}>
          <Card className="overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
                    <Activity className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{t.reports.taskTrend}</CardTitle>
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
                      <linearGradient id="reportCompletedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="reportCreatedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" dy={8} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" dx={-4} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--muted)', radius: 4 }} />
                    <Area type="monotone" dataKey="terminees" stroke="#10b981" fill="url(#reportCompletedGrad)" strokeWidth={2.5} name={locale === 'fr' ? 'Terminées' : 'Completed'} />
                    <Area type="monotone" dataKey="creees" stroke="#f59e0b80" fill="url(#reportCreatedGrad)" strokeWidth={2} strokeDasharray="5 5" name={locale === 'fr' ? 'Créées' : 'Created'} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tasks by Status Pie Chart */}
        <motion.div variants={item}>
          <Card className="overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/15">
                    <PieChartIcon className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{t.reports.tasksByStatus}</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {locale === 'fr' ? 'Répartition des tâches par statut' : 'Task distribution by status'}
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
                      data={tasksByStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {tasksByStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
      </div>

      {/* ─── Team Workload ───────────────────────────────────────────────── */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/15">
                  <BarChart3 className="h-4 w-4 text-cyan-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">{t.reports.teamWorkload}</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {locale === 'fr' ? 'Tâches par membre de l\'équipe' : 'Tasks per team member'}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamWorkloadData} layout="vertical" barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" />
                  <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" width={80} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--muted)', radius: 4 }} />
                  <Bar dataKey="taches" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={20} name={locale === 'fr' ? 'Tâches' : 'Tasks'} />
                  <Bar dataKey="terminees" fill="#10b98130" radius={[0, 6, 6, 0]} maxBarSize={20} name={locale === 'fr' ? 'Terminées' : 'Completed'} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Project Health Overview ─────────────────────────────────────── */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/15">
                  <Target className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">{t.reports.projectHealth}</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {locale === 'fr' ? 'Santé et progression des projets' : 'Project health and progress'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 hover:bg-teal-500/5" onClick={() => {}}>
                {locale === 'fr' ? 'Voir tout' : 'View all'} <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockProjects.map((project, idx) => {
                const health = projectHealthColors[project.status] || projectHealthColors.active;
                const statusLabel = (locale === 'fr' ? projectStatusLabels.fr : projectStatusLabels.en)[project.status] || project.status;
                const sprintCount = mockSprints.filter(s => s.projectId === project.id).length;
                const milestoneProgress = (() => {
                  const ms = mockMilestones.filter(m => m.projectId === project.id);
                  if (ms.length === 0) return 0;
                  const completed = ms.filter(m => m.status === 'completed').length;
                  return Math.round((completed / ms.length) * 100);
                })();

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className="group flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-all duration-200 cursor-pointer"
                  >
                    {/* Project Icon */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0 border border-white/10 shadow-sm"
                      style={{ backgroundColor: project.color + '20', color: project.color }}
                    >
                      {project.icon}
                    </div>

                    {/* Progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{project.name}</span>
                        <span className="text-xs font-semibold text-muted-foreground">{project.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted/60 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${project.color}, ${project.color}cc)`,
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress}%` }}
                          transition={{ duration: 1, delay: 0.2 + idx * 0.1, ease: 'easeOut' }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {project.completedTasks}/{project.taskCount}</span>
                      <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {sprintCount} {locale === 'fr' ? 'sprints' : 'sprints'}</span>
                      <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {milestoneProgress}% {locale === 'fr' ? 'jalons' : 'milestones'}</span>
                    </div>

                    {/* Status Badge */}
                    <Badge
                      className={cn('text-[10px] px-2.5 py-0.5 gap-1 font-medium flex-shrink-0 border-0', health.bg, health.text)}
                    >
                      <div className={cn('w-1.5 h-1.5 rounded-full', health.dot)} />
                      {statusLabel}
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

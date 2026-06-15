'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Timer,
  Clock,
  Play,
  Pause,
  DollarSign,
  TrendingUp,
  Calendar,
  Sparkles,
  Search,
  ListChecks,
  BarChart3,
  Zap,
} from 'lucide-react';
import { useAppData } from '@/hooks/use-app-data';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getDayName(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}

function formatTimerDisplay(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ── Animation Variants ────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

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

// ── Timer Widget (display only) ───────────────────────────────────────────────

function TimerWidget() {
  const { t } = useTranslation();
  const { tasks } = useAppData();
  const { timerRunning, timerTaskId, timerElapsed } = useAppStore();
  const taskName = timerTaskId ? tasks.find((t) => t.id === timerTaskId)?.title || null : null;
  const displayTime = formatTimerDisplay(Math.floor(timerElapsed / 1000));

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.65_0.15_160)]" />
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center',
            timerRunning
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-muted/50'
          )}>
            {timerRunning ? (
              <div className="relative">
                <Pause className="h-5 w-5 text-emerald-600" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
            ) : (
              <Play className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">{taskName || t.timeTracking.timer}</p>
            <p className="text-[11px] text-muted-foreground">
              {timerRunning ? t.timeTracking.running : t.timeTracking.startTimer}
            </p>
          </div>
          <div className="text-right">
            <p className={cn(
              'text-2xl font-extrabold tracking-tight font-mono',
              timerRunning ? 'text-emerald-600' : 'text-muted-foreground'
            )}>
              {displayTime}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Time Tracking View ───────────────────────────────────────────────────

export function TimeTrackingView() {
  const { t } = useTranslation();
  const { timeEntries, tasks, projects, users, getUserName, getUserInitials, getProjectName } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const getUserColor = (id: string): string => {
    const colors = [
      'bg-emerald-500/20 text-emerald-700',
      'bg-amber-500/20 text-amber-700',
      'bg-cyan-500/20 text-cyan-700',
      'bg-rose-500/20 text-rose-700',
      'bg-teal-500/20 text-teal-700',
      'bg-orange-500/20 text-orange-700',
      'bg-pink-500/20 text-pink-700',
      'bg-violet-500/20 text-violet-700',
    ];
    const idx = users.findIndex((u) => u.id === id);
    return colors[idx >= 0 ? idx % colors.length : 0];
  };

  const getTaskName = (id: string): string =>
    tasks.find((task) => task.id === id)?.title || 'Unknown Task';

  // Compute stats
  const stats = useMemo(() => {
    const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);
    const thisWeek = timeEntries
      .filter((e) => {
        const d = new Date(e.date);
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return d >= weekStart;
      })
      .reduce((sum, e) => sum + e.hours, 0);
    const billable = timeEntries
      .filter((e) => e.billable)
      .reduce((sum, e) => sum + e.hours, 0);
    const days = new Set(timeEntries.map((e) => e.date)).size;
    const avgDaily = days > 0 ? (totalHours / days).toFixed(1) : '0';
    return { totalHours, thisWeek, billable, avgDaily };
  }, [timeEntries]);

  // Get this week's dates (Mon-Sun)
  const weekDates = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  // Get unique users with entries this week
  const weekUsers = useMemo(() => {
    const userIds = new Set(
      timeEntries
        .filter((e) => weekDates.includes(e.date))
        .map((e) => e.userId)
    );
    return users.filter((u) => userIds.has(u.id));
  }, [weekDates, timeEntries, users]);

  // Build timesheet data
  const timesheet = useMemo(() => {
    const sheet: Record<string, Record<string, number>> = {};
    weekUsers.forEach((user) => {
      sheet[user.id] = {};
      weekDates.forEach((date) => {
        sheet[user.id][date] = timeEntries
          .filter((e) => e.userId === user.id && e.date === date)
          .reduce((sum, e) => sum + e.hours, 0);
      });
    });
    return sheet;
  }, [weekUsers, weekDates]);

  // Filter recent entries
  const recentEntries = useMemo(() => {
    return timeEntries
      .filter((e) => {
        const matchesProject = projectFilter === 'all' || e.projectId === projectFilter;
        const matchesSearch = searchQuery === '' ||
          getTaskName(e.taskId).toLowerCase().includes(searchQuery.toLowerCase()) ||
          getUserName(e.userId).toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesProject && matchesSearch;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [searchQuery, projectFilter]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.timeTracking.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-semibold text-foreground">{stats.totalHours}</span> {t.timeTracking.hours} ·{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.billable}</span> {t.timeTracking.billable.toLowerCase()}
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.48_0.15_160)] hover:from-[oklch(0.48_0.15_160)] hover:to-[oklch(0.42_0.15_160)] text-white shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5" /> {t.timeTracking.newEntry}
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
          icon={<Clock className="h-4 w-4 text-emerald-600" />}
          label={t.timeTracking.totalHours}
          value={`${stats.totalHours}h`}
          gradient="bg-gradient-to-br from-emerald-500/5 via-emerald-500/[0.02] to-transparent"
          iconBg="bg-emerald-500/10 border border-emerald-500/20"
        />
        <StatCard
          icon={<Calendar className="h-4 w-4 text-[oklch(0.55_0.15_160)]" />}
          label={t.timeTracking.thisWeek}
          value={`${stats.thisWeek}h`}
          trend="+12%"
          gradient="bg-gradient-to-br from-[oklch(0.55_0.15_160/0.05)] via-[oklch(0.55_0.15_160/0.02)] to-transparent"
          iconBg="bg-[oklch(0.55_0.15_160/0.1)] border border-[oklch(0.55_0.15_160/0.2)]"
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4 text-amber-600" />}
          label={t.timeTracking.billable}
          value={`${stats.billable}h`}
          gradient="bg-gradient-to-br from-amber-500/5 via-amber-500/[0.02] to-transparent"
          iconBg="bg-amber-500/10 border border-amber-500/20"
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4 text-cyan-600" />}
          label={`${t.timeTracking.thisWeek} avg`}
          value={`${stats.avgDaily}h`}
          gradient="bg-gradient-to-br from-cyan-500/5 via-cyan-500/[0.02] to-transparent"
          iconBg="bg-cyan-500/10 border border-cyan-500/20"
        />
      </motion.div>

      {/* Timer Widget */}
      <TimerWidget />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.timeTracking.search}
            className="pl-9 h-9 bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160)]/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="h-9 w-[180px] text-xs bg-muted/30 border-transparent">
            <SelectValue placeholder={t.timeTracking.project} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.sprints.all} {t.timeTracking.project}s</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.icon} {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Weekly Timesheet */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="px-4 py-3 bg-muted/30 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold">{t.timeTracking.thisWeek}</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b bg-muted/15">
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-40">
                    {t.activity.members}
                  </th>
                  {weekDates.map((date, i) => {
                    const isToday = date === new Date().toISOString().split('T')[0];
                    return (
                      <th
                        key={date}
                        className={cn(
                          'text-center px-2 py-2 text-[10px] font-semibold uppercase tracking-wider min-w-[70px]',
                          isToday ? 'text-[oklch(0.55_0.15_160)] bg-[oklch(0.55_0.15_160/0.05)]' : 'text-muted-foreground'
                        )}
                      >
                        <div>{getDayName(date)}</div>
                        <div className="text-[9px] font-normal">{formatDate(date)}</div>
                      </th>
                    );
                  })}
                  <th className="text-center px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[60px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {weekUsers.map((user) => {
                  const rowTotal = weekDates.reduce((sum, d) => sum + (timesheet[user.id]?.[d] || 0), 0);
                  return (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className={cn('text-[8px] font-semibold', getUserColor(user.id))}>
                              {getUserInitials(user.id)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium truncate">{user.name}</span>
                        </div>
                      </td>
                      {weekDates.map((date) => {
                        const hours = timesheet[user.id]?.[date] || 0;
                        const isToday = date === new Date().toISOString().split('T')[0];
                        return (
                          <td
                            key={date}
                            className={cn(
                              'text-center px-2 py-2',
                              isToday && 'bg-[oklch(0.55_0.15_160/0.03)]'
                            )}
                          >
                            {hours > 0 ? (
                              <span className={cn(
                                'text-xs font-semibold px-1.5 py-0.5 rounded-md',
                                hours >= 8 ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' :
                                hours >= 4 ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' :
                                'bg-muted/50 text-muted-foreground'
                              )}>
                                {hours}h
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/40">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center px-2 py-2">
                        <span className="text-xs font-bold">{rowTotal}h</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Time Entries */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="px-4 py-3 bg-muted/30 border-b">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold">{t.timeTracking.thisWeek}</h3>
            </div>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="divide-y max-h-80 overflow-y-auto"
          >
            {recentEntries.map((entry) => {
              const project = projects.find((p) => p.id === entry.projectId);
              return (
                <motion.div
                  key={entry.id}
                  variants={item}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  {/* User avatar */}
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn('text-[9px] font-semibold', getUserColor(entry.userId))}>
                      {getUserInitials(entry.userId)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{getTaskName(entry.taskId)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {project?.icon} {getProjectName(entry.projectId)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">{getUserName(entry.userId)}</span>
                    </div>
                  </div>

                  {/* Hours + Billable */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold">{entry.hours}h</span>
                    {entry.billable ? (
                      <Badge className="text-[8px] px-1.5 py-0 h-4 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-0 font-semibold">
                        {t.timeTracking.billable}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 font-medium">
                        {t.timeTracking.nonBillable}
                      </Badge>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-[10px] text-muted-foreground font-medium shrink-0 w-16 text-right">
                    {formatDate(entry.date)}
                  </div>
                </motion.div>
              );
            })}
            {recentEntries.length === 0 && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="text-center">
                  <Timer className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">{t.timeTracking.noResults}</p>
                </div>
              </div>
            )}
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}

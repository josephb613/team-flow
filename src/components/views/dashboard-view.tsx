'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  CheckSquare,
  FolderKanban,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  MessageSquare,
  AlertCircle,
  FileText,
  Users,
  Activity,
  Zap,
  BarChart3,
  Timer,
  Video,
  ChevronRight,
  Sparkles,
  Target,
} from 'lucide-react';
import { mockTasks, mockProjects, mockActivities, mockUsers, mockMeetings } from '@/lib/mock-data';
import { useTranslation } from '@/lib/i18n';
import { motion, useSpring, useTransform } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

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

// ─── Circular Progress Ring ──────────────────────────────────────────────────
function CircularProgress({
  value,
  size = 56,
  strokeWidth = 5,
  color,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>
          {value}%
        </span>
      </div>
    </div>
  );
}

// ─── Relative Time ───────────────────────────────────────────────────────────
function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Chart Data ──────────────────────────────────────────────────────────────
const weeklyData = [
  { name: 'Mon', completed: 4, created: 6 },
  { name: 'Tue', completed: 7, created: 5 },
  { name: 'Wed', completed: 3, created: 8 },
  { name: 'Thu', completed: 9, created: 4 },
  { name: 'Fri', completed: 6, created: 7 },
  { name: 'Sat', completed: 2, created: 1 },
  { name: 'Sun', completed: 1, created: 2 },
];

const burndownData = [
  { name: 'Wk 1', ideal: 50, actual: 48 },
  { name: 'Wk 2', ideal: 40, actual: 42 },
  { name: 'Wk 3', ideal: 30, actual: 35 },
  { name: 'Wk 4', ideal: 20, actual: 25 },
  { name: 'Wk 5', ideal: 10, actual: 15 },
  { name: 'Wk 6', ideal: 0, actual: 8 },
];

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
  const { t } = useTranslation();
  const totalTasks = mockTasks.length;
  const completedTasks = mockTasks.filter((task) => task.status === 'done').length;
  const inProgressTasks = mockTasks.filter((task) => task.status === 'in_progress').length;
  const activeProjects = mockProjects.filter((p) => p.status === 'active').length;

  const stats = [
    {
      title: t.dashboard.totalTasks,
      value: totalTasks,
      change: '+12%',
      trend: 'up' as const,
      icon: CheckSquare,
      gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-600',
      borderAccent: 'border-emerald-500/20',
      glowColor: 'shadow-emerald-500/5',
    },
    {
      title: t.dashboard.activeProjects,
      value: activeProjects,
      change: '+2',
      trend: 'up' as const,
      icon: FolderKanban,
      gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-600',
      borderAccent: 'border-amber-500/20',
      glowColor: 'shadow-amber-500/5',
    },
    {
      title: t.dashboard.inProgress,
      value: inProgressTasks,
      change: '-3%',
      trend: 'down' as const,
      icon: Clock,
      gradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
      iconBg: 'bg-cyan-500/15',
      iconColor: 'text-cyan-600',
      borderAccent: 'border-cyan-500/20',
      glowColor: 'shadow-cyan-500/5',
    },
    {
      title: t.dashboard.completionRate,
      value: Math.round((completedTasks / totalTasks) * 100),
      isPercent: true,
      change: '+5%',
      trend: 'up' as const,
      icon: TrendingUp,
      gradient: 'from-rose-500/10 via-rose-500/5 to-transparent',
      iconBg: 'bg-rose-500/15',
      iconColor: 'text-rose-600',
      borderAccent: 'border-rose-500/20',
      glowColor: 'shadow-rose-500/5',
    },
  ];

  const getUserName = useCallback(
    (id: string) => mockUsers.find((u) => u.id === id)?.name || 'Unknown',
    []
  );
  const getUserInitials = useCallback((id: string) => {
    const user = mockUsers.find((u) => u.id === id);
    return user ? user.name.split(' ').map((n) => n[0]).join('') : '??';
  }, []);
  const getUserColor = useCallback((id: string) => {
    const colors = [
      'bg-emerald-500/20 text-emerald-700',
      'bg-amber-500/20 text-amber-700',
      'bg-cyan-500/20 text-cyan-700',
      'bg-rose-500/20 text-rose-700',
      'bg-violet-500/20 text-violet-700',
      'bg-pink-500/20 text-pink-700',
      'bg-teal-500/20 text-teal-700',
      'bg-orange-500/20 text-orange-700',
    ];
    const idx = mockUsers.findIndex((u) => u.id === id);
    return colors[idx % colors.length];
  }, []);

  const priorityColors: Record<string, string> = {
    urgent: 'bg-rose-500/10 text-rose-600 border-rose-200',
    high: 'bg-amber-500/10 text-amber-600 border-amber-200',
    medium: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
    low: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  };

  const activityTypeConfig: Record<string, { icon: React.ElementType; color: string; dotColor: string }> = {
    task_completed: { icon: CheckSquare, color: 'text-emerald-500', dotColor: 'bg-emerald-500' },
    comment_added: { icon: MessageSquare, color: 'text-cyan-500', dotColor: 'bg-cyan-500' },
    task_created: { icon: Zap, color: 'text-amber-500', dotColor: 'bg-amber-500' },
    file_uploaded: { icon: FileText, color: 'text-violet-500', dotColor: 'bg-violet-500' },
    project_updated: { icon: FolderKanban, color: 'text-rose-500', dotColor: 'bg-rose-500' },
    meeting_scheduled: { icon: CalendarDays, color: 'text-pink-500', dotColor: 'bg-pink-500' },
    member_joined: { icon: Users, color: 'text-emerald-500', dotColor: 'bg-emerald-500' },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* ─── Stats Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => {
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
                  <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-current/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ color: stat.iconColor.includes('emerald') ? '#10b981' : stat.iconColor.includes('amber') ? '#f59e0b' : stat.iconColor.includes('cyan') ? '#06b6d4' : '#ef4444' }} />

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
                              <AnimatedCounter value={stat.value} />
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

      {/* ─── Charts Section ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div variants={item}>
          <Card className="overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
                    <BarChart3 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{t.dashboard.weeklyActivity}</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Tasks completed vs created</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 hover:bg-emerald-500/5">
                  {t.dashboard.viewDetails}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      stroke="var(--muted-foreground)"
                      dy={8}
                    />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" dx={-4} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                        padding: '10px 14px',
                      }}
                      cursor={{ fill: 'var(--muted)', radius: 4 }}
                    />
                    <Bar dataKey="completed" fill="oklch(0.55 0.15 160)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="created" fill="oklch(0.65 0.15 80 / 0.5)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/15">
                    <Timer className="h-4 w-4 text-cyan-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{t.dashboard.sprintBurndown}</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Ideal vs actual progress</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 hover:bg-cyan-500/5">
                  {t.dashboard.viewDetails}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={burndownData}>
                    <defs>
                      <linearGradient id="burndownGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.55 0.15 160)" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="oklch(0.55 0.15 160)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      stroke="var(--muted-foreground)"
                      dy={8}
                    />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" dx={-4} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                        padding: '10px 14px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="ideal"
                      stroke="oklch(0.55 0.15 160 / 0.4)"
                      fill="none"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke="oklch(0.55 0.15 160)"
                      fill="url(#burndownGradient)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Bottom Row: Active Tasks + Activity + Upcoming ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Active Tasks */}
        <motion.div variants={item}>
          <Card className="h-full overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/15">
                    <Target className="h-4 w-4 text-amber-600" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{t.dashboard.activeTasks}</CardTitle>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/15 px-2.5 py-0.5"
                >
                  {inProgressTasks} {t.dashboard.inProgressLabel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[340px] overflow-y-auto px-4 pb-4">
              {mockTasks
                .filter((task) => task.status === 'in_progress')
                .map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className="group flex items-start gap-3 p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/30 transition-all duration-200 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8 mt-0.5 ring-2 ring-background shadow-sm">
                      <AvatarFallback className={`text-[9px] font-semibold ${getUserColor(task.assigneeId)}`}>
                        {getUserInitials(task.assigneeId)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0 font-semibold ${priorityColors[task.priority]}`}
                        >
                          {task.priority}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{getUserName(task.assigneeId)}</span>
                      </div>
                      {/* Subtask Progress */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-emerald-500"
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(task.subtasks.filter((s) => s.completed).length / task.subtasks.length) * 100}%`,
                              }}
                              transition={{ duration: 0.8, delay: 0.2 + idx * 0.1 }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors mt-1" />
                  </motion.div>
                ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity - Timeline Style */}
        <motion.div variants={item}>
          <Card className="h-full overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
                  <Activity className="h-4 w-4 text-emerald-600" />
                </div>
                <CardTitle className="text-sm font-semibold">{t.dashboard.recentActivity}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="max-h-[340px] overflow-y-auto px-4 pb-4">
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-border via-border/50 to-transparent" />

                <div className="space-y-1">
                  {mockActivities.slice(0, 7).map((activity, idx) => {
                    const config = activityTypeConfig[activity.type] || {
                      icon: Activity,
                      color: 'text-muted-foreground',
                      dotColor: 'bg-muted-foreground',
                    };
                    const IconComp = config.icon;

                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                        className="group flex items-start gap-3 py-2 cursor-pointer"
                      >
                        {/* Timeline Dot */}
                        <div className="relative z-10 mt-1 flex-shrink-0">
                          <div
                            className={`w-[7px] h-[7px] rounded-full ${config.dotColor} ring-4 ring-background group-hover:scale-125 transition-transform duration-200`}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 -mt-0.5">
                          <div className="flex items-center gap-2">
                            <IconComp className={`h-3 w-3 ${config.color} flex-shrink-0`} />
                            <p className="text-xs leading-relaxed">
                              <span className="font-semibold">{getUserName(activity.userId)}</span>{' '}
                              <span className="text-muted-foreground">{activity.description}</span>
                            </p>
                          </div>
                          <p className="text-[10px] text-muted-foreground/70 mt-1 ml-5">
                            {getRelativeTime(activity.timestamp)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Meetings & Deadlines */}
        <motion.div variants={item}>
          <Card className="h-full overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/15">
                    <CalendarDays className="h-4 w-4 text-rose-600" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{t.dashboard.upcoming}</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 hover:bg-rose-500/5">
                  {t.dashboard.seeAll}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[340px] overflow-y-auto px-4 pb-4">
              {mockMeetings
                .filter((m) => m.status === 'scheduled')
                .slice(0, 4)
                .map((meeting, idx) => {
                  const meetingDate = new Date(meeting.date);
                  const isToday =
                    meetingDate.toDateString() === new Date().toDateString();
                  const isTomorrow =
                    meetingDate.toDateString() ===
                    new Date(Date.now() + 86400000).toDateString();

                  return (
                    <motion.div
                      key={meeting.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.06 }}
                      className="group p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/30 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        {/* Time Block */}
                        <div className="flex flex-col items-center justify-center min-w-[44px] p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                          <span className="text-[10px] font-bold text-primary uppercase">
                            {meetingDate.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)}
                          </span>
                          <span className="text-sm font-extrabold text-primary leading-tight">
                            {meetingDate.getDate()}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                              {meeting.title}
                            </p>
                            <Video className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-muted-foreground">
                              {meetingDate.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[11px] text-muted-foreground">
                              {meeting.duration}min
                            </span>
                            {isToday && (
                              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/15 text-emerald-700 border-emerald-500/15 font-semibold hover:bg-emerald-500/20">
                                Today
                              </Badge>
                            )}
                            {isTomorrow && (
                              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-700 border-amber-500/15 font-semibold hover:bg-amber-500/20">
                                Tomorrow
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            {meeting.attendees.slice(0, 3).map((id) => (
                              <Avatar key={id} className="h-5 w-5 ring-2 ring-background">
                                <AvatarFallback className={`text-[7px] font-semibold ${getUserColor(id)}`}>
                                  {getUserInitials(id)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {meeting.attendees.length > 3 && (
                              <span className="text-[10px] text-muted-foreground font-medium ml-0.5">
                                +{meeting.attendees.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

              {/* Upcoming Deadlines */}
              <div className="pt-2 mt-1 border-t border-dashed">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="p-1 rounded-md bg-amber-500/10">
                    <AlertCircle className="h-3 w-3 text-amber-600" />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t.dashboard.upcomingDeadlines}
                  </p>
                </div>
                {mockTasks
                  .filter((task) => task.status !== 'done' && task.dueDate)
                  .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                  .slice(0, 3)
                  .map((task, idx) => {
                    const dueDate = new Date(task.dueDate!);
                    const isOverdue = dueDate < new Date();
                    const isDueSoon =
                      !isOverdue &&
                      dueDate.getTime() - Date.now() < 3 * 86400000;

                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.05 }}
                        className="flex items-center gap-2.5 py-1.5 group cursor-pointer"
                      >
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isOverdue
                              ? 'bg-rose-500 shadow-sm shadow-rose-500/30'
                              : isDueSoon
                              ? 'bg-amber-500 shadow-sm shadow-amber-500/30'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <span className="text-xs truncate flex-1 group-hover:text-primary transition-colors">
                          {task.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 h-4 font-semibold ${
                            isOverdue
                              ? 'bg-rose-500/10 text-rose-600 border-rose-200'
                              : isDueSoon
                              ? 'bg-amber-500/10 text-amber-600 border-amber-200'
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                          }`}
                        >
                          {dueDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Badge>
                      </motion.div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Project Progress ───────────────────────────────────────────── */}
      <motion.div variants={item}>
        <Card className="overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/15">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">{t.dashboard.projectProgress}</CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {mockProjects.filter((p) => p.status !== 'completed').length} active projects
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 hover:bg-primary/5">
                {t.dashboard.viewAllProjects}
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockProjects
                .filter((p) => p.status !== 'completed')
                .map((project, idx) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.07 }}
                    className="group p-4 rounded-2xl border border-border/60 hover:border-border bg-gradient-to-br from-card to-muted/20 hover:shadow-md transition-all duration-300 cursor-pointer relative overflow-hidden"
                  >
                    {/* Subtle background glow on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                      style={{
                        background: `radial-gradient(circle at 20% 80%, ${project.color}08, transparent 50%)`,
                      }}
                    />

                    <div className="relative flex items-center gap-3 mb-4">
                      <CircularProgress value={project.progress} color={project.color} size={48} strokeWidth={4} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{project.icon}</span>
                          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                            {project.name}
                          </p>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {project.completedTasks}/{project.taskCount} {t.dashboard.tasks}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-2 rounded-full bg-muted/60 overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${project.color}, ${project.color}cc)`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${project.progress}%` }}
                        transition={{ duration: 1, delay: 0.2 + idx * 0.1, ease: 'easeOut' }}
                      />
                      {/* Shimmer effect */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          width: `${project.progress}%`,
                          background: `linear-gradient(90deg, transparent, ${project.color}40, transparent)`,
                          animation: 'shimmer 2s infinite',
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex -space-x-1.5">
                        {project.members.slice(0, 3).map((id) => (
                          <Avatar key={id} className="h-5 w-5 ring-2 ring-background">
                            <AvatarFallback className={`text-[7px] font-semibold ${getUserColor(id)}`}>
                              {getUserInitials(id)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {project.members.length > 3 && (
                          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center ring-2 ring-background text-[8px] font-semibold text-muted-foreground">
                            +{project.members.length - 3}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-2 py-0 h-4 font-semibold"
                        style={{
                          backgroundColor: project.color + '10',
                          color: project.color,
                          borderColor: project.color + '30',
                        }}
                      >
                        {project.progress}%
                      </Badge>
                    </div>
                  </motion.div>
                ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

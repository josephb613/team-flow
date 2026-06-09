'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  CheckSquare,
  MessageSquare,
  Zap,
  Flag,
  UserPlus,
  Plus,
  Activity,
  Filter,
} from 'lucide-react';
import { mockUsers, mockProjects, getProjectName } from '@/lib/mock-data';
import { useTranslation } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── PM Activity Types ────────────────────────────────────────────────────────

type PMActivityType = 'task_completed' | 'task_created' | 'sprint_started' | 'comment_added' | 'milestone_reached' | 'member_joined';

interface PMActivity {
  id: string;
  type: PMActivityType;
  userId: string;
  description: string;
  timestamp: string;
  projectId?: string;
  reference?: string;
}

// ─── Inline Mock Data ─────────────────────────────────────────────────────────

const mockPMActivities: PMActivity[] = [
  { id: 'pm-1', type: 'task_completed', userId: 'u-3', description: 'completed task "Refonte UI Dashboard"', timestamp: new Date(Date.now() - 15 * 60000).toISOString(), projectId: 'p-1', reference: 'task-1' },
  { id: 'pm-2', type: 'comment_added', userId: 'u-2', description: 'commented on "API endpoints Sprint 4"', timestamp: new Date(Date.now() - 45 * 60000).toISOString(), projectId: 'p-1', reference: 'task-2' },
  { id: 'pm-3', type: 'task_created', userId: 'u-1', description: 'created task "Rapports automatisés"', timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), projectId: 'p-5', reference: 'task-8' },
  { id: 'pm-4', type: 'sprint_started', userId: 'u-1', description: 'started "Sprint 4 - UI & API"', timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), projectId: 'p-1', reference: 'sp-1' },
  { id: 'pm-5', type: 'milestone_reached', userId: 'u-1', description: 'milestone "Alpha Release" is in progress', timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), projectId: 'p-1', reference: 'ms-1' },
  { id: 'pm-6', type: 'member_joined', userId: 'u-7', description: 'joined the team for "Refonte Platform"', timestamp: new Date(Date.now() - 6 * 3600000).toISOString(), projectId: 'p-1' },
  { id: 'pm-7', type: 'task_completed', userId: 'u-2', description: 'completed task "API endpoints Sprint 4"', timestamp: new Date(Date.now() - 8 * 3600000).toISOString(), projectId: 'p-1', reference: 'task-2' },
  { id: 'pm-8', type: 'comment_added', userId: 'u-3', description: 'commented on "Module hors-ligne iOS"', timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), projectId: 'p-2', reference: 'task-3' },
  { id: 'pm-9', type: 'task_created', userId: 'u-4', description: 'created task "Migration base de données"', timestamp: new Date(Date.now() - 26 * 3600000).toISOString(), projectId: 'p-3', reference: 'task-4' },
  { id: 'pm-10', type: 'sprint_started', userId: 'u-4', description: 'started "Sprint 2 - Cloud Migration"', timestamp: new Date(Date.now() - 28 * 3600000).toISOString(), projectId: 'p-3', reference: 'sp-3' },
  { id: 'pm-11', type: 'milestone_reached', userId: 'u-1', description: 'milestone "RGPD Compliance" completed', timestamp: new Date(Date.now() - 30 * 3600000).toISOString(), projectId: 'p-6', reference: 'ms-5' },
  { id: 'pm-12', type: 'task_completed', userId: 'u-5', description: 'completed task "Configuration AWS IAM"', timestamp: new Date(Date.now() - 32 * 3600000).toISOString(), projectId: 'p-3', reference: 'task-9' },
  { id: 'pm-13', type: 'member_joined', userId: 'u-6', description: 'joined the project "Module Paiement"', timestamp: new Date(Date.now() - 48 * 3600000).toISOString(), projectId: 'p-4' },
  { id: 'pm-14', type: 'comment_added', userId: 'u-1', description: 'commented on "Intégration Stripe"', timestamp: new Date(Date.now() - 52 * 3600000).toISOString(), projectId: 'p-4', reference: 'task-5' },
  { id: 'pm-15', type: 'task_created', userId: 'u-2', description: 'created task "Authentification SSO"', timestamp: new Date(Date.now() - 72 * 3600000).toISOString(), projectId: 'p-5', reference: 'task-7' },
  { id: 'pm-16', type: 'sprint_started', userId: 'u-2', description: 'started "Sprint 3 - Mobile Offline"', timestamp: new Date(Date.now() - 96 * 3600000).toISOString(), projectId: 'p-2', reference: 'sp-2' },
  { id: 'pm-17', type: 'milestone_reached', userId: 'u-4', description: 'milestone "Cloud Go-Live" is in progress', timestamp: new Date(Date.now() - 100 * 3600000).toISOString(), projectId: 'p-3', reference: 'ms-3' },
  { id: 'pm-18', type: 'task_completed', userId: 'u-1', description: 'completed task "Audit sécurité OWASP"', timestamp: new Date(Date.now() - 120 * 3600000).toISOString(), projectId: 'p-6', reference: 'task-14' },
];

// ─── Activity Type Config ─────────────────────────────────────────────────────

const pmActivityConfig: Record<PMActivityType, {
  icon: React.ElementType;
  color: string;
  bg: string;
  dotColor: string;
  borderColor: string;
  label: string;
}> = {
  task_completed: {
    icon: CheckSquare,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/15',
    dotColor: 'bg-emerald-500',
    borderColor: 'border-emerald-500/20',
    label: 'Task Completed',
  },
  task_created: {
    icon: Plus,
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-500/15',
    dotColor: 'bg-cyan-500',
    borderColor: 'border-cyan-500/20',
    label: 'Task Created',
  },
  sprint_started: {
    icon: Zap,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/15',
    dotColor: 'bg-amber-500',
    borderColor: 'border-amber-500/20',
    label: 'Sprint Started',
  },
  comment_added: {
    icon: MessageSquare,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-500/15',
    dotColor: 'bg-teal-500',
    borderColor: 'border-teal-500/20',
    label: 'Comment Added',
  },
  milestone_reached: {
    icon: Flag,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/15',
    dotColor: 'bg-rose-500',
    borderColor: 'border-rose-500/20',
    label: 'Milestone Reached',
  },
  member_joined: {
    icon: UserPlus,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/15',
    dotColor: 'bg-violet-500',
    borderColor: 'border-violet-500/20',
    label: 'Member Joined',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserName(id: string) {
  return mockUsers.find((u) => u.id === id)?.name || 'Unknown';
}

function getUserInitials(id: string) {
  const user = mockUsers.find((u) => u.id === id);
  return user ? user.name.split(' ').map((n) => n[0]).join('') : '??';
}

function getUserColor(id: string): string {
  const colors = [
    'bg-emerald-500/20 text-emerald-700',
    'bg-amber-500/20 text-amber-700',
    'bg-cyan-500/20 text-cyan-700',
    'bg-rose-500/20 text-rose-700',
    'bg-teal-500/20 text-teal-700',
    'bg-orange-500/20 text-orange-700',
    'bg-violet-500/20 text-violet-700',
    'bg-pink-500/20 text-pink-700',
  ];
  const idx = mockUsers.findIndex((u) => u.id === id);
  return colors[idx % colors.length];
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Filter Config ────────────────────────────────────────────────────────────

const filterOptions: { value: string; types: PMActivityType[]; icon: React.ElementType }[] = [
  { value: 'all', types: ['task_completed', 'task_created', 'sprint_started', 'comment_added', 'milestone_reached', 'member_joined'], icon: Activity },
  { value: 'tasks', types: ['task_completed', 'task_created'], icon: CheckSquare },
  { value: 'sprints', types: ['sprint_started'], icon: Zap },
  { value: 'comments', types: ['comment_added'], icon: MessageSquare },
  { value: 'milestones', types: ['milestone_reached'], icon: Flag },
  { value: 'members', types: ['member_joined'], icon: UserPlus },
];

// ─── Animation Variants ──────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const dateHeader = {
  hidden: { opacity: 0, y: -8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Main Activity View ──────────────────────────────────────────────────────

export function ActivityView() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');

  // Filter activities
  const filtered = useMemo(() => {
    const filterObj = filterOptions.find((f) => f.value === filter);
    if (!filterObj) return mockPMActivities;
    return mockPMActivities.filter((a) => filterObj.types.includes(a.type));
  }, [filter]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, PMActivity[]> = {};
    filtered.forEach((a) => {
      const dateKey = new Date(a.timestamp).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(a);
    });
    // Sort groups by date (most recent first)
    const sortedKeys = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const sorted: [string, PMActivity[]][] = sortedKeys.map((k) => [k, groups[k]]);
    return sorted;
  }, [filtered]);

  const filterCount = (value: string) => {
    const filterObj = filterOptions.find((f) => f.value === value);
    if (!filterObj) return mockPMActivities.length;
    return mockPMActivities.filter((a) => filterObj.types.includes(a.type)).length;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.activity.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {mockPMActivities.length} activities · Real-time feed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-dashed hover:border-solid hover:bg-muted/50"
          >
            <Filter className="h-3.5 w-3.5" /> {t.common.filter}
          </Button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterOptions.map((opt) => {
          const Icon = opt.icon;
          const isActive = filter === opt.value;
          return (
            <motion.button
              key={opt.value}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setFilter(opt.value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border',
                isActive
                  ? 'bg-[oklch(0.55_0.15_160)] text-white border-[oklch(0.55_0.15_160)] shadow-sm shadow-[oklch(0.55_0.15_160/0.2)]'
                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-3 w-3" />
              {opt.value === 'all' ? t.activity.all :
               opt.value === 'tasks' ? t.activity.tasks :
               opt.value === 'comments' ? t.activity.comments :
               opt.value === 'sprints' ? t.nav.sprints :
               opt.value === 'milestones' ? t.nav.milestones :
               t.activity.members}
              <span
                className={cn(
                  'ml-0.5 text-[10px] font-semibold px-1.5 py-0 rounded-full',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {filterCount(opt.value)}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Activity Timeline */}
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        <AnimatePresence mode="wait">
          {grouped.map(([dateKey, activities]) => (
            <motion.div key={dateKey} initial="hidden" animate="show" className="space-y-1">
              {/* Date Header */}
              <motion.div variants={dateHeader} className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[oklch(0.55_0.15_160)] shadow-sm shadow-[oklch(0.55_0.15_160/0.3)]" />
                  <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">
                    {getDateLabel(activities[0].timestamp)}
                  </h3>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
                <span className="text-[10px] text-muted-foreground font-medium">
                  {activities.length} activities
                </span>
              </motion.div>

              {/* Timeline Items */}
              <div className="relative ml-1">
                {/* Vertical Line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-border via-border/40 to-transparent" />

                <div className="space-y-0.5">
                  {activities.map((activity) => {
                    const config = pmActivityConfig[activity.type];
                    const IconComp = config.icon;

                    return (
                      <motion.div
                        key={activity.id}
                        variants={item}
                        className="group relative flex items-start gap-3 p-3 rounded-xl hover:bg-muted/30 transition-all duration-200 cursor-pointer"
                      >
                        {/* Timeline Dot */}
                        <div className="relative z-10 flex-shrink-0 mt-1">
                          <div
                            className={cn(
                              'w-[7px] h-[7px] rounded-full ring-[3px] ring-background transition-all duration-200',
                              config.dotColor,
                              'group-hover:scale-150 group-hover:ring-2'
                            )}
                          />
                        </div>

                        {/* Activity Icon */}
                        <div
                          className={cn(
                            'flex-shrink-0 p-2 rounded-xl border transition-all duration-200 group-hover:scale-105 group-hover:shadow-sm',
                            config.bg,
                            config.borderColor
                          )}
                        >
                          <IconComp className={cn('h-4 w-4', config.color)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5 ring-1 ring-background shadow-sm">
                              <AvatarFallback className={cn('text-[7px] font-semibold', getUserColor(activity.userId))}>
                                {getUserInitials(activity.userId)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-sm leading-relaxed">
                              <span className="font-semibold">{getUserName(activity.userId)}</span>{' '}
                              <span className="text-muted-foreground">{activity.description}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 ml-7">
                            <span className="text-[11px] text-muted-foreground/70 font-medium">
                              {getRelativeTime(activity.timestamp)}
                            </span>
                            {activity.projectId && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 h-4 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 border-muted/50"
                              >
                                {getProjectName(activity.projectId)}
                              </Badge>
                            )}
                            <Badge
                              className={cn(
                                'text-[8px] px-1.5 py-0 h-4 font-semibold border-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                                config.bg,
                                config.color
                              )}
                            >
                              {config.label}
                            </Badge>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {grouped.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t.activity.noResults}</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Zap,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Play,
  Clock,
  ArrowRight,
  Sparkles,
  Activity,
  Timer,
  CheckCircle2,
  XCircle,
  FileText,
  Bell,
  Send,
  Tag,
  UserPlus,
  CalendarClock,
  MessageSquare,
  Mail,
  LayoutList,
  ArrowRightLeft,
  Repeat,
} from 'lucide-react';
import { useAppData } from '@/hooks/use-app-data';
import { useTranslation } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Animation ───────────────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ─── Automation Templates ────────────────────────────────────────────────────
const automationTemplates = [
  {
    id: 'tpl-1',
    nameKey: 'autoAssignByPriority' as const,
    descKey: 'autoAssignByPriorityDesc' as const,
    icon: ArrowRightLeft,
    trigger: 'autoAssignByPriority' as const,
    action: 'actionAssignMember' as const,
    color: 'text-blue-600',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    id: 'tpl-2',
    nameKey: 'sendDeadlineReminders' as const,
    descKey: 'sendDeadlineRemindersDesc' as const,
    icon: Bell,
    trigger: 'triggerDeadlineApproaching' as const,
    action: 'actionSendNotification' as const,
    color: 'text-amber-600',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    id: 'tpl-3',
    nameKey: 'moveCompletedToDone' as const,
    descKey: 'moveCompletedToDoneDesc' as const,
    icon: CheckCircle2,
    trigger: 'triggerStatusChanged' as const,
    action: 'actionMoveTask' as const,
    color: 'text-blue-600',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    id: 'tpl-4',
    nameKey: 'notifyOnStatusChange' as const,
    descKey: 'notifyOnStatusChangeDesc' as const,
    icon: Send,
    trigger: 'triggerStatusChanged' as const,
    action: 'actionSendNotification' as const,
    color: 'text-cyan-600',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  {
    id: 'tpl-5',
    nameKey: 'weeklyProgressReport' as const,
    descKey: 'weeklyProgressReportDesc' as const,
    icon: FileText,
    trigger: 'triggerDeadlineApproaching' as const,
    action: 'actionSendEmail' as const,
    color: 'text-rose-600',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  {
    id: 'tpl-6',
    nameKey: 'autoCreateRecurringTasks' as const,
    descKey: 'autoCreateRecurringTasksDesc' as const,
    icon: Repeat,
    trigger: 'triggerTaskCreated' as const,
    action: 'actionAddTag' as const,
    color: 'text-orange-600',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
];

// ─── Create Automation Dialog ────────────────────────────────────────────────
function CreateAutomationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [trigger, setTrigger] = useState('');
  const [action, setAction] = useState('');
  const [condition, setCondition] = useState('');

  const triggerOptions = [
    { value: 'triggerTaskCreated', icon: Plus, label: t.automations.triggerTaskCreated },
    { value: 'triggerStatusChanged', icon: ArrowRightLeft, label: t.automations.triggerStatusChanged },
    { value: 'triggerDeadlineApproaching', icon: CalendarClock, label: t.automations.triggerDeadlineApproaching },
    { value: 'triggerCommentAdded', icon: MessageSquare, label: t.automations.triggerCommentAdded },
  ];

  const actionOptions = [
    { value: 'actionSendNotification', icon: Bell, label: t.automations.actionSendNotification },
    { value: 'actionMoveTask', icon: ArrowRight, label: t.automations.actionMoveTask },
    { value: 'actionAssignMember', icon: UserPlus, label: t.automations.actionAssignMember },
    { value: 'actionAddTag', icon: Tag, label: t.automations.actionAddTag },
    { value: 'actionSendEmail', icon: Mail, label: t.automations.actionSendEmail },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[oklch(0.55_0.18_250)]/10 border border-[oklch(0.55_0.18_250)]/20">
              <Zap className="h-4 w-4 text-[oklch(0.55_0.18_250)]" />
            </div>
            {t.automations.createNewAutomation}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Trigger */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Play className="h-3 w-3" /> {t.automations.trigger}
            </label>
            <Select value={trigger} onValueChange={setTrigger}>
              <SelectTrigger className="h-9 text-xs bg-muted/30 border-transparent focus:border-[oklch(0.55_0.18_250/0.3)]">
                <SelectValue placeholder={t.automations.selectTrigger} />
              </SelectTrigger>
              <SelectContent>
                {triggerOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <opt.icon className="h-3.5 w-3.5" /> {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground/40" />
          </div>

          {/* Action */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3 w-3" /> {t.automations.action}
            </label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="h-9 text-xs bg-muted/30 border-transparent focus:border-[oklch(0.55_0.18_250/0.3)]">
                <SelectValue placeholder={t.automations.selectAction} />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <opt.icon className="h-3.5 w-3.5" /> {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <LayoutList className="h-3 w-3" /> {t.automations.condition}
            </label>
            <Input
              placeholder={t.automations.addCondition}
              className="h-9 text-xs bg-muted/30 border-transparent focus:border-[oklch(0.55_0.18_250/0.3)]"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>{t.common.cancel}</Button>
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.50_0.18_250)] text-white shadow-sm"
            disabled={!trigger || !action}
          >
            <Sparkles className="h-3.5 w-3.5" /> {t.common.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function AutomationsView() {
  const { t } = useTranslation();
  const { automations: appAutomations } = useAppData();
  const [automations, setAutomations] = useState(appAutomations);
  useEffect(() => {
    setAutomations(appAutomations);
  }, [appAutomations]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const toggleAutomation = useCallback((id: string) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  }, []);

  const enabledCount = automations.filter((a) => a.enabled).length;
  const totalRuns = automations.reduce((acc, a) => acc + a.runCount, 0);
  const runsThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return automations
      .filter((a) => a.lastRun && new Date(a.lastRun).getTime() >= weekAgo)
      .reduce((acc, a) => acc + a.runCount, 0);
  }, [automations]);
  const timeSaved = 0;

  const statCards = [
    {
      title: t.automations.totalAutomations,
      value: automations.length,
      icon: Zap,
      gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
      iconBg: 'bg-blue-500/15 border-blue-500/15',
      iconColor: 'text-blue-600',
      borderAccent: 'border-blue-500/20',
    },
    {
      title: t.automations.active,
      value: enabledCount,
      icon: Play,
      gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
      iconBg: 'bg-blue-500/15 border-blue-500/15',
      iconColor: 'text-blue-600',
      borderAccent: 'border-blue-500/20',
    },
    {
      title: t.automations.runsThisWeek,
      value: runsThisWeek,
      icon: Activity,
      gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
      iconBg: 'bg-amber-500/15 border-amber-500/15',
      iconColor: 'text-amber-600',
      borderAccent: 'border-amber-500/20',
    },
    {
      title: t.automations.timeSaved,
      value: `${timeSaved}${t.automations.hours}`,
      icon: Timer,
      gradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
      iconBg: 'bg-cyan-500/15 border-cyan-500/15',
      iconColor: 'text-cyan-600',
      borderAccent: 'border-cyan-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.automations.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {automations.length} {t.automations.title.toLowerCase()} · {enabledCount} {t.automations.active.toLowerCase()}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.50_0.18_250)] hover:from-[oklch(0.50_0.15_160)] hover:to-[oklch(0.45_0.18_250)] shadow-sm shadow-[oklch(0.55_0.18_250/0.2)] text-white"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" /> {t.automations.createAutomation}
        </Button>
      </div>

      {/* ─── Stats Header Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((stat, i) => {
          const IconComp = stat.icon;
          return (
            <motion.div key={i} variants={item}>
              <Card className={`relative overflow-hidden border ${stat.borderAccent} shadow-sm hover:shadow-md transition-shadow duration-300 group`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-500`} />
                <CardContent className="relative p-3 flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${stat.iconBg}`}>
                    <IconComp className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-lg font-extrabold tracking-tight">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Automation Cards ────────────────────────────────────────────── */}
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Zap className="h-4 w-4 text-[oklch(0.55_0.18_250)]" />
          {t.automations.title}
        </h3>
        <AnimatePresence mode="popLayout">
          {automations.map((automation, idx) => (
            <motion.div
              key={automation.id}
              variants={item}
              layout
              className="relative"
            >
              <Card
                className={cn(
                  'overflow-hidden transition-all duration-300 hover:shadow-md border-border/60',
                  !automation.enabled && 'opacity-70'
                )}
              >
                {/* Colored left border */}
                <div
                  className={cn(
                    'absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300',
                    automation.enabled
                      ? 'bg-gradient-to-b from-[oklch(0.55_0.18_250)] to-[oklch(0.55_0.18_250)/0.5]'
                      : 'bg-slate-300'
                  )}
                />

                <CardContent className="p-5 pl-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Automation Icon */}
                      <div
                        className={cn(
                          'p-2.5 rounded-xl flex-shrink-0 border transition-colors duration-300',
                          automation.enabled
                            ? 'bg-[oklch(0.55_0.18_250/0.1)] border-[oklch(0.55_0.18_250/0.15)]'
                            : 'bg-muted border-border'
                        )}
                      >
                        <Zap
                          className={cn(
                            'h-5 w-5 transition-colors duration-300',
                            automation.enabled ? 'text-[oklch(0.55_0.18_250)]' : 'text-muted-foreground'
                          )}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Name + Status Badge */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="text-sm font-semibold">{automation.name}</h3>
                          <Badge
                            className={cn(
                              'text-[10px] px-2 py-0 h-4 font-semibold border-0 gap-1',
                              automation.enabled
                                ? 'bg-blue-500/10 text-blue-700'
                                : 'bg-slate-500/10 text-slate-500'
                            )}
                          >
                            <div className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              automation.enabled ? 'bg-blue-500' : 'bg-slate-400'
                            )} />
                            {automation.enabled ? t.automations.activeLabel : t.automations.disabled}
                          </Badge>
                        </div>

                        {/* Trigger → Action Flow */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/15 text-amber-700 text-xs font-medium">
                            <Play className="h-3 w-3" />
                            {automation.trigger}
                          </div>
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3 + idx * 0.05 }}
                          >
                            <ArrowRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                          </motion.div>
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/15 text-cyan-700 text-xs font-medium">
                            <Zap className="h-3 w-3" />
                            {automation.action}
                          </div>
                        </div>

                        {/* Meta info */}
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                            <Activity className="h-3 w-3" />
                            {t.automations.ran} {automation.runCount} {t.automations.times}
                          </span>
                          {automation.lastRun && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                              <Clock className="h-3 w-3" />
                              {t.automations.last}: {new Date(automation.lastRun).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={automation.enabled}
                        onCheckedChange={() => toggleAutomation(automation.id)}
                        className={cn(
                          automation.enabled
                            ? 'data-[state=checked]:bg-[oklch(0.55_0.18_250)]'
                            : ''
                        )}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem className="gap-2">
                            <Pencil className="h-4 w-4" /> {t.automations.edit}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Copy className="h-4 w-4" /> {t.automations.duplicate}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Play className="h-4 w-4" /> {t.automations.runNow}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive gap-2">
                            <Trash2 className="h-4 w-4" /> {t.automations.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* ─── Browse Templates ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[oklch(0.55_0.18_250)]" />
          {t.automations.browseTemplates}
        </h3>
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {automationTemplates.map((tpl) => {
            const IconComp = tpl.icon;
            return (
              <motion.div key={tpl.id} variants={item}>
                <Card className="group hover:shadow-md transition-all duration-300 border-border/60 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn('p-2 rounded-xl border shrink-0', tpl.bg, tpl.border)}>
                        <IconComp className={cn('h-4 w-4', tpl.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold">{t.automations[tpl.nameKey]}</h4>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{t.automations[tpl.descKey]}</p>
                      </div>
                    </div>

                    {/* Trigger → Action preview */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/5 border border-amber-500/10 text-[9px] font-medium text-amber-700">
                        <Play className="h-2.5 w-2.5" />
                        {t.automations[tpl.trigger]}
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/5 border border-cyan-500/10 text-[9px] font-medium text-cyan-700">
                        <Zap className="h-2.5 w-2.5" />
                        {t.automations[tpl.action]}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-[10px] gap-1.5 hover:border-[oklch(0.55_0.18_250/0.3)] hover:text-[oklch(0.55_0.18_250)]"
                    >
                      <Sparkles className="h-3 w-3" /> {t.automations.useTemplate}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* ─── Execution History ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-[oklch(0.55_0.18_250)]" />
          {t.automations.executionHistory}
        </h3>
        <Card className="border-border/60 overflow-hidden">
          <div className="divide-y">
            {appAutomations.filter((a) => a.lastRun).length === 0 ? (
              <p className="px-4 py-6 text-xs text-muted-foreground text-center">{t.pmp.noData}</p>
            ) : (
              appAutomations
                .filter((a) => a.lastRun)
                .slice(0, 8)
                .map((automation, i) => (
              <motion.div
                key={automation.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <div className="p-1 rounded-md shrink-0 bg-blue-500/10">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{automation.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {automation.lastRun
                      ? new Date(automation.lastRun).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className="text-[9px] px-2 py-0 h-4 font-semibold border-0 gap-1 shrink-0 bg-blue-500/10 text-blue-700"
                >
                  {t.automations.success}
                </Badge>
              </motion.div>
            ))
            )}
          </div>
        </Card>
      </div>

      {/* ─── Create Automation Dialog ────────────────────────────────────── */}
      <CreateAutomationDialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />
    </div>
  );
}

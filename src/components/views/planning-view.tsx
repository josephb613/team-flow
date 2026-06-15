'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  CalendarClock,
  Flag,
  Diamond,
  Search,
  ChevronLeft,
  ChevronRight,
  TodayIcon,
} from 'lucide-react';
import { useAppData } from '@/hooks/use-app-data';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (86400000));
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatDay(date: Date): string {
  return date.toLocaleDateString('en-US', { day: 'numeric' });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Animation Variants ────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ── Main Planning View ────────────────────────────────────────────────────────

export function PlanningView() {
  const { t } = useTranslation();
  const { projects, milestones } = useAppData();
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const [projectFilter, setProjectFilter] = useState<string>('all');

  useEffect(() => {
    if (activeProjectId) {
      setProjectFilter(activeProjectId);
    }
  }, [activeProjectId]);

  // Timeline range: 2 months before today to 3 months after
  const today = new Date();
  const timelineStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const timelineEnd = new Date(today.getFullYear(), today.getMonth() + 4, 0);
  const totalDays = daysBetween(timelineStart, timelineEnd);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (projectFilter === 'all') return true;
      return p.id === projectFilter;
    });
  }, [projectFilter, projects]);

  // Filter milestones for these projects
  const filteredMilestones = useMemo(() => {
    const projectIds = new Set(filteredProjects.map((p) => p.id));
    return milestones.filter((m) => projectIds.has(m.projectId));
  }, [filteredProjects, milestones]);

  // Month markers for the timeline header
  const monthMarkers = useMemo(() => {
    const markers: { date: Date; label: string; offset: number }[] = [];
    const d = new Date(timelineStart);
    while (d <= timelineEnd) {
      markers.push({
        date: new Date(d),
        label: formatMonth(d),
        offset: daysBetween(timelineStart, d) / totalDays * 100,
      });
      d.setMonth(d.getMonth() + 1);
      d.setDate(1);
    }
    return markers;
  }, [timelineStart, timelineEnd, totalDays]);

  // Week markers
  const weekMarkers = useMemo(() => {
    const markers: { offset: number; label: string }[] = [];
    const d = new Date(timelineStart);
    while (d <= timelineEnd) {
      markers.push({
        offset: daysBetween(timelineStart, d) / totalDays * 100,
        label: formatDay(d),
      });
      d.setDate(d.getDate() + 7);
    }
    return markers;
  }, [timelineStart, timelineEnd, totalDays]);

  // Today line offset
  const todayOffset = useMemo(() => {
    return Math.max(0, Math.min(100, daysBetween(timelineStart, today) / totalDays * 100));
  }, [timelineStart, today, totalDays]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.planning.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filteredProjects.length} {t.nav.projects.toLowerCase()} · {filteredMilestones.length} {t.nav.milestones.toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs border-[oklch(0.55_0.15_160)]/30 text-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.55_0.15_160)]/5"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            {t.planning.today}
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Month headers */}
          <div className="relative h-10 bg-muted/30 border-b overflow-hidden">
            {monthMarkers.map((m, i) => (
              <div
                key={i}
                className="absolute top-0 h-full flex items-center px-2 text-[10px] font-semibold text-muted-foreground border-l"
                style={{ left: `${m.offset}%` }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Week tick marks */}
          <div className="relative h-5 bg-muted/15 border-b overflow-hidden">
            {weekMarkers.map((w, i) => (
              <div
                key={i}
                className="absolute top-0 h-full border-l border-muted/50 flex items-center px-1"
                style={{ left: `${w.offset}%` }}
              >
                <span className="text-[8px] text-muted-foreground/60">{w.label}</span>
              </div>
            ))}
          </div>

          {/* Today line */}
          <div className="relative">
            {/* Today indicator - vertical line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none"
              style={{ left: `${todayOffset}%` }}
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                {t.planning.today}
              </div>
            </div>

            {/* Project bars */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="divide-y"
            >
              {filteredProjects.map((project) => {
                const start = parseDate(project.startDate);
                const end = parseDate(project.dueDate);
                const leftOffset = Math.max(0, daysBetween(timelineStart, start) / totalDays * 100);
                const width = Math.max(2, daysBetween(start, end) / totalDays * 100);
                const barOverlapsToday = todayOffset >= leftOffset && todayOffset <= leftOffset + width;

                // Get milestones for this project
                const projectMilestones = filteredMilestones.filter((m) => m.projectId === project.id);

                return (
                  <motion.div
                    key={project.id}
                    variants={item}
                    className="relative h-14 hover:bg-muted/20 transition-colors group"
                  >
                    {/* Project label */}
                    <div className="absolute left-0 top-0 bottom-0 w-36 z-10 flex items-center px-3 bg-background group-hover:bg-muted/20 transition-colors border-r">
                      <span className="text-xs font-medium truncate">{project.icon} {project.name}</span>
                    </div>

                    {/* Bar area */}
                    <div className="absolute left-36 right-0 top-0 bottom-0">
                      {/* Project bar */}
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute top-3 h-8 rounded-lg cursor-pointer transition-all duration-200 group-hover:shadow-md group-hover:brightness-110 overflow-hidden"
                              style={{
                                left: `${leftOffset}%`,
                                width: `${width}%`,
                                backgroundColor: project.color + '30',
                                borderLeft: `3px solid ${project.color}`,
                              }}
                            >
                              <div
                                className="h-full rounded-r-lg opacity-60"
                                style={{
                                  width: `${project.progress}%`,
                                  backgroundColor: project.color + '50',
                                }}
                              />
                              <span className="absolute inset-0 flex items-center px-2 text-[9px] font-semibold text-foreground/80 truncate">
                                {project.progress}%
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold text-xs">{project.name}</p>
                              <p className="text-[10px] text-muted-foreground">{formatShortDate(start)} — {formatShortDate(end)}</p>
                              <p className="text-[10px]">{project.progress}% complete</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Milestone diamonds */}
                      {projectMilestones.map((milestone) => {
                        const msDate = parseDate(milestone.dueDate);
                        const msOffset = daysBetween(timelineStart, msDate) / totalDays * 100;
                        const msConfig: Record<string, { color: string; bg: string }> = {
                          upcoming: { color: milestone.color, bg: milestone.color + '20' },
                          in_progress: { color: '#f59e0b', bg: '#f59e0b20' },
                          completed: { color: '#10b981', bg: '#10b98120' },
                          overdue: { color: '#ef4444', bg: '#ef444420' },
                        };
                        const msStyle = msConfig[milestone.status] || msConfig.upcoming;

                        return (
                          <TooltipProvider key={milestone.id} delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="absolute top-4 z-10 cursor-pointer transition-transform hover:scale-125"
                                  style={{ left: `calc(${msOffset}% - 6px)` }}
                                >
                                  <div
                                    className="w-3 h-3 rotate-45 border-2 border-background shadow-sm"
                                    style={{ backgroundColor: msStyle.color }}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-xs flex items-center gap-1">
                                    <Flag className="h-3 w-3" style={{ color: msStyle.color }} />
                                    {milestone.title}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">{formatShortDate(msDate)}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Empty state */}
            {filteredProjects.length === 0 && (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <div className="text-center">
                  <CalendarClock className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">{t.planning.noResults}</p>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-3 bg-muted/20 border-t text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-3 rounded-sm bg-emerald-500/30 border-l-2 border-emerald-500" />
              <span>Project</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rotate-45 bg-amber-500" />
              <span>{t.nav.milestones}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-rose-500" />
              <span>{t.planning.today}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

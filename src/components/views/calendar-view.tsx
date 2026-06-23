'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Flag,
  Target,
  Users,
  Plus,
  Crosshair,
  Zap,
  CheckSquare,
  Search,
  SlidersHorizontal,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import { useAppData } from '@/hooks/use-app-data';
import { useAppStore } from '@/lib/store';
import type { CalendarEvent } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
  differenceInMonths,
} from 'date-fns';

// Event type configuration - PM types
const eventTypeConfig: Record<CalendarEvent['type'], { color: string; bg: string; dotColor: string; borderClass: string; icon: React.ReactNode }> = {
  deadline: {
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10 border-rose-200 dark:border-rose-800',
    dotColor: 'bg-rose-500',
    borderClass: 'border-l-rose-500',
    icon: <Flag className="h-3.5 w-3.5" />,
  },
  milestone: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-200 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    borderClass: 'border-l-amber-500',
    icon: <Target className="h-3.5 w-3.5" />,
  },
  sprint: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    borderClass: 'border-l-emerald-500',
    icon: <Zap className="h-3.5 w-3.5" />,
  },
  meeting: {
    color: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-200 dark:border-cyan-800',
    dotColor: 'bg-cyan-500',
    borderClass: 'border-l-cyan-500',
    icon: <Users className="h-3.5 w-3.5" />,
  },
  task: {
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-500/10 border-teal-200 dark:border-teal-800',
    dotColor: 'bg-teal-500',
    borderClass: 'border-l-teal-500',
    icon: <CheckSquare className="h-3.5 w-3.5" />,
  },
};

function getEventTypeLabel(type: CalendarEvent['type'], t: ReturnType<typeof useTranslation>['t']) {
  const labels: Record<CalendarEvent['type'], string> = {
    deadline: t.calendar.deadline,
    milestone: t.calendar.milestone,
    sprint: t.calendar.sprint,
    meeting: t.calendar.meeting,
    task: t.calendar.task,
  };
  return labels[type];
}

function getProjectColorFrom(projects: import('@/lib/types').Project[], id?: string) {
  if (!id) return null;
  return projects.find((p) => p.id === id)?.color || null;
}

function EventHoverCardContent({ event }: { event: CalendarEvent }) {
  const { t } = useTranslation();
  const { projects, getProjectName, tasks, meetings, sprints, milestones, getUserName } = useAppData();
  const config = eventTypeConfig[event.type];
  const projectName = event.projectId ? getProjectName(event.projectId) : null;
  const projectColor = getProjectColorFrom(projects, event.projectId);
  const label = getEventTypeLabel(event.type, t);

  // Find detailed object based on type
  let description = '';
  let status = '';
  let priority = '';
  let assignee = '';
  let duration = 0;
  let meetingLink = '';
  let attendees: string[] = [];
  let startDate = '';
  let endDate = '';

  if (event.type === 'task') {
    const taskId = event.id.replace('task-', '');
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      description = task.description;
      status = task.status;
      priority = task.priority;
      if (task.assigneeId) {
        assignee = getUserName(task.assigneeId);
      }
    }
  } else if (event.type === 'meeting') {
    const meeting = meetings.find((m) => m.id === event.id);
    if (meeting) {
      description = meeting.description || '';
      status = meeting.status;
      duration = meeting.duration;
      meetingLink = meeting.link || '';
      attendees = meeting.attendees || [];
    }
  } else if (event.type === 'sprint') {
    const sprintId = event.id.replace('sprint-', '');
    const sprint = sprints.find((s) => s.id === sprintId);
    if (sprint) {
      description = sprint.goal || '';
      status = sprint.status;
      startDate = sprint.startDate;
      endDate = sprint.endDate;
    }
  } else if (event.type === 'milestone') {
    const msId = event.id.replace('ms-', '');
    const milestone = milestones.find((m) => m.id === msId);
    if (milestone) {
      description = milestone.description || '';
      status = milestone.status;
    }
  }

  return (
    <div className="space-y-3 text-xs">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-2">
        <div className="space-y-1 min-w-0">
          <h4 className="font-bold text-sm text-foreground leading-tight break-words">{event.title}</h4>
          {projectName && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: projectColor || '#10b981' }}
              />
              <span className="text-[10px] text-muted-foreground font-medium truncate">{projectName}</span>
            </div>
          )}
        </div>
        <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0.5 shrink-0 font-semibold uppercase tracking-wider', config.bg, config.color)}>
          {label}
        </Badge>
      </div>

      {/* Body / Description */}
      {description && (
        <p className="text-muted-foreground text-[11px] leading-normal line-clamp-3 bg-muted/20 p-2 rounded-md border border-border/30">
          {description}
        </p>
      )}

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-2 bg-muted/10 p-2 rounded-lg border border-border/20">
        {/* Date */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarIcon className="h-3.5 w-3.5 text-foreground/70 shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 leading-none">Date</p>
            <p className="text-[10px] font-semibold text-foreground truncate leading-tight mt-0.5">
              {format(parseISO(event.date), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Time / Duration / End Date */}
        {event.type === 'meeting' && duration > 0 && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-foreground/70 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 leading-none">Durée</p>
              <p className="text-[10px] font-semibold text-foreground truncate leading-tight mt-0.5">
                {duration} min
              </p>
            </div>
          </div>
        )}

        {event.type === 'sprint' && startDate && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-foreground/70 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 leading-none">Période</p>
              <p className="text-[10px] font-semibold text-foreground truncate leading-tight mt-0.5">
                {format(parseISO(startDate), 'dd/MM')} - {format(parseISO(endDate), 'dd/MM')}
              </p>
            </div>
          </div>
        )}

        {/* Status */}
        {status && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckSquare className="h-3.5 w-3.5 text-foreground/70 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 leading-none">Statut</p>
              <Badge variant="secondary" className="text-[9px] font-bold px-1 py-0 h-4 mt-0.5 capitalize bg-background border border-border/80">
                {status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        )}

        {/* Priority */}
        {priority && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Flag className="h-3.5 w-3.5 text-foreground/70 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 leading-none">Priorité</p>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[9px] font-bold px-1 py-0 h-4 mt-0.5 capitalize",
                  priority === 'urgent' && 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800',
                  priority === 'high' && 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800',
                  priority === 'medium' && 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
                  priority === 'low' && 'bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-800'
                )}
              >
                {priority}
              </Badge>
            </div>
          </div>
        )}

        {/* Assignee */}
        {assignee && (
          <div className="flex items-center gap-1.5 text-muted-foreground col-span-2 border-t border-border/20 pt-1.5 mt-0.5">
            <Users className="h-3.5 w-3.5 text-foreground/70 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 leading-none">Assigné à</p>
              <p className="text-[10px] font-semibold text-foreground truncate leading-tight mt-0.5">
                {assignee}
              </p>
            </div>
          </div>
        )}

        {/* Attendees */}
        {event.type === 'meeting' && attendees.length > 0 && (
          <div className="flex items-center gap-1.5 text-muted-foreground col-span-2 border-t border-border/20 pt-1.5 mt-0.5">
            <Users className="h-3.5 w-3.5 text-foreground/70 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 leading-none">Participants</p>
              <p className="text-[10px] font-semibold text-foreground truncate leading-tight mt-0.5">
                {attendees.map(getUserName).join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Meeting Link */}
      {meetingLink && (
        <div className="pt-1">
          <a
            href={meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] transition-colors shadow-sm shadow-blue-500/10 cursor-pointer"
          >
            Rejoindre la réunion
          </a>
        </div>
      )}
    </div>
  );
}

const FILTER_SELECT_TRIGGER_CLASS = (isActive: boolean) =>
  cn(
    'h-8 w-auto min-w-[140px] max-w-[170px] text-xs px-3 rounded-lg gap-2 border shadow-none transition-all duration-200',
    '[&_svg:not([class*="size-"])]:size-3.5',
    'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    isActive
      ? 'bg-[oklch(0.55_0.18_250)]/5 border-[oklch(0.55_0.18_250)]/30 text-[oklch(0.55_0.18_250)] font-medium'
      : 'bg-background hover:bg-muted/50 border-border text-muted-foreground hover:text-foreground'
  );

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
};

function CalendarDayCell({
  day,
  events,
  isCurrentMonth,
  isSelected,
  isTodayDate,
  onSelect,
  isDragSelecting,
  isDragSelected,
  onDragStart,
  onDragOver,
  onAddEvent,
}: {
  day: Date;
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  isSelected: boolean;
  isTodayDate: boolean;
  onSelect: (day: Date) => void;
  isDragSelecting: boolean;
  isDragSelected: boolean;
  onDragStart?: (day: Date) => void;
  onDragOver?: (day: Date) => void;
  onAddEvent?: (day: Date, e: React.MouseEvent) => void;
}) {
  const { locale, t } = useTranslation();

  const dayLabel = useMemo(() => {
    const isFirstDay = format(day, 'd') === '1';
    if (isFirstDay) {
      try {
        return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
          month: 'short',
          day: 'numeric',
        }).format(day);
      } catch {
        return format(day, 'MMM d');
      }
    }
    return format(day, 'dd');
  }, [day, locale]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      try {
        return parseISO(a.date).getTime() - parseISO(b.date).getTime();
      } catch {
        return 0;
      }
    });
  }, [events]);

  const formatEventTime = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      // If there is a specific time portion (not just T00:00:00)
      if (dateStr.includes('T') && !dateStr.endsWith('T00:00:00Z') && !dateStr.endsWith('T00:00:00')) {
        return format(d, 'H:mm');
      }
      return null;
    } catch {
      return null;
    }
  };

  return (
    <div
      onClick={() => onSelect(day)}
      onMouseDown={() => onDragStart?.(day)}
      onMouseEnter={() => isDragSelecting && onDragOver?.(day)}
      className={cn(
        'relative flex flex-col items-stretch justify-start p-1.5 sm:p-2 min-h-[115px] sm:min-h-[140px] border-r border-b border-border/60 dark:border-border/30 transition-all duration-200 text-left w-full group select-none cursor-pointer',
        'focus:outline-none',
        !isCurrentMonth ? 'bg-muted/5 text-muted-foreground/30' : 'bg-background text-foreground hover:bg-muted/15 dark:hover:bg-muted/5',
        isSelected && !isTodayDate && 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/20',
        isTodayDate && 'bg-blue-500/3 dark:bg-blue-500/5',
        isDragSelected && !isTodayDate && 'bg-blue-500/5 dark:bg-blue-500/10',
      )}
    >
      <div className="flex items-center justify-between w-full mb-1.5 shrink-0">
        <span
          className={cn(
            'text-[10px] sm:text-xs font-semibold flex items-center justify-center rounded-full transition-all duration-200',
            isTodayDate && 'bg-blue-600 text-white w-6 h-6 sm:w-7 sm:h-7 shadow-md shadow-blue-500/25 font-bold',
            isSelected && !isTodayDate && 'bg-primary/25 text-primary border border-primary/40 font-bold px-1.5 py-0.5 rounded-md text-[10px]',
            !isTodayDate && !isSelected && 'text-muted-foreground group-hover:text-foreground',
          )}
        >
          {dayLabel}
        </span>
        
        {/* Quick add event button, only visible on hover */}
        <button
          onClick={(e) => onAddEvent?.(day, e)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted-foreground/15 dark:hover:bg-muted rounded-md text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          title="Ajouter un événement"
        >
          <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </button>
      </div>

      {/* Render Event blocks directly in cell */}
      <div className="flex-1 overflow-hidden space-y-1 w-full">
        {sortedEvents.slice(0, 3).map((event) => {
          const eventTime = formatEventTime(event.date);
          
          return (
            <HoverCard key={event.id} openDelay={150} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-tight transition-all duration-150 border-l-[3px] truncate w-full cursor-pointer',
                    event.type === 'meeting' && 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-l-blue-500 border border-blue-500/10',
                    event.type === 'sprint' && 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-l-emerald-500 border border-emerald-500/10',
                    event.type === 'milestone' && 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-l-amber-500 border border-amber-500/10',
                    event.type === 'deadline' && 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-l-rose-500 border border-rose-500/10',
                    event.type === 'task' && 'bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 border-l-teal-500 border border-teal-500/10'
                  )}
                >
                  {eventTime && <span className="opacity-80 shrink-0 font-extrabold">{eventTime}</span>}
                  <span className="truncate flex-1">{event.title}</span>
                </div>
              </HoverCardTrigger>
              <HoverCardContent
                side="right"
                align="start"
                sideOffset={8}
                className="w-80 p-4 bg-card/95 backdrop-blur-md border border-border/80 shadow-xl rounded-xl z-50 dark-card-glow"
                onClick={(e) => e.stopPropagation()}
              >
                <EventHoverCardContent event={event} />
              </HoverCardContent>
            </HoverCard>
          );
        })}
        {sortedEvents.length > 3 && (
          <div className="text-[9px] text-muted-foreground font-semibold px-1 py-0.5 bg-muted/20 rounded">
            + {sortedEvents.length - 3} {locale === 'fr' ? 'de plus' : 'more'}
          </div>
        )}
      </div>
    </div>
  );
}


export function CalendarView() {
  const { t } = useTranslation();
  const { openCreateTaskDialog } = useAppStore();
  const { calendarEvents, projects, tasks } = useAppData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [direction, setDirection] = useState<number>(0);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // Drag-to-select date range state
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const [dragSelectedRange, setDragSelectedRange] = useState<Date[]>([]);

  // "Today" floating button visibility
  const showTodayButton = Math.abs(differenceInMonths(currentMonth, new Date())) > 0;

  const handleDragStart = useCallback((day: Date) => {
    setIsDragSelecting(true);
    setDragStart(day);
    setDragEnd(day);
    setDragSelectedRange([day]);
  }, []);

  const handleDragOver = useCallback((day: Date) => {
    if (!isDragSelecting || !dragStart) return;
    setDragEnd(day);
    const start = dragStart < day ? dragStart : day;
    const end = dragStart < day ? day : dragStart;
    const range = eachDayOfInterval({ start, end });
    setDragSelectedRange(range);
  }, [isDragSelecting, dragStart]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragSelecting && dragStart && dragEnd && !isSameDay(dragStart, dragEnd)) {
        setSelectedDay(dragStart);
      }
      setIsDragSelecting(false);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDragSelecting, dragStart, dragEnd]);

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Apply filters to calendar events
  const filteredEvents = useMemo(() => {
    return calendarEvents.filter((event) => {
      if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (typeFilter !== 'all' && event.type !== typeFilter) {
        return false;
      }
      if (projectFilter !== 'all' && event.projectId !== projectFilter) {
        return false;
      }
      return true;
    });
  }, [calendarEvents, searchQuery, typeFilter, projectFilter]);

  // Get events for a specific day
  const getEventsForDay = useCallback((day: Date) => {
    return filteredEvents.filter((event) => {
      const eventDate = parseISO(event.date);
      return isSameDay(eventDate, day);
    });
  }, [filteredEvents]);


  // Total filtered events for current month view
  const monthEvents = useMemo(() => {
    return filteredEvents.filter((event) => {
      const eventDate = parseISO(event.date);
      return isSameMonth(eventDate, currentMonth);
    });
  }, [currentMonth, filteredEvents]);

  const { locale } = useTranslation();
  const weekDays = useMemo(() => {
    if (locale === 'fr') {
      return ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    }
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  }, [locale]);

  const handlePrevMonth = () => {
    setDirection(-1);
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setDirection(1);
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setDirection(0);
    setCurrentMonth(new Date());
    setSelectedDay(new Date());
  };

  const handleAddEvent = useCallback((day: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDay(day);
    openCreateTaskDialog();
  }, [openCreateTaskDialog]);

  return (
    <div className="space-y-5 relative">
      {/* Sleek, Modern Two-Tier Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tier 1 Left: Title and Status Badges */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{t.calendar.title}</h2>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-muted border border-border/80 text-muted-foreground">
                {monthEvents.length} {t.calendar.events.toLowerCase()}
              </span>
              {calendarEvents.filter(e => isSameDay(parseISO(e.date), new Date())).length > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                  {calendarEvents.filter(e => isSameDay(parseISO(e.date), new Date())).length} aujourd'hui
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tier 1 Right: Navigation & Action */}
        <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
          {/* Month switcher navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2.5 font-semibold"
              onClick={handleToday}
            >
              {t.calendar.today}
            </Button>
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border border-border/60">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={format(currentMonth, 'yyyy-MM')}
                  initial={{ opacity: 0, x: direction * 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -15 }}
                  transition={{ duration: 0.15 }}
                  className="text-xs font-bold min-w-[110px] text-center capitalize"
                >
                  {format(currentMonth, 'MMMM yyyy')}
                </motion.span>
              </AnimatePresence>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => openCreateTaskDialog()}
            className="h-8 gap-1.5 rounded-lg bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.18_250)] hover:from-[oklch(0.48_0.18_250)] hover:to-[oklch(0.42_0.18_250)] text-white shadow-sm shadow-[oklch(0.55_0.18_250)]/20 font-medium"
          >
            <Plus className="h-3.5 w-3.5" /> {t.calendar.title}
          </Button>
        </div>
      </div>

      {/* Tier 2: Search and Contextual Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-muted/15 dark:bg-muted/5 rounded-xl border border-border/60">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Integrated Search Bar */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher un événement..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs rounded-lg w-full bg-background border border-border/80 focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </div>

          {/* Event Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger
              size="sm"
              className={FILTER_SELECT_TRIGGER_CLASS(typeFilter !== 'all')}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Type d'événement" />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="meeting">{t.calendar.meeting}</SelectItem>
              <SelectItem value="task">{t.calendar.task}</SelectItem>
              <SelectItem value="milestone">{t.calendar.milestone}</SelectItem>
              <SelectItem value="sprint">{t.calendar.sprint}</SelectItem>
              <SelectItem value="deadline">{t.calendar.deadline}</SelectItem>
            </SelectContent>
          </Select>

          {/* Project Filter */}
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger
              size="sm"
              className={FILTER_SELECT_TRIGGER_CLASS(projectFilter !== 'all')}
            >
              <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Filtrer par projet" />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              <SelectItem value="all">Tous les projets</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span>{p.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset Filters button */}
          {(searchQuery || typeFilter !== 'all' || projectFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setProjectFilter('all');
              }}
              className="h-8 text-muted-foreground hover:text-foreground text-xs font-semibold shrink-0"
            >
              {t.tasks.resetFilters || "Reset Filters"}
            </Button>
          )}
        </div>

        {/* Integrated Legend on right side of Toolbar */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {(Object.entries(eventTypeConfig) as [CalendarEvent['type'], typeof eventTypeConfig[CalendarEvent['type']]][]).map(([type, config]) => (
            <div key={type} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/20 border border-border/30">
              <span className={cn('w-1.5 h-1.5 rounded-full shadow-sm', config.dotColor)} />
              <span className="text-[10px] font-semibold text-muted-foreground">{getEventTypeLabel(type, t)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content: Calendar Grid */}
      <div className="w-full">
        <Card className="overflow-hidden dark-card-glow border border-border/60 rounded-xl bg-background shadow-sm">
          <CardContent className="p-0">
            {/* Weekday headers row with neat borders */}
            <div className="grid grid-cols-7 bg-muted/15 dark:bg-muted/5 overflow-hidden shrink-0">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-[10px] sm:text-xs font-bold text-muted-foreground/90 py-2.5 uppercase tracking-wider border-r border-b border-border/60 last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days with animated transitions */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={format(currentMonth, 'yyyy-MM')}
                initial={{ opacity: 0, x: direction * 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -15 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-7 overflow-hidden bg-background shrink-0 [&>div:nth-child(7n)]:border-r-0 [&>div:nth-last-child(-n+7)]:border-b-0"
              >
                {calendarDays.map((day) => {
                  const dayEvents = getEventsForDay(day);
                  const isDragSelected = dragSelectedRange.some((d) => isSameDay(d, day));
                  return (
                    <CalendarDayCell
                      key={day.toISOString()}
                      day={day}
                      events={dayEvents}
                      isCurrentMonth={isSameMonth(day, currentMonth)}
                      isSelected={selectedDay ? isSameDay(day, selectedDay) : false}
                      isTodayDate={isToday(day)}
                      onSelect={setSelectedDay}
                      isDragSelecting={isDragSelecting}
                      isDragSelected={isDragSelected}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onAddEvent={handleAddEvent}
                    />
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* Floating "Today" button */}
      <AnimatePresence>
        {showTodayButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={handleToday}
            className="fixed bottom-20 right-8 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 text-white shadow-lg hover:shadow-xl hover:bg-emerald-700 transition-shadow"
          >
            <Crosshair className="h-4 w-4" />
            <span className="text-sm font-semibold">{t.calendar.today}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

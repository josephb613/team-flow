'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Flag,
  Bell,
  Target,
  Users,
  Plus,
} from 'lucide-react';
import { mockCalendarEvents, mockProjects } from '@/lib/mock-data';
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
} from 'date-fns';

// Event type configuration
const eventTypeConfig: Record<CalendarEvent['type'], { color: string; bg: string; dotColor: string; borderClass: string; icon: React.ReactNode }> = {
  deadline: {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10 border-red-200 dark:border-red-800',
    dotColor: 'bg-red-500',
    borderClass: 'border-l-red-500',
    icon: <Flag className="h-3.5 w-3.5" />,
  },
  meeting: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    borderClass: 'border-l-emerald-500',
    icon: <Users className="h-3.5 w-3.5" />,
  },
  milestone: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-200 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    borderClass: 'border-l-amber-500',
    icon: <Target className="h-3.5 w-3.5" />,
  },
  reminder: {
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10 border-purple-200 dark:border-purple-800',
    dotColor: 'bg-purple-500',
    borderClass: 'border-l-purple-500',
    icon: <Bell className="h-3.5 w-3.5" />,
  },
};

function getEventTypeLabel(type: CalendarEvent['type'], t: ReturnType<typeof useTranslation>['t']) {
  const labels: Record<CalendarEvent['type'], string> = {
    deadline: t.calendar.deadline,
    meeting: t.calendar.meeting,
    milestone: t.calendar.milestone,
    reminder: t.calendar.reminder,
  };
  return labels[type];
}

function getProjectName(id?: string) {
  if (!id) return null;
  return mockProjects.find((p) => p.id === id)?.name || null;
}

function getProjectColor(id?: string) {
  if (!id) return null;
  return mockProjects.find((p) => p.id === id)?.color || null;
}

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
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

function CalendarDayCell({
  day,
  events,
  isCurrentMonth,
  isSelected,
  isTodayDate,
  onSelect,
}: {
  day: Date;
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  isSelected: boolean;
  isTodayDate: boolean;
  onSelect: (day: Date) => void;
}) {
  const eventTypes = [...new Set(events.map((e) => e.type))];

  return (
    <button
      onClick={() => onSelect(day)}
      className={cn(
        'relative flex flex-col items-center justify-start p-1.5 sm:p-2 min-h-[64px] sm:min-h-[84px] rounded-xl transition-all duration-200 text-left w-full group',
        'hover:bg-muted/50 focus:outline-none',
        !isCurrentMonth && 'opacity-25',
        isSelected && !isTodayDate && 'bg-primary/8 ring-2 ring-primary/30 shadow-sm',
        isTodayDate && !isSelected && 'bg-emerald-500/5 ring-1 ring-emerald-500/20',
        isTodayDate && isSelected && 'bg-emerald-500/10 ring-2 ring-emerald-500/40 shadow-sm',
      )}
    >
      <span
        className={cn(
          'text-xs sm:text-sm font-semibold flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all duration-200',
          isTodayDate && 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25',
          isSelected && !isTodayDate && 'bg-primary text-primary-foreground shadow-md shadow-primary/25',
          !isTodayDate && !isSelected && 'group-hover:bg-muted/80',
        )}
      >
        {format(day, 'd')}
      </span>

      {/* Event dots */}
      {eventTypes.length > 0 && (
        <div className="flex items-center gap-0.5 mt-1.5 flex-wrap justify-center">
          {eventTypes.slice(0, 4).map((type) => (
            <span
              key={type}
              className={cn('w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ring-1 ring-white/50 dark:ring-background/50 shadow-sm', eventTypeConfig[type].dotColor)}
            />
          ))}
          {eventTypes.length > 4 && (
            <span className="text-[8px] text-muted-foreground font-medium">+{eventTypes.length - 4}</span>
          )}
        </div>
      )}
    </button>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const { t } = useTranslation();
  const config = eventTypeConfig[event.type];
  const projectName = getProjectName(event.projectId);
  const projectColor = getProjectColor(event.projectId);
  const label = getEventTypeLabel(event.type, t);

  return (
    <motion.div variants={item}>
      <div className={cn(
        'group p-3 rounded-xl border-l-[3px] bg-card hover:shadow-md transition-all duration-200 cursor-pointer border border-l-0',
        'hover:translate-x-0.5',
      )}>
        <div className={cn('absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl', config.dotColor)} />
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'p-2 rounded-lg shrink-0',
              config.bg.replace('border-', '').split(' ')[0],
            )}
          >
            <span className={config.color}>{config.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold truncate">{event.title}</h4>
              <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 shrink-0 font-medium', config.bg, config.color)}>
                {label}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CalendarIcon className="h-3 w-3" />
                {format(parseISO(event.date), 'MMM d, yyyy')}
              </div>
              {event.endDate && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(parseISO(event.date), 'h:mm a')} – {format(parseISO(event.endDate), 'h:mm a')}
                </div>
              )}
            </div>

            {projectName && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: projectColor || '#10b981' }}
                />
                <span className="text-[10px] text-muted-foreground">{projectName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function CalendarView() {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [direction, setDirection] = useState<number>(0);

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get events for a specific day
  const getEventsForDay = useCallback((day: Date) => {
    return mockCalendarEvents.filter((event) => {
      const eventDate = parseISO(event.date);
      return isSameDay(eventDate, day);
    });
  }, []);

  // Selected day events
  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  // Total events for current month view
  const monthEvents = useMemo(() => {
    return mockCalendarEvents.filter((event) => {
      const eventDate = parseISO(event.date);
      return isSameMonth(eventDate, currentMonth);
    });
  }, [currentMonth]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t.calendar.title}</h2>
          <p className="text-sm text-muted-foreground">
            {monthEvents.length} {t.calendar.events}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleToday}
          >
            {t.calendar.today}
          </Button>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={format(currentMonth, 'yyyy-MM')}
                initial={{ opacity: 0, x: direction * 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -30 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-bold min-w-[140px] text-center"
              >
                {format(currentMonth, 'MMMM yyyy')}
              </motion.span>
            </AnimatePresence>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            size="sm"
            className="h-8 bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.48_0.15_160)] text-white"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t.calendar.title}
          </Button>
        </div>
      </div>

      {/* Legend with proper colored icons */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground">{t.calendar.legend}:</span>
        {(Object.entries(eventTypeConfig) as [CalendarEvent['type'], typeof eventTypeConfig[CalendarEvent['type']]][]).map(([type, config]) => (
          <div key={type} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/30">
            <span className={cn('w-2.5 h-2.5 rounded-full shadow-sm', config.dotColor)} />
            <span className={cn('text-xs font-medium', config.color)}>{getEventTypeLabel(type, t)}</span>
          </div>
        ))}
      </div>

      {/* Main content: Calendar + Side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        {/* Calendar Grid */}
        <Card className="overflow-hidden">
          <CardContent className="p-3 sm:p-4">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days with animated transitions */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={format(currentMonth, 'yyyy-MM')}
                initial={{ opacity: 0, x: direction * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -20 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-7 gap-1"
              >
                {calendarDays.map((day) => {
                  const dayEvents = getEventsForDay(day);
                  return (
                    <CalendarDayCell
                      key={day.toISOString()}
                      day={day}
                      events={dayEvents}
                      isCurrentMonth={isSameMonth(day, currentMonth)}
                      isSelected={selectedDay ? isSameDay(day, selectedDay) : false}
                      isTodayDate={isToday(day)}
                      onSelect={setSelectedDay}
                    />
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Side Panel: Events for selected day */}
        <Card className="h-fit overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-b from-muted/30 to-transparent">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold">
                {selectedDay
                  ? `${t.calendar.eventsFor} ${format(selectedDay, 'EEEE, MMM d')}`
                  : 'Select a day'}
              </CardTitle>
              {selectedDayEvents.length > 0 && (
                <Badge className="h-5 min-w-[20px] px-1.5 text-[10px] bg-[oklch(0.55_0.15_160)] text-white">
                  {selectedDayEvents.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-3">
            <AnimatePresence mode="wait">
              {selectedDayEvents.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-10 text-muted-foreground"
                >
                  <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <CalendarIcon className="h-8 w-8 opacity-30" />
                  </div>
                  <p className="text-sm font-medium">{t.calendar.noEvents}</p>
                  <p className="text-xs text-muted-foreground mt-1">Select another day to view events</p>
                </motion.div>
              ) : (
                <motion.div
                  key="events"
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="space-y-2.5 max-h-[calc(100vh-320px)] overflow-y-auto"
                >
                  {selectedDayEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Bell,
  CheckCircle2,
  AtSign,
  CalendarClock,
  MessageSquare,
  Mail,
  Settings2,
  X,
  CheckCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Notification } from '@/lib/types';

function getRelativeTime(timestamp: string, t: ReturnType<typeof useTranslation>['t']): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return t.activity.justNow;
  if (diffMinutes < 60) return `${diffMinutes}${t.activity.minutes} ${t.activity.ago}`;
  if (diffHours < 24) return `${diffHours}${t.activity.hours} ${t.activity.ago}`;
  return `${diffDays}${t.activity.days} ${t.activity.ago}`;
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'assignment':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'comment':
      return <MessageSquare className="h-4 w-4" />;
    case 'deadline':
      return <CalendarClock className="h-4 w-4" />;
    case 'mention':
      return <AtSign className="h-4 w-4" />;
    case 'invitation':
      return <Mail className="h-4 w-4" />;
    case 'system':
      return <Settings2 className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function getNotificationBorderColor(type: Notification['type']) {
  switch (type) {
    case 'assignment':
      return 'border-l-[oklch(0.55_0.15_160)]';
    case 'comment':
      return 'border-l-sky-500';
    case 'deadline':
      return 'border-l-amber-500';
    case 'mention':
      return 'border-l-violet-500';
    case 'invitation':
      return 'border-l-rose-500';
    case 'system':
      return 'border-l-slate-400';
    default:
      return 'border-l-muted';
  }
}

function getNotificationIconBg(type: Notification['type']) {
  switch (type) {
    case 'assignment':
      return 'bg-[oklch(0.55_0.15_160/0.12)] text-[oklch(0.55_0.15_160)]';
    case 'comment':
      return 'bg-sky-500/10 text-sky-500';
    case 'deadline':
      return 'bg-amber-500/10 text-amber-500';
    case 'mention':
      return 'bg-violet-500/10 text-violet-500';
    case 'invitation':
      return 'bg-rose-500/10 text-rose-500';
    case 'system':
      return 'bg-slate-400/10 text-slate-500';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function groupNotifications(notifications: Notification[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const groups: { label: 'today' | 'yesterday' | 'earlier'; items: Notification[] }[] = [
    { label: 'today', items: [] },
    { label: 'yesterday', items: [] },
    { label: 'earlier', items: [] },
  ];

  for (const notif of notifications) {
    const date = new Date(notif.timestamp);
    const notifDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (notifDay.getTime() >= today.getTime()) {
      groups[0].items.push(notif);
    } else if (notifDay.getTime() >= yesterday.getTime()) {
      groups[1].items.push(notif);
    } else {
      groups[2].items.push(notif);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

function NotificationItem({
  notification,
  onMarkRead,
  t,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border-l-[3px] cursor-pointer transition-colors',
        getNotificationBorderColor(notification.type),
        !notification.read
          ? 'bg-muted/40 hover:bg-muted/60'
          : 'hover:bg-muted/20'
      )}
      onClick={() => {
        if (!notification.read) onMarkRead(notification.id);
      }}
    >
      <div className={cn('rounded-lg p-2 flex-shrink-0 mt-0.5', getNotificationIconBg(notification.type))}>
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={cn('text-sm font-medium leading-tight', !notification.read && 'font-semibold')}>
            {notification.title}
          </span>
          {!notification.read && (
            <div className="w-2 h-2 rounded-full bg-[oklch(0.55_0.15_160)] flex-shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <span className="text-[10px] text-muted-foreground/60 mt-1 block">
          {getRelativeTime(notification.timestamp, t)}
        </span>
      </div>
    </motion.div>
  );
}

export function NotificationPanel() {
  const {
    notificationPanelOpen,
    setNotificationPanelOpen,
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
  } = useAppStore();
  const { t } = useTranslation();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const grouped = groupNotifications(notifications);

  const groupLabels: Record<string, string> = {
    today: t.notificationPanel.today,
    yesterday: t.notificationPanel.yesterday,
    earlier: t.notificationPanel.earlier,
  };

  return (
    <AnimatePresence>
      {notificationPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setNotificationPanelOpen(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-background border-l shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[oklch(0.55_0.15_160/0.12)] p-2">
                  <Bell className="h-4 w-4 text-[oklch(0.55_0.15_160)]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">{t.notificationPanel.title}</h2>
                  {unreadCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {unreadCount} {t.topbar.new}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs text-[oklch(0.55_0.15_160)] hover:text-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.55_0.15_160/0.08)]"
                    onClick={markAllNotificationsRead}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    {t.notificationPanel.markAllRead}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setNotificationPanelOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Notification count bar */}
            {unreadCount > 0 && (
              <div className="px-5 py-2 bg-[oklch(0.55_0.15_160/0.05)] border-b flex-shrink-0">
                <Badge className="bg-[oklch(0.55_0.15_160)] text-white text-xs">
                  {unreadCount} {t.topbar.new}
                </Badge>
              </div>
            )}

            {/* Notification List */}
            <ScrollArea className="flex-1">
              {grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="rounded-2xl bg-muted/30 p-4 mb-3">
                    <Bell className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t.notificationPanel.noNotifications}</p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {grouped.map((group) => (
                    <div key={group.label}>
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {groupLabels[group.label]}
                        </span>
                        <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                          {group.items.length}
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        {group.items.map((notif) => (
                          <NotificationItem
                            key={notif.id}
                            notification={notif}
                            onMarkRead={markNotificationRead}
                            t={t}
                          />
                        ))}
                      </div>
                      {group.label !== grouped[grouped.length - 1]?.label && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

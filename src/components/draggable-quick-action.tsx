'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import {
  Zap,
  ListChecks,
  FolderKanban,
  Timer,
  UserPlus,
  Search,
  X,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { AiChatPanel, getAiChatPanelPosition } from '@/components/ai-chat-widget';

const STORAGE_KEY = 'teamflow-quick-action-position';
const FAB_SIZE = 56;
const MARGIN = 12;

type Position = { x: number; y: number };

function readStoredPosition(): Position | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Position;
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed;
  } catch {
    // ignore
  }
  return null;
}

function writeStoredPosition(pos: Position) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // ignore quota / private mode
  }
}

function getDefaultPosition(): Position {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return {
    x: window.innerWidth - FAB_SIZE - MARGIN,
    y: window.innerHeight - FAB_SIZE - MARGIN - 72,
  };
}

function clampPosition(pos: Position, width: number, height: number): Position {
  const maxX = Math.max(MARGIN, width - FAB_SIZE - MARGIN);
  const maxY = Math.max(MARGIN, height - FAB_SIZE - MARGIN);
  return {
    x: Math.min(Math.max(MARGIN, pos.x), maxX),
    y: Math.min(Math.max(MARGIN, pos.y), maxY),
  };
}

const SERVER_WINDOW_SIZE = { width: 0, height: 0 };
let cachedWindowSize = { width: 0, height: 0 };

function subscribeWindowSize(onStoreChange: () => void) {
  window.addEventListener('resize', onStoreChange);
  return () => window.removeEventListener('resize', onStoreChange);
}

function getWindowSizeSnapshot() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (cachedWindowSize.width !== width || cachedWindowSize.height !== height) {
    cachedWindowSize = { width, height };
  }
  return cachedWindowSize;
}

function useWindowSize() {
  return useSyncExternalStore(
    subscribeWindowSize,
    getWindowSizeSnapshot,
    () => SERVER_WINDOW_SIZE
  );
}

export function DraggableQuickAction() {
  const { t } = useTranslation();
  const focusMode = useAppStore((s) => s.focusMode);
  const aiChatOpen = useAppStore((s) => s.aiChatOpen);
  const setAiChatOpen = useAppStore((s) => s.setAiChatOpen);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const windowSize = useWindowSize();
  const [open, setOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom'>('top');
  const [menuAlign, setMenuAlign] = useState<'left' | 'right'>('right');
  const wasDragged = useRef(false);
  const positionHydrated = useRef(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const dragConstraints = useMemo(
    () => ({
      left: MARGIN,
      right: Math.max(MARGIN, windowSize.width - FAB_SIZE - MARGIN),
      top: MARGIN,
      bottom: Math.max(MARGIN, windowSize.height - FAB_SIZE - MARGIN),
    }),
    [windowSize.width, windowSize.height]
  );

  const syncMenuPlacement = useCallback(() => {
    const posX = x.get();
    const posY = y.get();
    setMenuPlacement(posY < window.innerHeight / 2 ? 'bottom' : 'top');
    setMenuAlign(posX < window.innerWidth / 2 ? 'left' : 'right');
  }, [x, y]);

  useEffect(() => {
    if (!mounted || windowSize.width === 0) return;

    const pos = positionHydrated.current
      ? clampPosition({ x: x.get(), y: y.get() }, windowSize.width, windowSize.height)
      : clampPosition(readStoredPosition() ?? getDefaultPosition(), windowSize.width, windowSize.height);

    x.set(pos.x);
    y.set(pos.y);
    positionHydrated.current = true;
    writeStoredPosition(pos);
  }, [mounted, windowSize.width, windowSize.height, x, y]);

  useEffect(() => {
    if (!open && !aiChatOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-quick-action-fab]')) {
        setOpen(false);
        setAiChatOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, aiChatOpen, setAiChatOpen]);

  const handleDragStart = () => {
    wasDragged.current = false;
    setOpen(false);
    setAiChatOpen(false);
  };

  const handleDrag = () => {
    wasDragged.current = true;
  };

  const handleDragEnd = () => {
    const pos = clampPosition({ x: x.get(), y: y.get() }, windowSize.width, windowSize.height);
    x.set(pos.x);
    y.set(pos.y);
    writeStoredPosition(pos);
    syncMenuPlacement();
    requestAnimationFrame(() => {
      wasDragged.current = false;
    });
  };

  const handleTap = () => {
    if (wasDragged.current) return;
    if (aiChatOpen) {
      setAiChatOpen(false);
      return;
    }
    setOpen((prev) => {
      const next = !prev;
      if (next) syncMenuPlacement();
      return next;
    });
  };

  const runAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  const openAiAssistant = () => {
    syncMenuPlacement();
    setOpen(false);
    setAiChatOpen(true);
  };

  const chatPanelStyle = useMemo(
    () =>
      getAiChatPanelPosition(
        x.get(),
        y.get(),
        menuPlacement,
        menuAlign,
        windowSize.width,
        windowSize.height
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute when panel opens or window resizes
    [aiChatOpen, menuPlacement, menuAlign, windowSize.width, windowSize.height]
  );

  const actions = [
    {
      icon: ListChecks,
      label: t.topbar.newTask,
      color: 'text-[oklch(0.55_0.18_250)]',
      onClick: () => useAppStore.getState().setCreateTaskDialogOpen(true),
    },
    {
      icon: FolderKanban,
      label: t.topbar.newProject,
      color: 'text-amber-500',
      onClick: () => useAppStore.getState().setCreateProjectDialogOpen(true),
    },
    {
      icon: Timer,
      label: t.topbar.timeTracking,
      color: 'text-rose-500',
      onClick: () => useAppStore.getState().setActivePage('time-tracking'),
    },
    {
      icon: UserPlus,
      label: t.dashboard.quickActionInviteMember,
      color: 'text-emerald-500',
      onClick: () => useAppStore.getState().setActivePage('members'),
    },
    {
      icon: Search,
      label: t.footer.searchHint?.replace('⌘K ', '') || 'Search',
      color: 'text-violet-500',
      onClick: () => useAppStore.getState().setSearchOpen(true),
    },
    {
      icon: Sparkles,
      label: t.sidebar.quickActionAiAssistant,
      color: 'text-[oklch(0.55_0.18_250)]',
      onClick: openAiAssistant,
      dividerBefore: true,
    },
  ];

  if (!mounted) return null;

  return (
    <>
      <AnimatePresence>
        {aiChatOpen && (
          <AiChatPanel
            key="ai-chat-panel"
            style={chatPanelStyle}
            onClose={() => setAiChatOpen(false)}
            data-quick-action-fab
          />
        )}
      </AnimatePresence>

      <motion.div
        data-quick-action-fab
        drag
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={dragConstraints}
        style={{ x, y, position: 'fixed', top: 0, left: 0, zIndex: 60 }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        role="button"
        tabIndex={0}
        title={t.sidebar.quickActionDragHint}
        aria-label={aiChatOpen ? t.sidebar.quickActionAiAssistant : t.sidebar.quickActions}
        aria-expanded={open || aiChatOpen}
        className={cn(
          'pointer-events-auto touch-none select-none relative h-14 w-14 rounded-full shadow-xl flex items-center justify-center',
          'bg-linear-to-br from-[oklch(0.55_0.18_250)] to-[oklch(0.45_0.18_250)] text-white',
          'hover:shadow-2xl hover:shadow-blue-500/20 transition-shadow cursor-grab active:cursor-grabbing',
          'border border-white/20',
          focusMode && 'opacity-80',
          (open || aiChatOpen) && 'ring-2 ring-white/40 ring-offset-2 ring-offset-background'
        )}
      >
        <AnimatePresence>
          {open && !aiChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: menuPlacement === 'top' ? 8 : -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: menuPlacement === 'top' ? 8 : -8 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute flex flex-col gap-2 min-w-[180px]',
                menuPlacement === 'top' ? 'bottom-[calc(100%+12px)]' : 'top-[calc(100%+12px)]',
                menuAlign === 'right' ? 'right-0 items-end' : 'left-0 items-start'
              )}
            >
              <div
                className="rounded-2xl border border-border/60 bg-background/95 backdrop-blur-md shadow-xl p-2 flex flex-col gap-1 text-foreground"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.sidebar.quickActions}
                </p>
                {actions.map((action) => (
                  <div key={action.label}>
                    {'dividerBefore' in action && action.dividerBefore && (
                      <div className="my-1 border-t border-border/60" />
                    )}
                    <button
                      onClick={() => runAction(action.onClick)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium hover:bg-muted transition-colors text-left"
                    >
                      <action.icon className={cn('h-4 w-4 shrink-0', action.color)} />
                      <span>{action.label}</span>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {aiChatOpen ? (
            <motion.span
              key="sparkles"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Sparkles className="h-6 w-6" />
            </motion.span>
          ) : open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span
              key="zap"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Zap className="h-6 w-6 fill-current" />
            </motion.span>
          )}
        </AnimatePresence>
        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background" />
      </motion.div>
    </>
  );
}

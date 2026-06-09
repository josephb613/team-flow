'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PageId } from '@/lib/types';

// Navigation order for determining direction
const PAGE_ORDER: PageId[] = [
  'dashboard',
  'tasks',
  'projects',
  'calendar',
  'messages',
  'meetings',
  'files',
  'wiki',
  'activity',
  'members',
  'teams',
  'reports',
  'automations',
  'settings',
];

function getDirection(from: PageId | null, to: PageId): number {
  if (!from) return 0;
  const fromIdx = PAGE_ORDER.indexOf(from);
  const toIdx = PAGE_ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return 0;
  return toIdx > fromIdx ? 1 : -1;
}

interface PageTransitionProps {
  pageId: PageId;
  children: React.ReactNode;
}

export function PageTransition({ pageId, children }: PageTransitionProps) {
  const prevPageRef = useRef<PageId | null>(null);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const dir = getDirection(prevPageRef.current, pageId);
    setDirection(dir);
    prevPageRef.current = pageId;
  }, [pageId]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageId}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{
          type: 'tween',
          ease: [0.25, 0.46, 0.45, 0.94],
          duration: 0.15,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

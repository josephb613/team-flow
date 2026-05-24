"use client";

import { useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import type { PageId } from "@/lib/types";

// Navigation order for determining direction
const PAGE_ORDER: PageId[] = [
  "dashboard",
  "tasks",
  "projects",
  "calendar",
  "messages",
  "meetings",
  "files",
  "wiki",
  "activity",
  "members",
  "teams",
  "reports",
  "automations",
  "settings",
];

function getDirection(from: PageId | null, to: PageId): number {
  if (!from) return 0;
  const fromIdx = PAGE_ORDER.indexOf(from);
  const toIdx = PAGE_ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return 0;
  return toIdx > fromIdx ? 1 : -1;
}

const variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * 40,
    y: 4,
  }),
  center: {
    opacity: 1,
    x: 0,
    y: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -40,
    y: -4,
  }),
};

// Faster transition for better perceived performance
const transition = {
  type: "tween" as const,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
  duration: 0.1, // Reduced from 0.12 to 0.1
};

// Instant transition for reduced motion
const instantTransition = {
  duration: 0,
};

interface PageTransitionProps {
  pageId: PageId;
  children: React.ReactNode;
}

// Optimized selector
const useReducedMotion = () => useAppStore((s) => s.reducedMotion);

export function PageTransition({ pageId, children }: PageTransitionProps) {
  const prevPageRef = useRef<PageId | null>(null);
  const reducedMotion = useReducedMotion();

  // Compute direction synchronously (no state → no extra re-render)
  const direction = useMemo(() => {
    const prevPage = prevPageRef.current;
    prevPageRef.current = pageId;
    return getDirection(prevPage, pageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  // If reduced motion is enabled, render without animation
  if (reducedMotion) {
    return <div key={pageId}>{children}</div>;
  }

  // AnimatePresence with initial={false} prevents animation on first mount.
  // No need for a separate "mounted" state that would disrupt the React tree.
  return (
    <AnimatePresence mode="popLayout" custom={direction} initial={false}>
      <motion.div
        key={pageId}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

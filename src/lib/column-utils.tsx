import type { BoardColumn } from "@/lib/types";
import type { ReactNode } from "react";
import {
  Circle,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Star,
  Flag,
  Target,
  Zap,
  Heart,
  Bookmark,
  Lightbulb,
  Eye,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

export interface ColumnStyle {
  color: string;
  icon: ReactNode;
  bg: string;
  gradient: string;
  headerBg: string;
  dotColor: string;
}

export const ICON_MAP: Record<string, LucideIcon> = {
  "circle": Circle,
  "clock": Clock,
  "alert-circle": AlertCircle,
  "check-circle-2": CheckCircle2,
  "arrow-right": ArrowRight,
  "star": Star,
  "flag": Flag,
  "target": Target,
  "zap": Zap,
  "heart": Heart,
  "bookmark": Bookmark,
  "lightbulb": Lightbulb,
  "eye": Eye,
  "message-circle": MessageCircle,
};

const DEFAULT_BG_COLORS: Record<string, { bg: string; gradient: string; headerBg: string; dotColor: string }> = {
  "todo": {
    bg: "bg-slate-50 dark:bg-slate-800/30",
    gradient: "from-slate-100 to-slate-50 dark:from-slate-800/40 dark:to-slate-800/20",
    headerBg: "bg-slate-100 dark:bg-slate-800/60",
    dotColor: "bg-slate-400",
  },
  "in_progress": {
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    gradient: "from-cyan-100 to-cyan-50 dark:from-cyan-950/40 dark:to-cyan-950/20",
    headerBg: "bg-cyan-100 dark:bg-cyan-900/40",
    dotColor: "bg-cyan-400",
  },
  "review": {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    gradient: "from-amber-100 to-amber-50 dark:from-amber-950/40 dark:to-amber-950/20",
    headerBg: "bg-amber-100 dark:bg-amber-900/40",
    dotColor: "bg-amber-400",
  },
  "done": {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    gradient: "from-emerald-100 to-emerald-50 dark:from-emerald-950/40 dark:to-emerald-950/20",
    headerBg: "bg-emerald-100 dark:bg-emerald-900/40",
    dotColor: "bg-emerald-400",
  },
};

function hexToOklchClass(color: string, opacity: number): string {
  // Simple color-to-style mapping for custom columns
  // We use the color string directly for text/border and compute approximate backgrounds
  return color;
}

const PRESET_COLORS = [
  "#64748b", "#06b6d4", "#f59e0b", "#10b981",
  "#6366f1", "#ec4899", "#ef4444", "#8b5cf6",
  "#14b8a6", "#f97316",
];

export function buildStatusConfig(columns: BoardColumn[]): Record<string, ColumnStyle> {
  const config: Record<string, ColumnStyle> = {};

  for (const col of columns) {
    const IconComponent = ICON_MAP[col.icon] || Circle;
    const defaults = DEFAULT_BG_COLORS[col.slug];

    if (defaults) {
      const colorBase = col.slug === "todo" ? "slate" : col.slug === "in_progress" ? "cyan" : col.slug === "review" ? "amber" : "emerald";
      config[col.slug] = {
        color: `text-${colorBase}-600 dark:text-${colorBase}-400`,
        icon: <IconComponent className="h-4 w-4" />,
        ...defaults,
      };
    } else {
      // For custom columns, derive styling from the color
      const colorIndex = PRESET_COLORS.indexOf(col.color);
      const hueClass = [
        "bg-indigo-50 dark:bg-indigo-950/30",
        "bg-rose-50 dark:bg-rose-950/30",
        "bg-red-50 dark:bg-red-950/30",
        "bg-violet-50 dark:bg-violet-950/30",
        "bg-teal-50 dark:bg-teal-950/30",
        "bg-orange-50 dark:bg-orange-950/30",
      ][colorIndex % 5] || "bg-slate-50 dark:bg-slate-800/30";
      const headerClass = [
        "bg-indigo-100 dark:bg-indigo-900/40",
        "bg-rose-100 dark:bg-rose-900/40",
        "bg-red-100 dark:bg-red-900/40",
        "bg-violet-100 dark:bg-violet-900/40",
        "bg-teal-100 dark:bg-teal-900/40",
        "bg-orange-100 dark:bg-orange-900/40",
      ][colorIndex % 5] || "bg-slate-100 dark:bg-slate-800/60";
      const dotClass = [
        "bg-indigo-400",
        "bg-rose-400",
        "bg-red-400",
        "bg-violet-400",
        "bg-teal-400",
        "bg-orange-400",
      ][colorIndex % 5] || "bg-slate-400";

      config[col.slug] = {
        color: `text-[${col.color}]`,
        icon: <IconComponent className="h-4 w-4" />,
        bg: hueClass,
        gradient: `from-${hueClass.replace("bg-", "").split(" ")[0]}-100 to-transparent`,
        headerBg: headerClass,
        dotColor: dotClass,
      };
    }
  }

  return config;
}

export function getColumnLabel(slug: string, columns: BoardColumn[]): string {
  const col = columns.find((c) => c.slug === slug);
  return col?.name || slug;
}

export const DEFAULT_COLUMNS: BoardColumn[] = [
  { id: "default-todo", name: "À faire", slug: "todo", color: "#64748b", icon: "circle", order: 0, isDefault: true, workspaceId: "" },
  { id: "default-in_progress", name: "En cours", slug: "in_progress", color: "#06b6d4", icon: "clock", order: 1, isDefault: true, workspaceId: "" },
  { id: "default-review", name: "En revue", slug: "review", color: "#f59e0b", icon: "alert-circle", order: 2, isDefault: true, workspaceId: "" },
  { id: "default-done", name: "Terminé", slug: "done", color: "#10b981", icon: "check-circle-2", order: 3, isDefault: true, workspaceId: "" },
];

"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BoardColumn } from "@/lib/types";
import { ICON_MAP } from "@/lib/column-utils";

const COLOR_PRESETS = [
  "#6366f1", "#ec4899", "#ef4444", "#f59e0b", "#10b981",
  "#06b6d4", "#8b5cf6", "#14b8a6", "#f97316", "#64748b",
];

const ICON_OPTIONS = [
  "circle", "clock", "alert-circle", "check-circle-2",
  "star", "flag", "target", "zap", "heart", "bookmark",
  "lightbulb", "eye",
];

interface ColumnActionsProps {
  boardType: "tasks" | "opportunities";
  workspaceId: string;
  onColumnsChanged: (columns: BoardColumn[]) => void;
}

async function refreshColumns(
  workspaceId: string,
  boardType: string,
): Promise<BoardColumn[]> {
  const res = await fetch(
    `/api/workspaces/${workspaceId}/columns?boardType=${boardType}`,
  );
  if (!res.ok) throw new Error("Failed to refresh columns");
  return res.json();
}

// ── AddColumnButton : bouton "+" Trello-like ──────────────────────────────────

export function AddColumnButton({
  boardType,
  workspaceId,
  onColumnsChanged,
}: ColumnActionsProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [icon, setIcon] = useState("circle");
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color,
          icon,
          boardType,
        }),
      });
      if (!res.ok) throw new Error("Failed to create column");
      const fresh = await refreshColumns(workspaceId, boardType);
      onColumnsChanged(fresh);
      setName("");
      setColor("#6366f1");
      setIcon("circle");
      setAdding(false);
    } catch {
      toast.error("Erreur lors de la creation de la colonne");
    } finally {
      setSaving(false);
    }
  }, [name, color, icon, boardType, workspaceId, onColumnsChanged]);

  if (adding) {
    return (
      <div className="shrink-0 w-[240px] sm:w-[260px] rounded-xl border-2 border-dashed border-muted-foreground/20 p-4 bg-muted/30">
        <Input
          placeholder="Nom de la colonne..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-3 h-9 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setAdding(false);
          }}
        />
        {/* Color presets */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              className={cn(
                "w-6 h-6 rounded-full border-2 transition-all",
                color === c
                  ? "border-foreground scale-110"
                  : "border-transparent hover:scale-105",
              )}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        {/* Icon options */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ICON_OPTIONS.map((ico) => {
            const IconComp = ICON_MAP[ico];
            return (
              <button
                key={ico}
                type="button"
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-md border transition-all",
                  icon === ico
                    ? "border-foreground bg-accent"
                    : "border-transparent hover:bg-accent/50",
                )}
                onClick={() => setIcon(ico)}
              >
                {IconComp ? (
                  <IconComp className="h-4 w-4" />
                ) : (
                  <span className="text-xs">{ico.slice(0, 2)}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="h-8 px-3"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Ajouter
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAdding(false)}
            className="h-8 px-3"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setAdding(true)}
      className="shrink-0 w-[240px] sm:w-[260px] rounded-xl border-2 border-dashed border-muted-foreground/15 hover:border-muted-foreground/30 bg-muted/20 hover:bg-muted/40 transition-all flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground hover:text-foreground min-h-[80px]"
    >
      <Plus className="h-4 w-4" />
      Ajouter une colonne
    </button>
  );
}

// ── ColumnHeaderMenu : menu "..." sur chaque entête de colonne ────────────────

interface ColumnHeaderMenuProps extends ColumnActionsProps {
  column: BoardColumn;
  columns: BoardColumn[];
  itemCount: number;
  onRenameStart?: () => void;
  onRenameEnd?: () => void;
}

export function ColumnHeaderMenu({
  column,
  columns,
  boardType,
  workspaceId,
  itemCount,
  onColumnsChanged,
  onRenameStart,
  onRenameEnd,
}: ColumnHeaderMenuProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [saving, setSaving] = useState(false);

  const handleRename = useCallback(async () => {
    if (!editName.trim() || editName.trim() === column.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/columns/${column.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim() }),
        },
      );
      if (!res.ok) throw new Error("Failed to rename column");
      const fresh = await refreshColumns(workspaceId, boardType);
      onColumnsChanged(fresh);
      setEditing(false);
      onRenameEnd?.();
    } catch {
      toast.error("Erreur lors du renommage");
    } finally {
      setSaving(false);
    }
  }, [editName, column.id, column.name, boardType, workspaceId, onColumnsChanged, onRenameEnd]);

  const handleDelete = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/columns/${column.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete column");
      }
      const fresh = await refreshColumns(workspaceId, boardType);
      onColumnsChanged(fresh);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la suppression",
      );
    } finally {
      setSaving(false);
    }
  }, [column.id, boardType, workspaceId, onColumnsChanged]);

  const handleMove = useCallback(
    async (direction: "up" | "down") => {
      const sorted = [...columns].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((c) => c.id === column.id);
      if (idx === -1) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const target = sorted[swapIdx];

      setSaving(true);
      try {
        await Promise.all([
          fetch(
            `/api/workspaces/${workspaceId}/columns/${column.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order: target.order }),
            },
          ),
          fetch(
            `/api/workspaces/${workspaceId}/columns/${target.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order: column.order }),
            },
          ),
        ]);
        const fresh = await refreshColumns(workspaceId, boardType);
        onColumnsChanged(fresh);
      } catch {
        toast.error("Erreur lors du deplacement");
      } finally {
        setSaving(false);
      }
    },
    [column, columns, boardType, workspaceId, onColumnsChanged],
  );

  const handleStartRename = useCallback(() => {
    setEditName(column.name);
    setEditing(true);
    onRenameStart?.();
  }, [column.name, onRenameStart]);

  const canDelete = !column.isDefault && itemCount === 0;
  const sorted = [...columns].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((c) => c.id === column.id);
  const canMoveUp = idx > 0;
  const canMoveDown = idx < sorted.length - 1;

  if (saving) {
    return <span className="text-xs text-muted-foreground animate-pulse">...</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-black/5 dark:hover:bg-white/10"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleStartRename}>
          <Pencil className="h-4 w-4 mr-2" />
          Renommer
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleMove("up")}
          disabled={!canMoveUp}
        >
          <ArrowUp className="h-4 w-4 mr-2" />
          Deplacer a gauche
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleMove("down")}
          disabled={!canMoveDown}
        >
          <ArrowDown className="h-4 w-4 mr-2" />
          Deplacer a droite
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={!canDelete}
          className={!canDelete ? "" : "text-destructive focus:text-destructive"}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {column.isDefault
            ? "Colonne par defaut"
            : itemCount > 0
              ? `${itemCount} element(s)`
              : "Supprimer"}
        </DropdownMenuItem>
      </DropdownMenuContent>
      {/* Inline rename dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => {
              setEditing(false);
              onRenameEnd?.();
            }}
          />
          <div className="relative bg-background border rounded-xl shadow-xl p-4 w-[320px] z-10">
            <p className="text-sm font-medium mb-2">Renommer la colonne</p>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mb-3 h-9"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setEditing(false);
                  onRenameEnd?.();
                }
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleRename} className="h-8">
                <Check className="h-3.5 w-3.5 mr-1" />
                Enregistrer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  onRenameEnd?.();
                }}
                className="h-8"
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </DropdownMenu>
  );
}

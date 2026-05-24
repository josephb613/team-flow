"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  LayoutGrid,
  List,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  File,
  Download,
  MoreHorizontal,
  Trash2,
  Eye,
  HardDrive,
  CloudUpload,
  Search,
  Clock,
  ArrowUpDown,
  Star,
  Share2,
  X,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Move,
  History,
  GripVertical,
  Loader2,
} from "lucide-react";
import { useApiQuery } from "@/hooks/use-api-query";
import type { FileItem, User } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

// File type config with teal-variant colors (no blue/indigo primary)
const fileTypeConfig: Record<
  string,
  {
    icon: React.ReactNode;
    color: string;
    bg: string;
    label: string;
    extBg: string;
  }
> = {
  document: {
    icon: <FileText className="h-5 w-5" />,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-500/10",
    extBg: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
    label: "Document",
  },
  spreadsheet: {
    icon: <FileSpreadsheet className="h-5 w-5" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    extBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    label: "Spreadsheet",
  },
  presentation: {
    icon: <Presentation className="h-5 w-5" />,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    extBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    label: "Presentation",
  },
  image: {
    icon: <ImageIcon className="h-5 w-5" />,
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-500/10",
    extBg: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
    label: "Image",
  },
  pdf: {
    icon: <File className="h-5 w-5" />,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    extBg: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    label: "PDF",
  },
  other: {
    icon: <File className="h-5 w-5" />,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-500/10",
    extBg: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    label: "Other",
  },
};

function getUserInitials(id: string, users: User[]) {
  const user = users.find((u) => u.id === id);
  return user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
    : "??";
}

function getUserName(id: string, users: User[]) {
  return users.find((u) => u.id === id)?.name || "Unknown";
}

function getUserAvatarColor(id: string, users: User[]) {
  const user = users.find((u) => u.id === id);
  return user
    ? `oklch(0.7 ${0.08 + (user.name.charCodeAt(0) % 5) * 0.02} ${140 + (user.name.charCodeAt(1) % 40)})`
    : undefined;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function getFileTypeFromName(name: string): FileItem["type"] {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, FileItem["type"]> = {
    doc: "document",
    docx: "document",
    txt: "document",
    md: "document",
    rtf: "document",
    odt: "document",
    xls: "spreadsheet",
    xlsx: "spreadsheet",
    csv: "spreadsheet",
    ods: "spreadsheet",
    ppt: "presentation",
    pptx: "presentation",
    odp: "presentation",
    png: "image",
    jpg: "image",
    jpeg: "image",
    gif: "image",
    svg: "image",
    webp: "image",
    bmp: "image",
    ico: "image",
    pdf: "pdf",
  };
  return map[ext] || "other";
}

function triggerFilePicker(multiple: boolean = true) {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = multiple;
  return input;
}

// Upload progress item type
interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "complete" | "error";
}

// Mock file version
interface FileVersion {
  id: string;
  version: number;
  uploadedBy: string;
  date: string;
  size: number;
  isCurrent: boolean;
}

function getMockFileVersions(
  fileId: string,
  files: FileItem[],
): FileVersion[] {
  const file = files.find((f) => f.id === fileId);
  if (!file) return [];
  const d = new Date(file.createdAt);
  return [
    {
      id: `fv-${fileId}-3`,
      version: 3,
      uploadedBy: file.uploadedBy,
      date: file.createdAt,
      size: file.size,
      isCurrent: true,
    },
    {
      id: `fv-${fileId}-2`,
      version: 2,
      uploadedBy: "u-3",
      date: new Date(d.getTime() - 86400000 * 3).toISOString(),
      size: Math.round(file.size * 0.85),
      isCurrent: false,
    },
    {
      id: `fv-${fileId}-1`,
      version: 1,
      uploadedBy: "u-1",
      date: new Date(d.getTime() - 86400000 * 10).toISOString(),
      size: Math.round(file.size * 0.6),
      isCurrent: false,
    },
  ];
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

// Sort type
type SortField = "name" | "size" | "type" | "modified" | "owner";
type SortDir = "asc" | "desc";

// Enhanced Grid card with hover zoom, star, and checkbox
function FileGridCard({
  file,
  t,
  isFavorite,
  onToggleFavorite,
  isSelected,
  onToggleSelect,
  onPreview,
  onDownload,
  multiSelectMode,
  users,
}: {
  file: FileItem;
  t: ReturnType<typeof useTranslation>["t"];
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onPreview: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  multiSelectMode: boolean;
  users: User[];
}) {
  const typeConfig = fileTypeConfig[file.type] || fileTypeConfig.other;
  const ext = file.name.split(".").pop()?.toUpperCase() || "";

  return (
    <motion.div variants={item}>
      <Card
        className={cn(
          "group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden relative",
          isSelected && "ring-2 ring-[oklch(0.55_0.15_160)] ring-offset-2",
        )}
      >
        <CardContent className="p-4">
          {/* Top row: checkbox + type icon + badge + star */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {multiSelectMode && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelect(file.id)}
                  className="h-4 w-4 shrink-0"
                />
              )}
              <div
                className={cn(
                  "p-2.5 rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105",
                  typeConfig.bg,
                )}
              >
                <span className={typeConfig.color}>{typeConfig.icon}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge
                className={cn(
                  "text-[9px] px-1.5 py-0.5 font-mono font-bold",
                  typeConfig.extBg,
                )}
              >
                {ext}
              </Badge>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(file.id);
                }}
                className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center transition-all duration-200",
                  isFavorite
                    ? "text-amber-400 hover:text-amber-500"
                    : "text-transparent group-hover:text-muted-foreground/40 hover:!text-amber-400",
                )}
              >
                <Star
                  className={cn("h-3.5 w-3.5", isFavorite && "fill-current")}
                />
              </button>
            </div>
          </div>

          {/* File name */}
          <h3 className="text-sm font-semibold truncate mb-1">{file.name}</h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            {typeConfig.label}
          </p>

          {/* Uploader */}
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback
                className="text-[8px] font-semibold"
                style={{
                  backgroundColor: getUserAvatarColor(file.uploadedBy, users),
                }}
              >
                {getUserInitials(file.uploadedBy, users)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {getUserName(file.uploadedBy, users)}
            </span>
          </div>

          {/* Size + date */}
          <div className="flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground">
            <span className="font-medium">{formatFileSize(file.size)}</span>
            <span>{formatRelativeTime(file.createdAt)}</span>
          </div>

          {/* Hover overlay with quick actions (only in non-multi-select) */}
          {!multiSelectMode && (
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-[2px] flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200"
              onClick={() => onPreview(file)}
            >
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-background/90 shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(file);
                }}
              >
                <Eye className="h-3.5 w-3.5 mr-1" /> {t.files.preview}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-background/90 shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(file);
                }}
              >
                <Download className="h-3.5 w-3.5 mr-1" /> {t.files.download}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Enhanced List row with sortable columns, checkbox, row hover actions
function FileListRow({
  file,
  t,
  isFavorite,
  onToggleFavorite,
  isSelected,
  onToggleSelect,
  onPreview,
  onDownload,
  onShare,
  onDelete,
  multiSelectMode,
  users,
}: {
  file: FileItem;
  t: ReturnType<typeof useTranslation>["t"];
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onPreview: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  multiSelectMode: boolean;
  users: User[];
}) {
  const typeConfig = fileTypeConfig[file.type] || fileTypeConfig.other;
  const ext = file.name.split(".").pop()?.toUpperCase() || "";

  return (
    <motion.div
      variants={item}
      className={cn(
        "grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-3 items-center transition-colors cursor-pointer group",
        isSelected ? "bg-[oklch(0.55_0.15_160)/0.06]" : "hover:bg-muted/30",
      )}
      onClick={() => onPreview(file)}
    >
      {/* Checkbox + icon */}
      <div className="flex items-center gap-2">
        {multiSelectMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(file.id)}
            className="h-4 w-4 shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className={cn("p-2 rounded-lg", typeConfig.bg)}>
          <span className={typeConfig.color}>{typeConfig.icon}</span>
        </div>
      </div>
      {/* Name + star */}
      <div className="min-w-0 flex items-center gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{typeConfig.label}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(file.id);
          }}
          className={cn(
            "shrink-0 transition-all duration-200",
            isFavorite
              ? "text-amber-400"
              : "text-transparent group-hover:text-muted-foreground/40 hover:!text-amber-400",
          )}
        >
          <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
        </button>
      </div>
      {/* Size */}
      <div className="hidden sm:block w-20 text-xs text-muted-foreground text-right font-medium">
        {formatFileSize(file.size)}
      </div>
      {/* Owner */}
      <div className="hidden md:flex items-center gap-1.5 w-28">
        <Avatar className="h-5 w-5">
          <AvatarFallback
            className="text-[8px] font-semibold"
            style={{
              backgroundColor: getUserAvatarColor(file.uploadedBy, users),
            }}
          >
            {getUserInitials(file.uploadedBy, users)}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground truncate">
          {getUserName(file.uploadedBy, users)}
        </span>
      </div>
      {/* Date */}
      <div className="hidden lg:block w-24 text-xs text-muted-foreground">
        {formatDate(file.createdAt)}
      </div>
      {/* Type badge + actions */}
      <div className="flex items-center gap-1 w-28">
        <Badge
          className={cn(
            "text-[9px] px-1.5 py-0.5 font-mono font-bold",
            typeConfig.extBg,
          )}
        >
          {ext}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(file);
          }}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onPreview(file)}>
              <Eye className="h-4 w-4 mr-2" />
              {t.files.preview}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload(file)}>
              <Download className="h-4 w-4 mr-2" />
              {t.files.download}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShare(file)}>
              <Share2 className="h-4 w-4 mr-2" />
              {t.files.share}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(file)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t.files.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

export function FilesView() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("modified");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const currentUser = useAppStore((s) => s.currentUser);
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);

  // API Data
  // useApiQuery auto-adds workspaceId when scoped=true (default)
  const { data: filesData, isLoading: filesLoading } = useApiQuery(
    "/api/files",
  );
  const { data: usersData, isLoading: usersLoading } = useApiQuery(
    "/api/users",
  );
  const apiFiles = useMemo(
    () => (filesData as FileItem[]) ?? [],
    [filesData],
  );
  const users = (usersData as User[]) ?? [];
  const isLoading = filesLoading || usersLoading;

  // Local mutable file state
  const [localFiles, setLocalFiles] = useState<FileItem[]>(apiFiles);
  useEffect(() => {
    setLocalFiles(apiFiles);
  }, [apiFiles]);

  // Upload state
  const [isDragOverPage, setIsDragOverPage] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const dragCounterRef = useRef(0);

  // Real upload: simulates progress, then adds files to state
  const startUpload = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const fileArr = Array.from(fileList);
      const newUploads: UploadItem[] = fileArr.map((f, i) => ({
        id: `upload-${Date.now()}-${i}`,
        name: f.name,
        size: f.size,
        progress: 0,
        status: "uploading" as const,
      }));
      setUploads((prev) => [...prev, ...newUploads]);

      // Simulate progress for each file
      newUploads.forEach((upload, idx) => {
        let progress = 0;
        const originalFile = fileArr[idx];
        const interval = setInterval(
          () => {
            progress += Math.random() * 15 + 5;
            if (progress >= 100) {
              progress = 100;
              clearInterval(interval);
              setUploads((prev) =>
                prev.map((u) =>
                  u.id === upload.id
                    ? { ...u, progress: 100, status: "complete" }
                    : u,
                ),
              );
              // Add file to local state
              const newFile: FileItem = {
                id: `f-${Date.now()}-${idx}`,
                name: originalFile.name,
                type: getFileTypeFromName(originalFile.name),
                size: originalFile.size,
                url: "#",
                uploadedBy: currentUser?.id || "u-1",
                createdAt: new Date().toISOString(),
              };
              setLocalFiles((prev) => [newFile, ...prev]);
            } else {
              setUploads((prev) =>
                prev.map((u) =>
                  u.id === upload.id
                    ? { ...u, progress: Math.min(Math.round(progress), 99) }
                    : u,
                ),
              );
            }
          },
          200 + Math.random() * 300,
        );
      });
    },
    [currentUser],
  );

  // Upload: trigger file picker from header button
  const handleTriggerUpload = useCallback(() => {
    const input = triggerFilePicker(true);
    input.onchange = (e) => startUpload((e.target as HTMLInputElement).files);
    input.click();
  }, [startUpload]);

  // Drag and drop handlers for full-page drop zone
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragOverPage(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOverPage(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOverPage(false);
      startUpload(e.dataTransfer.files);
    },
    [startUpload],
  );

  // Favorites
  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Multi-select
  const toggleSelect = useCallback((id: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  // Download file
  const handleDownload = useCallback((file: FileItem) => {
    const contents: Record<string, string> = {
      document: `# ${file.name}\n\n## Introduction\n\nThis is a sample document content generated for preview purposes.\n\n## Section 1\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n## Section 2\n\n- Point one: Important consideration\n- Point two: Key takeaway\n- Point three: Action item\n\n## Conclusion\n\nThis concludes the document preview.`,
      spreadsheet: `Name,Role,Department,Status\nAlice Chen,Engineer,Engineering,Active\nBob Martel,Designer,Design,Active\nCarol Dubois,Manager,Product,Active\nDavid Park,Analyst,Marketing,On Leave\nEmma Wilson,Engineer,Engineering,Active`,
      presentation: `# ${file.name}\n\n## Slide 1: Executive Summary\n- Overview of key metrics\n- Quarter-over-quarter growth: 24%\n- New initiatives launched: 3\n\n## Slide 2: Team Updates\n- Engineering: 2 new hires\n- Design: Brand refresh complete\n- Marketing: Campaign Q2 ready\n\n## Slide 3: Next Steps\n- Finalize roadmap\n- Client presentations\n- Team offsite planning`,
      image: `[Image: ${file.name}]\n\nResolution: 1920x1080\nFormat: ${file.name.split(".").pop()?.toUpperCase() || "PNG"}\nColor space: sRGB`,
      pdf: `================================================================================\n${file.name}\n================================================================================\n\nTABLE OF CONTENTS\n\n1. Introduction ..................................... 3\n2. Getting Started .................................. 5\n3. Core Concepts .................................... 8\n4. Advanced Usage ................................... 12\n5. Reference ........................................ 15\n\n================================================================================\n\n1. INTRODUCTION\n\nThis document provides comprehensive guidance on the subject matter.\nIt covers all essential aspects and best practices.\n\n================================================================================`,
    };
    const content = contents[file.type] || contents.document;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    // Use a.remove() instead of removeChild to avoid NotFoundError
    // when the element may have already been detached from the DOM
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  // Share file
  const handleShare = useCallback((file: FileItem) => {
    const shareUrl = `${window.location.origin}/files/${file.id}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast.success(`Lien de partage copié pour "${file.name}" !`);
      })
      .catch(() => {
        toast.error("Impossible de copier le lien de partage.");
      });
  }, []);

  // Delete files (single or bulk)
  const handleConfirmDelete = useCallback(() => {
    if (selectedFiles.size > 0) {
      setLocalFiles((prev) => prev.filter((f) => !selectedFiles.has(f.id)));
      setSelectedFiles(new Set());
    } else if (previewFile) {
      setLocalFiles((prev) => prev.filter((f) => f.id !== previewFile.id));
      setPreviewFile(null);
    }
    setShowDeleteDialog(false);
  }, [selectedFiles, previewFile]);

  // Sort and filter
  const filteredAndSorted = useMemo(() => {
    let filtered = localFiles.filter((file) => {
      if (typeFilter !== "all" && file.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          file.name.toLowerCase().includes(q) ||
          file.type.toLowerCase().includes(q)
        );
      }
      return true;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "size":
          cmp = a.size - b.size;
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "modified":
          cmp =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "owner":
          cmp = getUserName(a.uploadedBy, users).localeCompare(
            getUserName(b.uploadedBy, users),
          );
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [typeFilter, searchQuery, sortField, sortDir, localFiles, users]);

  const selectAll = useCallback(() => {
    setSelectedFiles(new Set(filteredAndSorted.map((f) => f.id)));
  }, [filteredAndSorted]);

  const totalSize = localFiles.reduce((acc, f) => acc + f.size, 0);
  const storageUsed = 2.4;
  const storageTotal = 10;
  const storagePercent = Math.round((storageUsed / storageTotal) * 100);

  // Upload stats
  const uploadingCount = uploads.filter((u) => u.status === "uploading").length;
  const uploadTotalSize = uploads.reduce((acc, u) => acc + u.size, 0);

  const filterOptions = [
    { value: "all", label: t.files.all },
    { value: "document", label: t.files.documents },
    { value: "spreadsheet", label: t.files.spreadsheets },
    { value: "presentation", label: t.files.presentations },
    { value: "image", label: t.files.images },
    { value: "pdf", label: t.files.pdfs },
  ];

  // Sort icon helper (render inline, not a component, to avoid static-components lint)
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-[oklch(0.55_0.15_160)]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[oklch(0.55_0.15_160)]" />
    );
  };

  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Preview file versions
  const previewVersions = previewFile
    ? getMockFileVersions(previewFile.id, localFiles)
    : [];

  return (
    <div
      className="space-y-4 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Full-page drag overlay */}
      <AnimatePresence>
        {isDragOverPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-2 border-dashed border-[oklch(0.55_0.15_160)] rounded-2xl p-16 text-center animate-pulse"
            >
              <div className="h-20 w-20 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[oklch(0.55_0.15_160)/10]">
                <CloudUpload className="h-10 w-10 text-[oklch(0.55_0.15_160)]" />
              </div>
              <p className="text-lg font-semibold text-[oklch(0.55_0.15_160)]">
                {t.files.dropHere}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {t.files.orClick}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{t.files.title}</h2>
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {localFiles.length} {t.files.total} · {formatFileSize(totalSize)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t.common.search}
              className="pl-8 h-8 text-xs w-40 bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160)/40]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Multi-select toggle */}
          <Button
            variant={multiSelectMode ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 text-xs",
              multiSelectMode &&
                "bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.48_0.15_160)] text-white",
            )}
            onClick={() => {
              setMultiSelectMode(!multiSelectMode);
              if (multiSelectMode) {
                setSelectedFiles(new Set());
              }
            }}
          >
            <GripVertical className="h-3.5 w-3.5 mr-1" /> {t.files.multiSelect}
          </Button>

          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "grid" | "list")}
          >
            <TabsList className="h-8">
              <TabsTrigger value="grid" className="text-xs px-2.5">
                <LayoutGrid className="h-3.5 w-3.5 mr-1" /> {t.files.grid}
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs px-2.5">
                <List className="h-3.5 w-3.5 mr-1" /> {t.files.list}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            size="sm"
            className="h-8 bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.48_0.15_160)] text-white shadow-sm"
            onClick={handleTriggerUpload}
          >
            <Upload className="h-3.5 w-3.5 mr-1" /> {t.files.upload}
          </Button>
        </div>
      </div>

      {/* Bulk actions bar when files selected */}
      <AnimatePresence>
        {selectedFiles.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-[oklch(0.55_0.15_160)/30] bg-[oklch(0.55_0.15_160)/0.04]">
              <CardContent className="px-4 py-2.5 flex items-center gap-3">
                <span className="text-sm font-semibold text-[oklch(0.45_0.15_160)]">
                  {selectedFiles.size} {t.files.selected}
                </span>
                <div className="h-4 w-px bg-border" />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    filteredAndSorted
                      .filter((f) => selectedFiles.has(f.id))
                      .forEach((f, i) =>
                        setTimeout(() => handleDownload(f), i * 200),
                      );
                  }}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />{" "}
                  {t.files.bulkDownload}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    toast.info(
                      "Fonctionnalité de déplacement à venir dans une prochaine mise à jour.",
                    )
                  }
                >
                  <Move className="h-3.5 w-3.5 mr-1" /> {t.files.bulkMove}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> {t.files.bulkDelete}
                </Button>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={selectAll}
                  >
                    {t.files.selectAll}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={deselectAll}
                  >
                    {t.files.deselectAll}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Storage Usage with gradient fill */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10">
              <HardDrive className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold">
                  {t.files.storageUsage}
                </span>
                <span className="text-xs text-muted-foreground">
                  {storageUsed} GB / {storageTotal} GB
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${storagePercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm"
                />
              </div>
            </div>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {storagePercent}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Upload progress section */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CloudUpload className="h-4 w-4 text-[oklch(0.55_0.15_160)]" />
                    <span className="text-sm font-semibold">
                      {uploadingCount > 0
                        ? t.files.uploading
                        : t.files.uploadComplete}
                    </span>
                    {uploadingCount > 0 && (
                      <Badge className="text-[9px] px-1.5 py-0.5 bg-[oklch(0.55_0.15_160)/15] text-[oklch(0.45_0.15_160)] border-0">
                        {uploadingCount} {t.files.uploadingFiles}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {t.files.totalSize}: {formatFileSize(uploadTotalSize)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setUploads([])}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uploads.map((upload) => (
                    <div key={upload.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate">
                            {upload.name}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-muted-foreground">
                              {formatFileSize(upload.size)}
                            </span>
                            {upload.status === "complete" && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            )}
                            {upload.status === "error" && (
                              <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                            )}
                          </div>
                        </div>
                        <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${upload.progress}%` }}
                            transition={{ duration: 0.3 }}
                            className={cn(
                              "absolute inset-y-0 left-0 rounded-full transition-colors",
                              upload.status === "complete"
                                ? "bg-emerald-500"
                                : upload.status === "error"
                                  ? "bg-rose-500"
                                  : "bg-[oklch(0.55_0.15_160)]",
                            )}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {upload.status === "complete"
                            ? t.files.uploadComplete
                            : upload.status === "error"
                              ? t.files.uploadFailed
                              : `${upload.progress}%`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Zone */}
      <motion.div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
          "border-muted-foreground/20 hover:border-[oklch(0.55_0.15_160)/40] hover:bg-muted/30",
        )}
        onClick={handleTriggerUpload}
      >
        <div className="h-14 w-14 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-muted/50">
          <CloudUpload className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-semibold">{t.files.dropFilesHere}</p>
        <p className="text-xs text-muted-foreground mt-1">{t.files.orClick}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 h-8 text-xs border-[oklch(0.55_0.15_160)/30] text-[oklch(0.55_0.15_160)]"
          onClick={(e) => {
            e.stopPropagation();
            handleTriggerUpload();
          }}
        >
          <Upload className="h-3.5 w-3.5 mr-1" /> {t.files.upload}
        </Button>
      </motion.div>

      {/* File Type Filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {filterOptions.map((opt) => (
          <Button
            key={opt.value}
            variant={typeFilter === opt.value ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-7 text-xs",
              typeFilter === opt.value &&
                "bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.48_0.15_160)] text-white",
            )}
            onClick={() => setTypeFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {filteredAndSorted.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <FolderOpen className="h-8 w-8 opacity-30" />
                </div>
                <p className="text-sm font-medium">{t.files.noFiles}</p>
                <p className="text-xs mt-1">{t.files.tryFilters}</p>
              </div>
            ) : (
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {filteredAndSorted.map((file) => (
                  <FileGridCard
                    key={file.id}
                    file={file}
                    t={t}
                    isFavorite={favorites.has(file.id)}
                    onToggleFavorite={toggleFavorite}
                    isSelected={selectedFiles.has(file.id)}
                    onToggleSelect={toggleSelect}
                    onPreview={setPreviewFile}
                    onDownload={handleDownload}
                    multiSelectMode={multiSelectMode}
                    users={users}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {filteredAndSorted.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <FolderOpen className="h-8 w-8 opacity-30" />
                </div>
                <p className="text-sm font-medium">{t.files.noFiles}</p>
                <p className="text-xs mt-1">{t.files.tryFilters}</p>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden">
                {/* Column headers - sortable */}
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 bg-muted/50 text-xs font-semibold text-muted-foreground">
                  <span className="w-9">
                    {multiSelectMode && (
                      <Checkbox
                        checked={
                          selectedFiles.size === filteredAndSorted.length &&
                          filteredAndSorted.length > 0
                        }
                        onCheckedChange={(checked) => {
                          if (checked) selectAll();
                          else deselectAll();
                        }}
                        className="h-4 w-4"
                      />
                    )}
                  </span>
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSortClick("name")}
                  >
                    <span>{t.files.fileName}</span>
                    {renderSortIcon("name")}
                  </button>
                  <button
                    className="hidden sm:flex items-center gap-1 w-20 justify-end hover:text-foreground transition-colors"
                    onClick={() => handleSortClick("size")}
                  >
                    <span>{t.files.fileSize}</span>
                    {renderSortIcon("size")}
                  </button>
                  <button
                    className="hidden md:flex items-center gap-1 w-28 hover:text-foreground transition-colors"
                    onClick={() => handleSortClick("owner")}
                  >
                    <span>{t.files.owner}</span>
                    {renderSortIcon("owner")}
                  </button>
                  <button
                    className="hidden lg:flex items-center gap-1 w-24 hover:text-foreground transition-colors"
                    onClick={() => handleSortClick("modified")}
                  >
                    <span>{t.files.modified}</span>
                    {renderSortIcon("modified")}
                  </button>
                  <button
                    className="flex items-center gap-1 w-28 hover:text-foreground transition-colors"
                    onClick={() => handleSortClick("type")}
                  >
                    <span>{t.files.fileType}</span>
                    {renderSortIcon("type")}
                  </button>
                </div>
                <motion.div
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="divide-y"
                >
                  {filteredAndSorted.map((file) => (
                    <FileListRow
                      key={file.id}
                      file={file}
                      t={t}
                      isFavorite={favorites.has(file.id)}
                      onToggleFavorite={toggleFavorite}
                      isSelected={selectedFiles.has(file.id)}
                      onToggleSelect={toggleSelect}
                      onPreview={setPreviewFile}
                      onDownload={handleDownload}
                      onShare={handleShare}
                      onDelete={(f) => {
                        setPreviewFile(f);
                        setSelectedFiles(new Set());
                        setShowDeleteDialog(true);
                      }}
                      multiSelectMode={multiSelectMode}
                      users={users}
                    />
                  ))}
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Preview Panel */}
      <Dialog
        open={!!previewFile}
        onOpenChange={(open) => {
          if (!open) setPreviewFile(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          {previewFile && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const typeConfig =
                      fileTypeConfig[previewFile.type] || fileTypeConfig.other;
                    return (
                      <div className={cn("p-1.5 rounded-lg", typeConfig.bg)}>
                        <span className={typeConfig.color}>
                          {typeConfig.icon}
                        </span>
                      </div>
                    );
                  })()}
                  <span className="truncate">{previewFile.name}</span>
                </DialogTitle>
                <DialogDescription>{t.files.fileDetails}</DialogDescription>
              </DialogHeader>

              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-4 pb-4">
                  {/* Preview area */}
                  {previewFile.type === "image" ? (
                    <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 border aspect-video flex items-center justify-center">
                      <div className="text-center bg-white/5 rounded-2xl p-8 backdrop-blur-sm">
                        <ImageIcon className="h-16 w-16 mx-auto mb-3 text-white/20" />
                        <p className="text-sm font-semibold text-white/80">
                          {previewFile.name}
                        </p>
                        <p className="text-xs text-white/40 mt-1">
                          {formatFileSize(previewFile.size)} ·{" "}
                          {previewFile.name.split(".").pop()?.toUpperCase() ||
                            "PNG"}
                        </p>
                      </div>
                    </div>
                  ) : previewFile.type === "spreadsheet" ? (
                    <div className="rounded-xl overflow-hidden bg-muted/30 border">
                      <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border-b">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          {previewFile.name}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-muted/40">
                              <th className="text-left px-4 py-2 font-semibold text-muted-foreground">
                                Nom
                              </th>
                              <th className="text-left px-4 py-2 font-semibold text-muted-foreground">
                                Role
                              </th>
                              <th className="text-left px-4 py-2 font-semibold text-muted-foreground">
                                Departement
                              </th>
                              <th className="text-left px-4 py-2 font-semibold text-muted-foreground">
                                Statut
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              [
                                "Alice Chen",
                                "Ingenieur",
                                "Engineering",
                                "Actif",
                              ],
                              ["Bob Martel", "Designer", "Design", "Actif"],
                              ["Carol Dubois", "Manager", "Product", "Actif"],
                              [
                                "David Park",
                                "Analyste",
                                "Marketing",
                                "En conge",
                              ],
                              [
                                "Emma Wilson",
                                "Ingenieur",
                                "Engineering",
                                "Actif",
                              ],
                            ].map((row, i) => (
                              <tr
                                key={i}
                                className={i % 2 === 0 ? "bg-muted/10" : ""}
                              >
                                {row.map((cell, j) => (
                                  <td
                                    key={j}
                                    className="px-4 py-2 text-muted-foreground"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : previewFile.type === "presentation" ? (
                    <div className="rounded-xl overflow-hidden bg-muted/30 border">
                      <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border-b">
                        <Presentation className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                          {previewFile.name}
                        </span>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="rounded-lg bg-gradient-to-br from-amber-500/5 to-amber-500/10 border border-amber-500/20 p-5">
                          <h4 className="text-base font-bold mb-3">
                            Slide 1 : Synthese executive
                          </h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                              Apercu des indicateurs cles
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                              Croissance trimestrielle : +24%
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                              Nouvelles initiatives lancees : 3
                            </li>
                          </ul>
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          — Diapositive 1 / 12 —
                        </p>
                      </div>
                    </div>
                  ) : previewFile.type === "pdf" ? (
                    <div className="rounded-xl overflow-hidden bg-white dark:bg-slate-800 border shadow-sm">
                      <div className="bg-rose-500/10 px-4 py-3 border-b flex items-center gap-2">
                        <File className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                          {previewFile.name}
                        </span>
                      </div>
                      <div className="p-6 space-y-4 text-sm">
                        <h3 className="text-lg font-bold text-foreground">
                          Table des matieres
                        </h3>
                        <div className="space-y-2 text-muted-foreground">
                          {[
                            "1. Introduction",
                            "2. Demarrage",
                            "3. Concepts fondamentaux",
                            "4. Utilisation avancee",
                            "5. Reference",
                          ].map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between py-1 border-b border-border/30"
                            >
                              <span>{item}</span>
                              <span className="text-xs text-muted-foreground/50">
                                p. {i * 4 + 3}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-4 border-t">
                          <h4 className="font-bold text-foreground mb-2">
                            1. Introduction
                          </h4>
                          <p className="text-muted-foreground leading-relaxed">
                            Ce document fournit un guide complet sur le sujet.
                            Il couvre tous les aspects essentiels et les
                            meilleures pratiques pour une mise en oeuvre
                            reussie.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : previewFile.type === "document" ? (
                    <div className="rounded-xl overflow-hidden bg-muted/30 border">
                      <div className="flex items-center gap-2 px-4 py-3 bg-teal-500/10 border-b">
                        <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        <span className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                          {previewFile.name}
                        </span>
                      </div>
                      <div className="p-6 space-y-4">
                        <h3 className="text-lg font-bold text-foreground">
                          Introduction
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Ce document presente une synthese des travaux en cours
                          et des prochaines etapes pour le projet.
                        </p>
                        <h4 className="text-base font-semibold text-foreground mt-4">
                          Section 1 : Contexte
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Lorem ipsum dolor sit amet, consectetur adipiscing
                          elit. Sed do eiusmod tempor incididunt ut labore et
                          dolore magna aliqua. Ut enim ad minim veniam, quis
                          nostrud exercitation ullamco laboris.
                        </p>
                        <h4 className="text-base font-semibold text-foreground mt-4">
                          Section 2 : Recommandations
                        </h4>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                            Point 1 : Optimiser les processus existants
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                            Point 2 : Mettre en place un suivi regulier
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                            Point 3 : Former l equipe aux nouveaux outils
                          </li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden bg-muted/30 border p-6">
                      <div className="flex items-center gap-3 mb-3">
                        {(() => {
                          const typeConfig =
                            fileTypeConfig[previewFile.type] ||
                            fileTypeConfig.other;
                          return (
                            <div
                              className={cn("p-3 rounded-xl", typeConfig.bg)}
                            >
                              <span className={typeConfig.color}>
                                {typeConfig.icon}
                              </span>
                            </div>
                          );
                        })()}
                        <div>
                          <p className="text-sm font-semibold">
                            {previewFile.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {
                              (
                                fileTypeConfig[previewFile.type] ||
                                fileTypeConfig.other
                              ).label
                            }
                          </p>
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 text-xs font-mono text-muted-foreground leading-relaxed border">
                        <p className="opacity-50">
                          {"// File content preview..."}
                        </p>
                        <p className="mt-1">Apercu du contenu du fichier.</p>
                        <p>Dans une application reelle, ceci afficherait</p>
                        <p>le contenu reel du fichier.</p>
                      </div>
                    </div>
                  )}

                  {/* File metadata */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        {t.files.fileSize}
                      </p>
                      <p className="text-sm font-semibold">
                        {formatFileSize(previewFile.size)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        {t.files.fileType}
                      </p>
                      <p className="text-sm font-semibold">
                        {
                          (
                            fileTypeConfig[previewFile.type] ||
                            fileTypeConfig.other
                          ).label
                        }
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        {t.files.uploadedOn}
                      </p>
                      <p className="text-sm font-semibold">
                        {formatDate(previewFile.createdAt)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        {t.files.uploadedBy}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback
                            className="text-[6px] font-semibold"
                            style={{
                              backgroundColor: getUserAvatarColor(
                                previewFile.uploadedBy,
                                users,
                              ),
                            }}
                          >
                            {getUserInitials(previewFile.uploadedBy, users)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-semibold">
                          {getUserName(previewFile.uploadedBy, users)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.48_0.15_160)] text-white"
                      onClick={() => handleDownload(previewFile)}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />{" "}
                      {t.files.download}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleShare(previewFile)}
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1" /> {t.files.share}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => {
                        setSelectedFiles(new Set());
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> {t.files.delete}
                    </Button>
                  </div>

                  <Separator />

                  {/* Version history */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <History className="h-4 w-4 text-[oklch(0.55_0.15_160)]" />
                      {t.files.versionHistory}
                    </h4>
                    <div className="space-y-2">
                      {previewVersions.map((version) => (
                        <div
                          key={version.id}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-lg transition-colors",
                            version.isCurrent
                              ? "bg-[oklch(0.55_0.15_160)/0.06] border border-[oklch(0.55_0.15_160)/20]"
                              : "bg-muted/30",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full shrink-0",
                                version.isCurrent
                                  ? "bg-[oklch(0.55_0.15_160)]"
                                  : "bg-muted-foreground/30",
                              )}
                            />
                            <div>
                              <span className="text-xs font-medium">
                                {t.files.version} {version.version}
                              </span>
                              {version.isCurrent && (
                                <Badge className="ml-1.5 text-[8px] px-1 py-0 bg-[oklch(0.55_0.15_160)/15] text-[oklch(0.45_0.15_160)] border-0">
                                  {t.files.current}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>{formatFileSize(version.size)}</span>
                            <span>{formatRelativeTime(version.date)}</span>
                            <span>
                              {getUserName(version.uploadedBy, users)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              </div>
              {t.files.delete}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedFiles.size > 0
                ? `Are you sure you want to delete ${selectedFiles.size} selected file(s)? This action cannot be undone.`
                : "Are you sure you want to delete this file? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600 text-white"
              onClick={handleConfirmDelete}
            >
              {t.files.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

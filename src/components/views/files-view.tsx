'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Folder,
  Search,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { mockFiles, mockUsers } from '@/lib/mock-data';
import type { FileItem } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

// File type config with teal-variant colors (no blue/indigo primary)
const fileTypeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string; extBg: string }> = {
  document: {
    icon: <FileText className="h-5 w-5" />,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-500/10',
    extBg: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
    label: 'Document',
  },
  spreadsheet: {
    icon: <FileSpreadsheet className="h-5 w-5" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
    extBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    label: 'Spreadsheet',
  },
  presentation: {
    icon: <Presentation className="h-5 w-5" />,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    extBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    label: 'Presentation',
  },
  image: {
    icon: <ImageIcon className="h-5 w-5" />,
    color: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-500/10',
    extBg: 'bg-pink-500/15 text-pink-700 dark:text-pink-300',
    label: 'Image',
  },
  pdf: {
    icon: <File className="h-5 w-5" />,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10',
    extBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    label: 'PDF',
  },
  other: {
    icon: <File className="h-5 w-5" />,
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-500/10',
    extBg: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
    label: 'Other',
  },
};

function getUserInitials(id: string) {
  const user = mockUsers.find((u) => u.id === id);
  return user ? user.name.split(' ').map((n) => n[0]).join('') : '??';
}

function getUserName(id: string) {
  return mockUsers.find((u) => u.id === id)?.name || 'Unknown';
}

function getUserAvatarColor(id: string) {
  const user = mockUsers.find((u) => u.id === id);
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
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

// Grid card with hover overlay
function FileGridCard({ file, t }: { file: FileItem; t: ReturnType<typeof useTranslation>['t'] }) {
  const typeConfig = fileTypeConfig[file.type] || fileTypeConfig.other;
  const ext = file.name.split('.').pop()?.toUpperCase() || '';

  return (
    <motion.div variants={item}>
      <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden relative">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className={cn('p-2.5 rounded-xl shadow-sm', typeConfig.bg)}>
              <span className={typeConfig.color}>{typeConfig.icon}</span>
            </div>
            <Badge className={cn('text-[9px] px-1.5 py-0.5 font-mono font-bold', typeConfig.extBg)}>
              {ext}
            </Badge>
          </div>

          <h3 className="text-sm font-semibold truncate mb-1">{file.name}</h3>
          <p className="text-[11px] text-muted-foreground mb-3">{typeConfig.label}</p>

          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-5 w-5">
              <AvatarFallback
                className="text-[8px] font-semibold"
                style={{ backgroundColor: getUserAvatarColor(file.uploadedBy) }}
              >
                {getUserInitials(file.uploadedBy)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{getUserName(file.uploadedBy)}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground">
            <span className="font-medium">{formatFileSize(file.size)}</span>
            <span>{formatRelativeTime(file.createdAt)}</span>
          </div>

          {/* Hover overlay with quick actions */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <Button variant="outline" size="sm" className="h-8 text-xs bg-background/90 shadow-sm">
              <Eye className="h-3.5 w-3.5 mr-1" /> {t.files.view}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs bg-background/90 shadow-sm">
              <Download className="h-3.5 w-3.5 mr-1" /> {t.files.download}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs bg-background/90 shadow-sm text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// List row with proper columns
function FileListRow({ file, t }: { file: FileItem; t: ReturnType<typeof useTranslation>['t'] }) {
  const typeConfig = fileTypeConfig[file.type] || fileTypeConfig.other;
  const ext = file.name.split('.').pop()?.toUpperCase() || '';

  return (
    <motion.div
      variants={item}
      className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors cursor-pointer group"
    >
      <div className={cn('p-2 rounded-lg', typeConfig.bg)}>
        <span className={typeConfig.color}>{typeConfig.icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{typeConfig.label}</p>
      </div>
      <div className="hidden sm:block w-20 text-xs text-muted-foreground text-right font-medium">{formatFileSize(file.size)}</div>
      <div className="hidden md:flex items-center gap-1.5 w-28">
        <Avatar className="h-5 w-5">
          <AvatarFallback
            className="text-[8px] font-semibold"
            style={{ backgroundColor: getUserAvatarColor(file.uploadedBy) }}
          >
            {getUserInitials(file.uploadedBy)}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground truncate">{getUserName(file.uploadedBy)}</span>
      </div>
      <div className="hidden lg:block w-24 text-xs text-muted-foreground">{formatDate(file.createdAt)}</div>
      <div className="flex items-center gap-1 w-24">
        <Badge className={cn('text-[9px] px-1.5 py-0.5 font-mono font-bold', typeConfig.extBg)}>
          {ext}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />{t.files.view}</DropdownMenuItem>
            <DropdownMenuItem><Download className="h-4 w-4 mr-2" />{t.files.download}</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />{t.files.delete}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

// Upload zone with drag-drop visual feedback
function UploadZone({ t }: { t: ReturnType<typeof useTranslation>['t'] }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <motion.div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer',
        isDragOver
          ? 'border-[oklch(0.55_0.15_160)] bg-[oklch(0.55_0.15_160)/5] scale-[1.01]'
          : 'border-muted-foreground/20 hover:border-[oklch(0.55_0.15_160)/40] hover:bg-muted/30'
      )}
    >
      <div className={cn(
        'h-14 w-14 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-all duration-200',
        isDragOver ? 'bg-[oklch(0.55_0.15_160)/15]' : 'bg-muted/50'
      )}>
        <CloudUpload className={cn(
          'h-7 w-7 transition-all duration-200',
          isDragOver ? 'text-[oklch(0.55_0.15_160)] scale-110' : 'text-muted-foreground/50'
        )} />
      </div>
      <p className="text-sm font-semibold">
        {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
      </p>
      <p className="text-xs text-muted-foreground mt-1">or click to browse from your computer</p>
      <Button variant="outline" size="sm" className="mt-3 h-8 text-xs">
        <Upload className="h-3.5 w-3.5 mr-1" /> {t.files.upload}
      </Button>
    </motion.div>
  );
}

export function FilesView() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredFiles = mockFiles.filter((file) => {
    if (typeFilter === 'all') return true;
    return file.type === typeFilter;
  });

  const totalSize = mockFiles.reduce((acc, f) => acc + f.size, 0);
  const storageUsed = 2.4; // GB mock
  const storageTotal = 10; // GB mock
  const storagePercent = Math.round((storageUsed / storageTotal) * 100);

  const filterOptions = [
    { value: 'all', label: t.files.all },
    { value: 'document', label: t.files.documents },
    { value: 'spreadsheet', label: t.files.spreadsheets },
    { value: 'presentation', label: t.files.presentations },
    { value: 'image', label: t.files.images },
    { value: 'pdf', label: t.files.pdfs },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t.files.title}</h2>
          <p className="text-sm text-muted-foreground">
            {mockFiles.length} files · {formatFileSize(totalSize)} {t.files.total}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
            <TabsList className="h-8">
              <TabsTrigger value="grid" className="text-xs px-2.5">
                <LayoutGrid className="h-3.5 w-3.5 mr-1" /> {t.files.grid}
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs px-2.5">
                <List className="h-3.5 w-3.5 mr-1" /> {t.files.list}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" className="h-8 bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.48_0.15_160)] text-white shadow-sm">
            <Upload className="h-3.5 w-3.5 mr-1" /> {t.files.upload}
          </Button>
        </div>
      </div>

      {/* Storage Usage with gradient fill */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10">
              <HardDrive className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold">{t.files.storageUsage}</span>
                <span className="text-xs text-muted-foreground">{storageUsed} GB / {storageTotal} GB</span>
              </div>
              <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${storagePercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm"
                />
              </div>
            </div>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{storagePercent}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <UploadZone t={t} />

      {/* File Type Filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {filterOptions.map((opt) => (
          <Button
            key={opt.value}
            variant={typeFilter === opt.value ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-7 text-xs',
              typeFilter === opt.value && 'bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.48_0.15_160)] text-white'
            )}
            onClick={() => setTypeFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {filteredFiles.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <File className="h-8 w-8 opacity-30" />
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
                {filteredFiles.map((file) => (
                  <FileGridCard key={file.id} file={file} t={t} />
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
            {filteredFiles.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <File className="h-8 w-8 opacity-30" />
                </div>
                <p className="text-sm font-medium">{t.files.noFiles}</p>
                <p className="text-xs mt-1">{t.files.tryFilters}</p>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden">
                {/* Column headers */}
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 bg-muted/50 text-xs font-semibold text-muted-foreground">
                  <span className="w-9"></span>
                  <div className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors">
                    <span>Name</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                  <span className="hidden sm:block w-20 text-right">Size</span>
                  <span className="hidden md:block w-28">Uploaded By</span>
                  <span className="hidden lg:block w-24">Date</span>
                  <span className="w-24">Type</span>
                </div>
                <motion.div variants={container} initial="hidden" animate="show" className="divide-y">
                  {filteredFiles.map((file) => (
                    <FileListRow key={file.id} file={file} t={t} />
                  ))}
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

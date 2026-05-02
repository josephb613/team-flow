'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Search,
  Edit3,
  ChevronRight,
  FileText,
  Clock,
  Home,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import { mockWikiPages, mockUsers } from '@/lib/mock-data';
import type { WikiPage } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

function getUserName(id: string) {
  return mockUsers.find((u) => u.id === id)?.name || 'Unknown';
}

function getUserInitials(id: string) {
  const user = mockUsers.find((u) => u.id === id);
  return user ? user.name.split(' ').map((n) => n[0]).join('') : '??';
}

function getUserAvatarColor(id: string) {
  const user = mockUsers.find((u) => u.id === id);
  return user
    ? `oklch(0.7 ${0.08 + (user.name.charCodeAt(0) % 5) * 0.02} ${140 + (user.name.charCodeAt(1) % 40)})`
    : undefined;
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
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Build a nested tree structure from flat list
interface WikiTreeNode {
  page: WikiPage;
  children: WikiTreeNode[];
}

function buildTree(pages: WikiPage[]): WikiTreeNode[] {
  const map = new Map<string, WikiTreeNode>();
  const roots: WikiTreeNode[] = [];

  pages.forEach((page) => {
    map.set(page.id, { page, children: [] });
  });

  pages.forEach((page) => {
    const node = map.get(page.id)!;
    if (page.parentId && map.has(page.parentId)) {
      map.get(page.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// Get breadcrumb path for a page
function getBreadcrumbs(pageId: string, pages: WikiPage[]): WikiPage[] {
  const breadcrumbs: WikiPage[] = [];
  let current = pages.find((p) => p.id === pageId);

  while (current) {
    breadcrumbs.unshift(current);
    current = current.parentId
      ? pages.find((p) => p.id === current!.parentId)
      : undefined;
  }

  return breadcrumbs;
}

function WikiTreeItem({
  node,
  selectedId,
  onSelect,
  depth = 0,
}: {
  node: WikiTreeNode;
  selectedId: string;
  onSelect: (page: WikiPage) => void;
  depth?: number;
}) {
  const isSelected = node.page.id === selectedId;
  const hasChildren = node.children.length > 0;
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => {
          onSelect(node.page);
          if (hasChildren) setExpanded(!expanded);
        }}
        className={cn(
          'w-full flex items-center gap-1.5 px-2 py-2 rounded-lg text-sm transition-all duration-150 text-left group',
          isSelected
            ? 'bg-[oklch(0.55_0.15_160)/0.12] text-[oklch(0.45_0.15_160)] font-semibold shadow-sm'
            : 'hover:bg-muted/50 text-foreground'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <ChevronRight
            className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200', expanded && 'rotate-90')}
          />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span className="shrink-0 text-sm">{node.page.icon}</span>
        <span className="truncate text-xs font-medium">{node.page.title}</span>
        {hasChildren && (
          <Badge variant="outline" className="ml-auto text-[8px] px-1 py-0 h-3.5 font-mono shrink-0 opacity-50">
            {node.children.length}
          </Badge>
        )}
      </button>
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <WikiTreeItem
                key={child.page.id}
                node={child}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple markdown-like rendering with better typography
function renderContent(content: string) {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('# ')) {
      return (
        <h1 key={i} className="text-2xl font-extrabold mt-8 mb-3 first:mt-0 tracking-tight text-foreground">
          {line.slice(2)}
        </h1>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h2 key={i} className="text-lg font-bold mt-6 mb-2 pb-2 border-b border-border/50 text-foreground">
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith('### ')) {
      return (
        <h3 key={i} className="text-base font-semibold mt-5 mb-1.5 text-foreground">
          {line.slice(4)}
        </h3>
      );
    }
    if (line.startsWith('- ')) {
      return (
        <li key={i} className="ml-5 text-sm text-muted-foreground list-disc leading-relaxed py-0.5">
          {line.slice(2)}
        </li>
      );
    }
    if (line.startsWith('```')) {
      return (
        <div key={i} className="my-3 rounded-lg bg-muted/80 border border-border/50 p-4 overflow-x-auto">
          <code className="text-xs font-mono text-foreground/80">
            {line.slice(3) || '// code block'}
          </code>
        </div>
      );
    }
    if (line.startsWith('`') && line.endsWith('`')) {
      return (
        <p key={i} className="text-sm leading-relaxed">
          <code className="px-1.5 py-0.5 rounded-md bg-muted/80 text-xs font-mono text-[oklch(0.55_0.15_160)] dark:text-[oklch(0.65_0.15_160)]">
            {line.slice(1, -1)}
          </code>
        </p>
      );
    }
    if (line.trim() === '') {
      return <div key={i} className="h-2" />;
    }
    return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
  });
}

export function WikiView() {
  const { t } = useTranslation();
  const [selectedPageId, setSelectedPageId] = useState<string>(mockWikiPages[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  const tree = useMemo(() => buildTree(mockWikiPages), []);

  const selectedPage = mockWikiPages.find((p) => p.id === selectedPageId);

  const breadcrumbs = useMemo(() => {
    return selectedPageId ? getBreadcrumbs(selectedPageId, mockWikiPages) : [];
  }, [selectedPageId]);

  const filteredPages = searchQuery
    ? mockWikiPages.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mockWikiPages;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-10rem)]">
      {/* Left Sidebar - Page Tree */}
      <div className="w-full lg:w-64 shrink-0">
        <Card className="h-full overflow-hidden">
          <CardContent className="p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.wiki.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-[oklch(0.55_0.15_160)] hover:text-[oklch(0.45_0.15_160)] hover:bg-[oklch(0.55_0.15_160)/10]"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t.wiki.searchPages}
                className="pl-8 h-8 text-xs bg-muted/30 border-transparent focus:border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Page Tree */}
            <ScrollArea className="h-[calc(100vh-18rem)]">
              {searchQuery ? (
                <div className="space-y-0.5">
                  {filteredPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => setSelectedPageId(page.id)}
                      className={cn(
                        'w-full flex items-center gap-1.5 px-2 py-2 rounded-lg text-sm transition-all duration-150 text-left',
                        selectedPageId === page.id
                          ? 'bg-[oklch(0.55_0.15_160)/0.12] text-[oklch(0.45_0.15_160)] font-semibold'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <span className="text-sm">{page.icon}</span>
                      <span className="truncate text-xs font-medium">{page.title}</span>
                    </button>
                  ))}
                  {filteredPages.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Search className="h-6 w-6 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No pages found</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {tree.map((node) => (
                    <WikiTreeItem
                      key={node.page.id}
                      node={node}
                      selectedId={selectedPageId}
                      onSelect={(page) => setSelectedPageId(page.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            <Separator className="my-2" />
            <Button variant="ghost" size="sm" className="w-full h-8 text-xs justify-start text-[oklch(0.55_0.15_160)] hover:text-[oklch(0.45_0.15_160)] hover:bg-[oklch(0.55_0.15_160)/10]">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> {t.wiki.newPage}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <Card className="h-full overflow-hidden">
          <CardContent className="p-0">
            {selectedPage ? (
              <div className="flex flex-col h-full">
                {/* Breadcrumb navigation */}
                <div className="flex items-center gap-1 px-6 py-3 border-b bg-muted/20">
                  <Home className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {breadcrumbs.map((page, idx) => (
                    <div key={page.id} className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                      <button
                        onClick={() => setSelectedPageId(page.id)}
                        className={cn(
                          'text-xs transition-colors hover:text-foreground',
                          idx === breadcrumbs.length - 1
                            ? 'font-semibold text-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
                        {page.icon} {page.title}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Page Header */}
                <div className="px-6 pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{selectedPage.icon}</span>
                      <div>
                        <h2 className="text-xl font-bold tracking-tight">{selectedPage.title}</h2>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback
                              className="text-[8px] font-semibold"
                              style={{ backgroundColor: getUserAvatarColor(selectedPage.lastEditedBy) }}
                            >
                              {getUserInitials(selectedPage.lastEditedBy)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {t.wiki.lastEditedBy} <span className="font-semibold text-foreground">{getUserName(selectedPage.lastEditedBy)}</span>
                          </span>
                          <span className="text-xs text-muted-foreground/60">·</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(selectedPage.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs shadow-sm border-[oklch(0.55_0.15_160)/30] text-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.55_0.15_160)/10]"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1" /> {t.wiki.edit}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Page Content */}
                <ScrollArea className="flex-1">
                  <motion.div
                    key={selectedPage.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-6 py-5 max-w-3xl"
                  >
                    {renderContent(selectedPage.content)}
                  </motion.div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <FileText className="h-8 w-8 opacity-30" />
                </div>
                <p className="text-sm font-medium">Select a page to view</p>
                <p className="text-xs mt-1">Choose a page from the sidebar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

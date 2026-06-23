'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { useApiData, apiSend } from '@/hooks/use-pmp-data';
import { appendWorkspaceQuery } from '@/lib/workspace-query';
import type { WikiPageNode } from '@/lib/wiki-api';
import { downloadBlob } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Lightbulb,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function WikiTreeNode({
  node,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
  lessonsLabel,
}: {
  node: WikiPageNode;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  lessonsLabel: string;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const expanded = expandedIds.has(node.id);

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60',
          selectedId === node.id && 'bg-muted font-medium'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          <span
            role="button"
            tabIndex={0}
            className="shrink-0 p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onToggle(node.id);
              }
            }}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </span>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="shrink-0">{node.icon}</span>
        <span className="truncate flex-1">{node.title}</span>
        {node.kind === 'lessons_index' && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
            {lessonsLabel}
          </Badge>
        )}
      </button>
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <WikiTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
              lessonsLabel={lessonsLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WikiView() {
  const { t } = useTranslation();
  const w = t.wiki;
  const activeOrganizationId = useAppStore((s) => s.activeOrganizationId);
  const wikiLessonsProjectId = useAppStore((s) => s.wikiLessonsProjectId);
  const clearWikiLessonsProjectId = useAppStore((s) => s.clearWikiLessonsProjectId);
  const currentUser = useAppStore((s) => s.currentUser);

  const treeUrl = useMemo(() => {
    if (!activeOrganizationId) return null;
    return appendWorkspaceQuery('/api/wiki?tree=true', activeOrganizationId);
  }, [activeOrganizationId]);

  const lessonsUrl = useMemo(() => {
    if (!activeOrganizationId) return null;
    return appendWorkspaceQuery('/api/wiki?kind=lessons_index', activeOrganizationId);
  }, [activeOrganizationId]);

  const { data: tree, loading: treeLoading, refetch: refetchTree } = useApiData<WikiPageNode[]>(treeUrl);
  const { data: lessonsPages, refetch: refetchLessons } = useApiData<WikiPageNode[]>(lessonsUrl);

  const [activeTab, setActiveTab] = useState<'pages' | 'lessons'>('pages');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editIcon, setEditIcon] = useState('📄');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (!wikiLessonsProjectId || !lessonsPages?.length) return;
    setActiveTab('lessons');
    const match = lessonsPages.find((p) => p.projectId === wikiLessonsProjectId);
    if (match) setSelectedId(match.id);
    clearWikiLessonsProjectId();
  }, [wikiLessonsProjectId, lessonsPages, clearWikiLessonsProjectId]);

  const flatPages = useMemo(() => {
    const result: WikiPageNode[] = [];
    const walk = (nodes: WikiPageNode[]) => {
      for (const n of nodes) {
        result.push(n);
        if (n.children?.length) walk(n.children);
      }
    };
    if (tree) walk(tree);
    return result;
  }, [tree]);

  const selectedPage = flatPages.find((p) => p.id === selectedId) ?? null;
  const isLessonsIndex = selectedPage?.kind === 'lessons_index';

  useEffect(() => {
    if (selectedPage) {
      setEditTitle(selectedPage.title);
      setEditContent(selectedPage.content);
      setEditIcon(selectedPage.icon);
    }
  }, [selectedPage?.id, selectedPage?.title, selectedPage?.content, selectedPage?.icon]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCreatePage = async (parentId?: string) => {
    if (!activeOrganizationId) return;
    try {
      const url = appendWorkspaceQuery('/api/wiki', activeOrganizationId);
      const { ok, data } = await apiSend(url, 'POST', {
        title: w.newPageTitle,
        content: '',
        icon: '📄',
        parentId: parentId ?? null,
        lastEditedBy: currentUser?.id ?? null,
      });
      if (!ok) throw new Error('create failed');
      const page = data as WikiPageNode;
      await refetchTree();
      setSelectedId(page.id);
      setExpandedIds((prev) => new Set([...prev, ...(parentId ? [parentId] : [])]));
      toast.success(w.pageCreated);
    } catch {
      toast.error(w.saveError);
    }
  };

  const handleSave = async () => {
    if (!selectedId || !activeOrganizationId || isLessonsIndex) return;
    setSaving(true);
    try {
      const url = appendWorkspaceQuery(`/api/wiki/${selectedId}`, activeOrganizationId);
      await apiSend(url, 'PATCH', {
        title: editTitle.trim(),
        content: editContent,
        icon: editIcon,
        lastEditedBy: currentUser?.id ?? null,
      });
      await refetchTree();
      await refetchLessons();
      toast.success(w.pageSaved);
    } catch {
      toast.error(w.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !activeOrganizationId || isLessonsIndex) return;
    try {
      const url = appendWorkspaceQuery(`/api/wiki/${selectedId}`, activeOrganizationId);
      await apiSend(url, 'DELETE');
      await refetchTree();
      setSelectedId(null);
      toast.success(w.pageDeleted);
    } catch {
      toast.error(w.deleteError);
    }
  };

  const handleExport = () => {
    if (!selectedPage) return;
    const blob = new Blob([editContent || selectedPage.content], { type: 'text/markdown;charset=utf-8' });
    const slug = (editTitle || selectedPage.title).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
    downloadBlob(blob, `${slug || 'wiki-page'}.md`);
    toast.success(w.exported);
  };

  const displayTree = activeTab === 'lessons'
    ? (lessonsPages ?? []).map((p) => ({ ...p, children: [] }))
    : (tree ?? []);

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[oklch(0.55_0.15_160)]" />
            {w.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{w.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleCreatePage(selectedId ?? undefined)}>
            <Plus className="h-4 w-4 mr-1" />
            {selectedId && !isLessonsIndex ? w.newSubpage : w.newPage}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pages' | 'lessons')}>
        <TabsList>
          <TabsTrigger value="pages" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {w.tabPages}
          </TabsTrigger>
          <TabsTrigger value="lessons" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            {w.tabLessons}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="flex h-[calc(100vh-220px)] min-h-[400px] gap-4 rounded-xl border bg-card overflow-hidden">
            <div className="w-64 shrink-0 border-r flex flex-col">
              <div className="px-3 py-2 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {activeTab === 'lessons' ? w.tabLessons : w.pageTree}
              </div>
              <ScrollArea className="flex-1 p-2">
                {treeLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : displayTree.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 px-2">{w.noPages}</p>
                ) : (
                  displayTree.map((node) => (
                    <WikiTreeNode
                      key={node.id}
                      node={node}
                      depth={0}
                      selectedId={selectedId}
                      expandedIds={expandedIds}
                      onSelect={handleSelect}
                      onToggle={handleToggle}
                      lessonsLabel={w.lessonsBadge}
                    />
                  ))
                )}
              </ScrollArea>
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              {!selectedPage ? (
                <div className="flex flex-1 items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">{w.selectPage}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 border-b px-4 py-2 flex-wrap">
                    <Input
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                      className="w-12 text-center px-1"
                      disabled={isLessonsIndex}
                    />
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 min-w-[120px] font-medium"
                      disabled={isLessonsIndex}
                    />
                    <Button variant="ghost" size="sm" onClick={() => setShowPreview((p) => !p)}>
                      {showPreview ? w.hidePreview : w.showPreview}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleExport}>
                      <Download className="h-4 w-4" />
                    </Button>
                    {!isLessonsIndex && (
                      <>
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          <span className="ml-1 hidden sm:inline">{w.save}</span>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleDelete}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {isLessonsIndex && (
                      <Badge variant="secondary" className="text-xs">
                        {w.autoGenerated}
                      </Badge>
                    )}
                    {isLessonsIndex && selectedPage.projectId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!activeOrganizationId || !selectedPage.projectId) return;
                          const url = appendWorkspaceQuery(
                            `/api/export?type=lessons&format=md&projectId=${selectedPage.projectId}`,
                            activeOrganizationId
                          );
                          const res = await fetch(url);
                          if (!res.ok) {
                            toast.error(w.saveError);
                            return;
                          }
                          const text = await res.text();
                          const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
                          downloadBlob(blob, 'LESSONS_LEARNED.md');
                          toast.success(w.exported);
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        LESSONS_LEARNED.md
                      </Button>
                    )}
                  </div>
                  <div className={cn('flex flex-1 min-h-0', showPreview ? 'grid grid-cols-2' : '')}>
                    <div className="flex flex-col min-h-0 border-r">
                      <div className="px-3 py-1.5 text-xs text-muted-foreground border-b">{w.editor}</div>
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="flex-1 resize-none rounded-none border-0 font-mono text-sm min-h-[300px]"
                        readOnly={isLessonsIndex}
                        placeholder={w.contentPlaceholder}
                      />
                    </div>
                    {showPreview && (
                      <div className="flex flex-col min-h-0 overflow-hidden">
                        <div className="px-3 py-1.5 text-xs text-muted-foreground border-b">{w.preview}</div>
                        <ScrollArea className="flex-1 p-4">
                          <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                            {editContent || w.emptyContent}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

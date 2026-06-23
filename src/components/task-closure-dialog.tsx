'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useAppData } from '@/hooks/use-app-data';
import { useTranslation } from '@/lib/i18n';
import { appendWorkspaceQuery } from '@/lib/workspace-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

interface TaskCommentApi {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
  user?: { id: string; name: string };
}

const MIN_LENGTH = 20;

export function TaskClosureDialog() {
  const { t } = useTranslation();
  const tc = t.taskClosure;
  const closureTaskId = useAppStore((s) => s.closureTaskId);
  const closeTaskClosureDialog = useAppStore((s) => s.closeTaskClosureDialog);
  const addNotification = useAppStore((s) => s.addNotification);
  const setSelectedTask = useAppStore((s) => s.setSelectedTask);
  const activeOrganizationId = useAppStore((s) => s.activeOrganizationId);
  const currentUser = useAppStore((s) => s.currentUser);
  const { tasks, refetch, getUserName } = useAppData();

  const [resolution, setResolution] = useState('');
  const [lessons, setLessons] = useState('');
  const [tags, setTags] = useState('');
  const [comments, setComments] = useState<TaskCommentApi[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const task = closureTaskId ? tasks.find((t) => t.id === closureTaskId) : null;

  useEffect(() => {
    if (!closureTaskId || !activeOrganizationId) {
      setComments([]);
      return;
    }

    setResolution('');
    setLessons('');
    setTags(task?.tags?.join(', ') ?? '');
    setLoadingComments(true);

    const url = appendWorkspaceQuery(
      `/api/tasks/${closureTaskId}/comments`,
      activeOrganizationId
    );

    fetch(url)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: TaskCommentApi[]) => setComments(data))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [closureTaskId, activeOrganizationId, task?.tags]);

  const resolutionValid = resolution.trim().length >= MIN_LENGTH;
  const lessonsValid = lessons.trim().length >= MIN_LENGTH;
  const canSubmit = resolutionValid && lessonsValid && !submitting;

  const handleClose = async () => {
    if (!closureTaskId || !activeOrganizationId || !canSubmit) return;

    setSubmitting(true);
    try {
      const url = appendWorkspaceQuery(
        `/api/tasks/${closureTaskId}/close`,
        activeOrganizationId
      );
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionSummary: resolution.trim(),
          lessonsLearned: lessons.trim(),
          tags: tagList,
          closedById: currentUser?.id ?? null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'close_failed');
      }

      await refetch();
      closeTaskClosureDialog();

      if (task) {
        setSelectedTask({ ...task, status: 'done' } as unknown as Record<string, unknown>);
      }

      if (task?.reporterId && task.reporterId !== currentUser?.id) {
        addNotification({
          type: 'task_completed',
          title: tc.success,
          message: task.title,
        });
      }

      toast.success(tc.success);
    } catch {
      toast.error(tc.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={Boolean(closureTaskId)}
      onOpenChange={(open) => {
        if (!open) closeTaskClosureDialog();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            {tc.title}
          </DialogTitle>
          <DialogDescription>
            {task ? (
              <>
                <span className="font-medium text-foreground">{task.title}</span>
                <br />
                {tc.subtitle}
              </>
            ) : (
              tc.subtitle
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="closure-resolution">
              {tc.resolution} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="closure-resolution"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder={tc.resolutionPlaceholder}
              rows={4}
            />
            {!resolutionValid && resolution.length > 0 && (
              <p className="text-xs text-muted-foreground">{tc.minChars}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="closure-lessons">
              {tc.lessons} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="closure-lessons"
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
              placeholder={tc.lessonsPlaceholder}
              rows={4}
            />
            {!lessonsValid && lessons.length > 0 && (
              <p className="text-xs text-muted-foreground">{tc.minChars}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="closure-tags">{tc.tags}</Label>
            <Input
              id="closure-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={tc.tagsPlaceholder}
            />
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {tc.recentComments}
            </p>
            {loadingComments ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tc.noComments}</p>
            ) : (
              <ul className="space-y-2 max-h-32 overflow-y-auto">
                {comments.slice(0, 5).map((c) => (
                  <li key={c.id} className="text-sm">
                    <span className="font-medium">
                      {c.user?.name ?? getUserName(c.userId)}:
                    </span>{' '}
                    <span className="text-muted-foreground">{c.content}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => closeTaskClosureDialog()} disabled={submitting}>
            {tc.cancel}
          </Button>
          <Button onClick={handleClose} disabled={!canSubmit}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {tc.submitting}
              </>
            ) : (
              tc.submit
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

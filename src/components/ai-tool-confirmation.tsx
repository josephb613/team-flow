'use client';

import { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface PendingActionPreview {
  actionId: string;
  toolName: string;
  preview: Record<string, unknown>;
}

interface AiToolConfirmationProps {
  action: PendingActionPreview;
  workspaceId: string;
  userId?: string;
  onConfirmed: (result: { toolName: string; data: unknown }) => void;
  onCancelled: () => void;
  className?: string;
}

function formatPreviewField(
  value: unknown,
  formatBoolean: (value: boolean) => string
): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return formatBoolean(value);
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '—';
  return String(value);
}

function PreviewRow({
  label,
  value,
  highlight,
  formatBoolean,
}: {
  label: string;
  value: unknown;
  highlight?: boolean;
  formatBoolean: (value: boolean) => string;
}) {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex gap-2">
      <dt className="shrink-0">{label}:</dt>
      <dd className={highlight ? 'text-foreground' : undefined}>
        {formatPreviewField(value, formatBoolean)}
      </dd>
    </div>
  );
}

function ChangeRow({
  label,
  from,
  to,
  formatBoolean,
}: {
  label: string;
  from: unknown;
  to: unknown;
  formatBoolean: (value: boolean) => string;
}) {
  if (to === null || to === undefined) return null;
  return (
    <div className="flex gap-2">
      <dt className="shrink-0">{label}:</dt>
      <dd>
        {formatPreviewField(from, formatBoolean)} → {formatPreviewField(to, formatBoolean)}
      </dd>
    </div>
  );
}

const SUCCESS_MESSAGE_KEYS = {
  create_task: 'taskCreated',
  update_task_status: 'statusUpdated',
  update_task: 'taskUpdated',
  create_risk: 'riskCreated',
  update_risk: 'riskUpdated',
  create_change_request: 'changeRequestCreated',
  update_change_request_status: 'changeRequestStatusUpdated',
  log_time_entry: 'timeEntryLogged',
  create_sprint: 'sprintCreated',
} as const;

const TITLE_MESSAGE_KEYS = {
  create_task: 'createTaskTitle',
  update_task_status: 'updateStatusTitle',
  update_task: 'updateTaskTitle',
  create_risk: 'createRiskTitle',
  update_risk: 'updateRiskTitle',
  create_change_request: 'createChangeRequestTitle',
  update_change_request_status: 'updateChangeRequestStatusTitle',
  log_time_entry: 'logTimeEntryTitle',
  create_sprint: 'createSprintTitle',
} as const;

export function AiToolConfirmation({
  action,
  workspaceId,
  userId,
  onConfirmed,
  onCancelled,
  className,
}: AiToolConfirmationProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'confirming' | 'cancelled' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const preview = action.preview;
  const tc = t.aiChat.toolConfirm;
  const formatBoolean = (value: boolean) => (value ? tc.yes : tc.no);
  const titleKey = TITLE_MESSAGE_KEYS[action.toolName as keyof typeof TITLE_MESSAGE_KEYS];
  const successKey = SUCCESS_MESSAGE_KEYS[action.toolName as keyof typeof SUCCESS_MESSAGE_KEYS];

  const handleConfirm = async () => {
    setStatus('confirming');
    setError(null);

    try {
      const response = await fetch('/api/ai/confirm-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: action.actionId,
          workspaceId,
          userId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Confirmation failed');
      }

      setStatus('done');
      onConfirmed({ toolName: data.toolName, data: data.data });
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : tc.error);
    }
  };

  const handleCancel = () => {
    setStatus('cancelled');
    onCancelled();
  };

  if (status === 'cancelled') {
    return (
      <div className={cn('rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground', className)}>
        {tc.cancelled}
      </div>
    );
  }

  if (status === 'done') {
    const message = successKey ? tc[successKey] : tc.genericTitle;
    return (
      <div className={cn('rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400', className)}>
        {message}
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 space-y-2', className)}>
      <p className="text-xs font-medium text-foreground">
        {titleKey ? tc[titleKey] : tc.genericTitle}
      </p>

      <dl className="space-y-1 text-xs text-muted-foreground">
        {action.toolName === 'create_task' && (
          <>
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldTitle} value={preview.title} highlight />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldProject} value={preview.projectName} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldPriority} value={preview.priority} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldDueDate} value={preview.dueDate} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldAssignee} value={preview.assigneeName} />
          </>
        )}

        {action.toolName === 'update_task_status' && (
          <>
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldTask} value={preview.taskTitle} highlight />
            <ChangeRow formatBoolean={formatBoolean} label={tc.fieldStatusChange} from={preview.currentStatus} to={preview.newStatus} />
          </>
        )}

        {action.toolName === 'update_task' && (
          <>
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldTask} value={preview.taskTitle} highlight />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldProject} value={preview.projectName} />
            <ChangeRow formatBoolean={formatBoolean} label={tc.fieldStatusChange} from={preview.currentStatus} to={preview.newStatus} />
            <ChangeRow formatBoolean={formatBoolean} label={tc.fieldPriority} from={preview.currentPriority} to={preview.newPriority} />
            <ChangeRow formatBoolean={formatBoolean} label={tc.fieldDueDate} from={preview.currentDueDate} to={preview.newDueDate} />
            <ChangeRow formatBoolean={formatBoolean} label={tc.fieldAssignee} from={preview.currentAssigneeName} to={preview.newAssigneeName} />
          </>
        )}

        {action.toolName === 'create_risk' && (
          <>
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldTitle} value={preview.title} highlight />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldProject} value={preview.projectName} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldDescription} value={preview.description} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldCategory} value={preview.category} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldProbability} value={preview.probability} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldImpact} value={preview.impact} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldResponse} value={preview.response} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldMitigationPlan} value={preview.mitigationPlan} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldOwner} value={preview.ownerName} />
          </>
        )}

        {action.toolName === 'update_risk' && (
          <>
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldRisk} value={preview.riskTitle} highlight />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldProject} value={preview.projectName} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldTitle} value={preview.newTitle} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldDescription} value={preview.newDescription} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldCategory} value={preview.newCategory} />
            <ChangeRow formatBoolean={formatBoolean} label={tc.fieldProbability} from={preview.currentProbability} to={preview.newProbability} />
            <ChangeRow formatBoolean={formatBoolean} label={tc.fieldImpact} from={preview.currentImpact} to={preview.newImpact} />
            <ChangeRow formatBoolean={formatBoolean} label={tc.fieldStatusChange} from={preview.currentStatus} to={preview.newStatus} />
            <ChangeRow formatBoolean={formatBoolean} label={tc.fieldResponse} from={preview.currentResponse} to={preview.newResponse} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldMitigationPlan} value={preview.newMitigationPlan} />
            <ChangeRow formatBoolean={formatBoolean} label={tc.fieldOwner} from={preview.currentOwnerName} to={preview.newOwnerName} />
          </>
        )}

        {action.toolName === 'create_change_request' && (
          <>
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldTitle} value={preview.title} highlight />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldProject} value={preview.projectName} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldDescription} value={preview.description} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldPriority} value={preview.priority} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldImpactScope} value={preview.impactScope} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldImpactDays} value={preview.impactDays} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldImpactCost} value={preview.impactCost} />
          </>
        )}

        {action.toolName === 'update_change_request_status' && (
          <>
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldChangeRequest} value={preview.changeRequestTitle} highlight />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldProject} value={preview.projectName} />
            <ChangeRow formatBoolean={formatBoolean} label={tc.fieldStatusChange} from={preview.currentStatus} to={preview.newStatus} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldDecision} value={preview.decision} />
          </>
        )}

        {action.toolName === 'log_time_entry' && (
          <>
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldTask} value={preview.taskTitle} highlight />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldProject} value={preview.projectName} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldHours} value={preview.hours} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldDate} value={preview.date} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldDescription} value={preview.description} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldBillable} value={preview.billable} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldUser} value={preview.userName} />
          </>
        )}

        {action.toolName === 'create_sprint' && (
          <>
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldSprintName} value={preview.name} highlight />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldProject} value={preview.projectName} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldGoal} value={preview.goal} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldStartDate} value={preview.startDate} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldEndDate} value={preview.endDate} />
            <PreviewRow formatBoolean={formatBoolean} label={tc.fieldStatusChange} value={preview.status} />
          </>
        )}
      </dl>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2 pt-0.5">
        <button
          onClick={handleConfirm}
          disabled={status === 'confirming'}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {status === 'confirming' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          {tc.confirm}
        </button>
        <button
          onClick={handleCancel}
          disabled={status === 'confirming'}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-muted-foreground border border-border/60 hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors"
        >
          <X className="h-3 w-3" />
          {tc.cancel}
        </button>
      </div>
    </div>
  );
}

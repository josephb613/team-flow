import type { ToolDefinition } from './types';

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'list_tasks',
    kind: 'read',
    description:
      'List tasks in the workspace. Filter by status, project, or overdue flag. Returns task summaries.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'review', 'done'],
          description: 'Filter by task status',
        },
        projectId: { type: 'string', description: 'Filter by project ID' },
        overdue: {
          type: 'boolean',
          description: 'If true, only return tasks past their due date',
        },
        limit: {
          type: 'number',
          description: 'Max number of tasks to return (default 20)',
        },
      },
    },
  },
  {
    name: 'create_task',
    kind: 'write',
    description:
      'Propose creating a new task. Returns a preview for user confirmation — does NOT create immediately.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title (required)' },
        projectId: { type: 'string', description: 'Target project ID' },
        description: { type: 'string', description: 'Task description' },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Task priority (default medium)',
        },
        dueDate: { type: 'string', description: 'Due date in ISO 8601 format' },
        assigneeId: { type: 'string', description: 'Assignee user ID' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task_status',
    kind: 'write',
    description:
      'Propose updating a task status. Returns a preview for user confirmation — does NOT update immediately.',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to update' },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'review', 'done'],
          description: 'New status',
        },
      },
      required: ['taskId', 'status'],
    },
  },
  {
    name: 'update_task',
    kind: 'write',
    description:
      'Propose updating a task (status, priority, due date, assignee). Returns a preview for user confirmation — does NOT update immediately.',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID to update' },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'review', 'done'],
          description: 'New status',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'New priority',
        },
        dueDate: { type: 'string', description: 'New due date in ISO 8601 format (null to clear)' },
        assigneeId: { type: 'string', description: 'Assignee user ID (null to unassign)' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'create_risk',
    kind: 'write',
    description:
      'Propose creating a new risk in the risk register. Returns a preview for user confirmation — does NOT create immediately.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Risk title (required)' },
        projectId: { type: 'string', description: 'Target project ID' },
        description: { type: 'string', description: 'Risk description' },
        category: {
          type: 'string',
          enum: ['technical', 'external', 'organizational', 'project_management'],
          description: 'Risk category (default technical)',
        },
        probability: { type: 'number', description: 'Probability 1-5 (default 3)' },
        impact: { type: 'number', description: 'Impact 1-5 (default 3)' },
        status: {
          type: 'string',
          enum: ['open', 'mitigating', 'closed', 'occurred'],
          description: 'Risk status (default open)',
        },
        response: {
          type: 'string',
          enum: ['avoid', 'mitigate', 'transfer', 'accept'],
          description: 'Response strategy (default mitigate)',
        },
        mitigationPlan: { type: 'string', description: 'Mitigation plan' },
        ownerId: { type: 'string', description: 'Risk owner user ID' },
        taskIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Related task IDs',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_risk',
    kind: 'write',
    description:
      'Propose updating an existing risk. Returns a preview for user confirmation — does NOT update immediately.',
    parameters: {
      type: 'object',
      properties: {
        riskId: { type: 'string', description: 'Risk ID to update' },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description' },
        category: {
          type: 'string',
          enum: ['technical', 'external', 'organizational', 'project_management'],
        },
        probability: { type: 'number', description: 'Probability 1-5' },
        impact: { type: 'number', description: 'Impact 1-5' },
        status: {
          type: 'string',
          enum: ['open', 'mitigating', 'closed', 'occurred'],
        },
        response: {
          type: 'string',
          enum: ['avoid', 'mitigate', 'transfer', 'accept'],
        },
        mitigationPlan: { type: 'string', description: 'Mitigation plan' },
        ownerId: { type: 'string', description: 'Risk owner user ID' },
        taskIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Related task IDs',
        },
      },
      required: ['riskId'],
    },
  },
  {
    name: 'create_change_request',
    kind: 'write',
    description:
      'Propose creating a change request. Returns a preview for user confirmation — does NOT create immediately.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Change request title (required)' },
        projectId: { type: 'string', description: 'Target project ID' },
        description: { type: 'string', description: 'Description of the change' },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Priority (default medium)',
        },
        impactScope: { type: 'string', description: 'Scope of impact' },
        impactDays: { type: 'number', description: 'Estimated schedule impact in days' },
        impactCost: { type: 'number', description: 'Estimated cost impact' },
        requestedById: { type: 'string', description: 'Requester user ID' },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_change_request_status',
    kind: 'write',
    description:
      'Propose approving or rejecting a change request. Returns a preview for user confirmation — does NOT update immediately.',
    parameters: {
      type: 'object',
      properties: {
        changeRequestId: { type: 'string', description: 'Change request ID' },
        status: {
          type: 'string',
          enum: ['approved', 'rejected'],
          description: 'Decision status',
        },
        decision: { type: 'string', description: 'Optional decision rationale' },
      },
      required: ['changeRequestId', 'status'],
    },
  },
  {
    name: 'log_time_entry',
    kind: 'write',
    description:
      'Propose logging time on a task. Returns a preview for user confirmation — does NOT log immediately.',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task ID (required)' },
        hours: { type: 'number', description: 'Hours logged (required)' },
        date: { type: 'string', description: 'Date in ISO 8601 format (default today)' },
        description: { type: 'string', description: 'Work description' },
        billable: { type: 'boolean', description: 'Billable flag (default true)' },
        userId: { type: 'string', description: 'User ID (default current user)' },
      },
      required: ['taskId', 'hours'],
    },
  },
  {
    name: 'create_sprint',
    kind: 'write',
    description:
      'Propose creating a new sprint. Returns a preview for user confirmation — does NOT create immediately.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Sprint name (required)' },
        projectId: { type: 'string', description: 'Target project ID' },
        goal: { type: 'string', description: 'Sprint goal' },
        startDate: { type: 'string', description: 'Start date in ISO 8601 format' },
        endDate: { type: 'string', description: 'End date in ISO 8601 format' },
        status: {
          type: 'string',
          enum: ['planning', 'active', 'completed'],
          description: 'Sprint status (default planning)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_projects',
    kind: 'read',
    description: 'List all projects in the current workspace with task counts.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_risks',
    kind: 'read',
    description: 'List risks sorted by score (probability × impact). Returns top risks.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Filter by project ID' },
        limit: { type: 'number', description: 'Max risks to return (default 10)' },
        activeOnly: {
          type: 'boolean',
          description: 'Only open or mitigating risks (default true)',
        },
      },
    },
  },
  {
    name: 'get_evm_summary',
    kind: 'read',
    description:
      'Get Earned Value Management summary: BAC, PV, EV, AC, CPI, SPI, health status.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project ID. If omitted, returns all projects in workspace.',
        },
      },
    },
  },
  {
    name: 'list_change_requests',
    kind: 'read',
    description: 'List change requests. Can filter to pending only.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Filter by project ID' },
        pendingOnly: {
          type: 'boolean',
          description: 'Only pending change requests (default false)',
        },
      },
    },
  },
  {
    name: 'get_workload',
    kind: 'read',
    description:
      'Get team workload: open hours per member vs weekly capacity, utilization levels.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_critical_path',
    kind: 'read',
    description:
      'Compute critical path for a project using CPM. Requires projectId.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (required)' },
      },
      required: ['projectId'],
    },
  },
];

export function getGroqToolDefinitions(): Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}> {
  return TOOL_DEFINITIONS.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export function getToolKind(name: string): 'read' | 'write' | undefined {
  return TOOL_DEFINITIONS.find((t) => t.name === name)?.kind;
}

export const WRITE_TOOL_NAMES = new Set(
  TOOL_DEFINITIONS.filter((t) => t.kind === 'write').map((t) => t.name)
);

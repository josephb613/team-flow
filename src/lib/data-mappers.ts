import type {
  Task,
  Project,
  Sprint,
  Milestone,
  TimeEntry,
  PMUser,
  Automation,
  AuditLogEntry,
  CalendarEvent,
  Organization,
  TaskStatus,
  TaskPriority,
  ProjectStatus,
  UserRole,
  UserStatus,
} from './types';

// ─── UI constants (no mock data) ───────────────────────────────────────────

export const taskStatusColors: Record<string, { bg: string; text: string; border: string }> = {
  todo: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/20' },
  in_progress: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
  review: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/20' },
  done: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
};

export const taskStatusLabels: Record<string, Record<string, string>> = {
  fr: { todo: 'À faire', in_progress: 'En cours', review: 'En revue', done: 'Terminé' },
  en: { todo: 'To Do', in_progress: 'In Progress', review: 'In Review', done: 'Done' },
};

export const taskPriorityColors: Record<string, { bg: string; text: string; border: string }> = {
  urgent: { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-500/20' },
  high: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
  medium: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/20' },
  low: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/20' },
};

export const projectStatusColors: Record<string, { bg: string; text: string; border: string }> = {
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
  on_hold: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
  completed: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/20' },
  archived: { bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/20' },
};

export const projectStatusLabels: Record<string, Record<string, string>> = {
  fr: { active: 'Actif', on_hold: 'En pause', completed: 'Terminé', archived: 'Archivé' },
  en: { active: 'Active', on_hold: 'On Hold', completed: 'Completed', archived: 'Archived' },
};

export const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  super_admin: { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-500/20' },
  org_admin: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
  project_manager: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
  member: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/20' },
  viewer: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/20' },
  admin: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
  guest: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-500/20' },
};

// ─── Prisma raw types (API payload) ────────────────────────────────────────

type DbUser = {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  status: string;
  assignedTasks?: { id: string }[];
  workspaceMembers?: { workspaceId: string; workspace: { id: string; name: string } }[];
};

type DbTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  tags: string;
  dueDate: Date | null;
  projectId: string;
  assigneeId: string | null;
  creatorId: string | null;
  sprintId: string | null;
  milestoneId: string | null;
  estimatedHours: number;
  createdAt: Date;
  updatedAt: Date;
  subtasks?: { id: string; title: string; completed: boolean }[];
  project?: { workspaceId: string };
  timeEntries?: { hours: number }[];
};

type DbProject = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  status: string;
  workspaceId: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tasks?: DbTask[];
};

type DbWorkspace = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  color: string;
  icon: string;
  logo?: string | null;
  createdAt: Date;
  members?: { userId: string }[];
  projects?: { id: string }[];
};

type DbSprint = {
  id: string;
  name: string;
  projectId: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  goal: string | null;
  velocity: number | null;
  createdAt: Date;
  tasks?: { id: string }[];
  project?: { workspaceId: string };
};

type DbMilestone = {
  id: string;
  title: string;
  description: string | null;
  projectId: string;
  dueDate: Date | null;
  status: string;
  color: string;
  completedAt: Date | null;
  createdAt: Date;
  tasks?: { id: string }[];
  project?: { workspaceId: string };
};

type DbTimeEntry = {
  id: string;
  taskId: string;
  projectId: string;
  userId: string | null;
  date: Date;
  hours: number;
  description: string | null;
  billable: boolean;
  createdAt: Date;
};

type DbTeam = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  workspaceId: string;
  teamMembers: { userId: string }[];
};

type DbChannel = {
  id: string;
  name: string;
  type: string;
  workspaceId: string;
  channelMembers: { userId: string }[];
  messages?: { id: string; read?: boolean }[];
};

type DbMeeting = {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  duration: number;
  status: string;
  link: string | null;
  projectId: string | null;
  meetingMembers: { userId: string }[];
};

type DbAutomation = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  lastRun: Date | null;
  runCount: number;
  workspaceId: string;
};

type DbActivityLog = {
  id: string;
  type: string;
  userId: string;
  description: string;
  targetId: string | null;
  targetType: string | null;
  workspaceId: string;
  createdAt: Date;
};

// ─── Mappers ───────────────────────────────────────────────────────────────

function mapRole(role: string): UserRole {
  const map: Record<string, UserRole> = {
    admin: 'org_admin',
    super_admin: 'super_admin',
    org_admin: 'org_admin',
    project_manager: 'project_manager',
    member: 'member',
    viewer: 'viewer',
    guest: 'viewer',
  };
  return map[role] ?? 'member';
}

function mapUserStatus(status: string): UserStatus {
  if (['online', 'away', 'offline', 'busy'].includes(status)) {
    return status as UserStatus;
  }
  return 'offline';
}

function iso(d: Date | string | null | undefined): string {
  if (!d) return '';
  return d instanceof Date ? d.toISOString() : d;
}

function dateOnly(d: Date | string | null | undefined): string {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString().split('T')[0];
}

export function mapUsers(raw: DbUser[], workspaceId?: string): PMUser[] {
  return raw.map((u) => {
    const membership = workspaceId
      ? u.workspaceMembers?.find((m) => m.workspaceId === workspaceId)
      : u.workspaceMembers?.[0];
    const ws = membership?.workspace;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar ?? '',
      role: mapRole(u.role),
      status: mapUserStatus(u.status),
      organizationId: ws?.id ?? membership?.workspaceId ?? '',
      organizationName: ws?.name ?? '',
      lastActive: new Date().toISOString(),
      taskCount: u.assignedTasks?.length ?? 0,
    };
  });
}

export function mapTasks(raw: DbTask[], users: PMUser[]): Task[] {
  return raw.map((t) => {
    const orgId = t.project?.workspaceId ?? '';
    const loggedHours = t.timeEntries?.reduce((s, e) => s + e.hours, 0) ?? 0;
    return {
      id: t.id,
      title: t.title,
      description: t.description ?? '',
      status: (t.status as TaskStatus) || 'todo',
      priority: (t.priority as TaskPriority) || 'medium',
      projectId: t.projectId,
      sprintId: t.sprintId ?? undefined,
      assigneeId: t.assigneeId ?? users[0]?.id ?? '',
      reporterId: t.creatorId ?? t.assigneeId ?? users[0]?.id ?? '',
      dueDate: dateOnly(t.dueDate),
      tags: t.tags ? t.tags.split(',').filter(Boolean) : [],
      subtasks: (t.subtasks ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        completed: s.completed,
      })),
      estimatedHours: t.estimatedHours,
      loggedHours,
      milestoneId: t.milestoneId ?? undefined,
      organizationId: orgId,
      createdAt: iso(t.createdAt),
      updatedAt: iso(t.updatedAt),
    };
  });
}

export function mapProjects(raw: DbProject[]): Project[] {
  return raw.map((p) => {
    const tasks = p.tasks ?? [];
    const completed = tasks.filter((t) => t.status === 'done').length;
    const memberIds = [
      ...new Set(
        tasks.flatMap((t) => [t.assigneeId, t.creatorId].filter(Boolean) as string[])
      ),
    ];
    return {
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      icon: p.icon,
      color: p.color,
      status: (p.status as ProjectStatus) || 'active',
      progress: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
      memberIds,
      taskCount: tasks.length,
      completedTasks: completed,
      dueDate: dateOnly(p.endDate),
      startDate: dateOnly(p.startDate),
      organizationId: p.workspaceId,
      createdAt: iso(p.createdAt),
      updatedAt: iso(p.updatedAt),
    };
  });
}

export function mapOrganizations(raw: DbWorkspace[]): Organization[] {
  return raw.map((w) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    description: w.description ?? '',
    type: 'company' as const,
    color: w.color,
    icon: w.icon,
    logo: w.logo ?? null,
    country: '',
    memberCount: w.members?.length ?? 0,
    memberIds: w.members?.map((m) => m.userId) ?? [],
    projectCount: w.projects?.length ?? 0,
    isActive: true,
    createdAt: dateOnly(w.createdAt),
  }));
}

export function mapSprints(raw: DbSprint[]): Sprint[] {
  return raw.map((s) => ({
    id: s.id,
    name: s.name,
    projectId: s.projectId,
    status: (s.status as Sprint['status']) || 'planning',
    startDate: dateOnly(s.startDate),
    endDate: dateOnly(s.endDate),
    goal: s.goal ?? '',
    taskIds: (s.tasks ?? []).map((t) => t.id),
    velocity: s.velocity ?? undefined,
    organizationId: s.project?.workspaceId ?? '',
    createdAt: iso(s.createdAt),
  }));
}

export function mapMilestones(raw: DbMilestone[]): Milestone[] {
  return raw.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description ?? '',
    projectId: m.projectId,
    dueDate: dateOnly(m.dueDate),
    status: (m.status as Milestone['status']) || 'upcoming',
    taskIds: (m.tasks ?? []).map((t) => t.id),
    color: m.color,
    organizationId: m.project?.workspaceId ?? '',
    completedAt: m.completedAt ? iso(m.completedAt) : undefined,
    createdAt: iso(m.createdAt),
  }));
}

export function mapTimeEntries(raw: DbTimeEntry[]): TimeEntry[] {
  return raw.map((e) => ({
    id: e.id,
    taskId: e.taskId,
    projectId: e.projectId,
    userId: e.userId ?? '',
    date: dateOnly(e.date),
    hours: e.hours,
    description: e.description ?? '',
    billable: e.billable,
    createdAt: iso(e.createdAt),
  }));
}

export function mapAutomations(raw: DbAutomation[]): Automation[] {
  return raw.map((a) => ({
    id: a.id,
    name: a.name,
    trigger: a.trigger,
    action: a.action,
    enabled: a.enabled,
    lastRun: a.lastRun ? iso(a.lastRun) : undefined,
    runCount: a.runCount,
    organizationId: a.workspaceId,
  }));
}

export function mapAuditLogs(raw: DbActivityLog[]): AuditLogEntry[] {
  return raw.map((a) => ({
    id: a.id,
    action: (a.type as AuditLogEntry['action']) || 'update',
    entityType: a.targetType ?? 'unknown',
    entityId: a.targetId ?? '',
    userId: a.userId,
    organizationId: a.workspaceId,
    details: a.description,
    timestamp: iso(a.createdAt),
  }));
}

export function mapCalendarEvents(
  tasks: Task[],
  meetings: DbMeeting[],
  sprints: Sprint[],
  milestones: Milestone[],
  projects: Project[] = []
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  tasks.forEach((t) => {
    if (t.dueDate) {
      events.push({
        id: `task-${t.id}`,
        title: t.title,
        date: t.dueDate,
        type: 'task',
        color: '#06b6d4',
        projectId: t.projectId,
        organizationId: t.organizationId,
      });
    }
  });

  meetings.forEach((m) => {
    const meetingOrgId =
      m.projectId != null
        ? projects.find((p) => p.id === m.projectId)?.organizationId
        : undefined;
    events.push({
      id: m.id,
      title: m.title,
      date: dateOnly(m.date),
      type: 'meeting',
      color: '#f59e0b',
      projectId: m.projectId ?? undefined,
      organizationId: meetingOrgId,
    });
  });

  sprints.forEach((s) => {
    if (s.endDate) {
      events.push({
        id: `sprint-${s.id}`,
        title: `${s.name} Review`,
        date: s.endDate,
        type: 'sprint',
        color: s.status === 'active' ? '#10b981' : '#64748b',
        projectId: s.projectId,
        organizationId: s.organizationId,
      });
    }
  });

  milestones.forEach((m) => {
    if (m.dueDate) {
      events.push({
        id: `ms-${m.id}`,
        title: m.title,
        date: m.dueDate,
        type: 'milestone',
        color: m.color,
        projectId: m.projectId,
        organizationId: m.organizationId,
      });
    }
  });

  return events;
}

export type AppTeam = {
  id: string;
  name: string;
  description: string;
  color: string;
  memberIds: string[];
  projectIds: string[];
  organizationId: string;
};

export type AppChannel = {
  id: string;
  name: string;
  type: string;
  description: string;
  memberIds: string[];
  unreadCount: number;
  organizationId: string;
};

export type AppMeeting = {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  attendees: string[];
  link: string;
  projectId?: string;
  organizationId?: string;
};

export type AppActivity = {
  id: string;
  type: string;
  userId: string;
  description: string;
  timestamp: string;
  projectId?: string;
  organizationId?: string;
};

export function mapTeams(raw: DbTeam[], projects: Project[]): AppTeam[] {
  return raw.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description ?? '',
    color: t.color,
    memberIds: t.teamMembers.map((m) => m.userId),
    projectIds: projects.filter((p) => p.organizationId === t.workspaceId).map((p) => p.id),
    organizationId: t.workspaceId,
  }));
}

export function mapChannels(raw: DbChannel[]): AppChannel[] {
  return raw.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    description: '',
    memberIds: c.channelMembers.map((m) => m.userId),
    unreadCount: 0,
    organizationId: c.workspaceId,
  }));
}

export function mapMeetings(raw: DbMeeting[], projects: Project[] = []): AppMeeting[] {
  return raw.map((m) => {
    const d = m.date instanceof Date ? m.date : new Date(m.date);
    const organizationId =
      m.projectId != null
        ? projects.find((p) => p.id === m.projectId)?.organizationId
        : undefined;
    return {
      id: m.id,
      title: m.title,
      date: d.toISOString().split('T')[0],
      time: d.toTimeString().slice(0, 5),
      duration: m.duration,
      status: m.status,
      attendees: m.meetingMembers.map((mm) => mm.userId),
      link: m.link ?? '',
      projectId: m.projectId ?? undefined,
      organizationId,
    };
  });
}

export function mapActivities(raw: DbActivityLog[]): AppActivity[] {
  return raw.map((a) => ({
    id: a.id,
    type: a.type,
    userId: a.userId,
    description: a.description,
    timestamp: iso(a.createdAt),
    projectId: a.targetType === 'project' ? (a.targetId ?? undefined) : undefined,
    organizationId: a.workspaceId,
  }));
}

// ─── Lookup helpers (require data arrays) ──────────────────────────────────

export function getUserName(users: PMUser[], id: string): string {
  return users.find((u) => u.id === id)?.name ?? 'Inconnu';
}

export function getUserInitials(users: PMUser[], id: string): string {
  const user = users.find((u) => u.id === id);
  return user ? user.name.split(' ').map((n) => n[0]).join('') : '??';
}

export function getProjectName(projects: Project[], id: string): string {
  return projects.find((p) => p.id === id)?.name ?? 'Inconnu';
}

export interface AppDataPayload {
  users: PMUser[];
  projects: Project[];
  tasks: Task[];
  organizations: Organization[];
  sprints: Sprint[];
  milestones: Milestone[];
  timeEntries: TimeEntry[];
  automations: Automation[];
  auditLogs: AuditLogEntry[];
  calendarEvents: CalendarEvent[];
  teams: AppTeam[];
  channels: AppChannel[];
  meetings: AppMeeting[];
  activities: AppActivity[];
}

export function mapAppDataPayload(
  raw: {
    users: DbUser[];
    projects: DbProject[];
    tasks: DbTask[];
    workspaces: DbWorkspace[];
    sprints: DbSprint[];
    milestones: DbMilestone[];
    timeEntries: DbTimeEntry[];
    automations: DbAutomation[];
    activityLogs: DbActivityLog[];
    teams: DbTeam[];
    channels: DbChannel[];
    meetings: DbMeeting[];
  },
  workspaceId?: string
): AppDataPayload {
  const users = mapUsers(raw.users, workspaceId);
  const projects = mapProjects(raw.projects);
  const tasks = mapTasks(raw.tasks, users);
  const sprints = mapSprints(raw.sprints);
  const milestones = mapMilestones(raw.milestones);
  const meetings = mapMeetings(raw.meetings, projects);

  return {
    users,
    projects,
    tasks,
    organizations: mapOrganizations(raw.workspaces),
    sprints,
    milestones,
    timeEntries: mapTimeEntries(raw.timeEntries),
    automations: mapAutomations(raw.automations),
    auditLogs: mapAuditLogs(raw.activityLogs),
    calendarEvents: mapCalendarEvents(tasks, raw.meetings, sprints, milestones, projects),
    teams: mapTeams(raw.teams, projects),
    channels: mapChannels(raw.channels),
    meetings,
    activities: mapActivities(raw.activityLogs),
  };
}

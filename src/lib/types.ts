// ========================
// Core Types for TeamFlow PM - Project Management Software
// ========================

export type PageId =
  // Favoris
  | 'dashboard'
  | 'projects'
  | 'project-detail'
  | 'my-tasks'
  // Projets
  | 'sprints'
  | 'planning'
  | 'calendar'
  | 'milestones'
  // Communication
  | 'messages'
  | 'meetings'
  // Équipe
  | 'members'
  | 'teams'
  // Analyse
  | 'statistics'
  | 'reports'
  // Administration
  | 'users'
  | 'roles'
  | 'organizations'
  | 'audit'
  | 'settings'
  // Tools
  | 'automations'
  | 'time-tracking'
  | 'activity'
  // PMP — Gestion de projets complexes
  | 'dependencies'
  | 'costs'
  | 'risks'
  | 'stakeholders'
  | 'change-requests'
  | 'workload';

// ─── Task ────────────────────────────────────────────────────────────────
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  sprintId?: string;
  assigneeId: string;
  reporterId: string;
  dueDate: string;
  tags: string[];
  subtasks: Subtask[];
  estimatedHours?: number;
  loggedHours: number;
  milestoneId?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Project ─────────────────────────────────────────────────────────────
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export interface Project {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: ProjectStatus;
  progress: number;
  memberIds: string[];
  taskCount: number;
  completedTasks: number;
  dueDate: string;
  startDate: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Sprint ──────────────────────────────────────────────────────────────
export type SprintStatus = 'planning' | 'active' | 'completed';

export interface Sprint {
  id: string;
  name: string;
  projectId: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  goal: string;
  taskIds: string[];
  velocity?: number;
  organizationId: string;
  createdAt: string;
}

// ─── Milestone ───────────────────────────────────────────────────────────
export type MilestoneStatus = 'upcoming' | 'in_progress' | 'completed' | 'overdue';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  projectId: string;
  dueDate: string;
  status: MilestoneStatus;
  taskIds: string[];
  color: string;
  organizationId: string;
  completedAt?: string;
  createdAt: string;
}

// ─── Time Entry ──────────────────────────────────────────────────────────
export interface TimeEntry {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  date: string;
  hours: number;
  description: string;
  billable: boolean;
  createdAt: string;
}

// ─── Organization (was Tenant) ───────────────────────────────────────────
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: 'company' | 'department' | 'team' | 'subsidiary';
  color: string;
  icon: string;
  logo?: string | null;
  country: string;
  memberCount: number;
  memberIds?: string[];
  projectCount: number;
  isActive: boolean;
  createdAt: string;
}

// ─── User ────────────────────────────────────────────────────────────────
export type UserRole = 'super_admin' | 'org_admin' | 'project_manager' | 'member' | 'viewer';
export type UserStatus = 'online' | 'away' | 'offline' | 'busy';

export interface PMUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  status: UserStatus;
  organizationId: string;
  organizationName: string;
  lastActive: string;
  taskCount: number;
}

// ─── Calendar Event ──────────────────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: 'deadline' | 'milestone' | 'sprint' | 'meeting' | 'task';
  color: string;
  projectId?: string;
  organizationId?: string;
}

// ─── Automation ──────────────────────────────────────────────────────────
export interface Automation {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  lastRun?: string;
  runCount: number;
  organizationId: string;
}

// ─── Notification ────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  type: 'task_assigned' | 'task_completed' | 'sprint_started' | 'deadline_approaching' | 'mention' | 'comment_added' | 'meeting_reminder' | 'system';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  actionUrl?: string;
}

// ─── Audit Log ───────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string;
  action: 'create' | 'update' | 'delete' | 'assign' | 'move' | 'archive' | 'login' | 'logout' | 'permission_change';
  entityType: string;
  entityId: string;
  userId: string;
  organizationId: string;
  details: string;
  timestamp: string;
}

// ========================
// Core Types for TeamFlow
// ========================

export type PageId =
  | "dashboard"
  | "tasks"
  | "projects"
  | "project-detail"
  | "calendar"
  | "messages"
  | "meetings"
  | "files"
  | "wiki"
  | "activity"
  | "members"
  | "teams"
  | "team-management"
  | "reports"
  | "automations"
  | "opportunities"
  | "settings";

export type KnownTaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskStatus = KnownTaskStatus | (string & {});
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";
export type MemberRole = "admin" | "member" | "guest";
export type ScopePermission = "read" | "write" | "admin";
export type ScopeType = "functional" | "permission";
export type MeetingStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type OpportunityStatus =
  | "nouveau"
  | "en_preparation"
  | "soumis"
  | "entretien"
  | "accepte"
  | "refuse";

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: MemberRole;
  joinedAt: string;
  user: User;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon: string;
  createdAt: string;
  members?: WorkspaceMember[];
  columns?: BoardColumn[];
}

export interface BoardColumn {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  order: number;
  isDefault: boolean;
  boardType: "tasks" | "opportunities";
  workspaceId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: MemberRole;
  status: "online" | "away" | "offline" | "busy";
}

export interface Project {
  id: string;
  name: string;
  description: string;
  logo: string;
  sourceUrl?: string;
  color: string;
  icon: string;
  status: ProjectStatus;
  progress: number;
  members: string[];
  taskCount: number;
  completedTasks: number;
  dueDate: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  projectId: string;
  tags: string[];
  dueDate: string;
  createdAt: string;
  subtasks: { id: string; title: string; completed: boolean }[];
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  channelId: string;
  timestamp: string;
  reactions: { emoji: string; users: string[] }[];
  attachments: string[];
}

export interface Channel {
  id: string;
  name: string;
  type: "project" | "direct" | "team";
  members: string[];
  lastMessage?: Message;
  unread: number;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  date: string;
  duration: number;
  attendees: string[];
  status: MeetingStatus;
  link?: string;
  projectId?: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  organisation?: string;
  status: OpportunityStatus;
  dueDate: string;
  responsableId?: string;
  workspaceId: string;
  creatorId: string;
  createdAt: string;
  creator?: User;
  responsable?: User;
}

export interface FileItem {
  id: string;
  name: string;
  type: "document" | "spreadsheet" | "presentation" | "image" | "pdf" | "other";
  size: number;
  url: string;
  uploadedBy: string;
  projectId?: string;
  createdAt: string;
}

export interface WikiPage {
  id: string;
  title: string;
  content: string;
  parentId?: string;
  lastEditedBy: string;
  updatedAt: string;
  icon: string;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  createdAt: string;
  user?: Pick<User, "id" | "name" | "avatar">;
}

export interface ActivityItem {
  id: string;
  type:
    | "task_created"
    | "task_completed"
    | "task_updated"
    | "task_deleted"
    | "task_reopened"
    | "comment_added"
    | "project_created"
    | "project_updated"
    | "project_deleted"
    | "member_joined"
    | "file_uploaded"
    | "meeting_created"
    | "meeting_scheduled"
    | "wiki_created";
  userId: string;
  description: string;
  targetId: string;
  targetType: string;
  timestamp: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  color: string;
  members: string[];
  projects: string[];
}

export interface TeamRole {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
}

export interface TeamScope {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  type: ScopeType;
  icon: string;
  color: string;
}

export interface MemberScopeDetail {
  id: string;
  scopeId: string;
  scope: TeamScope;
  permission: ScopePermission;
}

export interface TeamMemberDetailed {
  id: string;
  userId: string;
  teamId: string;
  roleId: string | null;
  role: TeamRole | null;
  user: User;
  scopes: MemberScopeDetail[];
}

export interface Invitation {
  id: string;
  email: string;
  workspaceId: string;
  invitedById: string;
  role: MemberRole;
  token: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  invitedBy?: { id: string; name: string; email: string };
}

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  lastRun?: string;
  runCount: number;
}

export interface Notification {
  id: string;
  type:
    | "mention"
    | "assignment"
    | "comment"
    | "deadline"
    | "invitation"
    | "system";
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  actionUrl?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: "deadline" | "meeting" | "milestone" | "reminder";
  color: string;
  projectId?: string;
}

import type { AppDataPayload } from './data-mappers';

export type WorkspaceScopedPayload = AppDataPayload & {
  workspaceProjectIds: Set<string>;
};

function byOrgId<T extends { organizationId: string }>(
  items: T[],
  activeOrganizationId: string
): T[] {
  return items.filter((item) => item.organizationId === activeOrganizationId);
}

function byProjectIds<T extends { projectId: string }>(
  items: T[],
  projectIds: Set<string>
): T[] {
  return items.filter((item) => projectIds.has(item.projectId));
}

function filterCalendarEvents(
  events: AppDataPayload['calendarEvents'],
  activeOrganizationId: string,
  projectIds: Set<string>
) {
  return events.filter((event) => {
    if (event.organizationId) {
      return event.organizationId === activeOrganizationId;
    }
    if (event.projectId) {
      return projectIds.has(event.projectId);
    }
    return false;
  });
}

function filterMeetings(
  meetings: AppDataPayload['meetings'],
  activeOrganizationId: string,
  projectIds: Set<string>
) {
  return meetings.filter((meeting) => {
    if (meeting.organizationId) {
      return meeting.organizationId === activeOrganizationId;
    }
    if (meeting.projectId) {
      return projectIds.has(meeting.projectId);
    }
    return false;
  });
}

function filterActivities(
  activities: AppDataPayload['activities'],
  activeOrganizationId: string,
  projectIds: Set<string>
) {
  return activities.filter((activity) => {
    if (activity.organizationId) {
      return activity.organizationId === activeOrganizationId;
    }
    if (activity.projectId) {
      return projectIds.has(activity.projectId);
    }
    return false;
  });
}

function filterUsers(
  users: AppDataPayload['users'],
  activeOrganizationId: string,
  organizations: AppDataPayload['organizations']
) {
  const org = organizations.find((o) => o.id === activeOrganizationId);
  const memberIds = new Set(org?.memberIds ?? []);
  const filtered =
    memberIds.size > 0
      ? users.filter((user) => memberIds.has(user.id))
      : users.filter((user) => user.organizationId === activeOrganizationId);

  return filtered.map((user) => ({
    ...user,
    organizationId: activeOrganizationId,
    organizationName: org?.name ?? user.organizationName,
  }));
}

/**
 * Filters app data to the active workspace. Organizations list stays global for the switcher.
 */
export function filterWorkspaceScope(
  data: AppDataPayload,
  activeOrganizationId: string
): WorkspaceScopedPayload {
  if (!activeOrganizationId) {
    return {
      ...data,
      projects: [],
      tasks: [],
      sprints: [],
      milestones: [],
      timeEntries: [],
      automations: [],
      auditLogs: [],
      calendarEvents: [],
      teams: [],
      channels: [],
      meetings: [],
      activities: [],
      users: [],
      workspaceProjectIds: new Set<string>(),
    };
  }

  const projects = byOrgId(data.projects, activeOrganizationId);
  const workspaceProjectIds = new Set(projects.map((p) => p.id));

  return {
    organizations: data.organizations,
    projects,
    tasks: byProjectIds(data.tasks, workspaceProjectIds),
    sprints: byProjectIds(data.sprints, workspaceProjectIds),
    milestones: byProjectIds(data.milestones, workspaceProjectIds),
    timeEntries: byProjectIds(data.timeEntries, workspaceProjectIds),
    automations: byOrgId(data.automations, activeOrganizationId),
    auditLogs: byOrgId(data.auditLogs, activeOrganizationId),
    teams: byOrgId(data.teams, activeOrganizationId),
    channels: byOrgId(data.channels, activeOrganizationId),
    users: filterUsers(data.users, activeOrganizationId, data.organizations),
    calendarEvents: filterCalendarEvents(
      data.calendarEvents,
      activeOrganizationId,
      workspaceProjectIds
    ),
    meetings: filterMeetings(data.meetings, activeOrganizationId, workspaceProjectIds),
    activities: filterActivities(data.activities, activeOrganizationId, workspaceProjectIds),
    workspaceProjectIds,
  };
}

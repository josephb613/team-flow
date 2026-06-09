# Task 2-a: Core Data Transformation (CMS → PM)

## Summary
Transformed all 3 core data files from ContentFlow CMS to TeamFlow PM:

### types.ts
- All CMS types removed (ContentItem, Newsletter, Article, Announcement, Campaign, MediaItem, Tenant, CMSUser, etc.)
- PM types added: Task, Project, Sprint, Milestone, TimeEntry, Organization, PMUser
- PageId updated to PM pages (dashboard, projects, my-tasks, sprints, planning, calendar, milestones, messages, meetings, members, teams, statistics, reports, users, roles, organizations, audit, settings, automations, time-tracking, activity)
- Notification/AuditLog types updated for PM context

### store.ts
- CMS state removed (contentDetailOpen, createContentDialogOpen, selectedContent)
- PM state added (activeProjectId, taskDetailOpen, selectedTask, createTaskDialogOpen, createProjectDialogOpen, taskViewMode, sprintViewMode, activeSprintId, timer state)
- Renamed: tenants→organizations, activeTenantId→activeOrganizationId
- Favorites/recentItems updated to ['dashboard', 'projects', 'my-tasks']

### mock-data.ts
- ALL CMS mock data removed (mockNewsletters, mockArticles, mockAnnouncements, mockCampaigns, mockMedia, mockTemplates, mockChannels, etc.)
- PM mock data added: 16 tasks, 6 projects, 6 sprints, 8 milestones, 20 time entries, 12 calendar events, 4 organizations, 5 teams
- New helper functions and color maps for PM entities

## Status
- Lint passes: 0 errors
- App compiling on port 3000
- View components still import old types - other agents need to update them

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Calendar,
  MessageSquare,
  Video,
  FileText,
  BookOpen,
  Activity,
  Users,
  UserCircle,
  BarChart3,
  Zap,
  Settings,
  Circle,
  Clock,
  AlertCircle,
  CheckCircle2,
  Flame,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  Avatar,
  AvatarFallback,
} from 'lucide-react';
import type { PageId, TaskStatus, TaskPriority } from '@/lib/types';
import { mockTasks, mockProjects, mockUsers } from '@/lib/mock-data';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const pages: { icon: React.ReactNode; label: string; pageId: PageId }[] = [
  { icon: <LayoutDashboard className="h-4 w-4" />, label: 'Dashboard', pageId: 'dashboard' },
  { icon: <CheckSquare className="h-4 w-4" />, label: 'Tasks', pageId: 'tasks' },
  { icon: <FolderKanban className="h-4 w-4" />, label: 'Projects', pageId: 'projects' },
  { icon: <Calendar className="h-4 w-4" />, label: 'Calendar', pageId: 'calendar' },
  { icon: <MessageSquare className="h-4 w-4" />, label: 'Messages', pageId: 'messages' },
  { icon: <Video className="h-4 w-4" />, label: 'Meetings', pageId: 'meetings' },
  { icon: <FileText className="h-4 w-4" />, label: 'Files', pageId: 'files' },
  { icon: <BookOpen className="h-4 w-4" />, label: 'Wiki & Notes', pageId: 'wiki' },
  { icon: <Activity className="h-4 w-4" />, label: 'Activity', pageId: 'activity' },
  { icon: <Users className="h-4 w-4" />, label: 'Members', pageId: 'members' },
  { icon: <UserCircle className="h-4 w-4" />, label: 'Teams', pageId: 'teams' },
  { icon: <BarChart3 className="h-4 w-4" />, label: 'Reports', pageId: 'reports' },
  { icon: <Zap className="h-4 w-4" />, label: 'Automations', pageId: 'automations' },
  { icon: <Settings className="h-4 w-4" />, label: 'Settings', pageId: 'settings' },
];

const statusIconMap: Record<TaskStatus, React.ReactNode> = {
  todo: <Circle className="h-3 w-3" />,
  in_progress: <Clock className="h-3 w-3" />,
  review: <AlertCircle className="h-3 w-3" />,
  done: <CheckCircle2 className="h-3 w-3" />,
};

const statusColorMap: Record<TaskStatus, string> = {
  todo: 'text-slate-500',
  in_progress: 'text-cyan-500',
  review: 'text-amber-500',
  done: 'text-emerald-500',
};

const priorityDotMap: Record<TaskPriority, { icon: React.ReactNode; color: string }> = {
  urgent: { icon: <Flame className="h-3 w-3" />, color: 'text-rose-500' },
  high: { icon: <ArrowUpRight className="h-3 w-3" />, color: 'text-amber-500' },
  medium: { icon: <ArrowRight className="h-3 w-3" />, color: 'text-cyan-500' },
  low: { icon: <ArrowDownRight className="h-3 w-3" />, color: 'text-emerald-500' },
};

export function SearchDialog() {
  const { searchOpen, setSearchOpen, setActivePage, setSelectedTask } = useAppStore();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  // Filter tasks, projects, and users based on query
  const filteredTasks = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return mockTasks
      .filter((task) => task.title.toLowerCase().includes(q))
      .slice(0, 5);
  }, [query]);

  const filteredProjects = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return mockProjects
      .filter((project) => project.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [query]);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return mockUsers
      .filter((user) => user.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [query]);

  const hasResults = filteredTasks.length > 0 || filteredProjects.length > 0 || filteredUsers.length > 0;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [searchOpen, setSearchOpen]);

  const handleOpenChange = (open: boolean) => {
    setSearchOpen(open);
    if (!open) setQuery('');
  };

  const runCommand = (command: () => void) => {
    setSearchOpen(false);
    setQuery('');
    command();
  };

  return (
    <CommandDialog open={searchOpen} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder={t.search.typeCommand}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{t.search.noResults}</CommandEmpty>

        {/* Tasks results */}
        {filteredTasks.length > 0 && (
          <CommandGroup heading={t.search.tasks}>
            {filteredTasks.map((task) => {
              const priority = priorityDotMap[task.priority];
              return (
                <CommandItem
                  key={task.id}
                  onSelect={() => runCommand(() => {
                    setActivePage('tasks');
                    setSelectedTask(task as unknown as Record<string, unknown>);
                  })}
                  className="flex items-center gap-2"
                >
                  <span className={statusColorMap[task.status]}>{statusIconMap[task.status]}</span>
                  <span className="flex-1 truncate text-sm">{task.title}</span>
                  <span className={cn('flex items-center gap-0.5', priority.color)}>
                    {priority.icon}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Projects results */}
        {filteredProjects.length > 0 && (
          <CommandGroup heading={t.search.projects}>
            {filteredProjects.map((project) => (
              <CommandItem
                key={project.id}
                onSelect={() => runCommand(() => setActivePage('projects'))}
                className="flex items-center gap-2"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <span className="flex-1 truncate text-sm">{project.name}</span>
                <span className="text-xs text-muted-foreground">{project.progress}%</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Members results */}
        {filteredUsers.length > 0 && (
          <CommandGroup heading={t.search.members}>
            {filteredUsers.map((user) => (
              <CommandItem
                key={user.id}
                onSelect={() => runCommand(() => setActivePage('members'))}
                className="flex items-center gap-2"
              >
                <div className="relative">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium">
                    {user.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-background',
                      user.status === 'online' ? 'bg-emerald-500' :
                      user.status === 'away' ? 'bg-amber-400' :
                      user.status === 'busy' ? 'bg-rose-500' :
                      'bg-slate-300 dark:bg-slate-600'
                    )}
                  />
                </div>
                <span className="flex-1 truncate text-sm">{user.name}</span>
                <span className="text-[10px] text-muted-foreground capitalize">{user.role}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {hasResults && <CommandSeparator />}

        <CommandGroup heading={t.search.pages}>
          {pages.map((page) => (
            <CommandItem
              key={page.pageId}
              onSelect={() => runCommand(() => setActivePage(page.pageId))}
            >
              {page.icon}
              <span className="ml-2">{page.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t.search.quickActions}>
          <CommandItem onSelect={() => runCommand(() => setActivePage('tasks'))}>
            <CheckSquare className="h-4 w-4" />
            <span className="ml-2">{t.search.createNewTask}</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActivePage('projects'))}>
            <FolderKanban className="h-4 w-4" />
            <span className="ml-2">{t.search.createNewProject}</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActivePage('meetings'))}>
            <Video className="h-4 w-4" />
            <span className="ml-2">{t.search.scheduleMeeting}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

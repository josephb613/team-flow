'use client';

import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Search,
  Star,
  ChevronDown,
  Plus,
  Hash,
  LogOut,
  X,
} from 'lucide-react';
import type { PageId } from '@/lib/types';
import { mockChannels, mockUsers } from '@/lib/mock-data';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItemConfig {
  icon: React.ReactNode;
  label: string;
  pageId: PageId;
  badge?: number;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  pageId: PageId;
  badge?: string | number;
  active?: boolean;
  collapsed?: boolean;
  isFavorite?: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, pageId, badge, active, collapsed, isFavorite, onClick }: NavItemProps) {
  const content = (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group relative',
        active
          ? 'bg-[oklch(0.55_0.15_160/0.15)] text-[oklch(0.65_0.16_160)] font-medium'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[oklch(0.55_0.15_160)] rounded-r-full"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
      <span className={cn('flex-shrink-0', active ? 'text-[oklch(0.55_0.15_160)]' : '')}>{icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{label}</span>
          {badge !== undefined && (
            <Badge
              variant="secondary"
              className="h-5 min-w-[20px] px-1.5 text-[10px] bg-sidebar-accent text-sidebar-foreground/60"
            >
              {badge}
            </Badge>
          )}
          {isFavorite && (
            <Star className="h-3 w-3 text-amber-400 fill-amber-400 opacity-60" />
          )}
        </>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {label}
            {isFavorite && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed?: boolean }) {
  if (collapsed) return null;
  return (
    <div className="px-3 pt-4 pb-1">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-sidebar-foreground/30">
        {children}
      </span>
    </div>
  );
}

const allNavItems: NavItemConfig[] = [
  { icon: <LayoutDashboard className="h-4 w-4" />, label: 'Dashboard', pageId: 'dashboard' },
  { icon: <CheckSquare className="h-4 w-4" />, label: 'Tasks', pageId: 'tasks', badge: 5 },
  { icon: <FolderKanban className="h-4 w-4" />, label: 'Projects', pageId: 'projects', badge: 6 },
  { icon: <Calendar className="h-4 w-4" />, label: 'Calendar', pageId: 'calendar' },
  { icon: <MessageSquare className="h-4 w-4" />, label: 'Messages', pageId: 'messages', badge: 11 },
  { icon: <Video className="h-4 w-4" />, label: 'Meetings', pageId: 'meetings', badge: 4 },
  { icon: <FileText className="h-4 w-4" />, label: 'Files', pageId: 'files' },
  { icon: <BookOpen className="h-4 w-4" />, label: 'Wiki & Notes', pageId: 'wiki' },
  { icon: <Activity className="h-4 w-4" />, label: 'Activity', pageId: 'activity' },
  { icon: <Users className="h-4 w-4" />, label: 'Members', pageId: 'members' },
  { icon: <UserCircle className="h-4 w-4" />, label: 'Teams', pageId: 'teams' },
  { icon: <BarChart3 className="h-4 w-4" />, label: 'Reports', pageId: 'reports' },
  { icon: <Zap className="h-4 w-4" />, label: 'Automations', pageId: 'automations' },
];

const mainPageIds: Set<string> = new Set(['dashboard', 'tasks', 'projects', 'calendar']);
const collabPageIds: Set<string> = new Set(['messages', 'meetings', 'files', 'wiki']);
const managePageIds: Set<string> = new Set(['activity', 'members', 'teams', 'reports', 'automations']);

export function AppSidebar() {
  const {
    activePage,
    setActivePage,
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    sidebarCollapsed,
    favorites,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useAppStore();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  // Filter out favorited items from section listings to avoid duplication
  const mainItems = allNavItems.filter((i) => mainPageIds.has(i.pageId) && !favorites.includes(i.pageId));
  const collabItems = allNavItems.filter((i) => collabPageIds.has(i.pageId) && !favorites.includes(i.pageId));
  const manageItems = allNavItems.filter((i) => managePageIds.has(i.pageId) && !favorites.includes(i.pageId));
  const favoriteItems = allNavItems.filter((i) => favorites.includes(i.pageId));

  const channels = mockChannels.slice(0, 4);
  const onlineUsers = mockUsers.filter((u) => u.status === 'online');

  const handleNavClick = (pageId: PageId) => {
    setActivePage(pageId);
    setMobileSidebarOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-screen bg-sidebar text-sidebar-foreground">
      {/* Workspace Switcher */}
      <div className="px-3 py-3 flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-sidebar-accent transition-colors',
                sidebarCollapsed && 'justify-center px-0'
              )}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm"
                style={{ backgroundColor: activeWorkspace?.color || '#10b981' }}
              >
                {activeWorkspace?.icon || '🏢'}
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {activeWorkspace?.name || 'Workspace'}
                    </div>
                    <div className="text-[10px] text-sidebar-foreground/40">
                      {mockUsers.length} members
                    </div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40 flex-shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-56">
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Workspaces</div>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => setActiveWorkspace(ws.id)}
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: ws.color }}
                >
                  {ws.icon}
                </div>
                <span className="flex-1">{ws.name}</span>
                {ws.id === activeWorkspaceId && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[oklch(0.55_0.15_160)]" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[oklch(0.55_0.15_160)]">
              <Plus className="h-4 w-4 mr-2" />
              Create workspace
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[oklch(0.55_0.15_160)]">
              <LogOut className="h-4 w-4 mr-2" />
              Join workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search (in sidebar) */}
      {!sidebarCollapsed && (
        <div className="px-3 pb-2">
          <button
            onClick={() => useAppStore.getState().setSearchOpen(true)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground/70 transition-colors border border-sidebar-border/50"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
            <kbd className="ml-auto text-[10px] border border-sidebar-border/50 rounded px-1">⌘K</kbd>
          </button>
        </div>
      )}

      <Separator className="bg-sidebar-border/50" />

      {/* Scrollable Navigation */}
      <ScrollArea className="flex-1 px-2 py-1">
        {/* Favorites */}
        {favoriteItems.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>Pinned</SectionLabel>
            <div className="space-y-0.5">
              {favoriteItems.map((item) => (
                <NavItem
                  key={item.pageId}
                  icon={item.icon}
                  label={item.label}
                  pageId={item.pageId}
                  badge={item.badge}
                  active={activePage === item.pageId}
                  collapsed={sidebarCollapsed}
                  isFavorite={true}
                  onClick={() => handleNavClick(item.pageId)}
                />
              ))}
            </div>
          </>
        )}

        {/* Main Navigation */}
        {mainItems.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>Main</SectionLabel>
            <div className="space-y-0.5">
              {mainItems.map((item) => (
                <NavItem
                  key={item.pageId}
                  icon={item.icon}
                  label={item.label}
                  pageId={item.pageId}
                  badge={item.badge}
                  active={activePage === item.pageId}
                  collapsed={sidebarCollapsed}
                  onClick={() => handleNavClick(item.pageId)}
                />
              ))}
            </div>
          </>
        )}

        {/* Collaboration */}
        {collabItems.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>Collaborate</SectionLabel>
            <div className="space-y-0.5">
              {collabItems.map((item) => (
                <NavItem
                  key={item.pageId}
                  icon={item.icon}
                  label={item.label}
                  pageId={item.pageId}
                  badge={item.badge}
                  active={activePage === item.pageId}
                  collapsed={sidebarCollapsed}
                  onClick={() => handleNavClick(item.pageId)}
                />
              ))}
            </div>
          </>
        )}

        {/* Channels (for messages) */}
        {!sidebarCollapsed && (
          <>
            <SectionLabel>Channels</SectionLabel>
            <div className="space-y-0.5">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => handleNavClick('messages')}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-colors',
                    'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <Hash className="h-3.5 w-3.5 text-sidebar-foreground/30" />
                  <span className="flex-1 text-left truncate">{ch.name}</span>
                  {ch.unread > 0 && (
                    <Badge className="h-4 min-w-[16px] px-1 text-[9px] bg-[oklch(0.55_0.15_160)] text-white">
                      {ch.unread}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Management */}
        {manageItems.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>Manage</SectionLabel>
            <div className="space-y-0.5">
              {manageItems.map((item) => (
                <NavItem
                  key={item.pageId}
                  icon={item.icon}
                  label={item.label}
                  pageId={item.pageId}
                  active={activePage === item.pageId}
                  collapsed={sidebarCollapsed}
                  onClick={() => handleNavClick(item.pageId)}
                />
              ))}
            </div>
          </>
        )}
      </ScrollArea>

      <Separator className="bg-sidebar-border/50" />

      {/* Settings */}
      <div className="px-2 py-2 flex-shrink-0">
        <NavItem
          icon={<Settings className="h-4 w-4" />}
          label="Settings"
          pageId="settings"
          active={activePage === 'settings'}
          collapsed={sidebarCollapsed}
          onClick={() => handleNavClick('settings')}
        />
      </div>

      {/* Online users indicator */}
      {!sidebarCollapsed && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-1">
            {onlineUsers.slice(0, 5).map((user) => (
              <TooltipProvider key={user.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Avatar className="h-6 w-6 border-2 border-sidebar">
                        <AvatarFallback className="text-[8px] bg-sidebar-accent text-sidebar-foreground">
                          {user.name.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-sidebar" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{user.name}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            <span className="text-[10px] text-sidebar-foreground/40 ml-2">
              {onlineUsers.length} online
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 border-r border-sidebar-border/30',
          sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] z-50 shadow-2xl"
            >
              {/* Close button for mobile */}
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

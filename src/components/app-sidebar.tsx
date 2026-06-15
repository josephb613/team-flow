'use client';

import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { OrganizationLogo } from '@/components/organization-logo';
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
  FolderKanban,
  ListChecks,
  Zap,
  Calendar,
  CalendarClock,
  Flag,
  MessageSquare,
  Video,
  Users,
  UserCircle,
  BarChart3,
  PieChart,
  Shield,
  Building2,
  ScrollText,
  Settings,
  Search,
  Star,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  LogOut,
  X,
  Keyboard,
  Timer,
  Globe,
  Bell,
  GitBranch,
  Wallet,
  ShieldAlert,
  Handshake,
  FileDiff,
  Gauge,
} from 'lucide-react';
import type { PageId } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';
import { useAppData } from '@/hooks/use-app-data';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  nested?: boolean;
  isFavorite?: boolean;
  onClick: () => void;
  onToggleFavorite?: () => void;
  favoriteLabel?: string;
}

function NavItem({
  icon,
  label,
  pageId,
  badge,
  active,
  collapsed,
  nested,
  isFavorite,
  onClick,
  onToggleFavorite,
  favoriteLabel,
}: NavItemProps) {
  const [hovered, setHovered] = useState(false);

  const row = (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'w-full flex items-center gap-1 px-1 rounded-lg text-sm transition-all duration-150 group relative overflow-hidden min-h-[44px]',
        nested && 'ml-3 border-l border-sidebar-border/30',
        active
          ? 'bg-gradient-to-r from-[oklch(0.55_0.18_250/0.15)] to-[oklch(0.55_0.18_250/0.05)] text-[oklch(0.45_0.18_250)] font-semibold'
          : 'text-sidebar-foreground font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
    >
      {/* Favorite amber left border indicator */}
      {isFavorite && !active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-4 bg-amber-400/60 rounded-r-full" />
      )}
      {/* Active left bar indicator */}
      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[oklch(0.55_0.18_250)] rounded-r-full"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
      {/* Hover left border animation */}
      {!active && hovered && !isFavorite && (
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          exit={{ scaleY: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[oklch(0.55_0.18_250/0.4)] rounded-r-full"
        />
      )}
      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 items-center gap-3 min-w-0 px-2 py-2.5 text-left"
      >
        <span className={cn(
          'flex-shrink-0 transition-transform duration-150 group-hover:scale-110',
          active ? 'text-[oklch(0.45_0.18_250)]' : 'text-sidebar-foreground/85'
        )}>{icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{label}</span>
            {badge !== undefined && (
              <Badge
                variant="secondary"
                className="h-5 min-w-[20px] px-1.5 text-[10px] bg-sidebar-accent text-sidebar-foreground font-medium"
              >
                {badge}
              </Badge>
            )}
          </>
        )}
      </button>
      {!collapsed && onToggleFavorite && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                aria-label={favoriteLabel}
                className={cn(
                  'shrink-0 mr-1.5 p-1 rounded-md transition-all',
                  'hover:bg-sidebar-accent/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-border',
                  isFavorite
                    ? 'opacity-100'
                    : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100'
                )}
              >
                <Star
                  className={cn(
                    'h-3.5 w-3.5',
                    isFavorite
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-sidebar-foreground/55 hover:text-amber-400'
                  )}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {favoriteLabel}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onClick}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              className={cn(
                'w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group relative overflow-hidden min-h-[44px]',
                active
                  ? 'bg-gradient-to-r from-[oklch(0.55_0.18_250/0.15)] to-[oklch(0.55_0.18_250/0.05)] text-[oklch(0.45_0.18_250)] font-semibold'
                  : 'text-sidebar-foreground font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              {isFavorite && !active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-4 bg-amber-400/60 rounded-r-full" />
              )}
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[oklch(0.55_0.18_250)] rounded-r-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span className={cn(
                'flex-shrink-0 transition-transform duration-150 group-hover:scale-110',
                active ? 'text-[oklch(0.45_0.18_250)]' : 'text-sidebar-foreground/85'
              )}>{icon}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="flex items-center gap-2 font-medium">
            {label}
            {isFavorite && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return row;
}

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed?: boolean }) {
  if (collapsed) return null;
  return (
    <div className="px-3 pt-4 pb-1">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-sidebar-foreground/55 flex items-center gap-1">
        {children}
      </span>
    </div>
  );
}

interface NavSettingsGroupProps {
  items: NavItemConfig[];
  activePage: PageId;
  collapsed?: boolean;
  favorites: string[];
  settingsLabel: string;
  getNavLabel: (pageId: string) => string;
  getNavBadge: (pageId: PageId) => number | undefined;
  getFavoriteLabel: (pageId: PageId) => string;
  onNavigate: (pageId: PageId) => void;
  onToggleFavorite: (pageId: PageId) => void;
}

function NavSettingsGroup({
  items,
  activePage,
  collapsed,
  favorites,
  settingsLabel,
  getNavLabel,
  getNavBadge,
  getFavoriteLabel,
  onNavigate,
  onToggleFavorite,
}: NavSettingsGroupProps) {
  const isSettingsActive = settingsPageIds.has(activePage);
  const [open, setOpen] = useState(isSettingsActive);

  useEffect(() => {
    if (isSettingsActive) setOpen(true);
  }, [isSettingsActive]);

  const visibleItems = items.filter((item) => !favorites.includes(item.pageId));

  const renderSubItem = (item: NavItemConfig, nested = true) => (
    <NavItem
      key={item.pageId}
      icon={item.icon}
      label={getNavLabel(item.pageId)}
      pageId={item.pageId}
      badge={getNavBadge(item.pageId)}
      active={activePage === item.pageId}
      collapsed={collapsed}
      isFavorite={favorites.includes(item.pageId)}
      onClick={() => onNavigate(item.pageId)}
      onToggleFavorite={() => onToggleFavorite(item.pageId)}
      favoriteLabel={getFavoriteLabel(item.pageId)}
      nested={nested}
    />
  );

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group relative overflow-hidden min-h-[44px]',
              isSettingsActive
                ? 'bg-gradient-to-r from-[oklch(0.55_0.18_250/0.15)] to-[oklch(0.55_0.18_250/0.05)] text-[oklch(0.45_0.18_250)] font-semibold'
                : 'text-sidebar-foreground font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            {isSettingsActive && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[oklch(0.55_0.18_250)] rounded-r-full"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <Settings className={cn('h-4 w-4', isSettingsActive && 'text-[oklch(0.45_0.18_250)]')} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-56">
          <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">{settingsLabel}</div>
          <DropdownMenuItem
            onClick={() => onNavigate('settings')}
            className={cn(
              'flex items-center gap-2.5 cursor-pointer',
              activePage === 'settings' && 'bg-accent'
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="flex-1">{settingsLabel}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {items.map((item) => (
            <DropdownMenuItem
              key={item.pageId}
              onClick={() => onNavigate(item.pageId)}
              className={cn(
                'flex items-center gap-2.5 cursor-pointer',
                activePage === item.pageId && 'bg-accent'
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="flex-1">{getNavLabel(item.pageId)}</span>
              {favorites.includes(item.pageId) && (
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'w-full flex items-center gap-1 px-1 rounded-lg text-sm transition-all duration-150 group relative overflow-hidden min-h-[44px]',
          isSettingsActive
            ? 'bg-gradient-to-r from-[oklch(0.55_0.18_250/0.15)] to-[oklch(0.55_0.18_250/0.05)] text-[oklch(0.45_0.18_250)] font-semibold'
            : 'text-sidebar-foreground font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )}
      >
        {isSettingsActive && (
          <motion.div
            layoutId="sidebar-settings-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[oklch(0.55_0.18_250)] rounded-r-full"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="flex flex-1 items-center gap-3 min-w-0 px-2 py-2.5 text-left"
        >
          <Settings className={cn('h-4 w-4 flex-shrink-0', isSettingsActive && 'text-[oklch(0.45_0.18_250)]')} />
          <span className="flex-1 truncate font-medium">{settingsLabel}</span>
        </button>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={settingsLabel}
            className="shrink-0 mr-1.5 p-1.5 rounded-md hover:bg-sidebar-accent/80 transition-colors"
          >
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 text-sidebar-foreground/60 transition-transform duration-200',
                open && 'rotate-90'
              )}
            />
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-0.5 pt-0.5">
        {visibleItems.map((item) => renderSubItem(item))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// PM Navigation items grouped by section
const favoritesItems: NavItemConfig[] = [
  { icon: <LayoutDashboard className="h-4 w-4" />, label: 'Dashboard', pageId: 'dashboard' },
  { icon: <FolderKanban className="h-4 w-4" />, label: 'Projects', pageId: 'projects' },
  { icon: <ListChecks className="h-4 w-4" />, label: 'My Tasks', pageId: 'my-tasks' },
];

const projectsItems: NavItemConfig[] = [
  { icon: <Zap className="h-4 w-4" />, label: 'Sprints', pageId: 'sprints' },
  { icon: <CalendarClock className="h-4 w-4" />, label: 'Planning', pageId: 'planning' },
  { icon: <Calendar className="h-4 w-4" />, label: 'Calendar', pageId: 'calendar' },
  { icon: <Flag className="h-4 w-4" />, label: 'Milestones', pageId: 'milestones' },
];

const communicationItems: NavItemConfig[] = [
  { icon: <MessageSquare className="h-4 w-4" />, label: 'Messages', pageId: 'messages' },
  { icon: <Video className="h-4 w-4" />, label: 'Meetings', pageId: 'meetings' },
];

const teamItems: NavItemConfig[] = [
  { icon: <Users className="h-4 w-4" />, label: 'Members', pageId: 'members' },
  { icon: <UserCircle className="h-4 w-4" />, label: 'Teams', pageId: 'teams' },
];

const analysisItems: NavItemConfig[] = [
  { icon: <BarChart3 className="h-4 w-4" />, label: 'Statistics', pageId: 'statistics' },
  { icon: <PieChart className="h-4 w-4" />, label: 'Reports', pageId: 'reports' },
];

const pmpItems: NavItemConfig[] = [
  { icon: <GitBranch className="h-4 w-4" />, label: 'Critical Path', pageId: 'dependencies' },
  { icon: <Wallet className="h-4 w-4" />, label: 'Costs & EVM', pageId: 'costs' },
  { icon: <ShieldAlert className="h-4 w-4" />, label: 'Risks', pageId: 'risks' },
  { icon: <Handshake className="h-4 w-4" />, label: 'Stakeholders', pageId: 'stakeholders' },
  { icon: <FileDiff className="h-4 w-4" />, label: 'Change Requests', pageId: 'change-requests' },
  { icon: <Gauge className="h-4 w-4" />, label: 'Workload', pageId: 'workload' },
];

const settingsNavItem: NavItemConfig = {
  icon: <Settings className="h-4 w-4" />,
  label: 'Settings',
  pageId: 'settings',
};

const settingsSubItems: NavItemConfig[] = [
  { icon: <Users className="h-4 w-4" />, label: 'Users', pageId: 'users' },
  { icon: <Shield className="h-4 w-4" />, label: 'Roles & Permissions', pageId: 'roles' },
  { icon: <Building2 className="h-4 w-4" />, label: 'Organizations', pageId: 'organizations' },
  { icon: <ScrollText className="h-4 w-4" />, label: 'Audit Log', pageId: 'audit' },
];

const settingsPageIds: Set<string> = new Set(['settings', ...settingsSubItems.map((i) => i.pageId)]);

const allNavItems: NavItemConfig[] = [
  ...favoritesItems,
  ...projectsItems,
  ...communicationItems,
  ...teamItems,
  ...analysisItems,
  ...pmpItems,
  settingsNavItem,
  ...settingsSubItems,
];

const favoritesPageIds: Set<string> = new Set(favoritesItems.map(i => i.pageId));
const projectsPageIds: Set<string> = new Set(projectsItems.map(i => i.pageId));
const communicationPageIds: Set<string> = new Set(communicationItems.map(i => i.pageId));
const teamPageIds: Set<string> = new Set(teamItems.map(i => i.pageId));
const analysisPageIds: Set<string> = new Set(analysisItems.map(i => i.pageId));

export function AppSidebar() {
  const {
    activePage,
    setActivePage,
    organizations,
    activeOrganizationId,
    setActiveOrganization,
    sidebarCollapsed,
    favorites,
    toggleFavorite,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    notifications,
    currentUser,
  } = useAppStore();
  const { t } = useTranslation();
  const { tasks, meetings, sprints, channels } = useAppData();

  const activeOrganization = organizations.find((org) => org.id === activeOrganizationId);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const tasksTodoCount = useMemo(() => {
    const pending = tasks.filter((task) => task.status !== 'done');
    if (currentUser?.id) {
      return pending.filter((task) => task.assigneeId === currentUser.id).length;
    }
    return pending.length;
  }, [tasks, currentUser?.id]);

  const meetingsTodayCount = useMemo(() => {
    const today = new Date().toDateString();
    return meetings.filter((meeting) => {
      const isToday = new Date(meeting.date).toDateString() === today;
      const isUpcoming = meeting.status === 'scheduled' || meeting.status === 'in_progress';
      return isToday && isUpcoming;
    }).length;
  }, [meetings]);

  const activeSprintsCount = useMemo(
    () => sprints.filter((sprint) => sprint.status === 'active').length,
    [sprints]
  );

  const unreadMessagesCount = useMemo(
    () => channels.reduce((sum, channel) => sum + channel.unreadCount, 0),
    [channels]
  );

  const getNavBadge = (pageId: PageId): number | undefined => {
    if (pageId === 'sprints' && activeSprintsCount > 0) return activeSprintsCount;
    if (pageId === 'messages' && unreadMessagesCount > 0) return unreadMessagesCount;
    return undefined;
  };

  // Helper to get translated nav label by pageId
  const getNavLabel = (pageId: string): string => {
    const key = pageId as keyof typeof t.nav;
    return t.nav[key] || pageId;
  };

  // Filter out favorited items from section listings to avoid duplication
  const mainNavItems = favoritesItems.filter((i) => !favorites.includes(i.pageId));
  const projItems = projectsItems.filter((i) => !favorites.includes(i.pageId));
  const commItems = communicationItems.filter((i) => !favorites.includes(i.pageId));
  const teamItemsFiltered = teamItems.filter((i) => !favorites.includes(i.pageId));
  const anaItems = analysisItems.filter((i) => !favorites.includes(i.pageId));
  const pmpItemsFiltered = pmpItems.filter((i) => !favorites.includes(i.pageId));
  const favoriteItems = allNavItems.filter((i) => favorites.includes(i.pageId));

  const handleNavClick = (pageId: PageId) => {
    setActivePage(pageId);
    useAppStore.getState().addRecentItem(pageId);
    setMobileSidebarOpen(false);
  };

  const getFavoriteLabel = (pageId: PageId) =>
    favorites.includes(pageId) ? t.sidebar.removeFromFavorites : t.sidebar.addToFavorites;

  const renderNavItem = (item: NavItemConfig) => (
    <NavItem
      key={item.pageId}
      icon={item.icon}
      label={getNavLabel(item.pageId)}
      pageId={item.pageId}
      badge={getNavBadge(item.pageId)}
      active={activePage === item.pageId}
      collapsed={sidebarCollapsed}
      isFavorite={favorites.includes(item.pageId)}
      onClick={() => handleNavClick(item.pageId)}
      onToggleFavorite={() => toggleFavorite(item.pageId)}
      favoriteLabel={getFavoriteLabel(item.pageId)}
    />
  );

  const sidebarContent = (
    <div className="flex flex-col h-screen bg-sidebar text-sidebar-foreground">
      {/* Organization Switcher - with gradient background */}
      <div className="px-3 py-3 flex-shrink-0 bg-gradient-to-b from-sidebar-accent/50 to-transparent">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-sidebar-accent transition-colors',
                sidebarCollapsed && 'justify-center px-0'
              )}
            >
              <OrganizationLogo
                logo={activeOrganization?.logo}
                icon={activeOrganization?.icon || '🏢'}
                color={activeOrganization?.color || '#3b82f6'}
                name={activeOrganization?.name || 'Organization'}
                className={cn(
                  'w-8 h-8 rounded-lg text-sm font-bold',
                  sidebarCollapsed && 'ring-2 ring-offset-1 ring-offset-sidebar'
                )}
                iconClassName="text-sm font-bold"
              />
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">
                        {activeOrganization?.name || 'Organization'}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-semibold bg-[oklch(0.55_0.18_250/0.15)] text-[oklch(0.55_0.18_250)]">
                        {t.topbar.pro}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-sidebar-foreground/60">
                      <Globe className="h-2.5 w-2.5" />
                      {activeOrganization?.country || 'France'}
                      <span className="text-sidebar-foreground/40">·</span>
                      {activeOrganization?.memberCount || 0} {t.sidebar.members}
                    </div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/60 flex-shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-56">
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">{t.sidebar.organizations}</div>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => setActiveOrganization(org.id)}
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <OrganizationLogo
                  logo={org.logo}
                  icon={org.icon}
                  color={org.color}
                  name={org.name}
                  className="w-6 h-6 rounded text-xs font-bold"
                  iconClassName="text-xs font-bold"
                />
                <div className="flex-1 min-w-0">
                  <span className="truncate block">{org.name}</span>
                  <span className="text-[10px] text-muted-foreground">{org.country}</span>
                </div>
                {org.id === activeOrganizationId && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[oklch(0.55_0.18_250)]" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-[oklch(0.55_0.18_250)] cursor-pointer"
              onClick={() => useAppStore.getState().setCreateWorkspaceDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t.sidebar.createOrganization}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Gradient border under organization switcher */}
      <div className="bg-gradient-to-r from-[oklch(0.55_0.18_250/0.3)] via-[oklch(0.55_0.18_250/0.1)] to-transparent h-px" />

      {/* Quick Stats mini-section */}
      {!sidebarCollapsed && (
        <div className="px-3 py-2 flex-shrink-0">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-sidebar-accent/40 border border-sidebar-border/20">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="p-1.5 rounded-md bg-amber-500/10">
                <ListChecks className="h-3 w-3 text-amber-600" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-sidebar-foreground">{tasksTodoCount}</span>
                <span className="text-[10px] text-sidebar-foreground/65 ml-1 truncate">{t.sidebar.tasksTodo}</span>
              </div>
            </div>
            <div className="w-px h-5 bg-sidebar-border/30" />
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="p-1.5 rounded-md bg-cyan-500/10">
                <Video className="h-3 w-3 text-cyan-600" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-sidebar-foreground">{meetingsTodayCount}</span>
                <span className="text-[10px] text-sidebar-foreground/65 ml-1 truncate">{t.sidebar.meetingsToday}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search (in sidebar) + Notification badge — desktop only; top bar covers mobile */}
      {!sidebarCollapsed && (
        <div className="hidden lg:block px-3 py-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => useAppStore.getState().setSearchOpen(true)}
              className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-sidebar-foreground/65 hover:text-sidebar-foreground transition-colors border border-sidebar-border/30 bg-sidebar-accent/30"
            >
              <span className="text-sidebar-foreground/50 text-[10px]">✦</span>
              <Search className="h-3.5 w-3.5" />
              <span>{t.sidebar.search}</span>
              <kbd className="ml-auto text-[10px] border border-sidebar-border/50 rounded px-1">⌘K</kbd>
            </button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => useAppStore.getState().setNotificationPanelOpen(true)}
                    className={cn(
                      'relative flex items-center justify-center h-8 w-8 rounded-lg border transition-all duration-200',
                      unreadCount > 0
                        ? 'border-[oklch(0.55_0.18_250/0.3)] bg-[oklch(0.55_0.18_250/0.1)] text-[oklch(0.55_0.18_250)] hover:bg-[oklch(0.55_0.18_250/0.15)]'
                        : 'border-sidebar-border/30 bg-sidebar-accent/30 text-sidebar-foreground/65 hover:text-sidebar-foreground'
                    )}
                  >
                    <Bell className="h-3.5 w-3.5" />
                    {unreadCount > 0 && (
                      <>
                        <span className="absolute -top-1 -right-1 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-[oklch(0.55_0.18_250)] text-white text-[9px] font-bold px-1">
                          {unreadCount}
                        </span>
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[oklch(0.55_0.18_250)] opacity-40 animate-ping" />
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {t.notificationPanel.title} {unreadCount > 0 ? `(${unreadCount})` : ''}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Collapsed sidebar: Notification bell */}
      {sidebarCollapsed && (
        <div className="px-2 py-2 flex-shrink-0 flex justify-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => useAppStore.getState().setNotificationPanelOpen(true)}
                  className="relative flex items-center justify-center h-8 w-8 rounded-lg border border-sidebar-border/30 bg-sidebar-accent/30 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <>
                      <span className="absolute -top-1 -right-1 h-3.5 min-w-[14px] flex items-center justify-center rounded-full bg-[oklch(0.55_0.18_250)] text-white text-[8px] font-bold px-0.5">
                        {unreadCount}
                      </span>
                      <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-[oklch(0.55_0.18_250)] opacity-30 animate-ping" />
                    </>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {t.notificationPanel.title} {unreadCount > 0 ? `(${unreadCount})` : ''}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Quick Actions */}
      {!sidebarCollapsed && (
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8 text-[10px] gap-1 font-medium text-sidebar-foreground/70 hover:text-[oklch(0.55_0.18_250)] hover:bg-[oklch(0.55_0.18_250/0.1)] border border-sidebar-border/20"
                    onClick={() => useAppStore.getState().setCreateTaskDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                    {t.sidebar.quickTask}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>+ {t.sidebar.quickTask}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8 text-[10px] gap-1 font-medium text-sidebar-foreground/70 hover:text-amber-500 hover:bg-amber-500/10 border border-sidebar-border/20"
                    onClick={() => useAppStore.getState().setCreateProjectDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                    {t.sidebar.quickProject}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>+ {t.sidebar.quickProject}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8 text-[10px] gap-1 font-medium text-sidebar-foreground/70 hover:text-rose-500 hover:bg-rose-500/10 border border-sidebar-border/20"
                    onClick={() => setActivePage('time-tracking')}
                  >
                    <Timer className="h-3 w-3" />
                    {t.sidebar.quickTimeTracking}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>+ {t.sidebar.quickTimeTracking}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      <Separator className="bg-sidebar-border/50 flex-shrink-0" />

      {/* Gradient separator line between sections */}
      <div className="mx-3 h-px flex-shrink-0 bg-gradient-to-r from-transparent via-[oklch(0.55_0.18_250/0.2)] to-transparent" />

      {/* Scrollable Navigation */}
      <ScrollArea className="flex-1 min-h-0 overflow-hidden px-2 py-1">
        {/* Pinned pages — only explicitly favorited items */}
        {favoriteItems.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>{t.sidebar.pinned}</SectionLabel>
            <div className="space-y-0.5">
              {favoriteItems.map((item) => renderNavItem(item))}
            </div>
          </>
        )}

        {/* Core pages — always available, separate from favorites */}
        {mainNavItems.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>{t.sidebar.main}</SectionLabel>
            <div className="space-y-0.5">
              {mainNavItems.map((item) => renderNavItem(item))}
            </div>
          </>
        )}

        {/* Projects Section */}
        {projItems.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>{t.sidebar.projects}</SectionLabel>
            <div className="space-y-0.5">
              {projItems.map((item) => renderNavItem(item))}
            </div>
          </>
        )}

        {/* Communication Section */}
        {commItems.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>{t.sidebar.communication}</SectionLabel>
            <div className="space-y-0.5">
              {commItems.map((item) => renderNavItem(item))}
            </div>
          </>
        )}

        {/* Team Section */}
        {teamItemsFiltered.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>{t.sidebar.team}</SectionLabel>
            <div className="space-y-0.5">
              {teamItemsFiltered.map((item) => renderNavItem(item))}
            </div>
          </>
        )}

        {/* Analysis Section */}
        {anaItems.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>{t.sidebar.analysis}</SectionLabel>
            <div className="space-y-0.5">
              {anaItems.map((item) => renderNavItem(item))}
            </div>
          </>
        )}

        {/* PMP Section */}
        {pmpItemsFiltered.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>{t.sidebar.pmp}</SectionLabel>
            <div className="space-y-0.5">
              {pmpItemsFiltered.map((item) => renderNavItem(item))}
            </div>
          </>
        )}

        {/* Settings Section — nested admin pages */}
        <div className="pt-2">
          <NavSettingsGroup
          items={settingsSubItems}
          activePage={activePage}
          collapsed={sidebarCollapsed}
          favorites={favorites}
          settingsLabel={t.sidebar.settings}
          getNavLabel={getNavLabel}
          getNavBadge={getNavBadge}
          getFavoriteLabel={getFavoriteLabel}
          onNavigate={handleNavClick}
          onToggleFavorite={toggleFavorite}
        />
        </div>
      </ScrollArea>

      <Separator className="bg-sidebar-border/50" />

      {/* Separator above shortcuts hint */}
      <div className="mx-3 border-t border-sidebar-border/30" />

      {/* Keyboard Shortcuts hint */}
      <div className="px-3 py-2 flex-shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => useAppStore.getState().setShortcutsHelpOpen(true)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors border border-sidebar-border/30 min-h-[36px]',
                  sidebarCollapsed && 'justify-center px-0'
                )}
              >
                <Keyboard className="h-3.5 w-3.5" />
                {!sidebarCollapsed && (
                  <>
                    <span>{t.shortcuts.title}</span>
                    <kbd className="ml-auto text-[10px] border border-sidebar-border/50 rounded px-1">?</kbd>
                  </>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>{t.shortcuts.title}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Collapse sidebar button */}
      {!sidebarCollapsed && (
        <div className="px-3 pb-3 pt-1">
          <button
            onClick={() => useAppStore.getState().setSidebarCollapsed(true)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors min-h-[36px]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>{t.sidebar.collapseSidebar}</span>
          </button>
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
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] z-50 shadow-2xl"
            >
              {/* Close button for mobile */}
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground"
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

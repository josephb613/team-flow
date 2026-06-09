'use client';

import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
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
  Mail,
  FileText,
  Megaphone,
  Target,
  Calendar,
  BookOpen,
  ImageIcon,
  LayoutTemplate,
  FilePen,
  CheckCircle,
  Archive,
  Clock,
  Send,
  Radio,
  Zap,
  BarChart3,
  PieChart,
  Users,
  Shield,
  Building2,
  ScrollText,
  Settings,
  Search,
  Star,
  ChevronDown,
  ChevronLeft,
  Plus,
  LogOut,
  X,
  Keyboard,
  ListChecks,
  CalendarClock,
  Globe,
  Bell,
} from 'lucide-react';
import type { PageId } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

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
  const [hovered, setHovered] = useState(false);

  const content = (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group relative overflow-hidden min-h-[44px]',
        active
          ? 'bg-gradient-to-r from-[oklch(0.55_0.18_250/0.15)] to-[oklch(0.55_0.18_250/0.05)] text-[oklch(0.65_0.18_250)] font-medium'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
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
      <span className={cn(
        'flex-shrink-0 transition-transform duration-150 group-hover:scale-110',
        active ? 'text-[oklch(0.55_0.18_250)]' : ''
      )}>{icon}</span>
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
          <TooltipContent side="right" sideOffset={8} className="flex items-center gap-2 font-medium">
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
      <span className="text-[10px] uppercase tracking-wider font-semibold text-sidebar-foreground/40 flex items-center gap-1">
        {children}
      </span>
    </div>
  );
}

// CMS Navigation items grouped by section
const communicationItems: NavItemConfig[] = [
  { icon: <LayoutDashboard className="h-4 w-4" />, label: 'Dashboard', pageId: 'dashboard' },
  { icon: <Mail className="h-4 w-4" />, label: 'Newsletters', pageId: 'newsletters', badge: 3 },
  { icon: <FileText className="h-4 w-4" />, label: 'Articles', pageId: 'articles', badge: 7 },
  { icon: <Megaphone className="h-4 w-4" />, label: 'Announcements', pageId: 'announcements' },
  { icon: <Target className="h-4 w-4" />, label: 'Campaigns', pageId: 'campaigns', badge: 2 },
  { icon: <Calendar className="h-4 w-4" />, label: 'Editorial Calendar', pageId: 'editorial-calendar' },
];

const contentManagementItems: NavItemConfig[] = [
  { icon: <BookOpen className="h-4 w-4" />, label: 'Library', pageId: 'library' },
  { icon: <ImageIcon className="h-4 w-4" />, label: 'Media', pageId: 'media' },
  { icon: <LayoutTemplate className="h-4 w-4" />, label: 'Templates', pageId: 'templates' },
  { icon: <FilePen className="h-4 w-4" />, label: 'Drafts', pageId: 'drafts', badge: 5 },
  { icon: <CheckCircle className="h-4 w-4" />, label: 'Published', pageId: 'published' },
  { icon: <Archive className="h-4 w-4" />, label: 'Archive', pageId: 'archive' },
];

const distributionItems: NavItemConfig[] = [
  { icon: <Clock className="h-4 w-4" />, label: 'Scheduling', pageId: 'scheduling', badge: 1 },
  { icon: <Send className="h-4 w-4" />, label: 'Publishing', pageId: 'publishing' },
  { icon: <Radio className="h-4 w-4" />, label: 'Channels', pageId: 'channels' },
  { icon: <Zap className="h-4 w-4" />, label: 'Automations', pageId: 'automations' },
];

const analysisItems: NavItemConfig[] = [
  { icon: <BarChart3 className="h-4 w-4" />, label: 'Statistics', pageId: 'statistics' },
  { icon: <PieChart className="h-4 w-4" />, label: 'Reports', pageId: 'reports' },
];

const administrationItems: NavItemConfig[] = [
  { icon: <Users className="h-4 w-4" />, label: 'Users', pageId: 'users' },
  { icon: <Shield className="h-4 w-4" />, label: 'Roles & Permissions', pageId: 'roles' },
  { icon: <Building2 className="h-4 w-4" />, label: 'Tenants', pageId: 'tenants' },
  { icon: <ScrollText className="h-4 w-4" />, label: 'Audit Log', pageId: 'audit' },
  { icon: <Settings className="h-4 w-4" />, label: 'Settings', pageId: 'settings' },
];

const allNavItems: NavItemConfig[] = [
  ...communicationItems,
  ...contentManagementItems,
  ...distributionItems,
  ...analysisItems,
  ...administrationItems,
];

const communicationPageIds: Set<string> = new Set(communicationItems.map(i => i.pageId));
const contentManagementPageIds: Set<string> = new Set(contentManagementItems.map(i => i.pageId));
const distributionPageIds: Set<string> = new Set(distributionItems.map(i => i.pageId));
const analysisPageIds: Set<string> = new Set(analysisItems.map(i => i.pageId));
const administrationPageIds: Set<string> = new Set(administrationItems.map(i => i.pageId));

export function AppSidebar() {
  const {
    activePage,
    setActivePage,
    tenants,
    activeTenantId,
    setActiveTenant,
    sidebarCollapsed,
    favorites,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    recentItems,
    notifications,
  } = useAppStore();
  const { t } = useTranslation();

  const activeTenant = tenants.find((t) => t.id === activeTenantId);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Helper to get translated nav label by pageId
  const getNavLabel = (pageId: string): string => {
    const key = pageId as keyof typeof t.nav;
    return t.nav[key] || pageId;
  };

  // Filter out favorited items from section listings to avoid duplication
  const commItems = communicationItems.filter((i) => !favorites.includes(i.pageId));
  const contentItems = contentManagementItems.filter((i) => !favorites.includes(i.pageId));
  const distItems = distributionItems.filter((i) => !favorites.includes(i.pageId));
  const anaItems = analysisItems.filter((i) => !favorites.includes(i.pageId));
  const adminItems = administrationItems.filter((i) => !favorites.includes(i.pageId));
  const favoriteItems = allNavItems.filter((i) => favorites.includes(i.pageId));

  // Recent items (last 3, matching nav items)
  const recentNavItems = recentItems
    .slice(0, 3)
    .map((pageId) => allNavItems.find((i) => i.pageId === pageId))
    .filter(Boolean) as NavItemConfig[];

  const handleNavClick = (pageId: PageId) => {
    setActivePage(pageId);
    useAppStore.getState().addRecentItem(pageId);
    setMobileSidebarOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-screen bg-sidebar text-sidebar-foreground">
      {/* Tenant Switcher - with gradient background */}
      <div className="px-3 py-3 flex-shrink-0 bg-gradient-to-b from-sidebar-accent/50 to-transparent">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-sidebar-accent transition-colors',
                sidebarCollapsed && 'justify-center px-0'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm',
                  sidebarCollapsed && 'ring-2 ring-offset-1 ring-offset-sidebar'
                )}
                style={{
                  backgroundColor: activeTenant?.color || '#3b82f6',
                  ...(sidebarCollapsed ? { boxShadow: `0 0 0 2px var(--sidebar-background), 0 0 0 4px ${activeTenant?.color || '#3b82f6'}40` } : {}),
                }}
              >
                {activeTenant?.icon || '🏢'}
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">
                        {activeTenant?.name || 'Tenant'}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-semibold bg-[oklch(0.55_0.18_250/0.15)] text-[oklch(0.55_0.18_250)]">
                        {t.topbar.pro}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-sidebar-foreground/40">
                      <Globe className="h-2.5 w-2.5" />
                      {activeTenant?.country || 'France'}
                      <span className="text-sidebar-foreground/20">·</span>
                      {activeTenant?.memberCount || 0} {t.sidebar.members}
                    </div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40 flex-shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-56">
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">{t.sidebar.tenants}</div>
            {tenants.map((tenant) => (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => setActiveTenant(tenant.id)}
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: tenant.color }}
                >
                  {tenant.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="truncate block">{tenant.name}</span>
                  <span className="text-[10px] text-muted-foreground">{tenant.country}</span>
                </div>
                {tenant.id === activeTenantId && (
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
              {t.sidebar.createTenant}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[oklch(0.55_0.18_250)]">
              <LogOut className="h-4 w-4 mr-2" />
              {t.sidebar.createTenant}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Gradient border under tenant switcher */}
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
                <span className="text-xs font-semibold text-sidebar-foreground">5</span>
                <span className="text-[10px] text-sidebar-foreground/50 ml-1 truncate">{t.sidebar.contentDueToday}</span>
              </div>
            </div>
            <div className="w-px h-5 bg-sidebar-border/30" />
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className="p-1.5 rounded-md bg-cyan-500/10">
                <CalendarClock className="h-3 w-3 text-cyan-600" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-sidebar-foreground">2</span>
                <span className="text-[10px] text-sidebar-foreground/50 ml-1 truncate">{t.sidebar.schedulingToday}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search (in sidebar) + Notification badge */}
      {!sidebarCollapsed && (
        <div className="px-3 py-2 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => useAppStore.getState().setSearchOpen(true)}
              className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors border border-sidebar-border/40 bg-sidebar-accent/50"
            >
              <span className="text-sidebar-foreground/40 text-[10px]">✦</span>
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
                        : 'border-sidebar-border/30 bg-sidebar-accent/30 text-sidebar-foreground/40 hover:text-sidebar-foreground/70'
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
                  className="relative flex items-center justify-center h-8 w-8 rounded-lg border border-sidebar-border/30 bg-sidebar-accent/30 text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/50 transition-all"
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
                    className="flex-1 h-8 text-[10px] gap-1 text-sidebar-foreground/50 hover:text-[oklch(0.55_0.18_250)] hover:bg-[oklch(0.55_0.18_250/0.1)] border border-sidebar-border/20"
                    onClick={() => useAppStore.getState().setCreateContentDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                    {t.sidebar.quickContent}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>+ {t.sidebar.quickContent}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8 text-[10px] gap-1 text-sidebar-foreground/50 hover:text-amber-500 hover:bg-amber-500/10 border border-sidebar-border/20"
                    onClick={() => setActivePage('campaigns')}
                  >
                    <Plus className="h-3 w-3" />
                    {t.sidebar.quickCampaign}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>+ {t.sidebar.quickCampaign}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8 text-[10px] gap-1 text-sidebar-foreground/50 hover:text-rose-500 hover:bg-rose-500/10 border border-sidebar-border/20"
                    onClick={() => setActivePage('scheduling')}
                  >
                    <Plus className="h-3 w-3" />
                    {t.sidebar.quickSchedule}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>+ {t.sidebar.quickSchedule}</TooltipContent>
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
        {/* Favorites */}
        {favoriteItems.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>{t.sidebar.pinned}</SectionLabel>
            <div className="space-y-0.5">
              {favoriteItems.map((item) => (
                <NavItem
                  key={item.pageId}
                  icon={item.icon}
                  label={getNavLabel(item.pageId)}
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

        {/* Recent Section */}
        {recentNavItems.length > 0 && !sidebarCollapsed && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {t.sidebar.recent}
              </span>
            </SectionLabel>
            <div className="space-y-0.5">
              {recentNavItems.map((item) => (
                <button
                  key={`recent-${item.pageId}`}
                  onClick={() => handleNavClick(item.pageId)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 min-h-[36px]',
                    activePage === item.pageId
                      ? 'bg-[oklch(0.55_0.18_250/0.08)] text-[oklch(0.55_0.18_250)]'
                      : 'text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="flex-1 text-left truncate">{getNavLabel(item.pageId)}</span>
                  <Clock className="h-3 w-3 text-sidebar-foreground/30" />
                </button>
              ))}
            </div>
          </>
        )}

        {/* Communication Section */}
        {commItems.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>{t.sidebar.communication}</SectionLabel>
            <div className="space-y-0.5">
              {commItems.map((item) => (
                <NavItem
                  key={item.pageId}
                  icon={item.icon}
                  label={getNavLabel(item.pageId)}
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

        {/* Content Management Section */}
        {contentItems.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>{t.sidebar.contentManagement}</SectionLabel>
            <div className="space-y-0.5">
              {contentItems.map((item) => (
                <NavItem
                  key={item.pageId}
                  icon={item.icon}
                  label={getNavLabel(item.pageId)}
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

        {/* Distribution Section */}
        {distItems.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>{t.sidebar.distribution}</SectionLabel>
            <div className="space-y-0.5">
              {distItems.map((item) => (
                <NavItem
                  key={item.pageId}
                  icon={item.icon}
                  label={getNavLabel(item.pageId)}
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

        {/* Analysis Section */}
        {anaItems.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>{t.sidebar.analysis}</SectionLabel>
            <div className="space-y-0.5">
              {anaItems.map((item) => (
                <NavItem
                  key={item.pageId}
                  icon={item.icon}
                  label={getNavLabel(item.pageId)}
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

        {/* Administration Section */}
        {adminItems.length > 0 && (
          <>
            <SectionLabel collapsed={sidebarCollapsed}>{t.sidebar.administration}</SectionLabel>
            <div className="space-y-0.5">
              {adminItems.map((item) => (
                <NavItem
                  key={item.pageId}
                  icon={item.icon}
                  label={getNavLabel(item.pageId)}
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
                  'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground/70 transition-colors border border-sidebar-border/30 min-h-[36px]',
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
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground/70 transition-colors min-h-[36px]"
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

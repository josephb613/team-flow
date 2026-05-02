'use client';

import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  Bell,
  PanelLeftClose,
  PanelLeft,
  Menu,
  Command,
  Moon,
  Sun,
  LogOut,
  Settings,
  User,
  Plus,
  CheckSquare,
  FolderKanban,
  Video,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { PageId } from '@/lib/types';

export function TopBar() {
  const {
    activePage,
    activeWorkspaceId,
    workspaces,
    sidebarCollapsed,
    toggleSidebar,
    setSearchOpen,
    notifications,
    setNotificationPanelOpen,
    setCreateWorkspaceDialogOpen,
    currentUser,
    logout,
    setMobileSidebarOpen,
    locale,
    setLocale,
    setActivePage,
  } = useAppStore();
  const { t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const getPageName = (page: string): string => {
    const key = page as keyof typeof t.nav;
    return t.nav[key] || page;
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 border-b bg-background/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger menu */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop sidebar toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex h-8 w-8"
                onClick={toggleSidebar}
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {sidebarCollapsed ? t.topbar.expandSidebar : t.topbar.collapseSidebar}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Breadcrumb navigation */}
        <Breadcrumb className="hidden sm:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                asChild
                className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              >
                <span onClick={() => setActivePage('dashboard')}>
                  {activeWorkspace?.name || 'TeamFlow'}
                </span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-3.5 w-3.5" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePage}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                >
                  <BreadcrumbPage className="font-semibold text-foreground">
                    {getPageName(activePage)}
                  </BreadcrumbPage>
                </motion.div>
              </AnimatePresence>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Mobile page title */}
        <AnimatePresence mode="wait">
          <motion.h1
            key={activePage}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="sm:hidden text-lg font-semibold"
          >
            {getPageName(activePage)}
          </motion.h1>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Search bar */}
        <Button
          variant="outline"
          className={cn(
            'hidden md:flex items-center gap-2 h-9 px-3 text-muted-foreground hover:text-foreground',
            'w-60 justify-start'
          )}
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">{t.topbar.search}</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Quick create dropdown */}
        <DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>{t.topbar.quickCreate}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-[oklch(0.55_0.15_160)]" />
              {t.topbar.quickCreate}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => setActivePage('tasks')}
            >
              <CheckSquare className="h-4 w-4 mr-2 text-[oklch(0.55_0.15_160)]" />
              {t.topbar.newTask}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => setActivePage('projects')}
            >
              <FolderKanban className="h-4 w-4 mr-2 text-amber-500" />
              {t.topbar.newProject}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => setActivePage('meetings')}
            >
              <Video className="h-4 w-4 mr-2 text-rose-500" />
              {t.topbar.scheduleMeeting}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-[oklch(0.55_0.15_160)]"
              onClick={() => setCreateWorkspaceDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t.sidebar.createWorkspace}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Language toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-xs font-bold"
                onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
              >
                {locale.toUpperCase()}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{locale === 'fr' ? 'English' : 'Français'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Theme toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.topbar.toggleTheme}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Notifications - now opens the slide-out panel */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 relative"
                onClick={() => setNotificationPanelOpen(true)}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] p-0 flex items-center justify-center text-[10px] bg-[oklch(0.55_0.15_160)] text-white border-2 border-background">
                      {unreadCount}
                    </Badge>
                  </motion.div>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.topbar.notifications}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2 ml-0.5">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-[oklch(0.55_0.15_160)] text-white text-xs">
                  {currentUser?.name?.split(' ').map((n: string) => n[0]).join('') || 'AT'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium leading-tight max-w-[120px] truncate">
                  {currentUser?.name || 'Alex Thompson'}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {currentUser?.role || t.topbar.admin}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-[oklch(0.55_0.15_160)] text-white text-sm">
                  {currentUser?.name?.split(' ').map((n: string) => n[0]).join('') || 'AT'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentUser?.name || 'Alex Thompson'}</p>
                <p className="text-xs text-muted-foreground truncate">{currentUser?.email || 'alex@acmecorp.com'}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="h-4 w-4 mr-2" />
              {t.topbar.profile}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => useAppStore.getState().setActivePage('settings' as PageId)}
            >
              <Settings className="h-4 w-4 mr-2" />
              {t.topbar.settings}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              {t.topbar.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

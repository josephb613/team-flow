'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  User,
  Bell,
  Palette,
  Globe,
  Shield,
  CreditCard,
  Link2,
  Trash2,
  Camera,
  Save,
  Check,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  Moon,
  PanelLeftClose,
  Mail,
  MessageSquare,
  AtSign,
  ListChecks,
  CalendarClock,
  FolderKanban,
  Github,
  Hash,
  Figma,
  HardDrive,
  Code2,
  Columns3,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  Pencil,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { buildStatusConfig, DEFAULT_COLUMNS, ICON_MAP } from '@/lib/column-utils';
import type { BoardColumn } from '@/lib/types';

// ─── Settings Sections Config ────────────────────────────────────────────────
const settingsSections = [
  { id: 'general', labelKey: 'general', icon: Globe },
  { id: 'profile', labelKey: 'profile', icon: User },
  { id: 'notifications', labelKey: 'notifications', icon: Bell },
  { id: 'integrations', labelKey: 'integrations', icon: Link2 },
  { id: 'workspace', labelKey: 'workspace', icon: Shield },
  { id: 'columns', labelKey: 'columns', icon: Columns3 },
  { id: 'billing', labelKey: 'billing', icon: CreditCard },
];

// ─── Integration Config ──────────────────────────────────────────────────────
const integrations = [
  { name: 'GitHub', desc: 'Sync issues and pull requests', connected: true, color: '#24292e', icon: Github },
  { name: 'Slack', desc: 'Post updates to Slack channels', connected: true, color: '#4A154B', icon: Hash },
  { name: 'Figma', desc: 'Embed Figma designs in tasks', connected: false, color: '#F24E1E', icon: Figma },
  { name: 'Google Drive', desc: 'Attach files from Google Drive', connected: false, color: '#34A853', icon: HardDrive },
  { name: 'Jira', desc: 'Sync with Jira projects', connected: false, color: '#0052CC', icon: Code2 },
];

// ─── Animation ───────────────────────────────────────────────────────────────
const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ─── Main Component ──────────────────────────────────────────────────────────
export function SettingsView() {
  const { t } = useTranslation();

  const [activeSection, setActiveSection] = useState('general');
  const currentUser = useAppStore((s) => s.currentUser);
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const workspaces = useAppStore((s) => s.workspaces);
  const removeWorkspace = useAppStore((s) => s.removeWorkspace);
  const updateWorkspace = useAppStore((s) => s.updateWorkspace);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [workspaceForm, setWorkspaceForm] = useState({
    name: '',
    slug: '',
    description: '',
  });
  const [workspaceSaving, setWorkspaceSaving] = useState(false);
  const [workspaceSaveFeedback, setWorkspaceSaveFeedback] = useState<'idle' | 'success' | 'error'>('idle');

  // Sync form state when the active workspace changes
  useEffect(() => {
    if (activeWorkspace) {
      setWorkspaceForm({
        name: activeWorkspace.name || '',
        slug: activeWorkspace.slug || '',
        description: activeWorkspace.description || '',
      });
    }
  }, [activeWorkspace?.id]);

  const handleSaveWorkspace = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setWorkspaceSaving(true);
    setWorkspaceSaveFeedback('idle');
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workspaceForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update workspace');
      }
      const updated = await res.json();
      updateWorkspace(activeWorkspaceId, {
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
      });
      setWorkspaceSaveFeedback('success');
      setTimeout(() => setWorkspaceSaveFeedback('idle'), 2500);
    } catch (err) {
      console.error('Failed to update workspace:', err);
      setWorkspaceSaveFeedback('error');
      setTimeout(() => setWorkspaceSaveFeedback('idle'), 3500);
    } finally {
      setWorkspaceSaving(false);
    }
  }, [activeWorkspaceId, workspaceForm, updateWorkspace]);

  // ─── Columns management ─────────────────────────────────────────────────
  const columns = useAppStore((s) => s.columns);
  const setColumns = useAppStore((s) => s.setColumns);
  const workspaceColumns = useMemo(() => {
    return columns.filter((c) => c.workspaceId === activeWorkspaceId);
  }, [columns, activeWorkspaceId]);
  const [columnAdding, setColumnAdding] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#6366f1');
  const [newColumnIcon, setNewColumnIcon] = useState('circle');
  const [columnSaving, setColumnSaving] = useState(false);
  const [columnEditingId, setColumnEditingId] = useState<string | null>(null);
  const [columnEditName, setColumnEditName] = useState('');

  const handleAddColumn = useCallback(async () => {
    if (!activeWorkspaceId || !newColumnName.trim()) return;
    setColumnSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newColumnName.trim(), color: newColumnColor, icon: newColumnIcon }),
      });
      if (!res.ok) throw new Error('Failed to create column');
      const newCol = await res.json();
      setColumns([...columns, { ...newCol, workspaceId: activeWorkspaceId }]);
      setNewColumnName('');
      setNewColumnColor('#6366f1');
      setNewColumnIcon('circle');
      setColumnAdding(false);
    } catch (err) {
      console.error('Failed to add column:', err);
    } finally {
      setColumnSaving(false);
    }
  }, [activeWorkspaceId, newColumnName, newColumnColor, newColumnIcon, columns, setColumns]);

  const handleRenameColumn = useCallback(async (columnId: string) => {
    if (!activeWorkspaceId || !columnEditName.trim()) return;
    setColumnSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/columns/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: columnEditName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to rename column');
      const updated = await res.json();
      setColumns(columns.map((c) => c.id === columnId ? { ...c, ...updated } : c));
      setColumnEditingId(null);
      setColumnEditName('');
    } catch (err) {
      console.error('Failed to rename column:', err);
    } finally {
      setColumnSaving(false);
    }
  }, [activeWorkspaceId, columnEditName, columns, setColumns]);

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    if (!activeWorkspaceId) return;
    setColumnSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/columns/${columnId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete column');
      }
      setColumns(columns.filter((c) => c.id !== columnId));
    } catch (err) {
      console.error('Failed to delete column:', err);
    } finally {
      setColumnSaving(false);
    }
  }, [activeWorkspaceId, columns, setColumns]);

  const handleMoveColumn = useCallback(async (columnId: string, direction: 'up' | 'down') => {
    if (!activeWorkspaceId) return;
    const sorted = [...workspaceColumns].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === columnId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const target = sorted[swapIdx];
    setColumnSaving(true);
    try {
      await fetch(`/api/workspaces/${activeWorkspaceId}/columns/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: target.order }),
      });
      await fetch(`/api/workspaces/${activeWorkspaceId}/columns/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: sorted[idx].order }),
      });
      // Refresh from API
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/columns`);
      if (res.ok) {
        const freshColumns = await res.json();
        setColumns(columns.filter((c) => c.workspaceId !== activeWorkspaceId).concat(
          freshColumns.map((c: BoardColumn) => ({ ...c, workspaceId: activeWorkspaceId }))
        ));
      }
    } catch (err) {
      console.error('Failed to move column:', err);
    } finally {
      setColumnSaving(false);
    }
  }, [activeWorkspaceId, workspaceColumns, columns, setColumns]);

  const colorPresets = ['#6366f1', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#14b8a6', '#f97316', '#64748b'];
  const iconOptions = ['circle', 'clock', 'alert-circle', 'check-circle-2', 'star', 'flag', 'target', 'zap', 'heart', 'bookmark', 'lightbulb', 'eye'];

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    mentions: true,
    assignments: true,
    deadlines: true,
    updates: false,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [generalSettings, setGeneralSettings] = useState({
    darkMode: false,
    compactSidebar: false,
  });

  const getSectionLabel = (id: string) => {
    const key = id as keyof typeof t.settings;
    return t.settings[key] || id;
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspaceId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete workspace');
      }
      removeWorkspace(activeWorkspaceId);
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error('Failed to delete workspace:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">{t.settings.title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t.settings.subtitle}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ─── Settings Nav Sidebar ──────────────────────────────────────── */}
        <nav className="lg:w-56 flex-shrink-0">
          <Card className="lg:p-2 overflow-hidden border shadow-sm">
            <div className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible p-1">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-all duration-200 w-full text-left font-medium',
                      isActive
                        ? 'bg-[oklch(0.55_0.15_160/0.08)] text-[oklch(0.55_0.15_160)] shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="settings-active-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-[oklch(0.55_0.15_160)]"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {getSectionLabel(section.id)}
                  </button>
                );
              })}
            </div>
          </Card>
        </nav>

        {/* ─── Settings Content ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              variants={sectionVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="space-y-5"
            >
              {/* General */}
              {activeSection === 'general' && (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/15">
                        <Globe className="h-4 w-4 text-teal-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{t.settings.general}</CardTitle>
                        <CardDescription>{t.settings.subtitle}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t.settings.language}</Label>
                      <Input
                        defaultValue="English (US)"
                        className="max-w-xs bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160/0.3)] focus:bg-background transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t.settings.timezone}</Label>
                      <Input
                        defaultValue="UTC+1 (West Africa Time)"
                        className="max-w-xs bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160/0.3)] focus:bg-background transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t.settings.dateFormat}</Label>
                      <Input
                        defaultValue="MM/DD/YYYY"
                        className="max-w-xs bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160/0.3)] focus:bg-background transition-all"
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Moon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">{t.settings.darkMode}</Label>
                          <p className="text-xs text-muted-foreground">{t.settings.darkModeDesc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={generalSettings.darkMode}
                        onCheckedChange={(v) => setGeneralSettings((p) => ({ ...p, darkMode: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">{t.settings.compactSidebar}</Label>
                          <p className="text-xs text-muted-foreground">{t.settings.compactSidebarDesc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={generalSettings.compactSidebar}
                        onCheckedChange={(v) => setGeneralSettings((p) => ({ ...p, compactSidebar: v }))}
                      />
                    </div>
                    <Button
                      className="gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.50_0.15_165)] hover:from-[oklch(0.50_0.15_160)] hover:to-[oklch(0.45_0.15_165)] shadow-sm shadow-[oklch(0.55_0.15_160/0.2)] text-white"
                    >
                      <Save className="h-4 w-4" /> {t.settings.saveChanges}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Profile */}
              {activeSection === 'profile' && (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
                        <User className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{t.settings.profileSettings}</CardTitle>
                        <CardDescription>{t.settings.profileDesc}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[oklch(0.55_0.15_160)] to-[oklch(0.50_0.15_165)] flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-[oklch(0.55_0.15_160/0.2)]">
                          {currentUser?.name?.split(' ').map((n: string) => n[0]).join('') || 'AT'}
                        </div>
                        <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[oklch(0.55_0.15_160)] text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div>
                        <p className="font-semibold">{currentUser?.name || 'Alex Thompson'}</p>
                        <p className="text-sm text-muted-foreground">{currentUser?.email || 'alex@acmecorp.com'}</p>
                        <Badge className="mt-1 text-[10px] bg-teal-500/10 text-teal-700 border-0">
                          Admin
                        </Badge>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t.settings.firstName}</Label>
                        <Input defaultValue="Alex" className="bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160/0.3)] focus:bg-background transition-all" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t.settings.lastName}</Label>
                        <Input defaultValue="Thompson" className="bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160/0.3)] focus:bg-background transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t.settings.email}</Label>
                      <Input defaultValue={currentUser?.email || 'alex@acmecorp.com'} type="email" className="bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160/0.3)] focus:bg-background transition-all" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t.settings.role}</Label>
                      <Input defaultValue="Admin" disabled className="bg-muted/30 border-transparent max-w-xs" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t.settings.bio}</Label>
                      <Input defaultValue="Product Manager at Acme Corp" className="bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160/0.3)] focus:bg-background transition-all" />
                    </div>
                    <Button
                      className="gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.50_0.15_165)] hover:from-[oklch(0.50_0.15_160)] hover:to-[oklch(0.45_0.15_165)] shadow-sm shadow-[oklch(0.55_0.15_160/0.2)] text-white"
                    >
                      <Save className="h-4 w-4" /> {t.settings.saveChanges}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Notifications */}
              {activeSection === 'notifications' && (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/15">
                        <Bell className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{t.settings.notificationPreferences}</CardTitle>
                        <CardDescription>{t.settings.notificationDesc}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-md bg-muted/50">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <h4 className="text-sm font-semibold">{t.settings.channels}</h4>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <div>
                          <Label className="text-sm font-medium">{t.settings.emailNotif}</Label>
                          <p className="text-xs text-muted-foreground">{t.settings.emailNotifDesc}</p>
                        </div>
                        <Switch checked={notifications.email} onCheckedChange={() => toggleNotification('email')} className="data-[state=checked]:bg-[oklch(0.55_0.15_160)]" />
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <div>
                          <Label className="text-sm font-medium">{t.settings.pushNotif}</Label>
                          <p className="text-xs text-muted-foreground">{t.settings.pushNotifDesc}</p>
                        </div>
                        <Switch checked={notifications.push} onCheckedChange={() => toggleNotification('push')} className="data-[state=checked]:bg-[oklch(0.55_0.15_160)]" />
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-md bg-muted/50">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <h4 className="text-sm font-semibold">{t.settings.events}</h4>
                      </div>
                      {[
                        { key: 'mentions' as const, label: t.settings.mentions, desc: t.settings.mentionsDesc, icon: AtSign },
                        { key: 'assignments' as const, label: t.settings.taskAssignments, desc: t.settings.taskAssignmentsDesc, icon: ListChecks },
                        { key: 'deadlines' as const, label: t.settings.deadlineReminders, desc: t.settings.deadlineRemindersDesc, icon: CalendarClock },
                        { key: 'updates' as const, label: t.settings.projectUpdates, desc: t.settings.projectUpdatesDesc, icon: FolderKanban },
                      ].map((ntf) => (
                        <div key={ntf.key} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted/50">
                              <ntf.icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">{ntf.label}</Label>
                              <p className="text-xs text-muted-foreground">{ntf.desc}</p>
                            </div>
                          </div>
                          <Switch
                            checked={notifications[ntf.key]}
                            onCheckedChange={() => toggleNotification(ntf.key)}
                            className="data-[state=checked]:bg-[oklch(0.55_0.15_160)]"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Integrations */}
              {activeSection === 'integrations' && (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/15">
                        <Link2 className="h-4 w-4 text-cyan-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{t.settings.integrationsTitle}</CardTitle>
                        <CardDescription>{t.settings.integrationsDesc}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {integrations.map((integration, idx) => {
                      const Icon = integration.icon;
                      return (
                        <motion.div
                          key={integration.name}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 + idx * 0.05 }}
                          className={cn(
                            'flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 hover:shadow-sm',
                            integration.connected
                              ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
                              : 'border-border hover:border-border/80'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm border border-white/10"
                              style={{ backgroundColor: integration.color }}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold">{integration.name}</p>
                                {integration.connected && (
                                  <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-700 border-0 font-medium">
                                    <Check className="h-2.5 w-2.5 mr-0.5" />
                                    {t.settings.connected}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{integration.desc}</p>
                            </div>
                          </div>
                          <Button
                            variant={integration.connected ? 'outline' : 'default'}
                            size="sm"
                            className={cn(
                              'gap-1.5 text-xs',
                              !integration.connected && 'bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.50_0.15_165)] hover:from-[oklch(0.50_0.15_160)] hover:to-[oklch(0.45_0.15_165)] text-white shadow-sm'
                            )}
                          >
                            {integration.connected ? (
                              <>
                                <ExternalLink className="h-3 w-3" /> Manage
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3" /> {t.settings.connect}
                              </>
                            )}
                          </Button>
                        </motion.div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Workspace */}
              {activeSection === 'workspace' && (
                <div className="space-y-5">
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/15">
                          <Shield className="h-4 w-4 text-rose-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{t.settings.workspaceSettings}</CardTitle>
                          <CardDescription>{t.settings.workspaceDesc}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t.settings.workspaceName}</Label>
                        <Input
                          value={workspaceForm.name}
                          onChange={(e) => setWorkspaceForm((p) => ({ ...p, name: e.target.value }))}
                          className="bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160/0.3)] focus:bg-background transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t.settings.workspaceUrl}</Label>
                        <Input
                          value={workspaceForm.slug}
                          onChange={(e) => setWorkspaceForm((p) => ({ ...p, slug: e.target.value }))}
                          className="bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160/0.3)] focus:bg-background transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t.settings.description}</Label>
                        <Input
                          value={workspaceForm.description}
                          onChange={(e) => setWorkspaceForm((p) => ({ ...p, description: e.target.value }))}
                          className="bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160/0.3)] focus:bg-background transition-all"
                        />
                      </div>
                      <Button
                        onClick={handleSaveWorkspace}
                        disabled={workspaceSaving}
                        className={cn(
                          'gap-1.5 text-white shadow-sm transition-all duration-200',
                          workspaceSaveFeedback === 'success'
                            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                            : workspaceSaveFeedback === 'error'
                              ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                              : 'bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.50_0.15_165)] hover:from-[oklch(0.50_0.15_160)] hover:to-[oklch(0.45_0.15_165)] shadow-[oklch(0.55_0.15_160/0.2)]',
                        )}
                      >
                        {workspaceSaving ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            {t.settings.saving}
                          </>
                        ) : workspaceSaveFeedback === 'success' ? (
                          <>
                            <Check className="h-4 w-4" /> {t.settings.saved}
                          </>
                        ) : workspaceSaveFeedback === 'error' ? (
                          <>
                            <AlertTriangle className="h-4 w-4" /> {t.settings.saveError}
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" /> {t.settings.saveChanges}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Danger Zone */}
                  <Card className="border-2 border-rose-500/20 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-rose-500 to-rose-600" />
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/15">
                          <AlertTriangle className="h-4 w-4 text-rose-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base text-rose-600">{t.settings.dangerZone}</CardTitle>
                          <CardDescription>{t.settings.dangerDesc}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between p-4 rounded-xl border-2 border-rose-500/20 bg-rose-500/[0.03]">
                        <div>
                          <p className="text-sm font-semibold text-rose-700">{t.settings.deleteWorkspace}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t.settings.deleteWorkspaceDesc}</p>
                        </div>
                        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="gap-1.5 shadow-sm">
                              <Trash2 className="h-4 w-4" /> {t.settings.delete}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-rose-600">
                                {t.settings.deleteWorkspaceConfirmTitle}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t.settings.deleteWorkspaceConfirmDesc}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={deleting}>
                                {t.settings.cancel}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                disabled={deleting}
                                onClick={handleDeleteWorkspace}
                                className="bg-rose-600 hover:bg-rose-700 text-white"
                              >
                                {deleting ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    {t.settings.delete}
                                  </span>
                                ) : (
                                  t.settings.confirm
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Columns */}
              {activeSection === 'columns' && (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/15">
                        <Columns3 className="h-4 w-4 text-violet-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{t.settings.columns}</CardTitle>
                        <CardDescription>{t.settings.columnsDesc}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Existing columns list */}
                    {[...workspaceColumns].sort((a, b) => a.order - b.order).map((col, idx, arr) => {
                      const IconComponent = ICON_MAP[col.icon] || Circle;
                      const isEditing = columnEditingId === col.id;
                      return (
                        <div
                          key={col.id}
                          className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors"
                        >
                          {/* Color dot */}
                          <div
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: col.color }}
                          />
                          {/* Icon */}
                          <div className="p-1.5 rounded-lg bg-muted/50">
                            <IconComponent className="h-4 w-4" style={{ color: col.color }} />
                          </div>
                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  value={columnEditName}
                                  onChange={(e) => setColumnEditName(e.target.value)}
                                  className="h-7 text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameColumn(col.id);
                                    if (e.key === 'Escape') { setColumnEditingId(null); setColumnEditName(''); }
                                  }}
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRenameColumn(col.id)} disabled={columnSaving}>
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setColumnEditingId(null); setColumnEditName(''); }}>
                                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">{col.name}</span>
                                {col.isDefault && (
                                  <Badge className="text-[9px] px-1.5 py-0 h-4 bg-slate-100 text-slate-600 border-0 font-medium">
                                    {t.settings.defaultColumn}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          {/* Actions */}
                          {!isEditing && (
                            <div className="flex items-center gap-0.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                disabled={idx === 0 || columnSaving}
                                onClick={() => handleMoveColumn(col.id, 'up')}
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                disabled={idx === arr.length - 1 || columnSaving}
                                onClick={() => handleMoveColumn(col.id, 'down')}
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                              {!col.isDefault && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => { setColumnEditingId(col.id); setColumnEditName(col.name); }}
                                  disabled={columnSaving}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 hover:text-rose-500"
                                disabled={col.isDefault || columnSaving}
                                onClick={() => handleDeleteColumn(col.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <Separator />

                    {/* Add column form */}
                    {columnAdding ? (
                      <div className="space-y-3 p-4 rounded-xl border-2 border-dashed border-violet-500/20 bg-violet-500/[0.03]">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">{t.settings.columnName}</Label>
                          <Input
                            value={newColumnName}
                            onChange={(e) => setNewColumnName(e.target.value)}
                            placeholder="Backlog"
                            className="h-9"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddColumn(); }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">{t.settings.columnColor}</Label>
                          <div className="flex gap-2 flex-wrap">
                            {colorPresets.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={cn(
                                  'w-7 h-7 rounded-full border-2 transition-all',
                                  newColumnColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105',
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => setNewColumnColor(color)}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">{t.settings.columnIcon}</Label>
                          <div className="flex gap-1.5 flex-wrap">
                            {iconOptions.map((icon) => {
                              const Ico = ICON_MAP[icon] || Circle;
                              return (
                                <button
                                  key={icon}
                                  type="button"
                                  className={cn(
                                    'p-1.5 rounded-lg border transition-all',
                                    newColumnIcon === icon ? 'border-violet-500 bg-violet-500/10' : 'border-transparent hover:bg-muted',
                                  )}
                                  onClick={() => setNewColumnIcon(icon)}
                                >
                                  <Ico className="h-4 w-4" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={handleAddColumn}
                            disabled={!newColumnName.trim() || columnSaving}
                            className="gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.50_0.15_165)] text-white shadow-sm"
                          >
                            {columnSaving ? (
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            {t.settings.saveChanges}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setColumnAdding(false)} disabled={columnSaving}>
                            {t.settings.cancel}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setColumnAdding(true)}
                        className="w-full gap-2 border-dashed border-violet-500/30 text-muted-foreground hover:text-foreground hover:border-violet-500/50"
                      >
                        <Plus className="h-4 w-4" /> {t.settings.addColumn}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Billing */}
              {activeSection === 'billing' && (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/15">
                        <CreditCard className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{t.settings.billingPlans}</CardTitle>
                        <CardDescription>{t.settings.billingDesc}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Current Plan */}
                    <div className="p-5 rounded-xl border-2 border-[oklch(0.55_0.15_160/0.3)] bg-gradient-to-br from-[oklch(0.55_0.15_160/0.05)] to-transparent relative overflow-hidden">
                      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-[oklch(0.55_0.15_160/0.05)]" />
                      <div className="relative flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold">{t.settings.proPlan}</h4>
                            <Badge className="bg-gradient-to-r from-[oklch(0.55_0.15_160)] to-[oklch(0.50_0.15_165)] text-white text-[10px] border-0 shadow-sm">
                              <Sparkles className="h-3 w-3 mr-0.5" />
                              {t.settings.currentPlan}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{t.settings.proPlanDesc}</p>
                        </div>
                        <p className="text-xl font-extrabold tracking-tight">
                          $12<span className="text-xs text-muted-foreground font-normal">/mo</span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t.settings.billingEmail}</Label>
                      <Input defaultValue="billing@acmecorp.com" type="email" className="bg-muted/30 border-transparent focus:border-[oklch(0.55_0.15_160/0.3)] focus:bg-background transition-all" />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t.settings.paymentMethod}</Label>
                      <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-muted/20">
                        <div className="w-12 h-8 rounded-md bg-gradient-to-r from-slate-700 to-slate-500 flex items-center justify-center text-white text-[9px] font-bold shadow-sm">
                          VISA
                        </div>
                        <div>
                          <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                          <p className="text-xs text-muted-foreground">{t.settings.expires} 12/2026</p>
                        </div>
                        <Button variant="outline" size="sm" className="ml-auto gap-1 text-xs">{t.settings.update}</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

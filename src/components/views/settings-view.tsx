'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Bell,
  Palette,
  Globe,
  Shield,
  Trash2,
  Camera,
  Save,
  AlertTriangle,
  Moon,
  Mail,
  MessageSquare,
  AtSign,
  ListChecks,
  CalendarClock,
  FolderKanban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ACCEPTED_LOGO_TYPES,
  MAX_LOGO_SIZE,
  OrganizationLogoPicker,
  uploadWorkspaceLogo,
} from '@/components/organization-logo-picker';
import { useAppStore } from '@/lib/store';
import { useAppData } from '@/hooks/use-app-data';
import { useTranslation } from '@/lib/i18n';
import type { UserRole } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

const roleLabelKeys: Record<UserRole, keyof ReturnType<typeof useTranslation>['t']['users']> = {
  super_admin: 'superAdmin',
  org_admin: 'orgAdmin',
  project_manager: 'projectManager',
  member: 'member',
  viewer: 'viewer',
};

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

// ─── Settings Sections Config ────────────────────────────────────────────────
const settingsSections = [
  { id: 'general', labelKey: 'general', icon: Globe },
  { id: 'profile', labelKey: 'profile', icon: User },
  { id: 'notifications', labelKey: 'notifications', icon: Bell },
  { id: 'workspace', labelKey: 'workspace', icon: Shield },
];

// ─── Animation ───────────────────────────────────────────────────────────────
const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ─── Main Component ──────────────────────────────────────────────────────────
export function SettingsView() {
  const { t, locale, setLocale } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('general');
  const currentUser = useAppStore((s) => s.currentUser);
  const activeOrganizationId = useAppStore((s) => s.activeOrganizationId);
  const organizations = useAppStore((s) => s.organizations);
  const { refetch } = useAppData();

  const activeOrganization = useMemo(
    () => organizations.find((org) => org.id === activeOrganizationId),
    [organizations, activeOrganizationId]
  );

  const roleLabel = currentUser
    ? t.users[roleLabelKeys[currentUser.role] ?? 'member']
    : '';

  const [profileSettings, setProfileSettings] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
  });

  const [workspaceSettings, setWorkspaceSettings] = useState({
    name: '',
    slug: '',
    description: '',
  });

  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const logoPreviewRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const { firstName, lastName } = splitName(currentUser.name);
    setProfileSettings({
      firstName,
      lastName,
      email: currentUser.email,
      bio: '',
    });
  }, [currentUser]);

  const activeOrgId = activeOrganizationId || currentUser?.organizationId || '';

  useEffect(() => {
    setWorkspaceSettings({
      name: activeOrganization?.name ?? currentUser?.organizationName ?? '',
      slug: activeOrganization?.slug ?? '',
      description: activeOrganization?.description ?? '',
    });
  }, [
    activeOrgId,
    activeOrganization?.name,
    activeOrganization?.slug,
    activeOrganization?.description,
    currentUser?.organizationName,
  ]);

  useEffect(() => {
    setLogoFile(null);
    setLogoRemoved(false);
    if (logoPreviewRef.current) {
      URL.revokeObjectURL(logoPreviewRef.current);
      logoPreviewRef.current = null;
    }
    setLogoPreview(null);
  }, [activeOrgId]);

  const displayedLogo = logoPreview ?? (logoRemoved ? null : activeOrganization?.logo ?? null);

  const handleLogoSelect = (file: File) => {
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast.error(t.createWorkspace.photoInvalidType);
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      toast.error(t.createWorkspace.photoTooLarge);
      return;
    }

    if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current);
    const preview = URL.createObjectURL(file);
    logoPreviewRef.current = preview;
    setLogoPreview(preview);
    setLogoFile(file);
    setLogoRemoved(false);
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoRemoved(true);
    if (logoPreviewRef.current) {
      URL.revokeObjectURL(logoPreviewRef.current);
      logoPreviewRef.current = null;
    }
    setLogoPreview(null);
  };

  const handleSaveWorkspace = async () => {
    const orgId = activeOrganization?.id ?? currentUser?.organizationId;
    if (!orgId) return;
    setSavingWorkspace(true);
    try {
      let logo: string | null | undefined;

      if (logoFile) {
        const result = await uploadWorkspaceLogo(logoFile);
        if (result.error === 'invalid_type') {
          toast.error(t.createWorkspace.photoInvalidType);
          return;
        }
        if (result.error === 'too_large') {
          toast.error(t.createWorkspace.photoTooLarge);
          return;
        }
        if (!result.url) {
          throw new Error('upload_failed');
        }
        logo = result.url;
      } else if (logoRemoved) {
        logo = null;
      }

      const res = await fetch(`/api/workspaces/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...workspaceSettings,
          ...(logo !== undefined ? { logo } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await refetch();
      setLogoFile(null);
      setLogoRemoved(false);
      if (logoPreviewRef.current) {
        URL.revokeObjectURL(logoPreviewRef.current);
        logoPreviewRef.current = null;
      }
      setLogoPreview(null);
      toast.success(t.settings.saveChanges);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.createWorkspace.error);
    } finally {
      setSavingWorkspace(false);
    }
  };

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

  const getSectionLabel = (id: string) => {
    const key = id as keyof typeof t.settings;
    return t.settings[key] || id;
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
                        ? 'bg-[oklch(0.55_0.18_250/0.08)] text-[oklch(0.55_0.18_250)] shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="settings-active-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-[oklch(0.55_0.18_250)]"
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
                      <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/15">
                        <Globe className="h-4 w-4 text-blue-600" />
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
                      <Select value={locale} onValueChange={(v) => setLocale(v as 'fr' | 'en')}>
                        <SelectTrigger className="max-w-xs bg-muted/30 border-transparent focus:border-[oklch(0.55_0.18_250/0.3)] focus:bg-background transition-all">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t.settings.timezone}</Label>
                      <Select defaultValue="africa-kinshasa">
                        <SelectTrigger className="max-w-xs bg-muted/30 border-transparent focus:border-[oklch(0.55_0.18_250/0.3)] focus:bg-background transition-all">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="africa-kinshasa">UTC+1 (Afrique/Central)</SelectItem>
                          <SelectItem value="europe-paris">UTC+1 (Europe/Paris)</SelectItem>
                          <SelectItem value="america-new-york">UTC-5 (America/New York)</SelectItem>
                          <SelectItem value="asia-tokyo">UTC+9 (Asia/Tokyo)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t.settings.dateFormat}</Label>
                      <Select defaultValue="dd-mm-yyyy">
                        <SelectTrigger className="max-w-xs bg-muted/30 border-transparent focus:border-[oklch(0.55_0.18_250/0.3)] focus:bg-background transition-all">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                          <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                          <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
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
                        checked={theme === 'dark'}
                        onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        className="gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.50_0.18_250)] hover:from-[oklch(0.50_0.15_160)] hover:to-[oklch(0.45_0.18_250)] shadow-sm shadow-[oklch(0.55_0.18_250/0.2)] text-white hover:shadow-[oklch(0.55_0.18_250/0.4)] transition-shadow"
                      >
                        <Save className="h-4 w-4" /> {t.settings.saveChanges}
                      </Button>
                      <button className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">
                        {t.settings.resetToDefaults}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Profile */}
              {activeSection === 'profile' && (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/15">
                        <User className="h-4 w-4 text-blue-600" />
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
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[oklch(0.55_0.18_250)] to-[oklch(0.50_0.18_250)] flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-[oklch(0.55_0.18_250/0.2)]">
                          {currentUser?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                        </div>
                        <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[oklch(0.55_0.18_250)] text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div>
                        <p className="font-semibold">{currentUser?.name || ''}</p>
                        <p className="text-sm text-muted-foreground">{currentUser?.email ?? ''}</p>
                        <Badge className="mt-1 text-[10px] bg-blue-500/10 text-blue-700 border-0">
                          {roleLabel}
                        </Badge>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t.settings.firstName}</Label>
                        <Input
                          value={profileSettings.firstName}
                          onChange={(e) => setProfileSettings((p) => ({ ...p, firstName: e.target.value }))}
                          className="bg-muted/30 border-transparent focus:border-[oklch(0.55_0.18_250/0.3)] focus:bg-background transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t.settings.lastName}</Label>
                        <Input
                          value={profileSettings.lastName}
                          onChange={(e) => setProfileSettings((p) => ({ ...p, lastName: e.target.value }))}
                          className="bg-muted/30 border-transparent focus:border-[oklch(0.55_0.18_250/0.3)] focus:bg-background transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t.settings.email}</Label>
                      <Input
                        value={profileSettings.email}
                        onChange={(e) => setProfileSettings((p) => ({ ...p, email: e.target.value }))}
                        type="email"
                        className="bg-muted/30 border-transparent focus:border-[oklch(0.55_0.18_250/0.3)] focus:bg-background transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t.settings.role}</Label>
                      <Input value={roleLabel} disabled className="bg-muted/30 border-transparent max-w-xs" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t.settings.bio}</Label>
                      <Input
                        value={profileSettings.bio}
                        onChange={(e) => setProfileSettings((p) => ({ ...p, bio: e.target.value }))}
                        placeholder=""
                        className="bg-muted/30 border-transparent focus:border-[oklch(0.55_0.18_250/0.3)] focus:bg-background transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        className="gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.50_0.18_250)] hover:from-[oklch(0.50_0.15_160)] hover:to-[oklch(0.45_0.18_250)] shadow-sm shadow-[oklch(0.55_0.18_250/0.2)] text-white hover:shadow-[oklch(0.55_0.18_250/0.4)] transition-shadow"
                      >
                        <Save className="h-4 w-4" /> {t.settings.saveChanges}
                      </Button>
                      <button className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">
                        {t.settings.resetToDefaults}
                      </button>
                    </div>
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
                        <Switch checked={notifications.email} onCheckedChange={() => toggleNotification('email')} className="data-[state=checked]:bg-[oklch(0.55_0.18_250)]" />
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <div>
                          <Label className="text-sm font-medium">{t.settings.pushNotif}</Label>
                          <p className="text-xs text-muted-foreground">{t.settings.pushNotifDesc}</p>
                        </div>
                        <Switch checked={notifications.push} onCheckedChange={() => toggleNotification('push')} className="data-[state=checked]:bg-[oklch(0.55_0.18_250)]" />
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
                            className="data-[state=checked]:bg-[oklch(0.55_0.18_250)]"
                          />
                        </div>
                      ))}
                    </div>
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
                      <OrganizationLogoPicker
                        logoUrl={displayedLogo}
                        icon={activeOrganization?.icon ?? '🏢'}
                        color={activeOrganization?.color ?? '#10b981'}
                        name={workspaceSettings.name || activeOrganization?.name || ''}
                        photoLabel={t.settings.workspacePhoto}
                        photoHint={t.createWorkspace.photoHint}
                        photoAdd={t.createWorkspace.photoAdd}
                        photoChange={t.createWorkspace.photoChange}
                        photoRemove={t.createWorkspace.photoRemove}
                        onSelect={handleLogoSelect}
                        onRemove={handleLogoRemove}
                      />
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t.settings.workspaceName}</Label>
                        <Input
                          value={workspaceSettings.name}
                          onChange={(e) => setWorkspaceSettings((p) => ({ ...p, name: e.target.value }))}
                          className="bg-muted/30 border-transparent focus:border-[oklch(0.55_0.18_250/0.3)] focus:bg-background transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t.settings.workspaceUrl}</Label>
                        <Input
                          value={workspaceSettings.slug}
                          onChange={(e) => setWorkspaceSettings((p) => ({ ...p, slug: e.target.value }))}
                          className="bg-muted/30 border-transparent focus:border-[oklch(0.55_0.18_250/0.3)] focus:bg-background transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t.settings.description}</Label>
                        <Input
                          value={workspaceSettings.description}
                          onChange={(e) => setWorkspaceSettings((p) => ({ ...p, description: e.target.value }))}
                          className="bg-muted/30 border-transparent focus:border-[oklch(0.55_0.18_250/0.3)] focus:bg-background transition-all"
                        />
                      </div>
                      <Button
                        onClick={handleSaveWorkspace}
                        disabled={savingWorkspace || !(activeOrganization?.id ?? currentUser?.organizationId)}
                        className="gap-1.5 bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.50_0.18_250)] hover:from-[oklch(0.50_0.15_160)] hover:to-[oklch(0.45_0.18_250)] shadow-sm shadow-[oklch(0.55_0.18_250/0.2)] text-white"
                      >
                        <Save className="h-4 w-4" /> {t.settings.saveChanges}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Danger Zone */}
                  <Card className="border-2 border-rose-500/30 shadow-sm overflow-hidden dark:border-rose-500/20">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/15 dark:bg-rose-500/20 dark:border-rose-500/25">
                          <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base text-rose-600 dark:text-rose-400">{t.settings.dangerZone}</CardTitle>
                          <CardDescription className="dark:text-rose-300/60">{t.settings.dangerDesc}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between p-4 rounded-xl border-2 border-rose-500/30 bg-rose-500/[0.03] dark:bg-rose-500/[0.08] dark:border-rose-500/25">
                        <div>
                          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{t.settings.deleteWorkspace}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 dark:text-rose-200/50">{t.settings.deleteWorkspaceDesc}</p>
                        </div>
                        <Button variant="destructive" size="sm" className="gap-1.5 shadow-sm dark:bg-rose-600 dark:hover:bg-rose-700">
                          <Trash2 className="h-4 w-4" /> {t.settings.delete}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

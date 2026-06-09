'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Building2,
  Search,
  Plus,
  Globe,
  Users,
  FolderKanban,
  Sparkles,
} from 'lucide-react';
import { mockOrganizations } from '@/lib/mock-data';
import type { Organization } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Animation ───────────────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ─── Type badge config ───────────────────────────────────────────────────────
const typeConfig: Record<Organization['type'], { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  company: {
    bg: 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: <Building2 className="h-3 w-3" />,
    label: 'company',
  },
  department: {
    bg: 'bg-amber-500/10 border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    icon: <Building2 className="h-3 w-3" />,
    label: 'department',
  },
  team: {
    bg: 'bg-cyan-500/10 border-cyan-200 dark:border-cyan-800',
    text: 'text-cyan-700 dark:text-cyan-300',
    icon: <Users className="h-3 w-3" />,
    label: 'team',
  },
  subsidiary: {
    bg: 'bg-rose-500/10 border-rose-200 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300',
    icon: <Globe className="h-3 w-3" />,
    label: 'subsidiary',
  },
};

// ─── Filter Tabs ──────────────────────────────────────────────────────────────
function FilterTabs({
  activeFilter,
  setActiveFilter,
  counts,
}: {
  activeFilter: string;
  setActiveFilter: (v: string) => void;
  counts: Record<string, number>;
}) {
  const { t } = useTranslation();
  const tabs = [
    { value: 'all', label: t.organizations.all },
    { value: 'active', label: t.organizations.active },
    { value: 'inactive', label: t.organizations.inactive },
  ];

  return (
    <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => setActiveFilter(tab.value)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
            activeFilter === tab.value
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
          <span
            className={cn(
              'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold',
              activeFilter === tab.value
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {counts[tab.value] || 0}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Organization Card ───────────────────────────────────────────────────────
function OrganizationCard({ organization }: { organization: Organization }) {
  const { t } = useTranslation();
  const typeCfg = typeConfig[organization.type];
  const typeLabel = t.organizations[typeCfg.label as keyof typeof t.organizations] || typeCfg.label;

  return (
    <motion.div
      variants={item}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group"
    >
      <Card className="overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300 border-0 shadow-sm">
        {/* Accent strip */}
        <div
          className="h-1.5 w-full"
          style={{
            background: `linear-gradient(90deg, ${organization.color}, ${organization.color}88)`,
          }}
        />

        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-semibold shrink-0 shadow-sm"
                style={{ backgroundColor: organization.color + '18', color: organization.color }}
              >
                {organization.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate">{organization.name}</h3>
                <p className="text-xs text-muted-foreground">{organization.slug}</p>
              </div>
            </div>
            <Badge
              className={cn('text-[10px] px-2 py-0.5 gap-1 font-medium border-0', typeCfg.bg, typeCfg.text)}
            >
              {typeCfg.icon}
              {typeLabel}
            </Badge>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium">{organization.memberCount}</span>
              <span>{t.organizations.members}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FolderKanban className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-medium">{organization.projectCount}</span>
              <span>{t.organizations.projects}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="h-3.5 w-3.5 text-cyan-500" />
              <span>{organization.country}</span>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <span className={cn(
              'flex items-center gap-1.5 text-[10px] font-semibold',
              organization.isActive ? 'text-emerald-600' : 'text-slate-500'
            )}>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                organization.isActive ? 'bg-emerald-500' : 'bg-slate-400'
              )} />
              {organization.isActive ? t.organizations.active : t.organizations.inactive}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(organization.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function OrganizationsView() {
  const { t } = useTranslation();
  const { organizations } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Use store organizations (or fallback to mock data)
  const allOrgs = organizations.length > 0 ? organizations : mockOrganizations;

  const filteredOrganizations = useMemo(() => {
    return allOrgs.filter((org) => {
      const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.country.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesActive = activeFilter === 'all' ||
        (activeFilter === 'active' && org.isActive) ||
        (activeFilter === 'inactive' && !org.isActive);
      const matchesType = typeFilter === 'all' || org.type === typeFilter;
      return matchesSearch && matchesActive && matchesType;
    });
  }, [allOrgs, searchQuery, activeFilter, typeFilter]);

  const counts = useMemo(() => ({
    all: allOrgs.length,
    active: allOrgs.filter(o => o.isActive).length,
    inactive: allOrgs.filter(o => !o.isActive).length,
  }), [allOrgs]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allOrgs.length };
    allOrgs.forEach(o => {
      counts[o.type] = (counts[o.type] || 0) + 1;
    });
    return counts;
  }, [allOrgs]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.organizations.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-semibold text-foreground">{allOrgs.length}</span> {t.organizations.title.toLowerCase()} · <span className="font-semibold text-emerald-600">{counts.active}</span> {t.organizations.active}
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-sm shadow-emerald-600/20"
        >
          <Sparkles className="h-3.5 w-3.5" /> {t.organizations.createOrganization}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <FilterTabs activeFilter={activeFilter} setActiveFilter={setActiveFilter} counts={counts} />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.organizations.name + '...'}
              className="pl-9 h-9 bg-muted/30 border-transparent focus:border-emerald-500/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1">
            {['all', 'company', 'department', 'team', 'subsidiary'].map((type) => {
              const cfg = type === 'all' ? null : typeConfig[type as Organization['type']];
              return (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  onClick={() => setTypeFilter(type)}
                  className={cn(
                    'h-7 text-[10px] px-2 rounded-md',
                    typeFilter === type
                      ? 'bg-emerald-500/10 text-emerald-600 font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {type === 'all' ? t.organizations.all : (cfg ? t.organizations[type as keyof typeof t.organizations] || type : type)}
                  <span className="ml-1 text-[9px] opacity-60">{typeCounts[type] || 0}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {filteredOrganizations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-center py-16 text-muted-foreground"
          >
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">{t.organizations.noResults}</p>
            <p className="text-xs mt-1 text-muted-foreground/70">
              {searchQuery ? 'Try adjusting your search' : 'No organizations match the current filters'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={`${activeFilter}-${typeFilter}`}
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredOrganizations.map((org) => (
              <OrganizationCard key={org.id} organization={org} />
            ))}

            {/* Create Organization Card */}
            <motion.div variants={item} whileHover={{ y: -2 }} className="group">
              <Card className="overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300 border-2 border-dashed border-muted-foreground/20 hover:border-emerald-500/40">
                <CardContent className="p-5 flex flex-col items-center justify-center min-h-[200px] gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Plus className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-emerald-600 transition-colors">
                    {t.organizations.createOrganization}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

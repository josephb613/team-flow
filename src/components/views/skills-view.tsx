'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  CalendarClock,
  ShieldAlert,
  Wallet,
  Handshake,
  MessageSquare,
  Crown,
  Users,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useAppData } from '@/hooks/use-app-data';
import { useTranslation } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type SkillKey = 'planning' | 'risks' | 'budget' | 'stakeholders' | 'communication' | 'leadership';
type SkillLevel = 1 | 2 | 3 | 4;

const SKILL_KEYS: SkillKey[] = [
  'planning',
  'risks',
  'budget',
  'stakeholders',
  'communication',
  'leadership',
];

const skillConfig: Record<
  SkillKey,
  { icon: React.ElementType; gradient: string; iconBg: string; iconColor: string; borderAccent: string }
> = {
  planning: {
    icon: CalendarClock,
    gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
    iconBg: 'bg-blue-500/15 border-blue-500/15',
    iconColor: 'text-blue-600',
    borderAccent: 'border-blue-500/20',
  },
  risks: {
    icon: ShieldAlert,
    gradient: 'from-rose-500/10 via-rose-500/5 to-transparent',
    iconBg: 'bg-rose-500/15 border-rose-500/15',
    iconColor: 'text-rose-600',
    borderAccent: 'border-rose-500/20',
  },
  budget: {
    icon: Wallet,
    gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    iconBg: 'bg-emerald-500/15 border-emerald-500/15',
    iconColor: 'text-emerald-600',
    borderAccent: 'border-emerald-500/20',
  },
  stakeholders: {
    icon: Handshake,
    gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
    iconBg: 'bg-amber-500/15 border-amber-500/15',
    iconColor: 'text-amber-600',
    borderAccent: 'border-amber-500/20',
  },
  communication: {
    icon: MessageSquare,
    gradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
    iconBg: 'bg-cyan-500/15 border-cyan-500/15',
    iconColor: 'text-cyan-600',
    borderAccent: 'border-cyan-500/20',
  },
  leadership: {
    icon: Crown,
    gradient: 'from-violet-500/10 via-violet-500/5 to-transparent',
    iconBg: 'bg-violet-500/15 border-violet-500/15',
    iconColor: 'text-violet-600',
    borderAccent: 'border-violet-500/20',
  },
};

const levelColors: Record<SkillLevel, string> = {
  1: 'bg-slate-400',
  2: 'bg-cyan-500',
  3: 'bg-[oklch(0.55_0.18_250)]',
  4: 'bg-amber-500',
};

const avatarGradients = [
  'from-blue-400 to-cyan-500',
  'from-blue-400 to-blue-500',
  'from-amber-400 to-orange-500',
  'from-cyan-400 to-blue-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

function mockLevel(userIndex: number, skillIndex: number): SkillLevel {
  const raw = ((userIndex + 1) * (skillIndex + 3)) % 4;
  return (raw + 1) as SkillLevel;
}

function levelLabel(level: SkillLevel, t: ReturnType<typeof useTranslation>['t']): string {
  const labels: Record<SkillLevel, string> = {
    1: t.skills.levelBeginner,
    2: t.skills.levelIntermediate,
    3: t.skills.levelAdvanced,
    4: t.skills.levelExpert,
  };
  return labels[level];
}

export function SkillsView() {
  const { t } = useTranslation();
  const { users } = useAppData();

  const skillLabels: Record<SkillKey, string> = {
    planning: t.skills.planning,
    risks: t.skills.risks,
    budget: t.skills.budget,
    stakeholders: t.skills.stakeholders,
    communication: t.skills.communication,
    leadership: t.skills.leadership,
  };

  const memberSkills = useMemo(
    () =>
      users.map((user, userIndex) => ({
        user,
        levels: Object.fromEntries(
          SKILL_KEYS.map((key, skillIndex) => [key, mockLevel(userIndex, skillIndex)])
        ) as Record<SkillKey, SkillLevel>,
      })),
    [users]
  );

  const categoryStats = useMemo(() => {
    return SKILL_KEYS.map((key, skillIndex) => {
      const levels = memberSkills.map((m) => m.levels[key]);
      const avg = levels.reduce((sum, l) => sum + l, 0) / Math.max(levels.length, 1);
      const coverage = levels.filter((l) => l >= 3).length;
      return { key, avg, coverage, skillIndex };
    });
  }, [memberSkills]);

  const overallAvg =
    categoryStats.reduce((sum, c) => sum + c.avg, 0) / Math.max(categoryStats.length, 1);

  const statCards = [
    {
      title: t.skills.categoriesTitle,
      value: SKILL_KEYS.length,
      icon: Brain,
      gradient: 'from-[oklch(0.55_0.18_250/0.12)] via-[oklch(0.55_0.18_250/0.05)] to-transparent',
      iconBg: 'bg-[oklch(0.55_0.18_250/0.15)] border-[oklch(0.55_0.18_250/0.15)]',
      iconColor: 'text-[oklch(0.55_0.18_250)]',
      borderAccent: 'border-[oklch(0.55_0.18_250/0.2)]',
    },
    {
      title: t.skills.avgLevel,
      value: `${Math.round((overallAvg / 4) * 100)}%`,
      icon: TrendingUp,
      gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      iconBg: 'bg-emerald-500/15 border-emerald-500/15',
      iconColor: 'text-emerald-600',
      borderAccent: 'border-emerald-500/20',
    },
    {
      title: t.skills.teamCoverage,
      value: users.length,
      icon: Users,
      gradient: 'from-blue-500/10 via-blue-500/5 to-transparent',
      iconBg: 'bg-blue-500/15 border-blue-500/15',
      iconColor: 'text-blue-600',
      borderAccent: 'border-blue-500/20',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.skills.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t.skills.subtitle}</p>
        </div>
        <Badge
          variant="outline"
          className="gap-1.5 px-3 py-1 text-xs font-medium bg-muted/40 border-dashed"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          {t.skills.mockNotice}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statCards.map((stat, i) => {
          const IconComp = stat.icon;
          return (
            <motion.div key={i} variants={item} initial="hidden" animate="show" transition={{ delay: i * 0.05 }}>
              <Card className={cn('relative overflow-hidden border shadow-sm hover:shadow-md transition-shadow duration-300 group', stat.borderAccent)}>
                <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60 group-hover:opacity-100 transition-opacity duration-500', stat.gradient)} />
                <CardContent className="relative p-3 flex items-center gap-3">
                  <div className={cn('p-2 rounded-xl border', stat.iconBg)}>
                    <IconComp className={cn('h-4 w-4', stat.iconColor)} />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-lg font-extrabold tracking-tight">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Skill category cards */}
      <div>
        <h3 className="text-sm font-semibold mb-3">{t.skills.categoriesTitle}</h3>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {categoryStats.map(({ key, avg, coverage }) => {
            const config = skillConfig[key];
            const IconComp = config.icon;
            const pct = Math.round((avg / 4) * 100);

            return (
              <motion.div key={key} variants={item}>
                <Card className={cn('relative overflow-hidden border shadow-sm hover:shadow-md transition-all duration-300 group h-full', config.borderAccent)}>
                  <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-80 transition-opacity duration-500', config.gradient)} />
                  <CardContent className="relative p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('p-2 rounded-xl border', config.iconBg)}>
                          <IconComp className={cn('h-4 w-4', config.iconColor)} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{skillLabels[key]}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {coverage} {t.skills.membersWithSkill} · {levelLabel(Math.round(avg) as SkillLevel, t)}
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-bold tabular-nums">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <div className="flex gap-1">
                      {([1, 2, 3, 4] as SkillLevel[]).map((lvl) => (
                        <div
                          key={lvl}
                          className={cn(
                            'h-1.5 flex-1 rounded-full transition-opacity',
                            lvl <= Math.round(avg) ? levelColors[lvl] : 'bg-muted'
                          )}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Member matrix */}
      <div>
        <h3 className="text-sm font-semibold mb-3">{t.skills.matrixTitle}</h3>
        <Card className="border shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground min-w-[160px] sticky left-0 bg-muted/30 backdrop-blur-sm">
                      {t.members.title}
                    </th>
                    {SKILL_KEYS.map((key) => (
                      <th key={key} className="p-3 font-medium text-muted-foreground text-center min-w-[100px]">
                        <span className="hidden lg:inline">{skillLabels[key]}</span>
                        <span className="lg:hidden">{skillLabels[key].split(' ')[0]}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {memberSkills.map(({ user, levels }, userIndex) => {
                    const gradient = avatarGradients[userIndex % avatarGradients.length];
                    return (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: userIndex * 0.04 }}
                        className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="p-3 sticky left-0 bg-background/95 backdrop-blur-sm">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className={cn('text-[10px] font-bold bg-gradient-to-br text-white', gradient)}>
                                {user.name.split(' ').map((n) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate text-xs">{user.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{user.role}</p>
                            </div>
                          </div>
                        </td>
                        {SKILL_KEYS.map((key) => {
                          const level = levels[key];
                          return (
                            <td key={key} className="p-3 text-center">
                              <TooltipLevel level={level} label={levelLabel(level, t)} />
                            </td>
                          );
                        })}
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TooltipLevel({ level, label }: { level: SkillLevel; label: string }) {
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div className="flex gap-0.5">
        {([1, 2, 3, 4] as SkillLevel[]).map((dot) => (
          <div
            key={dot}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              dot <= level ? levelColors[level] : 'bg-muted'
            )}
          />
        ))}
      </div>
      <span className="text-[9px] text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

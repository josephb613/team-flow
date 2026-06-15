'use client';

import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Lightbulb, ListChecks, Target } from 'lucide-react';

export type PmpGuidePageId =
  | 'dependencies'
  | 'costs'
  | 'risks'
  | 'stakeholders'
  | 'change-requests'
  | 'workload';

interface PmpGuidePanelProps {
  pageId: PmpGuidePageId;
}

export function PmpGuidePanel({ pageId }: PmpGuidePanelProps) {
  const { t } = useTranslation();
  const g = t.pmp.guide.sections[pageId];

  return (
    <div className="space-y-4">
      <Card className="border-violet-500/20 bg-violet-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            {t.pmp.guide.purposeTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{g.purpose}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            {t.pmp.guide.whenToUseTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{g.whenToUse}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-emerald-500" />
            {t.pmp.guide.featuresTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {g.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            {t.pmp.guide.tipsTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{g.tips}</p>
        </CardContent>
      </Card>
    </div>
  );
}

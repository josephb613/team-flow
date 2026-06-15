'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, LayoutDashboard } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { PmpGuidePanel, type PmpGuidePageId } from './pmp-guide-panel';

interface PmpViewShellProps {
  pageId: PmpGuidePageId;
  icon: React.ReactNode;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PmpViewShell({
  pageId,
  icon,
  title,
  description,
  actions,
  children,
}: PmpViewShellProps) {
  const { t } = useTranslation();
  const g = t.pmp.guide;
  const [activeTab, setActiveTab] = useState('data');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {icon}
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        {activeTab === 'data' && actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9 bg-muted/50 p-0.5">
          <TabsTrigger
            value="data"
            className="text-xs px-3 h-7 rounded-md gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            {g.tabData}
          </TabsTrigger>
          <TabsTrigger
            value="guide"
            className="text-xs px-3 h-7 rounded-md gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <BookOpen className="h-3.5 w-3.5" />
            {g.tabGuide}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="mt-4 space-y-6">
          {children}
        </TabsContent>

        <TabsContent value="guide" className="mt-4">
          <PmpGuidePanel pageId={pageId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

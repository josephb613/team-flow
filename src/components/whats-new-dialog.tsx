"use client";

import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";

const featureIcons = [
  "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
  "M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  "M3 3v18h18M19 9l-5 5-4-4-3 3",
  "M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
];

export function WhatsNewDialog() {
  const { whatsNewDialogOpen, setWhatsNewDialogOpen } = useAppStore();
  const { t } = useTranslation();

  const dialog = t.topbar.whatsNewDialog;
  const features = Array.isArray(dialog.features) ? dialog.features : [];

  return (
    <Dialog open={whatsNewDialogOpen} onOpenChange={setWhatsNewDialogOpen}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-y-auto" showCloseButton>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/10">
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <DialogTitle className="text-lg">{dialog.title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {dialog.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          {features.map((feature: { title: string; description: string }, index: number) => (
            <div
              key={index}
              className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex-shrink-0 mt-0.5">
                <div className="flex items-center justify-center h-7 w-7 rounded-full bg-[oklch(0.55_0.15_160/0.1)]">
                  <Check className="h-3.5 w-3.5 text-[oklch(0.55_0.15_160)]" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium">{feature.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t mt-2">
          <p className="text-[11px] text-muted-foreground">
            {t.topbar.pro} — v2.4.0
          </p>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs bg-[oklch(0.55_0.15_160)] hover:bg-[oklch(0.5_0.15_160)] text-white"
            onClick={() => setWhatsNewDialogOpen(false)}
          >
            {t.common.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

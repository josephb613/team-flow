'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'teamflow:pwa-install-dismissed';

export function PWARegister() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  // Register the service worker (production only — avoids interfering with dev HMR).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration failures are non-fatal */
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  // Capture the install prompt and decide whether to show our banner.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      const dismissed = localStorage.getItem(DISMISS_KEY);
      setInstallEvent(event as BeforeInstallPromptEvent);
      if (!dismissed) setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setVisible(false);
    setInstallEvent(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md sm:left-auto sm:right-4 sm:mx-0">
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/95 p-3 shadow-2xl backdrop-blur-md">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.55_0.18_250)] to-[oklch(0.45_0.18_250)] shadow-lg">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" fillOpacity="0.95" />
            <path d="M2 17L12 22L22 17" stroke="white" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Installer TeamFlow</p>
          <p className="truncate text-xs text-muted-foreground">Accès rapide, plein écran et hors ligne.</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={handleDismiss}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Plus tard
          </button>
          <button
            onClick={handleInstall}
            className="rounded-lg bg-[oklch(0.55_0.18_250)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[oklch(0.48_0.18_250)]"
          >
            Installer
          </button>
        </div>
      </div>
    </div>
  );
}

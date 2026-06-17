'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { LoginPage } from '@/components/login-page';
import { MainApp } from '@/components/main-app';

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-[oklch(0.55_0.18_250)]/30 border-t-[oklch(0.55_0.18_250)] rounded-full animate-spin" />
    </div>
  );
}

function isChunkLoadError(message: string) {
  return (
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk') ||
    message.includes('Failed to load chunk')
  );
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-[oklch(0.55_0.18_250)] to-[oklch(0.45_0.18_250)] flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" fillOpacity="0.9" />
            <path d="M2 17L12 22L22 17" stroke="white" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Oups ! Une erreur est survenue</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Une erreur inattendue s&apos;est produite. Veuillez réessayer.
        </p>
        <button
          onClick={onRetry}
          className="px-6 py-2.5 rounded-lg bg-[oklch(0.55_0.18_250)] hover:bg-[oklch(0.48_0.18_250)] text-white font-medium shadow-sm transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: (error: Error, retry: () => void) => React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback: (error: Error, retry: () => void) => React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, () => this.setState({ hasError: false, error: null }));
    }
    return this.props.children;
  }
}

export default function Home() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const hydrateSession = useAppStore((s) => s.hydrateSession);
  const [authReady, setAuthReady] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void hydrateSession().finally(() => {
      if (!cancelled) setAuthReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrateSession]);

  useEffect(() => {
    const reloadOnChunkError = (message: string) => {
      if (isChunkLoadError(message)) {
        console.log('Chunk load error detected, reloading...');
        setTimeout(() => window.location.reload(), 500);
        return true;
      }

      return false;
    };

    const handleError = (event: ErrorEvent) => {
      if (reloadOnChunkError(event.message)) {
        event.preventDefault();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message =
        event.reason instanceof Error ? event.reason.message : String(event.reason ?? '');

      if (reloadOnChunkError(message)) {
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (!authReady) {
    return <AuthLoading />;
  }

  return (
    <ErrorBoundary
      key={retryKey}
      fallback={(_error, retry) => <ErrorFallback onRetry={retry} />}
    >
      {isAuthenticated ? <MainApp /> : <LoginPage />}
    </ErrorBoundary>
  );
}

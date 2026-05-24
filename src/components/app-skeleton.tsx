"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface AppSkeletonProps {
  variant?: "auth" | "app";
}

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/60",
        className
      )}
    />
  );
}

function SidebarSkeleton() {
  return (
    <div className="hidden lg:flex w-[260px] flex-col border-r bg-card/50 p-4 gap-4">
      {/* Logo area */}
      <div className="flex items-center gap-3 px-2 py-3">
        <SkeletonPulse className="h-8 w-8 rounded-lg" />
        <SkeletonPulse className="h-5 w-24" />
      </div>

      {/* Workspace selector */}
      <SkeletonPulse className="h-10 w-full rounded-lg" />

      {/* Navigation items */}
      <div className="flex flex-col gap-1 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <SkeletonPulse className="h-5 w-5 rounded" />
            <SkeletonPulse className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Section divider */}
      <SkeletonPulse className="h-px w-full my-2" />

      {/* Secondary nav */}
      <div className="flex flex-col gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <SkeletonPulse className="h-5 w-5 rounded" />
            <SkeletonPulse className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* Bottom user area */}
      <div className="mt-auto flex items-center gap-3 px-2 py-3">
        <SkeletonPulse className="h-9 w-9 rounded-full" />
        <div className="flex flex-col gap-1">
          <SkeletonPulse className="h-4 w-20" />
          <SkeletonPulse className="h-3 w-28" />
        </div>
      </div>
    </div>
  );
}

function TopBarSkeleton() {
  return (
    <div className="h-14 border-b bg-card/50 px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <SkeletonPulse className="h-8 w-8 rounded lg:hidden" />
        <SkeletonPulse className="h-5 w-32" />
      </div>
      <div className="flex items-center gap-3">
        <SkeletonPulse className="h-8 w-48 rounded-lg hidden md:block" />
        <SkeletonPulse className="h-8 w-8 rounded-full" />
        <SkeletonPulse className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="flex-1 p-6 overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-2">
          <SkeletonPulse className="h-8 w-48" />
          <SkeletonPulse className="h-4 w-64" />
        </div>
        <SkeletonPulse className="h-10 w-32 rounded-lg" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border bg-card/50">
            <SkeletonPulse className="h-4 w-20 mb-2" />
            <SkeletonPulse className="h-8 w-16 mb-1" />
            <SkeletonPulse className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border bg-card/50">
              <div className="flex items-center gap-3 mb-3">
                <SkeletonPulse className="h-10 w-10 rounded-lg" />
                <div className="flex-1">
                  <SkeletonPulse className="h-4 w-3/4 mb-2" />
                  <SkeletonPulse className="h-3 w-1/2" />
                </div>
                <SkeletonPulse className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="p-4 rounded-xl border bg-card/50">
            <SkeletonPulse className="h-5 w-24 mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <SkeletonPulse className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <SkeletonPulse className="h-4 w-20 mb-1" />
                  <SkeletonPulse className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthLoadingSkeleton() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-emerald-500/20" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <SkeletonPulse className="h-5 w-32" />
          <SkeletonPulse className="h-4 w-48" />
        </div>
      </div>
    </div>
  );
}

export function AppSkeleton({ variant = "auth" }: AppSkeletonProps) {
  if (variant === "auth") {
    return <AuthLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <SidebarSkeleton />
      <div className="flex-1 flex flex-col lg:ml-0">
        <TopBarSkeleton />
        <ContentSkeleton />
      </div>
    </div>
  );
}

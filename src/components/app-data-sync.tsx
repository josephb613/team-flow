'use client';

import { useEffect } from 'react';
import { useAppData } from '@/hooks/use-app-data';
import { useAppStore } from '@/lib/store';

/** Syncs organization list from AppDataProvider into Zustand after fetch. */
export function AppDataSync() {
  const { organizations, loading } = useAppData();
  const setOrganizations = useAppStore((s) => s.setOrganizations);

  useEffect(() => {
    if (!loading) {
      setOrganizations(organizations);
    }
  }, [organizations, loading, setOrganizations]);

  return null;
}

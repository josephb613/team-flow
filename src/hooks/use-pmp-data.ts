'use client';

import { useCallback, useEffect, useState } from 'react';
import { appendWorkspaceQuery } from '@/lib/workspace-query';

// ─── Shared types matching API payloads ──────────────────────────────────

export interface ApiProject {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  status: string;
  budget: number;
  currency: string;
  hourlyRate: number;
  startDate: string | null;
  endDate: string | null;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

// Generic JSON fetcher with refetch support
export function useApiData<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

export function useProjects(workspaceId: string) {
  const url = workspaceId
    ? appendWorkspaceQuery('/api/projects', workspaceId)
    : null;
  return useApiData<ApiProject[]>(url);
}

export function useUsers(workspaceId: string) {
  const url = workspaceId ? appendWorkspaceQuery('/api/users', workspaceId) : null;
  return useApiData<ApiUser[]>(url);
}

export function useWorkspaceApiData<T>(path: string, workspaceId: string) {
  const url = workspaceId ? appendWorkspaceQuery(path, workspaceId) : null;
  return useApiData<T>(url);
}

export async function apiSend(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<{ ok: boolean; data: unknown }> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // empty body
  }
  return { ok: res.ok, data };
}

export function formatMoney(value: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

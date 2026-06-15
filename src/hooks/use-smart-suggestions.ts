'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface SmartSuggestion {
  id: string;
  icon: string;
  title: string;
  description: string;
  action: string;
  actionType: 'create_task' | 'view_project' | 'schedule_meeting' | 'review_task' | 'check_deadline';
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface UseSmartSuggestionsReturn {
  suggestions: SmartSuggestion[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useSmartSuggestions(): UseSmartSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchTime = useRef<number>(0);
  const isFetching = useRef(false);

  const fetchSuggestions = useCallback(async (force = false) => {
    if (isFetching.current) return;

    const now = Date.now();
    if (!force && lastFetchTime.current && now - lastFetchTime.current < CACHE_DURATION) {
      return;
    }

    isFetching.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'suggestions' }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        lastFetchTime.current = Date.now();
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Failed to fetch smart suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const refresh = useCallback(() => {
    lastFetchTime.current = 0;
    fetchSuggestions(true);
  }, [fetchSuggestions]);

  return { suggestions, isLoading, error, refresh };
}

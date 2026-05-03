'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

export function useKeyboardShortcuts() {
  const {
    setActivePage,
    setSearchOpen,
    toggleSidebar,
    setCreateTaskDialogOpen,
    setCreateProjectDialogOpen,
    setNotificationPanelOpen,
  } = useAppStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      // ⌘K - Search (already handled by search dialog, but add here too)
      if (isMeta && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      // ⌘N - New task
      if (isMeta && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        setCreateTaskDialogOpen(true);
        return;
      }

      // ⌘⇧N - New project
      if (isMeta && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault();
        setCreateProjectDialogOpen(true);
        return;
      }

      // ⌘\ - Toggle sidebar
      if (isMeta && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // ⌘⇧I - Notifications
      if (isMeta && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        setNotificationPanelOpen(true);
        return;
      }

      // Number keys for navigation (without modifier)
      if (!isMeta && !e.altKey && !e.shiftKey) {
        switch (e.key) {
          case '1': setActivePage('dashboard'); break;
          case '2': setActivePage('tasks'); break;
          case '3': setActivePage('projects'); break;
          case '4': setActivePage('calendar'); break;
          case '5': setActivePage('messages'); break;
          case '6': setActivePage('meetings'); break;
          case '7': setActivePage('files'); break;
          case '8': setActivePage('wiki'); break;
          default: break;
        }
      }

      // ? - Show shortcuts help
      if (e.key === '?' && !isMeta) {
        e.preventDefault();
        const store = useAppStore.getState();
        store.setShortcutsHelpOpen(true);
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActivePage, setSearchOpen, toggleSidebar, setCreateTaskDialogOpen, setCreateProjectDialogOpen, setNotificationPanelOpen]);
}

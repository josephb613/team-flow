const STORAGE_PREFIX = 'teamflow-ai-chat-history';
const MAX_CONVERSATIONS = 20;

export interface StoredChatMessage {
  id: string;
  role: 'user' | 'ai' | 'error';
  content: string;
  timestamp: string;
}

export interface StoredConversation {
  id: string;
  title: string;
  messages: StoredChatMessage[];
  updatedAt: string;
  workspaceId: string;
}

function storageKey(workspaceId: string, userId?: string): string {
  return `${STORAGE_PREFIX}:${workspaceId}:${userId ?? 'anon'}`;
}

function readAll(workspaceId: string, userId?: string): StoredConversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(workspaceId, userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredConversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(
  conversations: StoredConversation[],
  workspaceId: string,
  userId?: string
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      storageKey(workspaceId, userId),
      JSON.stringify(conversations.slice(0, MAX_CONVERSATIONS))
    );
  } catch {
    // ignore quota / private mode
  }
}

function sortByUpdatedAt(conversations: StoredConversation[]): StoredConversation[] {
  return conversations.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function loadConversations(
  workspaceId: string,
  userId?: string
): StoredConversation[] {
  const primary = readAll(workspaceId, userId);
  if (primary.length > 0) return sortByUpdatedAt(primary);

  // Migrate pre-auth saves (anon key) once userId becomes available
  if (userId) {
    const anon = readAll(workspaceId, undefined);
    if (anon.length > 0) {
      writeAll(anon, workspaceId, userId);
      try {
        localStorage.removeItem(storageKey(workspaceId, undefined));
      } catch {
        // ignore
      }
      return sortByUpdatedAt(anon);
    }
  }

  return sortByUpdatedAt(primary);
}

export function upsertConversation(
  conversation: StoredConversation,
  workspaceId: string,
  userId?: string
): StoredConversation[] {
  const existing = readAll(workspaceId, userId).filter(
    (c) => c.id !== conversation.id
  );
  const next = [conversation, ...existing]
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, MAX_CONVERSATIONS);
  writeAll(next, workspaceId, userId);
  return next;
}

export function deleteConversation(
  id: string,
  workspaceId: string,
  userId?: string
): StoredConversation[] {
  const next = readAll(workspaceId, userId).filter((c) => c.id !== id);
  writeAll(next, workspaceId, userId);
  return next;
}

export function deriveConversationTitle(
  messages: { role: string; content: string }[]
): string {
  const firstUser = messages.find((m) => m.role === 'user' && m.content.trim());
  if (!firstUser) return '';
  const text = firstUser.content.trim().replace(/\s+/g, ' ');
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}

export function formatConversationDate(
  isoDate: string,
  locale: 'fr' | 'en'
): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (locale === 'fr') {
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

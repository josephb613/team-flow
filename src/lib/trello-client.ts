// ============================================================
// Trello REST API Client — wraps all needed Trello endpoints.
// API Reference: https://developer.atlassian.com/cloud/trello/rest/
// ============================================================

const TRELLO_BASE = "https://api.trello.com/1";

interface TrelloAuth {
  apiKey: string;
  token: string;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  idList: string;
  idBoard: string;
  idMembers: string[];
  due: string | null;
  dueComplete: boolean;
  closed: boolean;
  shortUrl: string;
  url: string;
  labels: TrelloLabel[];
  pos: number;
}

export interface TrelloList {
  id: string;
  name: string;
  idBoard: string;
  closed: boolean;
  pos: number;
}

export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  url: string;
  memberships: TrelloMembership[];
}

export interface TrelloMember {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  avatarUrl?: string;
}

export interface TrelloLabel {
  id: string;
  name: string;
  color: string;
  idBoard: string;
}

interface TrelloMembership {
  id: string;
  idMember: string;
  memberType: string;
  member?: TrelloMember;
}

// ---- Helpers ----

function authParams(auth: TrelloAuth): string {
  return `key=${encodeURIComponent(auth.apiKey)}&token=${encodeURIComponent(auth.token)}`;
}

function url(
  path: string,
  auth: TrelloAuth,
  extraQuery?: Record<string, string>,
): string {
  const base = `${TRELLO_BASE}${path}?${authParams(auth)}`;
  if (!extraQuery) return base;
  const extra = new URLSearchParams(extraQuery).toString();
  return extra ? `${base}&${extra}` : base;
}

async function trelloFetch<T>(
  path: string,
  auth: TrelloAuth,
  init?: RequestInit & { query?: Record<string, string> },
): Promise<T> {
  const res = await fetch(url(path, auth, init?.query), {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: init?.body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trello API error ${res.status} on ${path}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ---- Boards ----

export function getBoards(auth: TrelloAuth) {
  return trelloFetch<TrelloBoard[]>("/members/me/boards", auth, {
    query: { fields: "id,name,desc,closed,url" },
  });
}

export function getBoard(auth: TrelloAuth, boardId: string) {
  return trelloFetch<TrelloBoard>(`/boards/${boardId}`, auth);
}

export function createBoard(
  auth: TrelloAuth,
  params: {
    name: string;
    desc?: string;
    defaultLists?: boolean;
    prefs_permissionLevel?: "private" | "org" | "public";
  },
) {
  const query: Record<string, string> = {
    name: params.name,
    defaultLists: String(params.defaultLists ?? false),
  };
  if (params.desc) query.desc = params.desc;
  if (params.prefs_permissionLevel) {
    query.prefs_permissionLevel = params.prefs_permissionLevel;
  }
  return trelloFetch<TrelloBoard>("/boards", auth, { method: "POST", query });
}

export function addMemberToBoard(
  auth: TrelloAuth,
  boardId: string,
  params: {
    email?: string;
    type?: "admin" | "normal" | "observer";
  },
) {
  const query: Record<string, string> = {};
  if (params.email) query.email = params.email;
  if (params.type) query.type = params.type;
  return trelloFetch<TrelloMember>(`/boards/${boardId}/members`, auth, {
    method: "PUT",
    query,
  });
}

export function inviteMemberToBoard(
  auth: TrelloAuth,
  boardId: string,
  email: string,
  fullName?: string,
) {
  const query: Record<string, string> = { email };
  if (fullName) query.fullName = fullName;
  return trelloFetch<TrelloMember>(`/boards/${boardId}/members`, auth, {
    method: "PUT",
    query,
  });
}

// ---- Lists ----

export function getListsOnBoard(auth: TrelloAuth, boardId: string) {
  return trelloFetch<TrelloList[]>(`/boards/${boardId}/lists`, auth, {
    query: { filter: "open" },
  });
}

export function getList(auth: TrelloAuth, listId: string) {
  return trelloFetch<TrelloList>(`/lists/${listId}`, auth);
}

export function createList(
  auth: TrelloAuth,
  params: {
    name: string;
    idBoard: string;
    pos?: "top" | "bottom" | number;
  },
) {
  const query: Record<string, string> = {
    name: params.name,
    idBoard: params.idBoard,
  };
  if (params.pos !== undefined) query.pos = String(params.pos);
  return trelloFetch<TrelloList>("/lists", auth, { method: "POST", query });
}

// ---- Cards ----

export function getCardsOnList(auth: TrelloAuth, listId: string) {
  return trelloFetch<TrelloCard[]>(`/lists/${listId}/cards`, auth, {
    query: {
      fields:
        "id,name,desc,idList,idBoard,idMembers,due,dueComplete,closed,shortUrl,url,labels,pos",
      members: "true",
    },
  });
}

export function getCard(auth: TrelloAuth, cardId: string) {
  return trelloFetch<TrelloCard>(`/cards/${cardId}`, auth, {
    query: { members: "true" },
  });
}

export function createCard(
  auth: TrelloAuth,
  params: {
    idList: string;
    name: string;
    desc?: string;
    due?: string | null;
    idMembers?: string[];
    labels?: string[];
  },
) {
  const query: Record<string, string> = {
    idList: params.idList,
    name: params.name,
  };
  if (params.desc) query.desc = params.desc;
  if (params.due) query.due = params.due;
  if (params.idMembers && params.idMembers.length > 0) {
    query.idMembers = params.idMembers.join(",");
  }
  if (params.labels && params.labels.length > 0) {
    query.idLabels = params.labels.join(",");
  }

  return trelloFetch<TrelloCard>(`/cards`, auth, { method: "POST", query });
}

export function updateCard(
  auth: TrelloAuth,
  cardId: string,
  params: {
    name?: string;
    desc?: string;
    idList?: string;
    due?: string | null;
    dueComplete?: boolean;
    closed?: boolean;
  },
) {
  const body = JSON.stringify(params);
  return trelloFetch<TrelloCard>(`/cards/${cardId}`, auth, {
    method: "PUT",
    body,
  });
}

export function deleteCard(auth: TrelloAuth, cardId: string) {
  return trelloFetch<unknown>(`/cards/${cardId}`, auth, {
    method: "DELETE",
  });
}

export function setCardMembers(
  auth: TrelloAuth,
  cardId: string,
  idMembers: string[],
) {
  return trelloFetch<TrelloCard>(`/cards/${cardId}/idMembers`, auth, {
    method: "PUT",
    body: JSON.stringify({ value: idMembers.join(",") }),
  });
}

export function addComment(auth: TrelloAuth, cardId: string, text: string) {
  return trelloFetch<unknown>(`/cards/${cardId}/actions/comments`, auth, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function archiveCard(auth: TrelloAuth, cardId: string) {
  return updateCard(auth, cardId, { closed: true });
}

// ---- Board Members ----

export function getBoardMembers(auth: TrelloAuth, boardId: string) {
  return trelloFetch<TrelloMember[]>(`/boards/${boardId}/members`, auth, {
    query: { fields: "id,fullName,username,avatarUrl" },
  });
}

// ---- Labels ----

export function getBoardLabels(auth: TrelloAuth, boardId: string) {
  return trelloFetch<TrelloLabel[]>(`/boards/${boardId}/labels`, auth);
}

// ---- Webhooks ----

export interface TrelloWebhook {
  id: string;
  idModel: string;
  description: string;
  callbackURL: string;
  active: boolean;
}

export function createWebhook(
  auth: TrelloAuth,
  params: {
    idModel: string;
    callbackURL: string;
    description: string;
  },
) {
  return trelloFetch<TrelloWebhook>(`/webhooks`, auth, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function getWebhooks(auth: TrelloAuth) {
  return trelloFetch<TrelloWebhook[]>(`/tokens/${auth.token}/webhooks`, auth);
}

export function deleteWebhook(auth: TrelloAuth, webhookId: string) {
  return trelloFetch<unknown>(`/webhooks/${webhookId}`, auth, {
    method: "DELETE",
  });
}

// ---- Batch (helper to fetch multiple resources in one call) ----

export function batchGet(auth: TrelloAuth, urls: string[]) {
  const encoded = urls.map((u) => encodeURIComponent(u)).join(",");
  return trelloFetch<Record<string, unknown>[]>(`/batch`, auth, {
    query: { urls: encoded },
  });
}

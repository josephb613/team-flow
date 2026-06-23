import type { WikiPage } from '@prisma/client';

export type WikiPageKind = 'page' | 'lessons_index';

export interface WikiPageNode {
  id: string;
  title: string;
  content: string;
  icon: string;
  kind: string;
  parentId: string | null;
  projectId: string | null;
  workspaceId: string;
  lastEditedBy: string | null;
  updatedAt: string;
  createdAt: string;
  editor?: { id: string; name: string } | null;
  project?: { id: string; name: string; icon: string } | null;
  children?: WikiPageNode[];
}

export function formatWikiPage(
  page: WikiPage & {
    editor?: { id: string; name: string } | null;
    project?: { id: string; name: string; icon: string } | null;
  }
): WikiPageNode {
  return {
    id: page.id,
    title: page.title,
    content: page.content,
    icon: page.icon,
    kind: page.kind,
    parentId: page.parentId,
    projectId: page.projectId,
    workspaceId: page.workspaceId,
    lastEditedBy: page.lastEditedBy,
    updatedAt: page.updatedAt.toISOString(),
    createdAt: page.createdAt.toISOString(),
    editor: page.editor ?? null,
    project: page.project ?? null,
  };
}

export function buildWikiTree(pages: WikiPageNode[]): WikiPageNode[] {
  const byId = new Map<string, WikiPageNode>();
  const roots: WikiPageNode[] = [];

  for (const page of pages) {
    byId.set(page.id, { ...page, children: [] });
  }

  for (const page of byId.values()) {
    if (page.parentId && byId.has(page.parentId)) {
      byId.get(page.parentId)!.children!.push(page);
    } else {
      roots.push(page);
    }
  }

  const sortNodes = (nodes: WikiPageNode[]) => {
    nodes.sort((a, b) => a.title.localeCompare(b.title));
    for (const node of nodes) {
      if (node.children?.length) sortNodes(node.children);
    }
  };
  sortNodes(roots);

  return roots;
}

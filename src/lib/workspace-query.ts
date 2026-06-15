export function getWorkspaceIdFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get('workspaceId');
}

export function appendWorkspaceQuery(
  baseUrl: string,
  workspaceId: string | null | undefined
): string {
  if (!workspaceId) return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}workspaceId=${encodeURIComponent(workspaceId)}`;
}

export function buildProjectScopedWhere(
  workspaceId: string | null,
  projectId?: string | null
): { projectId: string } | { project: { workspaceId: string } } | undefined {
  if (projectId) return { projectId };
  if (workspaceId) return { project: { workspaceId } };
  return undefined;
}

export type Visibility = "PRIVATE" | "LIMITED" | "PUBLIC";
export type ProjectRole = "VIEWER" | "COMMENTER" | "CONTRIBUTOR" | "ADMIN";

export interface ProjectMember {
  readonly id: string;
  readonly projectId: string;
  readonly userId: string;
  readonly role: ProjectRole;
  readonly createdAt: Date;
  // プレゼンテーション層向けにリポジトリが任意でセットする
  readonly user?: { id: string; name: string; email: string; avatarUrl: string | null };
}

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly visibility: Visibility;
  readonly ownerId: string;
  readonly members: ProjectMember[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function hasProjectAccess(project: Project, userId: string): boolean {
  return project.ownerId === userId || project.members.some((m) => m.userId === userId);
}

export function getProjectRole(project: Project, userId: string): ProjectRole | null {
  if (project.ownerId === userId) return "ADMIN";
  return project.members.find((m) => m.userId === userId)?.role ?? null;
}

import type { Project, ProjectMember, ProjectRole, Visibility } from "./project.entity.ts";

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByIdWithMemberUsers(id: string): Promise<Project | null>;
  findByUserId(userId: string): Promise<Project[]>;
  save(params: {
    name: string;
    description: string | null;
    visibility: Visibility;
    ownerId: string;
  }): Promise<Project>;
  update(id: string, params: {
    name?: string;
    description?: string | null;
    visibility?: Visibility;
  }): Promise<Project>;
  delete(id: string): Promise<void>;
}

export interface IProjectMemberRepository {
  findByProjectId(projectId: string): Promise<ProjectMember[]>;
  findByProjectAndUser(projectId: string, userId: string): Promise<ProjectMember | null>;
  add(projectId: string, userId: string, role: ProjectRole): Promise<ProjectMember>;
  update(id: string, role: ProjectRole): Promise<ProjectMember>;
  remove(id: string): Promise<void>;
}

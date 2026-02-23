import type { PrismaClient } from "@prisma/client";
import type {
  Project,
  ProjectMember,
  ProjectRole,
  Visibility,
} from "../../domain/project/project.entity.ts";
import type {
  IProjectMemberRepository,
  IProjectRepository,
} from "../../domain/project/project.repository.ts";

function toProjectMember(record: {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  createdAt: Date;
}): ProjectMember {
  return {
    id: record.id,
    projectId: record.projectId,
    userId: record.userId,
    role: record.role as ProjectRole,
    createdAt: record.createdAt,
  };
}

function toProject(
  record: {
    id: string;
    name: string;
    description: string | null;
    visibility: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    members: Array<
      { id: string; projectId: string; userId: string; role: string; createdAt: Date }
    >;
  },
): Project {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    visibility: record.visibility as Visibility,
    ownerId: record.ownerId,
    members: record.members.map(toProjectMember),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

const includeMembers = { members: true };

export class PrismaProjectRepository implements IProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Project | null> {
    const record = await this.prisma.project.findUnique({
      where: { id },
      include: includeMembers,
    });
    return record ? toProject(record) : null;
  }

  async findByIdWithMemberUsers(id: string): Promise<Project | null> {
    const record = await this.prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    });
    if (!record) return null;
    return {
      ...toProject(record),
      members: record.members.map((m) => ({
        ...toProjectMember(m),
        user: m.user,
      })),
    };
  }

  async findByUserId(userId: string): Promise<Project[]> {
    const records = await this.prisma.project.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: includeMembers,
      orderBy: { createdAt: "desc" },
    });
    return records.map(toProject);
  }

  async save(params: {
    name: string;
    description: string | null;
    visibility: Visibility;
    ownerId: string;
  }): Promise<Project> {
    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name: params.name,
          description: params.description,
          visibility: params.visibility,
          ownerId: params.ownerId,
        },
      });
      await tx.projectMember.create({
        data: { projectId: created.id, userId: params.ownerId, role: "ADMIN" },
      });
      return tx.project.findUniqueOrThrow({
        where: { id: created.id },
        include: includeMembers,
      });
    });
    return toProject(record);
  }

  async update(
    id: string,
    params: { name?: string; description?: string | null; visibility?: Visibility },
  ): Promise<Project> {
    const record = await this.prisma.project.update({
      where: { id },
      data: params,
      include: includeMembers,
    });
    return toProject(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.project.delete({ where: { id } });
  }
}

export class PrismaProjectMemberRepository implements IProjectMemberRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByProjectId(projectId: string): Promise<ProjectMember[]> {
    const records = await this.prisma.projectMember.findMany({ where: { projectId } });
    return records.map(toProjectMember);
  }

  async findByProjectAndUser(projectId: string, userId: string): Promise<ProjectMember | null> {
    const record = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return record ? toProjectMember(record) : null;
  }

  async add(projectId: string, userId: string, role: ProjectRole): Promise<ProjectMember> {
    const record = await this.prisma.projectMember.create({
      data: { projectId, userId, role },
    });
    return toProjectMember(record);
  }

  async update(id: string, role: ProjectRole): Promise<ProjectMember> {
    const record = await this.prisma.projectMember.update({
      where: { id },
      data: { role },
    });
    return toProjectMember(record);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.projectMember.delete({ where: { id } });
  }
}

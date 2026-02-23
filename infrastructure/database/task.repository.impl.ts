import type { PrismaClient } from "@prisma/client";
import type { Task, TaskPriority, TaskStatus } from "../../domain/task/task.entity.ts";
import type { ITaskRepository } from "../../domain/task/task.repository.ts";

function toTask(record: {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Task {
  return {
    id: record.id,
    projectId: record.projectId,
    title: record.title,
    description: record.description,
    status: record.status as TaskStatus,
    priority: record.priority as TaskPriority,
    dueDate: record.dueDate,
    assigneeId: record.assigneeId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaTaskRepository implements ITaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Task | null> {
    const record = await this.prisma.task.findUnique({ where: { id } });
    return record ? toTask(record) : null;
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    const records = await this.prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toTask);
  }

  async save(params: {
    projectId: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date | null;
    assigneeId: string | null;
  }): Promise<Task> {
    const record = await this.prisma.task.create({ data: params });
    return toTask(record);
  }

  async update(
    id: string,
    params: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: Date | null;
      assigneeId?: string | null;
    },
  ): Promise<Task> {
    const record = await this.prisma.task.update({ where: { id }, data: params });
    return toTask(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
  }
}

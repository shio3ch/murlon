/**
 * テスト用モックファクトリー
 *
 * 各リポジトリインターフェースのモック実装と、
 * テスト用エンティティのファクトリー関数を提供する。
 */

import type { Entry } from "../domain/entry/entry.entity.ts";
import type { FindEntriesOptions, IEntryRepository } from "../domain/entry/entry.repository.ts";
import type { Project, ProjectMember, ProjectRole } from "../domain/project/project.entity.ts";
import type {
  IProjectMemberRepository,
  IProjectRepository,
} from "../domain/project/project.repository.ts";
import type { User } from "../domain/user/user.entity.ts";
import type { IUserRepository } from "../domain/user/user.repository.ts";
import type { Comment } from "../domain/comment/comment.entity.ts";
import type { ICommentRepository } from "../domain/comment/comment.repository.ts";
import type { Reaction } from "../domain/reaction/reaction.entity.ts";
import type {
  IReactionRepository,
  ReactionSummary,
} from "../domain/reaction/reaction.repository.ts";
import type { Report, ReportType } from "../domain/report/report.entity.ts";
import type { IReportRepository } from "../domain/report/report.repository.ts";
import type { Task, TaskPriority, TaskStatus } from "../domain/task/task.entity.ts";
import type { ITaskRepository } from "../domain/task/task.repository.ts";
import type { Standup } from "../domain/standup/standup.entity.ts";
import type { IStandupRepository } from "../domain/standup/standup.repository.ts";
import type { ReportTemplate } from "../domain/template/template.entity.ts";
import type { ITemplateRepository } from "../domain/template/template.repository.ts";
import type { AIProvider } from "../infrastructure/ai/provider.ts";

// ── エンティティファクトリー ──

const now = new Date("2026-01-15T10:00:00Z");

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "test@example.com",
    name: "テストユーザー",
    avatarUrl: null,
    authProvider: "LOCAL",
    externalId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "entry-1",
    content: "テスト分報",
    userId: "user-1",
    projectId: null,
    taskId: null,
    tension: null,
    templateType: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    name: "テストプロジェクト",
    description: null,
    visibility: "PRIVATE",
    ownerId: "user-1",
    members: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createProjectMember(overrides: Partial<ProjectMember> = {}): ProjectMember {
  return {
    id: "member-1",
    projectId: "project-1",
    userId: "user-2",
    role: "VIEWER",
    createdAt: now,
    ...overrides,
  };
}

export function createComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment-1",
    entryId: "entry-1",
    userId: "user-1",
    content: "テストコメント",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createReaction(overrides: Partial<Reaction> = {}): Reaction {
  return {
    id: "reaction-1",
    entryId: "entry-1",
    userId: "user-1",
    emoji: "👍",
    createdAt: now,
    ...overrides,
  };
}

export function createReport(overrides: Partial<Report> = {}): Report {
  return {
    id: "report-1",
    type: "DAILY",
    content: "# 日報\nテスト",
    startDate: new Date("2026-01-15T00:00:00Z"),
    endDate: new Date("2026-01-15T23:59:59Z"),
    userId: "user-1",
    projectId: null,
    promptTemplate: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    projectId: "project-1",
    title: "テストタスク",
    description: null,
    status: "TODO",
    priority: "MEDIUM",
    dueDate: null,
    assigneeId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createStandup(overrides: Partial<Standup> = {}): Standup {
  return {
    id: "standup-1",
    userId: "user-1",
    projectId: null,
    content: "# スタンドアップ\nテスト",
    date: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createTemplate(overrides: Partial<ReportTemplate> = {}): ReportTemplate {
  return {
    id: "template-1",
    userId: "user-1",
    name: "テストテンプレート",
    type: "DAILY",
    prompt: "テストプロンプト",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ── モックリポジトリ ──

export function mockEntryRepository(
  overrides: Partial<IEntryRepository> = {},
): IEntryRepository {
  return {
    findById: (_id: string) => Promise.resolve(null),
    findByUserId: (_userId: string, _options?: FindEntriesOptions) => Promise.resolve([]),
    save: (entry: Entry) => Promise.resolve(entry),
    update: (entry: Partial<Entry> & { id: string }) =>
      Promise.resolve(createEntry({ ...entry } as Entry)),
    delete: (_id: string) => Promise.resolve(),
    ...overrides,
  };
}

export function mockProjectRepository(
  overrides: Partial<IProjectRepository> = {},
): IProjectRepository {
  return {
    findById: (_id: string) => Promise.resolve(null),
    findByIdWithMemberUsers: (_id: string) => Promise.resolve(null),
    findByUserId: (_userId: string) => Promise.resolve([]),
    save: (params) =>
      Promise.resolve(
        createProject({
          id: crypto.randomUUID(),
          name: params.name,
          description: params.description,
          visibility: params.visibility,
          ownerId: params.ownerId,
        }),
      ),
    update: (id: string, params) => Promise.resolve(createProject({ id, ...params })),
    delete: (_id: string) => Promise.resolve(),
    ...overrides,
  };
}

export function mockProjectMemberRepository(
  overrides: Partial<IProjectMemberRepository> = {},
): IProjectMemberRepository {
  return {
    findByProjectId: (_projectId: string) => Promise.resolve([]),
    findByProjectAndUser: (_projectId: string, _userId: string) => Promise.resolve(null),
    add: (projectId: string, userId: string, role: ProjectRole) =>
      Promise.resolve(createProjectMember({ projectId, userId, role })),
    update: (id: string, role: ProjectRole) => Promise.resolve(createProjectMember({ id, role })),
    remove: (_id: string) => Promise.resolve(),
    ...overrides,
  };
}

export function mockUserRepository(
  overrides: Partial<IUserRepository> = {},
): IUserRepository {
  return {
    findById: (_id: string) => Promise.resolve(null),
    findByEmail: (_email: string) => Promise.resolve(null),
    findByExternalId: () => Promise.resolve(null),
    updateProfile: (id: string, params) => Promise.resolve(createUser({ id, ...params })),
    ...overrides,
  };
}

export function mockCommentRepository(
  overrides: Partial<ICommentRepository> = {},
): ICommentRepository {
  return {
    findByEntryId: (_entryId: string) => Promise.resolve([]),
    findByEntryIdWithUsers: (_entryId: string) => Promise.resolve([]),
    findById: (_id: string) => Promise.resolve(null),
    save: (params) => Promise.resolve(createComment({ ...params })),
    update: (id: string, content: string) => Promise.resolve(createComment({ id, content })),
    delete: (_id: string) => Promise.resolve(),
    ...overrides,
  };
}

export function mockReactionRepository(
  overrides: Partial<IReactionRepository> = {},
): IReactionRepository {
  return {
    findById: (_id: string) => Promise.resolve(null),
    findByEntryId: (_entryId: string) => Promise.resolve([]),
    findByEntryAndUser: () => Promise.resolve(null),
    summarizeByEntry: (_entryId: string, _userId: string) =>
      Promise.resolve([] as ReactionSummary[]),
    save: (params) => Promise.resolve(createReaction({ ...params })),
    delete: (_id: string) => Promise.resolve(),
    ...overrides,
  };
}

export function mockReportRepository(
  overrides: Partial<IReportRepository> = {},
): IReportRepository {
  return {
    findFirst: () => Promise.resolve(null),
    delete: (_id: string) => Promise.resolve(),
    save: (params) =>
      Promise.resolve(
        createReport({
          id: crypto.randomUUID(),
          type: params.type,
          content: params.content,
          startDate: params.startDate,
          endDate: params.endDate,
          userId: params.userId,
          projectId: params.projectId,
          promptTemplate: params.promptTemplate,
        }),
      ),
    ...overrides,
  };
}

export function mockTaskRepository(
  overrides: Partial<ITaskRepository> = {},
): ITaskRepository {
  return {
    findById: (_id: string) => Promise.resolve(null),
    findByProjectId: (_projectId: string) => Promise.resolve([]),
    save: (params) =>
      Promise.resolve(
        createTask({
          id: crypto.randomUUID(),
          ...params,
        }),
      ),
    update: (id: string, params) => Promise.resolve(createTask({ id, ...params } as Task)),
    delete: (_id: string) => Promise.resolve(),
    ...overrides,
  };
}

export function mockStandupRepository(
  overrides: Partial<IStandupRepository> = {},
): IStandupRepository {
  return {
    findByUserAndDate: () => Promise.resolve(null),
    save: (params) =>
      Promise.resolve(
        createStandup({
          id: crypto.randomUUID(),
          ...params,
        }),
      ),
    update: (id: string, content: string) => Promise.resolve(createStandup({ id, content })),
    ...overrides,
  };
}

export function mockTemplateRepository(
  overrides: Partial<ITemplateRepository> = {},
): ITemplateRepository {
  return {
    findByUserId: (_userId: string) => Promise.resolve([]),
    findById: (_id: string) => Promise.resolve(null),
    save: (params) =>
      Promise.resolve(
        createTemplate({
          id: crypto.randomUUID(),
          ...params,
        }),
      ),
    update: (id: string, params) =>
      Promise.resolve(createTemplate({ id, ...params } as ReportTemplate)),
    delete: (_id: string) => Promise.resolve(),
    ...overrides,
  };
}

export function mockAIProvider(
  overrides: Partial<AIProvider> = {},
): AIProvider {
  return {
    generateText: (_prompt: string) => Promise.resolve("AI生成テキスト"),
    ...overrides,
  };
}

import { assertEquals, assertRejects } from "$std/assert/mod.ts";
import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Entry } from "../../domain/entry/entry.entity.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";
import type { Report } from "../../domain/report/report.entity.ts";
import type { IReportRepository } from "../../domain/report/report.repository.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";
import type { Project } from "../../domain/project/project.entity.ts";
import type { AIProvider } from "../../infrastructure/ai/provider.ts";
import { type GenerateReportDeps, generateReportUseCase } from "./generate-report.usecase.ts";

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

const sampleEntries: Entry[] = [
  {
    id: "entry-1",
    content: "朝会に参加",
    userId: "user-1",
    projectId: null,
    taskId: null,
    tension: 3,
    templateType: null,
    createdAt: new Date(today.getTime() + 9 * 3600000),
    updatedAt: new Date(),
  },
  {
    id: "entry-2",
    content: "機能実装完了",
    userId: "user-1",
    projectId: null,
    taskId: null,
    tension: 5,
    templateType: null,
    createdAt: new Date(today.getTime() + 15 * 3600000),
    updatedAt: new Date(),
  },
];

function stubEntryRepository(overrides: Partial<IEntryRepository> = {}): IEntryRepository {
  return {
    findById: () => Promise.resolve(null),
    findByUserId: () => Promise.resolve([]),
    save: () => Promise.reject(new Error("not implemented")),
    update: () => Promise.reject(new Error("not implemented")),
    delete: () => Promise.resolve(),
    ...overrides,
  };
}

function stubReportRepository(overrides: Partial<IReportRepository> = {}): IReportRepository {
  return {
    findFirst: () => Promise.resolve(null),
    delete: () => Promise.resolve(),
    save: (params) =>
      Promise.resolve({
        id: "report-1",
        type: params.type,
        content: params.content,
        startDate: params.startDate,
        endDate: params.endDate,
        userId: params.userId,
        projectId: params.projectId,
        promptTemplate: params.promptTemplate,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ...overrides,
  };
}

function stubProjectRepository(
  overrides: Partial<IProjectRepository> = {},
): IProjectRepository {
  return {
    findById: () => Promise.resolve(null),
    findByIdWithMemberUsers: () => Promise.resolve(null),
    findByUserId: () => Promise.resolve([]),
    save: () => Promise.reject(new Error("not implemented")),
    update: () => Promise.reject(new Error("not implemented")),
    delete: () => Promise.resolve(),
    ...overrides,
  };
}

function stubAIProvider(response = "# 日報\n## 作業内容\n..."): AIProvider {
  return {
    generateText: () => Promise.resolve(response),
  };
}

function createDeps(overrides: Partial<GenerateReportDeps> = {}): GenerateReportDeps {
  return {
    entryRepository: stubEntryRepository(),
    reportRepository: stubReportRepository(),
    projectRepository: stubProjectRepository(),
    aiProvider: stubAIProvider(),
    ...overrides,
  };
}

Deno.test("generateReportUseCase - 日報を生成できる", async () => {
  const deps = createDeps({
    entryRepository: stubEntryRepository({
      findByUserId: () => Promise.resolve(sampleEntries),
    }),
  });

  const result = await generateReportUseCase(deps, {
    userId: "user-1",
    type: "DAILY",
    startDate: today,
    endDate: tomorrow,
  });

  assertEquals(result.type, "DAILY");
  assertEquals(result.userId, "user-1");
  assertEquals(typeof result.content, "string");
});

Deno.test("generateReportUseCase - 分報がない期間はエラー", async () => {
  const deps = createDeps();
  await assertRejects(
    () =>
      generateReportUseCase(deps, {
        userId: "user-1",
        type: "DAILY",
        startDate: today,
        endDate: tomorrow,
      }),
    DomainError,
    "分報がありません",
  );
});

Deno.test("generateReportUseCase - 既存レポートがあれば削除してから再作成", async () => {
  let deletedId: string | null = null;
  const existingReport: Report = {
    id: "old-report",
    type: "DAILY",
    content: "古いレポート",
    startDate: today,
    endDate: tomorrow,
    userId: "user-1",
    projectId: null,
    promptTemplate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const deps = createDeps({
    entryRepository: stubEntryRepository({
      findByUserId: () => Promise.resolve(sampleEntries),
    }),
    reportRepository: stubReportRepository({
      findFirst: () => Promise.resolve(existingReport),
      delete: (id) => {
        deletedId = id;
        return Promise.resolve();
      },
    }),
  });

  await generateReportUseCase(deps, {
    userId: "user-1",
    type: "DAILY",
    startDate: today,
    endDate: tomorrow,
  });

  assertEquals(deletedId, "old-report");
});

Deno.test("generateReportUseCase - 存在しないプロジェクトはエラー", async () => {
  const deps = createDeps();
  await assertRejects(
    () =>
      generateReportUseCase(deps, {
        userId: "user-1",
        type: "DAILY",
        startDate: today,
        endDate: tomorrow,
        projectId: "nonexistent",
      }),
    DomainError,
    "プロジェクトが見つかりません",
  );
});

Deno.test("generateReportUseCase - プロジェクトへのアクセス権がないとエラー", async () => {
  const project: Project = {
    id: "proj-1",
    name: "テスト",
    description: null,
    visibility: "PRIVATE",
    ownerId: "other-user",
    members: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const deps = createDeps({
    projectRepository: stubProjectRepository({
      findById: () => Promise.resolve(project),
    }),
  });
  await assertRejects(
    () =>
      generateReportUseCase(deps, {
        userId: "user-1",
        type: "DAILY",
        startDate: today,
        endDate: tomorrow,
        projectId: "proj-1",
      }),
    DomainError,
    "アクセス権がありません",
  );
});

Deno.test("generateReportUseCase - AIプロバイダーの応答がレポート内容になる", async () => {
  const aiContent = "# カスタム日報\nAIが生成したレポート";
  const deps = createDeps({
    entryRepository: stubEntryRepository({
      findByUserId: () => Promise.resolve(sampleEntries),
    }),
    aiProvider: stubAIProvider(aiContent),
  });

  const result = await generateReportUseCase(deps, {
    userId: "user-1",
    type: "DAILY",
    startDate: today,
    endDate: tomorrow,
  });
  assertEquals(result.content, aiContent);
});

Deno.test("generateReportUseCase - カスタムプロンプトテンプレートが保存される", async () => {
  const deps = createDeps({
    entryRepository: stubEntryRepository({
      findByUserId: () => Promise.resolve(sampleEntries),
    }),
  });
  const result = await generateReportUseCase(deps, {
    userId: "user-1",
    type: "WEEKLY",
    startDate: today,
    endDate: tomorrow,
    promptTemplate: "カスタムテンプレート",
  });
  assertEquals(result.promptTemplate, "カスタムテンプレート");
});

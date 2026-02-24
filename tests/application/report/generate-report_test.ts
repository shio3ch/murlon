import { assertEquals, assertRejects } from "../../assert.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { generateReportUseCase } from "../../../application/report/generate-report.usecase.ts";
import {
  createEntry,
  createProject,
  createProjectMember,
  createReport,
  mockAIProvider,
  mockEntryRepository,
  mockProjectRepository,
  mockReportRepository,
} from "../../helpers.ts";

const startDate = new Date("2026-01-15T00:00:00Z");
const endDate = new Date("2026-01-15T23:59:59Z");

function baseDeps() {
  const entries = [
    createEntry({ id: "e-1", content: "作業1" }),
    createEntry({ id: "e-2", content: "作業2" }),
  ];
  return {
    reportRepository: mockReportRepository(),
    entryRepository: mockEntryRepository({
      findByUserId: () => Promise.resolve(entries),
    }),
    projectRepository: mockProjectRepository(),
    aiProvider: mockAIProvider({ generateText: () => Promise.resolve("# 日報\n生成済み") }),
  };
}

Deno.test("generateReport - 正常に日報を生成できる", async () => {
  const deps = baseDeps();
  const result = await generateReportUseCase(deps, {
    userId: "user-1",
    type: "DAILY",
    startDate,
    endDate,
  });
  assertEquals(result.type, "DAILY");
  assertEquals(result.content, "# 日報\n生成済み");
});

Deno.test("generateReport - AIプロバイダーにプロンプトが渡される", async () => {
  let capturedPrompt = "";
  const deps = {
    ...baseDeps(),
    aiProvider: mockAIProvider({
      generateText: (prompt: string) => {
        capturedPrompt = prompt;
        return Promise.resolve("レポート");
      },
    }),
  };

  await generateReportUseCase(deps, {
    userId: "user-1",
    type: "DAILY",
    startDate,
    endDate,
  });
  assertEquals(capturedPrompt.includes("分報一覧"), true);
  assertEquals(capturedPrompt.includes("日報"), true);
});

Deno.test("generateReport - 分報がない場合はバリデーションエラー", async () => {
  const deps = {
    ...baseDeps(),
    entryRepository: mockEntryRepository({ findByUserId: () => Promise.resolve([]) }),
  };

  const err = await assertRejects(
    () =>
      generateReportUseCase(deps, {
        userId: "user-1",
        type: "DAILY",
        startDate,
        endDate,
      }),
    DomainError,
  );
  assertEquals(err.message, "指定した期間に分報がありません");
});

Deno.test("generateReport - 存在しないプロジェクトは NOT_FOUND", async () => {
  const deps = {
    ...baseDeps(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(null) }),
  };

  const err = await assertRejects(
    () =>
      generateReportUseCase(deps, {
        userId: "user-1",
        type: "DAILY",
        startDate,
        endDate,
        projectId: "no-such",
      }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("generateReport - プロジェクトへのアクセス権がない場合は FORBIDDEN", async () => {
  const project = createProject({ ownerId: "other-user", members: [] });
  const deps = {
    ...baseDeps(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () =>
      generateReportUseCase(deps, {
        userId: "user-1",
        type: "DAILY",
        startDate,
        endDate,
        projectId: "project-1",
      }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});

Deno.test("generateReport - プロジェクトメンバーはレポートを生成できる", async () => {
  const project = createProject({
    ownerId: "other-user",
    members: [createProjectMember({ userId: "user-1" })],
  });
  const deps = {
    ...baseDeps(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const result = await generateReportUseCase(deps, {
    userId: "user-1",
    type: "DAILY",
    startDate,
    endDate,
    projectId: "project-1",
  });
  assertEquals(result.type, "DAILY");
});

Deno.test("generateReport - 既存レポートがある場合は削除してから再作成", async () => {
  let deletedId: string | null = null;
  const existing = createReport({ id: "old-report" });
  const deps = {
    ...baseDeps(),
    reportRepository: mockReportRepository({
      findFirst: () => Promise.resolve(existing),
      delete: (id: string) => {
        deletedId = id;
        return Promise.resolve();
      },
    }),
  };

  await generateReportUseCase(deps, {
    userId: "user-1",
    type: "DAILY",
    startDate,
    endDate,
  });
  assertEquals(deletedId, "old-report");
});

Deno.test("generateReport - 週報タイプでも正常に生成できる", async () => {
  const deps = baseDeps();
  const result = await generateReportUseCase(deps, {
    userId: "user-1",
    type: "WEEKLY",
    startDate: new Date("2026-01-13T00:00:00Z"),
    endDate: new Date("2026-01-17T23:59:59Z"),
  });
  assertEquals(result.type, "WEEKLY");
});

Deno.test("generateReport - 月報タイプでも正常に生成できる", async () => {
  const deps = baseDeps();
  const result = await generateReportUseCase(deps, {
    userId: "user-1",
    type: "MONTHLY",
    startDate: new Date("2026-01-01T00:00:00Z"),
    endDate: new Date("2026-01-31T23:59:59Z"),
  });
  assertEquals(result.type, "MONTHLY");
});

Deno.test("generateReport - カスタムプロンプトテンプレートが使用される", async () => {
  let capturedPrompt = "";
  const deps = {
    ...baseDeps(),
    aiProvider: mockAIProvider({
      generateText: (prompt: string) => {
        capturedPrompt = prompt;
        return Promise.resolve("カスタムレポート");
      },
    }),
  };

  await generateReportUseCase(deps, {
    userId: "user-1",
    type: "DAILY",
    startDate,
    endDate,
    promptTemplate: "カスタムフォーマット要件",
  });
  assertEquals(capturedPrompt.includes("カスタムフォーマット要件"), true);
});

import { assertEquals, assertRejects } from "../../assert.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { generateStandupUseCase } from "../../../application/standup/generate-standup.usecase.ts";
import {
  createEntry,
  createProject,
  createProjectMember,
  createStandup,
  mockAIProvider,
  mockEntryRepository,
  mockProjectRepository,
  mockStandupRepository,
} from "../../helpers.ts";

function baseDeps() {
  const entries = [createEntry({ id: "e-1", content: "作業1" })];
  return {
    standupRepository: mockStandupRepository(),
    entryRepository: mockEntryRepository({
      findByUserId: () => Promise.resolve(entries),
    }),
    projectRepository: mockProjectRepository(),
    aiProvider: mockAIProvider({
      generateText: () => Promise.resolve("**昨日やったこと**\n- 作業1"),
    }),
  };
}

Deno.test("generateStandup - 正常にスタンドアップを生成できる", async () => {
  const deps = baseDeps();
  const result = await generateStandupUseCase(deps, {
    userId: "user-1",
    date: "2026-01-15",
  });
  assertEquals(result.content, "**昨日やったこと**\n- 作業1");
});

Deno.test("generateStandup - 日付未指定の場合は今日が使用される", async () => {
  const deps = baseDeps();
  const result = await generateStandupUseCase(deps, {
    userId: "user-1",
  });
  assertEquals(result.userId, "user-1");
});

Deno.test("generateStandup - 不正な日付形式はバリデーションエラー", async () => {
  const deps = baseDeps();

  const err = await assertRejects(
    () => generateStandupUseCase(deps, { userId: "user-1", date: "invalid-date" }),
    DomainError,
  );
  assertEquals(err.message, "日付形式が正しくありません (YYYY-MM-DD)");
});

Deno.test("generateStandup - 分報がない場合はバリデーションエラー", async () => {
  const deps = {
    ...baseDeps(),
    entryRepository: mockEntryRepository({ findByUserId: () => Promise.resolve([]) }),
  };

  const err = await assertRejects(
    () => generateStandupUseCase(deps, { userId: "user-1", date: "2026-01-15" }),
    DomainError,
  );
  assertEquals(err.message, "指定した日付の分報がありません");
});

Deno.test("generateStandup - 存在しないプロジェクトは NOT_FOUND", async () => {
  const deps = {
    ...baseDeps(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(null) }),
  };

  const err = await assertRejects(
    () =>
      generateStandupUseCase(deps, {
        userId: "user-1",
        date: "2026-01-15",
        projectId: "no-such",
      }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("generateStandup - プロジェクトへのアクセス権がない場合は FORBIDDEN", async () => {
  const project = createProject({ ownerId: "other-user", members: [] });
  const deps = {
    ...baseDeps(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () =>
      generateStandupUseCase(deps, {
        userId: "user-1",
        date: "2026-01-15",
        projectId: "project-1",
      }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});

Deno.test("generateStandup - プロジェクトメンバーはスタンドアップを生成できる", async () => {
  const project = createProject({
    ownerId: "other-user",
    members: [createProjectMember({ userId: "user-1" })],
  });
  const deps = {
    ...baseDeps(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  await generateStandupUseCase(deps, {
    userId: "user-1",
    date: "2026-01-15",
    projectId: "project-1",
  });
});

Deno.test("generateStandup - 既存スタンドアップがある場合は更新される", async () => {
  let updatedContent = "";
  const existing = createStandup({ id: "existing-standup" });
  const deps = {
    ...baseDeps(),
    standupRepository: mockStandupRepository({
      findByUserAndDate: () => Promise.resolve(existing),
      update: (_id: string, content: string) => {
        updatedContent = content;
        return Promise.resolve(createStandup({ content }));
      },
    }),
  };

  await generateStandupUseCase(deps, {
    userId: "user-1",
    date: "2026-01-15",
  });
  assertEquals(updatedContent, "**昨日やったこと**\n- 作業1");
});

Deno.test("generateStandup - AIプロバイダーにScrum形式のプロンプトが渡される", async () => {
  let capturedPrompt = "";
  const deps = {
    ...baseDeps(),
    aiProvider: mockAIProvider({
      generateText: (prompt: string) => {
        capturedPrompt = prompt;
        return Promise.resolve("standup");
      },
    }),
  };

  await generateStandupUseCase(deps, {
    userId: "user-1",
    date: "2026-01-15",
  });
  assertEquals(capturedPrompt.includes("Scrum形式"), true);
  assertEquals(capturedPrompt.includes("昨日やったこと"), true);
  assertEquals(capturedPrompt.includes("今日やること"), true);
  assertEquals(capturedPrompt.includes("ブロッカー"), true);
});

import { assertEquals, assertRejects } from "../../assert.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import {
  listReactionsUseCase,
  toggleReactionUseCase,
} from "../../../application/entry/toggle-reaction.usecase.ts";
import {
  createEntry,
  createProject,
  createProjectMember,
  createReaction,
  mockEntryRepository,
  mockProjectRepository,
  mockReactionRepository,
} from "../../helpers.ts";

const allowedEmojis = ["👍", "❤️", "🎉", "😊", "🤔"];

Deno.test("toggleReaction - 許可された絵文字でリアクションを追加できる", async () => {
  const entry = createEntry({ userId: "user-1" });
  const summary = [{ emoji: "👍", count: 1, myReaction: true }];
  const deps = {
    reactionRepository: mockReactionRepository({
      findByEntryAndUser: () => Promise.resolve(null),
      summarizeByEntry: () => Promise.resolve(summary),
    }),
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(entry) }),
    projectRepository: mockProjectRepository(),
  };

  const result = await toggleReactionUseCase(deps, {
    entryId: "entry-1",
    userId: "user-1",
    emoji: "👍",
  });
  assertEquals(result, summary);
});

Deno.test("toggleReaction - 許可されていない絵文字はバリデーションエラー", async () => {
  const deps = {
    reactionRepository: mockReactionRepository(),
    entryRepository: mockEntryRepository(),
    projectRepository: mockProjectRepository(),
  };

  const err = await assertRejects(
    () => toggleReactionUseCase(deps, { entryId: "entry-1", userId: "user-1", emoji: "🔥" }),
    DomainError,
  );
  assertEquals(err.message, "許可されていない絵文字です");
});

for (const emoji of allowedEmojis) {
  Deno.test(`toggleReaction - 絵文字 ${emoji} は許可される`, async () => {
    const entry = createEntry({ userId: "user-1" });
    const deps = {
      reactionRepository: mockReactionRepository({
        findByEntryAndUser: () => Promise.resolve(null),
        summarizeByEntry: () => Promise.resolve([]),
      }),
      entryRepository: mockEntryRepository({ findById: () => Promise.resolve(entry) }),
      projectRepository: mockProjectRepository(),
    };

    await toggleReactionUseCase(deps, {
      entryId: "entry-1",
      userId: "user-1",
      emoji,
    });
  });
}

Deno.test("toggleReaction - 存在しないエントリは NOT_FOUND", async () => {
  const deps = {
    reactionRepository: mockReactionRepository(),
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(null) }),
    projectRepository: mockProjectRepository(),
  };

  const err = await assertRejects(
    () => toggleReactionUseCase(deps, { entryId: "no-such", userId: "user-1", emoji: "👍" }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("toggleReaction - 既存リアクションがあればトグル（削除）される", async () => {
  let deleted = false;
  const entry = createEntry({ userId: "user-1" });
  const existing = createReaction({ id: "r-1" });
  const deps = {
    reactionRepository: mockReactionRepository({
      findByEntryAndUser: () => Promise.resolve(existing),
      delete: () => {
        deleted = true;
        return Promise.resolve();
      },
      summarizeByEntry: () => Promise.resolve([]),
    }),
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(entry) }),
    projectRepository: mockProjectRepository(),
  };

  await toggleReactionUseCase(deps, {
    entryId: "entry-1",
    userId: "user-1",
    emoji: "👍",
  });
  assertEquals(deleted, true);
});

Deno.test("toggleReaction - PUBLICプロジェクトの分報には他ユーザーもアクセス可能", async () => {
  const entry = createEntry({ userId: "user-1", projectId: "project-1" });
  const project = createProject({ id: "project-1", visibility: "PUBLIC", ownerId: "user-1" });
  const deps = {
    reactionRepository: mockReactionRepository({
      findByEntryAndUser: () => Promise.resolve(null),
      summarizeByEntry: () => Promise.resolve([]),
    }),
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(entry) }),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  await toggleReactionUseCase(deps, {
    entryId: "entry-1",
    userId: "user-3",
    emoji: "👍",
  });
});

Deno.test("toggleReaction - LIMITEDプロジェクトのメンバーはアクセス可能", async () => {
  const entry = createEntry({ userId: "user-1", projectId: "project-1" });
  const project = createProject({
    id: "project-1",
    visibility: "LIMITED",
    ownerId: "user-1",
    members: [createProjectMember({ userId: "user-2" })],
  });
  const deps = {
    reactionRepository: mockReactionRepository({
      findByEntryAndUser: () => Promise.resolve(null),
      summarizeByEntry: () => Promise.resolve([]),
    }),
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(entry) }),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  await toggleReactionUseCase(deps, {
    entryId: "entry-1",
    userId: "user-2",
    emoji: "👍",
  });
});

Deno.test("toggleReaction - LIMITEDプロジェクトの非メンバーはアクセス不可", async () => {
  const entry = createEntry({ userId: "user-1", projectId: "project-1" });
  const project = createProject({
    id: "project-1",
    visibility: "LIMITED",
    ownerId: "user-1",
    members: [],
  });
  const deps = {
    reactionRepository: mockReactionRepository(),
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(entry) }),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () => toggleReactionUseCase(deps, { entryId: "entry-1", userId: "user-3", emoji: "👍" }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});

Deno.test("listReactions - 正常にリアクション一覧を取得できる", async () => {
  const entry = createEntry({ userId: "user-1" });
  const summary = [{ emoji: "👍", count: 2, myReaction: true }];
  const deps = {
    reactionRepository: mockReactionRepository({
      summarizeByEntry: () => Promise.resolve(summary),
    }),
    entryRepository: mockEntryRepository({ findById: () => Promise.resolve(entry) }),
    projectRepository: mockProjectRepository(),
  };

  const result = await listReactionsUseCase(deps, {
    entryId: "entry-1",
    userId: "user-1",
  });
  assertEquals(result, summary);
});

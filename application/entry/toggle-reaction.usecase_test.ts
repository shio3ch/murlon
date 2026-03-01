import { assertEquals, assertRejects } from "$std/assert/mod.ts";
import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Entry } from "../../domain/entry/entry.entity.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";
import type { Reaction } from "../../domain/reaction/reaction.entity.ts";
import type {
  IReactionRepository,
  ReactionSummary,
} from "../../domain/reaction/reaction.repository.ts";
import type { IProjectRepository } from "../../domain/project/project.repository.ts";
import type { Project } from "../../domain/project/project.entity.ts";
import {
  listReactionsUseCase,
  type ToggleReactionDeps,
  toggleReactionUseCase,
} from "./toggle-reaction.usecase.ts";

const sampleEntry: Entry = {
  id: "entry-1",
  content: "テスト",
  userId: "user-1",
  projectId: null,
  taskId: null,
  tension: null,
  templateType: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

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

function stubReactionRepository(
  overrides: Partial<IReactionRepository> = {},
): IReactionRepository {
  return {
    findById: () => Promise.resolve(null),
    findByEntryId: () => Promise.resolve([]),
    findByEntryAndUser: () => Promise.resolve(null),
    summarizeByEntry: () => Promise.resolve([]),
    save: (params) =>
      Promise.resolve({
        id: "reaction-1",
        ...params,
        createdAt: new Date(),
      }),
    delete: () => Promise.resolve(),
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

function createDeps(overrides: Partial<ToggleReactionDeps> = {}): ToggleReactionDeps {
  return {
    reactionRepository: stubReactionRepository(),
    entryRepository: stubEntryRepository(),
    projectRepository: stubProjectRepository(),
    ...overrides,
  };
}

// --- toggleReactionUseCase ---

Deno.test("toggleReactionUseCase - 自分の分報にリアクションを追加できる", async () => {
  let saved = false;
  const deps = createDeps({
    entryRepository: stubEntryRepository({
      findById: () => Promise.resolve(sampleEntry),
    }),
    reactionRepository: stubReactionRepository({
      findByEntryAndUser: () => Promise.resolve(null),
      save: (params) => {
        saved = true;
        return Promise.resolve({
          id: "reaction-1",
          ...params,
          createdAt: new Date(),
        });
      },
    }),
  });

  await toggleReactionUseCase(deps, {
    entryId: "entry-1",
    userId: "user-1",
    emoji: "👍",
  });
  assertEquals(saved, true);
});

Deno.test("toggleReactionUseCase - 既存リアクションはトグルで削除される", async () => {
  let deleted = false;
  const existingReaction: Reaction = {
    id: "reaction-1",
    entryId: "entry-1",
    userId: "user-1",
    emoji: "👍",
    createdAt: new Date(),
  };

  const deps = createDeps({
    entryRepository: stubEntryRepository({
      findById: () => Promise.resolve(sampleEntry),
    }),
    reactionRepository: stubReactionRepository({
      findByEntryAndUser: () => Promise.resolve(existingReaction),
      delete: () => {
        deleted = true;
        return Promise.resolve();
      },
    }),
  });

  await toggleReactionUseCase(deps, {
    entryId: "entry-1",
    userId: "user-1",
    emoji: "👍",
  });
  assertEquals(deleted, true);
});

Deno.test("toggleReactionUseCase - 許可されていない絵文字はエラー", async () => {
  const deps = createDeps();
  await assertRejects(
    () =>
      toggleReactionUseCase(deps, {
        entryId: "entry-1",
        userId: "user-1",
        emoji: "💀",
      }),
    DomainError,
    "許可されていない絵文字です",
  );
});

Deno.test("toggleReactionUseCase - 存在しない分報はエラー", async () => {
  const deps = createDeps();
  await assertRejects(
    () =>
      toggleReactionUseCase(deps, {
        entryId: "nonexistent",
        userId: "user-1",
        emoji: "👍",
      }),
    DomainError,
    "分報が見つかりません",
  );
});

Deno.test("toggleReactionUseCase - PRIVATEプロジェクトの他人の分報にはアクセス不可", async () => {
  const projectEntry: Entry = {
    ...sampleEntry,
    userId: "other-user",
    projectId: "proj-1",
  };
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
    entryRepository: stubEntryRepository({
      findById: () => Promise.resolve(projectEntry),
    }),
    projectRepository: stubProjectRepository({
      findById: () => Promise.resolve(project),
    }),
  });
  await assertRejects(
    () =>
      toggleReactionUseCase(deps, {
        entryId: "entry-1",
        userId: "user-1",
        emoji: "👍",
      }),
    DomainError,
    "アクセス権がありません",
  );
});

Deno.test("toggleReactionUseCase - PUBLICプロジェクトの分報にはアクセス可能", async () => {
  const projectEntry: Entry = {
    ...sampleEntry,
    userId: "other-user",
    projectId: "proj-1",
  };
  const project: Project = {
    id: "proj-1",
    name: "テスト",
    description: null,
    visibility: "PUBLIC",
    ownerId: "other-user",
    members: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const deps = createDeps({
    entryRepository: stubEntryRepository({
      findById: () => Promise.resolve(projectEntry),
    }),
    projectRepository: stubProjectRepository({
      findById: () => Promise.resolve(project),
    }),
    reactionRepository: stubReactionRepository({
      findByEntryAndUser: () => Promise.resolve(null),
    }),
  });

  // エラーなく実行できることを確認
  await toggleReactionUseCase(deps, {
    entryId: "entry-1",
    userId: "user-1",
    emoji: "👍",
  });
});

// --- listReactionsUseCase ---

Deno.test("listReactionsUseCase - リアクション一覧を取得できる", async () => {
  const summaries: ReactionSummary[] = [
    { emoji: "👍", count: 3, myReaction: true },
    { emoji: "❤️", count: 1, myReaction: false },
  ];
  const deps = createDeps({
    entryRepository: stubEntryRepository({
      findById: () => Promise.resolve(sampleEntry),
    }),
    reactionRepository: stubReactionRepository({
      summarizeByEntry: () => Promise.resolve(summaries),
    }),
  });
  const result = await listReactionsUseCase(deps, {
    entryId: "entry-1",
    userId: "user-1",
  });
  assertEquals(result.length, 2);
  assertEquals(result[0].emoji, "👍");
  assertEquals(result[0].count, 3);
});

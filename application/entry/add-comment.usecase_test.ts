import { assertEquals, assertRejects } from "$std/assert/mod.ts";
import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Entry } from "../../domain/entry/entry.entity.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";
import type { Comment } from "../../domain/comment/comment.entity.ts";
import type { ICommentRepository } from "../../domain/comment/comment.repository.ts";
import { addCommentUseCase } from "./add-comment.usecase.ts";

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

function stubCommentRepository(overrides: Partial<ICommentRepository> = {}): ICommentRepository {
  return {
    findByEntryId: () => Promise.resolve([]),
    findByEntryIdWithUsers: () => Promise.resolve([]),
    findById: () => Promise.resolve(null),
    save: (params) =>
      Promise.resolve({
        id: "comment-1",
        ...params,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    update: () => Promise.reject(new Error("not implemented")),
    delete: () => Promise.resolve(),
    ...overrides,
  };
}

Deno.test("addCommentUseCase - 正常にコメントを追加できる", async () => {
  const deps = {
    entryRepository: stubEntryRepository({
      findById: () => Promise.resolve(sampleEntry),
    }),
    commentRepository: stubCommentRepository(),
  };
  const result = await addCommentUseCase(deps, {
    entryId: "entry-1",
    userId: "user-2",
    content: "コメント内容",
  });
  assertEquals(result.content, "コメント内容");
  assertEquals(result.entryId, "entry-1");
});

Deno.test("addCommentUseCase - 存在しない分報にはコメント不可", async () => {
  const deps = {
    entryRepository: stubEntryRepository(),
    commentRepository: stubCommentRepository(),
  };
  await assertRejects(
    () =>
      addCommentUseCase(deps, {
        entryId: "nonexistent",
        userId: "user-1",
        content: "コメント",
      }),
    DomainError,
    "分報が見つかりません",
  );
});

Deno.test("addCommentUseCase - 空のコメントはエラー", async () => {
  const deps = {
    entryRepository: stubEntryRepository({
      findById: () => Promise.resolve(sampleEntry),
    }),
    commentRepository: stubCommentRepository(),
  };
  await assertRejects(
    () =>
      addCommentUseCase(deps, {
        entryId: "entry-1",
        userId: "user-1",
        content: "   ",
      }),
    DomainError,
    "コメントを入力してください",
  );
});

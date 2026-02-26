import { assertEquals, assertRejects } from "$std/assert/mod.ts";
import { DomainError } from "../../domain/shared/domain-error.ts";
import type { Entry } from "../../domain/entry/entry.entity.ts";
import type { IEntryRepository } from "../../domain/entry/entry.repository.ts";
import type { Comment } from "../../domain/comment/comment.entity.ts";
import type { ICommentRepository } from "../../domain/comment/comment.repository.ts";
import { listCommentsUseCase } from "./list-comments.usecase.ts";

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

const sampleComments: Comment[] = [
  {
    id: "c1",
    entryId: "entry-1",
    userId: "user-2",
    content: "コメント1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "c2",
    entryId: "entry-1",
    userId: "user-3",
    content: "コメント2",
    createdAt: new Date(),
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

function stubCommentRepository(overrides: Partial<ICommentRepository> = {}): ICommentRepository {
  return {
    findByEntryId: () => Promise.resolve([]),
    findByEntryIdWithUsers: () => Promise.resolve([]),
    findById: () => Promise.resolve(null),
    save: () => Promise.reject(new Error("not implemented")),
    update: () => Promise.reject(new Error("not implemented")),
    delete: () => Promise.resolve(),
    ...overrides,
  };
}

Deno.test("listCommentsUseCase - コメント一覧を取得できる", async () => {
  const deps = {
    entryRepository: stubEntryRepository({
      findById: () => Promise.resolve(sampleEntry),
    }),
    commentRepository: stubCommentRepository({
      findByEntryId: () => Promise.resolve(sampleComments),
    }),
  };
  const result = await listCommentsUseCase(deps, { entryId: "entry-1" });
  assertEquals(result.length, 2);
  assertEquals(result[0].content, "コメント1");
});

Deno.test("listCommentsUseCase - 存在しない分報はエラー", async () => {
  const deps = {
    entryRepository: stubEntryRepository(),
    commentRepository: stubCommentRepository(),
  };
  await assertRejects(
    () => listCommentsUseCase(deps, { entryId: "nonexistent" }),
    DomainError,
    "分報が見つかりません",
  );
});

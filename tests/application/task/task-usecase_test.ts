import { assertEquals, assertRejects } from "../../assert.ts";
import { DomainError } from "../../../domain/shared/domain-error.ts";
import { createTaskUseCase } from "../../../application/task/create-task.usecase.ts";
import { updateTaskUseCase } from "../../../application/task/update-task.usecase.ts";
import { deleteTaskUseCase } from "../../../application/task/delete-task.usecase.ts";
import {
  createProject,
  createProjectMember,
  createTask,
  mockProjectRepository,
  mockTaskRepository,
} from "../../helpers.ts";

// ── createTask ──

Deno.test("createTask - 正常にタスクを作成できる", async () => {
  const project = createProject({ ownerId: "user-1" });
  const saved = createTask({ title: "新タスク" });
  const deps = {
    taskRepository: mockTaskRepository({ save: () => Promise.resolve(saved) }),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const result = await createTaskUseCase(deps, {
    projectId: "project-1",
    userId: "user-1",
    title: "新タスク",
  });
  assertEquals(result.title, "新タスク");
});

Deno.test("createTask - 存在しないプロジェクトは NOT_FOUND", async () => {
  const deps = {
    taskRepository: mockTaskRepository(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(null) }),
  };

  const err = await assertRejects(
    () => createTaskUseCase(deps, { projectId: "no-such", userId: "user-1", title: "test" }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("createTask - プロジェクトへのアクセス権がない場合は FORBIDDEN", async () => {
  const project = createProject({ ownerId: "other-user", members: [] });
  const deps = {
    taskRepository: mockTaskRepository(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () => createTaskUseCase(deps, { projectId: "project-1", userId: "user-1", title: "test" }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});

Deno.test("createTask - プロジェクトメンバーはタスクを作成できる", async () => {
  const project = createProject({
    ownerId: "other-user",
    members: [createProjectMember({ userId: "user-1" })],
  });
  const saved = createTask();
  const deps = {
    taskRepository: mockTaskRepository({ save: () => Promise.resolve(saved) }),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  await createTaskUseCase(deps, {
    projectId: "project-1",
    userId: "user-1",
    title: "test",
  });
});

Deno.test("createTask - 空のタイトルはバリデーションエラー", async () => {
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    taskRepository: mockTaskRepository(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () => createTaskUseCase(deps, { projectId: "project-1", userId: "user-1", title: "" }),
    DomainError,
  );
  assertEquals(err.message, "タイトルを入力してください");
});

Deno.test("createTask - 空白のみのタイトルはバリデーションエラー", async () => {
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    taskRepository: mockTaskRepository(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () => createTaskUseCase(deps, { projectId: "project-1", userId: "user-1", title: "   " }),
    DomainError,
  );
  assertEquals(err.message, "タイトルを入力してください");
});

Deno.test("createTask - 無効なステータスはバリデーションエラー", async () => {
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    taskRepository: mockTaskRepository(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () =>
      createTaskUseCase(deps, {
        projectId: "project-1",
        userId: "user-1",
        title: "test",
        status: "INVALID",
      }),
    DomainError,
  );
  assertEquals(err.message, "無効なステータスです");
});

Deno.test("createTask - 有効なステータスは許容される", async () => {
  const project = createProject({ ownerId: "user-1" });
  const saved = createTask();
  const deps = {
    taskRepository: mockTaskRepository({ save: () => Promise.resolve(saved) }),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  for (const status of ["TODO", "IN_PROGRESS", "DONE", "HOLD"]) {
    await createTaskUseCase(deps, {
      projectId: "project-1",
      userId: "user-1",
      title: "test",
      status,
    });
  }
});

Deno.test("createTask - 無効な優先度はバリデーションエラー", async () => {
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    taskRepository: mockTaskRepository(),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () =>
      createTaskUseCase(deps, {
        projectId: "project-1",
        userId: "user-1",
        title: "test",
        priority: "URGENT",
      }),
    DomainError,
  );
  assertEquals(err.message, "無効な優先度です");
});

Deno.test("createTask - 有効な優先度は許容される", async () => {
  const project = createProject({ ownerId: "user-1" });
  const saved = createTask();
  const deps = {
    taskRepository: mockTaskRepository({ save: () => Promise.resolve(saved) }),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  for (const priority of ["HIGH", "MEDIUM", "LOW"]) {
    await createTaskUseCase(deps, {
      projectId: "project-1",
      userId: "user-1",
      title: "test",
      priority,
    });
  }
});

// ── updateTask ──

Deno.test("updateTask - 正常に更新できる", async () => {
  const task = createTask({ projectId: "project-1" });
  const project = createProject({ ownerId: "user-1" });
  const updated = createTask({ title: "更新済み" });
  const deps = {
    taskRepository: mockTaskRepository({
      findById: () => Promise.resolve(task),
      update: () => Promise.resolve(updated),
    }),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const result = await updateTaskUseCase(deps, {
    id: "task-1",
    userId: "user-1",
    title: "更新済み",
  });
  assertEquals(result.title, "更新済み");
});

Deno.test("updateTask - 存在しないタスクは NOT_FOUND", async () => {
  const deps = {
    taskRepository: mockTaskRepository({ findById: () => Promise.resolve(null) }),
    projectRepository: mockProjectRepository(),
  };

  const err = await assertRejects(
    () => updateTaskUseCase(deps, { id: "no-such", userId: "user-1" }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("updateTask - プロジェクトへのアクセス権がない場合は FORBIDDEN", async () => {
  const task = createTask({ projectId: "project-1" });
  const project = createProject({ ownerId: "other-user", members: [] });
  const deps = {
    taskRepository: mockTaskRepository({ findById: () => Promise.resolve(task) }),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () => updateTaskUseCase(deps, { id: "task-1", userId: "user-1", title: "更新" }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});

Deno.test("updateTask - 空のタイトルはバリデーションエラー", async () => {
  const task = createTask({ projectId: "project-1" });
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    taskRepository: mockTaskRepository({ findById: () => Promise.resolve(task) }),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () => updateTaskUseCase(deps, { id: "task-1", userId: "user-1", title: "" }),
    DomainError,
  );
  assertEquals(err.message, "タイトルを入力してください");
});

Deno.test("updateTask - 無効なステータスはバリデーションエラー", async () => {
  const task = createTask({ projectId: "project-1" });
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    taskRepository: mockTaskRepository({ findById: () => Promise.resolve(task) }),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () => updateTaskUseCase(deps, { id: "task-1", userId: "user-1", status: "INVALID" }),
    DomainError,
  );
  assertEquals(err.message, "無効なステータスです");
});

Deno.test("updateTask - 無効な優先度はバリデーションエラー", async () => {
  const task = createTask({ projectId: "project-1" });
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    taskRepository: mockTaskRepository({ findById: () => Promise.resolve(task) }),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () => updateTaskUseCase(deps, { id: "task-1", userId: "user-1", priority: "URGENT" }),
    DomainError,
  );
  assertEquals(err.message, "無効な優先度です");
});

// ── deleteTask ──

Deno.test("deleteTask - 正常に削除できる", async () => {
  let deletedId: string | null = null;
  const task = createTask({ projectId: "project-1" });
  const project = createProject({ ownerId: "user-1" });
  const deps = {
    taskRepository: mockTaskRepository({
      findById: () => Promise.resolve(task),
      delete: (id: string) => {
        deletedId = id;
        return Promise.resolve();
      },
    }),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  await deleteTaskUseCase(deps, { id: "task-1", userId: "user-1" });
  assertEquals(deletedId, "task-1");
});

Deno.test("deleteTask - 存在しないタスクは NOT_FOUND", async () => {
  const deps = {
    taskRepository: mockTaskRepository({ findById: () => Promise.resolve(null) }),
    projectRepository: mockProjectRepository(),
  };

  const err = await assertRejects(
    () => deleteTaskUseCase(deps, { id: "no-such", userId: "user-1" }),
    DomainError,
  );
  assertEquals(err.code, "NOT_FOUND");
});

Deno.test("deleteTask - プロジェクトへのアクセス権がない場合は FORBIDDEN", async () => {
  const task = createTask({ projectId: "project-1" });
  const project = createProject({ ownerId: "other-user", members: [] });
  const deps = {
    taskRepository: mockTaskRepository({ findById: () => Promise.resolve(task) }),
    projectRepository: mockProjectRepository({ findById: () => Promise.resolve(project) }),
  };

  const err = await assertRejects(
    () => deleteTaskUseCase(deps, { id: "task-1", userId: "user-1" }),
    DomainError,
  );
  assertEquals(err.code, "FORBIDDEN");
});

import { assertEquals } from "../assert.ts";
import { getProjectRole, hasProjectAccess } from "../../domain/project/project.entity.ts";
import { createProject, createProjectMember } from "../helpers.ts";

// ── hasProjectAccess ──

Deno.test("hasProjectAccess - オーナーはアクセス可能", () => {
  const project = createProject({ ownerId: "user-1" });
  assertEquals(hasProjectAccess(project, "user-1"), true);
});

Deno.test("hasProjectAccess - メンバーはアクセス可能", () => {
  const project = createProject({
    ownerId: "user-1",
    members: [createProjectMember({ userId: "user-2" })],
  });
  assertEquals(hasProjectAccess(project, "user-2"), true);
});

Deno.test("hasProjectAccess - オーナーでもメンバーでもないユーザーはアクセス不可", () => {
  const project = createProject({
    ownerId: "user-1",
    members: [createProjectMember({ userId: "user-2" })],
  });
  assertEquals(hasProjectAccess(project, "user-3"), false);
});

Deno.test("hasProjectAccess - メンバーが空の場合、オーナー以外はアクセス不可", () => {
  const project = createProject({ ownerId: "user-1", members: [] });
  assertEquals(hasProjectAccess(project, "user-2"), false);
});

// ── getProjectRole ──

Deno.test("getProjectRole - オーナーは ADMIN", () => {
  const project = createProject({ ownerId: "user-1" });
  assertEquals(getProjectRole(project, "user-1"), "ADMIN");
});

Deno.test("getProjectRole - メンバーのロールを返す", () => {
  const project = createProject({
    ownerId: "user-1",
    members: [createProjectMember({ userId: "user-2", role: "CONTRIBUTOR" })],
  });
  assertEquals(getProjectRole(project, "user-2"), "CONTRIBUTOR");
});

Deno.test("getProjectRole - 非メンバーは null", () => {
  const project = createProject({ ownerId: "user-1", members: [] });
  assertEquals(getProjectRole(project, "user-99"), null);
});

Deno.test("getProjectRole - 複数メンバーの中から正しいロールを返す", () => {
  const project = createProject({
    ownerId: "user-1",
    members: [
      createProjectMember({ userId: "user-2", role: "VIEWER" }),
      createProjectMember({ userId: "user-3", role: "ADMIN" }),
    ],
  });
  assertEquals(getProjectRole(project, "user-2"), "VIEWER");
  assertEquals(getProjectRole(project, "user-3"), "ADMIN");
});

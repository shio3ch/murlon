import { assertEquals } from "$std/assert/mod.ts";
import {
  getProjectRole,
  hasProjectAccess,
  type Project,
  type ProjectMember,
} from "./project.entity.ts";

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    name: "テストプロジェクト",
    description: null,
    visibility: "PRIVATE",
    ownerId: "owner-1",
    members: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMember(overrides: Partial<ProjectMember> = {}): ProjectMember {
  return {
    id: "member-1",
    projectId: "proj-1",
    userId: "user-1",
    role: "CONTRIBUTOR",
    createdAt: new Date(),
    ...overrides,
  };
}

// --- hasProjectAccess ---

Deno.test("hasProjectAccess - オーナーはアクセス可能", () => {
  const project = createProject({ ownerId: "owner-1" });
  assertEquals(hasProjectAccess(project, "owner-1"), true);
});

Deno.test("hasProjectAccess - メンバーはアクセス可能", () => {
  const project = createProject({
    members: [createMember({ userId: "user-1" })],
  });
  assertEquals(hasProjectAccess(project, "user-1"), true);
});

Deno.test("hasProjectAccess - 非メンバーはアクセス不可", () => {
  const project = createProject({
    ownerId: "owner-1",
    members: [createMember({ userId: "user-1" })],
  });
  assertEquals(hasProjectAccess(project, "stranger"), false);
});

Deno.test("hasProjectAccess - メンバーなしのプロジェクトで非オーナーはアクセス不可", () => {
  const project = createProject({ ownerId: "owner-1", members: [] });
  assertEquals(hasProjectAccess(project, "user-1"), false);
});

// --- getProjectRole ---

Deno.test("getProjectRole - オーナーはADMIN", () => {
  const project = createProject({ ownerId: "owner-1" });
  assertEquals(getProjectRole(project, "owner-1"), "ADMIN");
});

Deno.test("getProjectRole - メンバーのロールを返す", () => {
  const project = createProject({
    members: [
      createMember({ userId: "viewer", role: "VIEWER" }),
      createMember({ userId: "commenter", role: "COMMENTER" }),
      createMember({ userId: "contributor", role: "CONTRIBUTOR" }),
      createMember({ userId: "admin", role: "ADMIN" }),
    ],
  });
  assertEquals(getProjectRole(project, "viewer"), "VIEWER");
  assertEquals(getProjectRole(project, "commenter"), "COMMENTER");
  assertEquals(getProjectRole(project, "contributor"), "CONTRIBUTOR");
  assertEquals(getProjectRole(project, "admin"), "ADMIN");
});

Deno.test("getProjectRole - 非メンバーはnull", () => {
  const project = createProject({ ownerId: "owner-1", members: [] });
  assertEquals(getProjectRole(project, "stranger"), null);
});

Deno.test("getProjectRole - オーナーかつメンバーでもADMIN", () => {
  const project = createProject({
    ownerId: "owner-1",
    members: [createMember({ userId: "owner-1", role: "VIEWER" })],
  });
  assertEquals(getProjectRole(project, "owner-1"), "ADMIN");
});

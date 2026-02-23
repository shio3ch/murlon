import { useSignal } from "@preact/signals";
import type { ProjectRole } from "../lib/types.ts";

interface MemberInfo {
  id: string;
  userId: string;
  role: ProjectRole;
  user: { id: string; name: string; email: string };
}

interface MemberManagerProps {
  projectId: string;
  initialMembers: MemberInfo[];
  ownerUser: { id: string; name: string; email: string };
  currentUserId: string;
}

const ROLE_LABELS: Record<ProjectRole, string> = {
  VIEWER: "閲覧者",
  COMMENTER: "コメント可",
  CONTRIBUTOR: "投稿可",
  ADMIN: "管理者",
};

const ROLE_COLORS: Record<ProjectRole, string> = {
  VIEWER: "bg-gray-100 text-gray-700",
  COMMENTER: "bg-green-100 text-green-700",
  CONTRIBUTOR: "bg-blue-100 text-blue-700",
  ADMIN: "bg-purple-100 text-purple-700",
};

const ROLES: ProjectRole[] = ["VIEWER", "COMMENTER", "CONTRIBUTOR", "ADMIN"];

export default function MemberManager(
  { projectId, initialMembers, ownerUser, currentUserId }: MemberManagerProps,
) {
  const members = useSignal<MemberInfo[]>(initialMembers);
  const inviteEmail = useSignal("");
  const inviteRole = useSignal<ProjectRole>("VIEWER");
  const submitting = useSignal(false);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);

  async function handleInvite(e: Event) {
    e.preventDefault();
    const email = inviteEmail.value.trim();
    if (!email) {
      error.value = "メールアドレスを入力してください";
      return;
    }

    submitting.value = true;
    error.value = null;
    success.value = null;

    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole.value }),
      });

      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "メンバーの追加に失敗しました";
        return;
      }

      members.value = [...members.value, json.data];
      inviteEmail.value = "";
      inviteRole.value = "VIEWER";
      success.value = "メンバーを追加しました";
      setTimeout(() => (success.value = null), 3000);
    } catch {
      error.value = "ネットワークエラーが発生しました";
    } finally {
      submitting.value = false;
    }
  }

  async function handleRoleChange(memberId: string, newRole: ProjectRole) {
    error.value = null;
    success.value = null;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/members/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
      );

      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "ロールの変更に失敗しました";
        return;
      }

      members.value = members.value.map((m) => m.id === memberId ? { ...m, role: newRole } : m);
    } catch {
      error.value = "ネットワークエラーが発生しました";
    }
  }

  async function handleRemove(memberId: string, memberName: string) {
    if (!confirm(`${memberName} をプロジェクトから削除しますか？`)) {
      return;
    }

    error.value = null;
    success.value = null;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/members/${memberId}`,
        { method: "DELETE" },
      );

      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "メンバーの削除に失敗しました";
        return;
      }

      members.value = members.value.filter((m) => m.id !== memberId);
      success.value = "メンバーを削除しました";
      setTimeout(() => (success.value = null), 3000);
    } catch {
      error.value = "ネットワークエラーが発生しました";
    }
  }

  const isCurrentUserOwnerOrAdmin = ownerUser.id === currentUserId ||
    members.value.some(
      (m) => m.userId === currentUserId && m.role === "ADMIN",
    );

  return (
    <div class="space-y-4">
      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error.value}
        </div>
      )}
      {success.value && (
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success.value}
        </div>
      )}

      {/* Member list */}
      <div class="divide-y divide-gray-100">
        {/* Owner row */}
        <div class="flex items-center justify-between py-3">
          <div class="flex items-center gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-900">
                  {ownerUser.name}
                </span>
                <span class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  オーナー
                </span>
              </div>
              <span class="text-xs text-gray-500">{ownerUser.email}</span>
            </div>
          </div>
        </div>

        {/* Member rows */}
        {members.value.map((member) => (
          <div key={member.id} class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <div>
                <span class="text-sm font-medium text-gray-900">
                  {member.user.name}
                </span>
                <span class="text-xs text-gray-500 ml-2">
                  {member.user.email}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              {isCurrentUserOwnerOrAdmin
                ? (
                  <>
                    <select
                      class="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(
                          member.id,
                          (e.target as HTMLSelectElement).value as ProjectRole,
                        )}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemove(member.id, member.user.name)}
                      class="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1"
                    >
                      削除
                    </button>
                  </>
                )
                : (
                  <span
                    class={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ROLE_COLORS[member.role]
                    }`}
                  >
                    {ROLE_LABELS[member.role]}
                  </span>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* Invite form */}
      {isCurrentUserOwnerOrAdmin && (
        <form onSubmit={handleInvite} class="pt-4 border-t border-gray-200">
          <h3 class="text-sm font-medium text-gray-700 mb-3">
            メンバーを招待
          </h3>
          <div class="flex gap-2">
            <input
              type="email"
              placeholder="メールアドレスを入力"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
              value={inviteEmail.value}
              onInput={(e) => (inviteEmail.value = (e.target as HTMLInputElement).value)}
              disabled={submitting.value}
            />
            <select
              class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              value={inviteRole.value}
              onChange={(
                e,
              ) => (inviteRole.value = (e.target as HTMLSelectElement).value as ProjectRole)}
              disabled={submitting.value}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={submitting.value}
              class="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              {submitting.value ? "追加中..." : "招待"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

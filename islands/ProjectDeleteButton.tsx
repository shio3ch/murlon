import { useSignal } from "@preact/signals";

interface ProjectDeleteButtonProps {
  projectId: string;
  projectName: string;
}

export default function ProjectDeleteButton(
  { projectId, projectName }: ProjectDeleteButtonProps,
) {
  const deleting = useSignal(false);
  const error = useSignal<string | null>(null);

  async function handleDelete() {
    if (!confirm(`プロジェクト「${projectName}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    deleting.value = true;
    error.value = null;

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "削除に失敗しました";
        return;
      }

      globalThis.location.href = "/projects";
    } catch {
      error.value = "ネットワークエラーが発生しました";
    } finally {
      deleting.value = false;
    }
  }

  return (
    <div>
      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-3">
          {error.value}
        </div>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting.value}
        class="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        {deleting.value ? "削除中..." : "このプロジェクトを削除"}
      </button>
    </div>
  );
}

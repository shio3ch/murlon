import { useSignal } from "@preact/signals";
import type { Visibility } from "../lib/types.ts";

interface ProjectFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    visibility: Visibility;
  };
}

export default function ProjectForm({ mode, initialData }: ProjectFormProps) {
  const name = useSignal(initialData?.name ?? "");
  const description = useSignal(initialData?.description ?? "");
  const visibility = useSignal<Visibility>(initialData?.visibility ?? "PRIVATE");
  const submitting = useSignal(false);
  const error = useSignal<string | null>(null);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const trimmedName = name.value.trim();

    if (!trimmedName) {
      error.value = "プロジェクト名を入力してください";
      return;
    }
    if (trimmedName.length > 50) {
      error.value = "プロジェクト名は50文字以内で入力してください";
      return;
    }

    submitting.value = true;
    error.value = null;

    try {
      const url = mode === "create" ? "/api/projects" : `/api/projects/${initialData!.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.value.trim() || null,
          visibility: visibility.value,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "保存に失敗しました";
        return;
      }

      globalThis.location.href = `/projects/${json.data.id}`;
    } catch {
      error.value = "ネットワークエラーが発生しました";
    } finally {
      submitting.value = false;
    }
  }

  return (
    <form onSubmit={handleSubmit} class="space-y-6">
      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error.value}
        </div>
      )}

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          プロジェクト名 <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
          placeholder="プロジェクト名を入力"
          value={name.value}
          onInput={(e) => (name.value = (e.target as HTMLInputElement).value)}
          maxLength={50}
          disabled={submitting.value}
        />
        <p class="text-xs text-gray-400 mt-1">{name.value.length}/50</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          説明
        </label>
        <textarea
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm resize-none"
          rows={3}
          placeholder="プロジェクトの説明（任意）"
          value={description.value}
          onInput={(e) => (description.value = (e.target as HTMLTextAreaElement).value)}
          disabled={submitting.value}
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          公開範囲
        </label>
        <select
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
          value={visibility.value}
          onChange={(e) => (visibility.value = (e.target as HTMLSelectElement).value as Visibility)}
          disabled={submitting.value}
        >
          <option value="PRIVATE">非公開 - オーナーとメンバーのみ</option>
          <option value="LIMITED">限定公開 - リンクを知っている人</option>
          <option value="PUBLIC">公開 - 全員が閲覧可能</option>
        </select>
      </div>

      <div class="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting.value}
          class="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          {submitting.value ? "保存中..." : mode === "create" ? "プロジェクトを作成" : "変更を保存"}
        </button>
        <a
          href={mode === "edit" ? `/projects/${initialData!.id}` : "/projects"}
          class="text-sm text-gray-500 hover:text-gray-700"
        >
          キャンセル
        </a>
      </div>
    </form>
  );
}

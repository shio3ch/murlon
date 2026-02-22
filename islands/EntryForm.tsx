import { useSignal } from "@preact/signals";
import type { EntryRecord } from "../lib/types.ts";

interface EntryFormProps {
  userId: string;
  onEntryAdded: (entry: EntryRecord) => void;
}

export default function EntryForm({ userId, onEntryAdded }: EntryFormProps) {
  const content = useSignal("");
  const submitting = useSignal(false);
  const error = useSignal<string | null>(null);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const text = content.value.trim();
    if (!text) return;

    submitting.value = true;
    error.value = null;

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "投稿に失敗しました";
        return;
      }

      content.value = "";
      onEntryAdded({
        ...json.data,
        createdAt: new Date(json.data.createdAt),
        updatedAt: new Date(json.data.updatedAt),
      });
    } catch {
      error.value = "ネットワークエラーが発生しました";
    } finally {
      submitting.value = false;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleSubmit(e);
    }
  }

  return (
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <form onSubmit={handleSubmit}>
        <textarea
          class="w-full px-3 py-2 text-gray-800 placeholder-gray-400 border-0 resize-none focus:outline-none focus:ring-0 text-base"
          rows={3}
          placeholder="今、何をしていますか？ひとことメモを書いてみましょう... (Ctrl+Enter で投稿)"
          value={content.value}
          onInput={(e) => (content.value = (e.target as HTMLTextAreaElement).value)}
          onKeyDown={handleKeyDown}
          maxLength={5000}
          disabled={submitting.value}
        />

        {error.value && (
          <p class="text-red-500 text-sm mt-1 px-3">{error.value}</p>
        )}

        <div class="flex items-center justify-between px-1 pt-2 border-t border-gray-100 mt-2">
          <span class="text-xs text-gray-400">
            {content.value.length}/5000
          </span>
          <button
            type="submit"
            disabled={submitting.value || content.value.trim().length === 0}
            class="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            {submitting.value ? "投稿中..." : "投稿"}
          </button>
        </div>
      </form>
    </div>
  );
}


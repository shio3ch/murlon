import { useSignal } from "@preact/signals";
import type { EntryRecord } from "../lib/types.ts";

interface DashboardIslandProps {
  initialEntries: EntryRecord[];
  userId: string;
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByDate(entries: EntryRecord[]): Map<string, EntryRecord[]> {
  const groups = new Map<string, EntryRecord[]>();
  for (const entry of entries) {
    const dateKey = new Date(entry.createdAt).toLocaleDateString("ja-JP");
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(entry);
  }
  return groups;
}

interface EntryItemProps {
  entry: EntryRecord;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
}

function EntryItem({ entry, onDelete, onUpdate }: EntryItemProps) {
  const deleting = useSignal(false);
  const editing = useSignal(false);
  const editContent = useSignal(entry.content);

  async function handleDelete() {
    if (!confirm("この分報を削除しますか？")) return;
    deleting.value = true;
    try {
      const res = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        onDelete(entry.id);
      }
    } finally {
      deleting.value = false;
    }
  }

  async function handleSaveEdit() {
    const content = editContent.value.trim();
    if (!content) return;

    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (json.success) {
        onUpdate(entry.id, content);
        editing.value = false;
      }
    } catch {
      // ignore
    }
  }

  return (
    <div class="group flex gap-3 py-2.5 px-1 hover:bg-gray-50 rounded-lg transition-colors">
      <span class="text-xs text-gray-400 mt-0.5 shrink-0 w-12 text-right">
        {formatTime(entry.createdAt)}
      </span>

      <div class="flex-1 min-w-0">
        {editing.value
          ? (
            <div class="space-y-2">
              <textarea
                class="w-full px-2 py-1 text-sm border border-brand-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                rows={2}
                value={editContent.value}
                onInput={(e) => (editContent.value = (e.target as HTMLTextAreaElement).value)}
              />
              <div class="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  class="text-xs bg-brand-600 text-white px-2 py-1 rounded hover:bg-brand-700"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    editing.value = false;
                    editContent.value = entry.content;
                  }}
                  class="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-200"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )
          : (
            <p class="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
              {entry.content}
            </p>
          )}
      </div>

      <div class="opacity-0 group-hover:opacity-100 flex items-start gap-1 shrink-0 transition-opacity">
        <button
          onClick={() => {
            editContent.value = entry.content;
            editing.value = true;
          }}
          class="text-xs text-gray-400 hover:text-brand-600 px-1 py-0.5 rounded"
          title="編集"
        >
          ✏️
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting.value}
          class="text-xs text-gray-400 hover:text-red-500 px-1 py-0.5 rounded disabled:opacity-50"
          title="削除"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

export default function DashboardIsland({ initialEntries, userId }: DashboardIslandProps) {
  const entries = useSignal<EntryRecord[]>(initialEntries);
  const content = useSignal("");
  const submitting = useSignal(false);
  const formError = useSignal<string | null>(null);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const text = content.value.trim();
    if (!text) return;

    submitting.value = true;
    formError.value = null;

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      const json = await res.json();
      if (!json.success) {
        formError.value = json.error || "投稿に失敗しました";
        return;
      }

      const newEntry: EntryRecord = {
        ...json.data,
        createdAt: new Date(json.data.createdAt),
        updatedAt: new Date(json.data.updatedAt),
      };

      entries.value = [newEntry, ...entries.value];
      content.value = "";
    } catch {
      formError.value = "ネットワークエラーが発生しました";
    } finally {
      submitting.value = false;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleSubmit(e);
    }
  }

  function handleDelete(id: string) {
    entries.value = entries.value.filter((e) => e.id !== id);
  }

  function handleUpdate(id: string, newContent: string) {
    entries.value = entries.value.map((e) =>
      e.id === id ? { ...e, content: newContent } : e
    );
  }

  const grouped = groupByDate(entries.value);

  return (
    <div>
      {/* Entry form */}
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

          {formError.value && (
            <p class="text-red-500 text-sm mt-1 px-3">{formError.value}</p>
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

      {/* Entry list */}
      <div class="mt-8 space-y-6">
        {entries.value.length === 0
          ? (
            <div class="text-center py-12 text-gray-400">
              <p class="text-4xl mb-3">📝</p>
              <p class="text-sm">まだ分報がありません。上のフォームから投稿してみましょう！</p>
            </div>
          )
          : (
            <>
              <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                分報一覧 ({entries.value.length}件)
              </h2>
              {Array.from(grouped.entries()).map(([dateKey, dayEntries]) => (
                <div
                  key={dateKey}
                  class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <span class="text-sm font-medium text-gray-600">{dateKey}</span>
                    <span class="ml-2 text-xs text-gray-400">{dayEntries.length}件</span>
                  </div>
                  <div class="px-4 py-1 divide-y divide-gray-50">
                    {dayEntries.map((entry) => (
                      <EntryItem
                        key={entry.id}
                        entry={entry}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
      </div>
    </div>
  );
}

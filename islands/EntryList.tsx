import { useSignal } from "@preact/signals";
import type { EntryRecord } from "../lib/types.ts";
import EntryReactions from "./EntryReactions.tsx";

interface EntryListProps {
  initialEntries: EntryRecord[];
  userId: string;
  currentUserId: string;
  projectMap?: Record<string, string>;
}

function formatTime(date: Date): string {
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
  projectName?: string;
  currentUserId: string;
}

function EntryItem({ entry, onDelete, projectName, currentUserId }: EntryItemProps) {
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
        entry.content = content;
        editing.value = false;
      }
    } catch {
      // ignore
    }
  }

  return (
    <div class="group flex gap-3 py-2.5 px-1 hover:bg-gray-50 rounded-lg transition-colors">
      {/* アバター */}
      <div class="shrink-0 mt-0.5">
        {entry.author?.avatarUrl
          ? (
            <img
              src={entry.author.avatarUrl}
              alt={entry.author.name}
              class="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
              }}
            />
          )
          : null}
        <span
          class={`w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center${
            entry.author?.avatarUrl ? " hidden" : ""
          }`}
        >
          {(entry.author?.name ?? "?").charAt(0).toUpperCase()}
        </span>
      </div>

      {/* 時刻 + コンテンツ */}
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
                  type="button"
                  onClick={handleSaveEdit}
                  class="text-xs bg-brand-600 text-white px-2 py-1 rounded hover:bg-brand-700"
                >
                  保存
                </button>
                <button
                  type="button"
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
            <div>
              <div class="flex items-baseline gap-2">
                <span class="text-xs text-gray-400 shrink-0">
                  {formatTime(entry.createdAt)}
                </span>
                <p class="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {entry.content}
                </p>
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                {projectName && (
                  <span class="text-xs text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                    {projectName}
                  </span>
                )}
                {entry.tension && (
                  <span class="text-xs text-gray-400">
                    調子: {entry.tension}
                  </span>
                )}
              </div>
              <EntryReactions entryId={entry.id} currentUserId={currentUserId} />
            </div>
          )}
      </div>

      <div class="opacity-0 group-hover:opacity-100 flex items-start gap-1 shrink-0 transition-opacity">
        <button
          type="button"
          onClick={() => (editing.value = true)}
          class="text-xs text-gray-400 hover:text-brand-600 px-1 py-0.5 rounded"
          title="編集"
        >
          ✏️
        </button>
        <button
          type="button"
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

export default function EntryList(
  { initialEntries, currentUserId, projectMap }: EntryListProps,
) {
  const entries = useSignal<EntryRecord[]>(initialEntries);

  function handleDelete(id: string) {
    entries.value = entries.value.filter((e) => e.id !== id);
  }

  const grouped = groupByDate(entries.value);

  if (entries.value.length === 0) {
    return (
      <div class="text-center py-12 text-gray-400">
        <p class="text-4xl mb-3">📝</p>
        <p class="text-sm">まだ分報がありません。上のフォームから投稿してみましょう！</p>
      </div>
    );
  }

  return (
    <div class="space-y-6">
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
                projectName={entry.projectId && projectMap
                  ? projectMap[entry.projectId]
                  : undefined}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

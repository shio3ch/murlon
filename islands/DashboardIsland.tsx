import { useSignal } from "@preact/signals";
import type { EntryRecord } from "../lib/types.ts";
import EntryReactions from "./EntryReactions.tsx";

interface DashboardIslandProps {
  initialEntries: EntryRecord[];
  userId: string;
  projects?: { id: string; name: string }[];
  projectId?: string;
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
  projectName?: string;
  currentUserId: string;
}

function EntryItem({ entry, onDelete, onUpdate, projectName, currentUserId }: EntryItemProps) {
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
          class={`w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center${entry.author?.avatarUrl ? " hidden" : ""}`}
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

export default function DashboardIsland(
  { initialEntries, userId, projects, projectId }: DashboardIslandProps,
) {
  const entries = useSignal<EntryRecord[]>(initialEntries);
  const content = useSignal("");
  const submitting = useSignal(false);
  const formError = useSignal<string | null>(null);
  const selectedProjectId = useSignal<string>(projectId || "");
  const tension = useSignal<number | null>(null);
  const filterProjectId = useSignal<string>("");

  const projectMap = new Map<string, string>();
  if (projects) {
    for (const p of projects) {
      projectMap.set(p.id, p.name);
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const text = content.value.trim();
    if (!text) return;

    submitting.value = true;
    formError.value = null;

    try {
      const payload: Record<string, unknown> = { content: text };
      if (selectedProjectId.value) payload.projectId = selectedProjectId.value;
      if (tension.value !== null) payload.tension = tension.value;

      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      tension.value = null;
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
    entries.value = entries.value.map((e) => e.id === id ? { ...e, content: newContent } : e);
  }

  const filteredEntries = filterProjectId.value
    ? entries.value.filter((e) => e.projectId === filterProjectId.value)
    : entries.value;
  const grouped = groupByDate(filteredEntries);

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

          {formError.value && <p class="text-red-500 text-sm mt-1 px-3">{formError.value}</p>}

          <div class="flex items-center gap-3 px-1 pt-2 border-t border-gray-100 mt-2">
            {/* Project selector (hidden when projectId is fixed) */}
            {!projectId && projects && projects.length > 0 && (
              <select
                class="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={selectedProjectId.value}
                onChange={(e) => (selectedProjectId.value = (e.target as HTMLSelectElement).value)}
                disabled={submitting.value}
              >
                <option value="">プロジェクトなし</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}

            {/* Tension selector */}
            <div class="flex items-center gap-1">
              <span class="text-xs text-gray-400 mr-0.5">調子</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    tension.value = tension.value === n ? null : n;
                  }}
                  class={`w-6 h-6 rounded-full text-xs font-semibold transition-colors ${
                    tension.value === n
                      ? "bg-brand-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                  disabled={submitting.value}
                >
                  {n}
                </button>
              ))}
            </div>

            <div class="flex-1" />

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

      {/* Project filter (hidden when projectId is fixed) */}
      {!projectId && projects && projects.length > 0 && (
        <div class="mt-4 flex items-center gap-2">
          <span class="text-xs text-gray-500">フィルター:</span>
          <select
            class="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={filterProjectId.value}
            onChange={(e) => (filterProjectId.value = (e.target as HTMLSelectElement).value)}
          >
            <option value="">すべて</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {/* Entry list */}
      <div class="mt-8 space-y-6">
        {filteredEntries.length === 0
          ? (
            <div class="text-center py-12 text-gray-400">
              <p class="text-4xl mb-3">📝</p>
              <p class="text-sm">まだ分報がありません。上のフォームから投稿してみましょう！</p>
            </div>
          )
          : (
            <>
              <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                分報一覧 ({filteredEntries.length}件)
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
                        projectName={entry.projectId ? projectMap.get(entry.projectId) : undefined}
                        currentUserId={userId}
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

import { useState } from "preact/hooks";
import type {
  ApiResponse,
  TaskPriority,
  TaskRecord,
  TaskStatus,
} from "../lib/types.ts";

interface KanbanBoardProps {
  initialTasks: TaskRecord[];
  projectId: string;
}

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "TODO", label: "未着手", color: "bg-gray-100" },
  { status: "IN_PROGRESS", label: "進行中", color: "bg-blue-50" },
  { status: "DONE", label: "完了", color: "bg-green-50" },
  { status: "HOLD", label: "保留", color: "bg-yellow-50" },
];

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-gray-100 text-gray-600",
};

const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "HOLD"];

function isOverdue(dueDate: Date | string | null): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
}

const INITIAL_FORM: TaskFormData = {
  title: "",
  description: "",
  priority: "MEDIUM",
  dueDate: "",
  status: "TODO",
};

export default function KanbanBoard({ initialTasks, projectId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("TODO");
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [form, setForm] = useState<TaskFormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openCreateModal(status: TaskStatus) {
    setCreateStatus(status);
    setForm({ ...INITIAL_FORM, status });
    setEditingTask(null);
    setError("");
    setShowCreateModal(true);
  }

  function openEditModal(task: TaskRecord) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
      status: task.status,
    });
    setError("");
    setShowCreateModal(true);
  }

  function closeModal() {
    setShowCreateModal(false);
    setEditingTask(null);
    setForm(INITIAL_FORM);
    setError("");
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("タイトルを入力してください");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (editingTask) {
        const res = await fetch(`/api/tasks/${editingTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim() || null,
            priority: form.priority,
            status: form.status,
            dueDate: form.dueDate || null,
          }),
        });
        const json: ApiResponse<TaskRecord> = await res.json();
        if (json.success && json.data) {
          setTasks((prev) =>
            prev.map((t) => (t.id === editingTask.id ? json.data! : t))
          );
          closeModal();
        } else {
          setError(json.error || "更新に失敗しました");
        }
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            priority: form.priority,
            status: createStatus,
            dueDate: form.dueDate || undefined,
          }),
        });
        const json: ApiResponse<TaskRecord> = await res.json();
        if (json.success && json.data) {
          setTasks((prev) => [json.data!, ...prev]);
          closeModal();
        } else {
          setError(json.error || "作成に失敗しました");
        }
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm("このタスクを削除しますか？")) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const json: ApiResponse = await res.json();
      if (json.success) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        closeModal();
      }
    } catch {
      // ignore
    }
  }

  async function moveTask(taskId: string, direction: "prev" | "next") {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const currentIndex = STATUS_ORDER.indexOf(task.status);
    const newIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= STATUS_ORDER.length) return;

    const newStatus = STATUS_ORDER[newIndex];

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json: ApiResponse<TaskRecord> = await res.json();
      if (json.success && json.data) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? json.data! : t)));
      }
    } catch {
      // ignore
    }
  }

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  return (
    <div>
      {/* Toolbar */}
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("kanban")}
            class={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              view === "kanban"
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            かんばん
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            class={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              view === "list"
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            リスト
          </button>
        </div>
        <button
          type="button"
          onClick={() => openCreateModal("TODO")}
          class="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          タスクを追加
        </button>
      </div>

      {/* Kanban view */}
      {view === "kanban" && (
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const columnTasks = tasksByStatus(col.status);
            return (
              <div
                key={col.status}
                class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div
                  class={`px-4 py-3 ${col.color} border-b border-gray-200 flex items-center justify-between`}
                >
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm font-semibold text-gray-700">
                      {col.label}
                    </h3>
                    <span class="text-xs text-gray-400 bg-white px-1.5 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCreateModal(col.status)}
                    class="text-gray-400 hover:text-brand-600 text-lg leading-none"
                    title="追加"
                  >
                    +
                  </button>
                </div>
                <div class="p-2 space-y-2 min-h-[120px]">
                  {columnTasks.length === 0 && (
                    <p class="text-xs text-gray-300 text-center py-6">
                      タスクなし
                    </p>
                  )}
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onMove={moveTask}
                      onClick={() => openEditModal(task)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div class="space-y-6">
          {COLUMNS.map((col) => {
            const columnTasks = tasksByStatus(col.status);
            if (columnTasks.length === 0) return null;
            return (
              <div
                key={col.status}
                class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div
                  class={`px-4 py-3 ${col.color} border-b border-gray-200`}
                >
                  <h3 class="text-sm font-semibold text-gray-700">
                    {col.label} ({columnTasks.length})
                  </h3>
                </div>
                <table class="w-full">
                  <thead>
                    <tr class="text-xs text-gray-500 border-b border-gray-100">
                      <th class="text-left px-4 py-2 font-medium">タイトル</th>
                      <th class="text-left px-4 py-2 font-medium w-20">
                        優先度
                      </th>
                      <th class="text-left px-4 py-2 font-medium w-24">
                        期限
                      </th>
                      <th class="text-right px-4 py-2 font-medium w-24">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-50">
                    {columnTasks.map((task) => (
                      <tr
                        key={task.id}
                        class="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => openEditModal(task)}
                      >
                        <td class="px-4 py-3">
                          <span class="text-sm text-gray-800">
                            {task.title}
                          </span>
                        </td>
                        <td class="px-4 py-3">
                          <span
                            class={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              PRIORITY_COLORS[task.priority]
                            }`}
                          >
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                        </td>
                        <td class="px-4 py-3">
                          {task.dueDate && (
                            <span
                              class={`text-xs ${
                                isOverdue(task.dueDate)
                                  ? "text-red-600 font-medium"
                                  : "text-gray-500"
                              }`}
                            >
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                        </td>
                        <td class="px-4 py-3 text-right">
                          <div
                            class="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {STATUS_ORDER.indexOf(task.status) > 0 && (
                              <button
                                type="button"
                                onClick={() => moveTask(task.id, "prev")}
                                class="text-xs text-gray-400 hover:text-brand-600 px-1.5 py-0.5 rounded hover:bg-gray-100"
                                title="前のステータスへ"
                              >
                                &larr;
                              </button>
                            )}
                            {STATUS_ORDER.indexOf(task.status) <
                              STATUS_ORDER.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveTask(task.id, "next")}
                                class="text-xs text-gray-400 hover:text-brand-600 px-1.5 py-0.5 rounded hover:bg-gray-100"
                                title="次のステータスへ"
                              >
                                &rarr;
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {tasks.length === 0 && (
            <div class="text-center py-12 text-gray-400">
              <p class="text-sm">
                タスクがありません。「タスクを追加」ボタンから作成しましょう。
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900">
                {editingTask ? "タスクを編集" : "タスクを追加"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                class="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} class="p-6 space-y-4">
              {error && (
                <div class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  タイトル <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onInput={(e) =>
                    setForm({
                      ...form,
                      title: (e.target as HTMLInputElement).value,
                    })
                  }
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="タスクのタイトル"
                  autoFocus
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  value={form.description}
                  onInput={(e) =>
                    setForm({
                      ...form,
                      description: (e.target as HTMLTextAreaElement).value,
                    })
                  }
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                  rows={3}
                  placeholder="詳細な説明（任意）"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    優先度
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        priority: (e.target as HTMLSelectElement)
                          .value as TaskPriority,
                      })
                    }
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="HIGH">高</option>
                    <option value="MEDIUM">中</option>
                    <option value="LOW">低</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    期限日
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onInput={(e) =>
                      setForm({
                        ...form,
                        dueDate: (e.target as HTMLInputElement).value,
                      })
                    }
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              {editingTask && (
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    ステータス
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: (e.target as HTMLSelectElement)
                          .value as TaskStatus,
                      })
                    }
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  >
                    {COLUMNS.map((col) => (
                      <option key={col.status} value={col.status}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div class="flex items-center justify-between pt-2">
                {editingTask ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingTask.id)}
                    class="text-sm text-red-500 hover:text-red-700 transition-colors"
                  >
                    削除
                  </button>
                ) : (
                  <div />
                )}
                <div class="flex gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    class="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {loading
                      ? "処理中..."
                      : editingTask
                        ? "更新"
                        : "作成"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface TaskCardProps {
  task: TaskRecord;
  onMove: (taskId: string, direction: "prev" | "next") => void;
  onClick: () => void;
}

function TaskCard({ task, onMove, onClick }: TaskCardProps) {
  const statusIndex = STATUS_ORDER.indexOf(task.status);
  const canMovePrev = statusIndex > 0;
  const canMoveNext = statusIndex < STATUS_ORDER.length - 1;

  return (
    <div
      class="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow"
      onClick={onClick}
    >
      <div class="flex items-start justify-between gap-2">
        <h4 class="text-sm font-medium text-gray-800 flex-1 break-words">
          {task.title}
        </h4>
        <span
          class={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
            PRIORITY_COLORS[task.priority]
          }`}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>

      {task.dueDate && (
        <p
          class={`text-xs mt-2 ${
            isOverdue(task.dueDate) ? "text-red-600 font-medium" : "text-gray-400"
          }`}
        >
          期限: {formatDate(task.dueDate)}
        </p>
      )}

      <div
        class="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {canMovePrev && (
          <button
            type="button"
            onClick={() => onMove(task.id, "prev")}
            class="text-xs text-gray-400 hover:text-brand-600 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
            title={`${COLUMNS[statusIndex - 1].label}へ`}
          >
            &larr;
          </button>
        )}
        {canMoveNext && (
          <button
            type="button"
            onClick={() => onMove(task.id, "next")}
            class="text-xs text-gray-400 hover:text-brand-600 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
            title={`${COLUMNS[statusIndex + 1].label}へ`}
          >
            &rarr;
          </button>
        )}
      </div>
    </div>
  );
}

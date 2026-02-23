import { useSignal } from "@preact/signals";
import type { ReportTemplateRecord, ReportType } from "../lib/types.ts";

interface TemplateManagerProps {
  initialTemplates: ReportTemplateRecord[];
}

const TYPE_LABELS: Record<ReportType, string> = {
  DAILY: "日報",
  WEEKLY: "週報",
  MONTHLY: "月報",
};

const TYPES: ReportType[] = ["DAILY", "WEEKLY", "MONTHLY"];

export default function TemplateManager(
  { initialTemplates }: TemplateManagerProps,
) {
  const templates = useSignal<ReportTemplateRecord[]>(initialTemplates);
  const activeTab = useSignal<ReportType>("DAILY");
  const showForm = useSignal(false);
  const editingId = useSignal<string | null>(null);
  const formName = useSignal("");
  const formType = useSignal<ReportType>("DAILY");
  const formPrompt = useSignal("");
  const submitting = useSignal(false);
  const error = useSignal<string | null>(null);
  const success = useSignal<string | null>(null);

  function resetForm() {
    formName.value = "";
    formType.value = activeTab.value;
    formPrompt.value = "";
    editingId.value = null;
    showForm.value = false;
  }

  function startCreate() {
    resetForm();
    formType.value = activeTab.value;
    showForm.value = true;
    editingId.value = null;
  }

  function startEdit(template: ReportTemplateRecord) {
    formName.value = template.name;
    formType.value = template.type;
    formPrompt.value = template.prompt;
    editingId.value = template.id;
    showForm.value = true;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const name = formName.value.trim();
    const prompt = formPrompt.value.trim();

    if (!name) {
      error.value = "テンプレート名を入力してください";
      return;
    }
    if (!prompt) {
      error.value = "プロンプトを入力してください";
      return;
    }

    submitting.value = true;
    error.value = null;
    success.value = null;

    try {
      const isEdit = editingId.value !== null;
      const url = isEdit ? `/api/templates/${editingId.value}` : "/api/templates";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: formType.value,
          prompt,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "保存に失敗しました";
        return;
      }

      const saved = {
        ...json.data,
        createdAt: new Date(json.data.createdAt),
        updatedAt: new Date(json.data.updatedAt),
      };

      if (isEdit) {
        templates.value = templates.value.map((t) => t.id === editingId.value ? saved : t);
      } else {
        templates.value = [...templates.value, saved];
      }

      resetForm();
      success.value = isEdit ? "テンプレートを更新しました" : "テンプレートを作成しました";
      setTimeout(() => (success.value = null), 3000);
    } catch {
      error.value = "ネットワークエラーが発生しました";
    } finally {
      submitting.value = false;
    }
  }

  async function handleDelete(template: ReportTemplateRecord) {
    if (!confirm(`テンプレート「${template.name}」を削除しますか？`)) {
      return;
    }

    error.value = null;
    success.value = null;

    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!json.success) {
        error.value = json.error || "削除に失敗しました";
        return;
      }

      templates.value = templates.value.filter((t) => t.id !== template.id);
      if (editingId.value === template.id) {
        resetForm();
      }
      success.value = "テンプレートを削除しました";
      setTimeout(() => (success.value = null), 3000);
    } catch {
      error.value = "ネットワークエラーが発生しました";
    }
  }

  const filtered = templates.value.filter((t) => t.type === activeTab.value);
  const presets = filtered.filter((t) => t.userId === null);
  const custom = filtered.filter((t) => t.userId !== null);

  return (
    <div class="space-y-6">
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

      {/* Type tabs */}
      <div class="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              activeTab.value = t;
              resetForm();
            }}
            class={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab.value === t
                ? "bg-white text-brand-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Preset templates */}
      {presets.length > 0 && (
        <div>
          <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            プリセットテンプレート
          </h3>
          <div class="space-y-3">
            {presets.map((template) => (
              <div
                key={template.id}
                class="bg-gray-50 border border-gray-200 rounded-lg p-4"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-gray-900">
                    {template.name}
                  </span>
                  <span class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    プリセット
                  </span>
                </div>
                <p class="text-xs text-gray-600 whitespace-pre-wrap">
                  {template.prompt}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom templates */}
      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            カスタムテンプレート
          </h3>
          {!showForm.value && (
            <button
              type="button"
              onClick={startCreate}
              class="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              + 新規作成
            </button>
          )}
        </div>

        {custom.length === 0 && !showForm.value && (
          <p class="text-sm text-gray-400 text-center py-6">
            カスタムテンプレートはまだありません
          </p>
        )}

        <div class="space-y-3">
          {custom.map((template) =>
            editingId.value === template.id ? null : (
              <div
                key={template.id}
                class="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-gray-900">
                    {template.name}
                  </span>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(template)}
                      class="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template)}
                      class="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      削除
                    </button>
                  </div>
                </div>
                <p class="text-xs text-gray-600 whitespace-pre-wrap">
                  {template.prompt}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Create/Edit form */}
      {showForm.value && (
        <form
          onSubmit={handleSubmit}
          class="bg-white border border-brand-200 rounded-lg p-4 space-y-4"
        >
          <h3 class="text-sm font-semibold text-gray-900">
            {editingId.value ? "テンプレートを編集" : "新規テンプレート"}
          </h3>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              テンプレート名 <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
              placeholder="テンプレート名を入力"
              value={formName.value}
              onInput={(e) => (formName.value = (e.target as HTMLInputElement).value)}
              disabled={submitting.value}
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              レポートタイプ
            </label>
            <select
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              value={formType.value}
              onChange={(
                e,
              ) => (formType.value = (e.target as HTMLSelectElement).value as ReportType)}
              disabled={submitting.value}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              プロンプト <span class="text-red-500">*</span>
            </label>
            <textarea
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm resize-none"
              rows={6}
              placeholder="AIに渡すプロンプトを入力"
              value={formPrompt.value}
              onInput={(e) => (formPrompt.value = (e.target as HTMLTextAreaElement).value)}
              disabled={submitting.value}
            />
          </div>

          <div class="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting.value}
              class="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {submitting.value ? "保存中..." : editingId.value ? "更新" : "作成"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              class="text-sm text-gray-500 hover:text-gray-700"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

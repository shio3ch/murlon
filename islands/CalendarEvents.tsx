import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface CalendarEventItem {
  id: string;
  summary: string;
  startTime: string | null;
  isAllDay: boolean;
  displayText: string;
}

export default function CalendarEvents() {
  const events = useSignal<CalendarEventItem[]>([]);
  const loading = useSignal(true);
  const connected = useSignal(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);

    fetch(`/api/calendar/events?date=${today}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          events.value = json.data;
        } else {
          // 未連携や認証エラーの場合はサイレントに非表示
          connected.value = false;
        }
      })
      .catch(() => {
        connected.value = false;
      })
      .finally(() => {
        loading.value = false;
      });
  }, []);

  // 未連携・エラー時は何も表示しない
  if (!connected.value) return null;

  // ローディング中
  if (loading.value) {
    return (
      <div class="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4">
        <div class="flex items-center gap-2 text-blue-600 text-sm">
          <svg
            class="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>カレンダーを読み込み中...</span>
        </div>
      </div>
    );
  }

  // イベントがない場合
  if (events.value.length === 0) {
    return (
      <div class="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4">
        <p class="text-blue-600 text-sm">今日の予定はありません</p>
      </div>
    );
  }

  return (
    <div class="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4">
      <div class="flex items-center gap-2 mb-2">
        <svg
          class="h-4 w-4 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span class="text-blue-700 text-sm font-medium">今日の予定</span>
      </div>
      <ul class="space-y-1">
        {events.value.map((event) => (
          <li key={event.id} class="text-sm text-blue-800">
            {event.displayText}
          </li>
        ))}
      </ul>
    </div>
  );
}

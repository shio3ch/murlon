import { useSignal } from "@preact/signals";

export default function GoogleCalendarDisconnect() {
  const disconnecting = useSignal(false);

  async function handleDisconnect() {
    if (!confirm("Google Calendar連携を解除しますか？")) return;

    disconnecting.value = true;
    try {
      const res = await fetch("/api/calendar/disconnect", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        location.reload();
      }
    } catch {
      // サイレント
    } finally {
      disconnecting.value = false;
    }
  }

  return (
    <button
      type="button"
      class="text-sm text-red-600 hover:text-red-700 font-medium border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors disabled:opacity-50"
      onClick={handleDisconnect}
      disabled={disconnecting.value}
    >
      {disconnecting.value ? "解除中..." : "連携を解除する"}
    </button>
  );
}

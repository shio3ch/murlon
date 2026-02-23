import { useEffect, useState } from "preact/hooks";

const DISMISS_KEY = "murlon_pwa_dismissed";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    globalThis.addEventListener("beforeinstallprompt", handler);
    return () => globalThis.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    // deno-lint-ignore no-explicit-any
    (deferredPrompt as any).prompt();
    // deno-lint-ignore no-explicit-any
    await (deferredPrompt as any).userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex items-center gap-3 z-50">
      <div class="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
        <span class="text-indigo-600 font-bold text-lg">M</span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-900">ホーム画面に追加</p>
        <p class="text-xs text-gray-500">murlonをアプリとして使えます</p>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        class="flex-shrink-0 bg-indigo-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-700"
      >
        追加
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        class="flex-shrink-0 text-gray-400 hover:text-gray-600"
        aria-label="閉じる"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";

interface MobileMenuProps {
  user: { name: string; email: string; avatarUrl?: string | null };
}

export default function MobileMenu({ user }: MobileMenuProps) {
  const isOpen = useSignal(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initial = user.name.charAt(0).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        isOpen.value = false;
      }
    };
    if (isOpen.value) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen.value]);

  const navLinks = [
    { href: "/dashboard", label: "ダッシュボード" },
    { href: "/projects", label: "プロジェクト" },
    { href: "/reports/daily", label: "日報" },
    { href: "/reports/weekly", label: "週報" },
    { href: "/reports/monthly", label: "月報" },
    { href: "/insights", label: "インサイト" },
    { href: "/standup", label: "スタンドアップ" },
    { href: "/settings", label: "設定" },
  ];

  return (
    <div class="md:hidden" ref={menuRef}>
      <button
        type="button"
        onClick={() => (isOpen.value = !isOpen.value)}
        class="p-2 text-gray-600 hover:text-brand-600 focus:outline-none"
        aria-label="メニューを開く"
      >
        {isOpen.value
          ? <span class="text-2xl leading-none">&times;</span>
          : <span class="text-2xl leading-none">&#9776;</span>}
      </button>

      {isOpen.value && (
        <>
          <div class="fixed inset-0 bg-black/30 z-40" />
          <div class="fixed top-0 right-0 w-72 h-full bg-white shadow-xl z-50 flex flex-col">
            <div class="flex items-center justify-between px-4 py-4 border-b border-gray-200">
              <span class="text-lg font-bold text-brand-600">murlon</span>
              <button
                type="button"
                onClick={() => (isOpen.value = false)}
                class="p-2 text-gray-600 hover:text-brand-600"
                aria-label="メニューを閉じる"
              >
                <span class="text-2xl leading-none">&times;</span>
              </button>
            </div>

            <div class="px-4 py-3 border-b border-gray-100">
              <a
                href="/settings/profile"
                class="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                {user.avatarUrl
                  ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      class="w-10 h-10 rounded-full object-cover"
                    />
                  )
                  : (
                    <span class="w-10 h-10 rounded-full bg-brand-100 text-brand-700 text-sm font-semibold flex items-center justify-center">
                      {initial}
                    </span>
                  )}
                <div>
                  <div class="text-sm font-medium text-gray-900">{user.name}</div>
                  <div class="text-xs text-gray-500">{user.email}</div>
                </div>
              </a>
            </div>

            <nav class="flex-1 overflow-y-auto py-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  class="block px-4 py-3 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 font-medium"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div class="px-4 py-3 border-t border-gray-200">
              <form method="POST" action="/auth/logout">
                <button
                  type="submit"
                  class="w-full text-left text-sm text-gray-600 hover:text-red-600 font-medium py-2"
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

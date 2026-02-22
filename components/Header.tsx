interface HeaderProps {
  user: { name: string; email: string };
}

export default function Header({ user }: HeaderProps) {
  return (
    <header class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2">
          <span class="text-2xl font-bold text-brand-600">murlon</span>
          <span class="hidden sm:inline text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
            beta
          </span>
        </a>

        <nav class="flex items-center gap-4">
          <a
            href="/"
            class="text-sm text-gray-600 hover:text-brand-600 font-medium"
          >
            分報
          </a>
          <a
            href="/reports/daily"
            class="text-sm text-gray-600 hover:text-brand-600 font-medium"
          >
            日報
          </a>
          <a
            href="/reports/weekly"
            class="text-sm text-gray-600 hover:text-brand-600 font-medium"
          >
            週報
          </a>
          <a
            href="/reports/monthly"
            class="text-sm text-gray-600 hover:text-brand-600 font-medium"
          >
            月報
          </a>

          <div class="flex items-center gap-3 ml-2 pl-2 border-l border-gray-200">
            <span class="text-sm text-gray-500 hidden sm:inline">{user.name}</span>
            <form method="POST" action="/auth/logout">
              <button
                type="submit"
                class="text-sm text-gray-600 hover:text-red-600 font-medium"
              >
                ログアウト
              </button>
            </form>
          </div>
        </nav>
      </div>
    </header>
  );
}

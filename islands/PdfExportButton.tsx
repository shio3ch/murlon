interface PdfExportButtonProps {
  title?: string;
}

export default function PdfExportButton({ title }: PdfExportButtonProps) {
  function handlePrint() {
    const originalTitle = document.title;
    if (title) {
      document.title = title;
    }
    globalThis.print();
    if (title) {
      document.title = originalTitle;
    }
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors print-hidden"
    >
      <svg
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
        />
      </svg>
      PDF出力
    </button>
  );
}

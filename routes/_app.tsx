import { type PageProps } from "$fresh/server.ts";
import PwaInstallPrompt from "../islands/PwaInstallPrompt.tsx";

export default function App({ Component }: PageProps) {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#8b4f1f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="murlon" />
        <title>murlon - 書くだけで日報が完成する</title>
        <link rel="manifest" href="/manifest.json" />
        <link rel="stylesheet" href="/styles.css" />
        <link rel="stylesheet" href="/print.css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <script src="/sw-register.js" defer />
      </head>
      <body class="bg-amber-50/30 font-sans text-gray-900 min-h-screen">
        <div class="falling-leaves" aria-hidden="true" />
        <Component />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}

import { type PageProps } from "$fresh/server.ts";

export default function App({ Component }: PageProps) {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>murlon - 書くだけで日報が完成する</title>
        <link rel="stylesheet" href="/styles.css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body class="bg-gray-50 font-sans text-gray-900 min-h-screen">
        <Component />
      </body>
    </html>
  );
}

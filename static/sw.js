const CACHE_NAME = "murlon-v1";
const STATIC_ASSETS = [
  "/styles.css",
  "/icons/icon.svg",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      )
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // APIリクエストはキャッシュしない
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // 静的アセットはStale-While-Revalidate
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".svg")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchedPromise = fetch(event.request).then((response) => {
          if (!response || !response.ok) {
            return response;
          }
          const clone = response.clone();
          return caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone))
            .then(() => response);
        });
        event.waitUntil(
          fetchedPromise.catch(() => {
            // バックグラウンド更新失敗時は無視（レスポンスはキャッシュから提供済み）
          }),
        );
        return cached || fetchedPromise;
      }),
    );
    return;
  }

  // その他はNetwork First
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cached) => {
        return cached || caches.match("/offline.html");
      });
    }),
  );
});

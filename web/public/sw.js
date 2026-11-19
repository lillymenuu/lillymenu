/*
 * Service worker do LillyMenu — so Web Push (notificacao de pedido novo no Gestor de pedidos).
 * Nao intercepta requisicoes (sem cache offline). Payload enviado por src/lib/webPush.ts:
 * { titulo, corpo, url, tag }.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { corpo: event.data ? event.data.text() : "" };
  }

  const titulo = dados.titulo || "LillyMenu";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.corpo || "",
      tag: dados.tag || undefined,
      renotify: Boolean(dados.tag),
      icon: "/favicon_store.png",
      badge: "/favicon_store.png",
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      data: { url: dados.url || "/ordermanager" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || "/ordermanager", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      /* Reaproveita uma janela do painel ja aberta (no iPhone, o proprio app da Tela de Inicio). */
      for (const janela of janelas) {
        if (new URL(janela.url).origin === self.location.origin && "focus" in janela) {
          await janela.focus();
          if ("navigate" in janela) {
            try {
              await janela.navigate(destino);
            } catch {
              /* janela nao controlada por este SW: so foca */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(destino);
    })()
  );
});

// Service worker de «Mi rutina».
// - La app (HTML, íconos) se guarda en el teléfono para abrir sin señal.
// - Siempre intenta traer la versión nueva primero; si no hay red, usa la guardada.
// - Las llamadas a Supabase (datos del socio) nunca se guardan aquí.
// Al publicar cambios grandes, sube el número de VERSION.
const VERSION = "mi-rutina-v2";
const APP = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;                       // RPC de Supabase: directo a la red
  const url = new URL(req.url);

  // Archivos de la propia app: red primero, copia guardada si no hay señal
  if(url.origin === location.origin){
    e.respondWith(
      fetch(req).then(res => {
        if(res.ok){ const copia = res.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("index.html")))
    );
    return;
  }

  // Tipografías y librería del QR: lo guardado primero
  if(/fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(url.hostname)){
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(res => {
        if(res.ok || res.type === "opaque"){ const copia = res.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
        return res;
      }))
    );
  }
});

/* Service worker minimal : rend le site installable. Aucun cache : les mises à jour arrivent toujours tout de suite. */
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",()=>{});

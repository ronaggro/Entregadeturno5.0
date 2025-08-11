const CACHE_NAME='entrega-turno-v8';
const ASSETS=[
  './','./index.html','./style.css','./script.js','./manifest.json',
  './images/icon-180.png','./images/icon-192.png','./images/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.13/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE_NAME);await c.addAll(ASSETS);self.skipWaiting();})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const ks=await caches.keys();await Promise.all(ks.map(k=>k!==CACHE_NAME?caches.delete(k):null));self.clients.claim();})())});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.mode==='navigate'){
    e.respondWith((async()=>{try{return await fetch(req)}catch(e){const c=await caches.open(CACHE_NAME);return (await c.match('./index.html')) || new Response('Offline',{status:503})}})());
    return;
  }
  e.respondWith((async()=>{
    const c=await caches.open(CACHE_NAME);
    const cached=await c.match(req);
    const net=fetch(req).then(res=>{try{c.put(req,res.clone())}catch(e){};return res}).catch(()=>cached);
    return cached||net;
  })());
});
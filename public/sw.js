// public/sw.js - Service Worker Pedagógico do Redação IA
// Armazena em cache apenas a casca estática (HTML, CSS, JS, ícones).
// NUNCA armazena dados de estudantes, fotos, avaliações, tokens ou chamadas de IA.

const CACHE_NAME = 'redacao-ia-v1';

const STATIC_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL_ASSETS);
    })
  );
  // Não forçamos ativação abrupta (skipWaiting) para não resetar correções em digitação
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. NUNCA ARMAZENAR EM CACHE (segurança, privacidade e integridade pedagógica):
  // - Requisições que não sejam GET (ex: salvamento de correção, login, cadastro)
  // - Chamadas à API da IA Gemini (/api/ai)
  // - Conexões ao banco de dados Supabase
  // - Headers com autorização ou sessões ativas
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/auth/') ||
    request.headers.get('authorization')
  ) {
    // Permite que a requisição passe exclusivamente pela rede
    return;
  }

  // 2. Requisições de Navegação (HTML principal): Network-First com fallback de casca
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // 3. Recursos estáticos da aplicação (/assets/, ícones, fontes): Cache com revalidação
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Revalida em segundo plano
          fetch(request).then((netRes) => {
            if (netRes && netRes.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, netRes));
            }
          }).catch(() => {});
          return cached;
        }

        return fetch(request).then((netRes) => {
          if (netRes && netRes.status === 200) {
            const clone = netRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return netRes;
        });
      })
    );
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('PWA Manifest: valid schema, required fields, and theme colors', () => {
  const manifestPath = path.resolve(process.cwd(), 'public/manifest.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest deve existir em public/');

  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);

  assert.equal(manifest.name, 'Redação IA | Adriana Aguiar');
  assert.equal(manifest.short_name, 'Redação IA');
  assert.equal(manifest.description, 'Aplicativo de apoio à correção de redações, criado pela professora Adriana Aguiar.');
  assert.equal(manifest.theme_color, '#7C3AED');
  assert.equal(manifest.background_color, '#FFFFFF');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');

  assert.ok(Array.isArray(manifest.icons), 'manifest deve conter array de ícones');
  assert.ok(manifest.icons.length >= 4, 'deve ter pelo menos 4 configurações de ícones');

  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192'), 'deve conter ícone 192x192');
  assert.ok(sizes.includes('512x512'), 'deve conter ícone 512x512');

  const purposes = manifest.icons.map((i) => i.purpose);
  assert.ok(purposes.includes('maskable'), 'deve conter versão maskable com margem de segurança');
});

test('PWA Icons: all icon files exist on disk with valid file sizes', () => {
  const icons = [
    'public/icons/icon-192.png',
    'public/icons/icon-512.png',
    'public/icons/icon-maskable-192.png',
    'public/icons/icon-maskable-512.png',
    'public/icons/apple-touch-icon.png',
    'public/favicon.ico',
    'public/favicon.svg',
    'public/favicon-32x32.png',
    'public/favicon-16x16.png'
  ];

  for (const relPath of icons) {
    const fullPath = path.resolve(process.cwd(), relPath);
    assert.ok(fs.existsSync(fullPath), `Ícone deve existir: ${relPath}`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 100, `Arquivo de ícone não deve estar vazio: ${relPath}`);
  }
});

test('Service Worker: exists and strictly excludes student data, AI calls and Supabase', () => {
  const swPath = path.resolve(process.cwd(), 'public/sw.js');
  assert.ok(fs.existsSync(swPath), 'public/sw.js deve existir');

  const code = fs.readFileSync(swPath, 'utf8');

  // Verifica que não faz cache de API de IA nem Supabase
  assert.ok(code.includes('/api/'), 'SW deve verificar rotas /api/');
  assert.ok(code.includes('supabase.co'), 'SW deve verificar rotas do Supabase');
  assert.ok(code.includes('request.method !== \'GET\''), 'SW deve ignorar requisições que alteram dados (POST, PUT, DELETE)');

  // Verifica que não há skipWaiting forçado cego que recarregue a página durante uma correção
  assert.ok(!code.includes('self.skipWaiting()'), 'SW não deve forçar skipWaiting() arbitrário que quebre correção ativa');
});

test('index.html: links manifest, favicon, apple touch icon and theme-color', () => {
  const htmlPath = path.resolve(process.cwd(), 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(html.includes('manifest.webmanifest'), 'index.html deve conter link para manifest.webmanifest');
  assert.ok(html.includes('theme-color'), 'index.html deve conter meta theme-color');
  assert.ok(html.includes('#7C3AED'), 'index.html deve configurar theme-color #7C3AED');
  assert.ok(html.includes('apple-touch-icon'), 'index.html deve conter link para apple-touch-icon');
  assert.ok(html.includes('favicon.svg'), 'index.html deve conter link para favicon.svg');
});

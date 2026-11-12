// Alla sidor för sökmotorer (NF-04, #27). Byggs från samma käpp-mappar som galleriet.
import type { APIRoute } from 'astro';
import { GALLERIBILDER, allaKappar } from '../lib/kappa';

export const GET: APIRoute = async ({ site }) => {
  const svenska = ['/', '/om/', '/kontakt/', '/bestallning/', ...(await allaKappar()).map((k) => `/kappar/${k.id}/`), ...GALLERIBILDER.map((b) => `/galleri/${b.id}/`)];
  // Engelska sidor (F-63): samma sidor under /en/.
  const sidor = [...svenska, ...svenska.map((s) => `/en${s}`)];
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sidor.map((s) => `  <url><loc>${new URL(s, site).href}</loc></url>`).join('\n') +
    '\n</urlset>\n';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

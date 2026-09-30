// Alla sidor för sökmotorer (NF-04, #27). Byggs från samma käpp-mappar som galleriet.
import type { APIRoute } from 'astro';
import { allaKappar } from '../lib/kappa';

export const GET: APIRoute = async ({ site }) => {
  const sidor = ['/', ...(await allaKappar()).map((k) => `/kappar/${k.id}/`)];
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sidor.map((s) => `  <url><loc>${new URL(s, site).href}</loc></url>`).join('\n') +
    '\n</urlset>\n';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

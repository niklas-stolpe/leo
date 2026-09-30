// Prod får indexeras och pekar ut sitemapen; stage ska aldrig synas på Google (F-32, NF-04).
import type { APIRoute } from 'astro';
import { arProd } from '../lib/miljo';

export const GET: APIRoute = ({ site }) =>
  new Response(
    arProd
      ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`
      : 'User-agent: *\nDisallow: /\n',
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );

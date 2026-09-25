// Gör att sidan kan läggas till på hemskärmen med eget namn och egen ikon (F-31, F-32).
import type { APIRoute } from 'astro';
import { appNamn, arProd, ikon, temafarg } from '../lib/miljo';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: arProd ? 'Leo – käppar' : 'Leo – käppar (stage)',
      short_name: appNamn,
      start_url: '/',
      display: 'standalone',
      background_color: temafarg,
      theme_color: temafarg,
      icons: [
        { src: ikon(192), sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: ikon(512), sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    }),
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );

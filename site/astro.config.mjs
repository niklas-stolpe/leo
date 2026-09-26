import { defineConfig } from 'astro/config';

// Statisk sida (B-02). `site` ger absoluta adresser till delningsbilder (og:image) och följer
// samma PUBLIC_MILJO som src/lib/miljo.ts: prod bara när main publiceras (Workers Builds deploy command), annars stage.
// Byt prod-adressen till den egna domänen när den är bestämd (Q-02).
const arProd = process.env.PUBLIC_MILJO === 'prod';

export default defineConfig({
  site: arProd ? 'https://leo.niklasstolpe.workers.dev' : 'https://stage-leo.niklasstolpe.workers.dev',
});

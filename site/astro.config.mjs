import { defineConfig } from 'astro/config';

// Statisk sida (B-02). `site` ger absoluta adresser till delningsbilder (og:image) och följer
// samma PUBLIC_MILJO som src/lib/miljo.ts: prod (main-bygget), demo (leo-demo) eller stage.
// Byt prod-adressen till den egna domänen när den är bestämd (Q-02).
const ADRESS = {
  prod: 'https://leo.niklasstolpe.workers.dev',
  demo: 'https://leo-demo.niklasstolpe.workers.dev',
  stage: 'https://stage-leo.niklasstolpe.workers.dev',
};

export default defineConfig({
  site: ADRESS[process.env.PUBLIC_MILJO] ?? ADRESS.stage,
});

// @ts-check
import { defineConfig } from 'astro/config';

// Statisk sida (B-02). `site` ger absoluta adresser till delningsbilder (og:image) –
// byt till den egna domänen när den är bestämd (Q-02). Förhandsvisningar pekar också hit.
export default defineConfig({
  site: 'https://leo.niklasstolpe.workers.dev',
});

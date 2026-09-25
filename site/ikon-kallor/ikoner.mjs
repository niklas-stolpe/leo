// Ritar hemskärmsikonerna från prod.svg och stage.svg till public/ikoner/ (F-31, F-32).
// Körs för hand när ikonerna ändras – PNG-filerna committas:  cd site && node ikon-kallor/ikoner.mjs
import sharp from 'sharp';
import { copyFile } from 'node:fs/promises';

const ut = new URL('../public/ikoner/', import.meta.url);
for (const miljo of ['prod', 'stage']) {
  const kalla = new URL(`${miljo}.svg`, import.meta.url);
  for (const storlek of [180, 192, 512]) {
    await sharp(kalla.pathname.replace(/^\/([A-Za-z]:)/, '$1'), { density: 300 })
      .resize(storlek, storlek)
      .png({ compressionLevel: 9 })
      .toFile(new URL(`${miljo}-${storlek}.png`, ut).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  }
  await copyFile(kalla, new URL(`${miljo}.svg`, ut));
  console.log(`${miljo}: 180, 192, 512 + svg`);
}

// En käpp = en mapp i src/content/kappar/<namn>/ med index.md och bilderna bredvid (F-10, B-05).
// Texten under frontmattern i index.md är käppens berättelse – visas på käppens sida.
// Hitta inte på fakta: saknas titel, år, material eller status lämnas fälten bort.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const kappar = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/kappar' }),
  schema: ({ image }) =>
    z.object({
      // Löpnummer i samlingen – visas som romersk siffra (Nº XII) och styr ordningen.
      nummer: z.number().int().positive(),
      titel: z.string().optional(),
      ar: z.number().int().optional(),
      material: z.array(z.string()).default([]),
      status: z.enum(['tillgänglig', 'såld', 'beställningsverk']).optional(),
      bilder: z.array(image()).min(1),
      // Beskriver huvudbilden för den som inte ser den (NF-02).
      alt: z.string().min(10),
    }),
});

export const collections = { kappar };

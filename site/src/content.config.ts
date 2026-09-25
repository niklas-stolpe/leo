// En käpp = en mapp i src/content/kappar/<namn>/ med index.md och bilderna bredvid (F-10, B-05).
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const kappar = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/kappar' }),
  schema: ({ image }) =>
    z.object({
      titel: z.string(),
      ar: z.number().int().optional(),
      material: z.array(z.string()).default([]),
      status: z.enum(['tillgänglig', 'såld', 'beställningsverk']),
      bilder: z.array(image()).min(1),
      ordning: z.number().default(0),
    }),
});

export const collections = { kappar };

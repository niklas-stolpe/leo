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
      // Löpnummer i samlingen – visas som Nº 12 och styr ordningen.
      nummer: z.number().int().positive(),
      // Grupp i samlingen efter handtagets form (#41) – Claudes förslag, Leo kan ändra.
      grupp: z.enum(['dam', 'herr', 'ovriga']),
      titel: z.string().optional(),
      ar: z.number().int().optional(),
      // Material per del (#41): "Handtag och skaft" – masurbjörk (Betula pendula var. carelica).
      material: z
        .array(z.object({ del: z.string(), namn: z.string(), latin: z.string().optional() }))
        .default([]),
      // Mått, t.ex. "92 cm" – bara det Leo har angett.
      langd: z.string().optional(),
      // privat = inte till salu (Leos egen eller en gåva).
      status: z.enum(['tillgänglig', 'såld', 'beställningsverk', 'privat']).optional(),
      bilder: z.array(image()).min(1),
      // Beskriver huvudbilden för den som inte ser den (NF-02).
      alt: z.string().min(10),
      // Beskrivning av bild 2, 3 … i samma ordning som `bilder` (NF-02).
      bildtexter: z.array(z.string().min(10)).default([]),
    }),
});

export const collections = { kappar };

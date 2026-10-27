import { getCollection, type CollectionEntry } from 'astro:content';

export type Kappa = CollectionEntry<'kappar'>;

/** "Nº 12" – eller käppens egen titel om Leo gett den en. */
export function rubrik(k: Kappa): string {
  return k.data.titel ?? `Nº ${k.data.nummer}`;
}

export async function allaKappar(): Promise<Kappa[]> {
  return (await getCollection('kappar')).sort((a, b) => a.data.nummer - b.data.nummer);
}

/** Samlingens grupper i den ordning de visas (#41). Indelningen är ett förslag – Leo bestämmer. */
export const GRUPPER = [
  { id: 'dam', namn: 'small/medium', text: '' },
  { id: 'herr', namn: 'medium/large', text: '' },
  { id: 'masurbjork', namn: 'Masurbjörk', text: 'Käppar i masurbjörk.' },
  { id: 'galleri', namn: 'Galleri', text: 'Käppar ur Leos verkstad.' },
] as const;

export function kapparIGrupper(kappar: Kappa[]) {
  return GRUPPER.map((g) => ({ ...g, kappar: kappar.filter((k) => k.data.grupp === g.id || k.data.ocksaGrupp.includes(g.id)) })).filter((g) => g.kappar.length > 0);
}

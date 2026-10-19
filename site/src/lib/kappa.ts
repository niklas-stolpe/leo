import { getCollection, type CollectionEntry } from 'astro:content';

export type Kappa = CollectionEntry<'kappar'>;

const ROMERSKA: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function romersk(n: number): string {
  let ut = '';
  for (const [varde, tecken] of ROMERSKA) {
    while (n >= varde) {
      ut += tecken;
      n -= varde;
    }
  }
  return ut;
}

/** "Nº XII" – eller käppens egen titel om Leo gett den en. */
export function rubrik(k: Kappa): string {
  return k.data.titel ?? `Nº ${romersk(k.data.nummer)}`;
}

export async function allaKappar(): Promise<Kappa[]> {
  return (await getCollection('kappar')).sort((a, b) => a.data.nummer - b.data.nummer);
}

/** Samlingens grupper i den ordning de visas (#41). Indelningen är ett förslag – Leo bestämmer. */
export const GRUPPER = [
  { id: 'krok', namn: 'Krokhandtag', text: 'Den klassiska kroken – att hänga på armen eller bordskanten.' },
  { id: 'skulpterad', namn: 'Skulpterade handtag', text: 'Fria former, där träets egen linje får bestämma.' },
  { id: 't-handtag', namn: 'T-handtag', text: 'Handtaget som vilar i handflatan och bär vid varje steg.' },
] as const;

export function kapparIGrupper(kappar: Kappa[]) {
  return GRUPPER.map((g) => ({ ...g, kappar: kappar.filter((k) => k.data.grupp === g.id) })).filter((g) => g.kappar.length > 0);
}

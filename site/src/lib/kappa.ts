import { getCollection, type CollectionEntry } from 'astro:content';
import vaggMedKappar from '../assets/galleri/vagg-med-kappar.jpg';
import kappstall from '../assets/galleri/kappstall.jpg';

/** Bilder i Galleriet utan käppnummer (F-71, F-77): var och en har egen sida under /galleri/<id>/. */
export const GALLERIBILDER = [
  {
    id: 'vagg-med-kappar',
    titel: { sv: 'Käppar på väggen', en: 'Canes on the wall' },
    passning: 'cover',
    src: vaggMedKappar,
    alt: {
      sv: 'Många käppar med handtag i ljust och mörkare trä hänger på rad på en mörk vägg.',
      en: 'Many canes with handles in light and darker wood hang in a row on a dark wall.',
    },
  },
  {
    id: 'kappstall',
    titel: { sv: 'Käppstället', en: 'The cane stand' },
    // Stående bild: hela ställer ska synas mitt i den lilla rutan i Galleriet (F-78).
    passning: 'contain',
    src: kappstall,
    alt: {
      sv: 'Ett ställ i trä med sex käppar i olika träslag mot en svart tygbakgrund.',
      en: 'A wooden stand holding six canes in different woods against a black cloth backdrop.',
    },
  },
];

export type Kappa = CollectionEntry<'kappar'>;
export type KappaEn = CollectionEntry<'kapparEn'>;

/** Käppens engelska text (en.md) per käpp-id, om den finns (F-65). */
export async function engelska(): Promise<Map<string, KappaEn>> {
  const alla = await getCollection('kapparEn');
  return new Map(alla.map((e) => [e.id.replace(/\/en$/, '').replace(/\/index$/, ''), e]));
}

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
  { id: 'galleri', namn: 'Galleri', text: '' },
] as const;

export function kapparIGrupper(kappar: Kappa[]) {
  return GRUPPER.map((g) => ({ ...g, kappar: kappar.filter((k) => k.data.grupp === g.id || k.data.ocksaGrupp.includes(g.id)) })).filter((g) => g.kappar.length > 0);
}

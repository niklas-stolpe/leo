// Prod, demo eller stage (F-32, #37). PUBLIC_MILJO sätts av den som bygger:
//   prod  – main-bygget i Cloudflare Workers Builds (en version; prod byts bara när den väljs, B-06)
//   demo  – version-release.sh, versionen i demo-utförande för Workern leo-demo (visas för andra)
//   stage – allt annat: branch-pushar och lokal utveckling
// Bara prod får indexeras och bära prod-ikonen.
type Miljo = 'prod' | 'demo' | 'stage';
const satt = import.meta.env.PUBLIC_MILJO;
export const miljo: Miljo = satt === 'prod' || satt === 'demo' ? satt : 'stage';
export const arProd = miljo === 'prod';

export const appNamn = { prod: 'Leo', demo: 'Leo demo', stage: 'Leo stage' }[miljo];
export const temafarg = { prod: '#0e0d0b', demo: '#17150f', stage: '#ece4d4' }[miljo];
export const ikon = (storlek: 180 | 192 | 512) => `/ikoner/${miljo}-${storlek}.png`;
export const favicon = `/ikoner/${miljo}.svg`;

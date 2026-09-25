// Stage eller prod (F-32). deploy.yml sätter PUBLIC_MILJO=prod bara när main byggs för publicering;
// allt annat – förhandsvisningar och lokal utveckling – räknas som stage, så att prod-ikonen aldrig
// hamnar på något annat än den riktiga sidan.
export const arProd = import.meta.env.PUBLIC_MILJO === 'prod';
export const miljo = arProd ? 'prod' : 'stage';

export const appNamn = arProd ? 'Leo' : 'Leo stage';
export const temafarg = arProd ? '#0e0d0b' : '#ece4d4';
export const ikon = (storlek: 180 | 192 | 512) => `/ikoner/${miljo}-${storlek}.png`;
export const favicon = `/ikoner/${miljo}.svg`;

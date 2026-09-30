// Versionssidan (F-40, F-41, F-43, F-45) – https://leo-versioner.niklasstolpe.workers.dev
//
// Alla kan titta på versionerna. Publicera på prod eller demo kräver inloggning med Google, och bara
// adresserna i TILLATNA släpps igenom (B-06: valet av version är godkännandet). Publiceringen sker
// direkt hos Cloudflare: en ny deployment av Workern leo (prod) eller leo-demo (demo) med exakt den
// version som redan finns – inget nytt bygge, sekunder.
//
// Konfiguration (versioner/wrangler.jsonc): vars ACCOUNT_ID, GOOGLE_CLIENT_ID, TILLATNA.
// Secrets (sätts av Admin, se docs/processmall.md): GOOGLE_CLIENT_SECRET, SESSION_SECRET, CF_API_TOKEN.

const WORKER = { prod: 'leo', demo: 'leo-demo' };
const ADRESS = {
  prod: 'https://leo.niklasstolpe.workers.dev',
  demo: 'https://leo-demo.niklasstolpe.workers.dev',
};
const versionsUrl = (id, dit = 'prod') => `https://${id.slice(0, 8)}-${WORKER[dit]}.niklasstolpe.workers.dev`;
const SESSION_TIMMAR = 24 * 30;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname === '/auth/login') return login(url, env);
      if (url.pathname === '/auth/callback') return await callback(req, url, env);
      if (url.pathname === '/auth/logout') return logout();
      if (url.pathname === '/publicera' && req.method === 'POST') return await publicera(req, url, env);
      if (url.pathname === '/') return await sida(req, url, env);
      return env.ASSETS.fetch(req);
    } catch (e) {
      return new Response(`Något gick fel: ${e.message}`, { status: 500 });
    }
  },
};

// ---------- inloggning (Google OpenID Connect, authorization code) ----------

function login(url, env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return meddelande('Inloggningen är inte uppsatt än.');
  const state = slump();
  const g = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  g.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${url.origin}/auth/callback`,
    response_type: 'code',
    scope: 'openid email',
    state,
    prompt: 'select_account',
  });
  return new Response(null, {
    status: 302,
    headers: { Location: g.href, 'Set-Cookie': kaka('oauth_state', state, 600) },
  });
}

async function callback(req, url, env) {
  const state = cookies(req).oauth_state;
  if (!state || state !== url.searchParams.get('state')) return meddelande('Inloggningen gick ut – försök igen.');
  const svar = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: url.searchParams.get('code') ?? '',
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/auth/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!svar.ok) return meddelande('Google godtog inte inloggningen – försök igen.');
  // id_token kommer direkt från Google över TLS i utbytet ovan (inte via webbläsaren), så innehållet
  // kan läsas utan att signaturen kontrolleras (OpenID Connect Core 3.1.3.7). aud och e-post kontrolleras.
  const { id_token } = await svar.json();
  const p = JSON.parse(b64urlText(id_token.split('.')[1]));
  if (p.aud !== env.GOOGLE_CLIENT_ID || !p.email_verified) return meddelande('Inloggningen kunde inte bekräftas.');
  if (!tillaten(p.email, env)) return meddelande(`${p.email} har inte behörighet att publicera. Du kan fortfarande titta på versionerna.`);
  const utgar = Date.now() + SESSION_TIMMAR * 3600e3;
  const varde = `${p.email}|${utgar}`;
  return new Response(null, {
    status: 302,
    headers: [
      ['Location', '/'],
      ['Set-Cookie', kaka('session', `${b64url(varde)}.${await hmac(varde, env.SESSION_SECRET)}`, SESSION_TIMMAR * 3600)],
      ['Set-Cookie', kaka('oauth_state', '', 0)],
    ],
  });
}

function logout() {
  return new Response(null, { status: 302, headers: { Location: '/', 'Set-Cookie': kaka('session', '', 0) } });
}

/** Inloggad och tillåten e-postadress, annars null. */
async function inloggad(req, env) {
  const s = cookies(req).session;
  if (!s || !env.SESSION_SECRET) return null;
  const [b, sig] = s.split('.');
  const varde = b64urlText(b);
  if (!sig || sig !== (await hmac(varde, env.SESSION_SECRET))) return null;
  const [email, utgar] = varde.split('|');
  return Number(utgar) > Date.now() && tillaten(email, env) ? email : null;
}

// Gmail bryr sig inte om punkter eller versaler i adressens första del.
const normal = (e) => {
  const [namn, doman = ''] = e.trim().toLowerCase().split('@');
  return `${doman === 'gmail.com' || doman === 'googlemail.com' ? namn.replaceAll('.', '') : namn}@${doman.replace('googlemail.com', 'gmail.com')}`;
};
const tillaten = (email, env) => (env.TILLATNA ?? '').split(',').map(normal).includes(normal(email));

// ---------- publicera ----------

async function publicera(req, url, env) {
  if (req.headers.get('Origin') !== url.origin) return meddelande('Fel ursprung – publicera från versionssidan.', 403);
  const email = await inloggad(req, env);
  if (!email) return meddelande('Logga in med Google för att publicera.', 401);
  const form = await req.formData();
  const nr = Number(form.get('nr'));
  const dit = form.get('dit') === 'demo' ? 'demo' : 'prod';
  const v = (await data(req, env)).find((x) => x.nr === nr);
  const id = v && (dit === 'prod' ? v.prod[0] : v.demo);
  if (!id) return meddelande(`Version ${nr} finns inte för ${dit} – be Claude bygga den.`, 404);
  const svar = await cf(env, `/workers/scripts/${WORKER[dit]}/deployments`, {
    method: 'POST',
    body: JSON.stringify({
      strategy: 'percentage',
      versions: [{ version_id: id, percentage: 100 }],
      annotations: { 'workers/message': `Version ${nr} – ${email} via versionssidan` },
    }),
  });
  if (!svar.success) {
    return meddelande(`Cloudflare sa nej (${svar.errors?.map((e) => e.message).join(', ')}). Finns versionen kvar? Be Claude bygga om den.`, 502);
  }
  return new Response(null, { status: 303, headers: { Location: `/?klart=${dit}-${nr}` } });
}

async function cf(env, vag, init = {}) {
  if (!env.CF_API_TOKEN) return { success: false, errors: [{ message: 'CF_API_TOKEN saknas' }] };
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}${vag}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
  });
  return r.json();
}

/** Vilken version kör Workern just nu (den med störst andel), eller null. */
async function aktuell(env, dit) {
  const r = await cf(env, `/workers/scripts/${WORKER[dit]}/deployments`);
  const d = r.result?.deployments?.[0];
  return d?.versions?.sort((a, b) => b.percentage - a.percentage)[0]?.version_id ?? null;
}

async function data(req, env) {
  const r = await env.ASSETS.fetch(new URL('/versioner.json', req.url));
  return r.json();
}

// ---------- sidan ----------

async function sida(req, url, env) {
  const [versioner, email, prodId, demoId] = await Promise.all([
    data(req, env),
    inloggad(req, env),
    aktuell(env, 'prod'),
    aktuell(env, 'demo'),
  ]);
  for (const v of versioner) {
    v.paProd = v.prod.includes(prodId);
    v.paDemo = !!v.demo && v.demo === demoId;
  }
  const paProd = versioner.find((v) => v.paProd);
  const paDemo = versioner.find((v) => v.paDemo);
  const klart = url.searchParams.get('klart')?.match(/^(prod|demo)-(\d+)$/);
  const kvitto = klart
    ? `<p class="kvitto">✓ ${klart[1] === 'prod' ? 'Den riktiga sidan' : 'Demon'} visar nu version ${klart[2]}.</p>`
    : '';

  const knapp = (v, dit, text) =>
    email && (dit === 'prod' ? v.prod[0] : v.demo) && !(dit === 'prod' ? v.paProd : v.paDemo)
      ? `<form method="post" action="/publicera" onsubmit="return confirm('${text.replace('Publicera', 'Publicera version ' + v.nr)}?')">
           <input type="hidden" name="nr" value="${v.nr}" /><input type="hidden" name="dit" value="${dit}" />
           <button class="knapp stilla">${text}</button></form>`
      : '';

  const kort = versioner
    .map(
      (v, i) => `
    <li class="version${v.paProd ? ' prod' : ''}">
      <div class="huvud">
        <span class="nr">Version ${v.nr}</span>
        ${v.paProd ? '<span class="markning">På prod nu</span>' : ''}
        ${v.paDemo ? '<span class="markning demo">På demo nu</span>' : ''}
        ${i === 0 && !v.paProd ? '<span class="markning ny">Senaste</span>' : ''}
      </div>
      <h2>${esc(v.namn)}</h2>
      ${v.publicerad ? `<p class="datum">${esc(datum(v.publicerad))}</p>` : ''}
      <div class="text">${lista(v.beskrivning)}</div>
      <div class="knappar">
        ${v.prod.length ? `<a class="knapp" href="${versionsUrl(v.prod[0])}">Titta</a>` : ''}
        ${knapp(v, 'prod', 'Publicera på prod')}
        ${knapp(v, 'demo', 'Publicera på demo')}
      </div>
    </li>`,
    )
    .join('');

  const vem = email
    ? `<p class="vem">Inloggad som ${esc(email)} · <a href="/auth/logout">Logga ut</a></p>`
    : env.GOOGLE_CLIENT_ID
      ? `<p class="vem"><a class="knapp" href="/auth/login">Logga in med Google</a> <span>för att publicera</span></p>`
      : `<p class="vem">Inloggningen är inte uppsatt än.</p>`;

  return new Response(html(`
  <p class="overrad">Leo · käppar</p>
  <h1>Versioner</h1>
  ${vem}
  <nav class="adresser" aria-label="Adresser">
    <a href="${ADRESS.prod}">Riktiga sidan (prod)</a>
    <a href="${ADRESS.demo}">Demo</a>
  </nav>
  ${kvitto}
  <p class="ingress">${
    paProd ? `Den riktiga sidan visar version ${paProd.nr}${paDemo ? `, demon version ${paDemo.nr}` : ''}. ` : ''
  }Tryck Titta för att se en version precis som den är${email ? ' – och publicera den på demo eller den riktiga sidan när du vill.' : '.'}</p>
  ${versioner.length ? `<ol>${kort}</ol>` : '<p class="tom">Inga versioner än.</p>'}`), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}

function meddelande(text, status = 400) {
  return new Response(html(`<p class="overrad">Leo · käppar</p><h1>Versioner</h1><p class="ingress">${esc(text)}</p><p><a class="knapp" href="/">Tillbaka</a></p>`), {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const MANAD = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
const datum = (d) => {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} ${MANAD[Number(m[2]) - 1]} ${m[1]}` : d;
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
const lista = (rader) => {
  const punkter = rader.filter((l) => /^\s*[-*] /.test(l)).map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ''))}</li>`);
  const ovrigt = rader.filter((l) => !/^\s*[-*] /.test(l)).map((l) => `<p>${inline(l)}</p>`);
  return ovrigt.join('') + (punkter.length ? `<ul>${punkter.join('')}</ul>` : '');
};

const html = (innehall) => `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<meta name="theme-color" content="#17150f" />
<title>Leos versioner</title>
<style>
@font-face { font-family: 'Cormorant Garamond'; font-weight: 400; src: url(/typsnitt/400.woff2) format('woff2'); font-display: swap; }
@font-face { font-family: 'Cormorant Garamond'; font-weight: 400; font-style: italic; src: url(/typsnitt/400-italic.woff2) format('woff2'); font-display: swap; }
@font-face { font-family: 'Cormorant Garamond'; font-weight: 600; src: url(/typsnitt/600.woff2) format('woff2'); font-display: swap; }
:root { color-scheme: dark; --svart: #0e0d0b; --yta: #17150f; --elfenben: #ece4d4; --dampad: #a39985; --massing: #b8955a; --massing-ljus: #d4b27a; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--svart); color: var(--elfenben); font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.2rem; line-height: 1.55; }
main { max-width: 44rem; margin: 0 auto; padding: 3rem 1rem 4rem; }
.overrad { text-transform: uppercase; letter-spacing: 0.3em; font-size: 0.8rem; font-weight: 600; color: var(--massing); margin: 0 0 0.5rem; }
h1 { font-weight: 400; font-style: italic; font-size: clamp(3rem, 12vw, 4.5rem); line-height: 1; margin: 0 0 1rem; }
.vem { color: var(--dampad); margin: 0 0 1.5rem; font-size: 1rem; }
.vem a { color: var(--massing-ljus); }
.vem .knapp { color: var(--elfenben); margin-right: 0.5rem; }
.adresser { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 0 0 2rem; }
.adresser a { color: var(--dampad); text-decoration: none; border: 1px solid rgb(184 149 90 / 0.35); padding: 0.55rem 1rem; min-height: 44px; display: inline-flex; align-items: center; }
.adresser a:hover { color: var(--elfenben); border-color: var(--massing); }
.kvitto { border: 1px solid var(--massing); padding: 0.75rem 1rem; margin: 0 0 1.5rem; }
.ingress { color: var(--dampad); font-style: italic; margin: 0 0 2.5rem; }
ol { list-style: none; padding: 0; margin: 0; border-left: 1px solid rgb(184 149 90 / 0.35); }
.version { position: relative; padding: 0 0 2.5rem 1.75rem; }
.version::before { content: ''; position: absolute; left: -6px; top: 0.55rem; width: 11px; height: 11px; transform: rotate(45deg); background: var(--svart); border: 1px solid var(--massing); }
.version.prod::before { background: var(--massing); }
.huvud { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.nr { text-transform: uppercase; letter-spacing: 0.25em; font-size: 0.8rem; font-weight: 600; color: var(--massing); }
.markning { font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; font-weight: 600; background: var(--massing); color: var(--svart); padding: 0.15rem 0.6rem; }
.markning.demo { background: #8b2e2e; color: var(--elfenben); }
.markning.ny { background: none; color: var(--massing-ljus); border: 1px solid var(--massing); }
h2 { font-weight: 400; font-style: italic; font-size: 1.9rem; line-height: 1.15; margin: 0.35rem 0 0.25rem; }
.datum { color: var(--dampad); margin: 0 0 0.75rem; font-size: 1rem; }
.text p, .text ul { margin: 0 0 0.5rem; }
.text ul { padding-left: 1.1rem; }
code { font-size: 0.9em; }
.knappar { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1rem; }
.knappar form { margin: 0; }
.knapp { text-decoration: none; text-transform: uppercase; letter-spacing: 0.2em; font-size: 0.8rem; font-weight: 600; color: var(--elfenben); background: none; border: 1px solid var(--massing); padding: 0.75rem 1.2rem; min-height: 44px; display: inline-flex; align-items: center; font-family: inherit; cursor: pointer; }
.knapp:hover { background: var(--massing); color: var(--svart); }
.knapp.stilla { border-color: rgb(184 149 90 / 0.4); color: var(--dampad); }
.tom { color: var(--dampad); font-style: italic; }
</style>
</head>
<body><main>${innehall}</main></body>
</html>`;

// ---------- hjälpare ----------

function cookies(req) {
  return Object.fromEntries(
    (req.headers.get('Cookie') ?? '').split(';').map((c) => c.trim().split('=')).filter(([k]) => k).map(([k, ...v]) => [k, v.join('=')]),
  );
}
const kaka = (namn, varde, sek) => `${namn}=${varde}; Path=/; Max-Age=${sek}; HttpOnly; Secure; SameSite=Lax`;
const slump = () => b64urlBytes(crypto.getRandomValues(new Uint8Array(24)));
const b64urlBytes = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64url = (text) => b64urlBytes(new TextEncoder().encode(text));
const b64urlText = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));
async function hmac(text, hemlighet) {
  const nyckel = await crypto.subtle.importKey('raw', new TextEncoder().encode(hemlighet), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64urlBytes(new Uint8Array(await crypto.subtle.sign('HMAC', nyckel, new TextEncoder().encode(text))));
}

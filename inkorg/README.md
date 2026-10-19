# Leos inkorg – uppsättning (Admin)

Leo mejlar inkorgen **demo.stolpe@gmail.com**. Ett Google Apps Script i det kontot gör mejlen till issues på GitHub
och mejlar tillbaka Claudes svar. Gratis, inget betalkort, inga GitHub-minuter för själva mejlandet.
Hur det hänger ihop: `docs/processmall.md`, avsnittet *Mejl från beställaren*.

## 1. GitHub-nyckel för inkorgen

github.com → Settings → Developer settings → **Fine-grained tokens** → Generate new token:

- Name: `leo-inkorg` · Expiration: 1 år (skriv ned datumet)
- Resource owner: **niklas-stolpe** · Repository access: *Only select repositories* → **leo**
- Permissions → Repository → **Issues: Read and write** (inget annat)

Kopiera nyckeln – den används i steg 3 och ska inte klistras in någon annanstans.

## 2. Skriptet

1. Logga in i webbläsaren med **inkorgens** Gmail-konto (inte ditt eget).
2. Gå till https://script.google.com → **Nytt projekt**. Döp det till `Leos inkorg`.
3. Ta bort det som står i `Kod.gs` och klistra in hela [`Kod.gs`](Kod.gs) härifrån. Spara (Ctrl+S).

## 3. Nyckeln i skriptet

Kugghjulet **Projektinställningar** → längst ned **Skriptegenskaper** → **Lägg till skriptegenskap**:

- Egenskap: `GITHUB_TOKEN` · Värde: nyckeln från steg 1
- Egenskap: `TILLATNA` · Värde: `lowejkoleo@gmail.com=Leo,niklasstolpe@gmail.com=Niklas` (vem som får mejla, med namn)
- **Spara skriptegenskaper**

## 4. Starta

1. Tillbaka i **Redigerare**, välj funktionen **`installera`** i listan överst och tryck **Kör**.
2. Google frågar om behörighet (läsa och skicka mejl, Drive, externa anrop) → välj inkorgens konto →
   *Avancerat* → *Gå till Leos inkorg (osäker)* → **Tillåt**. Det är ditt eget skript.
3. Loggen visar "Klart: inkorgen läses var 5:e minut."

## 5. Prova

Skicka ett mejl från din egen Gmail till inkorgen, t.ex. ämne *Test* och texten *Hej, det här är ett test*.
Inom 5 minuter finns ett issue med etiketten `mejl`, och strax efter får du ett svar från Claude.

## Styra Claude för Leo

Repo → Settings → Secrets and variables → Actions → **Variables**:

| Variabel | Värde | Betyder |
|---|---|---|
| `LEO_CLAUDE_AKTIV` | `true` / `false` | `false` = pausat; Leo får ett mejl om att det är paus |
| `LEO_CLAUDE_MODELL` | `claude-opus-5-5` | Modellen för Leos ärenden |
| `LEO_CLAUDE_EFFORT` | `medium` | `low` · `medium` · `high` · `xhigh` · `max` |
| `LEO_TOKEN_BUDGET` | t.ex. `20000000` | 100 % – tokens per månad |
| `LEO_KVOT_PROCENT` | `10` | Leos del av budgeten; när den är nådd får han mejl om att det är slut |
| `LEO_VARNING_PROCENT` | `8` | Varningsmejl till Leo |
| `LEO_TOKENS_ÅÅÅÅ_MM` | skrivs automatiskt | Förbrukat hittills i månaden |

Saldot speglas i ett stängt ärende med etiketten `kvot` (skrivs av `scripts/leo-kvot.sh`, ändra inte för hand).
Inkorgen läser det och skriver sist i varje mejl hur mycket Leo har kvar. Ändrar du budgeten: kör
`bash scripts/leo-kvot.sh saldo` så att mejlen visar rätt direkt.

## Skicka ett nytt mejl till Leo

Skapa ett ärende med etiketten `mejl-ut` (utan "@claude" i texten; etiketten skapas en gång med `gh label create mejl-ut`). Rubriken blir ämnet:

```
Till: Leo

[[till-leo]]
Hej Leo! …
[[/till-leo]]
```

Inkorgen skickar det inom 5 minuter och byter etiketten till `mejl`. Svarar Leo hamnar svaret i ärendet och
går till Claude som vanligt.

## När koden ändras

Kopiera in `Kod.gs` igen i script.google.com och spara. Utlösaren behöver inte göras om.

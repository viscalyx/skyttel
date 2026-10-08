# Separat förberedelse för permanent radering

Använd endast den nya lokala provdatabasen och påhittat innehåll från
[permanent radering](household-erasure.md#allmän-förberedelse).
Kör varje utdrag i Chromium via F12, **Sources → Snippets**, Ctrl+Enter.
Console används bara för förberedelsebesked. Stäng utvecklarverktygen
innan UI-stegen utförs. HTTP-status, begäransräkning, filinnehåll och
exakta lagringsjämförelser är tekniskt underlag, inte vanliga UI-resultat.

## Tappa ett slutfört svar

I RADERING-02 och RADERING-07: kör före **Radera permanent** och ange
`execute`. I RADERING-08: kör i Robins profil efter att SQLite-läsaren
avslutats, före den andra **Försök slutföra raderingen**, och ange `resume`.
Invänta **Slutfört svar tappat**. Begäran är oförändrad och servern har
verkligen slutfört ärendet; vanligt offlineläge provar en annan gräns.
Utdraget förbrukas en gång. Om ingen slutförd respons kommer är detta prov
inte utfört. Ladda om för återställning om fallet avbryts före begäran.

```javascript
(() => {
  const action = prompt('execute eller resume');
  if (!['execute', 'resume'].includes(action)) throw new Error('invalid action');
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url = new URL(response.url);
    if (url.origin === location.origin &&
        url.pathname.endsWith(`/erasure/${action}`)) {
      window.fetch = originalFetch;
      const result = await response.clone().json();
      if (response.ok && result.status?.phase === 'completed') {
        console.info('Slutfört svar tappat');
        throw new TypeError('Synthetic lost erasure response');
      }
      console.error('Inget slutfört svar; provet är inte utfört');
    }
    return response;
  };
  console.info('Redo för ett slutfört svar');
})();
```

## Håll ett gammalt statussvar

RADERING-10: kör efter första slutförandet, före första
**Kontrollera raderingsstatus och läs in aktuellt innehåll**.
Invänta **RADERING-10: svaret väntar** innan sidan lämnas. Svaret kommer
från servern och gäller katalogläsningen efter den exakta statusläsningen.
Alt+Skift+R släpper det. Vid avbrott: släpp och ladda om fliken.

```javascript
(() => {
  const originalFetch = window.fetch;
  let releaseResponse = () => {};
  const held = new Promise((resolve) => { releaseResponse = resolve; });
  function release(event) {
    if (!event.altKey || !event.shiftKey || event.code !== 'KeyR') return;
    event.preventDefault();
    releaseResponse();
    window.removeEventListener('keydown', release);
  }
  window.addEventListener('keydown', release);
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url = new URL(response.url);
    if (url.origin === location.origin &&
        url.pathname.endsWith('/erasure') && response.ok) {
      window.fetch = originalFetch;
      console.info('RADERING-10: svaret väntar');
      await held;
    }
    return response;
  };
})();
```

## Blockera återhämtningsminnet

RADERING-11: kör efter att raderingssidan laddats, före första markeringen.
Utdraget blockerar först borttagning. Alt+Skift+S blockerar skrivning,
Alt+Skift+R blockerar borttagning och Alt+Skift+A tillåter båda igen.
Vanlig sidnavigation behåller felet; omladdning återställer lagringen.
Ladda inte om mellan de steg som behöver samma fel. Efter fallet tillåter
operatören lagring och laddar om. Kör aldrig mot verkligt innehåll.

```javascript
(() => {
  const prefix = 'skyttel-erasure:';
  const originalSet = Storage.prototype.setItem;
  const originalRemove = Storage.prototype.removeItem;
  let blocked = 'removeItem';
  window.addEventListener('keydown', (event) => {
    if (!event.altKey || !event.shiftKey) return;
    if (event.code === 'KeyS') blocked = 'setItem';
    else if (event.code === 'KeyR') blocked = 'removeItem';
    else if (event.code === 'KeyA') blocked = '';
    else return;
    event.preventDefault();
  });
  Storage.prototype.setItem = function (key, value) {
    if (key.startsWith(prefix) && blocked === 'setItem')
      throw new DOMException('Kontrollerat lagringsfel', 'QuotaExceededError');
    return originalSet.call(this, key, value);
  };
  Storage.prototype.removeItem = function (key) {
    if (key.startsWith(prefix) && blocked === 'removeItem')
      throw new DOMException('Kontrollerat lagringsfel', 'SecurityError');
    return originalRemove.call(this, key);
  };
})();
```

## Håll en verklig SQLite-läsare

RADERING-04 och RADERING-08: starta före första raderingen och behåll
läsaren under serveromstart. RADERING-11: starta efter det stoppade nya
försöket, före den första verkliga raderingen. Den behövs inte vid första
lagringsfelet. Kör i en andra terminal från projektets rot med samma
`/tmp/skyttel-radering.env` som provservern. Vänta på **Läsningen är öppen**.
När UI-fallet anger det trycker operatören Enter och inväntar
**Läsningen är avslutad**. Vid avbrott avslutas läsaren och samma väntande
ärende slutförs genom UI innan en ny provdatabas används.

```sh
env -u SKYTTEL_DATABASE_PATH node --env-file=/tmp/skyttel-radering.env \
  --input-type=module -e '
import Database from "better-sqlite3";
const database = new Database(process.env.SKYTTEL_DATABASE_PATH, {
  readonly: true,
  fileMustExist: true,
});
database.exec("BEGIN");
database.prepare("SELECT id FROM map_object LIMIT 1").get();
function release() {
  database.exec("ROLLBACK");
  database.close();
  console.log("Läsningen är avslutad.");
  process.exit(0);
}
process.stdin.resume();
process.stdin.once("data", release);
process.once("SIGINT", release);
console.log("Läsningen är öppen. Tryck Enter när steg 5 säger till.");
'
```

## Blockera begäran innan den tas emot

RADERING-09: öppna **Network request blocking** i profil A innan första
**Radera permanent**. Blockera endast `*/erasure/execute`. Efter det oklara
utfallet avaktiverar operatören blockeringen. Det första försöket saknar
serverresultat; detta är inte det slutförda tappade svaret ovan.
Vid fallens fjärde UI-steg blockerar operatören endast adressen för den
första visade identifierarens statusläsning. Efter första statuskontrollen
tas även den blockeringen bort. Avsluta med alla regler avaktiverade.

## Separata tekniska kontroller

Utför efter angivna UI-steg och redovisa separat. Behåll samma session,
provdatabas och sparade bildadresser. Rensa hämtade filer och fångade
begäranden efter fallet. Kopiera aldrig cookies eller privata svar till
protokollet. Integrationens fullständiga jämförelser är ytterligare
tekniskt underlag, samtidigt som varje vanligt fall har en UI-motsvarighet.

- RADERING-01 efter återläsning och export: ladda om den sparade bildadressen
  och läs HTTP 404 utan bild i Network. Öppna nedladdad ZIP och `content.json`:
  lampans namn saknas i hela filen, stolen och det privata förslaget finns,
  `images` är tom och `images.bin` har inga byte.
- RADERING-05 efter export: gamla bildadressen ger 404 och den nya 200.
  Sök gamla bild-ID:t i hela `content.json`; det saknas. `images` innehåller
  bara den nya bilden. Lampan, stolen och det privata förslaget finns.
  Kopiera `images.bin` till `kvarvarande-bild.webp` och läs den orange bilden.
- RADERING-02/07/08/09/10/11: aktivera **Preserve log** före första åtgärden
  och filtrera `erasure`. Följ exakt ärende som visas i UI. RADERING-02/07
  gör en första execute; återläsning och navigation gör ingen ny execute
  eller resume. RADERING-08 gör en execute och två uttryckliga resume för
  samma ärende; Alex nekas status och resume med 403 efter rollbytet.
  RADERING-09 visar 404 för saknat första ärende och gör ingen automatisk
  execute/resume. RADERING-10 gör bara två uttryckliga execute och ingen
  resume. RADERING-11 skickar ingenting vid lagringsblockeringen, sedan
  en execute och en resume efter återställd lagring. Observera att ett
  slutfört borttappat svar kan synas som 200 i Network men saknas i UI.
- RADERING-04/08 under städning: automatiken kontrollerar exakt
  `content_maintenance` för karta och export, faktiskt fastlåsta journalsidor,
  och bevarade oberoende utkast, typer och placeringar.
  Efter slutförandet ger den raderade bildadressen 404. RADERING-01/05
  kontrollerar också bevarade personliga placeringar och hela historiken.

[household-erasure-preparation.spec.ts](../../tests/integration/household-erasure-preparation.spec.ts)
rökprovar utdrag och läsarkommando mot riktiga tomma och fyllda databaser.
Det är tekniskt underlag och utför inga fysiska zoom- eller skärmläsarprov.

# Manuella testfall för återställning och flytt

Testfallet omfattar fullständig flytt till tom lagring, uttrycklig koppling
av historiskt privat innehåll, omstart och fortsatt export till ännu en
installation. Anteckna commit, webbläsare och godkänt eller underkänt
resultat vid körning. Mänsklig körning görs först efter hela specifikation #31.

## Konfigurerade användare

**Alex** är rollen för den befintliga första administratörens verifierade
inloggning på källan. **Robin** är en annan verifierad inloggning som blir
första administratör på målet; samma person får kontrollera båda kontona.
Namnen är testroller, inte krav på kontonas verkliga namn. Källans historiska
innehåll kopplas avsiktligt till Robin efter uttrycklig granskning.

## Allmän förberedelse

1. Följ [den lokala flyttförberedelsen](../development/local-recovery.md).
   Den skapar separata tomma databaser och hemligheter på port 5173 och
   3301. Använd separata Chrome-profiler A och B enligt guiden. Skapa ett
   tomt hushåll på vardera installationen efter normal inloggning.
2. Använd endast påhittat innehåll. Skapa tre tydligt olika provbilder enligt
   [bildförberedelsen](profile-images.md#allmän-förberedelse), med olika färger.
   Spara hämtade arkiv och nedanstående begäransfiler privat, utanför Git.
3. Förbered ytterligare en tom Chrome-profil C. Samma temporära katalog
   används för omstarter; återskapa inte databaserna mitt i fallet.

## Flytt utan gammal inloggningsbehörighet

### FLYTT-01: återställ, koppla ägare och flytta vidare

**Syfte:** Kontrollera att en fullständig export ensam räcker för innehållet,
att verifierad ny inloggning krävs och att privat arbete förblir återställbart.

**Användare:** Alex på källan, Robin på målet och Alex i profil C på en tredje,
tom installation. Den tredje installationen använder en ny egen hemlighet.

**Förutsättningar:** Båda installationerna fungerar enligt förberedelsen.
Ingen annan skriver till dem. Chromium med utvecklarverktyg finns tillgängligt.
Den lokala MCP-kontrollklienten `scripts/manual-mcp-client.ts` från samma
färdigställda batch används enbart med påhittade uppgifter.

**Integrationstest:**
[household-recovery.spec.ts](../../tests/integration/household-recovery.spec.ts),
testfallet “FLYTT-01: a fresh installation restores an archive, explicitly
assigns private ownership and remains portable after restart”.

**Steg:**

1. På källan: lägg till ett eget textfält **Notering** på en objekttyp.
   Skapa och spara **Kvarvarande lampa** och **Borttagen lampa** med fältvärden.
   Spara den första bilden på det kvarvarande objektet, byt till den andra
   och spara igen. Ta bort det andra objektet och spara. Anteckna objektens
   stabila ID och kvittonas författare, ID och tidpunkter från historiken.
2. Föreslå den tredje bilden på kvarvarande objekt, men spara inte förslaget.
   Flytta objektet till en igenkännlig personlig plats i rymdkartan. Aktivera
   stjärnor och välj axelindikatorn i övre vänstra hörnet. Anteckna källans
   historiska innehålls-ID från **Koppla historiskt innehåll**.
3. Kör **Förbered ett känt väntande försök** nedan i profil A, ange `source`
   och behåll den hämtade JSON-filen privat. Detta skapar ett känt väntande
   försök utan att skicka `/save`; det simulerar inget okänt verkligt sparande.
4. Vidarebefordra port 47731 privat till samma värdport. I en tredje terminal,
   från projektets rot, starta kontrollklienten:

   ```sh
   node --import tsx scripts/manual-mcp-client.ts http://localhost:5173 47731
   ```

   Öppna dess `authorize`-adress i profil A, välj källhushållet och godkänn
   de särskilda AI- och kartmedgivandena. Invänta `ready`, kör `read` och
   kontrollera det privata bildförslaget. Behåll processen öppen. Kopiera
   inga token, cookies eller returadresser. Vid utgånget medgivande ska
   åtkomstprovet göras om, inte räknas som bevis på avvisad gammal behörighet.
5. Stoppa alla innehållsändringar på källan. Hämta dess fullständiga export
   och kör `read` en sista gång i kontrollklienten för att bekräfta att
   behörigheten fortfarande fungerar. Stoppa sedan endast källservern i
   terminal A. Behåll profilen, konfigurationen, arkivet och kontrollklienten.
6. I profil B: återimportera källarkivet genom Administration på målet.
   Granska och bekräfta uttryckligen. Läs in hushållet igen. Kartan och
   historiken ska finnas, men Robins privata utkast ska vara tomt; källans
   tredje bild ska inte visas som Robins förslag. Ingen identitet kopplas
   automatiskt, även om verkliga konton råkar ha samma namn eller e-postadress.
7. Lägg **Nytt privat arbete** i Robins utkast utan att spara. Anteckna
   Robins historiska innehålls-ID. Kör samma förberedelsekod i profil B med
   namnet `destination`, och behåll även den JSON-filen privat.
8. Öppna **Koppla historiskt innehåll**, **Hämta aktuella innehållskopplingar**.
   Välj källans historiska ID och Robins aktuella verifierade användar-ID.
   Läs att Robins tidigare privata arbete bevaras utan aktuell ägare.
   Bekräftelseknappen ska vara avstängd tills rutan om identifierad person
   markeras. Bekräfta, starta om målservern med samma databas och läs in kartan.
9. Kontrollera källans privata tredje bild, personliga plats och visningsval.
   Kvittonas författare, stabila ID och tidpunkter ska vara oförändrade.
   Robins tidigare privata identitet ska fortfarande visas utan aktuell
   ägare i administrationslistan. Exportera målet på nytt; behåll det andra
   arkivet. Stoppa därefter målservern. Bara en installation ska vara skrivbar.
10. Skapa den tredje tomma installationen enligt blocket nedan och starta
    den på källans nu lediga port 5173. Innan någon ny inloggning i profil A:
    öppna `/api/bootstrap` där och kontrollera att den gamla Skyttel-sessionen
    inte är inloggad. Kör `read` i den gamla kontrollklienten: den ska få
    `MCP HTTP 401`. Avsluta klienten med `quit`. Logga sedan in normalt som
    Alex i profil C och skapa ett nytt tomt hushåll.
11. Återimportera målarkivet i profil C. Koppla uttryckligen källans
    historiska ID till profil C:s verifierade medlem. Starta om tredje
    servern med samma konfiguration. Kontrollera samma privata bild och
    historik. Kör **Avvisa de gamla försöken** nedan med de två JSON-filerna.
    Båda ska få 409 trots att den nya aktuella innehållsgenerationen används.
12. Hämta en tredje fullständig export. Kör **Jämför arkiven** nedan med
    källans, målets och den tredje installationens arkiv. Kontrollera att
    bildbytesföljden, borttaget objekt, definitioner och kvitton bevarats,
    att båda väntande försök fortfarande är historiska och att Robins
    privata arbete finns kvar utan ägare. Detta kräver ingen gammal databas.
13. Först efter jämförelsen: koppla Robins tidigare privata identitet till
    profil C:s medlem. Läs in kartan och kontrollera **Nytt privat arbete**.
    Koppla tillbaka källidentiteten och kontrollera det privata bildförslaget.
    Medlemskapet ska bestå under båda bytena. Spara nu hela utkastet med ett
    nytt aktuellt underlag och kontrollera kvittot efter omstart.
14. Stäng testprofilerna. Stoppa servern, radera de privata export- och
    begäransfilerna och städa endast provkatalogen enligt förberedelseguiden.
    Starta inte den gamla källan för fortsatt arbete efter flytten.

**Förbered ett känt väntande försök:**

Kör i Console på respektive installations hushållssida före dess export
eller ägarbyte. Koden hämtar aktuellt bygg-ID och utkast, förbereder en
operation och laddar ned endast dess tre begäransfält. Inga inloggningsdata
följer med filen. Ange hushållets ID från sidans adress.

```javascript
await (async () => {
  const slot = prompt('source eller destination');
  const id = prompt('Hushållets ID från adressen');
  if (!['source', 'destination'].includes(slot) || !/^[\w-]+$/.test(id)) {
    throw new Error('invalid test input');
  }
  const path = `/api/households/${id}/map`;
  const read = async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`read failed: ${response.status}`);
    return response.json();
  };
  const state = await read(path);
  const build = await read('/api/version');
  const body = { version: state.draft.version,
    contentVersion: state.contentVersion, operationId: crypto.randomUUID() };
  const response = await fetch(`${path}/operations`, {
    method: 'POST', headers: { 'Content-Type': 'application/json',
      'X-Skyttel-Build': `${build.commit}:${build.version}` },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || result.operation?.status !== 'pending') {
    throw new Error('pending preparation failed; stop this case');
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(body)],
    { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = `skyttel-move-${slot}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  console.info('FLYTT-01: känt väntande försök förberett');
})();
```

**Tredje installationen utan rå databaskopia:**

I terminal A, med källan och målet stoppade och samma provkatalog kvar:

```sh
node --input-type=module <<'JS'
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
const root = process.env.SKYTTEL_MOVE_CASE_DIR;
if (!root) throw new Error('Keep the original temporary directory.');
const values = parseEnv(readFileSync(`${root}/source.env`, 'utf8'));
values.SKYTTEL_DATABASE_PATH = `${root}/third.sqlite`;
values.BETTER_AUTH_SECRET = randomBytes(48).toString('base64url');
writeFileSync(`${root}/third.env`, Object.entries(values)
  .map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n',
{ mode: 0o600, flag: 'wx' });
JS
PORT=5173 HOST=0.0.0.0 NODE_ENV=development \
  node --env-file="$SKYTTEL_MOVE_CASE_DIR/third.env" dist/server/index.js
```

Vid senare omstart körs bara de två sista raderna. Den första delen får inte
köras igen. Tidigare privata providerinställningar återanvänds, men ingen
gammal databas, session eller historisk inloggningsbehörighet kopieras.

**Avvisa de gamla försöken:**

I profil C:s Console, efter import, ägarbyte och omstart, kör blocket.
Välj de två lokala JSON-filerna. Koden jämför aktuell karta och historik
före och efter varje försök; inget gammalt lyckat kvitto får returneras.

```javascript
await (async () => {
  const id = prompt('Tredje hushållets ID från adressen');
  if (!/^[\w-]+$/.test(id)) throw new Error('invalid household');
  const input = document.createElement('input');
  input.type = 'file'; input.multiple = true; input.accept = '.json';
  const files = await new Promise(resolve => {
    input.onchange = () => resolve([...input.files]); input.click();
  });
  if (files.length !== 2) throw new Error('select both original requests');
  const path = `/api/households/${id}/map`;
  const read = async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`read failed: ${response.status}`);
    return response.json();
  };
  const snapshot = async () => JSON.stringify({ map: await read(path),
    history: await read(`${path}/history`) });
  const before = await snapshot();
  const state = await read(path);
  const build = await read('/api/version');
  for (const file of files) {
    const body = JSON.parse(await file.text());
    const fields = Object.keys(body).sort().join(',');
    if (fields !== 'contentVersion,operationId,version') {
      throw new Error('unexpected request fields');
    }
    const response = await fetch(`${path}/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json',
        'X-Skyttel-Build': `${build.commit}:${build.version}` },
      body: JSON.stringify({ ...body, contentVersion: state.contentVersion }),
    });
    const result = await response.json();
    console.info('FLYTT-01', file.name, response.status, result.error);
    if (response.status !== 409 || result.error !== 'content_conflict'
        || await snapshot() !== before) {
      throw new Error('retired retry changed content');
    }
  }
  console.info('FLYTT-01: båda avvisade, karta och historik oförändrade');
})();
```

**Jämför arkiven:**

Ange de tre privata ZIP-filernas absoluta sökvägar i terminalen. Kopiera
dem vid behov till provkatalogen via VS Code; öppna inga verkliga hushållsarkiv.
Kontrollen skriver bara ut ett godkänt besked, inte privata innehållsvärden.

```sh
printf 'Source ZIP path: '; read -r SKYTTEL_MOVE_SOURCE_ZIP
printf 'Target ZIP path: '; read -r SKYTTEL_MOVE_TARGET_ZIP
printf 'Third ZIP path: '; read -r SKYTTEL_MOVE_THIRD_ZIP
export SKYTTEL_MOVE_SOURCE_ZIP SKYTTEL_MOVE_TARGET_ZIP SKYTTEL_MOVE_THIRD_ZIP
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
const archives = ['SOURCE', 'TARGET', 'THIRD'].map(name => {
  const parts = unzipSync(readFileSync(process.env[`SKYTTEL_MOVE_${name}_ZIP`]));
  const content = JSON.parse(Buffer.from(parts['content.json']).toString());
  return { parts, content };
});
const normalize = rows => rows.map(({ householdId, ...row }) => row);
const source = archives[0];
for (const current of archives.slice(1)) {
  assert.deepEqual(current.parts['images.bin'], source.parts['images.bin']);
  for (const key of ['objects', 'objectTypes', 'objectTypeFields', 'saves']) {
    assert.deepEqual(normalize(current.content[key]), normalize(source.content[key]));
  }
  const pending = current.content.operations.filter(row => row.status === 'pending');
  assert.equal(pending.length, 2);
  assert.ok(current.content.drafts.some(row => row.changes.some(change =>
    change.after?.name === 'Nytt privat arbete')));
}
console.log('FLYTT-01: bilder, identiteter, definitioner och historik bevarade.');
JS
unset SKYTTEL_MOVE_SOURCE_ZIP SKYTTEL_MOVE_TARGET_ZIP SKYTTEL_MOVE_THIRD_ZIP
```

**Förväntat resultat:**

- ZIP-filen räcker för innehållet på tom lagring. Inga gamla användarkonton,
  sessioner eller assistentmedgivanden får ny behörighet. Normal verifierad
  inloggning och uttrycklig koppling krävs på varje ny installation.
- Objekt, borttaget innehåll, fält, bilder och historiska författare behåller
  sina identiteter. Privata utkast, placeringar och inställningar återkommer
  efter koppling och omstart. Ingen privat vy blandas med den undanträngda.
- Båda gamla försöken avvisas även med den aktuella generationen. Karta och
  historik är oförändrade. Ett nytt granskat sparande fungerar efter flytten.
- Robins undanträngda privata arbete går att koppla tillbaka även efter
  ännu en export och import. Medlemskap ändras inte av innehållskopplingen.

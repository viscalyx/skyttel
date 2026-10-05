# Manuella testfall för profilbilder

Testfallen omfattar privata bildförslag, visning i rymdkartan, historik,
historikläsning, fel, åtkomst och återgång till ett objekt efter att dess panel
stängts.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

- Alex Exempel är administratör i testhushållet och använder Google.
- Robin Exempel är inbjuden medlem och använder Microsoft i en annan
  webbläsarprofil.
- En tredje profil är utloggad. Kontrollen av ett annat hushåll med
  medlemskap utförs av integrationstestets separata testdatabas.

## Allmän förberedelse

Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor) när
fallen anger formulär, samtal, profil eller administration.

När ett befintligt objekt eller samband ska ändras, välj det först i
kartan eller listan och öppna dess detaljpanel. För objekt i listan använder
du **Uppgifter**; i kartverktygen väljer du **Visa detaljer**. Välj sedan
**Redigera valt objekt** eller **Redigera valt samband** för att öppna
formuläret. Att bara välja objektet eller sambandet öppnar inte formuläret.

1. Använd en isolerad installation med påhittade uppgifter. Skapa objektet
   Lo Exempel med en beskrivning och ett privat förslag. Förbered påhittade
   JPEG-, PNG- och WebP-bilder, en textfil döpt till PNG och en fil över 10 MB
   med kommandot nedan.
2. Använd ett nytt hushåll eller återställ samma testutgångsläge mellan
   fallen. Behåll inloggningar och databas vid normal omstart.

Kör i projektets terminal efter `npm ci`. Kommandot skapar en ny privat
testmapp och skriver ut dess sökväg; det ändrar ingen databas:

```sh
node --input-type=module <<'NODE'
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const directory = await mkdtemp(join(tmpdir(), 'skyttel-image-case-'));
for (const [format, background] of [
  ['jpeg', '#992233'], ['png', '#0088ff'], ['webp', '#33aa44'],
]) {
  await sharp({ create: { width: 600, height: 400, channels: 3, background } })
    .toFormat(format).toFile(join(directory, `bild.${format}`));
}
await writeFile(join(directory, 'fel.png'), 'synthetic invalid pixels');
await writeFile(join(directory, 'stor.png'), Buffer.alloc(10_000_001));
console.log(directory);
NODE
```

Om webbläsaren körs på värddatorn, öppna mappen i VS Codes filutforskare
och hämta de fem filerna till en separat testmapp på värddatorn. Använd
dessa kopior i filväljaren. Radera båda testmapparna efter körningen.

## Bildförslag och historik

### BILD-01: Bevara text och läs tidigare bilder efter omstart

**Syfte:** Verifiera samma privata utkast, beständighet och historikläsning för
bilder.

**Användare:** Alex.

**Förutsättningar:** Lo Exempel finns i Alex utkast utan sparad bild.

**Integrationstest:**
[profile-images.spec.ts](../../tests/integration/profile-images.spec.ts),
testfallet “BILD-01: profile image proposals preserve text, survive restart
and expose historical replacements”.

**Steg:**

1. Redigera Lo och öppna Livscykel och utseende. Välj en PNG-bild och
   kontrollera förhandsbilden. Välj Lägg i utkastet och stäng. Öppna kartan
   och kontrollera bilden i Lo Exempels runda symbol.
2. Redigera Lo igen. Skriv Oskickad text som beskrivning i Grunduppgifter.
   Öppna Livscykel och utseende och kontrollera att bildvalet är nåbart.
   Lägg hela formuläret i utkastet och spara hela utkastet separat.
3. Starta om servern och ladda om. Kontrollera bilden i redigeringen och
   kartan. Byt bilden till WebP, lägg hela formuläret i utkastet och spara.
4. Välj **Rapporter** och **Visa ändringarna** vid senaste sparandet.
   Läs och se bilderna före och efter. Kontrollera att aktuell bild och
   beskrivning är oförändrade.

**Förväntat resultat:**

- Bild och text läggs tillsammans på rätt objekt i utkastet först efter
  bekräftat tillägg av hela formuläret. Bildval skriver inte över text.
- Bilden visas i objektets runda symbol före sparandet och efter omstart.
  Sparad bild och beskrivning överlever omstart. Historiken visar bytet.
- Historiken visar båda bilderna utan att ändra den aktuella bilden
  eller beskrivningen.

### BILD-02: Avvisa felaktiga bilder och återhämta bildborttagning

**Syfte:** Bevara tidigare förslag vid fel och bekräfta endast ett sparande.

**Användare:** Alex.

**Förutsättningar:** Lo Exempel finns i Alex utkast. Använd webbläsarens
utvecklarkonsol på den isolerade testsidan för avbrottet i steg 3.

**Integrationstest:**
[profile-images.spec.ts](../../tests/integration/profile-images.spec.ts),
testfallet “BILD-02: invalid images retain proposals and interrupted removal
recovers its durable receipt”.

**Steg:**

1. Välj en JPEG-bild på Lo och lägg hela formuläret i utkastet. Redigera
   igen, välj textfilen döpt till PNG och försök lägga formuläret i utkastet.
   Upprepa med filen över 10 MB. Läs felen och kontrollera beskrivningen.
   Avbryt och kasta endast de oskickade ändringarna.
2. Spara hela utkastet. Redigera Lo och välj Ta bort profilbilden ur
   formuläret i Livscykel och utseende. Lägg hela ändringen i utkastet.
   Granska borttagningsförslaget innan separat sparande.
3. Stäng formuläret. Kör avbrottskoden nedan i utvecklarkonsolen och
   spara sedan hela utkastet utan att ladda om sidan.
   Läs beskedet om okänt utfall i **Spara utkastet** och välj
   **Kontrollera sparandet igen**.
4. Välj **Rapporter** och öppna bildborttagningens historiska detaljer.
   Kontrollera den tidigare bilden och det tomma utkastet.

Koden väntar på serverns svar för nästa sparande och döljer sedan svaret
för gränssnittet. Den återställer `fetch` efter det enda avbrottet.
Ladda om sidan efter fallet, eller om du avbryter före sparandet.
Vanligt offlineläge verifierar inte ett avbrott efter transaktionen.

```javascript
(() => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const target = args[0] instanceof Request ? args[0].url : args[0];
    const method = args[1]?.method ?? args[0]?.method ?? 'GET';
    if (new URL(target, location.href).pathname.endsWith('/map/save')
        && method === 'POST') {
      window.fetch = originalFetch;
      throw new TypeError('Synthetic connection interrupted');
    }
    return response;
  };
})();
```

**Förväntat resultat:**

- Ogiltiga och för stora filer ger begripliga fel med tidigare bild och
  beskrivning kvar. Det går fortfarande att spara det giltiga utkastet.
- Okänt utfall ger ingen falsk sparbekräftelse. Kvittot bekräftar en enda
  bildborttagning och historiken har inget dubbelt sparande.
- Historiken visar rätt tidigare bild. Aktuell bild är borttagen och
  utkastet är tomt; läsningen skapar inget nytt förslag.

### BILD-03: Neka privata och historiska bildadresser efter återkallad tillgång

**Syfte:** Verifiera privata förslag och aktuellt medlemskap för bildåtkomst.

**Användare:** Alex, Robin och den utloggade profilen.

**Förutsättningar:** Robin har tillgång till samma hushåll som Alex.
Öppna utvecklarverktygens nätverkspanel i Alex profil före uppladdningen.
Anteckna sökvägen till bildens `POST`-begäran, till exempel
`/api/households/…/profile-images/…`. Den innehåller objektets ID;
bildadressen i förhandsvisningen innehåller ett annat ID.
Anteckna även begärans `X-Skyttel-Draft-Version`,
`X-Skyttel-Content-Version` och `X-Skyttel-Object-Revision`.
Kopiera inga cookies, token eller autentiseringshuvuden mellan profilerna.

**Integrationstest:**
[profile-images.spec.ts](../../tests/integration/profile-images.spec.ts),
testfallet “BILD-03: private, historical and known image addresses enforce
current household access”.

**Steg:**

1. Lägg en WebP-bild på Lo i Alex utkast. Kopiera bildadressen och öppna
   den som Robin och utloggad. Spara som Alex och öppna samma adress som Robin.
2. Byt till PNG-bilden i Alex utkast. Prova den nya bildadressen som Robin:
   den ska ännu nekas. Stäng formuläret och spara hela utkastet som Alex.
   Kontrollera att objektets aktuella bild är PNG-bilden. Öppna historiken,
   välj **Visa ändringarna** och jämför bilderna före och efter bytet.
   Den första WebP-bilden ska nu
   bara finnas i historiken. Robin ska kunna öppna både dess gamla adress
   och den aktuella PNG-bildens adress.
3. Lägg JPEG-bilden som ett nytt privat bildförslag utan att spara.
   Kopiera den tredje bildadressen; den ska nekas som Robin. Prova alla
   tre bildadresserna i den utloggade profilen: samtliga ska nekas.
4. Återkalla Robins tillgång som Alex. Prova alla tre bildadresserna igen,
   även efter att du ersätter hushållets ID i adressen med `unknown-household`.
5. Öppna appens startsida i Robins profil och i den utloggade profilen.
   Kör koden nedan i respektive utvecklarkonsol och ange den antecknade
   objektadressens sökväg och versionsvärden. Kontrollera statuskoderna.

Koden använder en liten påhittad PNG-bild och profilens egen session.
Kör den först efter återkallelsen och endast på testinstallationen.
Den skriver ut HTTP-status, inga identiteter eller hemligheter.

```javascript
await (async () => {
  const path = prompt('Objektadressens sökväg från POST-begäran');
  const pattern = /^\/api\/households\/[^/]+\/profile-images\/[^/]+$/;
  if (!path || !pattern.test(path)) {
    throw new Error('invalid path');
  }
  const identity = await (await fetch('/api/version')).json();
  const headers = {
    'Content-Type': 'application/octet-stream',
    'X-Skyttel-Build': `${identity.commit}:${identity.version}`,
    'X-Skyttel-Draft-Version': prompt('X-Skyttel-Draft-Version'),
    'X-Skyttel-Content-Version': prompt('X-Skyttel-Content-Version'),
    'X-Skyttel-Object-Revision': prompt('X-Skyttel-Object-Revision'),
  };
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 2;
  const pixels = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  for (const method of ['POST', 'DELETE']) {
    const response = await fetch(path, {
      method, headers, credentials: 'same-origin',
      body: method === 'POST' ? pixels : undefined,
    });
    console.log(method, response.status);
  }
})();
```

**Förväntat resultat:**

- Endast Alex ser osparade bildversioner. Robin ser den gemensamma bilden
  och den äldre bilden som bara finns i historiken. Utloggad får inte tillgång.
- Återkallad tillgång stoppar läsning av aktuell, historisk och privat bild samt
  bildändringar. API-proven ger 403 som Robin och 401 som utloggad.
  En okänd hushållsadress ger inte tillgång.

Integrationstestet kontrollerar dessutom att Robin, med giltigt medlemskap
i ett annat hushåll, inte kan läsa Lindens bilder genom det hushållets
adress. Det testet skapar det andra hushållet i sin egen databas; den
manuella kontrollen med en okänd adress ersätter inte medlemskapsprovet.

### BILD-04: Behåll kompletta bildformulär vid fördröjt avvisande

**Syfte:** Bevara lokala uppgifter, tidigare bilder och oberoende förslag.

**Användare:** Alex.

**Förutsättningar:** Privata förslag för Cykeln och Garaget med beskrivningar.
Cykeln har cykelikonen. Ha två giltiga bilder och `fel.png` från förberedelsen.
Upprepa i ljust och mörkt tema vid 1440 × 1000, 1440 × 500, 320 × 1000 och
320 × 250 CSS-bildpunkter. Verklig zoom provas separat vid 200 och 400 procent.

**Integrationstest:**
[profile-image-work.spec.ts](../../tests/integration/profile-image-work.spec.ts).
Följande testfall:

- “BILD-04: delayed whole-form image rejection retains local values and earlier
  proposals at 1440x1000px light”.
- “BILD-04: delayed whole-form image rejection retains local values and earlier
  proposals at 1440x1000px dark”.
- “BILD-04: delayed whole-form image rejection retains local values and earlier
  proposals at 1440x500px light”.
- “BILD-04: delayed whole-form image rejection retains local values and earlier
  proposals at 1440x500px dark”.
- “BILD-04: delayed whole-form image rejection retains local values and earlier
  proposals at 320x1000px light”.
- “BILD-04: delayed whole-form image rejection retains local values and earlier
  proposals at 320x1000px dark”.
- “BILD-04: delayed whole-form image rejection retains local values and earlier
  proposals at 320x250px light”.
- “BILD-04: delayed whole-form image rejection retains local values and earlier
  proposals at 320x250px dark”.

**Steg:**

1. Redigera Garaget, skriv Separat förslag om Garaget och välj **Lägg i
   utkastet och stäng**.
2. Redigera Cykeln. Öppna **Livscykel och utseende**, välj första bilden
   och lägg hela formuläret i utkastet. Upprepa med andra bilden.
3. Redigera Cykeln igen. Skriv Oskickad bildtext i Grunduppgifter. Öppna
   **Livscykel och utseende** och välj `fel.png`. Håll nästa svar enligt
   koden nedan och välj **Lägg i utkastet och stäng**.
4. Kontrollera spärrade fält och Avbryt. Tryck Escape och försök fokusera
   bakgrundens sökfält. Släpp svaret med `releaseImageError()`.
5. Läs bildfelet. Öppna Grunduppgifter och kontrollera beskrivningen.
   Välj **Avbryt**. Kontrollera standardfokus, läsbarhet och synligt fokus
   på **Fortsätt redigera**, även med pekaren över knappen.
6. Tryck Escape i varningen. Kontrollera text och fokus på Avbryt.
   Välj Avbryt igen och **Kasta ändringarna och fortsätt**.
7. Redigera Cykeln igen. Kontrollera ursprunglig utkastbeskrivning och
   andra giltiga bilden. Avbryt det oförändrade formuläret, stäng
   läspanelerna och öppna Garaget igen. Kontrollera dess lagda förslag.

Kör före steg 3 i utvecklarkonsolen. Koden håller det verkliga svaret från
hela formulärets tillägg. Återställ `window.fetch = originalImageFetch`
efter kontrollen:

```js
window.originalImageFetch = window.fetch;
let release;
const held = new Promise(resolve => { release = resolve; });
window.releaseImageError = release;
window.fetch = async (...args) => {
  const response = await originalImageFetch(...args);
  if (String(args[0]).includes('/map/object-form') && args[1]?.method === 'POST')
    await held;
  return response;
};
```

**Förväntat resultat:**

- Bildval ensamt ändrar inte utkastet. Väntande tillägg spärrar fält,
  stängning och arbete bakom formuläret.
- Avvisat bildtillägg bevarar lokala värden. Escape i förlustvarningen
  fortsätter redigering med texten kvar.
- Uttryckligt kastande tar endast bort oskickade uppgifter. Tidigare
  giltig bild, ikon och Garagets lagda förslag finns kvar.
- Varningens fokus och text är synliga och läsbara i båda teman. Automationen
  mäter minst 4,5:1 textkontrast. Korta fönster tillåter rullning till fält
  och knappar. Ingen ändring har sparats i kartan eller historiken.

### BILD-05: Spärra navigering under bildtillägg och behåll inaktuellt formulär

**Syfte:** Skydda komplett oskickat bildarbete vid navigering och samtidighet.

**Användare:** Alex.

**Förutsättningar:** Ett nytt hushåll. Ha `fel.png`, en giltig bild och
svarsfördröjningen i BILD-04. Ha en andra flik med samma användare.

**Integrationstest:**
[profile-image-work.spec.ts](../../tests/integration/profile-image-work.spec.ts).
Följande testfall:

- “BILD-05: pending image staging blocks navigation and stale rejection
  preserves the complete form at 1440px”.
- “BILD-05: pending image staging blocks navigation and stale rejection
  preserves the complete form at 390px”.
- “BILD-05: pending image staging blocks navigation and stale rejection
  preserves the complete form at 320px”.

**Steg:**

1. Öppna Inställningar och följ **Tillbaka till kartan**. Välj Nytt objekt,
   skriv Bildarbete och Behåll bildens text. Öppna Livscykel och utseende.
   Avbryt filväljaren utan fil och kontrollera oförändrat utkast.
2. Välj `fel.png`, håll nästa svar och lägg hela formuläret i utkastet.
   Använd webbläsarens Bakåt. Kontrollera att formuläret stannar och är
   spärrat. Släpp svaret och läs bildfelet.
3. Använd Bakåt igen. Tryck Escape i förlustvarningen och kontrollera att
   formuläret finns kvar. Använd Bakåt igen och välj **Kasta ändringarna
   och fortsätt**. Kontrollera återgång till Inställningar.
4. Återgå till kartan och skapa ett nytt formulär för Bildarbete med
   Oskickat efter bildfelet och en giltig bild, utan att lägga det i utkastet.
5. Lägg ett oberoende objektförslag, Annat förslag, i utkastet från andra
   fliken. Försök lägga första flikens hela formulär i utkastet.
6. Kontrollera felet, beskrivningen i Grunduppgifter och filvalet i
   Livscykel och utseende. Granska det privata utkastet från andra fliken.

**Förväntat resultat:**

- Avbrutet filval ändrar inget. Väntande tillägg spärrar Bakåt och fält.
- Känd avvisning behåller formuläret. Escape avbryter förlustvarningen.
  Uttryckligt kastande tillåter navigering utan att skapa ett förslag.
- Inaktuellt komplett tillägg bevarar lokal text och bild. Det oberoende
  förslaget är oförändrat; inget ofullständigt bildförslag eller gemensamt
  sparande har skapats. Historiken är tom.

### BILD-06: Dela text, ikon och bild tillsammans för varje objekttyp

**Syfte:** Hantera bilder för alla objekttyper i samma privata objektförslag
och kvitto samt ta bort senaste bilden utan att få tillbaka en äldre.

**Användare:** Alex.

**Förutsättningar:** Använd ett nytt isolerat hushåll för varje typ. Prova
Person, Tjänst, Tjänstekonto, Abonnemang, E-postadress, Bankkonto, Kort,
Företag, Förening, Bostad, Garage, Fordon, Avtal, Hyresavtal, Låneavtal,
Kreditavtal, Avbetalningsavtal och Försäkringsavtal. Prova också en egen
typ med namnet Egen bildtyp, skapad genom **Typer och egna fält** i
Inställningar. Använd två giltiga bilder och `fel.png` från förberedelsen.

**Integrationstest:**
[profile-image-types.spec.ts](../../tests/integration/profile-image-types.spec.ts).
Följande testfall:

- “BILD-06: Person shares text, icon and image in one proposal and removes the
  latest image”.
- “BILD-06: Tjänst shares text, icon and image in one proposal and removes the
  latest image”.
- “BILD-06: Tjänstekonto shares text, icon and image in one proposal and removes
  the latest image”.
- “BILD-06: Abonnemang shares text, icon and image in one proposal and removes
  the latest image”.
- “BILD-06: E-postadress shares text, icon and image in one proposal and removes
  the latest image”.
- “BILD-06: Bankkonto shares text, icon and image in one proposal and removes
  the latest image”.
- “BILD-06: Kort shares text, icon and image in one proposal and removes the
  latest image”.
- “BILD-06: Företag shares text, icon and image in one proposal and removes the
  latest image”.
- “BILD-06: Förening shares text, icon and image in one proposal and removes the
  latest image”.
- “BILD-06: Bostad shares text, icon and image in one proposal and removes the
  latest image”.
- “BILD-06: Garage shares text, icon and image in one proposal and removes the
  latest image”.
- “BILD-06: Fordon shares text, icon and image in one proposal and removes the
  latest image”.
- “BILD-06: Avtal shares text, icon and image in one proposal and removes the
  latest image”.
- “BILD-06: Hyresavtal shares text, icon and image in one proposal and removes
  the latest image”.
- “BILD-06: Låneavtal shares text, icon and image in one proposal and removes
  the latest image”.
- “BILD-06: Kreditavtal shares text, icon and image in one proposal and removes
  the latest image”.
- “BILD-06: Avbetalningsavtal shares text, icon and image in one proposal and
  removes the latest image”.
- “BILD-06: Försäkringsavtal shares text, icon and image in one proposal and
  removes the latest image”.
- “BILD-06: Egen bildtyp shares text, icon and image in one proposal and removes
  the latest image”.

**Steg:**

1. Välj **Nytt objekt**. Fyll namn och beskrivning och välj den aktuella
   typen. Öppna **Livscykel och utseende**. Sök cykel under **Ikon**, välj
   **Cykel** och välj den första giltiga bilden. Kontrollera förhandsbilden.
   Inget ska ännu finnas i utkastet.
2. Välj **Lägg i utkastet och stäng**. Granska hela objektförslaget med text,
   ikon och bild. Spara hela utkastet och läs kvittot.
3. Redigera objektet igen. Skriv en ny beskrivning i Grunduppgifter,
   öppna Livscykel och utseende och välj den andra giltiga bilden.
   Välj **Lägg i utkastet och stäng** utan att spara gemensamt.
4. Redigera igen och öppna Livscykel och utseende. Avbryt filväljaren utan
   fil. Välj sedan `fel.png` och **Lägg i utkastet och stäng**. Läs felet:
   formuläret ska finnas kvar och det senaste giltiga förslaget är oförändrat.
5. Välj **Ta bort profilbilden ur formuläret**. Ingen förhandsbild visas.
   Kontrollera att cykelikonen fortfarande är vald och välj
   **Lägg i utkastet och stäng**.
6. Granska det enda objektförslaget med ny text och utan bild. Spara hela
   utkastet. Läs kvittot och historiken för båda sparandena.

**Förväntat resultat:**

- Samma flöde fungerar för alla förifyllda typer och den egna typen.
- Text, ikon och bild hör till samma objekt med samma identitet och typ.
  Ett uttryckligt helt sparande delar dem tillsammans med ett kvitto.
- Avbrutet eller ogiltigt filval ändrar inte det senaste giltiga förslaget.
  Privat bildbyte och borttagning ändrar inte det tidigare gemensamma objektet.
- Borttagningen föreslår ingen bild och bevarar vald ikon och den nya texten.
  Det andra kvittot visar den första sparade bilden före ändringen och
  ingen bild efteråt. Historiken innehåller de två hela sparandena.

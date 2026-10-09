# Manuella testfall för objekttyper och egna fält

Testfallen hjälper den som provar Skyttel att kontrollera gemensamma
definitioner, privata förslag, frivilliga fält, typbyten och samtidiga
ändringar samt namngivna avsnitt med bevarade fältvärden.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

- Alex är administratör i testhushållet och loggar in med Google.
- Lo är vanlig medlem i samma hushåll och använder en annan webbläsarprofil.
  Alex bjuder in Lo enligt [tillgångsguiden](../user-guide/access.md).
- Använd endast påhittade uppgifter. Alla prov gäller en separat
  testinstallation med riktig SQLite, aldrig ett verkligt hushåll.

## Allmän förberedelse

Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor) när
fallen anger formulär, samtal, profil eller administration.

Välj **Tabell** och använd radens **Redigera [objektets namn]** för att
öppna hela objektformuläret. För samband väljer du **Samband för [namn]**
och **Redigera samband** vid det aktuella sambandet. Nytt objekt öppnas
från kartans verktyg. Att bara markera en rad öppnar inte ett formulär.

Granska ett beständigt förslag genom **Skriv till Skyttel → Visa utkastet**
och radens **Visa förslaget: [namn]**. Stäng fullständig läsning med krysset.
Spara separat med utkastets sparikon och vänta på **Utkastet är sparat**.
Stäng textvyn före nästa steg i Tabell, Karta eller Inställningar.

1. Starta appen enligt
   [provförberedelsen](../development/devcontainer.md#disposable-local-database).
   Börja varje fall i ett nytt testhushåll utan privata förslag.
2. Ha båda profilerna öppna när fallet använder två medlemmar. Använd
   [typguiden](../user-guide/object-types.md) för att hitta formulären.
3. Vid kontroll av publika HTTP-svar, använd webbläsarens nätverkspanel
   för den egna inloggade profilen. Kartan läses på
   `/api/households/<hushållets id>/map`, historiken på samma adress med
   `/history`. Hushållets ID finns i kartans vanliga nätverksbegäran.
   Skriv inte inloggningsuppgifter eller testinnehåll i offentliga rapporter.

### Skicka ett felaktigt fältvärde med aktuell utkastversion

Använd detta kontrollsteg i TYP-05 och TYP-07. Ett lokalt avvisat formulär
skickar ingen begäran att kopiera. Lägg därför först det giltiga
objektförslaget i utkastet enligt fallet. Kopiera därefter endast JSON-kroppen
från den lyckade `POST /api/households/<id>/map/draft` i nätverkspanelen.
Anteckna hushållets ID och fältets ID under `value.customValues` i kroppen.
Fältets visningsnamn är inte dess ID.

Låt båda användarna avstå från andra ändringar under kontrollen. Kör koden
nedan i den inloggade profilens Console. Klistra in den giltiga JSON-kroppen,
hushållets ID, fältets ID och fallets ogiltiga värde i frågorna. Koden läser
aktuella versioner och ändrar bara det angivna fältet. Den kopierade
begärans gamla `version` är redan förbrukad och får inte återanvändas.

<!-- markdownlint-disable MD013 -->
```js
await (async () => {
  const body = JSON.parse(prompt('Giltig JSON-kropp från map/draft'));
  const householdId = prompt('Hushållets ID');
  const fieldId = prompt('Fältets ID i value.customValues');
  const invalidValue = prompt('Ogiltigt värde: 2026-02-30 eller fel');
  if (!Object.hasOwn(body.value?.customValues ?? {}, fieldId)) {
    throw new Error('Fältet saknas i den kopierade begäran');
  }
  const path = `/api/households/${encodeURIComponent(householdId)}/map`;
  const read = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Läsning misslyckades:
    ${response.status}`);
    return response.json();
  };
  const before = await read(path);
  const historyBefore = await read(`${path}/history`);
  const identity = await read('/api/version');
  body.version = before.draft.version;
  body.contentVersion = before.contentVersion;
  body.value.customValues[fieldId] = invalidValue;
  const response = await fetch(`${path}/draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Skyttel-Build': `${identity.commit}:${identity.version}`,
    },
    body: JSON.stringify(body),
  });
  console.log({
    status: response.status,
    error: (await response.json()).error,
    unchangedMap: JSON.stringify(before) === JSON.stringify(await read(path)),
    unchangedHistory:
      JSON.stringify(historyBefore) === JSON.stringify(await
      read(`${path}/history`)),
  });
})();
```
<!-- markdownlint-enable MD013 -->

Resultatet ska vara `status: 400`, `error: "invalid_request"`,
`unchangedMap: true` och `unchangedHistory: true`. HTTP 409 betyder att en
versionskontroll stoppar begäran; det är inte ett godkänt valideringsprov.
Hämta då ett nytt giltigt underlag och gör om kontrollen utan samtidiga
ändringar. Koden sparar inte hela utkastet och ska inte ändra något.

## Definitioner och fält

### TYP-01: Definition och objekt sparas tillsammans med beständigt kvitto

**Syfte:** Kontrollera samma utkast, sparande och historik för typ och objekt.

**Användare:** Alex.

**Förutsättningar:** Typen Solcellsanläggning saknas.

**Integrationstest:**
[object-types.spec.ts](../../tests/integration/object-types.spec.ts), TYP-01.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/object-types.spec.ts",
    "caseId": "TYP-01"
  },
  "reference": "Chromium på dator; syntetiska uppgifter i ett separat provhushåll.",
  "outcomes": [
    "Namnlös typ och namnlöst fält stoppas med fokus på respektive fält.",
    "Typ och objekt sparas tillsammans och visas med svar och historik efter omstart."
  ],
  "evidence": [
    {
      "kind": "technical",
      "spec": "tests/integration/object-types.spec.ts",
      "title": "custom definitions and four optional fields share one durable save and history",
      "purpose": "Separat HTTP-verifiering av beständighet, avvisning och oförändrat underlag; utför inte formulärstegen."
    }
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna Inställningar → Typer och egna fält → Ny objekttyp. Försök
   lägga det tomma förslaget i utkastet. Typens namn får fokus.
2. Ange Solcellsanläggning och beskrivningen Hushållets elproduktion.
   Lägg till ett fält utan namn och försök lägga förslaget i utkastet.
   Fältets namn får fokus. Ange Leverantör som text. Lägg också till
   Effekt som tal, Installationsdatum som datum och Batteri som ja/nej.
   Lägg definitionen i utkastet och läs återkopplingen.
3. Återgå till kartan. Skapa Paneler på taket av Solcellsanläggning.
   Öppna Egna fält. Ange Exempelsol, `12.5` och `2026-09-01`.
   Lämna Batteri obesvarat och lägg objektet i utkastet.
4. Starta om provinstallationen och ladda om. Öppna Visa utkastet och
   kontrollera Solcellsanläggning och Paneler på taket. Spara hela utkastet
   och vänta på Utkastet är sparat. Stäng textvyn.
5. Starta om igen och ladda om. Öppna Tabell → Redigera Paneler på taket
   → Egna fält. Kontrollera alla tre svar och obesvarat Batteri.
   Välj Avbryt. Öppna Rapporter → Visa ändringarna för sparandet.
   Läs typens namn, Leverantör, Exempelsol, Alex och tidpunkten.

**Förväntat resultat:**

- Namnlös typ och namnlöst fält stoppas var för sig med fokus på felet.
- Typ och objekt återkommer i samma utkast efter omstart och sparas
  tillsammans. Svaren, obesvarat Batteri och läsbar historik består.
- Det separata tekniska underlaget kontrollerar exakt kvitto, fältlista,
  historik och återspelning av samma sparbegäran; UI-stegen gör inte det.

### TYP-02: Fyra frivilliga fält kan lämnas öppna, fyllas i och rättas

**Syfte:** Skilja obesvarat från nej genom formulär, utkast och omladdning.

**Användare:** Alex.

**Förutsättningar:** Solcellsanläggning och Paneler på taket saknas.

**Integrationstest:**
[object-types.spec.ts](../../tests/integration/object-types.spec.ts), TYP-02.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/object-types.spec.ts",
    "caseId": "TYP-02"
  },
  "reference": "Chromium på dator; syntetiska uppgifter i ett separat provhushåll.",
  "outcomes": [
    "Obesvarat Batteri skiljs från Nej.",
    "Alla fyra fältsvar och rättelser består efter omladdning."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Skapa samma typ och fyra fält som i TYP-01. Skapa Paneler på taket men
   öppna Egna fält och lämna alla fälten obesvarade. Lägg båda förslagen
   i utkastet.
2. Ladda om och öppna objektet. Kontrollera tomma text-, tal- och datumfält
   samt **Obesvarat** för Batteri i Egna fält. Välj Avbryt i det
   oförändrade formuläret och spara hela utkastet.
3. Ladda om. Ange Exempelsol, `12.5`, `2026-09-01` och **Nej**.
   Lägg i utkastet och kontrollera **Batteri: Nej**. Spara och ladda om.
4. Rätta till Ny leverantör, `-14.25`, `2026-09-02` och **Ja**. Granska, spara
   och ladda om igen. Öppna objektets detaljer.

**Förväntat resultat:**

- Alla fält kan sparas obesvarade. Obesvarat är skilt från nej.
- Värden och rättelser finns kvar genom sparande och omladdning.
- Definition och objekt granskas tillsammans före första sparandet.

### TYP-03: Medlemmar delar typer och kan rätta använda definitioner

**Syfte:** Kontrollera delning, privata förslag och redigerbara förifyllda
typer.

**Användare:** Alex och Lo.

**Förutsättningar:** Lo är vanlig medlem. Inga privata förslag finns.

**Separat förberedelse:** Skapa följande tillstånd före browserstegen.
Automatiken förbereder motsvarande typer och utkast via publika HTTP-anrop;
denna förberedelse räknas inte som bevis för typformulärets hela flöde.
Återställ genom ett nytt provhushåll mellan körningar.

1. Lo skapar Solcellsanläggning med textfältet Anteckning och lägger typen
   i sitt utkast. Alex laddar om och kontrollerar att typen inte visas.
   Lo sparar definitionen. Alex laddar om och väljer typen för Paneler.
2. Alex anger Privat värde i Anteckning och lägger objektet i utkastet.
   Lo försöker ändra Anteckning till tal och lägger typförslaget i utkastet.
3. Kontrollera det begripliga felet. Lo behåller text som värdeslag,
   ändrar typens namn till Solkraft, fältnamnet till Kommentar och båda
   beskrivningarna. Lo lägger också till ett nytt talfält som heter
   Anteckning och sparar definitionen.

**Integrationstest:**
[object-types.spec.ts](../../tests/integration/object-types.spec.ts), TYP-03.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/object-types.spec.ts",
    "caseId": "TYP-03"
  },
  "reference": "Chromium på dator; syntetiska uppgifter i ett separat provhushåll.",
  "outcomes": [
    "Ändrat värdeslag avvisas när fältet används i annat privat utkast.",
    "Aktuellt Kommentar behåller sitt värde och nytt Anteckning förblir obesvarat.",
    "Medlem kan skapa objekt och ändra den använda förifyllda typen."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Alex laddar om sitt äldre utkast. Öppna **Granska konflikter** och
   läs anvisningen om ändrad typdefinition för ett ännu inte sparat objekt.
   Stäng med Escape. Välj **Tabell → Redigera Paneler → Egna fält**.
   Granska **Kommentar: Privat värde** och tom **Anteckning** med tal som
   värdeslag. Välj **Lägg i utkastet och stäng** och spara därefter separat
   från **Skriv till Skyttel → Visa utkastet**.
2. Lo skapar Medlemmens paneler av typen Solkraft. Öppna **Egna fält**,
   fyll i **Kommentar** och lämna **Anteckning** obesvarat. Lägg objektet
   i utkastet och spara separat. Stäng textvyn, skapa dessutom Lo av typen
   Person och spara separat.
3. Lo ändrar namn och beskrivning på den använda typen Person till
   Människa och En person i kartan via **Inställningar → Typer och egna fält**.
   Återgå till kartan och spara separat. Ladda om, stäng textvyn och öppna
   **Nytt objekt**.

**Förväntat resultat:**

- En privat typ avslöjas inte eller används av en annan medlem.
- En använd fälttyp ändras inte. Ett nytt fält med liknande namn får eget
  värde; Kommentar behåller Privat värde utan automatisk koppling.
- Paneler har ingen tidigare sparad sida och beskrivs inte som borttaget.
  Det tidigare textfältets identitet och värde består efter uttrycklig
  granskning av aktuell definition. Det nya talfältet har en annan identitet och
  förblir obesvarat. Öppning och stängning löser inget; den bekräftade
  tilläggshandlingen uppdaterar bara utkastet innan separat sparande.
- Vanliga medlemmar kan använda gemensamma fält och rätta förifyllda typer.
  Formulären visar de aktuella namnen efter sparande och omladdning.

### TYP-04: Samtidiga definitionsändringar kräver ett nytt konfliktval

**Syfte:** Stoppa hela utkastet, bevara oberoende ändringar och visa tidigare
definition i historiken.

**Användare:** Alex och Lo.

**Förutsättningar:** Båda ser den förifyllda typen Person.

**Separat förberedelse:** Skapa följande tillstånd före browserstegen.
Automatiken förbereder motsvarande typer och utkast via publika HTTP-anrop;
denna förberedelse räknas inte som bevis för typformulärets hela flöde.
Återställ genom ett nytt provhushåll mellan körningar.

1. Alex ändrar Person till Människor med beskrivningen Mitt förslag och
   lägger definitionen i utkastet. Skapa Alex av typen Människor i samma utkast.
2. Lo ändrar Person till Personer med beskrivningen Annans rättelse och
   lägger till textfältet Smeknamn. Lo sparar hela sitt utkast.

**Integrationstest:**
[object-types.spec.ts](../../tests/integration/object-types.spec.ts), TYP-04.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/object-types.spec.ts",
    "caseId": "TYP-04"
  },
  "reference": "Chromium på dator; syntetiska uppgifter i ett separat provhushåll.",
  "outcomes": [
    "Hela äldre utkastet stoppas före granskning.",
    "Eget namn och egen beskrivning sparas med den andra medlemmens Smeknamn."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Alex laddar om och öppnar den markerade konflikten i sitt utkast.
   Den ändrade gemensamma definitionen stoppar hela det äldre sparandet.
   Automatiken kontrollerar den avvisningen via HTTP före browsergranskningen.
2. Öppna **Granska konflikter**. Välj eget namn och egen beskrivning,
   men sparade Egna fält med Smeknamn. Välj **Lägg valen i utkastet**
   och stäng med Escape. Kontrollera att inget sparas förrän
   Alex uttryckligen väljer **Spara hela utkastet** igen.
3. Starta om och ladda om. Öppna Tabell → Redigera Alex → Egna fält.
   Kontrollera att Smeknamn finns och är obesvarat. Historikens exakta
   tidigare definition och revision kontrolleras som tekniskt underlag.

**Förväntat resultat:**

- Den aktuella definitionen och förslaget visas tillsammans vid konflikten.
- Senaste sparandet omfattar definitionen Människor och objektet Alex.
  Beskrivningen är Mitt förslag. Los oberoende tillägg Smeknamn finns kvar
  i definitionen och i objektets formulär.
- Historiken bevarar Personer med Annans rättelse och Smeknamn som tidigare
  definition. Objektets sparade typdefinition innehåller också Smeknamn.

### TYP-05: Felaktiga värden och ny användning stoppar hela sparandet

**Syfte:** Kontrollera värdevalidering och ny användning mellan förslag och
spara.

**Användare:** Alex och Lo.

**Förutsättningar:** Solkraft är sparad med Effekt som tal och Datum som
datum. Inga objekt använder fälten.

**Separat förberedelse:** Skapa följande tillstånd före browserstegen.
Automatiken förbereder motsvarande typer och utkast via publika HTTP-anrop;
denna förberedelse räknas inte som bevis för typformulärets hela flöde.
Återställ genom ett nytt provhushåll mellan körningar.

1. Alex föreslår att det oanvända Effekt blir text. Lägg också ett
   oberoende nytt Person-objekt med namnet Oberoende förslag i samma utkast.
2. Skapa ett förslag av typen Solkraft med det giltiga datumet
   `2026-02-28` och lägg förslaget i utkastet. Följ kontrollsteget
   [för felaktigt
   fältvärde](#skicka-ett-felaktigt-fältvärde-med-aktuell-utkastversion)
   för Datum med värdet `2026-02-30`. Kontrollera HTTP 400 och att kartan,
   hela utkastet och historiken är oförändrade jämfört med före återförsöket.
3. Lo lägger Hemligt förslag med Effekt `12` i sitt privata utkast utan
   att spara. Alex har fortfarande sitt osparade utkast.

**Integrationstest:**
[object-types.spec.ts](../../tests/integration/object-types.spec.ts), TYP-05.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/object-types.spec.ts",
    "caseId": "TYP-05"
  },
  "reference": "Chromium på dator; syntetiska uppgifter i ett separat provhushåll.",
  "outcomes": [
    "Sparförsöket avvisas utan att avslöja den andra medlemmens privata objekt.",
    "Hela eget utkast och sparad definition bevaras."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Alex öppnar Skriv till Skyttel → Visa utkastet och väljer Spara hela
   utkastet. Läs felet som uppmanar till ett nytt fält. Kontrollera att
   meddelandet inte avslöjar Los hemliga förslag. Stäng dialogen och
   kontrollera att de egna förslagen finns kvar. Spara inte igen.

**Förväntat resultat:**

- Felaktigt datum ändrar inget i kartan eller utkastet.
- Ny privat användning hindrar byte av värdeslag även vid sparandet.
  Felet säger att ett nytt fält behövs utan att avslöja Los privata innehåll.
- Ingen del sparas, inte heller Person-objektet. Tidigare fältdefinition,
  hela utkastet och historiken är oförändrade.

## Avsnitt och visning av egna fält

### TYP-10: Gemensamma egenskaper behåller värden genom placering och typbyte

**Syfte:** Placera inbyggda uppgifter utan att förlora ekonomisk betydelse,
säkerhet, datum eller tidigare egna värden.

**Användare:** Alex.

**Förutsättningar:** Börja med ett tomt hushåll. Skapa och spara Annan typ
utan avsnitt eller egna fält. Referensen körs vid 1280 × 900; de smala och
korta browserflödena är separata TYP-15–17. Fysisk tangentbordsanvändning
med verklig webbläsarzoom utförs separat i TYP-23.

**Integrationstest:**
[object-builtins.spec.ts](../../tests/integration/object-builtins.spec.ts), TYP-10.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/object-builtins.spec.ts",
    "caseId": "TYP-10"
  },
  "reference": "1280 × 900; ljust och mörkt tema skyddar avsnittens omflöde.",
  "outcomes": [
    "Saknat namn och känt belopp utan värde stoppas med felsammanfattningsfokus.",
    "Skuldens säkerhet och datum består vid döljning, typbyte och historisk läsning."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna Inställningar → Typer och egna fält. Skapa Husavtal och avsnittet
   Avtalet. Lägg till gemensamma Beskrivning och Senast uppgiven skuld samt
   ett eget textfält Anteckning. Ändra skuldens visningsnamn till Skuld.
2. Flytta Skuld upp med tangentbordet, dölj den och återvisa i Avtalet.
   Kontrollera fokus efter varje handling. Lägg till gemensamma Startdatum
   och placera i ett nytt avsnitt Datum. Kontrollera ljust och mörkt tema.
   Lägg typförslaget i utkastet.
3. Skapa Husets lån av typen Husavtal. Försök först lägga ett namnlöst
   objekt i utkastet: felsammanfattningen ska få fokus. Följ länken till Namn.
   Ange Gemensam avtalstext som
   beskrivning och Eget värde som Anteckning. Ange Skuld `12 300` som
   **Osäkert uppgivet**, med uppgiftsdatum `2026-09-01`, och Startdatum
   `2026-08-01` som känt.
4. Under Ekonomiska uppgifter, välj **Okänt** för Pris
   och **Uttryckligen inget** för Valuta. Välj **Känt** för Beviljat
   kreditutrymme utan belopp. Fäll ihop avsnittet och försök lägga i
   utkastet. Felsammanfattningen ska få fokus. Följ beloppets länk; avsnittet
   öppnas och det tomma beloppet får fokus. Välj därefter
   **Ej uppgivet** för kreditutrymmet och lägg objektet i utkastet.
5. Öppna Utkastet via Skriv till Skyttel och spara med sparikonen.
   Starta om installationen och ladda
   om. Dölj Skuld i typdefinitionen och lägg förslaget i utkastet. Öppna
   Tabell och fäll ut Husets lån för att läsa alla uppgifter direkt i raden.
   Läs den dolda skulden med säkerhet och datum.
   Fäll ihop raden, öppna Utkastet och spara med sparikonen.
6. Redigera Husets lån och välj Annan typ. Kontrollera beskrivning och
   ekonomiska uppgifter. Granska det tidigare egna värdet och bekräfta
   **Ta bort fältvärdena och byt typ** i förlustdialogen. Lägg i utkastet
   och spara separat med utkastets sparikon.
7. Välj **Rapporter** och **Visa ändringarna** för typbytet. Granska
   tidigare Anteckning och skuldens säkerhet och datum. Starta om och
   kontrollera att Husets lån behåller den sparade nya typen.

**Förväntat resultat:**

- Egenskapernas ordning och placering kan ändras utan att deras betydelse
  ändras. En gemensam egenskap kan inte läggas till två gånger.
- Saknat namn och känt belopp utan värde stoppas med synligt fokus.
- I korta fönster går det att rulla till Nytt objekt, formulär och sparande
  även när privat förslag, status och återkoppling visas samtidigt.
- Beskrivning, skuld, säkerhet och datum består efter döljning och typbyte.
  Okänt, uttryckligen inget och ej uppgivet förblir olika tillstånd.
- Typbytet kräver hantering av det gamla egna värdet. Historiken visar
  Husavtal och Anteckning före bytet. Den sparade nya typen och de
  gemensamma uppgifterna består efter omstart.

### TYP-08: Flytta och dölj fält utan värdeförlust genom sparande och omstart

**Syfte:** Kontrollera avsnitt, fältidentiteter och atomiskt sparande med
obesvarat, noll och nej som olika uppgifter.

**Användare:** Alex.

**Förutsättningar:** Solcellsanläggning saknas. Starta ett tomt testhushåll.

**Integrationstest:**
[object-sections.spec.ts](../../tests/integration/object-sections.spec.ts), TYP-08.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/object-sections.spec.ts",
    "caseId": "TYP-08"
  },
  "reference": "Chromium på dator; syntetiska uppgifter i ett separat provhushåll.",
  "outcomes": [
    "Dold Effekt återkommer med noll och Leverantör, datum och Nej består.",
    "Reserv förblir obesvarat efter gemensamt sparande och omstart."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna Inställningar och Typer och egna fält. Skapa Solcellsanläggning.
   Byt avsnittets namn till Uppgifter. Lägg till Service och flytta det upp.
2. Lägg till Leverantör som text, Effekt som tal, Datum som datum och
   Batteri samt Reserv som ja/nej. Välj Uppgifter för samtliga fält.
   Lägg typförslaget i utkastet.
3. Återgå till kartan och skapa Paneler av den nya typen. Öppna avsnittet
   **Uppgifter**. Ange Exempelsol,
   `0`, `2026-09-01` och **Nej** för Batteri. Lämna Reserv obesvarat.
   Lägg objektet i samma utkast.
4. Öppna typdefinitionen igen. Dölj Effekt och flytta Leverantör till
   Service. Lägg typförslaget i utkastet. Granska definition och objekt;
   de finns ännu inte i den gemensamma kartan.
5. Spara hela utkastet. Starta om testinstallationen och ladda om sidan.
   Öppna Paneler för redigering. Kontrollera att Effekt inte visas,
   öppna **Uppgifter** och kontrollera att Batteri är Nej och Reserv är
   Obesvarat. Stäng det oförändrade formuläret med **Avbryt**.
6. Återvisa Effekt i Service genom typdefinitionen och lägg förslaget
   i utkastet. Öppna objektformuläret igen och växla mellan **Service**
   och **Uppgifter** för att läsa alla svar.

**Förväntat resultat:**

- Service visas före Uppgifter. Fälten ligger i sina valda avsnitt.
- Effekt återkommer med `0`; Leverantör, Datum och Batteri behåller sina
  exakta svar. Reserv är fortfarande obesvarat. Inget fält byter identitet.
- Definition och värden sparas tillsammans. Döljning tar inte bort värden.

### TYP-09: Medlemmar ordnar förifyllda typer med tangentbord och bevarat arbete

**Syfte:** Kontrollera standardpresentation, fokus och oskickade
definitionsändringar i Inställningar på mobil och dator.

**Användare:** Lo, vanlig medlem. Alex förbereder den gemensamma typen.

**Förutsättningar:** Person har textfältet Anteckning i Egna fält.
Använd 1280 CSS-pixlar. De smala flödena har egna fall TYP-13 och TYP-14.

**Integrationstest:**
[object-sections.spec.ts](../../tests/integration/object-sections.spec.ts), TYP-09.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/object-sections.spec.ts",
    "caseId": "TYP-09"
  },
  "reference": "1280 CSS-pixlar, vanlig medlem; båda teman skyddar kontrollernas läsbarhet.",
  "outcomes": [
    "Medlem kan ordna avsnitt, dölja fält och återgå med oskickad text kvar.",
    "Kontroller och fel får synligt fokus; sparad dold placering består efter omstart."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lo öppnar Inställningar, Typer och egna fält och Ändra typ: Person.
   Kontrollera att Anteckning visas i Egna fält.
2. Byt avsnittets namn till Personuppgifter. Aktivera Lägg till avsnitt
   med tangentbord och skriv Kontakt direkt i det fokuserade namnfältet.
3. Aktivera Flytta avsnittet Kontakt upp med tangentbord. Kontrollera
   fokus på det flyttade namnfältet. Välj Kontakt för Anteckning och
   ändra fältbeskrivningen till Bevara även oskickad beskrivning.
4. Återgå till kartan och tillbaka till typinställningarna. Kontrollera
   att ordningen, placeringen och oskickad beskrivning finns kvar.
5. Dölj Anteckning. Kontrollera fokus på Visa i avsnitt. Ta bort det
   tomma Personuppgifter; fokus ska gå till Lägg till avsnitt.
6. Lägg till ett avsnitt med bara mellanslag i namnet. Fäll ihop Avsnitt
   och försök lägga förslaget i utkastet. Avsnitt öppnas och namnfältet
   får fokus. Ge det namnet Tillfälligt och ta sedan bort det tomma avsnittet.
7. Prova ljust och mörkt tema och navigera kontrollerna med tangentbord.
   Lägg förslaget i utkastet. Alex kontrollerar sin egen karta.
8. Vid 1280 pixlar: återgå till kartan och spara hela utkastet. Stäng
   textvyn, starta om och ladda om. Öppna Person i typinställningarna och
   kontrollera Kontakt, fältbeskrivningen och dold Anteckning.

**Förväntat resultat:**

- Vanliga medlemmar kan redigera förifyllda typer. Ett upptaget avsnitt
  kan inte tas bort; ett tomt avsnitt kan tas bort.
- Kontroller och synligt fokus går att nå utan vågrät sidrullning.
  Flytt och döljning har tangentbordsalternativ. Arbete bevaras mellan vyer.
- Los utkast behåller Antecknings identitet, beskrivning och dold placering.
  Alex ser fortfarande den sparade definitionen tills Lo sparar hela utkastet.

## Byte av objekttyp

### TYP-06: Typbyte bevarar objekt, samband och tidigare fältbetydelse

**Syfte:** Granska gamla värden, rätta nya fält och läsa ett sparat typbyte.

**Användare:** Alex.

**Förutsättningar:** Skapa Cykel med Nummer som text och Försäkrad som
ja/nej. Skapa Motorfordon med samma fältnamn men Nummer som tal. Spara
Alex blå cykel av typen Cykel med Nummer `SYNTH-42` och Försäkrad **Nej**.
Spara Garaget och ett samband från cykeln till garaget. Anteckna objektets
och sambandets ID från kartans publika HTTP-svar.

**Integrationstest:**
[type-change.spec.ts](../../tests/integration/type-change.spec.ts), TYP-06.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/type-change.spec.ts",
    "caseId": "TYP-06"
  },
  "reference": "Chromium på dator; syntetiska uppgifter i ett separat provhushåll.",
  "outcomes": [
    "Typbyte kräver uttryckligt samtycke och kopierar inga egna svar.",
    "Historiken behåller gamla fältbetydelser; objekt och samband består efter omstart."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Separat operatörsförberedelse:**

Anteckna objektets och sambandets ID från kartans publika HTTP-svar enligt
förutsättningarna och allmän Network-förberedelse. Efter det verkliga sparandet
i UI-steg 3: jämför de nya publika svarens exakta ID med de ursprungliga.
Meddela **Samma cykel och samband är bevarade** först efter båda jämförelserna.
Detta är separat protokollunderlag;
[type-change.spec.ts](../../tests/integration/type-change.spec.ts) behåller sina
exakta identitetskontroller. Behåll samma hushåll och provdatabas genom
omstarterna och återställ enligt allmän förberedelse.

**Steg:**

1. Öppna Alex blå cykel och välj Motorfordon som **Objekttyp**. Kontrollera
   dialogen **Ta bort tidigare egna fält?** med Nummer `SYNTH-42` och
   Försäkrad **Nej**. Bekräfta **Ta bort fältvärdena och byt typ**.
   Öppna **Egna fält**: Nummer är tomt och Försäkrad är **Obesvarat**.
2. Ange `42` i det nya Nummer. Lämna Försäkrad obesvarat och välj
   **Lägg i utkastet och stäng**.
   Granska båda typerna, gamla och nya Nummer samt obesvarat Försäkrad.
3. Starta om installationen och ladda om. Kontrollera samma privata
   förslag. Spara hela utkastet. Öppna cykeln och läs Motorfordon, Nummer 42,
   obesvarat Försäkrad och sambandet till Garaget. Invänta operatörens
   bekräftelse att samma objekt och samband har bevarats.
4. Byt typdefinitionens namn från Cykel till Trampcykel och dess fältnamn
   till Tidigare Nummer och Tidigare Försäkrad. Spara. Starta om och öppna
   **Rapporter**. Välj **Visa ändringarna** vid typbytet från Cykel
   till Motorfordon.
5. Kontrollera tidigare typnamn, Nummer `SYNTH-42`, sparande användare
   och tidpunkt. Starta om och läs kartan igen. Kontrollera att
   den sparade nya typen och sambandet är oförändrade.

**Förväntat resultat:**

- Inga gamla värden kopieras eller konverteras till den nya typens fält.
  Historiken behåller de ursprungliga namnen trots dagens namnbyte.
- Typbytet behåller objektets och sambandets identiteter. Det sparar
  talet `42` och obesvarat Försäkrad. Historiken visar texten `SYNTH-42`
  och uttryckligt **Nej** före bytet.
- Sparat utkast och historik finns kvar efter normal omstart.

### TYP-11: Upprepade typbyten bevarar gemensamma uppgifter och gamla svar

**Syfte:** Byt mellan typer med lika egna fält utan automatisk överföring
eller förlust av gemensamma uppgifter, bild, ikon och samband.

**Användare:** Alex.

**Förutsättningar:** Skapa Cykel och Motorfordon med avsnittet Egenskaper
och samma egna fältnamn och värdeslag: Nummer som text, Antal som tal
och Försäkrad som ja/nej. Spara Alex blå cykel av typen Cykel med
Nummer `A-42`, Antal `0`, Försäkrad **Nej**, identiteten
**Ospecificerat objekt** och beskrivningen **Gemensamma uppgifter som
ska finnas kvar**. Välj ikonen Cykel och en påhittad profilbild. Spara
Garaget och ett osäkert uppgivet samband från cykeln till garaget.
På cykeln ska följande gemensamma ekonomiska uppgifter finnas:

- Senast uppgiven skuld: `125 000,50`, **Osäkert uppgivet**, datum `2026-09-01`.
- Beviljat kreditutrymme: **Uttryckligen inget**, datum `2026-09-02`.
- Utnyttjad kredit: `0`, **Känt**, datum `2026-09-03`.
- Pris: **Okänt**.

**Integrationstest:**
[type-change.spec.ts](../../tests/integration/type-change.spec.ts), TYP-11.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/type-change.spec.ts",
    "caseId": "TYP-11"
  },
  "reference": "1280 CSS-pixlar, ljust tema; hela typbyteskedjan med sparande och omstart.",
  "outcomes": [
    "Varje upprepat typbyte kräver nytt samtycke till aktuella egna svar.",
    "Gemensamma fakta, bild och samband består genom sparande och omstart."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna cykelns redigering och byt till Motorfordon. Läs de tidigare
   svaren i förlustdialogen och bekräfta borttagningen. Öppna Egenskaper:
   alla egna fält är obesvarade. Ange Nummer B-84, Antal 8 och Försäkrad Ja.
2. Öppna Grunduppgifter och byt tillbaka till Cykel. Läs B-84, 8 och Ja
   i förlustdialogen och bekräfta igen. Ange A-126, 0 och Nej i Egenskaper.
3. Byt åter till Motorfordon och bekräfta borttagningen av A-126, 0 och Nej.
   Fyll endast Nummer B-final och lämna Antal och Försäkrad obesvarade.
4. Kontrollera namn, identitet och beskrivning i Grunduppgifter, bilden i
   Livscykel och utseende och ekonomiska uppgifter i Ekonomiska uppgifter. Välj
   Lägg i utkastet och stäng. Den sparade kartan har fortfarande den gamla
   typen.
5. Starta om installationen, ladda om och granska förslaget. Spara hela
   utkastet uttryckligen. Starta om och granska cykeln och sambandet igen.

**Förväntat resultat:**

- Varje typbyte börjar med obesvarade egna fält, även när namn och
  värdeslag stämmer. Tidigare noll och Nej blandas inte ihop med obesvarat.
  Förlustdialogen visar de aktuella svar som just detta typbyte kastar.
- Varje byte kräver en ny uttrycklig bekräftelse före placering i utkastet.
  Namn, identitet, beskrivning, hela ekonomiska uppgifter, bild och ikon
  finns kvar. Sambandet behåller sina ändpunkter och sin osäkerhet.
- Efter omstart och uttryckligt sparande har samma objekt typen Motorfordon
  och bara Nummer `B-final` bland de egna svaren. Gemensamma uppgifter,
  bild, ikon och samband är oförändrade. Ingen dubblett skapas.

### TYP-07: Fel och samtidiga ändringar stoppar hela typbytet

**Syfte:** Kontrollera atomiskt sparande, nytt sparbesked och eget utkast.

**Användare:** Alex och Lo.

**Förutsättningar:** Samma sparade typer, objekt och samband som i TYP-06.
Lo har aktuell tillgång till hushållet.

**Integrationstest:**
[type-change.spec.ts](../../tests/integration/type-change.spec.ts), TYP-07.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/type-change.spec.ts",
    "caseId": "TYP-07"
  },
  "reference": "Chromium på dator; syntetiska uppgifter i ett separat provhushåll.",
  "outcomes": [
    "Ändrad definition stoppar hela utkastet tills aktuellt val och nytt sparande.",
    "Senare Nummer 43 förblir privat efter omstart medan kartan behåller 42."
  ],
  "evidence": [
    {
      "kind": "technical",
      "spec": "tests/integration/type-change.spec.ts",
      "title": "invalid values and concurrent definitions block whole saves until fresh choices and preserve later private fields",
      "purpose": "Separat HTTP-verifiering av beständighet, avvisning och oförändrat underlag; utför inte formulärstegen."
    }
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Separat förberedelse:** Skapa och spara typer, objekt och samband enligt
TYP-06. Lo ska vara vanlig medlem i samma hushåll. Protokolltestet i
metadata bevarar kontroll av felaktigt Nummer, gamla utkastversioner och
exakt historik. För felaktigt Nummer kan koden i allmän förberedelse köras
med ett giltigt objektförslag och värdet `fel`; detta är separat tekniskt
underlag, inte en formulärhandling.

**Steg:**

1. Alex redigerar Garaget till Eget namn och lägger ändringen i utkastet.
   Öppna Alex blå cykel, välj Motorfordon och bekräfta borttagning av de
   tidigare egna svaren. Ange Nummer `42` och Försäkrad Nej i Egna fält.
   Lägg typbytet i samma utkast.
2. Lo öppnar Motorfordon i typinställningarna, ändrar beskrivningen till
   Uppdaterad definition och sparar sitt utkast.
3. Alex väljer Spara hela utkastet. Läs avvisningen, stäng dialogen och
   textvyn och ladda om. Garagets sparade namn och cykelns sparade typ
   ska ännu vara oförändrade.
4. Öppna Granska konflikter, jämför sparad Cykel med Motorfordon och välj det
   egna
   förslaget. Lägg valen i utkastet och stäng med Escape. Kontrollera att
   valet ännu inte sparar kartan. Spara därefter hela utkastet uttryckligen.
5. Redigera cykeln igen, ändra Nummer till `43` och lägg i utkastet utan
   att spara. Starta om och ladda om. Öppna Visa förslaget för cykeln.

**Förväntat resultat:**

- Den ändrade definitionen stoppar hela sparandet. Ett aktuellt val och
  ett nytt uttryckligt sparande behövs för både namn och typbyte.
- Nummer 43 återkommer i det privata förslaget. Kartan behåller det
  sparade Nummer 42, Försäkrad Nej och Garagets Eget namn.
- Separat tekniskt underlag bevarar avvisning av felaktiga värden och
  gammalt sparbesked samt det sparade kvittot efter omstart.

### TYP-12: Konfigurerad fältordning i formulär och fullständig läsning

**Syfte:** Kontrollera samma uttryckliga ordning i formuläret, utkastets
läsning och tabellen, med bevarade svar som är noll och Nej.

**Användare:** Alex.

**Förutsättningar:** Ett nytt testhushåll utan privata förslag. Ingen
AI-leverantör eller samtalsstart behövs. Förbered följande syntetiska typ
genom publika HTTP-anrop i den inloggade profilens Console. Ange hushållets
faktiska ID från nätverkspanelen. Kör bara på den separata testinstallationen;
koden lägger typdefinitionen i utkastet och sparar den gemensamt.

<!-- markdownlint-disable MD013 -->
```js
await (async () => {
  const householdId = prompt('Hushållets ID');
  const path = `/api/households/${encodeURIComponent(householdId)}/map`;
  const read = async () => {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Kartan kunde inte läsas');
    return response.json();
  };
  const identity = await (await fetch('/api/version')).json();
  const headers = {
    'Content-Type': 'application/json',
    'X-Skyttel-Build': `${identity.commit}:${identity.version}`,
  };
  const before = await read();
  if (before.draft.changes.length || (before.draft.objectTypes ?? []).length ||
      (before.draft.relationships ?? []).length ||
      (before.draft.relationshipTypes ?? []).length) {
    throw new Error('Börja med ett tomt utkast');
  }
  const staged = await fetch(`${path}/object-type`, {
    method: 'POST', headers,
    body: JSON.stringify({
      version: before.draft.version,
      contentVersion: before.contentVersion,
      id: 'ordered-read-type', baseRevision: null,
      value: {
        name: 'Sorterad typ', description: '',
        fields: [
          { id: 'first', name: 'Första fältet',
            description: '', kind: 'number' },
          { id: 'second', name: 'Andra fältet',
            description: '', kind: 'boolean' },
        ],
        propertyOrder: ['field:second', 'field:first'],
      },
    }),
  });
  if (staged.status !== 200) throw new Error('Typförberedelsen avvisades');
  const proposed = await read();
  const saved = await fetch(`${path}/save`, {
    method: 'POST', headers,
    body: JSON.stringify({
      version: proposed.draft.version,
      contentVersion: proposed.contentVersion,
      operationId: 'ordered-read-type-setup',
    }),
  });
  console.log({ staged: staged.status, saved: saved.status });
})();
```
<!-- markdownlint-enable MD013 -->

Resultatet ska visa `staged: 200` och `saved: 200`. Ladda därefter om sidan.
Typens lagrade fältlista är Första fältet följt av Andra fältet; dess
uttryckliga presentationsordning är Andra fältet följt av Första fältet.

**Integrationstest:**
[object-builtins.spec.ts](../../tests/integration/object-builtins.spec.ts), TYP-12.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/object-builtins.spec.ts",
    "caseId": "TYP-12"
  },
  "reference": "Chromium på dator; syntetiska uppgifter i ett separat provhushåll.",
  "outcomes": [
    "Uttrycklig ordning visar Andra fältet före Första i formulär, utkast och tabell.",
    "Nej och noll bevaras som svar genom uttryckligt sparande."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Välj Nytt objekt i kartans verktyg. Ange namnet Ordningsprov och välj
   Sorterad typ. Öppna Egna fält: Andra fältet ska stå före Första fältet.
   Välj Nej i Andra fältet och ange `0` i Första fältet.
2. Välj Lägg i utkastet och stäng. Vänta på återkopplingen om ditt utkast.
3. Välj Skriv till Skyttel och Visa utkastet. Öppna Visa förslaget:
   Ordningsprov. Kontrollera ordning och fullständiga värden och stäng
   läsningen med krysset.
4. Välj utkastets sparikon. Vänta på Utkastet är sparat och stäng textvyn.
   Välj Tabell och fäll ut Ordningsprov. Kontrollera samma ordning i raden.
   Läs fullständiga värden direkt i raden, fäll ihop med namnet och öppna igen.
   Kontrollera att fältens ordning och värden finns kvar.
5. Öppna Visa utkastet och kontrollera att inga osparade objekt återstår.
   Automatiken kontrollerar dessutom fältidentiteter och lagrade värden via
   HTTP.

**Förväntat resultat:**

- Formuläret, utkastets fullständiga läsning, tabellraden och tabellens
  fullständiga läsning visar Andra fältet före Första fältet.
- Nej och noll visas som svar, inte som obesvarade fält. Placering i
  utkastet skapar inget gemensamt objekt; uttryckligt sparande skapar det.
- Sparandet bevarar båda svaren och fältidentiteterna. Den ursprungliga
  fältlistan och den separata presentationsordningen ändras inte.

### TYP-13: Medlem ordnar avsnitt med bevarat oskickat arbete

**Syfte:** Kontrollera mobilnavigation och synligt fokus på smal sida.

**Användare:** Lo, vanlig medlem; Alex förbereder hushållet.

**Förutsättningar:** 390 pixlar.

**Separat förberedelse:** Alex förbereder Person med textfältet Anteckning i
Egna fält enligt TYP-09. Lo är vanlig medlem i samma hushåll.
Återställ genom ett nytt provhushåll mellan körningar.

**Integrationstest:**
[object-sections.spec.ts](../../tests/integration/object-sections.spec.ts), TYP-13.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/object-sections.spec.ts",
    "caseId": "TYP-13"
  },
  "reference": "390 pixlar; skyddar mobilnavigation och synligt fokus på smal sida.",
  "outcomes": [
    "Avsnittsordning och oskickad beskrivning bevaras mellan kartan och Inställningar.",
    "Döljning, borttagning och fel leder fokus till nåbar kontroll; förslaget förblir privat."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lo öppnar Inställningar, Typer och egna fält och Ändra typ: Person.
   Kontrollera att Anteckning visas i Egna fält.
2. Byt avsnittets namn till Personuppgifter. Aktivera Lägg till avsnitt
   med tangentbord och skriv Kontakt direkt i det fokuserade namnfältet.
3. Aktivera Flytta avsnittet Kontakt upp med tangentbord. Kontrollera
   fokus på det flyttade namnfältet. Välj Kontakt för Anteckning och
   ändra fältbeskrivningen till Bevara även oskickad beskrivning.
4. Återgå till kartan och tillbaka till typinställningarna. Kontrollera
   att ordningen, placeringen och oskickad beskrivning finns kvar.
5. Dölj Anteckning. Kontrollera fokus på Visa i avsnitt. Ta bort det
   tomma Personuppgifter; fokus ska gå till Lägg till avsnitt.
6. Lägg till ett avsnitt med bara mellanslag i namnet. Fäll ihop Avsnitt
   och försök lägga förslaget i utkastet. Avsnitt öppnas och namnfältet
   får fokus. Ge det namnet Tillfälligt och ta sedan bort det tomma avsnittet.
7. Prova ljust och mörkt tema och navigera kontrollerna med tangentbord.
   Lägg förslaget i utkastet. Alex kontrollerar sin egen karta.

**Förväntat resultat:**

- Avsnittsordning och oskickad beskrivning bevaras mellan kartan och
  Inställningar.
- Döljning, borttagning och fel leder fokus till nåbar kontroll; förslaget
  förblir privat.
- Detta fall slutar vid det privata förslaget. Den kompletta kedjan med
  senare sparande, historikläsning och omstart körs i referensfallet.

### TYP-14: Medlem ordnar avsnitt med bevarat oskickat arbete

**Syfte:** Kontrollera minsta breddens omflöde och fokus efter döljning.

**Användare:** Lo, vanlig medlem; Alex förbereder hushållet.

**Förutsättningar:** 320 pixlar.

**Separat förberedelse:** Alex förbereder Person med textfältet Anteckning i
Egna fält enligt TYP-09. Lo är vanlig medlem i samma hushåll.
Återställ genom ett nytt provhushåll mellan körningar.

**Integrationstest:**
[object-sections.spec.ts](../../tests/integration/object-sections.spec.ts), TYP-14.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/object-sections.spec.ts",
    "caseId": "TYP-14"
  },
  "reference": "320 pixlar; skyddar minsta breddens omflöde och fokus efter döljning.",
  "outcomes": [
    "Avsnittsordning och oskickad beskrivning bevaras mellan kartan och Inställningar.",
    "Döljning, borttagning och fel leder fokus till nåbar kontroll; förslaget förblir privat."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lo öppnar Inställningar, Typer och egna fält och Ändra typ: Person.
   Kontrollera att Anteckning visas i Egna fält.
2. Byt avsnittets namn till Personuppgifter. Aktivera Lägg till avsnitt
   med tangentbord och skriv Kontakt direkt i det fokuserade namnfältet.
3. Aktivera Flytta avsnittet Kontakt upp med tangentbord. Kontrollera
   fokus på det flyttade namnfältet. Välj Kontakt för Anteckning och
   ändra fältbeskrivningen till Bevara även oskickad beskrivning.
4. Återgå till kartan och tillbaka till typinställningarna. Kontrollera
   att ordningen, placeringen och oskickad beskrivning finns kvar.
5. Dölj Anteckning. Kontrollera fokus på Visa i avsnitt. Ta bort det
   tomma Personuppgifter; fokus ska gå till Lägg till avsnitt.
6. Lägg till ett avsnitt med bara mellanslag i namnet. Fäll ihop Avsnitt
   och försök lägga förslaget i utkastet. Avsnitt öppnas och namnfältet
   får fokus. Ge det namnet Tillfälligt och ta sedan bort det tomma avsnittet.
7. Prova ljust och mörkt tema och navigera kontrollerna med tangentbord.
   Lägg förslaget i utkastet. Alex kontrollerar sin egen karta.

**Förväntat resultat:**

- Avsnittsordning och oskickad beskrivning bevaras mellan kartan och
  Inställningar.
- Döljning, borttagning och fel leder fokus till nåbar kontroll; förslaget
  förblir privat.
- Detta fall slutar vid det privata förslaget. Den kompletta kedjan med
  senare sparande, historikläsning och omstart körs i referensfallet.

### TYP-15: Gemensamma egenskaper och fel nås i formuläret

**Syfte:** Kontrollera smalt formulär med felsammanfattning och nåbara fält.

**Användare:** Alex.

**Förutsättningar:** 390 × 900.

**Separat förberedelse:** Börja med tomt hushåll. Förbered Annan typ utan egna
fält eller avsnitt enligt TYP-10.
Återställ genom ett nytt provhushåll mellan körningar.

**Integrationstest:**
[object-builtins.spec.ts](../../tests/integration/object-builtins.spec.ts), TYP-15.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/object-builtins.spec.ts",
    "caseId": "TYP-15"
  },
  "reference": "390 × 900; skyddar smalt formulär med felsammanfattning och nåbara fält.",
  "outcomes": [
    "Namnfel och känt belopp utan värde leder till felsammanfattning och rätt fält.",
    "Skuldens säkerhet och datum, gemensam beskrivning och egna svar läggs i samma utkast."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna Inställningar → Typer och egna fält. Skapa Husavtal och avsnittet
   Avtalet. Lägg till gemensamma Beskrivning och Senast uppgiven skuld samt
   ett eget textfält Anteckning. Ändra skuldens visningsnamn till Skuld.
2. Flytta Skuld upp med tangentbordet, dölj den och återvisa i Avtalet.
   Kontrollera fokus efter varje handling. Lägg till gemensamma Startdatum
   och placera i ett nytt avsnitt Datum. Kontrollera ljust och mörkt tema.
   Lägg typförslaget i utkastet.
3. Skapa Husets lån av typen Husavtal. Försök först lägga ett namnlöst
   objekt i utkastet: felsammanfattningen ska få fokus. Följ länken till Namn.
   Ange Gemensam avtalstext som
   beskrivning och Eget värde som Anteckning. Ange Skuld `12 300` som
   **Osäkert uppgivet**, med uppgiftsdatum `2026-09-01`, och Startdatum
   `2026-08-01` som känt.
4. Under Ekonomiska uppgifter, välj **Okänt** för Pris
   och **Uttryckligen inget** för Valuta. Välj **Känt** för Beviljat
   kreditutrymme utan belopp. Fäll ihop avsnittet och försök lägga i
   utkastet. Felsammanfattningen ska få fokus. Följ beloppets länk; avsnittet
   öppnas och det tomma beloppet får fokus. Välj därefter
   **Ej uppgivet** för kreditutrymmet och lägg objektet i utkastet.

**Förväntat resultat:**

- Namnfel och känt belopp utan värde leder till felsammanfattning och rätt fält.
- Skuldens säkerhet och datum, gemensam beskrivning och egna svar läggs i samma
  utkast.
- I korta fönster går det att rulla inne i formuläret till fält och
  Lägg i utkastet och stäng; sidans avsnitt fungerar i båda teman.
- Detta fall slutar vid det privata förslaget. Den kompletta kedjan med
  senare sparande, historikläsning och omstart körs i referensfallet.

### TYP-16: Gemensamma egenskaper och fel nås i formuläret

**Syfte:** Kontrollera minsta breddens felsammanfattning och avsnittsöppning.

**Användare:** Alex.

**Förutsättningar:** 320 × 900.

**Separat förberedelse:** Börja med tomt hushåll. Förbered Annan typ utan egna
fält eller avsnitt enligt TYP-10.
Återställ genom ett nytt provhushåll mellan körningar.

**Integrationstest:**
[object-builtins.spec.ts](../../tests/integration/object-builtins.spec.ts), TYP-16.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/object-builtins.spec.ts",
    "caseId": "TYP-16"
  },
  "reference": "320 × 900; skyddar minsta breddens felsammanfattning och avsnittsöppning.",
  "outcomes": [
    "Namnfel och känt belopp utan värde leder till felsammanfattning och rätt fält.",
    "Skuldens säkerhet och datum, gemensam beskrivning och egna svar läggs i samma utkast."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna Inställningar → Typer och egna fält. Skapa Husavtal och avsnittet
   Avtalet. Lägg till gemensamma Beskrivning och Senast uppgiven skuld samt
   ett eget textfält Anteckning. Ändra skuldens visningsnamn till Skuld.
2. Flytta Skuld upp med tangentbordet, dölj den och återvisa i Avtalet.
   Kontrollera fokus efter varje handling. Lägg till gemensamma Startdatum
   och placera i ett nytt avsnitt Datum. Kontrollera ljust och mörkt tema.
   Lägg typförslaget i utkastet.
3. Skapa Husets lån av typen Husavtal. Försök först lägga ett namnlöst
   objekt i utkastet: felsammanfattningen ska få fokus. Följ länken till Namn.
   Ange Gemensam avtalstext som
   beskrivning och Eget värde som Anteckning. Ange Skuld `12 300` som
   **Osäkert uppgivet**, med uppgiftsdatum `2026-09-01`, och Startdatum
   `2026-08-01` som känt.
4. Under Ekonomiska uppgifter, välj **Okänt** för Pris
   och **Uttryckligen inget** för Valuta. Välj **Känt** för Beviljat
   kreditutrymme utan belopp. Fäll ihop avsnittet och försök lägga i
   utkastet. Felsammanfattningen ska få fokus. Följ beloppets länk; avsnittet
   öppnas och det tomma beloppet får fokus. Välj därefter
   **Ej uppgivet** för kreditutrymmet och lägg objektet i utkastet.

**Förväntat resultat:**

- Namnfel och känt belopp utan värde leder till felsammanfattning och rätt fält.
- Skuldens säkerhet och datum, gemensam beskrivning och egna svar läggs i samma
  utkast.
- I korta fönster går det att rulla inne i formuläret till fält och
  Lägg i utkastet och stäng; sidans avsnitt fungerar i båda teman.
- Detta fall slutar vid det privata förslaget. Den kompletta kedjan med
  senare sparande, historikläsning och omstart körs i referensfallet.

### TYP-17: Gemensamma egenskaper och fel nås i formuläret

**Syfte:** Kontrollera intern rullning och nåbara kontroller i kort fönster.

**Användare:** Alex.

**Förutsättningar:** 640 × 456.

**Separat förberedelse:** Börja med tomt hushåll. Förbered Annan typ utan egna
fält eller avsnitt enligt TYP-10.
Återställ genom ett nytt provhushåll mellan körningar.

**Integrationstest:**
[object-builtins.spec.ts](../../tests/integration/object-builtins.spec.ts), TYP-17.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/object-builtins.spec.ts",
    "caseId": "TYP-17"
  },
  "reference": "640 × 456; skyddar intern rullning och nåbara kontroller i kort fönster.",
  "outcomes": [
    "Namnfel och känt belopp utan värde leder till felsammanfattning och rätt fält.",
    "Skuldens säkerhet och datum, gemensam beskrivning och egna svar läggs i samma utkast."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna Inställningar → Typer och egna fält. Skapa Husavtal och avsnittet
   Avtalet. Lägg till gemensamma Beskrivning och Senast uppgiven skuld samt
   ett eget textfält Anteckning. Ändra skuldens visningsnamn till Skuld.
2. Flytta Skuld upp med tangentbordet, dölj den och återvisa i Avtalet.
   Kontrollera fokus efter varje handling. Lägg till gemensamma Startdatum
   och placera i ett nytt avsnitt Datum. Kontrollera ljust och mörkt tema.
   Lägg typförslaget i utkastet.
3. Skapa Husets lån av typen Husavtal. Försök först lägga ett namnlöst
   objekt i utkastet: felsammanfattningen ska få fokus. Följ länken till Namn.
   Ange Gemensam avtalstext som
   beskrivning och Eget värde som Anteckning. Ange Skuld `12 300` som
   **Osäkert uppgivet**, med uppgiftsdatum `2026-09-01`, och Startdatum
   `2026-08-01` som känt.
4. Under Ekonomiska uppgifter, välj **Okänt** för Pris
   och **Uttryckligen inget** för Valuta. Välj **Känt** för Beviljat
   kreditutrymme utan belopp. Fäll ihop avsnittet och försök lägga i
   utkastet. Felsammanfattningen ska få fokus. Följ beloppets länk; avsnittet
   öppnas och det tomma beloppet får fokus. Välj därefter
   **Ej uppgivet** för kreditutrymmet och lägg objektet i utkastet.

**Förväntat resultat:**

- Namnfel och känt belopp utan värde leder till felsammanfattning och rätt fält.
- Skuldens säkerhet och datum, gemensam beskrivning och egna svar läggs i samma
  utkast.
- I korta fönster går det att rulla inne i formuläret till fält och
  Lägg i utkastet och stäng; sidans avsnitt fungerar i båda teman.
- Detta fall slutar vid det privata förslaget. Den kompletta kedjan med
  senare sparande, historikläsning och omstart körs i referensfallet.

### TYP-18: Upprepat typbyte kräver aktuellt samtycke

**Syfte:** Kontrollera mörkt temas typbytesdialog och fältnåbarhet.

**Användare:** Alex.

**Förutsättningar:** 1280 pixlar, mörkt tema.

**Separat förberedelse:** Förbered och spara Cykel, Motorfordon, Alex blå cykel,
bilden, ekonomiska uppgifter och sambandet enligt TYP-11.
Återställ genom ett nytt provhushåll mellan körningar.

**Integrationstest:**
[type-change.spec.ts](../../tests/integration/type-change.spec.ts), TYP-18.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/type-change.spec.ts",
    "caseId": "TYP-18"
  },
  "reference": "1280 pixlar, mörkt tema; skyddar mörkt temas typbytesdialog och fältnåbarhet.",
  "outcomes": [
    "Varje byte visar just de tidigare svaren och kräver ny uttrycklig bekräftelse.",
    "Gemensamma uppgifter och bild består; bara Nummer B-final återstår bland egna svar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna cykelns redigering och byt till Motorfordon. Läs de tidigare
   svaren i förlustdialogen och bekräfta borttagningen. Öppna Egenskaper:
   alla egna fält är obesvarade. Ange Nummer B-84, Antal 8 och Försäkrad Ja.
2. Öppna Grunduppgifter och byt tillbaka till Cykel. Läs B-84, 8 och Ja
   i förlustdialogen och bekräfta igen. Ange A-126, 0 och Nej i Egenskaper.
3. Byt åter till Motorfordon och bekräfta borttagningen av A-126, 0 och Nej.
   Fyll endast Nummer B-final och lämna Antal och Försäkrad obesvarade.
4. Kontrollera namn, identitet och beskrivning i Grunduppgifter, bilden i
   Livscykel och utseende och ekonomiska uppgifter i Ekonomiska uppgifter. Välj
   Lägg i utkastet och stäng. Den sparade kartan har fortfarande den gamla
   typen. Kontrollera att formuläret inte kräver vågrät sidrullning.

**Förväntat resultat:**

- Varje byte visar just de tidigare svaren och kräver ny uttrycklig bekräftelse.
- Gemensamma uppgifter och bild består; bara Nummer B-final återstår bland egna
  svar.
- Detta fall slutar vid det privata förslaget. Den kompletta kedjan med
  senare sparande, historikläsning och omstart körs i referensfallet.

### TYP-19: Upprepat typbyte kräver aktuellt samtycke

**Syfte:** Kontrollera smal förlustdialog och fältnåbarhet i ljust tema.

**Användare:** Alex.

**Förutsättningar:** 390 pixlar, ljust tema.

**Separat förberedelse:** Förbered och spara Cykel, Motorfordon, Alex blå cykel,
bilden, ekonomiska uppgifter och sambandet enligt TYP-11.
Återställ genom ett nytt provhushåll mellan körningar.

**Integrationstest:**
[type-change.spec.ts](../../tests/integration/type-change.spec.ts), TYP-19.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/type-change.spec.ts",
    "caseId": "TYP-19"
  },
  "reference": "390 pixlar, ljust tema; skyddar smal förlustdialog och fältnåbarhet i ljust tema.",
  "outcomes": [
    "Varje byte visar just de tidigare svaren och kräver ny uttrycklig bekräftelse.",
    "Gemensamma uppgifter och bild består; bara Nummer B-final återstår bland egna svar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna cykelns redigering och byt till Motorfordon. Läs de tidigare
   svaren i förlustdialogen och bekräfta borttagningen. Öppna Egenskaper:
   alla egna fält är obesvarade. Ange Nummer B-84, Antal 8 och Försäkrad Ja.
2. Öppna Grunduppgifter och byt tillbaka till Cykel. Läs B-84, 8 och Ja
   i förlustdialogen och bekräfta igen. Ange A-126, 0 och Nej i Egenskaper.
3. Byt åter till Motorfordon och bekräfta borttagningen av A-126, 0 och Nej.
   Fyll endast Nummer B-final och lämna Antal och Försäkrad obesvarade.
4. Kontrollera namn, identitet och beskrivning i Grunduppgifter, bilden i
   Livscykel och utseende och ekonomiska uppgifter i Ekonomiska uppgifter. Välj
   Lägg i utkastet och stäng. Den sparade kartan har fortfarande den gamla
   typen. Kontrollera att formuläret inte kräver vågrät sidrullning.

**Förväntat resultat:**

- Varje byte visar just de tidigare svaren och kräver ny uttrycklig bekräftelse.
- Gemensamma uppgifter och bild består; bara Nummer B-final återstår bland egna
  svar.
- Detta fall slutar vid det privata förslaget. Den kompletta kedjan med
  senare sparande, historikläsning och omstart körs i referensfallet.

### TYP-20: Upprepat typbyte kräver aktuellt samtycke

**Syfte:** Kontrollera smal förlustdialog och fältnåbarhet i mörkt tema.

**Användare:** Alex.

**Förutsättningar:** 390 pixlar, mörkt tema.

**Separat förberedelse:** Förbered och spara Cykel, Motorfordon, Alex blå cykel,
bilden, ekonomiska uppgifter och sambandet enligt TYP-11.
Återställ genom ett nytt provhushåll mellan körningar.

**Integrationstest:**
[type-change.spec.ts](../../tests/integration/type-change.spec.ts), TYP-20.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/type-change.spec.ts",
    "caseId": "TYP-20"
  },
  "reference": "390 pixlar, mörkt tema; skyddar smal förlustdialog och fältnåbarhet i mörkt tema.",
  "outcomes": [
    "Varje byte visar just de tidigare svaren och kräver ny uttrycklig bekräftelse.",
    "Gemensamma uppgifter och bild består; bara Nummer B-final återstår bland egna svar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna cykelns redigering och byt till Motorfordon. Läs de tidigare
   svaren i förlustdialogen och bekräfta borttagningen. Öppna Egenskaper:
   alla egna fält är obesvarade. Ange Nummer B-84, Antal 8 och Försäkrad Ja.
2. Öppna Grunduppgifter och byt tillbaka till Cykel. Läs B-84, 8 och Ja
   i förlustdialogen och bekräfta igen. Ange A-126, 0 och Nej i Egenskaper.
3. Byt åter till Motorfordon och bekräfta borttagningen av A-126, 0 och Nej.
   Fyll endast Nummer B-final och lämna Antal och Försäkrad obesvarade.
4. Kontrollera namn, identitet och beskrivning i Grunduppgifter, bilden i
   Livscykel och utseende och ekonomiska uppgifter i Ekonomiska uppgifter. Välj
   Lägg i utkastet och stäng. Den sparade kartan har fortfarande den gamla
   typen. Kontrollera att formuläret inte kräver vågrät sidrullning.

**Förväntat resultat:**

- Varje byte visar just de tidigare svaren och kräver ny uttrycklig bekräftelse.
- Gemensamma uppgifter och bild består; bara Nummer B-final återstår bland egna
  svar.
- Detta fall slutar vid det privata förslaget. Den kompletta kedjan med
  senare sparande, historikläsning och omstart körs i referensfallet.

### TYP-21: Upprepat typbyte kräver aktuellt samtycke

**Syfte:** Kontrollera minsta breddens upprepade förlustbekräftelse.

**Användare:** Alex.

**Förutsättningar:** 320 pixlar, ljust tema.

**Separat förberedelse:** Förbered och spara Cykel, Motorfordon, Alex blå cykel,
bilden, ekonomiska uppgifter och sambandet enligt TYP-11.
Återställ genom ett nytt provhushåll mellan körningar.

**Integrationstest:**
[type-change.spec.ts](../../tests/integration/type-change.spec.ts), TYP-21.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/type-change.spec.ts",
    "caseId": "TYP-21"
  },
  "reference": "320 pixlar, ljust tema; skyddar minsta breddens upprepade förlustbekräftelse.",
  "outcomes": [
    "Varje byte visar just de tidigare svaren och kräver ny uttrycklig bekräftelse.",
    "Gemensamma uppgifter och bild består; bara Nummer B-final återstår bland egna svar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna cykelns redigering och byt till Motorfordon. Läs de tidigare
   svaren i förlustdialogen och bekräfta borttagningen. Öppna Egenskaper:
   alla egna fält är obesvarade. Ange Nummer B-84, Antal 8 och Försäkrad Ja.
2. Öppna Grunduppgifter och byt tillbaka till Cykel. Läs B-84, 8 och Ja
   i förlustdialogen och bekräfta igen. Ange A-126, 0 och Nej i Egenskaper.
3. Byt åter till Motorfordon och bekräfta borttagningen av A-126, 0 och Nej.
   Fyll endast Nummer B-final och lämna Antal och Försäkrad obesvarade.
4. Kontrollera namn, identitet och beskrivning i Grunduppgifter, bilden i
   Livscykel och utseende och ekonomiska uppgifter i Ekonomiska uppgifter. Välj
   Lägg i utkastet och stäng. Den sparade kartan har fortfarande den gamla
   typen. Kontrollera att formuläret inte kräver vågrät sidrullning.

**Förväntat resultat:**

- Varje byte visar just de tidigare svaren och kräver ny uttrycklig bekräftelse.
- Gemensamma uppgifter och bild består; bara Nummer B-final återstår bland egna
  svar.
- Detta fall slutar vid det privata förslaget. Den kompletta kedjan med
  senare sparande, historikläsning och omstart körs i referensfallet.

### TYP-22: Upprepat typbyte kräver aktuellt samtycke

**Syfte:** Kontrollera minsta breddens fältnåbarhet i mörkt tema.

**Användare:** Alex.

**Förutsättningar:** 320 pixlar, mörkt tema.

**Separat förberedelse:** Förbered och spara Cykel, Motorfordon, Alex blå cykel,
bilden, ekonomiska uppgifter och sambandet enligt TYP-11.
Återställ genom ett nytt provhushåll mellan körningar.

**Integrationstest:**
[type-change.spec.ts](../../tests/integration/type-change.spec.ts), TYP-22.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/type-change.spec.ts",
    "caseId": "TYP-22"
  },
  "reference": "320 pixlar, mörkt tema; skyddar minsta breddens fältnåbarhet i mörkt tema.",
  "outcomes": [
    "Varje byte visar just de tidigare svaren och kräver ny uttrycklig bekräftelse.",
    "Gemensamma uppgifter och bild består; bara Nummer B-final återstår bland egna svar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna cykelns redigering och byt till Motorfordon. Läs de tidigare
   svaren i förlustdialogen och bekräfta borttagningen. Öppna Egenskaper:
   alla egna fält är obesvarade. Ange Nummer B-84, Antal 8 och Försäkrad Ja.
2. Öppna Grunduppgifter och byt tillbaka till Cykel. Läs B-84, 8 och Ja
   i förlustdialogen och bekräfta igen. Ange A-126, 0 och Nej i Egenskaper.
3. Byt åter till Motorfordon och bekräfta borttagningen av A-126, 0 och Nej.
   Fyll endast Nummer B-final och lämna Antal och Försäkrad obesvarade.
4. Kontrollera namn, identitet och beskrivning i Grunduppgifter, bilden i
   Livscykel och utseende och ekonomiska uppgifter i Ekonomiska uppgifter. Välj
   Lägg i utkastet och stäng. Den sparade kartan har fortfarande den gamla
   typen. Kontrollera att formuläret inte kräver vågrät sidrullning.

**Förväntat resultat:**

- Varje byte visar just de tidigare svaren och kräver ny uttrycklig bekräftelse.
- Gemensamma uppgifter och bild består; bara Nummer B-final återstår bland egna
  svar.
- Detta fall slutar vid det privata förslaget. Den kompletta kedjan med
  senare sparande, historikläsning och omstart körs i referensfallet.

### TYP-23: Fysiskt tangentbord vid verklig webbläsarförstoring

**Syfte:** Kontrollera nåbara typkontroller och synligt felfokus vid
förstoring med webbläsarens egna tangenter, utöver emulerad fönsterbredd.

**Användare:** Alex.

**Förutsättningar:** Separat provhushåll, fysisk dator med tangentbord och
Chromium. Förbered Husavtal med avsnitten Avtalet och Datum enligt TYP-10.

**Kräver mänsklig observation:** Använd det fysiska tangentbordet för
webbläsarens förstoring och Tab-navigering. Kontrollera synligt fokus och
att formulärets egna rullning håller fel och sparknapp nåbara. Automatiken
ändrar fönsterstorlek och utför syntetiska tangenttryck; den utför inte
denna fysiska observation.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "humanObservation": {
    "kind": "physical-input",
    "observation": "Förstora den verkliga webbläsaren med fysiskt tangentbord, följ Tab-fokus och nå formulärets fält, felsammanfattning och sparknapp."
  },
  "reference": "Fysiskt tangentbord, Chromium på dator, 100 och 200 procent webbläsarförstoring.",
  "outcomes": [
    "Förstorat formulär behåller synligt fokus och nåbara fält samt sparknapp."
  ],
  "evidence": [
    {
      "kind": "overlap",
      "spec": "tests/integration/object-builtins.spec.ts",
      "caseId": "TYP-17",
      "purpose": "Syntetisk kort fönsterhöjd skyddar formulärfel och rullning men utför inte fysisk webbläsarförstoring."
    }
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Vid 100 procent förstoring: öppna Nytt objekt och välj Husavtal.
   Lämna Namn tomt. Använd Tab och Enter för Lägg i utkastet och stäng.
2. Kontrollera att felsammanfattningen har synligt fokus. Följ dess länk
   till Namn med tangentbordet och skriv Förstoringsprov.
3. Använd Ctrl och plus på Windows/Linux eller Command och plus på macOS
   tills webbläsarens meny visar 200 procent. Öppna Avtalet och Datum
   med Tab och Enter. Rulla inne i formuläret till fält och sparknapp.
4. Öppna Avtalet igen. Välj Känt för Skuld utan belopp, fäll ihop avsnittet och
   försök lägga i utkastet med tangentbordet. Följ felets länk tillbaka
   till Skuld och kontrollera fokus. Återställ Skuld till Ej uppgivet.
5. Lägg i utkastet och stäng. Kontrollera synlig återkoppling och gå till
   Visa utkastet med tangentbordet. Spara inte. Återställ till 100 procent
   med Ctrl/Command och noll och kasta provförslaget separat.

**Förväntat resultat:**

- Fysisk Tab-navigering och Enter fungerar även vid verklig förstoring.
  Fokus skyms inte och fel öppnar sitt avsnitt med nåbart fält.
- Formulärets rullning gör sparknappen och sista fält nåbara utan att
  fälttext eller osparat arbete försvinner. Återkopplingen går att läsa.

## Referenser och avgränsningar

TYP-09 är den kompletta avsnittsreferensen vid 1280 pixlar med vanlig medlem.
TYP-10 är den kompletta referensen för gemensamma egenskaper vid 1280 × 900.
TYP-11 är den kompletta typbytesreferensen vid 1280 pixlar i ljust tema.
TYP-13–22 har egna identiteter och skyddar de angivna kontroll-, fokus-,
omflödes- och temafelen. Alla tidigare identiteter TYP-01–12 består; inga
identiteter återanvänds eller pensioneras i denna familj. TYP-23 behåller
det separata mänskliga provet av fysisk inmatning vid verklig förstoring.

Godkänd täckningsförlust: hela typbytes-, sparande- och omstartskedjan
utförs inte självständigt i varje bredd och tema. Ett fel i kombinationen
av dessa steg i annan konfiguration kan därför undgå referensen. Det är
inte ett bevis för alla konfigurationers likvärdighet. TYP-06 och TYP-07
behåller särskilt skydd för undanträngda fält och ändrade definitioner.

TYP-01 och TYP-07 har separat tekniskt HTTP-underlag. Där kontrolleras
exakta fältidentiteter, kvitton, återspelning, avvisade värden, gammalt
sparbesked och historik. Övriga test kontrollerar också lagrade uppgifter
utöver sina browsersteg. Dessa påståenden kräver inte att en människa
läser nätverkstrafik under de vanliga stegen. Verklig skärmläsarutmatning,
fysiskt tangentbord eller pekskärm och faktisk symboltolkning ingår inte
i syntetisk Chromium-verifiering. Ingen betald leverantör körs här.

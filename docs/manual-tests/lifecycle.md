# Manuella testfall för upphört och borttaget innehåll

Testfallen gäller status, slutdatum och vanlig borttagning i privata utkast.
Upphört finns kvar med avslutad giltighet. Borttaget lämnar den aktuella
kartan men har tidigare värden i historiken. Dessa fall utför ingen
permanent radering; dess oåterkalleliga omfattning provas separat i
[raderingsfallen](household-erasure.md).
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

Använd den konfigurerade administratören i en separat testinstallation.
Logga in genom den konfigurerade identitetsleverantören enligt
[installationsguiden](../operations/installation.md).
Samma kartarbete är tillgängligt för en vanlig hushållsmedlem.

## Allmän förberedelse

Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor) när
fallen anger formulär, samtal, profil eller administration.

För samband, öppna **Tabell**, välj **Samband för** objektet och
**Redigera samband** vid kopplingen. **Lägg i utkastet** skickar hela
formuläret. Välj **Stäng samband** innan du sparar eller fortsätter med
annat arbete. Objekt öppnas för redigering från Tabell eller objektets
uppgifter. Vid kontroll i kartan, öppna **Filter** bredvid sökfältet och
välj **Ta med upphörda**, även efter omladdning, för att se upphörda
objekt och samband. För kontroll i Tabell, öppna dess **Filter**, välj
**Ta med upphörda** och stäng filterdialogen med krysset.

Fullständiga förslag läses genom **Skriv till Skyttel → Visa utkastet →
Visa förslaget: [namn]**. Stäng läsningen med krysset. Utkastets sparikon
öppnar **Spara utkastet**; vänta på **Utkastet är sparat** och stäng
textvyn före nästa arbete i Tabell eller Karta.

1. Använd ett tomt testhushåll med påhittade uppgifter enligt
   [familjeabonnemanget](../user-guide/family-subscription.md).
2. Skapa abonnemanget **Familjemusik**, personen **Lo Exempel** och tjänsten
   **Molnmusik**. Lägg dem i utkastet och spara hela utkastet.
3. Skapa sambanden **Lo Exempel → Använder → Familjemusik** och
   **Familjemusik → Använder → Molnmusik**. Spara hela utkastet.
4. Använd ett nytt testhushåll för varje fall. Behåll samma databas när
   appen startas om inom ett fall. Läs
   [livscykelguiden](../user-guide/lifecycle.md) för begrepp och datumgräns.

## Separat förberedelse av överlappande identiteter

LIVSCYKEL-05 och LIVSCYKEL-06 använder giltiga identifierare som kan
kollidera i ett tillgänglighetsnamn om objekt och samband blandas ihop.
Vanlig namnlikhet provar inte denna tekniska gräns. Efter Allmän
förberedelse, innan respektive UI-flöde, öppna Console i det nya
provhushållet. Kör följande gemensamma förberedelse. Indata är det aktiva
hushållets URL och exakt de tre unika testobjekten ovan.

```js
const lifecyclePath = `/api${location.pathname}/map`;
const lifecycleRead = async () => (await fetch(lifecyclePath)).json();
const lifecyclePost = async (route, data) => {
  const state = await lifecycleRead();
  const reply = await fetch(`${lifecyclePath}/${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: state.draft.version,
      contentVersion: state.contentVersion, ...data })
  });
  if (!reply.ok) throw new Error(`Preparation failed: ${reply.status}`);
};
const lifecycleState = await lifecycleRead();
const lifecycleLo = lifecycleState.objects.find(x => x.name === 'Lo Exempel');
const lifecycleMusic = lifecycleState.objects.find(x => x.name === 'Familjemusik');
const lifecycleService = lifecycleState.objects.find(x => x.name === 'Molnmusik');
if (!lifecycleLo || !lifecycleMusic || !lifecycleService)
  throw new Error('Missing named lifecycle test objects');
const lifecycleIncoming = lifecycleState.relationships.find(x =>
  x.sourceId === lifecycleLo.id && x.targetId === lifecycleMusic.id);
if (!lifecycleIncoming) throw new Error('Missing incoming relationship');
```

För LIVSCYKEL-05 kör sedan:

```js
await lifecyclePost('draft', {
  id: `relationship-${lifecycleIncoming.id}`, baseRevision: null,
  value: { name: 'Kim Exempel', description: '',
    typeId: lifecycleLo.typeId, lifecycle: 'active',
    financialFacts: { endDate: { knowledge: 'known', value: '2000-01-01' } } }
});
await lifecyclePost('relationship', {
  id: lifecycleIncoming.id, baseRevision: lifecycleIncoming.revision,
  value: { ...lifecycleIncoming, lifecycle: 'ended' }
});
```

För LIVSCYKEL-06 kör i stället:

```js
await lifecyclePost('relationship', {
  id: lifecycleIncoming.id, baseRevision: lifecycleIncoming.revision,
  value: { ...lifecycleIncoming, lifecycle: 'ended',
    endDate: { knowledge: 'known', value: '2000-01-01' } }
});
await lifecyclePost('relationship', {
  id: `previous-${lifecycleIncoming.id}`, baseRevision: null,
  value: { sourceId: lifecycleService.id, targetId: lifecycleLo.id,
    typeId: lifecycleState.relationshipTypes.find(x => x.name === 'Betalar').id,
    knowledge: 'known', lifecycle: 'active',
    endDate: { knowledge: 'known', value: '2000-01-01' } }
});
```

Ladda om sidan, granska fullständiga förslag och spara hela utkastet genom
UI. Förväntat: de namngivna uppgifterna är gemensamt sparade och utkastet
är tomt. Skapa sedan det privata arbetet för LIVSCYKEL-05 enligt fallet.
Avsluta och återställ genom att ta bort endast det separata provhushållet
enligt Allmän förberedelse. Inga internidentifierare läses i UI-stegen.

## Status

### LIVSCYKEL-01: upphört innehåll finns kvar och kan rättas separat

**Syfte:** Kontrollera att status inte sprids till anslutna uppgifter.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** De sparade objekten och sambanden ovan, utan slutdatum.

**Integrationstest:**
[lifecycle.spec.ts](../../tests/integration/lifecycle.spec.ts),
testfallet “LIVSCYKEL-01: ended objects and relationships stay visible and
independently correctable”.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/lifecycle.spec.ts",
    "caseId": "LIVSCYKEL-01"
  },
  "reference": "1280 × 720; Chromium; syntetiska identiteter och verklig SQLite",
  "outcomes": [
    "Upphört objekt finns kvar efter omstart. Sambanden behåller sina egna statusval.",
    "Native rättelse av objektet gör det gällande utan att rätta det upphörda sambandet."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **Tabell → Filter**, välj **Ta med upphörda** och stäng
   filterdialogen. Välj **Redigera Familjemusik** i objektets rad.
   Öppna **Livscykel och utseende** och välj **Upphört** under
   **Objektets status**. Välj **Lägg i utkastet och stäng** och granska
   utkastet. Läs alla rader med Visa förslaget före sparandet.
2. Välj **Spara hela utkastet**. Starta om appen med samma databas och
   ladda om sidan. Välj **Ta med upphörda** igen i Tabellens filter.
   Kontrollera objekten och sambanden.
3. Öppna **Lo Exempel → Använder → Familjemusik**, välj **Upphört** under
   **Sambandets status**, lägg sambandet i utkastet med tangentbordet,
   välj **Stäng samband** och spara.
4. Välj **Redigera Familjemusik** i Tabell och
   **Livscykel och utseende**. Välj **Gäller fortfarande** under
   **Objektets status** och **Lägg i utkastet och stäng**. Spara hela
   utkastet och ladda om sidan. Välj **Ta med upphörda** igen för att
   kontrollera det fortfarande upphörda sambandet.

**Förväntat resultat:**

- Förslaget visar Upphört med text och orange markering, skild från
  förslagets markering. Den sparade kartans status är ännu oförändrad.
- Efter omstart finns Familjemusik kvar med Upphört. Andra objekt och
  samband har oförändrad status och kan fortfarande öppnas.
- Det markerade sambandet blir upphört utan att det andra sambandet ändras.
- Rättelsen gör Familjemusik gällande. Sambandet från Lo är fortsatt upphört.

### LIVSCYKEL-02: kända slutdatum styr status och kan rättas

**Syfte:** Kontrollera att endast kända passerade datum ger Upphört och att
datum och status kan rättas oberoende.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** De sparade objekten och sambanden ovan. Automationen
styr webbläsarklockan över midnatt UTC med påhittade datum. För manuell
kontroll av övergången behövs en sida som är öppen över midnatt UTC.

**Integrationstest:**
[lifecycle.spec.ts](../../tests/integration/lifecycle.spec.ts),
testfallet “LIVSCYKEL-02: only a known elapsed end date ends content and
dates or status can correct it”.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/lifecycle.spec.ts",
    "caseId": "LIVSCYKEL-02"
  },
  "reference": "1280 × 720; Chromium; verklig datumgräns UTC manuellt, styrd 2031-03-12 i automation",
  "outcomes": [
    "Endast känt passerat slutdatum ger Upphört; osäkert och saknat datum ger ingen automatisk upphörandestatus.",
    "Native framtida datum och uttryckligt statusval sparas och kan läsas efter omstart med datum och tidigare betydelse i historiken."
  ],
  "evidence": [
    {
      "kind": "technical",
      "spec": "tests/integration/lifecycle.spec.ts",
      "title": "direct lifecycle date and current-versus-previous staging preserves original public request guards",
      "purpose": "Bevarar ursprungliga lyckade HTTP-förberedelser, exakta värden och statuskontroller separat från de ordinarie formulären."
    }
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Välj **Redigera Familjemusik** i Tabell och
   **Ekonomiska uppgifter**. Ange dagens UTC-datum som känt **Slutdatum**.
   Gör samma sak för Lo Exempel med datumet som **Osäkert uppgivet**.
   Behåll standardvalet **Följ slutdatum** för båda. Välj
   **Lägg i utkastet och stäng** för varje objekt. Läs alla rader med
   **Visa förslaget** före **Spara hela utkastet**.
2. Välj **Ta med upphörda** i Tabellens filter. Kontrollera status före
   och efter nästa midnatt UTC utan omladdning.
3. Välj **Redigera Familjemusik** i Tabell och
   **Ekonomiska uppgifter**. Rätta slutdatumet till en framtida dag. Välj
   **Lägg i utkastet och stäng**, läs hela förslaget med båda värdesidorna
   och spara hela utkastet.
4. Öppna sambandet från Lo och ange ett känt passerat **Sambandets slutdatum**.
   Lägg sambandet i utkastet med tangentbordet, välj **Stäng samband**,
   spara och kontrollera statusen.
5. Ändra sambandets status till **Gäller fortfarande** utan att ändra datumet.
   Lägg ändringen i utkastet, stäng sambandsdialogen, granska hela
   utkastet, spara, starta om appen och ladda om. Läs hela Familjemusiks
   uppgifter i Tabell: det framtida datumet är kvar. Öppna Samband för
   Lo Exempel och läs Gäller fortfarande och det oförändrade passerade datumet.
6. Stäng textvyn och välj Rapporter → Ändringshistorik. Öppna det senaste
   sparandet med Visa ändringarna. Läs Följ slutdatum före sparandet och
   Gäller fortfarande efter, med samma slutdatum på båda sidor.

**Förväntat resultat:**

- Bara Familjemusik får Upphört efter datumgränsen. Lo med ett osäkert
  datum och Molnmusik utan datum förblir gällande.
- Ett rättat framtida datum gör Familjemusik gällande. Sambandets kända
  passerade datum ger Upphört, men **Gäller fortfarande** åsidosätter det.
- Utkastet visar både det gamla datumet och det nya statusvalet. Valet och
  datumet finns kvar efter omstart. Historikunderlaget bevarar båda värdena.
- Automationen kontrollerar dessutom via HTTP att ett ogiltigt kalenderdatum
  och ett datumvärde märkt som okänt avvisas utan nya förslag.

### LIVSCYKEL-04: kartans sambandsstatus är åtkomlig med tangentbord

**Syfte:** Kontrollera att kartans samband förmedlar samma status genom
synlig text och kontrollens tillgängliga beskrivning.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** De sparade objekten och sambanden ovan. Ange ett känt
slutdatum **2000-01-01** för båda sambanden. Behåll **Följ slutdatum** för
sambandet från Lo till Familjemusik, men välj **Gäller fortfarande** för
sambandet från Familjemusik till Molnmusik. Spara hela utkastet.

Skapa dessutom objektet **Privat livscykelanteckning**, typ Person,
med beskrivningen **Hela mitt oberoende privata arbete** genom Nytt objekt.
Lägg i utkastet och stäng utan att spara. Läs hela förslaget före steg 1.

**Integrationstest:**
[lifecycle.spec.ts](../../tests/integration/lifecycle.spec.ts),
testfallet “LIVSCYKEL-04: keyboard relationship targets expose ended status
without changing saved facts”.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/lifecycle.spec.ts",
    "caseId": "LIVSCYKEL-04"
  },
  "reference": "1280 × 720; Chromium; syntetiska identiteter och verklig SQLite",
  "outcomes": [
    "Kartans samband förmedlar rätt effektiv status och datum genom text och tillgängliga beskrivningar.",
    "Tangentbordsfokus och aktivering fungerar före och efter omstart utan ändring av sparade fakta eller oberoende privat arbete."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna kartan och välj **Alla etiketter**. Kontrollera de två sambanden.
2. Använd Tab och Skift+Tab för att nå sambandet från Lo till Familjemusik.
   Kontrollera synligt fokus och sambandets tillgängliga beskrivning med
   webbläsarens tillgänglighetsinspektör.
3. Tryck Alt+Enter på sambandet.
   Läs **Valt samband** utan att redigera eller spara något.
4. Starta om appen med samma databas, ladda om sidan och öppna kartan igen.
   Kontrollera båda sambandens status och tillgängliga beskrivningar.

5. Öppna Utkast efter omstart och läs Privat livscykelanteckning genom
   Visa förslaget. Hela den oberoende beskrivningen finns kvar och är osparad.

**Förväntat resultat:**

- Sambandet från Lo visar **Upphört** med text och samma uppgift finns i
  kontrollens tillgängliga beskrivning. Dess namn behåller båda objekten
  och riktningen **Lo Exempel → Använder → Familjemusik**.
- Sambandet till Molnmusik saknar markeringen Upphört eftersom det
  uttryckliga statusvalet åsidosätter det passerade slutdatumet.
- Tangentbordets fokus är synligt och kontrollen går att aktivera.
  Detaljerna visar **Följ slutdatum**, **2000-01-01** och **Upphört**.
- Samma status består efter omstart. Inget nytt förslag eller sparande
  uppstår av visningen. Automationen jämför hela kartunderlaget via HTTP.
- Automationen kontrollerar webbläsarens tillgängliga beskrivning och
  fokus. Faktiska skärmläsarprov dokumenteras separat när de utförs.

### LIVSCYKEL-05: objekt och samband behåller sina egna beskrivningar

**Syfte:** Kontrollera att namn, typ och status för ett objekt inte ersätts
av ett annat sambands uppgifter i hjälpmedel.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** De sparade objekten och sambanden ovan. Lägg till
personen **Kim Exempel** med känt slutdatum **2000-01-01** och status
**Gäller fortfarande** genom den separata förberedelsen ovan. Förberedelsen
anger också Upphört för sambandet från Lo till Familjemusik. Spara enligt
förberedelsen; gör inte ett extra sparande. Automationen väljer de giltiga
identifierarna `relationship-incoming` för Kim och `incoming` för sambandet
genom det publika API:et för att prova att beskrivningarna hålls åtskilda.

Skapa dessutom objektet **Privat livscykelanteckning**, typ Person,
med beskrivningen **Hela mitt oberoende privata arbete** genom Nytt objekt.
Lägg i utkastet och stäng utan att spara. Läs hela förslaget före steg 1.

**Integrationstest:**
[lifecycle.spec.ts](../../tests/integration/lifecycle.spec.ts),
testfallet “LIVSCYKEL-05: object and relationship descriptions remain
distinct for valid overlapping identities”.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/lifecycle.spec.ts",
    "caseId": "LIVSCYKEL-05"
  },
  "reference": "1280 × 720; Chromium; syntetiska identiteter och verklig SQLite",
  "outcomes": [
    "Kim och sambandets giltigt överlappande identiteter behåller sina egna namn, typ och effektiva status.",
    "Visning och omstart bevarar sparade uppgifter och ett fullständigt oberoende privat förslag."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna kartan och välj **Alla etiketter**. Kontrollera Kim och sambandet
   från Lo till Familjemusik.
2. Läs den tillgängliga beskrivningen för Kims namnetikett och objektsymbol
   med webbläsarens tillgänglighetsinspektör.
3. Läs motsvarande beskrivning för sambandet från Lo till Familjemusik.
4. Starta om appen med samma databas, ladda om kartan och kontrollera igen.

5. Öppna Utkast efter omstart och läs Privat livscykelanteckning genom
   Visa förslaget. Hela den oberoende beskrivningen finns kvar och är osparad.

**Förväntat resultat:**

- Båda kontrollerna för Kim beskriver **Kim Exempel** och typen **Person**.
  De anger inte Upphört och visar inte det andra sambandets uppgifter.
- Sambandet visar **Upphört** både med text och i sin tillgängliga beskrivning.
- Samma namn, typ och status består efter omstart. Visningen ändrar inga
  sparade uppgifter eller privata förslag; automationen jämför hela underlaget.
- Automationen kontrollerar tillgängliga beskrivningar i webbläsaren.
  Faktiska skärmläsarprov dokumenteras separat när de utförs.

### LIVSCYKEL-06: aktuella och tidigare samband behåller sin egen status

**Syfte:** Kontrollera att ett tidigare sambands beskrivning behåller dess
namn och status när utkastet ändrar sambandet och andra samband visas samtidigt.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** De sparade objekten och sambanden ovan. Ange känt
slutdatum **2000-01-01** och status **Upphört** för sambandet från Lo till
Familjemusik. Lägg till **Molnmusik → Betalar → Lo Exempel** med samma
slutdatum och status **Gäller fortfarande**. Spara hela utkastet.
Använd den separata förberedelsen ovan för de överlappande identiteterna.
Automationen använder `incoming` och `previous-incoming`.

**Integrationstest:**
[lifecycle.spec.ts](../../tests/integration/lifecycle.spec.ts),
testfallet “LIVSCYKEL-06: current and previous relationships retain their
own accessible status”.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/lifecycle.spec.ts",
    "caseId": "LIVSCYKEL-06"
  },
  "reference": "1280 × 720; Chromium; syntetiska identiteter och verklig SQLite",
  "outcomes": [
    "Native ändring av Från, typ och status behåller slutdatum; hela förslaget kan läsas utan gemensamt sparande.",
    "Tidigare, föreslaget och separat sparat samband behåller egna riktningar och status efter omstart."
  ],
  "evidence": [
    {
      "kind": "technical",
      "spec": "tests/integration/lifecycle.spec.ts",
      "title": "direct lifecycle date and current-versus-previous staging preserves original public request guards",
      "purpose": "Bevarar ursprungliga lyckade HTTP-förberedelser, exakta värden och statuskontroller separat från de ordinarie formulären."
    }
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Redigera sambandet från Lo till Familjemusik. Ändra Från objekt till
   Molnmusik, välj typen **Betalar** och
   status **Gäller fortfarande**. Lägg sambandet i ditt utkast med Enter och
   välj Stäng samband utan att spara. Öppna Utkast → Visa förslaget för
   Molnmusik → Betalar → Familjemusik. Läs båda värdesidorna:
   tidigare Lo, Använder och Manuellt
   upphört; föreslaget Molnmusik, Betalar och Gäller fortfarande; samma
   2000-01-01 på båda sidor. Stäng dialogen och textvyn.
2. Öppna kartan och välj **Alla etiketter**. Granska det tidigare sambandet
   från Lo, det föreslagna sambandet och det sparade sambandet från Molnmusik.
3. Läs kontrollernas tillgängliga beskrivningar med webbläsarens
   tillgänglighetsinspektör.
4. Starta om appen med samma databas, ladda om kartan och kontrollera igen.

**Förväntat resultat:**

- Det tidigare sambandet från Lo visar **Använder** och **Upphört** både
  med text och i sin tillgängliga beskrivning.
- Det föreslagna sambandet och sambandet från Molnmusik visar **Betalar**
  utan Upphört. Deras beskrivningar anger inte att de har upphört.
- Samma skillnad består efter omstart. Förslaget är fortfarande privat och
  de sparade sambanden är oförändrade; automationen jämför hela underlaget.
- Automationen kontrollerar tillgängliga beskrivningar i webbläsaren.
  Faktiska skärmläsarprov dokumenteras separat när de utförs.

## Borttagning

### LIVSCYKEL-03: direkt borttagning bevarar anslutna objekt och historik

**Syfte:** Kontrollera hela borttagningsförslaget, kastande och bevarande.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** De sparade objekten och sambanden ovan.

**Integrationstest:**
[lifecycle.spec.ts](../../tests/integration/lifecycle.spec.ts),
testfallet “LIVSCYKEL-03: removing from the list immediately proposes every
connected edge and preserves history”.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/lifecycle.spec.ts",
    "caseId": "LIVSCYKEL-03"
  },
  "reference": "1280 × 720; Chromium; syntetiska identiteter och verklig SQLite",
  "outcomes": [
    "Hela borttagningsförslaget innehåller objektet och båda anslutna sambanden med sparad typ.",
    "Kastande återger sparade samband. Sparande och omstart tar bort endast objektet och dess samband och bevarar tidigare värden i historiken."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **Lo Exempel → Använder → Familjemusik**, välj **Betalar** som
   sambandstyp och lägg sambandet i utkastet utan att spara. Välj
   **Stäng samband**.
2. Välj den röda papperskorgen **Ta bort Familjemusik** på tabellraden.
   Granska **Visa utkastet**
   utan något ytterligare förslagssteg.
3. Ladda om sidan och granska förslaget igen. Öppna **Skriv till Skyttel**,
   välj **Visa utkastet** och **Kasta hela utkastet**. Läs
   **Ta bort hela utkastet?** och bekräfta **Ta bort hela utkastet**.
   Stäng textvyn och kontrollera att de sparade sambanden finns kvar.
4. Upprepa typbytet och **Ta bort Familjemusik** i Tabell. Välj **Spara hela
   utkastet**.
5. Starta om appen med samma databas och ladda om sidan. Öppna
   Rapporter → Ändringshistorik → Visa ändringarna för borttagningen.
   Läs Familjemusik, Abonnemang, båda sambandens riktningar och Använder
   i tidigare värden samt Borttaget efter sparandet.

**Förväntat resultat:**

- Utkastet innehåller borttagning av Familjemusik och båda sambanden med
  läsbara objektnamn och riktningar. Den gemensamma kartan är oförändrad.
- Borttagningen visar sambandets sparade typ **Använder**, utan **Betalar**
  eller någon typkonflikt. Hela utkastet går att spara direkt.
- Förslaget överlever omladdning. Kastande återger båda sambanden och
  tömmer utkastet utan att ändra den gemensamma kartan eller sambandets typ.
- Efter sparande och omstart är Familjemusik och båda sambanden borta.
  Lo och Molnmusik finns kvar. Inga typdefinitioner städas bort.
- Automationen läser historikunderlaget via HTTP och kontrollerar tidigare
  objekt, samband, namn och definitioner samt tidpunkt och användare.
  Läsning i gränssnittet provas i [historikfallen](history.md).

Konflikter som blockerar hela borttagningen provas även i
[UTKAST-06](drafts.md#utkast-06-granska-nya-samband-före-objektborttagning).

### LIVSCYKEL-07: faktiskt uppläst livscykelstatus för fall 04

**Syfte:** Kontrollera faktisk uppläsning utöver DOM-beskrivningar.

**Användare:** Den konfigurerade administratören med NVDA.

**Förutsättningar:** Förbered LIVSCYKEL-04 i en skrivbordsmiljö med
Chrome, NVDA och svensk röst. Anteckna samtliga versioner.

**Kräver mänsklig observation:** Hör NVDA läsa sambandets riktning, Följ
slutdatum och Upphört utan att tilldela
Molnmusik-sambandet upphörandestatus.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "humanObservation": {
    "kind": "screen-reader",
    "observation": "Hör NVDA läsa sambandets riktning, Följ slutdatum och Upphört utan att tilldela Molnmusik-sambandet upphörandestatus."
  },
  "reference": "Windows, Chrome och NVDA; svensk röst; namnge versioner i protokollet",
  "outcomes": [
    "Hör NVDA läsa sambandets riktning, Följ slutdatum och Upphört utan att tilldela Molnmusik-sambandet upphörandestatus."
  ],
  "evidence": [
    {
      "kind": "overlap",
      "spec": "tests/integration/lifecycle.spec.ts",
      "caseId": "LIVSCYKEL-04",
      "purpose": "DOM-beskrivningar, status och beständig läsning; automationen hör inte NVDA."
    }
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför LIVSCYKEL-04 en gång. Under dess beskrivningsläsning, navigera
   med NVDA till varje namngiven objekt- eller sambandskontroll och lyssna.
2. Efter omstart, lyssna på samma kontroller igen.

**Förväntat resultat:**

- Hör NVDA läsa sambandets riktning, Följ slutdatum och Upphört utan att
  tilldela Molnmusik-sambandet upphörandestatus.
- Den faktiska uppläsningen behåller samma betydelser efter omstart.
  Anteckna hörda ord; DOM-automation är separat underlag.

### LIVSCYKEL-08: faktiskt uppläst livscykelstatus för fall 05

**Syfte:** Kontrollera faktisk uppläsning utöver DOM-beskrivningar.

**Användare:** Den konfigurerade administratören med NVDA.

**Förutsättningar:** Förbered LIVSCYKEL-05 i en skrivbordsmiljö med
Chrome, NVDA och svensk röst. Anteckna samtliga versioner.

**Kräver mänsklig observation:** Hör NVDA läsa Kim Exempel som Person utan
Upphört och det separata Lo-sambandet
som Upphört.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "humanObservation": {
    "kind": "screen-reader",
    "observation": "Hör NVDA läsa Kim Exempel som Person utan Upphört och det separata Lo-sambandet som Upphört."
  },
  "reference": "Windows, Chrome och NVDA; svensk röst; namnge versioner i protokollet",
  "outcomes": [
    "Hör NVDA läsa Kim Exempel som Person utan Upphört och det separata Lo-sambandet som Upphört."
  ],
  "evidence": [
    {
      "kind": "overlap",
      "spec": "tests/integration/lifecycle.spec.ts",
      "caseId": "LIVSCYKEL-05",
      "purpose": "DOM-beskrivningar, status och beständig läsning; automationen hör inte NVDA."
    }
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför LIVSCYKEL-05 en gång. Under dess beskrivningsläsning, navigera
   med NVDA till varje namngiven objekt- eller sambandskontroll och lyssna.
2. Efter omstart, lyssna på samma kontroller igen.

**Förväntat resultat:**

- Hör NVDA läsa Kim Exempel som Person utan Upphört och det separata Lo-
  sambandet som Upphört.
- Den faktiska uppläsningen behåller samma betydelser efter omstart.
  Anteckna hörda ord; DOM-automation är separat underlag.

### LIVSCYKEL-09: faktiskt uppläst livscykelstatus för fall 06

**Syfte:** Kontrollera faktisk uppläsning utöver DOM-beskrivningar.

**Användare:** Den konfigurerade administratören med NVDA.

**Förutsättningar:** Förbered LIVSCYKEL-06 i en skrivbordsmiljö med
Chrome, NVDA och svensk röst. Anteckna samtliga versioner.

**Kräver mänsklig observation:** Hör NVDA skilja det tidigare upphörda
Använder-sambandet från de två gällande
Betalar-sambanden.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "humanObservation": {
    "kind": "screen-reader",
    "observation": "Hör NVDA skilja det tidigare upphörda Använder-sambandet från de två gällande Betalar-sambanden."
  },
  "reference": "Windows, Chrome och NVDA; svensk röst; namnge versioner i protokollet",
  "outcomes": [
    "Hör NVDA skilja det tidigare upphörda Använder-sambandet från de två gällande Betalar-sambanden."
  ],
  "evidence": [
    {
      "kind": "overlap",
      "spec": "tests/integration/lifecycle.spec.ts",
      "caseId": "LIVSCYKEL-06",
      "purpose": "DOM-beskrivningar, status och beständig läsning; automationen hör inte NVDA."
    }
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför LIVSCYKEL-06 en gång. Under dess beskrivningsläsning, navigera
   med NVDA till varje namngiven objekt- eller sambandskontroll och lyssna.
2. Efter omstart, lyssna på samma kontroller igen.

**Förväntat resultat:**

- Hör NVDA skilja det tidigare upphörda Använder-sambandet från de två gällande
  Betalar-sambanden.
- Den faktiska uppläsningen behåller samma betydelser efter omstart.
  Anteckna hörda ord; DOM-automation är separat underlag.

# Manuella testfall för sambandsarbete

Testfallen provar läsning och redigering av samband i den gemensamma dialogen.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

- Alex är en konfigurerad hushållsmedlem. Logga in genom installationens
  identitetsleverantör. Kartarbete kräver inget samtalsmedgivande.
- Använd bara påhittade namn och uppgifter i en separat provinstallation.

## Allmän förberedelse

1. Starta en separat testinstallation enligt
   [provförberedelsen](../development/devcontainer.md#disposable-local-database).
   Logga in som Alex och skapa ett tomt testhushåll.
2. Börja varje fall med ett nytt testhushåll. Behåll samma databas när appen
   startas om inom ett fall. Öppna tabellen från kartans verktygsfält.
3. När ett fall behöver två objekt, skapa Alex som **Person** med beskrivningen
   Personen i hushållet och Blå cykeln som **Fordon** med beskrivningen
   Cykeln i garaget. Välj **Lägg i utkastet och stäng** för varje objekt.
   Spara inte hela utkastet om fallet inte uttryckligen anger det.

## Färdiga förslag och fortsatt arbete

### SAMBAND-01: separata objekt och samband kan rättas oberoende

**Syfte:** Kontrollera hela kedjan från två separata objekt till ett samband
och senare rättelser utan att spara den gemensamma kartan.

**Användare:** Alex.

**Förutsättningar:** Ett tomt testhushåll utan objekt eller förslag.

**Integrationstest:**
[relationship-dialog.spec.ts](../../tests/integration/relationship-dialog.spec.ts),
testfallet “SAMBAND-01: separate complete objects connect and remain independently
editable in the shared dialog”.

**Steg:**

1. Skapa Alex som Person med beskrivningen Personen som använder cykeln och
   Blå cykeln som Fordon med beskrivningen Cykeln i garaget. Lägg varje
   fullständigt objekt i utkastet med **Lägg i utkastet och stäng**.
2. Öppna tabellen och **Samband för Alex**. Kontrollera fokus på rubriken
   och texten Ändringar läggs i ditt utkast. Kartan sparas separat.
   Välj **Nytt samband**. Kontrollera att **Från objekt** är Alex.
3. Välj typen **Använder**. Sök det andra objektet med `garaget` och välj
   Blå cykeln. Kontrollera namn, typ och beskrivning i objektvalet och läs
   hela meningen före inskickning. Välj **Lägg i utkastet**.
4. Kontrollera bekräftelsen och att dialogen stannar öppen. Välj
   **Redigera samband**, ändra säkerheten till **Osäkert uppgivet** och
   välj **Lägg i utkastet** igen.
5. Välj **Stäng samband** och kontrollera fokus på öppningsknappen.
   Öppna **Redigera Blå cykeln** i tabellen. Ändra beskrivningen till
   Rättad beskrivning och välj **Lägg i utkastet och stäng**.
6. Starta om appen med samma databas och granska utkastet igen.

**Förväntat resultat:**

- Båda objekten skapas separat. Inget objektformulär öppnas inuti samband.
- Sambandet visas med Alex, typen och Blå cykeln i rätt riktning. Det kan
  rättas utan att skapa en dubblett eller ändra objektens uppgifter.
- Objektets rättelse behåller sambandet och dess osäkerhet. De två objekten
  och det enda sambandet finns kvar i utkastet efter omstart. Den gemensamma
  kartan är fortfarande tom; automatiseringen kontrollerar detta genom HTTP.

### SAMBAND-02: fel och avbruten nästa inmatning bevarar tidigare förslag

**Syfte:** Kontrollera validering, förlustvarning och återfokus utan att kasta
ett redan färdigt samband.

**Användare:** Alex.

**Förutsättningar:** De två objekten från den allmänna förberedelsen finns
i utkastet. Inga samband finns ännu.

**Integrationstest:**
[relationship-dialog.spec.ts](../../tests/integration/relationship-dialog.spec.ts),
testfallet “SAMBAND-02: invalid next input and canceled form loss retain previous
complete relationship proposals”.

**Steg:**

1. Öppna **Samband för Alex**, välj **Nytt samband**, typen **Använder**
   och Blå cykeln som mål. Välj **Lägg i utkastet** och invänta bekräftelsen.
2. Välj **Nytt samband** igen. Lämna typ och mål tomma och försök lägga i
   utkastet. Kontrollera fokus på felsammanfattningen. Välj fellänken för
   sambandstyp och kontrollera att fältet får fokus.
3. Välj typen **Äger** och skriv Oskickad sökning i objektets sökfält.
   Tryck Escape. Kontrollera förlustvarningen med **Fortsätt redigera**
   förvalt. Tryck Escape igen och kontrollera återfokus och bevarad text.
4. Välj **Stäng samband**, sedan **Kasta ändringarna och fortsätt**.
   Kontrollera fokus på tabellens öppningsknapp och granska utkastet.

**Förväntat resultat:**

- Det ogiltiga formuläret lägger ingen del i utkastet. Fellänken fokuserar
  rätt fält och alla värden behålls.
- Escape i förlustvarningen avbryter förlusten och bevarar söktexten.
- Bekräftad förlust kastar endast nästa oskickade formulär. De två
  objektförslagen och det redan färdiga sambandet behålls oförändrade.

## Styrda avbrott

Fallen nedan använder en separat provinstallation och webbläsarens konsol.
Kör följande förberedelse innan den angivna inskickningen. Den påverkar bara
nästa inskickning av ett samband; vanlig hämtning och kontroll går till appen.
Välj `lost-applied` för ett förlorat svar efter verklig inskickning,
`lost-before` för ett avbrott före inskickning eller `delayed-rejection` för
ett väntande försök som sedan avvisas. Ladda om sidan efter avslutat fall.

```javascript
window.relationshipProbe = (mode) => {
  const original = window.fetch;
  window.fetch = async (input, options) => {
    const url = new URL(String(input), location.origin);
    if (!url.pathname.endsWith('/map/relationship-form'))
      return original.call(window, input, options);
    window.fetch = original;
    if (mode === 'lost-before') throw new TypeError('Synthetic interruption');
    if (mode === 'delayed-rejection') {
      await new Promise((resolve) => { window.relationshipRelease = resolve; });
      return Response.json({ error: 'invalid_request' }, { status: 400 });
    }
    await original.call(window, input, options);
    throw new TypeError('Synthetic lost response');
  };
};
```

### SAMBAND-03: förlorat dubblettsvar bevarar det försökta formuläret

**Syfte:** Kontrollera dubblettutfall och skydd vid byte till befintligt samband.

**Användare:** Alex.

**Förutsättningar:** De två objekten och ett känt samband av typen Använder
från Alex till Blå cykeln är gemensamt sparade. Inga privata förslag finns.

**Integrationstest:**
[relationship-dialog.spec.ts](../../tests/integration/relationship-dialog.spec.ts),
testfallet “SAMBAND-03: a lost duplicate result retains the attempted form and
offers guarded editing without overwrite”.

**Steg:**

1. Öppna Samband för Alex och Nytt samband. Välj Använder, Blå cykeln och
   Osäkert uppgivet. Kör `relationshipProbe('lost-applied')` i konsolen.
2. Välj Lägg i utkastet. Kontrollera att uppgifterna spärras och att
   Kontrollera om ändringen lades i utkastet erbjuds. Välj kontrollen.
3. Kontrollera Sambandet finns redan och bevarad osäkerhet. Välj
   Redigera befintligt samband, sedan Fortsätt redigera i förlustvarningen.
4. Välj Redigera befintligt samband igen och bekräfta förlusten. Kontrollera
   det befintliga kända sambandet och dess målobjekt. Stäng utan att ändra det.

**Förväntat resultat:**

- Kontroll sker före nytt försök. Ingen dubblett, överskrivning eller
  automatisk övergång till befintlig redigering sker.
- Avbrutet byte behåller försökets osäkerhet. Bekräftat byte visar
  befintliga värden. Gemensamma uppgifter och utkastet är oförändrade.

### SAMBAND-04: föreslagen borttagning kastar endast bekräftade oskickade värden

**Syfte:** Skilja borttagningsförslag från upphört och bevara sparade uppgifter.

**Användare:** Alex.

**Förutsättningar:** Samma sparade objekt och kända samband som i SAMBAND-03.
Sambandet följer slutdatum och saknar ett manuellt statusval.

**Integrationstest:**
[relationship-dialog.spec.ts](../../tests/integration/relationship-dialog.spec.ts),
testfallet “SAMBAND-04: proposed relationship removal discards only confirmed
unsent changes and keeps saved lifecycle facts”.

**Steg:**

1. Öppna Samband för Alex och Redigera samband. Välj Upphört som status.
2. Välj Föreslå borttagning. Kontrollera förvalt Fortsätt redigera och
   välj det. Kontrollera att Upphört fortfarande är valt och inget förslag lagts.
3. Välj Föreslå borttagning igen och Kasta ändringarna och fortsätt.
   Invänta bekräftelsen Föreslagen borttagning och läs det tidigare sambandet.

**Förväntat resultat:**

- Avbruten borttagning behåller formuläret. Bekräftad borttagning lägger
  endast ett borttagningsförslag; den oskickade statusändringen försvinner.
- Sparade uppgifter behåller sin tidigare livscykel. Sambandet är fortfarande
  gemensamt tills hela utkastet sparas. Ingen permanent radering sker.

### SAMBAND-05: fullständiga värden och säkerhet bevaras vid typbyte

**Syfte:** Kontrollera riktning, egna fält, slutdatum och skilda målbetydelser.

**Användare:** Alex.

**Förutsättningar:** De två objekten finns. Skapa typen Särskild användning
med benämningarna använder särskilt och används särskilt av. Lägg till avsnittet
Egna uppgifter och fälten Anteckning (Text), Antal (Tal), Kontrolldatum (Datum),
Kontrollerat (Ja/nej) och Dold uppgift (Text). Skapa ett samband med dessa svar:
Bevara texten, 3, 2040-05-06, Nej och Behåll dolt. Välj Osäkert uppgivet,
Gäller fortfarande och känt slutdatum 2040-06-07. Lägg sambandet i utkastet.
Dölj därefter Dold uppgift i typdefinitionen; behåll dess fält och svar.

**Integrationstest:**
[relationship-dialog.spec.ts](../../tests/integration/relationship-dialog.spec.ts),
testfallet “SAMBAND-05: full relationship values survive canceled type loss and
absent targets keep their distinct meanings”.

**Steg:**

1. Redigera sambandet från Alex och välj typen Äger. Läs alla tidigare
   egna fält, inklusive det dolda svaret och Nej. Kontrollera förvalt
   Fortsätt redigera. Tryck Escape och kontrollera att den tidigare typen kvarstår.
2. Välj Byt riktning och Lägg i utkastet. Kontrollera båda ändpunkterna,
   samtliga egna svar, status och slutdatum i det färdiga förslaget.
3. Redigera igen, välj Äger och bekräfta Ta bort fältvärdena och byt typ.
   Lägg i utkastet. Kontrollera att endast tidigare egna fält har försvunnit.
4. Öppna Samband för Blå cykeln. Redigera säkerheten i tur och ordning till
   Okänt, Uttryckligen inget och Obesvarad identitetsfråga; lägg varje färdig
   rättelse i utkastet. Kontrollera hela meningen före varje inskickning.

**Förväntat resultat:**

- Typbyte kräver uttryckligt besked om synliga och dolda fältvärden. Avbrott
  bevarar typen och svaren. Riktningsbyte bevarar egna fält och datum.
- Säkerhetsvalen utan identifierat mål har inget målobjekt och kan inte
  byta riktning. Deras olika betydelser bevaras. Den obesvarade frågan kan
  finnas i utkastet men måste lösas före gemensamt sparande.

### SAMBAND-06: läskedjan bevarar ett oklart tillägg

**Syfte:** Kontrollera återgång genom andra objekt utan att förlora kontrollförsöket.

**Användare:** Alex.

**Förutsättningar:** Två objekt och ett känt samband Använder finns i utkastet.

**Integrationstest:**
[relationship-dialog.spec.ts](../../tests/integration/relationship-dialog.spec.ts),
testfallet “SAMBAND-06: read-chain navigation retains an uncertain staging outcome
and restores the originating table control”.

**Steg:**

1. Redigera från Samband för Alex. Välj Osäkert uppgivet, kör
   `relationshipProbe('lost-applied')` och välj Lägg i utkastet.
2. Följ länken Blå cykeln i de befintliga sambanden. Kontrollera fokus på
   dess uppgiftsrubrik. Öppna dess samband och välj Tillbaka två gånger.
3. Kontrollera bevarad osäkerhet och välj Kontrollera om ändringen lades
   i utkastet. Invänta bekräftelsen och stäng sambandsdialogen.

**Förväntat resultat:**

- Läskedjan behåller försöket och kräver ingen förlust av formuläret.
  Kontrollen bekräftar den exakta ändringen utan ny inskickning.
- Sambandets förslag har Osäkert uppgivet. Återfokus går till tabellens
  ursprungliga öppningsknapp och tidigare sökning och läge finns kvar.

### SAMBAND-07: väntande och avvisade försök skyddar hela formuläret

**Syfte:** Kontrollera spärrad dubbelinskickning och bevarade värden efter avslag.

**Användare:** Alex.

**Förutsättningar:** De två objekten finns i utkastet, utan samband.

**Integrationstest:**
[relationship-dialog.spec.ts](../../tests/integration/relationship-dialog.spec.ts),
testfallet “SAMBAND-07: pending requests block duplicate sends and a rejected whole
relationship retains editable values”.

**Steg:**

1. Öppna Nytt samband från Alex. Välj Använder och Blå cykeln. Kör
   `relationshipProbe('delayed-rejection')` i konsolen.
2. Dubbelklicka Lägg i utkastet. Prova Escape och kontrollera spärrade
  redigeringsfält och stängningsknappar medan begäran väntar.
3. Kör `relationshipRelease()` i konsolen. Läs avslaget och kontrollera
   bevarade värden. Välj Lägg i utkastet igen utan styrt avslag.

**Förväntat resultat:**

- Ett enda försök skickas under väntan. Dialogen stängs inte och inga delar
  läggs i utkastet vid avslag. Det fullständiga formuläret kan rättas eller
  skickas igen.
- Nästa bekräftade försök lägger ett samband i utkastet och lämnar dialogen öppen.

### SAMBAND-08: kontroll av äldre framgång återspelar aldrig ett gammalt utkast

**Syfte:** Visa sanningen när samma användare senare har ändrat förslaget.

**Användare:** Alex i två separata webbläsarfönster med samma inloggning.

**Förutsättningar:** De två objekten finns i utkastet, utan samband.

**Integrationstest:**
[relationship-dialog.spec.ts](../../tests/integration/relationship-dialog.spec.ts),
testfallet “SAMBAND-08: recovery returns the current draft without replaying an
earlier successful relationship over later changes”.

**Steg:**

1. Skapa ett känt samband Använder från Alex till Blå cykeln i första
   fönstret. Kör `relationshipProbe('lost-applied')` före Lägg i utkastet.
2. Öppna samma hushåll i det andra fönstret. Redigera det färdiga sambandet
   till Osäkert uppgivet och lägg hela rättelsen i utkastet.
3. Kontrollera det ursprungliga försöket i första fönstret. Läs beskedet
   om ändrat aktuellt underlag och granska förslaget i det andra fönstret.

**Förväntat resultat:**

- Första formulärets kända uppgift finns kvar. Beskedet anger äldre framgång
  och senare ändrat underlag; ingen aktuell framgång eller automatisk övergång påstås.
- Det aktuella utkastet behåller Osäkert uppgivet. Kontrollen skriver inte över
  senare arbete. Automatiseringen kontrollerar också identisk återkontroll
  och avslag när ett tidigare försök återanvänds med annat innehåll.

### SAMBAND-09: tangentbord, smal skärm och navigationsförlust

**Syfte:** Kontrollera nåbara åtgärder, fokusfälla och bekräftad sidnavigation.

**Användare:** Alex.

**Förutsättningar:** De två objekten finns i utkastet. Börja från hushållets
Inställningar och välj Tillbaka till kartan. Prova på dator, smal telefon och
med skärmtangentbord öppet. Gör även ett separat prov med skärmläsare.

**Integrationstest:**
[relationship-dialog.spec.ts](../../tests/integration/relationship-dialog.spec.ts),
testfallen:

- “SAMBAND-09: keyboard form actions and confirmed route loss remain reachable
  at 1280x900”.
- “SAMBAND-09: keyboard form actions and confirmed route loss remain reachable
  at 320x640”.
- “SAMBAND-09: keyboard form actions and confirmed route loss remain reachable
  at 320x240”.

**Steg:**

1. Öppna tabellen, Samband för Alex och Nytt samband. Kontrollera fokus på
   dialogrubriken. Välj Använder och Blå cykeln med tangentbordet.
2. Nå Lägg i utkastet genom tangentbord och rullning. Kontrollera att
   fält, text och åtgärder går att använda med öppet skärmtangentbord.
3. Tabba från sista Stäng samband till första stängningsknappen. Kontrollera
   att dialogen håller fokus och att innehållet bakom är inaktivt.
4. Använd webbläsarens Tillbaka. Avbryt förlusten och kontrollera bevarat mål.
   Använd Tillbaka igen och bekräfta förlusten. Återvänd till kartan.

**Förväntat resultat:**

- Rubrik, etiketter, fel och status går att förstå med skärmläsare.
  Tangentbordet når samtliga åtgärder utan att lämna den öppna dialogen.
- Förlustvarningen har Fortsätt redigera förvalt. Bekräftad navigation kastar
  endast oskickade värden. Tidigare förslag finns kvar och ingen
  återupptagningsingång skapas.
- Automatiseringen provar tre skärmstorlekar. Fysiskt skärmtangentbord och
  skärmläsare kräver separata mänskliga prov; skriv deras faktiska resultat.

### SAMBAND-10: ett uteblivet tillägg kontrolleras före nytt försök

**Syfte:** Kontrollera tryggt nytt försök och ett senare borttaget dubblettmål.

**Användare:** Alex i två fönster med samma inloggning.

**Förutsättningar:** De två objekten finns i utkastet, utan samband.

**Integrationstest:**
[relationship-dialog.spec.ts](../../tests/integration/relationship-dialog.spec.ts),
testfallet “SAMBAND-10: a request that never reached the server is checked before
safe retry and later duplicate removal is reported truthfully”.

**Steg:**

1. Fyll Nytt samband med Använder från Alex till Blå cykeln. Kör
   `relationshipProbe('lost-before')` och välj Lägg i utkastet.
2. Välj Kontrollera om ändringen lades i utkastet. Läs beskedet att ändringen
   inte lades i utkastet. Kontrollera mål och typ och skicka igen utan avbrott.
3. Stäng dialogen och spara hela utkastet. Öppna Nytt samband med samma typ
   och ändpunkter igen. Kör `relationshipProbe('lost-applied')` och skicka.
4. Föreslå borttagning av det befintliga sambandet i andra fönstret. Kontrollera
   dubblettförsöket i första fönstret och läs beskedet om ändring eller borttagning.

**Förväntat resultat:**

- Ett uteblivet tillägg kan skickas igen först efter kontroll. Värdena behålls
  och det bekräftade försöket skapar exakt ett samband.
- Ett historiskt dubblettutfall påstår inte att sambandet fortfarande finns
  tillgängligt för redigering. Försökets värden och senare borttagningsförslag behålls.

### SAMBAND-11: objektval är oberoende av tabellens filter

**Syfte:** Visa alla valbara hushållsobjekt med korrekta typnamn och beskrivningar.

**Användare:** Alex.

**Förutsättningar:** Alex och Blå cykeln finns. Skapa Upphörd sak med status
Upphört och Tas bort som aktuellt objekt. Spara hela utkastet. Skapa därefter
typen Egen föremålstyp och objektet Ny sak med beskrivningen Särskild förklaring
i utkastet. Föreslå borttagning av Tas bort utan att spara hela utkastet.

**Integrationstest:**
[relationship-dialog.spec.ts](../../tests/integration/relationship-dialog.spec.ts),
testfallet “SAMBAND-11: the household object selector ignores table filters and
excludes removed proposals while retaining effective type names”.

**Steg:**

1. Sök Alex i tabellen så att övriga objekt inte visas. Öppna Samband för
   Alex och Nytt samband. Läs namn, typ och beskrivning i objektväljaren.
2. Kontrollera att Ny sak och Upphörd sak kan väljas men Tas bort inte kan
   väljas. Sök Särskild förklaring, välj Ny sak och typen Använder.
3. Lägg i utkastet, invänta bekräftelsen och stäng. Kontrollera bevarad tabellsökning.

**Förväntat resultat:**

- Objektval följer hushållets aktuella valbara objekt, inklusive nya privata
  förslag, och påverkas inte av tabellens sökning eller livscykelfilter.
- Föreslagen borttagning hindrar nya samband till objektet. Upphört är
  separat från borttagning. Sambandets mål är Ny sak och tabellsökningen kvarstår.

### SAMBAND-12: långa benämningar och fält bryts på smal skärm

**Syfte:** Kontrollera läsbarhet och bevarad inmatning utan sidledes rullning.

**Användare:** Alex.

**Förutsättningar:** Ett separat hushåll med Alex som Person och ett
utkastobjekt av typen Fordon vars namn består av 180 C. Skapa typen Långa
provuppgifter med benämningen från startobjektet på 180 L och från målobjektet
gäller för. Lägg till ett eget textfält vars namn består av 180 F. Lägg
definitionen i utkastet. För att få exakta provnamn, kör exempelvis
`console.log('C'.repeat(180))` i konsolen, kopiera resultatet och klistra in
det i det vanliga namnfältet; byt bokstav till L respektive F för de andra fälten.

**Integrationstest:**
[relationship-dialog-accessibility.spec.ts](../../tests/integration/relationship-dialog-accessibility.spec.ts),
testfallet “SAMBAND-12: long relationship names and field labels reflow without
horizontal overflow at 320 CSS pixels”.

**Steg:**

1. Använd en smal telefonvy. Öppna tabellen, Samband för Alex och Nytt samband.
2. Välj Långa provuppgifter och det långa C-objektet som mål. Skriv
   Bevara uppgiften i det långa F-fältet.
3. Läs hela meningen och fältets etikett. Rulla genom formuläret och
   kontrollera att inmatningen finns kvar. Skicka inte formuläret.

**Förväntat resultat:**

- Långa namn, benämningar och etiketter bryts så att hela innehållet kan
  läsas utan sidledes rullning. Inmatningen behålls och kan redigeras.
- Inga förslag tillkommer och den gemensamma kartan är oförändrad.
  Automatiseringen kontrollerar geometri vid 320 CSS-pixlar och aktuellt
  innehåll genom HTTP; det manuella provet kontrollerar användbarheten.

### SAMBAND-13: fokus efter inskickning, avbrytande och utfallskontroll

**Syfte:** Kontrollera meningsfullt fokus efter att formuläret tas bort och
bevara senare läsfokus när en väntande kontroll blir klar.

**Användare:** Alex.

**Förutsättningar:** Två objekt enligt den allmänna förberedelsen, inga
sparade samband. Förbered `relationshipProbe` enligt Styrda avbrott ovan.
För det sista kontrollförsöket, kör följande efter det förlorade svaret och
före kontrollknappen. Det håller nästa verkliga kontrollsvar tills det släpps:

```javascript
const originalCheckFetch = window.fetch;
window.fetch = async (input, options) => {
  const url = new URL(String(input), location.origin);
  if (!url.pathname.includes('/map/relationship-form/'))
    return originalCheckFetch.call(window, input, options);
  window.fetch = originalCheckFetch;
  const response = await originalCheckFetch.call(window, input, options);
  await new Promise((resolve) => { window.relationshipCheckRelease = resolve; });
  return response;
};
```

**Integrationstest:**
[relationship-dialog-accessibility.spec.ts](../../tests/integration/relationship-dialog-accessibility.spec.ts),
testfallet “SAMBAND-13: staging cancel and explicit outcome checks retain meaningful
focus without stealing later reading focus”.

**Steg:**

1. Öppna tabellen, Samband för Alex och Nytt samband. Välj Använder och
   Blå cykeln. Nå Lägg i utkastet med tangentbordet och skicka. Kontrollera
   fokus på dialogens rubrik och det enda fullständiga privata sambandet.
2. Öppna nästa formulär, skriv cykel i objektsökningen och välj Avbryt
   redigeringen. Bekräfta Kasta ändringarna och fortsätt. Kontrollera
   rubrikfokus och att det tidigare förslaget finns kvar.
3. Redigera sambandet till Osäkert uppgivet. Kör
   `relationshipProbe('lost-applied')`, skicka och välj sedan Kontrollera om
   ändringen lades i utkastet. Kontrollera rubrikfokus och bekräftat förslag.
4. Redigera igen till Känd. Kör `relationshipProbe('lost-applied')` och
   skicka. Kör förberedelsen för det väntande kontrollsvaret ovan. Välj
   Kontrollera om ändringen lades i utkastet och följ därefter Blå cykeln
   i läsningen medan kontrollen väntar. Kontrollera objektets rubrikfokus
   och texten Sparade uppgifter och ditt utkast.
5. Kör `relationshipCheckRelease()` i konsolen. Kontrollera att objektets
   rubrik fortfarande har fokus och läs bekräftelsen. Välj Tillbaka och
   kontrollera sambandsdialogens rubrikfokus och texten Ändringar läggs
   i ditt utkast. Kartan sparas separat.

**Förväntat resultat:**

- Formulärets inskickning och bekräftade avbrytande lämnar meningsfullt
  rubrikfokus. En senare läsvy behåller fokus när ett äldre kontrollsvar kommer.
- Det enda privata sambandet är först känt, därefter osäkert och slutligen
  känt igen. Tidigare objektförslag finns kvar, inga dubbletter tillkommer
  och den gemensamma kartan är oförändrad.
- Avbrotten är kontrollerade provvillkor. Automatiseringen använder verkliga
  inskickningar och HTTP-kontroller; fysisk manuell körning antecknas separat.

# Manuella testfall för fullständig återimport

Testfallen omfattar uttrycklig ersättning, bevarad åtkomst, bildhistorik,
privata utkast, personliga placeringar och ångring med nytt underlag.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.
Manuell körning sker efter att hela specifikationen är implementerad.

## Konfigurerade användare

Använd [en separat lokal provdatabas](../development/devcontainer.md#disposable-local-database)
i devcontainern och värddatorns webbläsare. **Alex** är testrollen för den
konfigurerade första administratörens befintliga Google- eller
Microsoft-konto; kontot behöver inte heta Alex. Skapa hushållet **Linden**
med påhittade uppgifter. Om fallet inte säger annat loggar två profiler in
med samma konto. IMPORT-09, IMPORT-11 och IMPORT-13 använder även **Robin**,
en annan verifierad användare som bjuds in till provhushållet. Fallens
steg anger respektive roll. Ingen publik webbadress eller tunnel behövs.

## Allmän förberedelse

1. Starta en ny provdatabas enligt länken ovan inför varje fall. Skapa
   Linden och ett sparat objekt **Lampa från exporten**.
2. Hämta en fullständig export enligt
   [exportguiden](../user-guide/household-export.md). Spara ZIP-filen privat.
3. Ändra objektets namn till **Senare namn** och spara hela utkastet.
4. Återställ provmiljön mellan fallen. Radera hämtade testfiler efteråt.
   Vid omstart ska samma databas användas: följ bara guidens
   omstartskommando och behåll dess terminal öppen.

## Bekräftad ersättning

### IMPORT-01: Ersätt hushållet med tangentbordet

**Syfte:** Kontrollera att förberedelse inte ändrar innehåll och att
ersättning kräver ett uttryckligt beslut från aktuell administratör.

**Användare:** Alex som administratör.

**Förutsättningar:** ZIP-filen och den senare namnändringen finns enligt
förberedelsen. Ingen annan ändrar hushållet under detta fall.

**Integrationstest:**
[household-import-ui.spec.ts](../../tests/integration/household-import-ui.spec.ts),
testfallet “IMPORT-01: an administrator reviews and explicitly replaces
household content with the keyboard”.

**Steg:**

1. Öppna **Inställningar → Återimportera hushållet** och läs omfattningen.
2. Välj ZIP-filen. Använd Tab till **Kontrollera importfil** och Enter.
3. Läs sammanställningen. Kontrollera i den andra profilen att **Senare
   namn** fortfarande finns. Ersättningsknappen ska ännu vara avstängd.
4. Använd tangentbordet för att markera bekräftelsen. Tryck Enter på
   **Ersätt hushållets innehåll** och invänta resultatet.
5. Läs in hushållet igen och kontrollera objektets namn. Starta om servern
   med samma databas och kontrollera innehåll och administration igen.

**Förväntat resultat:**

- Förberedelsen ändrar inget. Efter uttrycklig bekräftelse visas **Lampa
  från exporten**, och den senare namnändringen saknas.
- Alex är fortfarande administratör efter ersättning och omstart.
- Ett tydligt resultat visas. Ett uteblivet svar ska följas upp med
  **Hämta importens status**, inte tolkas som ett säkert misslyckande.

## Historik och gamla klienter

### IMPORT-06: återställ bildhistorik och ångra med nytt underlag

**Syfte:** Kontrollera att en återimport bevarar sammanslagningens
bildversioner, privata förslag och personliga placeringar, samtidigt som
gamla klientunderlag och sparförsök inte kan skriva tillbaka senare innehåll.

**Användare:** Alex i två separata webbläsarprofiler, A och B, med samma
administratörskonto. Profil B behöver två flikar under importen.

**Förutsättningar:** En ny lokal provdatabas enligt förberedelsen och inga
andra pågående sparförsök. Använd två tydligt olika små provbilder från
[bildförberedelsen](profile-images.md#allmän-förberedelse). Använd Chromium
med utvecklarverktyg i båda profilerna. Kör konsolkoden endast på provsidan.

**Integrationstest:**
[household-import-history.spec.ts](../../tests/integration/household-import-history.spec.ts),
testfallet “IMPORT-06: replacement preserves merged image history and
private work, rejects a lost-receipt retry and permits fresh undo after
restart”.

**Steg:**

1. I profil A: skapa två objekt med namnet **Lo Exempel** som föreställer
   samma påhittade person. Spara ett samband från det andra objektet med
   okänd målpunkt. Placera objekten på två igenkännliga platser i rymdkartan.
2. Lägg den första provbilden på det andra objektet och spara den.
   Slå samman objekten med det första som kvarvarande identitet.
   Bekräfta identiteten, välj det andra objektets bild och behåll sambandet.
   Kör **Fånga nästa sparbegäran** nedan i profil A och ange `merge`.
   Välj därefter **Spara hela utkastet** utan att ladda om sidan. Invänta
   kvittot och konsolbeskedet **IMPORT-06: merge sparat**.
3. Lägg den andra provbilden som privat bildförslag på kvarvarande objekt.
   Låt förslaget vara osparat. Hämta en fullständig export i
   **Inställningar → Fullständig export** och behåll ZIP-filen privat.
4. I profil A: skapa **Senare objekt** och lägg det i utkastet. Kör samma
   fångstkod igen, ange `later` och välj **Spara hela utkastet**. Kontrollera
   konsolbeskedet **IMPORT-06: later sparat** och gränssnittets
   **Utfallet är okänt**. Välj inte att hämta kvittot igen. I profil B:
   öppna aktuell karta och kontrollera att **Senare objekt** finns; det
   visar att servern sparade innan svaret försvann. Börja skriva ett nytt
   objektförslag, men låt formuläret vara öppet utan att skicka det.
5. Öppna en andra flik i profil B och gå till
   **Inställningar → Återimportera hushållet**. Välj exporten
   från steg 3, granska rätt hushåll och bekräfta ersättningen. Försök sedan
   lägga den första flikens gamla öppna objektförslag i utkastet, innan
   servern startas om. Kontrollera att förslaget avvisas och inte syns i
   aktuell karta eller historik. Läs in aktuell karta när klienten begär det.
6. Starta om servern med samma databas enligt utvecklingsguiden. Ladda om
   profil A och B. Kontrollera den sammanslagna kartan, den privata andra
   bilden och det ursprungliga sammanslagningskvittot. **Senare objekt**
   ska saknas. Kör **Prova båda gamla sparbegärandena** nedan i profil A,
   på samma ursprung och i samma flik som fångstkodens båda körningar.
   Omladdning behåller de fångade uppgifterna. Kontrollera två HTTP 409,
   ett för `merge` och ett för `later`, samt beskedet att karta och historik
   är oförändrade. Inget gammalt lyckat kvitto får returneras.
7. I profil B: kasta det återställda privata bildförslaget, välj
   sammanslagningskvittot i historiken och ångra sparandet. Granska och
   spara hela det nya utkastet. Starta om med samma databas och kontrollera
   båda objektens bilder, samband och personliga placeringar.
8. Ta bort konsolens två sparade testbegäranden genom den sista kodraden
   nedan. Stäng testprofilerna och följ provmiljöns städning efter fallet.

**Fånga nästa sparbegäran:**

Öppna F12 → **Console** i profil A. Kör blocket en gång före
sammanslagningens sparande med svaret `merge`, och en gång före det senare
sparandet med svaret `later`. Ingen annan sparbegäran får skickas mellan
förberedelsen och respektive knapptryckning. Koden sparar bara sökvägen och
begärans ursprungliga `version`, `contentVersion` och `operationId` i flikens
`sessionStorage`. Den kopierar inga cookies, token eller inloggningshuvuden.

För `later` kontrollerar koden först ett lyckat serversvar med rätt kvitto,
återställer `fetch` och kastar sedan bort svaret för applikationen. Om inget
lyckat svar kommer avbryts inte svaret, och fallet ska markeras som ej
verifierat. Vanligt offlineläge bevisar inte ett avbrott efter transaktionen.
Ladda om fliken om du avbryter innan nästa sparande.

```javascript
(() => {
  const slot = prompt('merge eller later');
  if (!['merge', 'later'].includes(slot)) throw new Error('invalid slot');
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const request = new Request(
      input instanceof Request ? input.clone() : input, init,
    );
    const url = new URL(request.url);
    if (url.origin !== location.origin || request.method !== 'POST'
        || !/^\/api\/households\/[^/]+\/map\/save$/.test(url.pathname)) {
      return originalFetch(input, init);
    }
    window.fetch = originalFetch;
    const body = await request.json();
    const keys = Object.keys(body).sort().join(',');
    if (keys !== 'contentVersion,operationId,version') {
      throw new Error('unexpected save fields; stop this case');
    }
    const response = await originalFetch(input, init);
    const result = await response.clone().json();
    if (!response.ok || result.receipt?.operationId !== body.operationId) {
      console.error('IMPORT-06: inget lyckat kvitto; kontrollera utfallet');
      return response;
    }
    sessionStorage.setItem(`skyttel-import06-${slot}`, JSON.stringify({
      path: url.pathname, body,
    }));
    console.info(`IMPORT-06: ${slot} sparat`);
    if (slot === 'later') throw new TypeError('Synthetic lost save response');
    return response;
  };
  console.info('IMPORT-06: redo för nästa sparande');
})();
```

**Prova båda gamla sparbegärandena:**

Kör efter import och omstart, före det nya ångringsförslaget. Koden använder
profil A:s egen session och aktuellt bygg-ID, men återanvänder de tre gamla
begäransfälten exakt. Den tar en aktuell karta och historik före försöken och
jämför dem efter varje försök. Endast status och felkod skrivs ut; kopiera
inte privata webbläsardata till en rapport.

```javascript
await (async () => {
  const saved = ['merge', 'later'].map(slot => ({
    slot,
    ...JSON.parse(sessionStorage.getItem(`skyttel-import06-${slot}`)),
  }));
  const pattern = /^\/api\/households\/[^/]+\/map\/save$/;
  if (saved.some(item => !pattern.test(item.path) || !item.body)
      || saved[0].path !== saved[1].path) {
    throw new Error('missing requests or different household; stop');
  }
  const mapPath = saved[0].path.slice(0, -'/save'.length);
  const read = async path => {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`read failed: ${response.status}`);
    return response.json();
  };
  const snapshot = async () => JSON.stringify({
    map: await read(mapPath), history: await read(`${mapPath}/history`),
  });
  const before = await snapshot();
  const build = await read('/api/version');
  for (const item of saved) {
    const response = await fetch(item.path, {
      method: 'POST', credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Skyttel-Build': `${build.commit}:${build.version}`,
      },
      body: JSON.stringify(item.body),
    });
    const result = await response.json();
    console.info('IMPORT-06', item.slot, response.status, result.error);
    if (response.status !== 409
        || !['content_conflict', 'operation_conflict'].includes(result.error)) {
      throw new Error('old save was not rejected by content protection');
    }
    if (await snapshot() !== before) {
      throw new Error('map or history changed after old save retry');
    }
  }
  console.info('IMPORT-06: karta och historik är oförändrade');
})();
```

Efter fallet, ta bort de två lokalt sparade begärandena:

```javascript
for (const slot of ['merge', 'later']) {
  sessionStorage.removeItem(`skyttel-import06-${slot}`);
}
```

**Förväntat resultat:**

- För det senare sparandet visas okänt utfall trots att aktuell karta i
  den andra profilen bekräftar transaktionen. Efter importen finns den
  sammanslagna kartan och dess första bild samt det osparade förslaget med
  den andra bilden. Senare sparat innehåll blandas inte in.
- Både det senare sparandets gamla begäran och den importerade
  sammanslagningens gamla begäran avvisas med HTTP 409. Karta, privata
  utkast och historik är oförändrade efter varje försök. Inget nytt
  sparande eller falskt gammalt lyckat kvitto uppstår.
- Det gamla öppna objektförslaget avvisas utan ny kartändring. Det
  ursprungliga kvittots identitet, författare och tidpunkt bevaras.
  Ett nytt aktuellt underlag kan ångra den importerade sammanslagningen.
- Efter ångrandet finns båda ursprungliga identiteterna. Det andra
  objektets första bild, okända målpunkt och båda personliga placeringarna
  är bevarade även efter omstart.

### IMPORT-07: bevara äldre fältbetydelser och ångra med nytt underlag

**Syfte:** Kontrollera att import bevarar både dagens fältdefinition och
historiska värden med en annan definition, utan att konvertera värden.

**Användare:** Alex som administratör.

**Förutsättningar:** Ett separat provhushåll utan andra ändringar. Välj
en objekttyp utan använda egna fält. Följ förberedelserna för fullständig
export och återimport i detta dokument.

**Integrationstest:**
[household-import-definitions.spec.ts](../../tests/integration/household-import-definitions.spec.ts),
testfallet “IMPORT-07: historical field meanings survive replacement and
fresh whole-save undo”.

**Steg:**

1. Lägg till textfältet **Serienummer** på den oanvända objekttypen och
   spara hela utkastet.
2. Ändra det ännu oanvända fältets värdeslag till tal. Lägg objektet
   **Mätare** av samma typ med värdet **42** i utkastet. Spara dessa två
   ändringar tillsammans och anteckna kvittot.
3. Ångra hela sparandet från steg 2 genom historiken och spara
   ångringsförslaget. Kontrollera att objektet saknas och fältet är text
   igen. Behåll även detta kvitto.
4. Hämta en fullständig export. Återimportera filen till samma hushåll
   genom **Inställningar → Återimportera hushållet** och bekräfta ersättningen.
   Starta om servern med
   samma databas och öppna hushållet igen.
5. Kontrollera båda kvittona i historiken. Ångra sparandet från steg 3
   med aktuellt underlag och spara hela förslaget. Starta om igen och
   kontrollera **Mätare** och fältdefinitionen.

**Förväntat resultat:**

- Exporten accepteras även när ett historiskt talvärde hör till ett fält
  som nu är text. Fältets och objektets stabila identiteter bevaras.
- Historiken behåller samma kvitton, författare, tidpunkter och tidigare
  värden efter importen. Talet **42** konverteras inte till text.
- Det nya ångrandet återställer **Mätare**, talfältet och värdet **42**.
  Resultatet kvarstår efter omstart och de tidigare kvittona är oförändrade.

### IMPORT-08: förbered filen på nytt när en tidigare förberedelse saknas

**Syfte:** Kontrollera att en bortstädad förberedelse inte låser importen
och att en ny ersättning kräver ny granskning och bekräftelse.

**Användare:** Alex som administratör.

**Förutsättningar:** En fullständig provexport och en separat testinstallation
som får startas om. Ingen ersättning har bekräftats.

**Integrationstest:**
[household-import-recovery.spec.ts](../../tests/integration/household-import-recovery.spec.ts),
testfallet “IMPORT-08: an unavailable prepared archive allows fresh review
after restart without changing content”.

**Steg:**

1. Välj exportfilen i **Inställningar → Återimportera hushållet** och tryck
   **Kontrollera importfil**.
   Granska sammanställningen men bekräfta inte ersättning.
2. Starta om servern med samma databas. Ladda om importsidan.
   Tryck **Hämta importens status** innan du väljer någon ny fil.
3. Läs beskedet om den saknade förberedelsen och kontrollera att kartan
   fortfarande har sitt tidigare innehåll.
4. Välj filen på nytt, kontrollera den och granska den nya sammanställningen.
   Bekräfta uttryckligen ersättningen och invänta resultatet.

**Förväntat resultat:**

- Omstarten städar tillfälligt material utan att ersätta hushållets innehåll.
- Statusbeskedet gör det möjligt att välja en ny fil. Ett saknat förberett
  arkiv påstås inte vara en genomförd import.
- Den nya filen kräver ny granskning och ett nytt uttryckligt beslut.
  Därefter kan samma giltiga export återimporteras.

### IMPORT-09: hitta samma ersättning i en annan administratörs webbläsare

**Syfte:** Följ ett bekräftat importförsök trots tappat svar, ny webbläsare
och omstart utan att ersätta innehållet en gång till.

**Användare:** Alex och Robin som aktuella administratörer i separata
webbläsarprofiler. Bjud först in Robin och ge rollen administratör.

**Förutsättningar:** En separat provinstallation och export enligt den
allmänna förberedelsen. Robin har inte öppnat importen tidigare. Använd
Chromium med utvecklarverktyg i Alex profil.

**Integrationstest:**
[household-import-discovery.spec.ts](../../tests/integration/household-import-discovery.spec.ts),
testfallet “IMPORT-09: another administrator discovers the same committed
import after a lost response and restart”.

**Steg:**

1. Alex väljer exportfilen och **Kontrollera importfil**. Läs granskningen.
2. Kör följande kod i utvecklarverktygens Console innan bekräftelsen.
   Den släpper igenom serverns begäran och kastar bort ett lyckat svar.
   Fortsätt endast om konsolen senare visar det slutförda försökets ID.
3. Alex markerar bekräftelsen och väljer **Ersätt hushållets innehåll**.
   Kontrollera beskedet **Utfallet är okänt** och att nytt filval är spärrat.
4. Robin öppnar importen i sin egen webbläsare. Kontrollera att slutfört
   resultat visas för samma försökets ID, utan uppladdning eller bekräftelse.
5. Kontrollera återställt innehåll, privata utkast och aktuell tillgång.
   Starta om servern med samma databas och ladda om Robins importvy.
   Samma försök och resultat ska fortfarande visas.

```javascript
(() => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    if (request.method !== 'POST'
        || !/\/imports\/[^/]+\/confirm$/.test(new URL(request.url).pathname)) {
      return originalFetch(input, init);
    }
    window.fetch = originalFetch;
    const response = await originalFetch(input, init);
    const result = await response.clone().json();
    if (!response.ok || result.status !== 'completed') return response;
    console.info('IMPORT-09: slutfört försök', result.id);
    throw new TypeError('Synthetic lost import response');
  };
})();
```

**Förväntat resultat:**

- Alex får inget falskt framgångs- eller misslyckandebesked när svaret
  försvinner. Robin hittar samma beständiga försök med aktuell behörighet.
- Omstart bevarar försökets identitet och resultat. Ingen ny ersättning
  begärs och inget privat arbete blandas ihop.

### IMPORT-10: återfå en ny granskning efter tappat förberedelsesvar

**Syfte:** Kontrollera att en äldre slutförd import inte döljer en ny
förberedelse som samma administratör ännu inte har bekräftat.

**Användare:** Alex i två separata webbläsarprofiler.

**Förutsättningar:** En separat provinstallation och en fullständig export.
Genomför först IMPORT-01. Behåll servern igång under detta fall; en
obekräftad förberedelse upphör efter tio minuter eller vid omstart.

**Integrationstest:**
[household-import-discovery.spec.ts](../../tests/integration/household-import-discovery.spec.ts),
testfallet “IMPORT-10: the current administrator recovers a lost
preparation before an older completed import”.

**Steg:**

1. Öppna importen i profil A och välj exportfilen på nytt. Kör följande
   kod i utvecklarverktygens Console före **Kontrollera importfil**.
2. Välj **Kontrollera importfil**. Fortsätt endast om konsolen visar
   ID för en kontrollerad förberedelse. Läs felbeskedet i gränssnittet.
3. Logga in med samma konto i en ny profil B och öppna importen.
   Kontrollera att den nya granskningen och samma ID visas, istället
   för att den äldre importen visas som resultatet av det nya försöket.
4. Kontrollera att innehållet fortfarande är oförändrat och att
   ersättning kräver en ny markering av bekräftelsen.
5. Bekräfta ersättningen i profil B. Kontrollera det slutförda resultatet.

```javascript
(() => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    if (request.method !== 'POST'
        || !/\/imports$/.test(new URL(request.url).pathname)) {
      return originalFetch(input, init);
    }
    window.fetch = originalFetch;
    const response = await originalFetch(input, init);
    const result = await response.clone().json();
    if (!response.ok || result.status !== 'ready') return response;
    console.info('IMPORT-10: kontrollerad förberedelse', result.id);
    throw new TypeError('Synthetic lost preparation response');
  };
})();
```

**Förväntat resultat:**

- Samma administratör återfår den nya granskningen utan ny uppladdning.
  En annan administratör får inte bekräfta den obekräftade förberedelsen.
- Den äldre slutförda importen används inte som besked för det nya
  försöket. Ingen ny ersättning sker innan ett uttryckligt beslut.

### IMPORT-11: slutför samma rensning med en annan administratör

**Syfte:** Kontrollera att en verklig rensningsspärr består efter
ersättningen och kan lösas av en annan aktuell administratör.

**Användare:** Alex och Robin som aktuella administratörer i separata
webbläsarprofiler samt driftansvarig för den lokala provinstallationen.

**Förutsättningar:** En separat provinstallation och en fullständig export.
Bjud in Robin och ge rollen administratör. Kör servern utan rootbehörighet.
Driftansvarig behöver kunna ändra rättigheter för provets tillfälliga filer.
Gör aldrig detta i en installation som används för riktigt hushållsarbete.

**Integrationstest:**
[household-import-discovery.spec.ts](../../tests/integration/household-import-discovery.spec.ts),
testfallet “IMPORT-11: another administrator finishes the same gated
cleanup after the original administrator loses authority”.

**Steg:**

1. Alex väljer exportfilen och **Kontrollera importfil**. Anteckna
   försökets visade ID före bekräftelsen.
2. Driftansvarig hittar katalogen `.skyttel-imports` bredvid provets
   SQLite-fil och dess underkatalog med samma ID. Sätt endast den
   underkatalogens rättigheter till `500` med `chmod`. Behåll terminalen.
3. Alex bekräftar ersättningen. Kontrollera beskedet att innehållet är
   ersatt men att tillfälliga filer behöver rensas. Försök öppna kartan
   och göra en export i Robins profil; båda ska vara spärrade.
4. Robin ändrar Alex roll till medlem genom administrationen. Öppna
   sedan importen i Robins profil. Samma ID och väntande rensning ska
   visas automatiskt. Ny uppladdning ska vara spärrad.
5. Driftansvarig återställer underkatalogens rättigheter till `700`.
   Robin väljer **Slutför importens rensning**. Kontrollera att samma
   försök blir slutfört och att katalogen försvinner.
6. Läs in kartan igen. Kontrollera återställt innehåll och privat arbete.
   Starta om med samma databas och kontrollera försökets resultat igen.
   Vid avbrutet test: återställ alltid katalogens rättigheter till `700`.

**Förväntat resultat:**

- Ersättningen är beständig trots att rensningen misslyckas. Kartan och
  ny export är spärrade tills rensningen faktiskt lyckas.
- Alex kan inte läsa eller slutföra importförsöket efter rolländringen.
  Robin kan följa och slutföra exakt samma försök utan en ny ersättning.
- Samma resultat och oförändrat återställt innehåll består efter omstart.

### IMPORT-12: egna inställningssidor och skyddat kartarbete

**Syfte:** Bevara oskickat kartarbete vid vanlig navigering och stoppa
det gamla arbetet när hushållets innehåll ersätts.

**Användare:** Alex som administratör.

**Förutsättningar:** En separat provinstallation och en fullständig export.
Använd tangentbord och kontrollera både mobil och dator.

**Integrationstest:**
[household-import-settings.spec.ts](../../tests/integration/household-import-settings.spec.ts),
testfallet “IMPORT-12: protected Settings recovery pages preserve ordinary
work and retire it after replacement”.

**Steg:**

1. Öppna formuläret för ett nytt objekt. Skriv ett namn men lägg inte
   förslaget i utkastet. Låt fokus vara i namnfältet.
2. Öppna **Inställningar → Återimportera hushållet**. På mobil fäller
   du först ut **Välj inställning**. Kontrollera att sidrubriken får
   synligt fokus och att kartan inte kan användas bakom sidan.
3. Välj exportfilen. Aktivera **Kontrollera importfil** med tangentbordet.
   Läs **Ersätts** och **Behålls**; ersättning kräver fortfarande bekräftelse.
4. Besök **Koppla historiskt innehåll** genom inställningarnas navigation.
   Hämta aktuell metadata och läs identitetsvarningen, utan att ändra något.
5. Välj **Tillbaka till kartan**. Kontrollera samma oskickade namn och fokus.
6. Gå tillbaka till importen och välj **Hämta importens status**. Granska
   samma förberedelse, markera bekräftelsen och genomför ersättningen.
7. Kontrollera slutfört resultat och fokus på återinläsningen. Återgå till
   kartan. Det gamla oskickade formuläret ska försvinna; inget gammalt
   förslag får följa med till det ersatta innehållet.

**Förväntat resultat:**

- Import och historisk identitetsgranskning har egna sidor i Inställningar.
  Vanlig navigering behåller oskickad text och dess fokus utan att spara den.
- Ersättning kräver uttryckligt beslut. Därefter kan det gamla kartarbetet
  inte fortsätta mot det återställda innehållet.

### IMPORT-13: åtkomst till import och historisk identitetsgranskning

**Syfte:** Kontrollera att direkta adresser och förlorad administratörsroll
inte ger tillgång till administrativa innehållsåtgärder.

**Användare:** Alex som administratör och Robin i en separat profil.

**Förutsättningar:** En separat provinstallation. Robin har ännu inte
fått tillgång till hushållet. Spara adresserna till de två sidorna i
Inställningar för att kunna öppna dem direkt.

**Integrationstest:**
[household-import-settings.spec.ts](../../tests/integration/household-import-settings.spec.ts),
testfallet “IMPORT-13: import and identity Settings destinations enforce
current household administrator access”.

**Steg:**

1. Öppna importens adress i en utloggad profil. Kontrollera att
   inloggning krävs och att filval saknas.
2. Robin loggar in utan inbjudan och öppnar adressen för historiskt
   innehåll. Ingen metadata eller kontroll för innehållskoppling ska visas.
3. Bjud in Robin och acceptera som medlem. Öppna båda adresserna igen.
   Sidorna ska neka administration utan filval eller identitetsgranskning.
4. Alex ger Robin rollen administratör och öppnar importen i sin egen
   profil. Robin ändrar sedan Alex roll till medlem.
5. Återvänd till Alex öppna flik och kontrollera att importsidan förlorar
   sina administrativa kontroller när åtkomsten uppdateras. Båda sidorna
   kräver fortsatt aktuell administratörsroll.

**Förväntat resultat:**

- Inloggning, aktuellt medlemskap och administratörsroll krävs. En direkt
  adress kringgår inte skyddet och visar inga privata innehållsvärden.
- När rollen försvinner tas kontrollerna bort även på en öppen sida.

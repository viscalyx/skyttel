# Manuella testfall för sparförsök och demoförberedelse

Testfallen gäller att återfinna sparförsök och skilja ett okänt utfall från
ett väntande, genomfört eller avvisat sparande. Anteckna commit,
webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

Logga in med den administratör som anges av
`SKYTTEL_FIRST_ADMIN_PROVIDER` och `SKYTTEL_FIRST_ADMIN_SUBJECT`.
Använd samma inloggning i två separata webbläsarprofiler. En annan
webbläsare går också bra. Den andra profilen får inte ärva den första
profilens flikar eller lokala webbläsardata.

SPAR-04 behöver dessutom en separat testidentitet med aktuell tillgång
till hushållet och rollen medlem. Följ
[inbjudan av en användare](../user-guide/access.md#bjud-in-en-skyttel-användare)
för att ge identiteten tillgång. Kartans påhittade personer och Robin Demo
saknar inloggning;
de kan inte användas som testidentitet.

## Allmän förberedelse

Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor) när
fallen anger formulär, samtal, profil eller administration.

Öppna **Tabell** och välj **Redigera [objektets namn]** för att ändra ett
befintligt objekt. **Nytt objekt** finns direkt i verktygsfältet. För
samband väljer du **Samband för [objektets namn]** och dess namngivna
redigeringsknapp. Förslag läggs i ditt privata utkast; sparandet görs
separat genom **Visa utkastet → Spara hela utkastet**.

1. Förbered en separat utvecklingsdatabas enligt
   [demodata och återställning](../development/devcontainer.md#reset-demo-data).
   Återställning tar bort befintliga utvecklingsdata och sessioner.
2. Kör `npm run db:setup` och starta applikationen med `npm run dev:all`.
3. Öppna [utvecklingsklienten](http://localhost:5173) och logga in som
   den konfigurerade administratören. Kontrollera **TestHousehold**.
4. Öppna **Visa utkastet**, välj **Kasta hela utkastet** och bekräfta
   borttagningen för att ta bort demoutkastet.

Återställ demodata före varje fall. Behåll samma databas under omstart
inom ett testfall; kör då inte `npm run db:setup`.

## Gemensamma demodata

### DEMO-01: utvecklingshushållet har verkliga uppgifter och läsbara samband

**Syfte:** Kontrollera den gemensamma utvecklingsförberedelsen genom den
vanliga arbetsytan, med fulla värden, konflikter och bevarade privata förslag.

**Användare:** Den konfigurerade administratören. Prova Google och Microsoft
var för sig när båda inloggningarna är konfigurerade. Robin Demo är en
historisk person utan inloggning och ger ingen annan person medlemskap.

**Förutsättningar:** Använd endast den separata utvecklingsdatabasen.
Kör steg 1–3 i Allmän förberedelse; kasta inte demoutkastet i steg 4.
Databasförberedelsen tar bort tidigare utvecklingsdata och sessioner.

**Integrationstest:**
[database-setup.spec.ts](../../tests/integration/database-setup.spec.ts),
testfallen “DEMO-01: database setup gives only the configured google
administrator a ready TestHousehold” och “DEMO-01: database setup gives
only the configured microsoft administrator a ready TestHousehold”.

**Steg:**

1. Logga in som den konfigurerade administratören och öppna **Tabell**.
   Kontrollera **TestHousehold**, Alex Exempel, Alex blå cykel och
   Familjens garage. Expandera cykelns rad.
2. Läs Ramfärg **Blå**, Extrahjul **0**, Kontrolldatum **2026-04-03**,
   Elcykel **Nej** och Dold rammärkning **Syntetisk ram: DEMO-CYKEL**.
   Läs hela beskrivningen, priset **4995 SEK**, ikonen och livscykeln.
3. Öppna **Samband för Alex Exempel** och välj **Alex blå cykel**.
   Läs de fulla uppgifterna, öppna cykelns samband och välj
   **Familjens garage**. Stäng med Escape och återgå till tabellen.
4. Öppna **Granska konflikter** via konfliktantalet. Läs Lo Lind i
   ditt förslag och Lo Berg i den gemensamma kartan. Stäng utan att välja
   eller bekräfta något.
5. Öppna **Visa utkastet**. Läs de två bevarade förslagen: Lo Lind
   och den ändrade inloggningsadressen till `musik@example.test`.
   Öppna **Rapporter → Ändringshistorik** och läs de två verkliga
   sparandena med skilda personer. Gör inga ändringar.
6. Starta om applikationen med samma databas och logga in igen om det
   behövs. Kontrollera att samma uppgifter och förslag finns kvar.

**Förväntat resultat:**

- Hushållet innehåller sexton sparade objekt och tjugotre samband.
  Alex → cykel → garage nås utan visuell kartnavigation.
- Alla fyra egna fältslag, det dolda fältet, noll och Nej är läsbara
  tillsammans med de ekonomiska uppgifterna. Inget värde antas saknas.
- Granskning och läsning ändrar inte kartan, de två privata förslagen
  eller historiken. De två sparandena behåller sin verkliga upphovsperson.
- Endast den konfigurerade inloggningen får administratörstillgång.
  Den andra leverantörens inloggning ger inte tillgång genom samma namn.
  Automatiseringen verifierar denna gräns och bevarande efter omstart.

## Återfinna ett sparande

### SPAR-01: återfinna ett genomfört sparande från en annan klient

**Syfte:** Kontrollera att ett beständigt kvitto kan återfinnas efter
omstart och byte av klient utan att användaren behöver ett operations-ID.

**Användare:** Den konfigurerade administratören i båda profilerna.

**Förutsättningar:** Allmän förberedelse ovan. Ingen profil har ett
pågående sparförsök.

**Integrationstest:**
[operations.spec.ts](../../tests/integration/operations.spec.ts),
testfallet “SPAR-01: find a committed save after losing its response and
reopening on another client”.

**Steg:**

1. Välj **Nytt objekt**, skriv **Återfunnet sparande** som namn och välj
   **Lägg i utkastet och stäng**.
2. Öppna **Visa utkastet**, välj **Spara hela utkastet** och läs
   **Utkastet är sparat**. Öppna **Rapporter → Ändringshistorik**.
   Läs händelsen och öppna **Identifiera sparandet och användaren**.
   Anteckna sparandets identitet för jämförelse.
3. Stäng den första profilen. Stoppa och starta applikationen igen med
   samma databas.
4. Öppna appen i den andra profilen och logga in som samma användare.
   Hitta sparandet i **Rapporter → Ändringshistorik** utan att skriva in
   kvittots identitet eller kopiera webbläsardata.
5. Kontrollera händelsens identitet och uppgifter. Välj **Tillbaka till
   arbetet**, läs det tomma utkastet och objektet i **Tabell**.

**Förväntat resultat:**

- Sparandet visas i historiken i den andra profilen. Händelsen har
  samma identitet och beskriver **Återfunnet sparande**.
- Utkastet visar **Utkastet är tomt.** Objektet finns en gång i kartan.
- Ett genomfört sparande går att hitta även när den ursprungliga
  profilen är stängd och servern startar om.

Det kontrollerade tappade svaret efter genomförd transaktion provas
endast automatiserat: testet låter den riktiga servern spara och bryter
sedan svaret till webbläsaren. Då ska klienten visa **Utfallet är okänt**
och blockera ändringar tills utfallet kontrolleras. Testet återfinner
sedan kvittot efter omstart och verifierar genom det publika API:et att
ett återförsök ger samma kvitto, objekt och enda historikhändelse.
De manuella stegen ovan verifierar återfinnandet efter ett bekräftat
sparande; de verifierar inte själva avbrottet efter transaktionen.

### SPAR-02: automatiskt kontrollera ett väntande sparande från en annan klient

**Syfte:** Kontrollera att ett avbrott före kartändringen lämnar ett
väntande försök som slutförs med samma ID vid nästa besök, utan en ny
begäran om sparande.

**Användare:** Den konfigurerade administratören i båda profilerna.

**Förutsättningar:** Allmän förberedelse ovan. Använd Chromium eller
Chrome med utvecklarverktyg i första profilen.

**Integrationstest:**
[operations.spec.ts](../../tests/integration/operations.spec.ts),
testfallet “SPAR-02: automatically recover the same pending save on another
client after
interruption before commit”.

**Steg:**

1. Välj **Nytt objekt**, skriv **Väntande sparande** som namn och välj
   **Lägg i utkastet och stäng**. Öppna **Visa utkastet**.
2. Öppna utvecklarverktygen. Öppna kommandomenyn med `Ctrl+Shift+P`
   eller `Cmd+Shift+P`, sök efter **Show Network request blocking**
   och öppna panelen. Aktivera **Enable network request blocking**.
   Lägg till mönstret `*/map/save` och aktivera dess kryssruta.
3. Välj **Spara hela utkastet**. Kontrollera meddelandet och knapparna
   **Nytt objekt**, **Spara hela utkastet** och **Kasta hela utkastet**.
   Under **Network** ska `/map/save` vara blockerad medan
   registreringen till `/map/operations` lyckas.
4. Stäng stöddialogen med Escape. Öppna **Visa sparandet** för att läsa
   uppföljningen, och stäng igen. Anteckna den lyckade registreringens
   `operationId` i utvecklarverktygens nätverkssvar från `/map/operations`.
   Läs det privata förslaget i utkastet; ingen gemensam historikhändelse
   finns ännu.
5. Stäng den första profilen. Stoppa och starta applikationen igen med
   samma databas. Öppna appen i den andra profilen utan nätverksblockering
   och logga in som samma användare.
6. Vänta på den automatiska kontrollen. Välj inte ett nytt sparande.
   Granska **Visa sparandet** under kontrollen och därefter
   **Rapporter → Ändringshistorik**, utkastet och **Tabell**.
   Kontrollera att det ursprungliga försöks-ID:t används. Ladda om och
   kontrollera igen.
7. Skapa objektet **Nästa privata förslag** och lägg det i utkastet.
   Kontrollera att kvittot bara beskriver det tidigare sparandet.
8. Stäng av nätverksblockeringen i den första profilen före nästa fall.

**Förväntat resultat:**

- Avbrottet visar **Utfallet är okänt**. Ändringar och kastande blockeras.
- Före omstart visas okänt utfall, med förslaget kvar i det privata
  utkastet. Registreringen har inte ändrat den gemensamma kartan.
- Efter omstart kontrollerar Skyttel det registrerade försöket utan nytt
  medgivande. Ändringar blockeras under kontrollen. Resultatet blir
  **Utkastet är sparat** med samma ID i historiken och tomt utkast.
  Objektet och sparhändelsen finns en gång, även efter omladdning.
- **Nästa privata förslag** ligger kvar i utkastet och omfattas inte
  av det tidigare kvittot.

Det automatiserade testet upprepar dessutom den genomförda begäran
genom API:et medan nästa förslag ligger i utkastet. Samma kvitto ska
returneras, nästa förslag ska bevaras och historiken får ingen dubblett.
Den sista kontrollen utförs inte av de manuella stegen.

Automationen håller också den andra klientens kontrollbegäran medan den
granskar vänteläget. För ett separat manuellt kontrollfel kan du blockera
`*/text-assistant/recover` före det andra besöket: utkastet ska då förbli
privat och ändringar blockerade. Ta bort blockeringen och välj
**Visa sparandet → Kontrollera sparandet igen** när kontrollfelet visas.
Det återförsöket kontrollerar samma registrerade ID; det är ingen ny
begäran om sparande. Se även [SPARKONTROLL-02](save-check.md).

### SPAR-03: återfinna ett avvisat försök utan att förbruka nyare förslag

**Syfte:** Kontrollera att ett gammalt sparbesked avvisas beständigt och
att nyare förslag kan granskas och sparas med ett nytt försök.

**Användare:** Den konfigurerade administratören i båda profilerna.

**Förutsättningar:** Allmän förberedelse ovan. Nätverksblockering är av.

**Integrationstest:**
[operations.spec.ts](../../tests/integration/operations.spec.ts),
testfallet “SPAR-03: a rejected stale save survives restart without
consuming newer proposals”.

**Steg:**

1. Skapa **Lo Exempel** med **Nytt objekt** i första profilen och
   välj **Lägg i utkastet och stäng**. Öppna **Visa utkastet**.
2. Öppna appen i andra profilen som samma användare. Öppna **Lo Exempel**,
   välj **Tabell → Redigera Lo Exempel**, ändra namnet till **Lo Lind**
   och välj **Lägg i utkastet och stäng**.
3. Välj **Spara hela utkastet** i första profilen utan omladdning. Kontrollera
   avvisningen. Stäng sparandets dialog med Escape och läs kartans besked om
   avvisade sparande och kvarvarande legend. Stäng den första profilen.
4. Stoppa och starta appen med samma databas. Ladda om i andra profilen.
   Läs kartans sparstatus och öppna **Visa utkastet** för **Lo Lind**.
5. Granska det nyare förslaget och välj **Spara hela utkastet** i den
   andra profilen. Kontrollera **Utkastet är sparat** och läs det enda
   genomförda sparandet i **Rapporter → Ändringshistorik**.

**Förväntat resultat:**

- Det gamla försöket visar **Avvisat** och **Inget sparades**.
  Statuskortet visar avvisningen även med stängd stöddialog och legenden
  finns kvar för förslagen.
- Efter omstart visar kartans status **Utkastet kunde inte sparas.**
  **Visa sparandet** förklarar avvisningen. Inget kvitto
  bekräftar det försöket. Utkastet innehåller **Lo Lind**.
- Ett nytt sparande ger ett eget kvitto för **Lo Lind**. Historiken visar
  genomförda sparanden. Automationen kontrollerar separat att det gamla
  avvisade försöket finns kvar med samma identitet i det privata API:et.

Det automatiserade testet återförsöker dessutom den avvisade begäran
via API:et och kontrollerar samma fel, oförändrat utkast och tom historik
innan det nya sparandet. Den kontrollen utförs inte av de manuella stegen.

## Tillgång till sparförsök

### SPAR-04: privata försök och återkallad tillgång

**Syfte:** Kontrollera att administratören inte kan läsa en annan
användares privata sparförsök och att återkallad tillgång gäller även
väntande försök.

**Användare:** Administratören och den separata testidentiteten med
rollen medlem.

**Förutsättningar:** Allmän förberedelse och aktuell tillgång för
testidentiteten. Använd skilda profiler för de två användarna.

**Integrationstest:**
[operations.spec.ts](../../tests/integration/operations.spec.ts),
testfallet “SPAR-04: private pending saves stay hidden from
administrators and revoked members”.

**Steg:**

1. Logga in som medlemmen. Skapa **Privat förslag** och lägg det i
   utkastet. Aktivera nätverksblockering av `*/map/save` enligt SPAR-02.
2. Välj **Spara hela utkastet** och kontrollera **Utfallet är okänt**.
3. Öppna appen som administratören. Läs kartans sparstatus och ditt eget
   utkast. Medlemmens uppföljning och privata förslag ska inte visas.
4. Välj **Administrera tillgång** som administratören. Välj
   **Återkalla tillgång** för medlemmen och **Bekräfta återkallelse**.
5. Stäng av medlemmens nätverksblockering och ladda om medlemmens app.
   Kontrollera tillgångsbeskedet och att sparförsöket inte visas.

**Förväntat resultat:**

- Medlemmen har ett registrerat väntande försök. Administratören ser
  varken det försöket eller medlemmens privata förslag.
- Efter återkallelsen ser medlemmen **Du har inte tillgång till
  hushållet** och kan inte öppna sparförsöket.
- Det privata objektet ingår inte i den gemensamma kartan.

Det automatiserade testet kontrollerar dessutom direkta API-anrop:
administratören får inget resultat för medlemmens operations-ID.
Medlemmen nekas både listning, uppslagning och återförsök efter
återkallelsen. Dessa API-kontroller utförs inte av de manuella stegen.

# Manuella testfall för rymdkartan

Testfallen omfattar gemensam redigering, navigering och bevarad text i
tabell och rymdkarta. Anteckna commit, webbläsare, enhet, fysisk eller
emulerad inmatning samt godkänt eller underkänt resultat vid körning.
Fysiska enhetsprov och hjälpmedelsprov följs separat i
[uppföljningen för manuella prov](https://github.com/viscalyx/skyttel/issues/97).

## Konfigurerade användare

Alex Exempel är inloggad medlem i ett separat provhushåll. Använd bara
påhittade uppgifter. Administratörsrollen behövs inte för kartarbetet.

## Allmän förberedelse

Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor) när
fallen anger formulär, samtal, profil eller administration.

1. Starta en isolerad installation enligt
[provförberedelsen](../development/devcontainer.md#disposable-local-database).
   Använd ett nytt
   provhushåll mellan fallen så att inget tidigare utkast finns kvar.
2. Skapa förslag för personen Lo Exempel och tjänsten Molnmusik. Lägg vid
   behov till sambandet Lo Exempel → Använder → Molnmusik. Lämna förslagen
   osparade om fallet inte uttryckligen säger annat.

RYMD-10 använder i stället sin egen förberedelse med ett nytt provhushåll.

## Gemensam redigering

### RYMD-01: samma utkast och beständiga sparande i båda vyerna

**Syfte:** Prova att rymdkartan använder samma uppgifter som tabellen.

**Användare:** Alex Exempel.

**Förutsättningar:** De två objektförslagen finns i eget utkast.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-01: spatial and list editing share private proposals and one
durable save”.

**Steg:**

1. Öppna rymdkartan och välj Molnmusik. Kontrollera att kartan ligger
   kvar. Öppna **Tabell** och välj **Redigera Molnmusik**. Skriv
   **Molnmusik familj** som namn.
2. Välj Avbryt och Fortsätt redigera i förlustvarningen. Kontrollera
   namnet och lägg hela formuläret i utkastet med Lägg i utkastet och stäng.
3. Granska och spara hela utkastet. Starta om appen, öppna kartan och
   kontrollera sedan båda objekten i **Tabell**.

**Förväntat resultat:**

- Namntexten finns kvar vid avbruten förlust. Förslagen ändrar inte kartan.
- Ett samlat sparande ger kvitto. Båda objekten och det rättade namnet
  finns kvar efter omstart, i både lista och karta.

### RYMD-02: sökning och samband behåller markering och kamera

**Syfte:** Prova riktade samband, fokus och kamerans separata kontroller.

**Användare:** Alex Exempel.

**Förutsättningar:** De två objekten och användningssambandet finns.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-02: focus, filters and camera navigation preserve the shared
selection”.

**Steg:**

1. Öppna **Karta**. Kontrollera pilen från Lo Exempel till Molnmusik
   före och efter rotation och panorering under **Navigera**. Välj
   Lo Exempels runda symbol och kontrollera sambandets etikett.
2. Öppna **Filter** vid sökfältet och markera **Person**. Kontrollera Lo,
   Molnmusik som ett sammanhangsobjekt och den bevarade markeringen på Lo.
   Välj **Återställ filter** och stäng filterdialogen.
3. Högerklicka Lo Exempel och välj **Visa samband i kartan** i menyn.
   Kontrollera beskedet om direkta samband och att menyn stängs. Rulla
   lodrätt över tom rymd, objektsymbolen och namnet; alla tre ska panorera.
4. Panorera med knappen under **Navigera**. Öppna Filter och välj
   **Återställ filter**; kontrollera att kameran står kvar.
   Sök efter Lo och tryck Escape i sökfältet. Tryck Escape från en
   kameraknapp och kontrollera Lo i sökfältet. Tryck sedan Escape från
   kartbakgrunden och kontrollera tom söktext och återställda filter.
5. Visa Lo Exempels samband igen, sök efter Lo, öppna Filter och markera
   **Person**.
   Stäng filterdialogen och välj **Återställ vy**. Öppna Filter igen och
   kontrollera tom sökning, avmarkerad Person och ingen knapp för att
   återgå till sökträffarna. Stäng filterdialogen och välj **Alla etiketter**.
6. Dubbelklicka användningssambandets etikett och välj
   **Redigera valt samband**. Kontrollera Molnmusik som **Till objekt**.

**Förväntat resultat:**

- Pilspetsen syns utanför målets runda symbol, även efter kamerarörelse.
  Riktning och rätt ändobjekt syns. Sparade samband får etiketter när ett
  anslutet objekt väljs eller Alla etiketter är på. Förslagens etiketter
  visas direkt, med prioritet så långt de ryms utan krockar.
- Sökningen visar direkta samband som sammanhang och bevarar markeringen.
  Återställ filter behåller kameran. Escape från en kameraknapp behåller
  söktexten. Escape på kartbakgrunden rensar text och filter tillsammans.
- Återställ vy rensar sökning, typfilter och utforskade samband och ramar
  in hela kartan. Sambandets vanliga formulär har rätt mål.

### RYMD-03: menyer och symboler visar ändringar före sparande

**Syfte:** Skilja förslag från sparad karta och kasta vanlig borttagning.

**Användare:** Alex Exempel.

**Förutsättningar:** De två objekten och användningssambandet är förslag.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-03: context actions and draft symbols distinguish proposals
from saved content”.

**Steg:**

1. Öppna kartan och kontrollera plusmarkeringar och förslagens
   sambandsetiketter utan att välja Alla etiketter.
   Öppna **Skriv till Skyttel**, visa utkastet och spara med sparikonen.
   Stäng textvyn efter sparbekräftelsen.
2. Markera Molnmusik och läs legenden. Högerklicka Molnmusik. Kontrollera sju
   ikoner: penna, uppgifter, samband, karta, nätverk, fokusram
   och röd papperskorg.
   Läs deras tooltips. Kontrollera fokus på pennan och flytta med högerpil
   förbi uppgifter och samband till **Visa i kartan** och sedan
   **Visa samband i kartan** och **Fokusera markering**.
   Tryck Escape och kontrollera fokus tillbaka på objektet. Öppna med
   Shift+F10 och klicka sedan Lo Exempel; ikonerna ska stängas.
   Högerklicka Molnmusik igen och välj pennan, **Redigera objekt**.
   Lägg en ändrad beskrivning i utkastet. Gå tillbaka till kartan.
3. Kontrollera bärnstensfärgad penna och högerklicka objektets namnetikett.
   Kontrollera samma ikoner vid namnet. Läs papperskorgens tooltip och
   beskrivningen med hjälpmedel: objektet och ett samband läggs som
   borttagningar i utkastet. Välj **Ta bort objekt**.
4. Kontrollera objektet, sambandet och hela ändringslistan i **Utkastet**.
   Välj **Kasta hela utkastet**, läs **Ta bort hela utkastet?** och bekräfta
   **Ta bort hela utkastet**. Kontrollera åtgärdsbeskedet.

**Förväntat resultat:**

- Nytt innehåll har grönt plus, ändringar bärnstensfärgad penna och
  borttagningar rött kryss. Objektens namn visas bredvid de runda symbolerna.
- Åtgärderna visas som ikoner vid objektet eller namnet.
  Pennan öppnar redigering. Nätverksikonen visar direkta samband och behåller
  sökning och filter. Escape återför fokus, och klick utanför stänger raden.
  Kartikonen **Visa i kartan** rensar sökning och filter. Fokusramen
  **Fokusera markering** behåller urval, sökning och filter. Kart- och
  nätverksikonerna motsvarar samma åtgärder i hushållets lista.
- Samband som föreslås tas bort visas med en böjd, streckad linje.
- Borttagningen omfattar det anslutna sambandet direkt i utkastet.
  Sparad karta och det andra objektet ändras inte.
- Kasta hela utkastet återgår till sparad karta utan historisk ångring.

## Inmatning och återhämtning

### RYMD-04: pekmeny och grafikavbrott bevarar oskickad text

**Syfte:** Prova långtryck, orientering och fortsatt redigering vid avbrott.

**Användare:** Alex Exempel.

**Förutsättningar:** Telefon eller emulerad pekinmatning, minskad rörelse
påslagen och de två objektförslagen i eget utkast.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-04: touch menus, viewport changes and graphics recovery retain
unsent editing”.

**Steg:**

1. Kontrollera att rymdkartan är startläge. Håll
   på Molnmusik tills de sju ikonerna visas.
   Släpp och kontrollera att ikonerna finns kvar och inget formulär öppnas.
   Välj pennan, **Redigera objekt**.
2. Skriv Oskickad mobiltext i beskrivningen. Vänd enheten och kontrollera
   texten i det fortfarande öppna formuläret.
3. Behåll formuläret öppet. Använd webbläsarens verktyg för att simulera förlust
   och återställning av WebGL-kontext, eller kör det länkade automatiska
   provet för detta avbrott. Anteckna separat vad som faktiskt provas.
4. Kontrollera texten i formuläret, lägg hela formuläret i utkastet och
   öppna kartan. Kontrollera att kartan ryms i liggande vy. Spara utkastet.

För ett avbrott i Chromes utvecklarkonsol, med kartan öppen:

```javascript
const skyttelGraphics = document.querySelector('canvas')
  .getContext('webgl2').getExtension('WEBGL_lose_context');
skyttelGraphics.loseContext();
setTimeout(() => skyttelGraphics.restoreContext(), 4000);
```

**Förväntat resultat:**

- Fingersläppet väljer inte någon åtgärd; ikonerna finns kvar.
  Kartan ryms i tillgänglig
  webbyta i båda orienteringarna och tabellen kan nås.
- Avbrottsbeskedet förklarar att utkastet finns kvar. Detaljerna behåller
  oskickad text. Texten är inte sparad förrän utkastet sparas med kvitto.

### RYMD-05: etiketter och tangentbord behåller sambandets formulär

**Syfte:** Prova etikettläge och redigering utan rumsliga gester.

**Användare:** Alex Exempel.

**Förutsättningar:** De två objekten och användningssambandet finns.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-05: labels, keyboard editing and relationship text survive view
changes”.

**Steg:**

1. Öppna kartan och välj Lo Exempels runda symbol. Kontrollera namn,
   typikoner och sambandets etikett. Slå av och på **Alla etiketter** och
   kontrollera att kameran står kvar. Panorera och välj **Återställ vy**.
2. Öppna **Tabell**. Fokusera Lo Exempels namn och tryck Enter för att
   fälla ut raden. Prova tabbordningen namn, **Redigera Lo Exempel**,
   **Samband för Lo Exempel**, **Visa Lo Exempel i kartan**,
   **Visa samband för Lo Exempel i kartan** och **Ta bort Lo Exempel**,
   samt bakåt.
3. Öppna radens pennikon **Redigera Lo Exempel** med Enter och
   kontrollera namnfokus. Stäng formuläret med krysset utan ändring.
   Läs papperskorgens hjälptext: **Ta bort Lo Exempel** lägger objektet och
   ett samband som borttagningar i utkastet. Föreslå ingen borttagning.
4. Öppna **Redigera Lo Exempel** med Enter, kontrollera namnfokus och
   välj **Avbryt** utan ändring.
5. Öppna **Samband för Lo Exempel** med Enter och sedan **Redigera samband**.
   Kontrollera att redigeringsknappen behåller fokus. Använd Tab för att
   nå **Från objekt** i formuläret och ange känt slutdatum 2026-12-31.
   Välj **Molnmusik** i den läsbara vänsterspalten och ändra fönsterstorlek.
   Kontrollera rubrikfokus i **Uppgifter för Molnmusik**.
6. Välj **Tillbaka** och kontrollera det oskickade datumet. Lägg hela
   sambandsformuläret i utkastet och stäng sambandsdialogen. Granska och
   spara hela utkastet med sparikonen; stäng textvyn efter bekräftelsen.

**Förväntat resultat:**

- Alla etiketter ger ett närmare panorerbart utsnitt. Återställ vy ger
  överblick igen och behåller valet Alla etiketter. Objektnamn ligger nära
  sina runda symboler och stödlinjer visar anknytningen.
- Tangentbordsvägen öppnar rätt läsning och redigering. Oskickat slutdatum
  finns kvar efter läskedjan och storleksändringen, utan att ha lagts i
  utkastet. Datumet blir beständigt först vid det samlade sparandet.

### RYMD-06: förlorad tillgång stänger kartarbetet och visar inloggningsvägen

**Syfte:** Prova att en nekad ändring inte låser navigationen.

**Användare:** Alex Exempel som medlem; en annan administratör återkallar
tillgången från en separat inloggning.

**Förutsättningar:** Robin Exempel är hushållsadministratör i en separat
inloggning. Bjud vid behov in Robin, ge Robin administratörsrollen och
låt Robin ändra Alex till vanlig medlem. Alex har öppnat kartan som
arbetsyta, sedan **Tabell**, **Redigera Molnmusik** och skrivit oskickad
beskrivning. Administratören kan administrera hushållet.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-06: losing household access in fullscreen restores login
navigation”.

**Steg:**

1. Återkalla Alex tillgång från administratörens separata inloggning.
2. Försök lägga Alex oskickade text i utkastet innan nästa omladdning.
3. Läs **Du har inte tillgång till hushållet** och välj **Logga ut** i
   den vanliga sidans navigation.

**Förväntat resultat:**

- Ändringen nekas och kartans arbetsyta med privata uppgifter och formulär
  ersätts av sidan som förklarar den återkallade tillgången.
- Navigationen kan användas omedelbart. Utloggning visar inloggningssidan
  utan kvarvarande oskickad text.

## Uppgifter över tid

### RYMD-07: upphörda uppgifter behåller status bredvid ändringssymboler

**Syfte:** Skilja upphört från förslag i rymdkartans objekt och samband.

**Användare:** Alex Exempel.

**Förutsättningar:** De två objekten och användningssambandet är förslag.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-07: ended objects and relationships retain status beside
draft symbols”.

**Steg:**

1. Öppna **Tabell** och **Redigera Molnmusik**, välj status Upphört och lägg
   i utkastet.
2. Öppna **Redigera Lo Exempel**. Ange ett känt slutdatum i det förflutna under
   **Ekonomiska uppgifter**, välj Gäller fortfarande och
   lägg i utkastet.
3. Öppna **Samband för Lo Exempel** och **Redigera samband**. Ange ett
   känt slutdatum i det förflutna,
   behåll Följ slutdatum och lägg sambandet i utkastet.
4. Öppna rymdkartan och välj Alla etiketter. Klicka i kartans sökfält,
   öppna Filter, markera **Ta med upphörda** och stäng filterdialogen.
   Kontrollera sedan
   objektens och sambandets etiketter.
5. Öppna **Skriv till Skyttel**, visa utkastet och spara med sparikonen.
   Stäng textvyn, starta om appen och öppna kartan igen. Markera åter
   **Ta med upphörda** i kartans sökning.
6. Dubbelklicka sambandets etikett och välj **Redigera valt samband**.
   Välj Gäller fortfarande
   och lägg sambandet
   i utkastet. Gå tillbaka till kartan.

**Förväntat resultat:**

- Molnmusik visar Upphört vid namnet och grönt plus vid den runda symbolen.
  Sambandets etikett visar både Upphört och plus. Status och förslag har
  olika färger. Lo Exempel visar inget Upphört trots slutdatumet.
- Namn, typikon och riktning är fortfarande begripliga. Upphört finns
  kvar efter sparande och omstart; plusmarkeringarna försvinner.
- Sambandets rättelse visar amberfärgad penna och tar bort dess
  Upphört-markering.
  Molnmusiks status påverkas inte.

### RYMD-08: fokusera och granska tidigare och föreslagna samband

**Syfte:** Förstå en ändrad betalare utan att ändra det sparade sambandet.

**Användare:** Alex Exempel.

**Förutsättningar:** Lo Exempel, Kim Exempel och Molnmusik är sparade.
Lo Exempel → Betalar → Molnmusik är ett sparat samband. Ett förslag ändrar
betalaren till Kim Exempel.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-08: focus retains old and proposed relationship endpoints
and opens the saved route read-only”.

**Steg:**

1. Öppna kartan, högerklicka Molnmusik och välj Visa samband i kartan.
2. Kontrollera Lo Exempel och Kim Exempel med båda betalningssambanden.
3. Dubbelklicka den tidigare etiketten Lo Exempel → Betalar → Molnmusik med ×.
4. Läs **Valt samband**. Kontrollera att
   sparade tidigare värden går att läsa. Klicka i kartans sökfält,
   kontrollera att **Tillbaka till sökträffarna** fortfarande finns och
   tryck Escape i sökfältet. Stäng uppgifterna. Högerklicka Kim Exempel, välj
   **Visa samband i kartan** och dubbelklicka det föreslagna betalningssambandet.
   Välj **Redigera valt samband**.

**Förväntat resultat:**

- Molnmusiks fokus visar både sparad och föreslagen betalare.
- Den tidigare kopplingen har rött kryss och streckad linje; den nya har
  grönt plus och heldragen linje. Punktade etikettkopplingar
  går att skilja från riktade samband.
- Den böjda tidigare linjen och etiketten leder till läsbara tidigare
  värden. Utforskningen av Molnmusiks samband behålls vid
valet.
- Det föreslagna sambandet visar Kim som betalare. Redigera valt samband
  öppnar formuläret med Kim som Från objekt. Granskningen ändrar inga
  uppgifter i utkastet eller den sparade kartan.

### RYMD-09: täta mobilutsnitt och valbara etiketter

**Syfte:** Välja tätt placerade objekt utan att flytta dem eller kameran.

**Användare:** Alex Exempel.

**Förutsättningar:** Skapa och spara åtta objekt med namnen Nära objekt 1
till Nära objekt 8 utöver Lo Exempel och Molnmusik. Lägg till sambandet
Nära objekt 7 → Använder → Nära objekt 8. Använd personlig flyttning så att
de ligger nära varandra i ett utsnitt. Använd 390 och
320 pixlars bredd. Upprepa med webbläsarens zoom på 200 och 400 procent.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts), testfallet
“RYMD-09: dense mobile maps offer separate pointer and keyboard targets with
selected label priority and text alternatives”.

**Steg:**

1. Öppna rymdkartan. Välj ett tätt placerat objekt med dess namnetikett.
   Kontrollera att samma objekt markeras utan att kartans utsnitt flyttas.
2. Använd Tab och Enter för att markera ett annat kartobjekt. Kontrollera
   att dess etikett prioriteras och kan läsas. Välj Nära objekt 8 och
   därefter dess samband från Nära objekt 7. Sambandets etikett ska vara
   synlig och valbar utan att täckas av objektnamn eller flytta kartan.
3. Öppna **Tabell** och fäll ut Nära objekt 1 med Enter. Läs och arbeta vidare
   utan att använda kartgrafik, tal eller ljud. Vid ett grafikavbrott ska
   samma tabellarbete fortfarande fungera.
4. Återgå till kartan och kontrollera att alla objekt finns kvar och att
   deras placeringar består. Upprepa vid den andra bredden och med zoom.

**Förväntat resultat:**

- Etiketter ger separata träffytor med linjer till objektens riktiga lägen.
- Urval prioriteras när alla namn inte ryms. Tabellen ger tillgång till alla
  objekt och urval även utan grafik.
- Varken valet eller de nya etikettlägena ändrar objektens personliga
  placeringar, hushållets information eller kamerans utsnitt.

### RYMD-10: etikettinformation bevarar karta och lista vid vybyte

**Syfte:** Prova att information om dolda etiketter förblir läsbar utan
att hindra fortsatt arbete i en kompakt karta.

**Användare:** Alex Exempel.

**Förutsättningar:** Använd ett nytt provhushåll. Skapa och spara personen
Kim Exempel, abonnemanget Familjens Molnmusik med beskrivningen Rättad för
hand och sambandet Kim Exempel → Betalar → Familjens Molnmusik. Skapa sedan
personen Robins notering i ditt privata utkast utan att spara. Använd en
kompakt vy, exempelvis 640 × 500 CSS-pixlar eller motsvarande verklig
webbläsarzoom. Olika automatiska placeringar kan ge olika antal dolda namn.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-10: label notices remain stable while a compact map opens
its saved and private list”.

**Steg:**

1. Öppna kartan och ladda om sidan. Öppna
   **Tabell** och fäll ut Familjens Molnmusik. Läs beskrivningen direkt i raden.
2. Fäll ihop raden med namnet igen. Kontrollera Robins notering i tabellen.
3. Öppna **Karta** och välj Kim Exempel med tangentbord. Kontrollera att
   namnet går att läsa och välja. Om information om dolda etiketter visas får
   den inte täcka namnens träffytor.
4. Minska vyn till ungefär 320 × 250 CSS-pixlar. Slå på
   **Alla etiketter** med etikettikonen i verktygsfältet och kontrollera att
   samtliga tre namn finns. Slå av valet. Återställ den större vyn och öppna
   **Tabell** igen.

**Förväntat resultat:**

- Karta, detaljer och lista fortsätter att fungera utan en tom sida eller
  växlande etikettinformation som hindrar arbetet.
- Den synliga informationen anger antalet dolda etiketter. När ingen
  information behövs visas ingen tom informationsruta.
- Etikettikonen går att slå på och av i den korta vyn och är åtkomlig
  även efter återgång till den större vyn.
- De två sparade objekten och sambandet består. Robins notering förblir
  ett privat förslag och den sparade beskrivningen ändras inte.

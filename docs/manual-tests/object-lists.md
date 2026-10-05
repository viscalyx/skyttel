# Manuella testfall för objektlistor

Testfallen gäller att hitta och återfinna objekt genom listor och tabell,
filtrering, sortering och sidval samt att läsa fullständiga uppgifter och
visa en vald träff i kartan.
Läsdialogerna låter användaren följa samband och gå tillbaka utan kartgrafik.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

Använd **Alex Exempel** med tillgång till testhushållet. Provkartan och
inloggningen innehåller enbart påhittade uppgifter.

## Allmän förberedelse

1. Starta provkartan enligt [stora kartor](large-map.md#allmän-förberedelse).
   Den innehåller 500 objekt fördelade på fem typer och 1 500 samband.
2. Öppna **Sök i kartan**, välj **Ta med upphörda**, stäng sökytan och
   öppna **Lista**. Prova både dator och telefon. Använd tangentbord och
   pekning, ljust och mörkt tema samt webbläsarens förstoring.
3. Starta om provkartan mellan fallen. För kartfokus använder du ett litet
   testhushåll enligt förutsättningarna i LISTA-03.

### Förbered hushållets tabell

1. Bygg applikationen med `npm run build`. Starta sedan
   `node --import tsx scripts/manual-household-table.ts` från projektroten.
2. Öppna den utskrivna adressen och logga in med Google. Välj **Tabell**.
   Installationen har fler än 50 objekt, svenska namn med siffror,
   långa värden, dolda egna fält, ekonomiska uppgifter och alla statusar.
3. Prova dator och mobil, tangentbord, pekning och förstoring.
   Skriv `quit` i terminalen och starta om kommandot mellan fallen.
   Provdatabasen raderas när processen avslutas.

### Förbered läskedjan

1. Bygg med `npm run build` och starta
   `node --import tsx scripts/manual-household-reading.ts` från projektroten.
2. Öppna den utskrivna adressen och logga in med Google som Alex Exempel.
   Provhushållet har över 50 objekt, Alex, Cykel och Garage, fullständiga
   uppgifter samt sparade och föreslagna samband.
3. Skriv `quit` i terminalen och starta om kommandot mellan fallen.
   Provdatabasen raderas när processen avslutas. Vanliga gemensamma
   demodata innehåller även Alex Exempel → Alex blå cykel → Familjens garage.

## Läs objekt och följ samband

### LÄS-01: följ Alex till cykel och garage med tabelläget kvar

**Syfte:** Läsa hela sambandskedjan utan kartgrafik och bevara tabelläget.

**Användare:** Alex Exempel.

**Förutsättningar:** Hushållet från Förbered läskedjan. Prova med
tangentbord och utan kartgrafik. Anteckna miljö, förstoring och hjälpmedel.

**Integrationstest:**
[household-reading.spec.ts](../../tests/integration/household-reading.spec.ts),
testfallet “LÄS-01: keyboard follows Alex to bicycle to garage and back
without graphics or lost table state”.

**Steg:**

1. Välj Tabell, expandera A 1 och A 2, välj Nästa och expandera Alex och
   Cykel. Rulla tabellen och öppna Samband för Alex med tangentbord.
2. Kontrollera dialogens rubrik och antal samband. Välj Cykel, läs hela
   beskrivningen, egna fält, ekonomi samt Sparat och Ditt förslag.
3. Öppna Samband för Cykel och välj Garage. Läs Ospecificerat objekt.
4. Använd Tab och Skift+Tab vid dialogens första och sista kontroller.
   Välj Tillbaka tre gånger och stäng med Escape.
5. Kontrollera sida, rullning och öppna rader. Gå till föregående sida och
   kontrollera att A 1 och A 2 fortfarande är expanderade.

**Förväntat resultat:**

- Fokus börjar på varje dialogs rubrik. Bakgrunden är inaktiv och
  tangentbordsfokus stannar i den aktiva dialogen.
- Fullständiga uppgifter och sparade/föreslagna värden kan läsas utan
  kartnavigering. Tillbaka går ett steg utan att ändra hushållets data.
- Stängning återför fokus till Samband för Alex. Sida, flera öppna rader
  och rullningsläge bevaras.

### LÄS-02: läs samband och olika betydelser på smal skärm

**Syfte:** Skilja okända mål, uttryckligen inga mål, osäkerhet och status.

**Användare:** Alex Exempel.

**Förutsättningar:** Hushållet från Förbered läskedjan. Prova på telefon
och vid 200/400 procent förstoring. Föreslå borttagning av Alex samband
till Cykel genom sambandsredigeringen, utan att spara det gemensamt.

**Integrationstest:**
[household-reading.spec.ts](../../tests/integration/household-reading.spec.ts),
testfallet “LÄS-02: mobile full relationship reading separates absent
targets, uncertainty and proposed removal”.

**Steg:**

1. Öppna Tabell och Samband för Cykel.
2. Läs samtliga fyra samband, inklusive föreslagen borttagning.
3. Kontrollera Okänd koppling och Har ingen samt sambandet till Garage.
   Läs säkerhet, riktning, egna fält, livscykel och slutdatum.
4. Stäng med Stäng samband och kontrollera fokus.

**Förväntat resultat:**

- Okänt och Uttryckligen inget har inga falska objektlänkar. Osäkert
  uppgivet är skilt från dessa betydelser.
- Upphört, Föreslagen borttagning och sparat/föreslaget värde är läsbara
  även utan färg. Dolda egna fält finns med.
- Text bryts inom skärmbredden och innehållet rullar i dialogen.
  Fokus återgår till Samband för Cykel.

### LÄS-03: stäng läsning när öppningsraden försvinner

**Syfte:** Återgå till en användbar radkontroll efter ett bakgrundsbesked.

**Användare:** Alex Exempel.

**Förutsättningar:** Hushållet från Förbered läskedjan, ett aktivt
textsamtal och en andra inloggad flik i samma hushåll.

**Integrationstest:**
[household-reading.spec.ts](../../tests/integration/household-reading.spec.ts),
testfallet “LÄS-03: a vanished table opener returns to the next equivalent
control after a real background update”.

**Steg:**

1. Lägg B Tillfälligt objekt i utkastet utan samband. Öppna dess
   sambandsdialog från tabellen i första fliken.
2. Ta bort bara detta nya förslag i andra fliken. Vänta tills den första
   fliken visar att objektet inte längre finns.
3. Stäng med Escape och kontrollera fokus.

**Förväntat resultat:**

- Bakgrundsuppdateringen skapar ingen falsk läskedja och ändrar inga
  andra förslag. Dialogen kan stängas.
- Fokus återgår till Samband för Cykel som nästa motsvarande kontroll.
  Tabellens sida och filter ändras inte för att återställa raden.

### LÄS-04: återgå till föregående rad eller rubriken

**Syfte:** Behålla användbart fokus när det saknas en följande rad.

**Användare:** Alex Exempel.

**Förutsättningar:** Ett tomt provhushåll med två nya objekt A och B i
utkastet, ett aktivt textsamtal och en andra inloggad flik.

**Integrationstest:**
[household-reading.spec.ts](../../tests/integration/household-reading.spec.ts),
testfallen “LÄS-04: vanished read openers return to previous when no next
row remains” och “LÄS-04: vanished read openers return to heading when no
next row remains”.

**Steg:**

1. Öppna Samband för B från tabellen. Ta bort bara förslaget B i andra
   fliken. Vänta på uppdateringen och stäng med Escape.
2. Kontrollera fokus på Samband för A. Lägg B i utkastet igen och öppna
   dess sambandsdialog.
3. Ta bort båda förslagen i andra fliken. Vänta på uppdateringen och stäng.

**Förväntat resultat:**

- Utan nästa rad går fokus till samma kontroll på föregående rad.
- Utan kvarvarande rader går fokus till Hushållets tabell. Filtren ändras
  inte och inga extra ändringar läggs i utkastet.

## Sökning och filtrering

### LISTA-01: flera typval kombineras med sökning och markeringar

**Syfte:** Begränsa en stor lista utan att ändra objektmarkeringarna eller
hushållets uppgifter.

**Användare:** Alex Exempel.

**Förutsättningar:** Provkartan med 500 objekt är öppen i Lista.

**Integrationstest:**
[object-list.spec.ts](../../tests/integration/object-list.spec.ts), testfallet
“LISTA-01: multiple type filters combine with search and marks across 500 objects”.

**Steg:**

1. Markera Provobjekt 000 och Provobjekt 001. Öppna **Filter** och kryssa
   i **Person** och **Tjänst**. Kontrollera 200 träffar.
2. Sök efter **sammanhang 0.**. Kontrollera tjugo träffar och tio vid vardera
   av provkartans typer. Välj **Bara markerade** och kontrollera två träffar.
3. Välj **Alla typer**. Kontrollera att typkryssen försvinner, men de två
   markeringarna och träffarna består. Stäng av **Bara markerade**.
4. Välj **Person** och **Visa 10 objekt**. Kontrollera stängt filter,
   synligt typval i filterraden och fokus i **Sökträffar**.
5. Sök efter **finns inte**. Läs det tomma resultatet och välj
   **Rensa sökning och filter**.

**Förväntat resultat:**

- Typval kombineras med eller; sökning och markeringsfilter begränsar vidare.
- Filter förblir öppet under val. Typgrupperna visar sina träffantal.
- Återställda filter ger 500 träffar och behåller båda markeringarna.
- Inga hushållsuppgifter eller personliga placeringar ändras.

## Återfinna en lista

### LISTA-02: sortering, sida och rulläge består vid tillfälliga besök

**Syfte:** Behålla orienteringen och oskickad redigering när listan lämnas.

**Användare:** Alex Exempel.

**Förutsättningar:** Provkartan med 500 objekt är öppen i Lista.

**Integrationstest:**
[object-list.spec.ts](../../tests/integration/object-list.spec.ts), testfallet
“LISTA-02: sorting, pages and scroll survive details, settings and
map-result navigation”.

**Steg:**

1. Sök efter **Provobjekt**, välj typerna Person och Tjänst och stäng
   filtret med **Visa 200 objekt**.
2. Bläddra genom de fyra sidorna med båda sorteringarna. Kontrollera samma
   200 objekt. Lämna **Typ, sedan namn** och sida fyra valda.
3. Rulla till Provobjekt 496 och välj **Uppgifter**. Välj **Redigera valt
   objekt** och skriv **Oskickat under listbesöket** i Beskrivning.
4. Öppna **Lista** från verktygen. Kontrollera rulläget. Stäng listpanelen,
   öppna Lista igen och kontrollera samma sida och rulläge.
5. Besök Inställningar och välj **Tillbaka till kartan**. Kontrollera
   sökning, typval, sortering, sida och rulläge.
6. Välj Provobjekt 496:s namn för att visa det i kartan. Kontrollera att
   redigeringspanelen finns kvar med sin text. Öppna Lista igen.
7. Sök efter **Provobjekt 496**. Kontrollera en träff utan kvarvarande
   ogiltigt sidval.

**Förväntat resultat:**

- Sortering ändrar ordningen och sidornas fördelning, inte resultatmängden.
- Tillfälliga besök behåller listans val och rulläge samt oskickad text.
- Kartträffen stänger bara listan. Befintligt redigeringsarbete består.
- Sökning med färre träffar visar en giltig sida.

## Visa en träff i kartan

### LISTA-03: kartträffen fokuserar direkta grannar och behåller samtalet

**Syfte:** Skilja listans markering, kartvisning och uppgifter åt.

**Användare:** Alex Exempel.

**Förutsättningar:** Ett testhushåll har Lo Exempel, Kim Exempel och
Långt borta. Lo har ett samband till Kim och Kim har ett till Långt borta.
Placera det sista objektet tydligt längre bort i den personliga vyn.
Samtal med Skyttel är tillgängligt med testmiljöns ersättare för modelltjänsten.

**Integrationstest:**
[object-list.spec.ts](../../tests/integration/object-list.spec.ts), testfallet
“LISTA-03: a map result focuses only its direct neighbors and closes only the list”.

**Steg:**

1. Välj **Skriv till Skyttel** och **Godkänn och starta** i medgivanderutan.
   Skriv **Oskickat medan jag söker** utan att skicka.
2. Öppna Lista och markera både Lo och Kim. Sök efter **Lo Exempel**.
   Kontrollera att kameran behåller sitt läge medan du skriver.
3. Välj träffens namn för att visa Lo i kartan. Kontrollera att Lo och
   Kim ryms och att Långt borta inte utökar utsnittet.
4. Öppna Lista igen och kontrollera samma sökning med en träff.

**Förväntat resultat:**

- Lo blir ensam markerad, Kim avmarkeras och ingen detaljpanel öppnas.
- Endast listan stängs; samtalet och dess oskickade text finns kvar.
- Sökningen bevaras och hushållets data och personliga placeringar är orörda.

### LISTA-04: smal lista och uppgifter fungerar när grafiken avbryts

**Syfte:** Behålla ett tillgängligt listalternativ vid förlorad kartgrafik.

**Användare:** Alex Exempel.

**Förutsättningar:** Hushållet från LISTA-03. Prova vid 390 och 320 pixlars
bredd. Automatprovet använder webbläsarens riktiga WebGL-förlust; vid manuell
körning behövs en testmiljö där grafikavbrott kan framkallas.

**Integrationstest:**
[object-list.spec.ts](../../tests/integration/object-list.spec.ts), testfallen
“LISTA-04: narrow lists retain search and accessible details after graphics
loss at 390px” och “LISTA-04: narrow lists retain search and accessible details
after graphics loss at 320px”.

**Steg:**

1. Öppna Lista, sök efter Lo Exempel och välj Person i Filter. Kontrollera
   tangentbordsfokus och att typvalet går att peka på.
2. Välj **Visa 1 objekt** och kontrollera resultatfokus. Välj Lo:s namn
   för att visa objektet i kartan. Kontrollera markering utan detaljpanel.
3. Öppna Lista igen och framkalla grafikavbrottet. Kontrollera att listan
   och sökningen består och att knappen för kartvisning blir inaktiv.
   Läs beskedet om att fortsätta genom **Uppgifter**.
4. Välj **Uppgifter**, kontrollera rubrikfokus och redigera Beskrivning till
   **Utan grafik**. Öppna **Lista** från verktygen.

**Förväntat resultat:**

- Namn, typval, resultat och uppgifter kan nås utan vågrät sidrullning.
- Grafikavbrottet stänger inte listan eller raderar markering och sökning.
- Uppgifter och oskickad redigering fungerar utan grafik. Hushållets data
  och personliga placeringar ändras inte genom listvalen.

### LISTA-05: återgång på kort skärm bevarar synlig träff och fokus

**Syfte:** Återgå till samma listarbete när hela arbetsytan behöver rullas.

**Användare:** Alex Exempel.

**Förutsättningar:** Testhushållet med 500 objekt. Prova en kort skärm
med 320 × 250 CSS-pixlar och verklig webbläsarzoom på 400 procent.

**Integrationstest:**
[object-list-flow.spec.ts](../../tests/integration/object-list-flow.spec.ts),
“LISTA-05: short-screen list returns preserve the visible result and keyboard focus”.

**Steg:**

1. Öppna Lista och rulla till **Provobjekt 045**. Fokusera **Uppgifter**
   och anteckna rulläget.
2. Öppna uppgifterna. Öppna **Lista** från verktygen.
3. Kontrollera samma rulläge och synligt fokus på träffens **Uppgifter**.
4. Besök Inställningar och välj **Tillbaka till kartan**. Kontrollera
   samma rulläge och att den fokuserade kontrollen är synlig och går att peka på.
5. Fokusera träffens namn och anteckna dess rulläge. Välj namnet för att
   visa objektet i kartan. Öppna Lista igen.
6. Öppna verktygen och välj **Sök i kartan**. Kontrollera fokus i sökfältet.

**Förväntat resultat:**

- Listan återgår till samma rulläge efter varje besök.
- Fokus återgår till den använda träffkontrollen, synligt och åtkomligt
  utan att verktygen täcker den. Ett uttryckligt sök- eller detaljval
  behåller sitt eget fokusmål.
- Vanliga paneler och kartans särskilda visning behåller sina fokusregler.
  Inga fördröjda fokusbyten får flytta ett senare valt fält.

### LISTA-06: en synlig inaktiv lista öppnar uppgifter vid första klicket

**Syfte:** Kunna använda en listträff direkt när ett annat fönster är aktivt.

**Användare:** Alex Exempel.

**Förutsättningar:** Testhushållet med 500 objekt på en datorskärm där
Lista och en objektpanel kan visas samtidigt.

**Integrationstest:**
[object-list-flow.spec.ts](../../tests/integration/object-list-flow.spec.ts),
“LISTA-06: an inactive visible list opens details on the first pointer click
without moving the result”.

**Steg:**

1. Öppna Lista och välj **Uppgifter** vid **Provobjekt 000**. Låt
   objektpanelen vara aktiv medan listan syns bredvid.
2. Rulla listan till **Provobjekt 045** utan att först klicka i listan.
3. Tryck ned musknappen på träffens **Uppgifter**. Kontrollera att träffen
   stannar under pekaren när listan blir aktiv. Släpp musknappen.
4. Kontrollera rätt objektpanel och rubrikfokus utan ett extra klick.
5. Öppna **Lista** från verktygen och kontrollera samma rulläge.

**Förväntat resultat:**

- Det första klicket öppnar rätt uppgifter. Listans rulläge och träffens
  position ändras inte medan musknappen hålls nere. En uttrycklig återgång
  till listan behåller rulläget.
- Hushållets objekt, samband och utkast ändras inte av att uppgifterna öppnas.

## Läsa och återfinna objekt

### TABELL-01: svensk sortering och återbesök med tabelläget kvar

**Syfte:** Läsa fler än 50 objekt och fortsätta i samma tabell efter kartbesök.

**Användare:** Alex Exempel.

**Förutsättningar:** Provinstallationen är öppen på dator.

**Integrationstest:**
[household-table.spec.ts](../../tests/integration/household-table.spec.ts),
testfallet “TABELL-01: Swedish natural sorting, pagination and expanded rows
survive map visits”.

**Steg:**

1. Välj **Tabell** med tangentbord. Kontrollera fokus på tabellrubriken
   och 50 grundrader på första sidan. Öppna både **A 2** och **A 10**.
2. Välj **Namn Ö–A**. Kontrollera ordningen Örn, Älg och Åke.
   Välj **Typ A–Ö** och **Typ Ö–A**. Kontrollera Typ 2 före Typ 10
   respektive Typ 10 före Typ 2 utan separata typgrupper.
3. Välj **Namn A–Ö** och **Nästa**. Expandera en rad och rulla tabellen.
   Fokusera radens öppningsknapp. Välj **Karta**, sedan **Tabell**.
4. Kontrollera samma sida, rulläge, öppna rad och återfokus.
   Välj **Föregående** och kontrollera att A 2 och A 10 fortfarande är öppna.

**Förväntat resultat:**

- Första besöket börjar på rubriken. Återbesök återger möjligt tidigare fokus.
- Svensk bokstavsordning och naturlig sifferordning gäller i båda riktningarna.
- Flera detaljer, sortering, sida och rullning består under vybytet.
- Träffantal, aktuell sida och 50 objekt per sida går att läsa utan kartgrafik.
  Sidbyte fokuserar resultatets början och meddelar den nya sidan.
- Läsning och vybyte ändrar inga hushållsuppgifter eller utkastförslag.

### TABELL-02: sparade och föreslagna värden har tydliga skilda statusar

**Syfte:** Läsa fullständiga uppgifter och skilja förslag från sparade värden.

**Användare:** Alex Exempel.

**Förutsättningar:** En ny provinstallation är öppen.

**Integrationstest:**
[household-table.spec.ts](../../tests/integration/household-table.spec.ts),
testfallet “TABELL-02: full saved and proposed details distinguish every
lifecycle and proposal status”.

**Steg:**

1. Expandera A 2. Läs hela beskrivningen och den långa egna anteckningen.
   Kontrollera sparat pris 299 SEK och föreslaget pris 399 SEK intill varandra.
   Kontrollera också sparad ikon Cykel, föreslagen ikon Bil och två
   skilda profilbilder märkta sparat och föreslaget.
2. Läs **Okänt**, **Uttryckligen inget**, **Osäkert uppgivet** och
   datumet för kredituppgiften. Ett obesvarat fält visar **Ej uppgivet**.
3. Öppna **Filter** och ta med upphörda och borttagna objekt.
   Stäng med Escape och kontrollera återfokus på Filter.
4. Läs **Borttaget prov**, **Upphört prov**, **Nytt prov** och **Tas bort
prov**.
   Använd nästa sida vid behov. Expandera också Borttaget prov.

**Förväntat resultat:**

- Nytt, Ändrat, Föreslagen borttagning, Upphört och Borttaget skiljs åt
  med text. Förslag har dessutom symbolen ◇.
- Föreslagen borttagning ersätter inte Upphört. Det sparade objektet
  finns kvar att läsa tills borttagningsförslaget sparas.
- Fullständiga detaljer omfattar även dolda egna fält och ekonomi.
- Ett saknat värde blir inte Okänt eller Uttryckligen inget.
- Ett redan borttaget objekt går att läsa och saknar redigeringsknapp.

### TABELL-03: mobil läsning bevarar markering, utkast och oskickat meddelande

**Syfte:** Använda samma hushållsarbete på en smal skärm.

**Användare:** Alex Exempel.

**Förutsättningar:** En ny provinstallation är öppen på mobil.
Provleverantören ger kontrollerade svar utan externa modellkostnader.

**Integrationstest:**
[household-table.spec.ts](../../tests/integration/household-table.spec.ts),
testfallet “TABELL-03: mobile horizontal reading preserves shared selection,
draft and unsent conversation”.

**Steg:**

1. Öppna **Skriv till Skyttel**, ge medgivande och skriv ett meddelande
   utan att skicka det. Stäng textvyn.
2. Välj **Tabell**, expandera A 2 och läs dess fullständiga uppgifter.
   Rulla tabellen i sidled, även med piltangenter från den rullbara ytan.
3. Välj **Karta** och kontrollera att A 2 är markerat. Återvänd till
   Tabell och kontrollera öppna detaljer och sidledsrullning.
4. Öppna textvyn igen och kontrollera det oskickade meddelandet.

**Förväntat resultat:**

- Tabellen behåller sina kolumner och kan rullas i sidled.
- Detaljtexter bryts inom skärmbredden och kräver inte sidledsrullning
  för att läsa varje textstycke.
- Markering visas med ✓ Markerad och delas mellan karta och tabell.
  Utkastet, pågående samtal
  och oskickat meddelande består under vanliga vybyten.
- Kvarstående mänskliga prov omfattar NVDA, VoiceOver, touch,
  skärmtangentbord, 200/400 procents förstoring och kontrastbedömning.

## Separat sökning i karta och tabell

För dessa fall startar du provinstallationen med
`node --import tsx scripts/manual-household-table.ts --search` efter
`npm run build`. Den använder samma offentliga förberedelse som
integrationstesterna och innehåller också **Övrigt Élan** med beskrivningen
**Åker äpple** och det egna fältet **Hemlig anteckning**. A 2 har ett
samband till objektet med typen **Endast i sambandet**.

### SÖK-01: alla ord, egna detaljfält och svensk teckensammansättning

**Syfte:** Hitta objekt genom deras fullständiga egna uppgifter.

**Användare:** Alex Exempel.

**Förutsättningar:** En ny provinstallation för sökning är öppen i Tabell.

**Integrationstest:**
[object-search.spec.ts](../../tests/integration/object-search.spec.ts),
“SÖK-01: own detail fields, every word and Swedish normalization find objects”.

**Steg:**

1. Sök efter **399 EGEN**. Kontrollera en träff på A 2 och besked om
   Egen anteckning och Pris. Sök efter **299 egen** och kontrollera samma
   träff genom priset som visas som tidigare sparat värde.
   <!-- cSpell:disable-next-line -->
2. Sök efter **anteck elan öv**. Kontrollera noll träffar. Sök i stället
   <!-- cSpell:disable-next-line -->
   efter **anteck élan öv**, även med sammansatta accenttecken.
3. Sök efter **Endast i sambandet** och kontrollera noll träffar.
   Sök efter **Övrigt Élan** och kontrollera en träff, utan A 2.
   Sök efter **ake**. Kontrollera noll träffar och att fokus stannar i
   sökfältet. Välj **Återställ sökning och filter**.
4. Sök efter **åke beskrivning**. Kontrollera en träff på Åke.

**Förväntat resultat:**

- Alla delord måste finnas; ordning och skiftläge spelar ingen roll.
- Orden kan finnas i olika egna fält, även dolda fält och ekonomi.
  Både visade sparade värden och förslag kan ge träff.
- Sammansatta tecken matchar sina färdiga motsvarigheter. Å, ä och ö
  behåller sina betydelser. Träffens detaljfält anges med namn.
- Sökning ändrar inte hushållets uppgifter eller utkastet.

### SÖK-02: flerval skiljer utkastförslag från upphörda och borttagna

**Syfte:** Kombinera filter utan att blanda samman olika statusar.

**Användare:** Alex Exempel.

**Förutsättningar:** En ny provinstallation för sökning är öppen i Tabell.

**Integrationstest:**
[object-search.spec.ts](../../tests/integration/object-search.spec.ts),
“SÖK-02: multiple filters combine independently and keep proposals distinct
from lifecycle”.

**Steg:**

1. Öppna Filter och välj Typ 2, Typ 10, Nytt och Ändrat. Stäng med Escape.
   Kontrollera A 2, Nytt prov och Övrigt Élan.
2. Expandera A 2 och välj Bara markerade i Filter. Kontrollera en träff.
3. Återställ sökning och filter i dialogen. Välj Föreslagen borttagning.
   Kontrollera noll träffar; utkastfiltret finns kvar.
4. Välj Ta med upphörda. Stäng dialogen och kontrollera Tas bort prov.
5. Avmarkera Föreslagen borttagning och välj Ta med borttagna.
   Stäng och sök efter borttaget. Läs Borttaget prov.

**Förväntat resultat:**

- Val inom samma filter förenas, olika filter begränsar varandra.
- Escape stänger dialogen med valen kvar och återfokus på Filter.
- Upphört, borttaget och föreslagen borttagning är olika uppgifter.
- Aktuella objekt är startläget. Markeringen finns kvar vid återställning.

### SÖK-03: kartans eget fokus startar sökning med färdigt tecken

**Syfte:** Söka från kartan utan att fånga annan inmatning.

**Användare:** Alex Exempel.

**Förutsättningar:** En ny provinstallation för sökning är öppen i Karta.

**Integrationstest:**
[object-search.spec.ts](../../tests/integration/object-search.spec.ts),
“SÖK-03: map-only character and composition entry preserve separate searches
and Escape restrictions”.

**Steg:**

1. Öppna Sök i kartan. Sök efter 299 EGEN och läs träffens detaljfält.
2. Välj Typ 10 och sök efter A 10. Tryck Escape. Kontrollera kvarvarande
   sökning och typ i kartans resultatbesked. Öppna sökningen igen.
3. Besök Tabell och skriv åke följt av x i dess sökfält. Återgå till Karta.
4. Fokusera själva kartbakgrunden med Tab. Skriv ö. Kontrollera att
   tidigare söktext ersätts, filtret behålls och sökfältet får fokus.
5. Stäng med Escape. Fokusera kartan och bygg ett sammansatt å.
   Kontrollera att bara det färdiga tecknet öppnar sökningen.
6. Prova ett kortkommando, skriv i samtalsfältet och i ett formulär.
   <!-- cSpell:disable-next-line -->
   Återvänd till Tabell och kontrollera dess separata text **åkex**.

**Förväntat resultat:**

- Sökknappen öppnar sökning och filter, tangentbordsstart bara sökning.
- Escape och Stäng bevarar text, filter och markering. Rensa sökning
  ändrar bara texten. Aktiva begränsningar syns med stängd sökyta.
- Bara kartytans eget fokus ger bokstavs- eller sifferstart.
  Kortkommandon, formulär och samtal påverkas inte.
- Träffbesked flyttar inte fokus och snabb inmatning köar inte gamla antal.
  Kontrollera uppläsningen med NVDA och VoiceOver; automatprovet ersätter
  inte hjälpmedelsprovet.

### SÖK-04: sista förslaget återställer bara båda vyernas utkastfilter

**Syfte:** Behålla sökning när det villkorliga filtret inte längre behövs.

**Användare:** Alex Exempel.

**Förutsättningar:** En ny provinstallation för sökning har sitt förberedda utkast.

**Integrationstest:**
[object-search.spec.ts](../../tests/integration/object-search.spec.ts),
“SÖK-04: the last proposal resets only draft filters in both views and
type-only proposals expose them”.

**Steg:**

1. Sök efter A 2 i kartan och välj Typ 2 och Ändrat. Stäng sökytan.
2. Sök efter prov i Tabell och välj Typ 2 och Nytt. Stäng filterdialogen.
3. Öppna Ditt utkast och kasta hela utkastet. Kontrollera att det är tomt.
4. Återvänd till Tabell och sedan kartans sökyta. Kontrollera bevarad
   söktext och Typ 2, återställt utkastfilter och besked om återställningen.
5. Skapa enbart ett typförslag under Inställningar. Återgå till kartan
   och sök efter finns inte. Kontrollera att utkastfiltret visas ändå.

**Förväntat resultat:**

- Bara utkastvalen rensas när det sista förslaget försvinner.
- Utkastfiltret döljs och återställningen meddelas när det har ett aktivt val.
- Typförslag och bortfiltrerade förslag räcker för att visa filtret.

### SÖK-05: mobil sökingång och filterdialog bevarar begränsningar

**Syfte:** Använda sökning utan ett fysiskt tangentbord.

**Användare:** Alex Exempel.

**Förutsättningar:** En ny provinstallation för sökning på telefon,
390 pixlars bredd.

**Integrationstest:**
[object-search.spec.ts](../../tests/integration/object-search.spec.ts),
“SÖK-05: mobile search and native filter dialog provide touch entry and
preserve restrictions”.

**Steg:**

1. Visa verktygens namn och öppna Sök i kartan. Kontrollera sökfältets
   fokus och åtkomliga filter. Skriv prov och ta med upphörda.
2. Stäng sökytan. Läs fortsatt sökning, filter och träffantal.
3. Välj Tabell, sök efter 399 egen och öppna Filter. Kontrollera rubrikfokus.
   Välj Typ 2 och stäng med krysset.
4. Kontrollera samma söktext och en träff. Prova samma flöde med touch,
   skärmtangentbord och förstoring på iPhone och iPad.

**Förväntat resultat:**

- Kartan har en ingång utan tangentbord och tabellen ett eget synligt fält.
- Filterdialogen håller fokus inom dialogen och återgår till Filter.
- Sökingången ryms inom skärmen. Söktext och filter bevaras vid stängning.
- Verklig touch, skärmtangentbord och VoiceOver behöver manuellt prov;
  automatprovet kontrollerar mobil layout och offentlig UI.

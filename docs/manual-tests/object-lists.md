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
2. Öppna **Tabell → Filter**, välj **Ta med upphörda** och stäng filtret.
   Prova dator och telefon, tangentbord och pekning, ljust och mörkt tema
   samt webbläsarens förstoring.
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

### Förbered utforskning i kartan

1. Bygg med `npm run build` och starta
   `node --import tsx scripts/manual-map-exploration.ts` från projektroten.
2. Öppna den utskrivna adressen och logga in med Google som Alex Exempel.
   Provkartan har kedjan Alex Exempel → Blå cykel → Garaget → Bostaden
   och ett oberoende objekt. Alla uppgifter är syntetiska.
3. Lägg till `--ended` för SÖK-07 eller `--removed` för SÖK-08.
   Skriv `quit` och starta om mellan fallen; databasen raderas vid avslut.

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
2. Kontrollera dialogens rubrik och antal samband. Från rubriken ska
   Skift+Tab nå **Stäng samband** och Tab sedan nå krysset. Välj Cykel, läs hela
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
4. Välj **Stäng samband** och kontrollera fokus.

**Förväntat resultat:**

- Okänt och Uttryckligen inget har inga falska objektlänkar. Osäkert
  uppgivet är skilt från dessa betydelser. **Redigera samband** finns
  för de två giltiga sambanden utan målobjekt.
- Upphört, Föreslagen borttagning och sparat/föreslaget värde är läsbara
  även utan färg. Dolda egna fält finns med.
- Text bryts inom skärmbredden och innehållet rullar i dialogen.
  Fokus återgår till Samband för Cykel.
- Sambandsdialogen har **Stäng samband** och kryss. Escape fungerar också.

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

### LÄS-05: läs identitet före och efter ett förslag

**Syfte:** Skilja ett identifierat objekt från ospecificerad eller oklar
identitet och läsa en föreslagen precisering.

**Användare:** Alex Exempel.

**Förutsättningar:** Hushållet från Förbered läskedjan. Garage är sparat
som Ospecificerat objekt. Lägg ett förslag där Garage är identifierat i
utkastet. Lägg även Oklart objekt med identitet som behöver redas ut i
utkastet genom objektformuläret. Spara inte utkastet.

**Integrationstest:**
[household-reading.spec.ts](../../tests/integration/household-reading.spec.ts),
testfallet “LÄS-05: identity reading distinguishes identified, unresolved
and a proposal replacing unspecified identity”.

**Steg:**

1. Öppna Tabell, expandera Alex och välj Läs alla uppgifter.
2. Läs Identitet och stäng med Escape. Läs Oklart objekt på samma sätt.
3. Läs Garage och jämför Sparat med Ditt förslag för Identitet.
4. Stäng och kontrollera att förslagen ligger kvar i utkastet.

**Förväntat resultat:**

- Alex visar Identifierat objekt. Oklart objekt visar Identiteten behöver
  redas ut. Identitet presenteras alltid som en uttrycklig uppgift.
- Garage visar Sparat: Ospecificerat objekt och Ditt förslag: Identifierat
  objekt. Ingen del av identitetsjämförelsen visar Ej uppgivet.
- Läsningen sparar ingenting och Escape återför fokus till läskontrollen.

### LÄS-06: återgå när den sista tabellsidan försvinner

**Syfte:** Återgå till föregående motsvarande radkontroll efter att
sidantalet minskar under läsning.

**Användare:** Alex Exempel.

**Förutsättningar:** Ett tomt provhushåll med 51 nya objekt i utkastet,
namngivna Objekt 1 till Objekt 51. Ett aktivt textsamtal och en andra
inloggad flik i samma hushåll. Använd sorteringen Namn A–Ö.

**Integrationstest:**
[household-reading.spec.ts](../../tests/integration/household-reading.spec.ts),
testfallet “LÄS-06: a vanished sole second-page row restores the preceding
control after page collapse”.

**Steg:**

1. Öppna Tabell och välj Nästa. Kontrollera att endast Objekt 51 finns på
   sida två. Öppna Samband för Objekt 51.
2. Ta bort bara förslaget Objekt 51 i andra fliken. Vänta tills dialogen
   visar att objektet inte längre finns.
3. Stäng med Escape och kontrollera tabellens sida och fokus.

**Förväntat resultat:**

- Tabellen visar sida ett av ett med de 50 kvarvarande objekten.
- Fokus återgår till Samband för Objekt 50. De övriga förslagen är kvar.

### LÄS-07: läs ett långt namn på smal skärm

**Syfte:** Läsa hela objektnamnet även när det saknar mellanslag.

**Användare:** Alex Exempel.

**Förutsättningar:** Hushållet från Förbered läskedjan. Lägg ett objekt i
utkastet vars namn består av Långtobjektnamn upprepat tolv gånger utan
mellanslag. Prova en smal skärm och 200/400 procent förstoring.

**Integrationstest:**
[household-reading.spec.ts](../../tests/integration/household-reading.spec.ts),
testfallet “LÄS-07: a long unbroken object name wraps in full reading at
320 CSS pixels”.

**Steg:**

1. Öppna Tabell, expandera objektet och välj Läs alla uppgifter.
2. Läs dialogens rubrik och rubriken för alla uppgifter. Rulla genom
   uppgifterna och stäng med krysset.

**Förväntat resultat:**

- Hela namnet bryts och går att läsa inom dialogen utan sidledsrullning.
- Uppgifterna och stängkontrollen går att nå. Fokus återgår till
  läskontrollen när dialogen stängs.

## Sökning och filtrering

### LISTA-01: flera typval kombineras med sökning och aktuell rad

**Syfte:** Begränsa en stor tabell utan att ändra hushållets uppgifter.

**Användare:** Alex Exempel.

**Förutsättningar:** Provkartan med 500 objekt är öppen i Tabell.
Välj Ta med upphörda i tabellens eget filter.

**Integrationstest:**
[object-list.spec.ts](../../tests/integration/object-list.spec.ts), testfallet
“LISTA-01: multiple type filters combine with search and the current row
across 500 objects”.

**Steg:**

1. Expandera Provobjekt 000 och Provobjekt 001. Båda raderna är öppna;
   Provobjekt 001 är den aktuella markeringen.
2. Öppna Filter, välj Person och Tjänst och stäng med Stäng filter.
   Kontrollera 200 träffar. Sök sammanhang 0. och kontrollera tjugo träffar.
3. Öppna Filter, välj Bara markerade och stäng. Kontrollera Provobjekt 001
   som enda träff. Välj Alla typer i Filter och kontrollera samma träff.
4. Stäng av Bara markerade och stäng filtret: femtio träffar. Välj Person
   och stäng filtret: tio träffar och fokus tillbaka på Filter.
5. Sök finns inte. Läs det tomma resultatet och välj Återställ sökning
   och filter. Välj Ta med upphörda igen och kontrollera 500 träffar.

**Förväntat resultat:**

- Typval kombineras med eller; sökning och markeringsfilter begränsar vidare.
- Filter förblir öppet under val. Stängning återför fokus till Filter.
- Provobjekt 001 behåller markeringen när sökning och filter återställs.
- Inga objekt, samband, utkast eller personliga placeringar ändras.

## Återfinna tabellen

### LISTA-02: sortering, sida och rulläge består vid tillfälliga besök

**Syfte:** Behålla tabelläget och skydda oskickad formulärtext.

**Användare:** Alex Exempel.

**Förutsättningar:** Provkartan med 500 objekt i Tabell; Ta med upphörda
är valt i tabellens Filter.

**Integrationstest:**
[object-list.spec.ts](../../tests/integration/object-list.spec.ts), testfallet
“LISTA-02: sorting, pages and scroll survive native details, settings and
map-result navigation”.

**Steg:**

1. Sök Provobjekt och välj Person och Tjänst i Filter. Stäng filtret.
2. Bläddra genom fyra sidor med Namn A–Ö och sedan Typ A–Ö. Kontrollera
   samma 200 objekt. Lämna Typ A–Ö och sida fyra valda.
3. Expandera Provobjekt 496, rulla till Läs alla uppgifter och öppna den
   läsningen. Stäng med krysset. Kontrollera samma rulläge och öppningsfokus.
4. Redigera Provobjekt 496 och skriv Oskickat under listbesöket i
   Beskrivning. Välj Avbryt och tryck Escape i förlustvarningen.
   Kontrollera texten. Välj Avbryt igen och kasta endast formulärändringen.
5. Besök Inställningar och välj Tillbaka till kartan. Kontrollera Tabell,
   sökning, sortering, sida fyra och den fortfarande expanderade raden.
6. Välj Visa Provobjekt 496 i kartan och återvänd med Tabell.
   Kontrollera samma sökning, sida och typval.
7. Sök Provobjekt 496. Kontrollera en träff och Sida 1 av 1.

**Förväntat resultat:**

- Sortering ändrar ordningen, men inte resultatmängden eller antalet objekt.
- Läsdialogen återför fokus och rulläge. Kart- och inställningsbesök
  bevarar sökning, filter, sortering, sida och expansion.
- Avbruten förlustvarning behåller oskickad text. Uttrycklig förlust
  påverkar bara formuläret; hushållets data och utkast är oförändrade.
- Sökning med färre träffar visar en giltig sida.

## Visa en träff i kartan

### LISTA-03: kartträffen fokuserar direkta grannar och behåller samtalet

**Syfte:** Skilja tabellens aktuella rad från kartans fokuserade utsnitt.

**Användare:** Alex Exempel.

**Förutsättningar:** Ett hushåll har Lo Exempel, Kim Exempel och
Långt borta. Lo har ett samband till Kim och Kim har ett till Långt borta.
Placera det sista objektet tydligt längre bort i den personliga vyn.
Samtal kan startas med testmiljöns ersättare för modelltjänsten.

**Integrationstest:**
[object-list.spec.ts](../../tests/integration/object-list.spec.ts), testfallet
“LISTA-03: a table map result focuses direct neighbors and preserves unsent
conversation”.

**Steg:**

1. Starta ett samtal i textläge. Skriv Oskickat medan jag söker utan att
   skicka och stäng textvyn.
2. Öppna Tabell, expandera Lo och Kim och sök Lo Exempel.
3. Välj Visa Lo Exempel i kartan. Kontrollera Lo:s markering och att
   Lo och direkta grannen Kim ryms i utsnittet.
4. Öppna Skriv till Skyttel. Kontrollera samma oskickade meddelande.
   Stäng textvyn och återvänd med Tabell.

**Förväntat resultat:**

- Lo är ensam markerad. Indirekta grannen Långt borta utökar inte utsnittet.
- Kartvisningen markerar objektet utan att öppna en detaljyta.
- Samtalet och dess oskickade text består. Tabellens sökning ger en träff.
- Hushållets uppgifter, utkast och personliga placeringar är oförändrade.

### LISTA-04: smal tabell och uppgifter fungerar när grafiken avbryts

**Syfte:** Behålla tabellens arbete vid förlorad kartgrafik.

**Användare:** Alex Exempel.

**Förutsättningar:** Hushållet från LISTA-03. Prova vid 390 och 320 pixlars
bredd. Automatprovet framkallar verklig WebGL-förlust. För manuellt prov
behövs en testmiljö där grafikavbrott kan framkallas.

**Integrationstest:**
[object-list.spec.ts](../../tests/integration/object-list.spec.ts), testfallen
“LISTA-04: narrow tables retain search and native details after graphics
loss at 390px” och “LISTA-04: narrow tables retain search and native details
after graphics loss at 320px”.

**Steg:**

1. Öppna Tabell, sök Lo Exempel och välj Person i Filter. Kontrollera
   synligt tangentbordsfokus och åtkomligt typval. Stäng filtret.
2. Välj Visa Lo Exempel i kartan. Kontrollera markeringen.
3. Återvänd med Tabell och framkalla grafikavbrottet. Kontrollera samma
   sökning och att knappen för kartvisning blir inaktiv.
4. Expandera Lo och välj Läs alla uppgifter. Kontrollera rubrikfokus och
   stäng läsningen. Redigera Beskrivning till Utan grafik.
5. Välj Avbryt och Escape i förlustvarningen. Kontrollera samma text och
   oförändrat utkast. Avbryt igen och kasta endast formulärändringen.
6. Öppna Filter och kontrollera Person. Stäng filtret och läs sökningen.

**Förväntat resultat:**

- Sökning, typval och läsning fungerar utan kartgrafik. Tabellens kolumner
  kan rullas i sidled; detaljer och formulär ryms inom skärmbredden.
- Grafikavbrottet förlorar varken markering, sökning eller filter.
- Oskickad text skyddas av förlustvarningen. Varken hushållets data,
  utkast eller personliga placeringar ändras av provet.

### LISTA-05: återgång på kort skärm bevarar synlig träff och fokus

**Syfte:** Återgå till samma tabellarbete i ett kort fönster.

**Användare:** Alex Exempel.

**Förutsättningar:** Provkartan med 500 objekt. Prova 320 × 250 CSS-pixlar
och verklig webbläsarzoom på 400 procent.

**Integrationstest:**
[object-list-flow.spec.ts](../../tests/integration/object-list-flow.spec.ts),
testfallet “LISTA-05: short-screen table returns preserve the visible result
and keyboard focus”.

**Steg:**

1. Öppna Tabell och välj Ta med upphörda i Filter. Expandera Provobjekt 045
   och rulla till Läs alla uppgifter. Fokusera knappen och anteckna rulläget.
2. Öppna läsningen. Kontrollera rubrikfokus och stäng med krysset.
3. Besök Karta och återvänd med Tabell. Kontrollera samma rulläge och fokus.
4. Besök Inställningar och välj Tillbaka till kartan. Kontrollera samma
   tabelläge och synligt, åtkomligt fokus.
5. Rulla till Visa Provobjekt 045 i kartan, fokusera kontrollen och
   anteckna rulläget. Välj den och återvänd med Tabell.
6. Visa Karta och öppna Sök i kartan. Kontrollera fokus i sökfältet.

**Förväntat resultat:**

- Återbesök bevarar tabellens inre och yttre rulläge när kontrollen är
  synlig. Ett ändrat utrymme efter Inställningar rullar bara så mycket
  som behövs för att visa samma fokuserade kontroll.
- Fokus återgår till använd kontroll; den är synlig och går att peka på.
- Sökfältet får fokus vid uttryckligt sökval. Hushållets data är oförändrade.

### LISTA-06: utgånget fall för inaktiv listpanel

Fallet gäller första klicket i en fri listpanel bredvid en aktiv
objektpanel. De panelerna är avvecklade. ID:t återanvänds inte.
Vanlig tabelläsning och återgång provas i LISTA-02 och LISTA-05.

## Läsa och återfinna objekt

### LISTA-07: textåtgärder tar bort valt objekt utan kartgrafik

**Syfte:** Nå vanliga objektåtgärder utan kartgrafik och föreslå en
borttagning med verkliga beroenden utan att ändra sparade uppgifter.

**Användare:** Alex Exempel med tillgång till provhushållet.

**Förutsättningar:** Starta läskedjans installation enligt förberedelsen.
Öppna den i Chrome med WebGL avstängt, exempelvis med startflaggan
`--disable-webgl` och en separat tillfällig webbläsarprofil. Detta är ett
kontrollerat datorprov; vanliga nätverksavbrott ersätter inte förberedelsen.
Cykel har fyra samband, inklusive upphörda och samband utan identifierat
mål. Skapa separat **Behåll mig** med **Nytt objekt** och välj **Lägg i
utkastet och stäng**. Spara inte hela utkastet.

**Integrationstest:**
[object-actions.spec.ts](../../tests/integration/object-actions.spec.ts),
testfallet “LISTA-07: text object actions preserve cancellation and stage
only the chosen removal without map graphics”.

**Steg:**

1. Öppna **Tabell**, sök efter **Cykel** och expandera dess rad.
2. Fokusera **Åtgärder för Cykel** med tangentbordet och tryck Enter.
   Läs att objektet och dess fyra samband läggs som borttagningar i ditt
   utkast, medan den sparade kartan ändras först vid separat sparande.
3. Tryck Escape. Kontrollera återfokus på **Åtgärder för Cykel** och
   att de befintliga förslagen är kvar oförändrade.
4. Öppna åtgärderna igen och välj **Redigera objekt**. Ändra
   beskrivningen till **Behåll mina oskickade uppgifter** och välj krysset.
5. Kontrollera fokus på **Fortsätt redigera** i förlustvarningen. Tryck
   Escape och kontrollera att beskrivningen består i samma stora formulär.
6. Välj krysset igen och **Kasta ändringarna och fortsätt**. Fokus återgår
   till textåtgärden; redan lagda förslag är kvar.
7. Öppna åtgärderna igen och välj **Ta bort objekt**.
8. Läs **Föreslagen borttagning** i raden. Öppna **Utkast** och granska
   objektets och de fyra sambandens borttagningsförslag samt **Behåll mig**.
   Läs **Rapporter → Ändringshistorik** och kontrollera att inget nytt
   gemensamt sparande finns.

**Förväntat resultat:**

- Åtgärderna är tillgängliga utan kartgrafik; tabellens tre radåtgärder
  och de gemensamma objektformulärens två inskickningsknappar är kvar.
- Escape stänger bara menyn och återställer användbart fokus. Det ändrar
  inget förslag eller sparad uppgift.
- Redigeringen använder samma stora formulär. Escape avbryter förlusten;
  uttryckligt kastande tar bara bort den oskickade beskrivningen.
- Borttagningen läggs bara i ditt utkast. Den gäller Cykel och dess fyra
  verkliga samband; det oberoende förslaget **Behåll mig** består.
- Fokus återgår till samma textåtgärd. Sparade objekt, samband och
  ändringshistorik är oförändrade tills hela utkastet sparas separat.

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

**Förutsättningar:** Hushållet från Förbered hushållets tabell är öppet.
Öppna **Inställningar → Typer och egna fält** och redigera **Typ 2**.
Byt fältnamnet **Egen anteckning** till **Föreslagen anteckning**, utan
att ta bort fältet eller ändra dess datatyp. Lägg till ett synligt avsnitt
**Cykeluppgifter** med **Ramnummer** (text), **Antal** (tal) och **Reserv**
(ja/nej). Lägg typändringen i utkastet och gå tillbaka till kartan.
Öppna **Tabell → Redigera A 2**, fyll i Ramnummer `RAM-2026-42`, Antal `0`
och Reserv **Nej**. Välj **Lägg i utkastet och stäng**. Redigera sedan
Typ 2 igen i inställningarna och välj **Dold, behåll värden** som avsnitt
för de tre nya fälten.
Lägg ändringen i utkastet och återgå till Tabell. Spara inte utkastet.

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
   Läs de nya dolda fälten: sparat **Ej uppgivet** och föreslaget
   Ramnummer `RAM-2026-42`, Antal `0` respektive Reserv **Nej**.
   Läs också **Föreslagen anteckning** med det tidigare fältnamnet
   **Egen anteckning** vid den sparade långa texten.
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
- Nya fält visar **Sparat: Ej uppgivet** utan ett påhittat tidigare
  fältnamn eller texten `undefined`. Ett faktiskt tidigare fältnamn och
  dess svar behålls vid en namnändring. Noll och Nej visas uttryckligen.
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
   Låt sökytan vara öppen, fokusera kartbakgrunden och skriv b följt av
   mellanslag och 12. Kontrollera att hela texten blir b 12 i sökfältet,
   som får fokus, och att filteravsnittet stängs.
   Välj Sök i kartan igen medan sökytan är öppen. Kontrollera sökfältets
   fokus och öppet filteravsnitt. Stäng filteravsnittet, skriv 299 EGEN
   och kontrollera att det förblir stängt. Öppna sedan filteravsnittet.
2. Välj Typ 10 och sök efter A 10. Tryck Escape. Kontrollera kvarvarande
   sökning och typ i kartans resultatbesked. Öppna sökningen igen.
3. Besök Tabell och expandera A 2 så att det markeras. Skriv åke följt av x
   i tabellens sökfält. Återgå till Karta.
4. Fokusera själva kartbakgrunden med Tab. Skriv ö. Kontrollera att
   tidigare söktext ersätts, filtret behålls och sökfältet får fokus.
5. Stäng med Escape. Fokusera kartan och bygg ett sammansatt å.
   Kontrollera att bara det färdiga tecknet öppnar sökningen.
6. Prova ett kortkommando. Öppna Nytt objekt och skriv ett namn med
   bokstäver och siffror. Välj **Avbryt** och sedan **Kasta ändringarna och
   fortsätt** i förlustvarningen. Öppna Skriv till
   Skyttel och skriv ett oskickat meddelande, utan att starta samtal.
   Kontrollera att sökytan förblir stängd och texten går att skriva.
7. Stäng textvyn, öppna Sök i kartan och välj Rensa sökning. Kontrollera tom
   söktext, kvarvarande Typ 10 och Bara markerade (1) utan nytt filterval.
8. Sök efter Örn. Ändra snabbt till tom text, finns inte och Örn igen.
   Kontrollera slutligt träffbesked utan gamla mellanliggande antal.
   <!-- cSpell:disable-next-line -->
   Återvänd till Tabell och kontrollera dess separata text **åkex**.
   Sök efter A 2 och kontrollera markeringen. Öppna textvyn och kontrollera
   det oskickade meddelandet.

**Förväntat resultat:**

- Sökknappen öppnar sökning och filter, tangentbordsstart bara sökning,
  även när sökytan redan är öppen. Varje ingång flyttar fokus till
  sökfältet där fortsatt text tas emot. Vanlig inmatning behåller det
  valda läget för filteravsnittet.
- Escape och Stäng bevarar text, filter och markering. Rensa sökning
  ändrar bara texten; Typ 10 och markeringen av A 2 är kvar. Aktiva
  begränsningar syns med stängd sökyta.
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
3. Öppna **Utkast**, välj **Kasta hela utkastet**, läs bekräftelsen och
   välj **Ta bort hela utkastet**. Kontrollera att utkastet är tomt.
4. Stäng textvyn. Återvänd till Tabell och sedan kartans sökyta. Kontrollera bevarad
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
3. Välj Tabell, sök efter 399 egen och öppna Filter. Kontrollera fokus på
   Tabellens filter och förklaringen om vilka objekt tabellen visar.
   Välj Typ 2, kontrollera Visa 1 träffar och välj knappen.
4. Kontrollera samma söktext och en träff. Prova samma flöde med touch,
   skärmtangentbord och förstoring på iPhone och iPad.
5. Öppna Filter igen. Kontrollera Typ 2 och samma träffantal. Nå knappen
   för att visa träffar med tangentbord även när skärmen är kort. Stäng
   med knappen och öppna igen; prova också krysset och Escape.

**Förväntat resultat:**

- Kartan har en ingång utan tangentbord och tabellen ett eget synligt fält.
- Filterdialogen håller fokus inom dialogen och återgår till Filter.
- Knappen visar det aktuella träffantalet och stänger med valen kvar.
- Sökingången ryms inom skärmen. Söktext och filter bevaras vid stängning.
- Verklig touch, skärmtangentbord och VoiceOver behöver manuellt prov;
  automatprovet kontrollerar mobil layout och offentlig UI.

### SÖK-06: direkta grannar och fortsatt utforskning bevarar sökträffarna

**Syfte:** Följa en kedja i kartan utan automatisk indirekt expansion.

**Användare:** Alex Exempel.

**Förutsättningar:** Förbered utforskning i kartan utan extra flagga.

**Integrationstest:**
[map-exploration.spec.ts](../../tests/integration/map-exploration.spec.ts),
testfallet “SÖK-06: map search shows direct context and exploration preserves
hits through return and table visits”.

**Steg:**

1. Öppna **Sök i kartan** och skriv **Alex**. Stäng sökytan.
2. Läs Alex som sökträff och Blå cykel som sammanhang. Markera cykeln
   med tangentbord. Kontrollera att Garaget inte visas ännu.
3. Välj **Visa samband i kartan**. Kontrollera Garaget, tidigare innehåll
   och kamerans förflyttning. Markera Garaget och upprepa för Bostaden.
4. Öppna sökytan och välj Alex objekttyp. Kontrollera återgång till
   Alex och cykeln. Skriv **Blå** och kontrollera dess direkta grannar;
   Bostaden visas inte. Skriv **Alex** igen och stäng sökytan.
5. Markera cykeln och följ dess samband igen. Besök **Tabell** och
   återgå via **Karta**. Välj **Tillbaka till sökträffarna**.

**Förväntat resultat:**

- En träff visas; sammanhang har egen text och symbol och räknas inte.
- Enbart markering utökar inte kartan. Varje följd åtgärd visar en nivå
  till, behåller tidigare innehåll och flyttar kameran.
- Sökning och filter börjar om med direkt sammanhang. Tabellbesök
  bevarar däremot utforskningen. Återgången behåller söktext och filter,
  visar Alex och cykeln och ger användbart fokus i kartan.
- Karta, utkast och gemensam historik ändras inte.

### SÖK-07: sammanhang går utanför träfffilter men följer upphört

**Syfte:** Skilja träfffilter från livscykelregler för sammanhang.

**Användare:** Alex Exempel.

**Förutsättningar:** Förbered utforskning med `--ended`. Alex har ett
ändringsförslag. Cykeln har annan typ; en upphörd granne och ett upphört
samband till Oberoende objekt är direkt kopplade till Alex.

**Integrationstest:**
[map-exploration.spec.ts](../../tests/integration/map-exploration.spec.ts),
testfallet “SÖK-07: direct context ignores hit filters while ended objects and
edges require inclusion”.

**Steg:**

1. Markera Alex. Öppna **Sök i kartan**, skriv **Alex**, välj Alex
   objekttyp, **Ändrat** och **Bara markerade**. Stäng sökytan.
2. Kontrollera träffantalet och cykelns sammanhang. Läs upplysningen
   om dolt upphört innehåll.
3. Välj upplysningens **Ta med upphörda**. Kontrollera båda ytterligare
   grannarna och träffantalet.
4. Öppna sökytan och avmarkera **Bara markerade** och **Ta med upphörda**.
   Stäng sökytan, markera cykeln och välj **Visa samband i kartan**.
5. Öppna **Tabell**, välj **Redigera Blå cykel** och öppna
   **Livscykel och utseende**. Ändra objektets status till **Upphört**
   och välj **Lägg i utkastet och stäng**.
6. Återgå till **Karta**. Kontrollera att den utforskade cykeln döljs.
   Välj **Ta med upphörda** från upplysningen och kontrollera cykeln.
   Markera cykeln och välj **Visa samband i kartan** igen för att
   kontrollera Garaget.

**Förväntat resultat:**

- Alex är enda träffen. Cykeln visas trots annan typ, avsaknad av
  ändringsförslag, annan söktext och att den inte är markerad.
- Upphörd granne och upphört samband döljs tills de uttryckligen tas med.
- Inkludering visar båda grannarna utan att räkna dem som sökträffar.
- Utforskningen ändrar inte utkastet eller den gemensamma informationen.
  Redigeringen i steg 5 lägger enbart statusändringen i utkastet.
- Ett tidigare utforskat objekt som föreslås upphöra döljs också när
  upphörda inte tas med. Ändrat filter återgår till träffarnas direkta
  grannar; fortsatt utforskning visar Garaget. Den gemensamma kartan
  är fortsatt oförändrad.

### SÖK-08: tabellens kartknapp återställer kartfilter och bevarar tabelläget

**Syfte:** Visa ett valt tabellobjekt med direkt sammanhang i kartan.

**Användare:** Alex Exempel.

**Förutsättningar:** Förbered utforskning med `--removed`. Cykeln har
föreslagen borttagning och Oberoende objekt är redan borttaget. Prova
1280, 390 och 320 pixlars bredd, tangentbord och pekning.

**Integrationstest:**
[map-exploration.spec.ts](../../tests/integration/map-exploration.spec.ts),
testfallen “SÖK-08: table map actions reset only map filters and retain table
work at 1280px”,
“SÖK-08: table map actions reset only map filters and retain table work at
390px” och “SÖK-08: table map actions reset only map filters and retain table
work at 320px”.

**Steg:**

1. Sök efter **Alex** i kartan och välj **Bara markerade** utan markering.
2. Välj **Tabell**, sök **Blå**, sortera namn Ö–A och expandera cykeln.
3. Välj **Visa Blå cykel i kartan**. Kontrollera markering och direkt
   sammanhang. Kontrollera även att Bostaden finns kvar i kartan.
4. Öppna kartans sökyta. Kontrollera tom text, återställda filter och
   fyra träffar. Stäng och återgå via **Tabell**.
5. Kontrollera fokus, söktext, sortering och öppen rad. Sök sedan
   **Oberoende**, öppna **Filter** och välj **Ta med borttagna**.

**Förväntat resultat:**

- Endast cykeln markeras. Kameran visar dess direkta grannar; övrig
  karta filtreras inte bort och fokus går till kartan.
- Kartans begränsningar återställs. Tabellens sökning, sortering och
  expanderade rad finns kvar; fokus återgår till kartknappen.
- Föreslagen borttagning har kartknapp. Redan borttaget objekt saknar den.
- Besöket ändrar ingen sparad information och inget förslag.

### SÖK-09: ändrade samband visar tidigare och föreslagna direkta ändpunkter

**Syfte:** Läsa en föreslagen kopplingsändring inom sökträffens sammanhang.

**Användare:** Alex Exempel.

**Förutsättningar:** Förbered utforskning utan extra flagga.

**Integrationstest:**
[map-exploration.spec.ts](../../tests/integration/map-exploration.spec.ts),
testfallet “SÖK-09: a changed connection shows direct saved and proposed
endpoints without expanding their chains”.

**Steg:**

1. Öppna Alex samband från tabellen. Ändra sambandet till Blå cykel
   så att målobjektet är Garaget. Lägg det i utkastet utan att spara.
2. Öppna kartan, sök **Alex** och stäng sökytan. Läs tidigare och
   föreslagen koppling. Kontrollera att Bostaden inte visas.
3. Kasta förslaget. Markera det ursprungliga sambandet som upphört
   och spara. Föreslå sedan målobjekt Garaget och status Aktuellt.
4. Sök **Alex** i kartan igen. Kontrollera att tidigare upphört samband
   och cykeln döljs. Välj upplysningens **Ta med upphörda**.

**Förväntat resultat:**

- Alex är enda träffen. Båda direkta ändpunkterna är sammanhang när
  deras samband är aktuella eller upphörda uttryckligen tas med.
- Tidigare koppling skiljs från förslaget med geometri, symbol och text.
- Ingen indirekt kedja öppnas automatiskt. Upphört gäller även tidigare
  samband, som åter syns efter uttrycklig inkludering.

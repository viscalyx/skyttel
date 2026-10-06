# Manuella testfall för markering och detaljer

Testfallen omfattar flerval, tomrumsgester, textkontroller, läsning och
vanliga formulär. Anteckna commit, webbläsare, enhet, fysisk eller emulerad
inmatning samt godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

Alex Exempel är inloggad medlem i ett separat provhushåll. Använd bara
påhittade uppgifter. Administratörsrollen behövs inte för kartarbetet.

## Allmän förberedelse

1. Starta en isolerad installation enligt
[provförberedelsen](../development/devcontainer.md#disposable-local-database).
   Använd ett nytt provhushåll mellan fallen.
2. Välj **Nytt objekt** i verktygen. Skapa personerna Lo Exempel, Kim Exempel
   och Alex Exempel, ett helt formulär åt gången. Välj varje gång
   **Lägg i utkastet och stäng**.
3. Välj **Tabell**, **Samband för Lo Exempel**, **Nytt samband** och ange
   Använder till Kim Exempel. Lägg hela sambandet i utkastet och stäng
   samband. Skapa likadant Kim Exempel → Använder → Alex Exempel.
4. Välj **Karta**. Alla tre objekt och båda privata samband visas.
   Spara inte utkastet under dessa markeringstester.

## Markering och kartgester

### MARKERING-01: flerval och uttrycklig detaljöppning

**Syfte:** Skilja markering från detaljöppning utan ändrade fakta eller kamera.

**Användare:** Alex Exempel.

**Förutsättningar:** Alla tre objekt visas på en dator med kartgrafik.

**Integrationstest:**
[map-selection.spec.ts](../../tests/integration/map-selection.spec.ts),
testfallet “MARKERING-01: ordinary and modified clicks select objects and open
details separately”.

**Steg:**

1. Klicka Lo. Kontrollera markeringen, solid ram och det direkta sambandet,
   utan öppnade uppgifter. Ctrl-klicka Alex och kontrollera två markerade
   objekt och båda direkta sambanden.
2. Klicka Lo igen: Alex finns kvar. Cmd-klicka Alex för att ta bort Alex.
   Klicka det omarkerade Kim och kontrollera att Kim ersätter Lo.
3. Ctrl-klicka Lo, dubbelklicka Kim och läs Kims fasta uppgifter.
   Välj **Stäng uppgifterna**. Kontrollera att de två markeringarna finns kvar.
4. Ctrl+Alt-klicka Lo, läs Lo och stäng uppgifterna. Cmd+Alt-klicka Alex,
   läs Alex och stäng igen. Kontrollera tre markeringar och samma kamera.
5. Klicka fri bakgrund. Dubbelklicka Alex och kontrollera en markering.
   Stäng uppgifterna och pröva höger Control+Option-klick på Lo där
   enhetens motsvarande modifierare används.

**Förväntat resultat:**

- Vanligt klick, Ctrl/Cmd-flerval och detaljöppning följer stegen.
- Alla markerade objekts direkta samband framhävs. Grannar blir inte markerade.
- En fast läsyta återger det valda objektet. När den stängs återkommer samma
  kartläge; ingen handling ändrar hushållets uppgifter.

### MARKERING-02: tomrumsklick och avbrutna gester

**Syfte:** Avmarkera utan att ändra sökning eller oavsiktligt flytta kameran.

**Användare:** Alex Exempel.

**Förutsättningar:** Kartan visas på datorn med fri bakgrund att klicka.

**Integrationstest:**
[map-selection.spec.ts](../../tests/integration/map-selection.spec.ts),
testfallet “MARKERING-02: empty clicks clear highlighting while navigation and
cancellation retain selection”.

**Steg:**

1. Markera Lo. Klicka i kartans sökfält, skriv Exempel i **Sök objekt i kartan**
   och tryck Escape i sökfältet. Avmarkera och markera Lo med Control-klick.
   Kontrollera bevarad söktext, kamera och att inga detaljer öppnas.
2. Klicka fri bakgrund med en mycket liten rörelse. Kontrollera att
   markeringarna släcks medan söktext och kamera finns kvar.
3. Markera Lo, dra bakgrunden och kontrollera att Lo förblir markerad.
   Klicka sedan direkt i tomrummet: Lo avmarkeras utan ett nytt kamerahopp.
4. Markera Lo igen. Börja en pekgest på bakgrunden och avbryt den genom
   webbläsarens eller enhetens avbrottshandling. Kontrollera urvalet.
5. Välj sambandet från Lo till Kim och klicka tom bakgrund.

**Förväntat resultat:**

- Ett enda tomrumsklick släcker all framhävning, även efter en dragning.
- Små rörelser flyttar inte kameran. Verklig eller avbruten navigering
  behåller markeringarna. Söktext och kamera består.

## Textalternativ och vanliga formulär

### MARKERING-03: tangentbord, läsning och uttrycklig formulärförlust

**Syfte:** Läsa markerade uppgifter, skydda oskickad text och nå samma
formulär från tabellen på stora och små skärmar.

**Användare:** Alex Exempel.

**Förutsättningar:** Kör varje gång i ett nytt förberett provhushåll.
Prova 1440, 390 och 320 CSS-pixlars bredd med 1000 pixlars höjd.

**Integrationstest:**
[map-selection.spec.ts](../../tests/integration/map-selection.spec.ts),
testfallen “MARKERING-03: text selection and native details protect unsent work
at 1440px”,
“MARKERING-03: text selection and native details protect unsent work at 390px”
och
“MARKERING-03: text selection and native details protect unsent work at 320px”.

**Steg:**

1. Kontrollera att **Visa detaljer** är inaktivt utan urval och att
   verktygsknapparna ryms med minst 44 × 44 CSS-pixlars tryckyta.
   Nå **Välj objekt: Lo Exempel** med Tab och tryck mellanslag.
2. Ctrl-klicka Kim och välj **Visa detaljer**. Kontrollera två markerade
   objekt, Kims rubrikfokus och aktiv detaljikon.
3. Välj **Redigera Kim Exempel** och skriv Oskickat samt aktuell bredd i
   **Beskrivning**. Välj **Stäng objektdialogen**. Kontrollera fokus på
   **Fortsätt redigera** och tryck Escape. Texten finns kvar, utan nytt förslag.
4. Stäng igen och välj uttryckligen **Kasta ändringarna och fortsätt**.
   Kontrollera fokus på den tidigare redigeringsknappen och båda markeringarna.
5. Stäng uppgifterna. Välj **Tabell** och **Redigera Kim Exempel**.
   Kontrollera att den kastade beskrivningen är tom. Stäng utan ändring.
6. Nå namnet **Lo Exempel** i tabellen och tryck mellanslag.
   Kontrollera expanderade uppgifter och markerad rad.
7. Öppna verktygens namn vid behov, välj **Tema** och **Mörkt**.
   Kontrollera fokus tillbaka till temaknappen och läsbar knapptext
   när pekaren hålls över **Redigera Kim Exempel**.
8. Öppna utkastets läsning via **Skriv till Skyttel** och **Visa utkastet**.
   Välj **Tabell** igen. Kontrollera att samma redigeringsknapp kan nås
   utan att textvyn täcker den. På dator ryms tabellen bredvid textvyn;
   på smal skärm visas den valda tabellen.
9. Välj **Rapporter**. Kontrollera att utkastets läsning inte visas och att
   **Skriv till Skyttel** är stängd. Öppna **Skriv till Skyttel** och
   **Visa utkastet** igen. Kontrollera att Kims tidigare förslag kan läsas
   utan fråga om samtycke. Välj **Tabell** och nå samma redigeringsknapp igen.

**Förväntat resultat:**

- Markering, fast läsning och det fullständiga formuläret är skilda handlingar.
- Escape avbryter förlusten och bevarar text; endast uttryckligt kastande
  tar bort formulärtexten. Återöppning använder aktuellt underlag.
- Fokus och kontroller är åtkomliga på varje bredd. Text i mörkt tema har
  tillräcklig kontrast. Sparade fakta och hela tidigare utkastet är oförändrade.
- Rapporter bevarar utkastet. När texten öppnas igen återgår den till den
  tidigare kartan eller tabellen med åtkomliga kontroller.

### MARKERING-04: pensionerat fall för fria fönster

Fallet pensionerades när fria objektfönster och manuell fönsterflytt togs bort.
ID:t återanvänds inte. Läsning, återgång och åtkomliga kontroller prövas i
MARKERING-01, MARKERING-03 och MARKERING-05.

### MARKERING-05: läs markerade uppgifter och återgå från vanligt formulär

**Syfte:** Läsa ett valt objekt och nå samma fullständiga objektformulär
utan fria fönster eller ändring av hushållets sparade och privata uppgifter.

**Användare:** Alex Exempel med tillgång till provhushållet.

**Förutsättningar:** Starta läskedjans installation enligt
[Förbered läskedjan](object-lists.md#förbered-läskedjan). Öppna dess adress
och logga in med Google som Alex Exempel. Cykel har sparade uppgifter och
ett privat prisförslag. Starta om förberedelsen mellan körningarna. Prova
1280 × 900, 320 × 640 och ett kort fönster på 320 × 250 CSS-pixlar.
Fysisk telefon och skärmläsare redovisas separat om de används.

**Integrationstest:**
[map-selection-details.spec.ts](../../tests/integration/map-selection-details.spec.ts),
testfallen “MARKERING-05: selected information is read only and ordinary work
remains reachable at 1280x900”,
“MARKERING-05: selected information is read only and ordinary work remains
reachable at 320x640” och
“MARKERING-05: selected information is read only and ordinary work remains
reachable at 320x250”.

**Steg:**

1. Välj **Karta**. Nå **Välj objekt: Cykel** med tangentbord och tryck Enter.
2. Välj **Visa detaljer**. Läs Cykels namn och fullständiga uppgifter.
   Skilj sparade värden från det privata prisförslaget. Kontrollera att
   uppgifterna går att läsa men saknar redigeringsfält.
3. Nå **Redigera Cykel** med Tab och tryck Enter. Kontrollera att det vanliga
   fullständiga objektformuläret öppnas med Cykels aktuella uppgifter.
4. Välj **Stäng objektdialogen** utan att ändra något. Kontrollera att fokus
   återgår till **Redigera Cykel** och att samma uppgifter finns kvar.
5. Rulla hela läsytan. Välj **Tabell** och **Redigera Cykel**. Ange
   **Mitt privata läsförslag** i Beskrivning och välj **Lägg i utkastet och stäng**.
   Kontrollera fokus på samma redigeringsknapp och läs **Ändringen finns i ditt
   utkast. Kartan sparas separat.** ovanför tabellen.
6. Välj **Karta** och läs samma återkoppling en gång på den aktiva ytan.
   Upprepa vid varje angiven fönsterstorlek och kontrollera att knapparna
   kan nås med tangentbord utan sidrullning.

**Förväntat resultat:**

- En fast läsyta visar det markerade objektets uppgifter. Den har inga
  redigeringsfält, flytthandtag eller återupptagningsknappar för gamla fönster.
- Redigering öppnar samma vanliga objektformulär; oförändrad stängning
  återför fokus utan förslag eller ändrade värden.
- Läsning och oförändrad stängning bevarar sparade uppgifter och hela tidigare
  privata utkastet. Det uttryckliga tillägget ändrar endast Cykels privata
  beskrivning. Kartans sparade objekt och samband är oförändrade.
- Bekräftat tillägg återför fokus och visar samma återkoppling en gång på den
  aktiva ytan, utan ett extra sparkvitto.

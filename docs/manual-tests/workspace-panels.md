# Manuella testfall för fria paneler

Fallen omfattar läspaneler, kompletta objektförslag, samtal, panelplacering
och byte av skärmstorlek. Objekt redigeras i en modal, inte i flyttbara
formulär.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

Alex är administratör i ett separat provhushåll. Använd en konfigurerad
testidentitet och påhittade uppgifter.

## Allmän förberedelse

1. Förbered en
   [separat provdatabas](../development/devcontainer.md#disposable-local-database)
   och logga in. Skapa ett tomt hushåll för PANEL-01. I övriga fall behövs
   objekten Cykeln, Bilen och Garaget.
2. Spara hela utkastet. Börja varje fall med stängda paneler utan oskickad
   text. Behåll fliken mellan stegen.
3. För samtalet krävs en
   [konfigurerad assistent](setup/assistants.md). Använd text; mikrofon
   behöver inte startas.
4. Kör även med tangentbord och skärmläsare på fysisk telefon och dator.
   Anteckna hjälpmedel och plattformar separat från Chromium-emulering.

## Objekt och samtal

### PANEL-06: dra läspaneler över legenden och till skärmens kanter

**Syfte:** Flytta läspaneler fritt och behåll åtkomst till hela panelen.

**Användare:** Alex.

**Förutsättningar:** Använd ett datorfönster med plats för dragbara läspaneler.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-06: draggable reading panels can cover the legend and reach the
screen edges”.

**Steg:**

1. Skapa **Cykeln** med **Nytt objekt** och välj **Lägg i utkastet och
   stäng**. Öppna sedan **Uppgifter för Cykeln** i listan.
2. Dra läspanelens rubrik till skärmens övre vänstra hörn och över legenden.
3. Flytta läspanelen med piltangenter och flyttknappar till skärmens övriga
   kanter. Försök fortsätta utanför skärmen.

**Förväntat resultat:**

- Läspanelen kan täcka legenden och kartans övriga kontroller.
- Hela läspanelen stannar inom skärmen. Namnet finns kvar.
- Dragning, piltangenter och flyttknappar har samma gränser.

### PANEL-07: synliga samtalsytor stoppar dragning

**Syfte:** Skydda textvyn och röstrutan utan att begränsa övrig dragning.

**Användare:** Alex.

**Förutsättningar:** Ett datorfönster rymmer både läspaneler och textvy.
Samtalet är tillgängligt med mikrofonmedgivande.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-07: windows stop at visible conversation areas and retain
relocated positions”.

**Steg:**

1. Skapa **Cykeln**, lägg hela förslaget i utkastet och öppna
   **Uppgifter för Cykeln**.
2. Starta samtalet, slå på mikrofonen och stäng textvyn. Dra läspanelen mot
   röstrutan, längs dess kant och sedan runt den till skärmens högra kant.
3. Öppna textvyn när läspanelen står på dess plats. Dra därefter läspanelen
   mot textvyn och längs dess kant. Gör textvyn bredare med dess handtag.
4. Stäng textvyn och kontrollera läspanelens placering.
5. Öppna Navigation och upprepa förflyttningen mot röstrutan och textvyn.
   Använd även piltangenter och fönstrets flyttknappar.

**Förväntat resultat:**

- Synliga samtalsytor kan inte täckas av läspaneler eller Navigation.
- Fönstret stannar vid kanten och kan glida längs den. Röstrutan skyddar
  bara sin egen yta; det går att dra runt den.
- När en samtalsyta öppnas eller växer flyttas ett överlappande fönster
  kortast möjliga sträcka till en fri plats. Det hoppar inte tillbaka vid
  stängning. Objektets lästa uppgifter finns kvar.

### PANEL-08: växla mellan hela vyer när utrymmet inte räcker

**Syfte:** Behålla fönstrens bredd, text och röstsamtal vid platsbrist.

**Användare:** Alex.

**Förutsättningar:** Använd dator, en läspanel för Cykeln och Navigation.
Samtalet är tillgängligt med mikrofonmedgivande.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-08: limited space switches between full-width work and
text while voice continues”.

**Steg:**

1. Skapa **Cykeln**, lägg hela förslaget i utkastet och öppna dess
   **Uppgifter**. Öppna Navigation.
2. Starta samtalet i text, slå på mikrofonen och skriv ett meddelande utan
   att skicka det.
3. Minska datorfönstret tills läspanelerna och textvyn inte får plats bredvid
   varandra. Kontrollera att textvyn visas med meddelandet kvar.
4. Välj **Lista** och återöppna **Uppgifter för Cykeln**. Öppna
   **Skriv till Skyttel** igen och växla sedan till **Navigera**.
5. Öppna textvyn och förstora fönstret tills båda vyerna får plats.
   Kontrollera att textvyn behåller fokus.
6. Stäng Navigation, fokusera objektpanelens rubrik och minska fönstret igen.
   Kontrollera att läspanelen är kvar. Öppna textvyn och läs meddelandet.

**Förväntat resultat:**

- Vyerna växlar i stället för att göra läspanelerna eller textvyn smalare.
- Verktygsradens befintliga knappar visar den valda vyn. Navigation kan
  återöppnas direkt när den väntar bakom textvyn.
- Vid skärmbyte behålls den senast använda vyn och dess fokus. När utrymmet
  räcker visas båda igen utan att den andra vyn tar fokus.
- Oskickad samtalstext och läspanelens placering finns kvar. Mikrofonen förblir
  påslagen, och den synliga röstrutan skyddas även när textvyn väntar.

### PANEL-01: flera kompletta objektförslag och återanvända läspaneler

**Syfte:** Lägg separata objekt i samma utkast och återanvänd deras läspaneler.

**Användare:** Alex.

**Förutsättningar:** Provhushållets karta är tom.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-01: complete object dialogs stage separate proposals and
reading panels reuse each object”.

**Steg:**

1. Skapa **Cykeln**, **Bilen** och **Garaget** var för sig. I varje formulär,
   skriv namnet, välj krysset och sedan **Fortsätt redigera**. Namnet ska
   finnas kvar. Välj **Lägg i utkastet och stäng** innan nästa objekt skapas.
2. Spara hela utkastet. Öppna varje objekts **Uppgifter**, kontrollera
   rubrikfokus, välj **Redigera valt objekt** och skriv
   **Lagt i utkastet om [objektnamnet]** som beskrivning.
   Välj **Lägg i utkastet och stäng** för varje ändring.
3. Öppna **Skriv till Skyttel**. Kontrollera de tre läspanelerna och textvyn.
   Stäng Cykelns läspanel och öppna dess Uppgifter igen från listan två gånger.
   Kontrollera samma beskrivning, rubrikfokus och en enda panel för Cykeln.
4. Spara hela utkastet och ladda om. Läs alla tre beskrivningar igen.

**Förväntat resultat:**

- Förlustvarningens avbrytande behåller texten; endast bekräftat tillägg
  stänger objektformuläret och lägger hela förslaget i utkastet.
- Flera läspaneler och textvyn kan vara öppna samtidigt på dator.
  Uppgifter återanvänder objektets läspanel utan dubblering.
- Tre objekt och deras senare beskrivningar sparas i två hela sparanden.
  Beskrivningarna finns kvar efter omladdning. Inga återupptagningsingångar
  för stängda oskickade objektformulär skapas.

### PANEL-02: flytta paneler och fortsätt på mobil

**Syfte:** Bevara samtalstext, objekttext och datorplacering vid skärmbyte.

**Användare:** Alex.

**Förutsättningar:** Cykeln finns i kartan och samtalet är tillgängligt.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-02: mobile reading navigation retains conversation, staged object
details and desktop positions”.

**Steg:**

1. Skapa Cykeln med beskrivningen **Bevarad cykeltext**, lägg hela
   formuläret i utkastet och spara. Öppna dess **Uppgifter** på dator.
2. Fokusera **Flytta Cykeln** och flytta med piltangenter. Klicka på
   rubrikens flyttkontroll, välj **Vänster** och stäng flyttknapparna med
   Escape. Dra därefter rubriken. Anteckna placeringen. Minska datorfönstret
   och kontrollera att panelen ryms; återställ fönstret och kontrollera
   att panelen återfår placeringen.
3. Välj **Skriv till Skyttel** och **Godkänn och starta** i medgivanderutan.
   Skriv ett meddelande utan att skicka det.
4. Minska fönstret till telefonbredd. Textvyn fyller skärmen, och panelerna
   väntar bakom den. Stäng textvyn med **Skriv till Skyttel**. Öppna Lista och
   välj **Uppgifter för Cykeln**, och återgå sedan till Lista. Kontrollera att
   fokuserad rubrik eller kontroll syns utan att döljas av statusen. Vid
   återgång till listan ska **Uppgifter för Cykeln** ha fokus. Öppna Lista och
   välj Cykeln igen; kontrollera rubrikfokus. Öppna textvyn, kontrollera
   meddelandet och stäng den med **Stäng textvyn**. Cykeln ska få fokus igen.
   Öppna textvyn på nytt från verktygsraden.
5. Återgå till den ursprungliga datorbredden och välj Cykeln.

**Förväntat resultat:**

- Dragning, piltangenter och flyttknappar fungerar. Escape återför fokus
  från flyttknapparna till flyttkontrollen.
- Aktiv panel kommer framför övriga vid pekning eller fokus.
- Mobil visar en panel i taget. Lista och objektets Uppgifter återöppnar
  panelerna. Varken Öppna paneler eller Till kartan visas på mobil eller dator.
- Nya paneler får rubrikfokus; stängning ger fokus till nästa panels rubrik
  eller den använda listträffen. När sista panelen stängs går fokus till Lista i
  verktygsfältet.
- Återgång till listan återför fokus till den tidigare objektkontrollen.
  Fokus är synligt och åtkomligt även när samtalets status flyttas.
- Sparad objekttext och oskickad samtalstext finns kvar. Datorplaceringen återkommer.
- Kontroller och text kan nås utan horisontell sidrullning.

### PANEL-03: ett nyare förslag får inte skrivas över

**Syfte:** Bevara oskickad text när samma användares andra klient ändrar utkastet.

**Användare:** Alex i två flikar med samma inloggning.

**Förutsättningar:** Cykeln finns i den sparade kartan.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-03: an intervening proposal preserves local text and rejects
stale complete staging”.

**Steg:**

1. I flik A, öppna Cykelns Uppgifter och **Redigera valt objekt**. Skriv
   **Min oskickade text** som beskrivning utan att lägga den i utkastet.
2. I flik B, öppna samma objekt och lägg beskrivningen
   **Nyare förslag från samma användares andra klient** i utkastet.
3. I flik A, välj **Lägg i utkastet och stäng**. Läs avvisningen och
   kontrollera att namnet Cykeln och din oskickade beskrivning finns kvar.
4. Välj **Avbryt**, sedan **Kasta ändringarna och fortsätt**. Ladda om
   flik A, öppna Cykeln igen och börja redigera.

**Förväntat resultat:**

- Det äldre formuläret avvisas utan att skriva över det nyare förslaget.
  Alla lokala värden finns kvar tills förlusten uttryckligen bekräftas.
- Ny redigering bygger på det aktuella förslaget. Ingen ytterligare
  historikpost eller gemensam ändring skapas genom avvisning eller kastning.

### PANEL-04: kartval bevarar oskickade samband och typer

**Syfte:** Bevara formulärtext när ett samband markeras i kartan.

**Användare:** Alex.

**Förutsättningar:** Cykeln och Garaget finns med ett sparat samband.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-04: map selection preserves unsent relationship and type forms”.

**Steg:**

1. Slå på **Alla etiketter** i kartan. Öppna Lista och välj **Nytt samband**.
   Välj Cykeln som **Från objekt**.
2. Stäng panelerna med kryssen och markera det sparade sambandet i kartan. Öppna
   Lista igen och kontrollera ditt oskickade val. Välj **Stäng sambandet utan
   att skicka**.
3. Upprepa med **Ny objekttyp**: skriv **Oskickad typ** i **Typens namn**, stäng
   panelerna med kryssen, markera sambandet och öppna Lista. Kontrollera texten
   och välj **Stäng typformuläret utan att skicka**.
4. Upprepa med **Ny sambandstyp** och **Oskickad riktning** i
   **Sambandstypens namn**. Avsluta med **Stäng sambandstypen utan att skicka**.

**Förväntat resultat:**

- Markeringen ändrar inte eller kastar något oskickat formulär.
- Endast uttrycklig stängning av formuläret kastar den oskickade texten.
- Inget nytt förslag eller sparande uppstår av navigeringen.

### PANEL-05: väntande objekttillägg skyddar formuläret före ny sökning

**Syfte:** Håll formuläret kvar under tillägg och återgå till läsning före sökning.

**Användare:** Alex.

**Förutsättningar:** Cykeln och Bilen finns i utkastet. Använd ett separat
provhushåll och utvecklarverktygens nätverksbegränsning med hög fördröjning.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-05: pending object staging keeps the modal and returns to
reading before a new search”.

**Steg:**

1. Sök Cykeln i listan, öppna dess Uppgifter och välj **Redigera valt objekt**.
   Skriv **Skickad beskrivning** och välj **Lägg i utkastet och stäng**.
2. Medan svaret väntar, kontrollera att fälten och stängkontrollerna är
   spärrade. Tryck Escape och försök fokusera listans sökning bakom modalen.
3. Invänta svaret. Formuläret stängs och den använda redigeringsknappen
   får fokus. Öppna Lista, skriv **Bi** i sökfältet och fortsätt med **len**.
4. Stäng av nätverksbegränsningen och kontrollera utkastet.

**Förväntat resultat:**

- Det väntande formuläret behåller texten och spärrar vanlig stängning,
  redigering och bakgrundens sökning tills tillägget är bekräftat.
- Efter bekräftelsen kan sökningen bli **Bilen** med sökfältets fokus kvar.
  Den skickade beskrivningen finns i utkastet; inget sparas gemensamt.

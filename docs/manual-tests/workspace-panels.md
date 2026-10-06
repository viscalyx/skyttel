# Manuella testfall för objektarbete och samtal

Fallen omfattar vanliga objekt- och sambandsformulär, läsdialoger, samtal och
byte av skärmstorlek. Anteckna commit, webbläsare och godkänt eller underkänt
resultat vid körning. Fysiska hjälpmedelsprov antecknas separat från Chromium.

## Konfigurerade användare

Alex är administratör i ett separat provhushåll. Använd en konfigurerad
providentitet och påhittade uppgifter.

## Allmän förberedelse

1. Förbered en
   [separat provdatabas](../development/devcontainer.md#disposable-local-database)
   och logga in. Börja med ett tomt hushåll för PANEL-01. Övriga fall använder
   Cykeln, Bilen och Garaget enligt respektive steg.
2. Skapa objekt med **Nytt objekt** och **Lägg i utkastet och stäng**.
   Läs via **Tabell**, objektets namn och **Läs alla uppgifter**.
   Redigera med radens **Redigera**. Stäng läsdialogen med krysset.
3. Spara via **Skriv till Skyttel**, **Visa utkastet** och **Spara hela utkastet**.
   Vänta på **Utkastet är sparat**. Stäng sedan textvyn när vanliga formulär
   ska användas.
4. Samtalsfallen kräver en [konfigurerad assistent](setup/assistants.md).
   Öppna texten, välj uttryckligen **Nytt samtal** och ge medgivande.
   PANEL-08 kräver även mikrofonmedgivande och ett fungerande röstsamtal.
5. PANEL-03 och PANEL-05 använder kontrollerad leverans mot en separat
   provinstallation. Förbered samma verkliga HTTP-anrop som beskrivs i
   integrationstestet; vanlig nätverksväxling ger inte ett bestämt leveransutfall.

## Objekt och läsning

### PANEL-01: flera kompletta förslag och återanvänd läsning

**Syfte:** Hantera flera fullständiga objektförslag och läsa rätt uppgifter
utan att skapa flera objekt eller förlora samtalstext.

**Användare:** Alex.

**Förutsättningar:** Tomt hushåll, datorfönster med 1440 CSS-pixlars bredd.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-01: complete object dialogs stage separate proposals and
native readers reuse each object”.

**Steg:**

1. Öppna **Nytt objekt** för Cykeln, Bilen och Garaget i tur och ordning.
   Skriv namnet, välj krysset och **Fortsätt redigera**. Kontrollera namnet.
   Välj **Lägg i utkastet och stäng** och spara sedan hela utkastet.
2. Läs varje objekt via tabellen. Kontrollera rubrikfokus, stäng läsningen
   och välj radens **Redigera**. Skriv Lagt i utkastet om följt av namnet i
   **Beskrivning**. Lägg hela förslaget i utkastet och stäng.
3. Starta textsamtalet och skriv Bevarat meddelande utan att skicka.
   Stäng textvyn. Läs Cykeln två gånger med stängning mellan öppningarna.
   Kontrollera beskrivningen, rubrikfokus och en enda läsdialog.
4. Öppna texten igen. Kontrollera meddelandet. Spara hela utkastet och
   ladda om sidan. Läs samtliga tre objekt igen.

**Förväntat resultat:**

- Varje objekt har rätt fullständiga beskrivning efter omstart.
- Återöppning visar samma objekt med rubrikfokus i en enda dialog.
- Samtalstexten bevaras. Tre objekt finns sparade och utkastet är tomt.
- Ändringshistoriken innehåller de två uttryckliga sparandena.

### PANEL-02: läsning och samtal genom skärmbyte

**Syfte:** Bevara lästa och sparade objektuppgifter samt oskickad samtalstext
vid växling mellan dator och mobil.

**Användare:** Alex.

**Förutsättningar:** Cykeln sparad med beskrivningen Bevarad cykeltext.
Prova 390, 320 och 1440 CSS-pixlars bredd med 844 pixlars höjd.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-02: mobile reading navigation retains conversation and staged
object details across resizing”.

**Steg:**

1. Starta textsamtalet på dator. Skriv Oskickad samtalstext utan att skicka.
2. Byt till varje angiven bredd. Stäng textvyn och läs Cykeln via tabellen.
   Kontrollera rubrikfokus, beskrivningen och en enda läsdialog.
3. Stäng läsningen. Kontrollera fokus på **Läs alla uppgifter för Cykeln**.
   Öppna texten igen och läs det oskickade meddelandet.
4. Kontrollera att sidan ryms utan horisontell rullning och att hela
   hushållets sparade uppgifter och privata utkast är oförändrade.

**Förväntat resultat:**

- Lästa uppgifter och samtalstext finns kvar vid varje skärmbyte.
- Läsningens rubrik och tidigare öppningsknapp får logiskt fokus.
- Ingen läsning, navigering eller storleksändring skapar ett förslag.

### PANEL-03: ett nyare förslag får inte skrivas över

**Syfte:** Behålla oskickad text när samma användares andra klient ändrar
underlaget innan det fullständiga formuläret skickas.

**Användare:** Alex i två klienter med samma identitet.

**Förutsättningar:** Cykeln är sparad. Ha två autentiserade klienter.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-03: an intervening proposal preserves local text and rejects
stale complete staging”.

**Steg:**

1. Öppna **Redigera Cykeln** i första klienten och skriv Min oskickade text.
2. Lägg ett nyare förslag för samma objekt i den andra klientens utkast:
   beskrivningen Nyare förslag från samma användares andra klient.
3. Välj **Lägg i utkastet och stäng** i första klienten.
   Kontrollera avvisningen och att både namnet och Min oskickade text finns kvar.
4. Välj krysset och **Kasta ändringarna och fortsätt**. Ladda om och öppna
   Cykeln för vanlig redigering igen.

**Förväntat resultat:**

- Det nyare privata förslaget skrivs inte över och sparade fakta ändras inte.
- Det gamla formuläret behåller texten tills användaren uttryckligen kastar den.
- Ny öppning visar den andra klientens aktuella beskrivning.
- Endast det tidigare uttryckliga sparandet finns i ändringshistoriken.

### PANEL-04: kartval bevarar oskickade samband och typer

**Syfte:** Skydda sambandets oskickade värden och behålla typdefinitioner
vid vanliga kartval mellan inställningsbesök.

**Användare:** Alex.

**Förutsättningar:** Cykeln och Garaget är sparade med ett samband mellan dem.
Välj **Alla etiketter** i kartan.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-04: map selection preserves unsent relationship and type
forms”.

**Steg:**

1. Öppna **Tabell**, **Samband för Cykeln** och **Nytt samband**.
   Välj Garaget under **Från objekt**. Försök nå den bakomliggande tabellen
   med tangentbord. Den aktiva modalen behåller fokus.
2. Tryck Escape och välj **Fortsätt redigera**. Kontrollera Garaget.
   Välj **Stäng samband** och bekräfta **Kasta ändringarna och fortsätt**.
3. Öppna **Inställningar**, **Typer och egna fält** och **Ny objekttyp**.
   Skriv Oskickad typ. Välj **Tillbaka till kartan**, **Karta** och nå det
   sparade sambandet med tangentbord. Öppna typinställningarna igen.
4. Kontrollera Oskickad typ och välj **Stäng typformuläret utan att skicka**.
5. Upprepa med **Ny sambandstyp**, namnet Oskickad riktning och
   **Stäng sambandstypen utan att skicka**.

**Förväntat resultat:**

- Escape avbryter förlusten; den oskickade sambandsuppgiften finns kvar.
- Kartval ersätter inte de oskickade typnamnen.
- Inga objekt-, samband- eller typförslag skapas av dessa kontroller.
- Det ursprungliga sparade sambandet finns kvar.

### PANEL-05: väntande tillägg före ny sökning

**Syfte:** Skydda ett väntande fullständigt objekttillägg och återföra fokus
innan användaren söker efter ett annat objekt.

**Användare:** Alex.

**Förutsättningar:** Cykeln och Bilen har lagts i samma privata utkast.
Förbered en kontrollerad leverans som håller svaret efter faktisk hantering
av objektformulärets POST-anrop, enligt integrationstestet.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-05: pending object staging keeps the modal and returns to
reading before a new search”.

**Steg:**

1. Sök efter Cykeln i tabellen. Välj **Redigera Cykeln** och skriv
   Skickad beskrivning. Välj **Lägg i utkastet och stäng**.
2. Håll det verkliga svaret. Kontrollera att beskrivningsfältet och krysset
   är inaktiva. Tryck Escape och försök fokusera den bakomliggande sökningen.
3. Släpp samma svar. Kontrollera att formuläret stängs och
   **Redigera Cykeln** får fokus. Sök efter Bilen och fortsätt skriva i sökfältet.
4. Läs utkastet och kontrollera Cykelns Skickad beskrivning.

**Förväntat resultat:**

- Väntande svar tillåter inte ny redigering, stängning eller fokus bakom modalen.
- Bekräftat tillägg återför fokus och nästa sökning fungerar utan fokusstöld.
- Beskrivningen finns en gång i det privata förslaget. Inga objekt har sparats.

## Samtal och platsbrist

### PANEL-08: växla hela vyer utan att avsluta rösten

**Syfte:** Bevara oskickad samtalstext, objektläsning och aktiv mikrofon när
utrymmet kräver växling mellan text, tabell och karta.

**Användare:** Alex.

**Förutsättningar:** Cykeln har lagts i utkastet med Bevarad cykeltext.
Prova 1440 och 640 CSS-pixlars bredd med 1000 pixlars höjd. Rösten är tillgänglig.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-08: limited space switches between full-width work and text
while voice continues”.

**Steg:**

1. Starta textsamtalet, slå på mikrofonen och skriv Bevarat meddelande
   utan att skicka. Byt till 640 pixlars bredd.
2. Välj **Tabell**. Textvyn döljs. Läs Cykeln, kontrollera rubrikfokus
   och Bevarad cykeltext. Stäng läsningen och öppna texten igen.
3. Kontrollera meddelandet. Stäng texten, välj **Karta** och **Navigera**.
   Öppna texten igen och kontrollera att Navigation inte täcker textvyn.
4. Byt till 1440 pixlars bredd. Kontrollera att text och Navigation syns
   och att mikrofonen fortfarande är på med synlig röstruta.
5. Stäng Navigation och textvyn. Läs Cykeln igen, stäng och öppna texten.

**Förväntat resultat:**

- Samtalstexten bevaras genom samtliga växlingar och mikrofonen fortsätter.
- De fullständiga läsuppgifterna och alla privata förslag finns kvar.
- Ingen växling ändrar sparade objekt, samband eller det privata utkastet.

## Pensionerade fall

### PANEL-06: pensionerad placering av fria läspaneler

Den fria objektläsningens dragning och flyttknappar togs bort. ID:t återanvänds
inte. Vanlig läsning, fokus och fullständiga uppgifter prövas i PANEL-01–05.

### PANEL-07: pensionerad kollision för fria läspaneler

Fria objektfönsters placering kring text och röst togs bort. ID:t återanvänds
inte. Växling och samtalskontinuitet prövas i PANEL-08; Navigation behåller sina
egna kontroll- och kamerafall i [map-camera.md](map-camera.md).

# Manuella testfall för ditt utkast

Testfallen gäller återupptagning, granskning, sparande, kastande och
konflikthantering av ditt utkast. Förberedelser och testdata anges nedan.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

Logga in med den administratör som anges av
`SKYTTEL_FIRST_ADMIN_PROVIDER` och `SKYTTEL_FIRST_ADMIN_SUBJECT`.
Det ursprungliga visningsnamnet är **Development administrator**.
Inloggningen sker genom den konfigurerade identitetsleverantören.

Robin Demo är en påhittad tidigare hushållsmedlem som anges som författare
i ändringshistoriken. Posten saknar kopplad inloggning, session och aktuellt
medlemskap. Den ger ingen extra inloggning för manuell testning.

UTKAST-03–11 använder dessutom en separat testidentitet med rollen medlem.
Bjud in identiteten enligt [tillgång till hushållet](../user-guide/access.md).
Använd skilda webbläsarprofiler för administratören och medlemmen.

## Allmän förberedelse

Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor) när
fallen anger formulär, samtal, profil eller administration.

När ett befintligt objekt eller samband ska ändras, välj det först i
kartan eller listan och öppna dess detaljpanel. För objekt i listan använder
du **Uppgifter**; i kartverktygen väljer du **Visa detaljer**. Välj sedan
**Redigera valt objekt** eller **Redigera valt samband** för att öppna
formuläret. Att bara välja objektet eller sambandet öppnar inte formuläret.

För UTKAST-01 används demodata:

1. Förbered en separat utvecklingsdatabas enligt
   [demodata och återställning](../development/devcontainer.md#reset-demo-data).
   Återställning tar bort befintliga utvecklingsdata och sessioner.
2. Kör `npm run db:setup` för att skapa aktuellt utgångsläge.
3. Starta applikationen med `npm run dev:all`.
4. Öppna [utvecklingsklienten](http://localhost:5173) och logga in som den
   konfigurerade administratören.
5. Kontrollera att hushållet **TestHousehold** visas.

Återställ demodata före varje ny körning av testfallet. Under testets
omstart ska samma databas behållas; kör då inte `npm run db:setup`.

För UTKAST-02–11 används en separat, tom testinstallation enligt
[installationsguiden](../operations/installation.md), utan demodata:

1. Logga in som den konfigurerade administratören och skapa ett hushåll.
2. Skapa personen **Lo Exempel** och tjänsten **Molnmusik** med
   **Nytt objekt**, **Objektets namn**, **Objekttyp** och
   **Lägg i mitt utkast**. Välj **Spara hela utkastet**.
3. Ge medlemmen tillgång för fallen som kräver två användare. Kontrollera
   att båda ser objekten och har **Inga förslag** i sina egna utkast.
4. Använd ett nytt tomt testhushåll inför varje fall. Behåll databasen vid
   omladdning och omstart inom fallet.

UTKAST-12–14 använder ett nytt tomt hushåll utan de två förberedda
objekten. UTKAST-14 behöver även en inbjuden medlem i en separat
webbläsarprofil och konfigurerat tal och text enligt
[samtalsfallen](voice-assistant.md). Externa prov kräver den privata
konfiguration och de medgivanden som anges där.

## Privata utkast

### UTKAST-36: spara hela utkastet direkt utan samtal

**Syfte:** Bekräfta ett enda atomiskt sparande från utkastets sparikon.

**Användare:** Den syntetiska administratören Alex Exempel.

**Förutsättningar:** Kör `npm run build` och
`node --import tsx scripts/manual-draft-save.ts` på en dator med grafisk
webbläsare. Den öppnar en separat installation med riktig SQLite, inloggad
administratör och förslaget Alex blå cykel. Ingen AI-leverantör är konfigurerad.
Terminalens kommandon styr bara leveransen av riktiga HTTP-svar. Skriv
`new-draft` inför varje nytt fall och `quit` efter provningen.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
testfallet “UTKAST-36: draft save opens immediately and confirms one
persistent save without AI”.

**Steg:**

1. Skriv `hold` i terminalen. Öppna **Utkast** och välj **Spara hela utkastet**.
2. Läs sparmodalen och prova dess tangentbordsfokus. Skriv `result` i terminalen.
3. Skriv `release`. Läs bekräftelsen, vänta tre sekunder och läs tomt utkast.
4. Skriv `result` igen och jämför förslagen, sparförsöket och historiken.

**Förväntat resultat:**

- Modalen öppnas genast med fokus på rubriken **Spara utkastet** och texten
  **Sparar utkastet…**. Bara krysset och Escape stänger den. Förslaget ligger
  kvar medan kvittot saknas.
- Bekräftat sparande tömmer utkastet, stänger modalen och återger fokus till
  utkastets rubrik när sparikonen är inaktiv.
- **Utkastet är sparat** visas i tre sekunder utan **Visa ändringarna**.
  En enda artig statusregion behåller beskedet när den visuella toasten försvinner.
  Faktisk uppläsning kontrolleras separat med mänsklig skärmläsarprovning.
- Exakt ett genomfört sparförsök och ett motsvarande historikkvitto finns.
  Inget samtal startas och inget medgivande efterfrågas.

### UTKAST-37: stäng ett väntande mobilt sparande och fortsätt annat arbete

**Syfte:** Behålla uppföljning och korrekt fokus mellan karta och tabell.

**Användare:** Alex Exempel i provinstallationen för UTKAST-36.

**Förutsättningar:** Välj `new-draft` och `hold`. Använd mobil visning.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
testfallen “UTKAST-37: closing a pending mobile save preserves its follow-up
across map and table without stealing later focus at 390px” och samma titel
med “320px” samt “UTKAST-37: a closed pending save restores the table
heading when its focused follow-up disappears”.

**Steg:**

1. Öppna utkastet och spara. Prova Tab och Skift+Tab och stäng med Escape.
2. Stäng textvyn. Öppna **Visa sparandet** i kartan och stäng med krysset.
3. Öppna **Tabell**, välj **Visa sparandet** och stäng med Escape.
4. Flytta fokus till **Sök objekt i tabellen** och skriv `release` i terminalen.
5. Skriv `result` och kontrollera det avslutade försöket.
6. Upprepa utan att flytta fokus från **Visa sparandet** före `release`.

**Förväntat resultat:**

- Tangentbordet cirkulerar mellan modalens tillgängliga kontroller och
  lämnar inte den öppna modalen. Text och kontroller ryms i smal mobil visning.
- Stängning avbryter inte sparandet. Uppföljningen är nåbar i båda vyerna;
  efter stängning återgår fokus till **Visa sparandet**.
- Senare bekräftelse behåller fokus i tabellens sökfält. Toasten tar inte fokus.
  Utkastet förbrukas med exakt ett sparande och en historikpost.
  När uppföljningsknappen fortfarande äger fokus och försvinner efter
  bekräftelsen återgår fokus till tabellens rubrik.

### UTKAST-38: kontrollera samma försök efter ett tappat sparbesked

**Syfte:** Skilja okänt utfall från bekräftad framgång utan att spara två gånger.

**Användare:** Alex Exempel i provinstallationen för UTKAST-36.

**Förutsättningar:** Välj `new-draft` och `lost-response` i terminalen.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
testfallet “UTKAST-38: a lost save response keeps proposals until the same
durable attempt is checked from the table” och testfallen “UTKAST-38: Map
receipt recovery restores visible draft context after its follow-up disappears
at 1280px” och “UTKAST-38: Map receipt recovery restores visible draft context
after its follow-up disappears at 390px”.

**Steg:**

1. Spara från Utkast och läs **Sparandet kunde inte bekräftas.** Stäng med Escape.
2. Kontrollera att förslaget ligger kvar i klienten och att nytt sparande
   och kastande är spärrade. Skriv `result` för att läsa serverns verkliga utfall.
3. Stäng textvyn, öppna Tabell och välj **Visa sparandet**.
4. Välj **Kontrollera sparandet igen** och läs bekräftelsen.
5. Skriv `result` igen och jämför försöks-ID och historik.
6. Upprepa från `new-draft` med `lost-response` på dator och mobil.
   Efter det okända utfallet stänger du både sparmodalen och textvyn.
   Välj **Visa sparandet** från Karta och **Kontrollera sparandet igen**.

**Förväntat resultat:**

- Okänt utfall behåller förslagen och gör inget påstående om framgång.
  Kastande verifieras även tillsammans med dess fullständiga flöde.
- Kontrollen visar **Kontrollerar sparandet…**. Fokus flyttas till
  krysset medan kontrollknappen saknas, och till tabellens rubrik när
  bekräftelsen tar bort uppföljningsknappen.
- Samma beständiga försöks-ID återfinns. Bara ett sparanrop, ett genomfört
  försök och en historikpost behövs. Ingen AI eller samtalsstart krävs.
- När kontrollen från Karta bekräftas och uppföljningsknappen försvinner
  öppnas det tomma Utkastet igen med fokus på dess synliga rubrik.
  Detta återfokus gäller när modalen fortfarande äger fokus; tidigare
  flyttat fokus till annat arbete ska bevaras.

### UTKAST-39: återuppta ett registrerat sparförsök efter omladdning

**Syfte:** Nå resultatet utan utkastikon och avsluta en inaktuell oklar uppföljning.

**Användare:** Alex Exempel i provinstallationen för UTKAST-36.

**Förutsättningar:** Terminalkommandot `pending-attempt` registrerar ett
verkligt väntande försök genom offentlig HTTP och laddar om sidan. Automatisk
nätkontroll blockeras tills du väljer `network-ok`.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
testfallen “UTKAST-39: a durable save attempt remains reachable after reload
without a draft icon or conversation and reports a confirmed rejection” och
“UTKAST-39: recovery after reload completes the existing attempt and retires
its unknown follow-up without AI”.

**Steg:**

1. Välj `new-empty` och `pending-attempt`. Ladda om sidan igen.
2. Kontrollera att Utkast-ikonen saknas men **Visa sparandet** finns.
   Öppna den och välj **Kontrollera sparandet igen**.
3. Läs det avvisade utfallet. Stäng med Escape, ladda om sidan och öppna
   uppföljningen igen. Skriv `result` i terminalen.
4. Välj `new-draft` och `pending-attempt`. Ladda om och kontrollera uppföljningen.
5. Välj `network-ok` och ladda om sidan för att börja om kontrollen efter
   det tidigare nätfelet. Invänta automatisk kontroll och skriv `result` igen.

**Förväntat resultat:**

- Uppföljningen överlever omladdning utan samtal, medgivande eller AI.
- Ett tomt utkast avvisas med **Utkastet kunde inte sparas.** Modalens enda
  knapp är krysset. Avvisningen förblir läsbar efter stängning och återöppning;
  inget gemensamt innehåll eller historikkvitto skapas.
- Ett verkligt förslag sparas av samma väntande försök. Uppföljningen med
  gammalt okänt utfall och Utkast-ikonen försvinner efter bekräftelsen.
  Exakt ett genomfört försök och ett motsvarande historikkvitto finns.

### UTKAST-40: skilj avvisning från hämtningsfel efter ett bekräftat kvitto

**Syfte:** Bevara både bekräftad framgång och osparade förslag vid rätt sorts fel.

**Användare:** Alex Exempel i provinstallationen för UTKAST-36.

**Förutsättningar:** Välj `new-draft` inför varje del. För versionskonflikten
behövs en andra flik med samma inloggning och hushåll.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
testfallen “UTKAST-40: a verified receipt closes the save dialog despite a
failed map refresh and never repeats its announcement” och “UTKAST-40: a
rejected stale version retains every proposal until fresh reading and creates
no saved history”.

**Steg:**

1. Välj `refresh-failure` och spara från Utkast. Läs tomt utkast och bekräftelsen.
2. Stäng textvyn och läs kartans hämtningsfel. Vänta tills toasten försvinner.
3. Välj `network-ok` och **Hämta aktuellt underlag**. Skriv `result`.
4. Välj `new-draft` och öppna Utkast i första fliken. I andra fliken ändrar
   du cykelns namn till **Alex nya cykelnamn** och lägger ändringen i utkastet.
   Återvänd till första fliken och spara dess äldre version utan omladdning.
5. Läs avvisningen och stäng. Kontrollera spärrat sparande. Stäng textvyn,
   välj **Hämta aktuellt underlag**, öppna Utkast och läs det nya namnet.

**Förväntat resultat:**

- Ett bekräftat kvitto stänger modalen och tömmer det sparade utkastet även
  om kartan inte kan hämtas. Felet förblir nåbart. Senare hämtning varken
  startar ett nytt sparförsök eller spelar upp det gamla beskedet igen.
- En äldre utkastversion avvisas tydligt; modalens enda knapp är krysset.
  Alla aktuella privata förslag finns kvar och ingen historikpost skapas.
  Efter hämtning läses det nya namnet och sparikonen blir tillgänglig igen.

### UTKAST-41: ta bort ett oberoende förslag och behåll resten

**Syfte:** Ta bort ett förslag direkt med begripligt besked och användbart fokus.

**Användare:** Alex Exempel.

**Förutsättningar:** Förbered den isolerade utkastinstallationen enligt
UTKAST-90. Starta om provkommandot mellan fallen.

**Integrationstest:**
[draft-removal.spec.ts](../../tests/integration/draft-removal.spec.ts),
testfallet “UTKAST-41: independent removal preserves other proposals and
history and focuses the next control”.

**Steg:**

1. Öppna **Utkast**. Läs objekten, sambanden och typförslagen.
2. Fokusera papperskorgen **Ta bort förslaget: Olöst fordon** och tryck Enter.
3. Kontrollera kvarvarande förslag, fokus och statusbesked. Öppna Rapporter
   och kontrollera att det inte finns något nytt gemensamt sparande.

**Förväntat resultat:**

- Förslaget Olöst fordon försvinner direkt, utan läs- eller
  bekräftelsedialog. Övriga förslag behåller sina fullständiga värden.
- Fokus går till nästa rads motsvarande papperskorg.
- Förslaget är borttaget anges utan fokusflytt från statusbeskedet.
  Beskedet kan läsas även när textvyn täcker kartan.
- Den gemensamma kartan och ändringshistoriken är oförändrade.

### UTKAST-42: bekräfta eller avbryt borttagning med beroende samband

**Syfte:** Förstå vilka nya samband som försvinner med ett nytt objekt.

**Användare:** Alex Exempel.

**Förutsättningar:** Förbered installationen enligt UTKAST-90. Prova dator
och smal skärm med tangentbord och pekning. Starta om mellan fallen.

**Integrationstest:**
[draft-removal.spec.ts](../../tests/integration/draft-removal.spec.ts),
testfallen “UTKAST-42: dependent object removal shows its actual edge
proposals and cancellation changes nothing at 1280px” och
“UTKAST-42: dependent object removal shows its actual edge proposals and
cancellation changes nothing at 320px”.

**Steg:**

1. Öppna **Utkast** och välj papperskorgen för **Ospecificerat fordon**.
2. Läs bekräftelsens lista. Den omfattar objektet och dess tre nya samband.
   Kontrollera att Olöst fordon inte finns i listan.
3. Avbryt med Escape. Kontrollera ursprungligt utkast och fokus.
4. Öppna samma bekräftelse igen och välj **Ta bort**.
5. Läs kvarvarande förslag, kontrollera fokus och status samt historiken.

**Förväntat resultat:**

- Dialogen börjar på Avbryt. Bakgrunden är inaktiv; dialogens lista
  beskriver verkliga beroenden. Avbrott ändrar ingenting och återför
  fokus till objektets papperskorg.
- Bekräftelse tar bort det nya objektet och just de tre beroende
  sambandsförslagen. Namnändringen på cykeln, Olöst fordon, det oberoende
  sambandet med okänt mål och båda typförslagen bevaras.
- Fokus går till papperskorgen för Olöst fordon. Förslagen är borttagna
  anges utan att statusbeskedet flyttar fokus.
- Den gemensamma kartan och ändringshistoriken är oförändrade.

### UTKAST-43: ta bort typförslag och behåll berörda förslag med feltext

**Syfte:** Skilja borttagna typförslag från beroende förslag som blir kvar.

**Användare:** Alex Exempel.

**Förutsättningar:** Installation enligt UTKAST-90. Skapa under
Inställningar en ny objekttyp **Tillfällig typ** och lägg ett nytt
**Tillfälligt föremål** med den typen i utkastet. Upprepa i en ny
installation med en ny sambandstyp **Tillfällig typ**, framåtnamnet
**granskar** och ett nytt samband från cykeln med **Okänt** mål.
Spara inte dessa nya uppgifter i den gemensamma kartan.

**Integrationstest:**
[draft-removal.spec.ts](../../tests/integration/draft-removal.spec.ts),
testfallen “UTKAST-43: removing a new objectType preserves dependent
proposals with a truthful type warning” och “UTKAST-43: removing a new
relationshipType preserves dependent proposals with a truthful type warning”.

**Steg:**

1. Öppna **Utkast** och välj typförslagets papperskorg.
2. Läs det som tas bort och **Förslag som blir kvar men påverkas**.
   Kontrollera att det beroende objektet eller sambandet står i den
   senare gruppen med förklaring om den saknade typen.
3. Välj **Avbryt** och kontrollera att alla förslag är oförändrade.
4. Öppna bekräftelsen igen och välj **Ta bort**. Läs den kvarvarande
   berörda radens varningssymbol och feltext. Kontrollera historiken.

**Förväntat resultat:**

- Fokus börjar på Avbryt. Typförslaget tas bort endast efter bekräftelse.
- Det beroende förslaget blir kvar med sina värden och med saknad typ
  tydligt angiven före och efter åtgärden. Sambandets Okänt är giltigt;
  varningen gäller den saknade typen.
- Avbrott ändrar ingenting. Den gemensamma kartan och historiken är
  oförändrade även efter bekräftelse.

### UTKAST-44: bekräfta eller avbryt att hela utkastet kastas

**Syfte:** Kasta alla förslag utan att förlora samtalsmeddelande eller historik.

**Användare:** Alex Exempel.

**Förutsättningar:** Installation enligt UTKAST-90. Prova dator och
smal skärm med tangentbord och pekning. Starta om mellan fallen.

**Integrationstest:**
[draft-removal.spec.ts](../../tests/integration/draft-removal.spec.ts),
testfallen “UTKAST-44: whole draft discard requires confirmation and
preserves unsent conversation and shared history at 1280px” och
“UTKAST-44: whole draft discard requires confirmation and preserves unsent
conversation and shared history at 320px”.

**Steg:**

1. Öppna **Utkast** och skriv ett meddelande till Skyttel utan att skicka.
2. Välj rubrikens **Kasta hela utkastet**. Läs alla förslag som tas bort.
3. Välj **Avbryt**. Kontrollera oförändrat utkast och återfokus.
4. Öppna bekräftelsen igen och välj **Ta bort hela utkastet**.
5. Läs tomt utkast och status, kontrollera fokus, oskickat meddelande
   och historik. Prova även SÖK-04 för båda vyernas aktiva utkastfilter.

**Förväntat resultat:**

- Dialogen börjar på Avbryt och redovisar alla slags förslag.
  Avbrott ändrar ingenting och återför fokus till öppningsknappen.
- Bekräftelse tömmer hela utkastet och tar bort verktygsfältets Utkast-ikon.
  Fokus går till den synliga rubriken Utkast. Textvyn och meddelandet behålls.
- Den gemensamma kartan, typdefinitionerna och historiken är oförändrade.
  Statusbeskedet flyttar inte fokus eller kastar samtalsuppgifter.

### UTKAST-45: granska verkliga beroenden igen när utkastet har ändrats

**Syfte:** Ett gammalt borttagningsförsök får inte kasta nyare förslag.

**Användare:** Alex Exempel.

**Förutsättningar:** Kör `npm run build` och
`npx tsx scripts/manual-draft-removal.ts`. Kommandot öppnar en separat
webbläsare och en isolerad installation med syntetiska uppgifter.
Terminalens `new-base` skapar ett nytt provhushåll; `quit` städar installationen.

**Integrationstest:**
[draft-removal.spec.ts](../../tests/integration/draft-removal.spec.ts),
testfallet “UTKAST-45: a stale discard confirmation preserves newer proposals
and refreshes its actual plan”.

**Steg:**

1. Öppna **Utkast** och papperskorgen för **Ospecificerat fordon**.
2. Skriv `newer-type` i provterminalen medan bekräftelsen är öppen.
3. Välj **Ta bort** och läs felbeskedet. Kontrollera med terminalens
   `result` att förslagen är kvar, inklusive **Nyare oberoende typ**.
4. Välj **Hämta aktuellt utkast**. Läs de fyra förslag som nu omfattas
   av borttagningen; det nya typförslaget ingår inte.
   Kontrollera fokus på **Avbryt** och att Tab och Skift+Tab stannar i dialogen.
5. Välj **Ta bort**. Kontrollera att typförslaget är kvar och den
   gemensamma kartan inte har ändrats.

**Förväntat resultat:**

- Gammal bekräftelse avvisas utan att något förslag ändras.
  Ett nytt försök spärras tills aktuellt utkast har hämtats och granskats.
- Den nya planen redovisar verkliga beroenden. Bekräftelsen tar bort
  endast det nya objektet och dess tre beroende samband.
- Nyare oberoende typ och gemensamt sparade objekt finns kvar.

### UTKAST-46: återfokus när sista raden eller utkastikonen försvinner

**Syfte:** Behålla användbart fokus efter borttagning utan att stjäla senare fokus.

**Användare:** Alex Exempel.

**Förutsättningar:** Provkommandot enligt UTKAST-45. Använd `new-focus`
för två oberoende förslag och `new-base` för ett fullt utkast.

**Integrationstest:**
[draft-removal.spec.ts](../../tests/integration/draft-removal.spec.ts),
testfallen “UTKAST-46: removal of the final rows focuses the previous control
and then the draft heading”, “UTKAST-46: delayed removal restores a disappearing
draft tool and preserves later focus (draft tool)” och “UTKAST-46: delayed removal
restores a disappearing draft tool and preserves later focus (later control)”.

**Steg:**

1. Välj `new-focus`, öppna **Utkast** och ta bort den sista raden.
   Kontrollera fokus på cykelradens papperskorg. Ta bort även cykelns förslag.
2. Kontrollera fokus på rubriken **Utkast**, tomt utkast och försvunnen utkastikon.
3. Välj `new-base` och sedan `hold` i terminalen. Öppna Utkast och
   bekräfta **Ta bort hela utkastet**. Invänta terminalens besked om hållet svar.
4. Välj **Avbryt**, stäng textvyn och fokusera verktygsfältets **Utkast**
   med tangentbord. Skriv `release` i terminalen.
5. Upprepa från `new-base`, men flytta fokus vidare till **Tabell**
   före `release`.

**Förväntat resultat:**

- Försvunnen sista rad ger föregående papperskorg, sedan Utkast-rubriken.
- Försvunnen fokuserad utkastikon ger **Skriv till Skyttel**.
  Fokus som redan flyttats till Tabell finns kvar där.
- Begripliga statusbesked flyttar inte fokus. Sparade uppgifter påverkas inte.

### UTKAST-47: behåll värden efter kastat typförslag och visa typkonflikten

**Syfte:** En borttagen typändring får inte tyst ta bort beroende egna värden.

**Användare:** Alex Exempel.

**Förutsättningar:** Provkommandot enligt UTKAST-45. Välj först
`new-object-meaning`; upprepa sedan med `new-relationship-meaning`.

**Integrationstest:**
[draft-removal.spec.ts](../../tests/integration/draft-removal.spec.ts),
testfallen “UTKAST-47: discarding an edited objectType retains incompatible
values and displays the remaining type conflict” och “UTKAST-47: discarding
an edited relationshipType retains incompatible values and displays the
remaining type conflict”.

**Steg:**

1. Öppna **Utkast** och papperskorgen för typförslaget **Utkastfordon**
   respektive **Granskar**.
2. Läs **Förslag som blir kvar men påverkas**. Läs förklaringen om
   typens uppgifter och förslagets underlag.
3. Välj **Ta bort** och läs cykelns respektive det oberoende sambandets rad.
4. Läs hela förslaget och kontrollera **Ny uppgift** med värdet
   **Behåll hela mitt värde**. Kontrollera `result` och historiken.

**Förväntat resultat:**

- Typförslaget tas bort; objektets eller sambandets hela förslag finns kvar.
- Den beroende raden har varningssymbol och text om typkonflikten.
  Okänt mål räknas inte i sig som ett fel.
- Egna värden bevaras. Gemensamma objekt, samband, typer och historik är oförändrade.

### UTKAST-48: kontrollera en genomförd borttagning efter tappat svar

**Syfte:** Ett förlorat svar får inte beskrivas som säker avvisning
eller ge dubbel borttagning.

**Användare:** Alex Exempel; offentlig HTTP kontrolleras även utan inloggning.

**Förutsättningar:** Provkommandot enligt UTKAST-45. Välj `new-base`
och därefter `lost-response`. Automatiska prov kontrollerar dessutom
obehöriga anrop, gammal version och en bekräftelselista som inte motsvarar
serverns faktiska plan genom den offentliga HTTP-gränsen.

**Integrationstest:**
[draft-removal.spec.ts](../../tests/integration/draft-removal.spec.ts),
testfallen “UTKAST-48: authoritative discard rejects forged or unauthorized
requests and recovers an applied removal after a lost reply” och
“UTKAST-48: lost independent removal checks actual draft before offering
another removal”.
Även “UTKAST-48: a delayed independent removal failure preserves later
composer focus and exposes persistent recovery”.

**Steg:**

1. Öppna **Utkast** och bekräfta **Ta bort hela utkastet**.
2. Läs beskedet att borttagningen inte kunde bekräftas och kontrollera
   att en ny bekräftelse är spärrad. `result` visar att själva borttagningen skett.
3. Välj **Hämta aktuellt utkast**. Kontrollera tomt utkast och fokus på rubriken.
4. Kontrollera att sparade objekt, samband och historik är oförändrade.
5. Upprepa med `new-base` och `lost-response`, men välj i stället
   papperskorgen för **Olöst fordon**. Hämta aktuellt utkast efter felbeskedet.
6. Välj `new-base` och `hold`. Ta bort **Olöst fordon**, invänta terminalens
   besked om hållet svar och skriv sedan ett oskickat samtalsmeddelande.
   Välj `lost-response` och `release` i terminalen.
7. Kontrollera att meddelandefältets fokus och text finns kvar. Välj
   **Kontrollera borttagningen**, avbryt med Escape och kontrollera återfokus.
   Öppna kontrollen igen och välj **Hämta aktuellt utkast**.

**Förväntat resultat:**

- Tappat svar anges som obekräftat. Kontroll av aktuellt utkast visar
  det verkliga utfallet utan att skicka borttagningen igen.
- Tomt utkast visas med användbart fokus. Inget nytt gemensamt sparande sker.
- Det oberoende borttagna förslaget visas som borttaget efter kontroll;
  övriga fullständiga förslag behålls. Samma borttagning skickas inte igen.
- Ett fördröjt fel öppnar ingen dialog över senare arbete. Kontrollknappen
  och felbeskedet finns kvar utan tidsgräns, även efter stängd kontroll.
  Meddelandet bevaras. Escape återför fokus till kontrollknappen.
- HTTP-proven avvisar obehöriga eller inaktuella anrop och en felaktig
  bekräftelselista utan att förändra utkastet.

### UTKAST-90: läs hela utkastet utan AI eller medgivande

**Syfte:** Granska alla förslag, även dolda fält, utan att starta samtal.

**Användare:** Alex Exempel i den separata provinstallationen nedan.

**Förutsättningar:** Kör `npm run build` och sedan
`node --import tsx scripts/manual-draft-review.ts` i en terminal.
Öppna den utskrivna adressen och logga in med den syntetiska
Google-identiteten Alex Exempel. Ingen extern leverantör används.
Skriv `quit` i terminalen efter provningen för att ta bort installationen.

**Integrationstest:**
[draft-review.spec.ts](../../tests/integration/draft-review.spec.ts),
testfallen “UTKAST-90: desktop complete draft review works without AI or
consent” och “UTKAST-90: mobile complete draft review works without AI or
consent”.

**Steg:**

1. Öppna **Utkast** i verktygsfältet på dator och mobil.
2. Läs tabellens Symbol, Namn, Typ och Vad som ändras.
3. Öppna **Alex blå cykel** med tangentbord. Läs sparade och föreslagna
   värden, hela beskrivningen, Ramnummer och ekonomiska uppgifter.
4. Prova Tab, Skift+Tab, krysset och Escape. Öppna därefter ett samband,
   **Utkastfordon** och **Granskar**. Läs deras dolda egna fält och riktning.
5. Kontrollera fel vid **Olöst fordon** och det olösta sambandet. Läs även
   Okänt, Uttryckligen inget, Osäkert uppgivet och Ospecificerat objekt.

**Förväntat resultat:**

- Utkastet öppnas utan samtal eller medgivandedialog trots att AI saknas.
- Alla fyra förslagsslag kan läsas fullständigt utan redigeringsfält eller
  konfliktval. Förslagen och den sparade kartan ändras inte av läsning.
- Läsdialogen börjar på rubriken. Tab stannar i dialogen; bakomliggande
  innehåll är inaktivt. Krysset är dess enda synliga stängkontroll.
  Escape och krysset återför fokus till radens öppningsknapp.
- Verklig olöst identitet eller obesvarad fråga har feltext och symbol.
  Giltiga okända, osäkra och ospecificerade uppgifter får ingen felvarning.

### UTKAST-91: nå tomt utkast och bevara meddelandet före första skickandet

**Syfte:** Skilja öppning och utkastgranskning från faktisk samtalsanvändning.

**Användare:** Alex Exempel i provinstallationen för UTKAST-90.

**Förutsättningar:** Starta en ny provinstallation med tillägget
`--with-model --empty`. Den använder en kontrollerad, syntetisk leverantör
och börjar med ett tomt utkast.

**Integrationstest:**
[draft-review.spec.ts](../../tests/integration/draft-review.spec.ts),
testfallet “UTKAST-91: empty and type-only drafts preserve unsent text and
first send asks consent once”.

**Steg:**

1. Öppna **Skriv till Skyttel** och **Visa utkastet**. Läs tomt utkast.
2. Skriv **Behåll å, ä och ö i mitt meddelande**, stäng textvyn,
   besök Tabell och öppna textvyn igen.
3. Välj **Skicka**, godkänn medgivandet och invänta **Ett provsvar.**
4. Lägg en ny objekttyp i utkastet via Inställningar → Typer och egna
   fält. Återgå till hushållsarbetet och öppna **Utkast**.

**Förväntat resultat:**

- Tomt utkast är åtkomligt även när verktygsfältets Utkast-ikon saknas.
  Öppning startar inget samtal och begär inget medgivande.
- Oskickad text finns kvar efter stängning och vybyte. Första Skicka
  kräver medgivande, skickar exakt meddelandet en gång och tömmer fältet
  efter bekräftat mottagande.
- Ett förslag som endast gäller en typ visar den avskilda Utkast-ikonen.
  Den öppnar hela utkastet direkt även utan synliga kartförslag.

### UTKAST-27: läs faktisk giltighet, profilbilder och typens egenskapsnamn

**Syfte:** Skilja slutdatum från uttrycklig status och läsa hela bildförslaget
samt dolda gemensamma egenskaper med deras egna namn.

**Användare:** Alex Exempel i provinstallationen för UTKAST-90.

**Förutsättningar:** Kör `npm run build` och
`node --import tsx scripts/manual-draft-review.ts --meanings`.
Logga in med den syntetiska Google-identiteten. Installationens sparade
cykel och samband har slutdatum 2000-01-01. Förslagen anger uttryckligen
att de fortfarande gäller. Cykeln har olika sparad och föreslagen profilbild.
Skriv `quit` i terminalen efter provningen.

**Integrationstest:**
[draft-review.spec.ts](../../tests/integration/draft-review.spec.ts),
testfallen “UTKAST-27: desktop draft reading preserves lifecycle, images and
configured field meanings” och “UTKAST-27: mobile draft reading preserves
lifecycle, images and configured field meanings”.

**Steg:**

1. Öppna **Utkast** och **Blå cykel** på dator och mobil.
2. Läs **Gäller**, **Status** och **Sista giltighetsdag** på båda sidorna.
3. Jämför de två profilbilderna. Läs **Fordonets berättelse** och
   **Cykelns berättelse**, samt **Avtalat pris** även fast pris saknas.
4. Stäng dialogen och läs sambandet **Blå cykel → granskar → Röd cykel**.
   Jämför dess giltighet, status och slutdatum.

**Förväntat resultat:**

- Sparade objektet och sambandet visar Upphört och Följ slutdatum.
  Förslagen visar Aktuellt och Gäller fortfarande trots samma gamla slutdatum.
  Giltighet och status är markerade som ändrade.
- Båda verkliga profilbilderna visas och bildändringen markeras även när
  båda sidorna har en bild. Bilderna skiljer sig i färg.
- Beskrivningen har respektive typs eget namn och markerad ändring.
  Föreslagen beskrivning och båda prisvärdena visar Ej uppgivet.
  Oförändrat saknat pris markeras inte som ändrat. Dolda egenskaper kan läsas.
- Läsningen ändrar inget underlag och startar inget samtal eller medgivande.

### UTKAST-28: kombinera aktiva egenskapsval utan att spara kartan

**Syfte:** Granska samma konflikt från karta och tabell och kombinera
värden från båda sidor med tydligt fokus och oförändrad gemensam karta.

**Användare:** Administratören och en inbjuden medlem i skilda
webbläsarprofiler. Använd medlemmens verkliga förnamn i jämförelsen.

**Förutsättningar:** Ett nytt tomt testhushåll med Lo Exempel och
Molnmusik enligt den allmänna förberedelsen. Administratören lägger
namnet Lo Lind, beskrivningen Min anteckning, Ospecificerat objekt och
Gäller fortfarande i sitt utkast. Medlemmen
sparar Lo Berg med beskrivningen Robins anteckning efter detta förslag.
Ladda om administratörens sida. Upprepa på dator och telefon.

**Integrationstest:**
[conflict-properties.spec.ts](../../tests/integration/conflict-properties.spec.ts),
testfallen “UTKAST-28: mix explicit property choices without saving the
shared map at 1440px” och motsvarande scenario vid 390px.

**Steg:**

1. Välj Tabell och öppna **1 konflikt i ditt utkast** under hushållets namn.
2. Kontrollera rubrikens fokus och de två rutorna **Sparat i kartan nu**
   och **Ditt förslag**. Läs förklaringen med medlemmens förnamn.
3. Välj ditt namn Lo Lind. Kontrollera att bekräftelsen är spärrad.
4. Välj den sparade beskrivningen Robins anteckning och Identifierat
   objekt. Välj Gäller fortfarande från ditt förslag. Läs **Efter dina val**.
5. Välj **Lägg valen i utkastet**. Läs status och konfliktlistans bock.
6. Stäng med Escape. Läs den sparade personen i tabellen och ditt utkast.
7. Förbered konflikten igen och öppna den från Karta. Använd Tab, Shift+Tab
   och Enter för motsvarande val. Försök nå verktygen bakom dialogen.

**Förväntat resultat:**

- Rubriken får fokus vid öppning. Tangentbordsfokus stannar i dialogen.
  Bakgrunden är inaktiv. Varje val markeras med ram och ✓ Vald.
- Alla skiljande egenskaper kräver aktiva val. Identiska värden behöver
  inget val. Resultatet visar Lo Lind och Robins anteckning tillsammans.
- Bara utkastet ändras. Kartan visar fortfarande Lo Berg och samma
  beskrivning som medlemmen sparar. Historiken får ingen ny sparad ändring.
- Konfliktlistan behåller typ och namn med bock till höger och en enda
  tillgänglig status. Inga värden klipps på telefon.
- När den sista konflikten är löst försvinner ingången. Stängning återför
  fokus till kartverktygen. En kvarvarande ingång får fokus annars.

### UTKAST-29: ogiltiga sambandsval behålls tills kombinationen rättas

**Syfte:** Validera målobjekt och vad som är känt tillsammans utan att
Skyttel ändrar en annan egenskap automatiskt.

**Användare:** Administratören och den inbjudna medlemmen.

**Förutsättningar:** Samma testhushåll. Spara först ett känt samband
Lo Exempel använder Molnmusik. Administratören föreslår Osäkert uppgivet.
Medlemmen sparar Uttryckligen inget utan målobjekt. Ladda om
administratörens sida.

**Integrationstest:**
[conflict-properties.spec.ts](../../tests/integration/conflict-properties.spec.ts),
testfallet “UTKAST-29: invalid relationship property combinations keep
every choice until corrected”.

**Steg:**

1. Öppna **1 konflikt i ditt utkast**.
2. Välj Molnmusik från **Ditt förslag** och Uttryckligen inget från
   **Sparat i kartan nu**.
3. Läs förklaringen och kontrollera att båda valmarkeringarna finns kvar.
4. Byt bara vad som är känt till Osäkert uppgivet från ditt förslag.
5. Bekräfta och granska utkastet samt den gemensamma kartan.

**Förväntat resultat:**

- Den ogiltiga kombinationen förklaras och bekräftelsen är spärrad.
  Ingen annan egenskap ändras och valen finns kvar.
- Den rättade kombinationen blir möjlig att bekräfta. Utifrån utkastet
  är målobjektet Molnmusik och uppgiften Osäkert uppgivet. Kartan behåller
  det som medlemmen sparar tills ett separat sparande genomförs.
- Servern avvisar samma ogiltiga kombination även från en äldre klient.

### UTKAST-30: en samtidig ändring avvisar den gamla jämförelsen

**Syfte:** Förhindra att en kombination läggs i utkastet mot inaktuella
sparade uppgifter.

**Användare:** Administratören och den inbjudna medlemmen.

**Förutsättningar:** Administratören föreslår Lo Lind. Medlemmen sparar
Lo Berg. Administratören laddar om och öppnar konfliktfönstret.

**Integrationstest:**
[conflict-properties.spec.ts](../../tests/integration/conflict-properties.spec.ts),
testfallet “UTKAST-30: a concurrent save rejects an outdated property
comparison without changing the draft”.

**Steg:**

1. Välj Lo Lind i konfliktfönstret utan att bekräfta.
2. Medlemmen sparar ett nytt namn Lo Ek från sin profil.
3. Administratören väljer **Lägg valen i utkastet**.
4. Läs felet. Välj **Visa aktuell jämförelse** och läs det nya namnet.
5. Stäng med Escape utan att lägga nya val i utkastet.

**Förväntat resultat:**

- Servern avvisar det gamla underlaget. Utifrån utkastet finns det
  ursprungliga förslaget kvar och inga andra förslag ändras.
- Felet förklarar att underlaget ändras. Valmarkeringen finns kvar vid
  avvisningen. Aktuell jämförelse visar Lo Ek och kräver ny granskning.
- Bekräftelsen är spärrad tills nya giltiga val är gjorda. Stängning
  återför fokus till den kvarvarande konfliktknappen.

### UTKAST-31: läs långa egenskapsnamn på smal skärm

**Syfte:** Läsa hela namnet på egna fält och gemensamma egenskaper även
när namnet saknar mellanslag.

**Användare:** Alex Exempel i provinstallationen för UTKAST-90.

**Förutsättningar:** Kör `npm run build` och
`node --import tsx scripts/manual-draft-review.ts --wrapping`.
Logga in med den syntetiska Google-identiteten. Namnen på cykelns
Ramnummer och beskrivning består av Ramnummer respektive Berättelse
upprepat tolv gånger utan mellanslag. Prova en smal skärm och förstoring.
Skriv `quit` i terminalen efter provningen.

**Integrationstest:**
[draft-review.spec.ts](../../tests/integration/draft-review.spec.ts),
testfallet “UTKAST-31: long unbroken field labels wrap in full draft reading
at 320 CSS pixels”.

**Steg:**

1. Öppna Utkast och läs hela förslaget Alex blå cykel.
2. Läs de långa egenskapsnamnen på den föreslagna sidan. Rulla genom
   uppgifterna och stäng med Escape.

**Förväntat resultat:**

- Hela egenskapsnamnen bryts och kan läsas utan sidledsrullning i dialogen.
- Escape återför fokus till radens läsknapp. Läsningen ändrar inga förslag.

### UTKAST-32: läs förslag som bara ändrar livscykel

**Syfte:** Skilja faktisk giltighet från ett uttryckligt val av statusläge
i både sammanfattningen och den fullständiga läsningen.

**Användare:** Alex Exempel i provinstallationen för UTKAST-90.

**Förutsättningar:** Kör `npm run build` och
`node --import tsx scripts/manual-draft-review.ts --lifecycle`.
Logga in med den syntetiska Google-identiteten. Utgånget provobjekt och
dess samband har slutdatum 2000-01-01. Framtida provobjekt och dess
samband har slutdatum 9999-12-31. De fyra förslagen anger Gäller
fortfarande; inga andra uppgifter ändras. Skriv `quit` efter provningen.

**Integrationstest:**
[draft-review.spec.ts](../../tests/integration/draft-review.spec.ts),
testfallet “UTKAST-32: lifecycle-only object and relationship proposals
distinguish effective changes and explicit modes”.

**Steg:**

1. Öppna Utkast och läs Vad som ändras för båda objekten och deras samband.
2. Öppna varje rad och jämför Gäller och Status på den sparade och den
   föreslagna sidan. Stäng med Escape mellan raderna.

**Förväntat resultat:**

- Alla fyra rader visar Status: Följ slutdatum → Gäller fortfarande.
- Det utgångna objektet och dess samband visar dessutom
  Gäller: Upphört → Aktuellt. Framtida uppgifter får ingen falsk
  giltighetsändring; den uttryckliga statusändringen syns ändå.
- Den fullständiga läsningen visar samma betydelser som sammanfattningen.
  De fyra kolumnerna är kvar. Läsningen ändrar inga förslag eller sparade
  uppgifter och Escape återför fokus till den använda läsknappen.

### UTKAST-33: läs långa objektnamn i objekt- och sambandkonflikter

**Syfte:** Läsa hela namnet i konfliktens rubrik och lista på smal skärm.

**Användare:** Alex och Lo i skilda webbläsarprofiler med tillgång till hushållet.

**Förutsättningar:** Ett nytt hushåll med ett objekt vars namn består av
Föremålsnamn upprepat fjorton gånger utan mellanslag, och objektet Molnmusik.
Spara båda. Gör varje delprov i ett nytt hushåll enligt allmän förberedelse.

**Integrationstest:**
[conflict-properties.spec.ts](../../tests/integration/conflict-properties.spec.ts),
testfallen “UTKAST-33: long unbroken object names wrap in the conflict heading
and list at 320 CSS pixels” och “UTKAST-33: long unbroken relationship names
wrap in the conflict heading and list at 320 CSS pixels”.

**Steg:**

1. I objektprovet föreslår Alex en ny beskrivning av objektet med det långa
   namnet. Lo sparar en annan beskrivning av samma objekt.
2. I sambandprovet skapar och sparar Alex ett samband från objektet med
   det långa namnet till Molnmusik. Alex föreslår sedan Osäkert uppgivet,
   medan Lo ändrar sambandets status till Avslutat och sparar.
3. Använd en smal webbläsarvy och öppna **1 konflikt i ditt utkast**.
   Läs hela namnet i rubriken och konfliktlistan utan sidledes rullning.
4. Stäng med Escape och kontrollera att konfliktknappen får fokus.

**Förväntat resultat:**

- Namnet bryts och kan läsas i båda delproven. Innehållet kräver ingen
  sidledes rullning i dialogen.
- Escape återför fokus. Läsningen ändrar varken kartan eller utkastet.

### UTKAST-34: bevara typens egna benämningar i konflikt och resultat

**Syfte:** Skilja konfigurerade gemensamma egenskaper från deras standardnamn.

**Användare:** Alex och Lo med tillgång till samma hushåll.

**Förutsättningar:** Ett nytt hushåll med Lo Exempel. Redigera dess objekttyp
via **Objekttyper och egna fält**. Skapa avsnittet Uppgifter och lägg till
Beskrivning och Pris med **Lägg till gemensam egenskap**. Ändra **Fältets namn**
till Anteckningar respektive Avtalat pris och välj avsnittet Uppgifter.
Lägg definitionen i utkastet och spara.

**Integrationstest:**
[conflict-properties.spec.ts](../../tests/integration/conflict-properties.spec.ts),
testfallet “UTKAST-34: configured builtin labels remain unchanged on both
conflict sides and the result”.

**Steg:**

1. Alex föreslår Egen anteckning i Anteckningar och priset 120.
2. Lo sparar Sparad anteckning och priset 240 på samma objekt.
3. Alex öppnar **Granska konflikter**. Läs båda sidornas benämningar.
4. Välj Alex anteckning och det sparade priset. Läs **Resultat av valen**,
   välj **Lägg valen i utkastet** och läs resultatet igen.

**Förväntat resultat:**

- Båda sidor och resultatet visar Anteckningar och Avtalat pris, utan att
  ersätta dem med Beskrivning eller Pris.
- Utkastet innehåller Egen anteckning och 240 efter valet.

### UTKAST-35: ange den verkliga spararen för varje ändrad egenskap

**Syfte:** Bevara korrekt författare när senare sparanden ändrar andra egenskaper.

**Användare:** Alex, Lo och Robin i tre skilda webbläsarprofiler med egna
konfigurerade inloggningar och tillgång till samma hushåll.

**Förutsättningar:** Ett nytt hushåll med Lo Exempel utan beskrivning.
De tre användarna är aktuella medlemmar; demodatans historiska Robin är
inte en inloggning. Använd faktiska förnamn om profilerna har andra namn.

**Integrationstest:**
[conflict-properties.spec.ts](../../tests/integration/conflict-properties.spec.ts),
testfallet “UTKAST-35: saved property attribution identifies each actual saver
after independent later changes”.

**Steg:**

1. Robin lägger namnet Eget namn och beskrivningen Egen text i sitt utkast.
2. Lo ändrar enbart objektets namn till Lo Berg och sparar.
3. Alex ändrar enbart beskrivningen till Alex text och sparar senare.
4. Robin öppnar **Granska konflikter** och läser den sparade sidans
   namnrad och beskrivningsrad.
5. Robin stänger dialogen och ändrar sitt föreslagna namn till
   **Eget senare namn** utan att spara i den gemensamma kartan.
6. Robin öppnar **Granska konflikter** igen och läser uppgifterna om
   sparare och ordningen mellan förslag och sparanden.

**Förväntat resultat:**

- Namnraden anger Lo som sparare, även efter Alex senare sparande.
- Beskrivningsraden anger Alex. Författarnamn hör till den ändrade
  egenskapen och ersätts inte av hela objektets senaste sparare.
- Efter Robins senare ändring anges samma verkliga sparare, utan att
  hävda att deras tidigare sparanden sker efter det nya förslaget.

### UTKAST-01: återuppta en konflikt och spara oberoende förslag tillsammans

**Syfte:** Kontrollera att ett privat utkast kan återupptas, att ett aktivt
konfliktval bevarar oberoende ändringar och att hela utkastet kräver ett
nytt sparbesked.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Aktuell demodata enligt förberedelsen ovan. Inga
förslag får vara sparade eller kastade efter återställningen.

**Integrationstest:** [family.spec.ts](../../tests/integration/family.spec.ts),
testfallet “UTKAST-01: demo seed resumes a conflict and preserves independent
proposals without granting access to map people”.
[database-setup.spec.ts](../../tests/integration/database-setup.spec.ts)
kontrollerar även demodatans underlag, historik och administratörens åtkomst.
Se [testguiden](../development/testing.md#integration-tests) för
kommandon som kör integrationstesterna.

**Steg:**

1. Öppna **Hela mitt utkast**. Granska namnkonflikten och förslaget om byte
   av inloggningsadress. Kontrollera knappen **Spara hela utkastet**.
2. Ladda om sidan. Stoppa och starta sedan applikationen igen med samma
   databas. Öppna sidan och granska utkastet på nytt.
3. Öppna **Granska konflikter** via konfliktknappen. Välj det egna namnet
   Lo Lind och den sparade beskrivningen. Välj **Lägg valen i utkastet**
   och stäng med Escape. Granska även förslaget om inloggningsadress.
4. Öppna **Familjens musikkonto**, ändra namnet till
   **Familjens rättade konto** och välj **Lägg i mitt utkast**. Granska
   sambandets **Sparat underlag** och **Förslag**.
5. Välj **Spara hela utkastet**. Kontrollera kvittot och utkastet.
6. Ladda om sidan. Kontrollera utkastet och det sparade sambandet.

**Förväntat resultat:**

- Före konfliktvalet visas ursprungsnamnet Lo Exempel, förslaget Lo Lind
  och det aktuella sparade namnet Lo Berg. **Spara hela utkastet** är
  inaktiverad. Konflikten och adressförslaget finns kvar efter omladdning
  och omstart.
- Konfliktvalet ger inget sparkvitto. Dialogens status visar att valen finns
  i utkastet. Förslaget innehåller Lo Lind och den oberoende sparade
  beskrivningen “Spelar piano i musikföreningen.” Adressförslaget finns kvar.
- Sambandets tidigare underlag visar Familjens musikkonto och
  `familjen@example.test`. Förslaget visar Familjens rättade konto och
  `musik@example.test`.
- Det uttryckliga sparandet ger ett lyckat sparkvitto. Utkastet visar
  **Inga förslag** även efter omladdning. Det sparade sambandet visar
  **Familjens rättade konto → Inloggningsadress → `musik@example.test`**.

## Aktuellt underlag och borttagning

### UTKAST-02: ett gammalt kastförsök bevarar nyare förslag

**Syfte:** Kontrollera att en äldre flik inte kan kasta nyare förslag.

**Användare:** Administratören i två flikar.

**Förutsättningar:** Tom testinstallation med de två sparade objekten
enligt förberedelsen. Båda flikarna använder samma inloggning.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallet “UTKAST-02: a stale discard preserves newer object and
relationship proposals”.

**Steg:**

1. Öppna **Lo Exempel**, ändra namnet till **Lo Lind** och välj
   **Lägg i mitt utkast** i första fliken.
2. Öppna appen i andra fliken. Välj **Nytt samband** och lägg
   **Lo Lind → Använder → Molnmusik** i utkastet.
3. Välj **Kasta hela utkastet** i första fliken utan att ladda om.
4. Välj **Hämta aktuellt underlag**. Granska namnförslaget och sambandet.
5. Välj **Kasta hela utkastet** igen och ladda om sidan.

**Förväntat resultat:**

- Det första kastförsöket avvisas eftersom förslaget eller kartan ändras.
  Fortsatt kastande blockeras tills aktuellt underlag hämtas.
- Efter hämtningen finns både **Lo Lind** och det nya sambandet kvar.
- Det andra kastandet tömmer hela utkastet. **Lo Exempel** och
  **Molnmusik** finns kvar i kartan, utan det föreslagna sambandet.

### UTKAST-03: ett gammalt konfliktval kräver ny granskning

**Syfte:** Kontrollera att ett konfliktval gäller det underlag som visas.

**Användare:** Administratören och medlemmen.

**Förutsättningar:** De två sparade objekten enligt förberedelsen.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallet “UTKAST-03: a stale conflict choice requires refreshed review
before saving”.

**Steg:**

1. Lägg namnändringen **Lo Lind** i administratörens utkast utan att spara.
2. Ändra samma person till **Lo Berg** som medlemmen och spara hela utkastet.
3. Ladda om administratörens sida. Kontrollera konflikten med **Lo Berg**.
4. Ändra personen till **Lo Ek** som medlemmen och spara igen.
5. Välj **Behåll mitt förslag** som administratören utan omladdning.
6. Välj **Hämta aktuellt underlag** och granska **Lo Ek** och **Lo Lind**.
7. Välj **Behåll mitt förslag** igen. Kontrollera medlemmens karta efter
   omladdning innan administratören väljer **Spara hela utkastet**.
8. Spara administratörens utkast och ladda om medlemmens sida.

**Förväntat resultat:**

- Det gamla konfliktvalet avvisas och sparande blockeras. Namnförslaget
  **Lo Lind** finns kvar när det aktuella underlaget hämtas.
- Det nya konfliktvalet uppmanar till granskning och ändrar bara utkastet.
  Medlemmen ser fortfarande **Lo Ek** före det uttryckliga sparandet.
- Efter sparandet bekräftar kvittot **Lo Lind** och medlemmen ser det namnet.

### UTKAST-04: godta ett borttaget objekt utan att tappa andra förslag

**Syfte:** Kontrollera att ett namnförslag inte återupplivar ett borttaget
objekt och att oberoende förslag kan sparas.

**Användare:** Administratören och medlemmen.

**Förutsättningar:** De två sparade objekten enligt förberedelsen.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallet “UTKAST-04: accepting a deleted object preserves an independent
proposal”.

**Steg:**

1. Lägg namnändringen **Lo Lind** och ett nytt objekt **Kim Exempel** i
   administratörens utkast utan att spara.
2. Öppna **Lo Exempel** som medlemmen, välj **Ta bort** och
   **Spara hela utkastet**.
3. Ladda om administratörens sida. Granska konflikten och möjliga val.
4. Välj **Använd sparat värde**. Granska det återstående utkastet och
   medlemmens karta innan något sparas.
5. Välj **Spara hela utkastet** som administratören och ladda om båda sidorna.

**Förväntat resultat:**

- Konflikten säger att objektet är borttaget. **Behåll mitt förslag**
  erbjuds inte och hela utkastet kan inte sparas före konfliktvalet.
- Valet tar bort namnförslaget men behåller **Kim Exempel** i utkastet.
  Kim finns ännu inte i medlemmens karta.
- Efter sparandet finns **Kim Exempel** och **Molnmusik** hos båda
  användarna. Varken **Lo Exempel** eller **Lo Lind** återkommer.

## Samtidiga ändringar

### UTKAST-05: en namnkonflikt blockerar även oberoende förslag

**Syfte:** Kontrollera att hela utkastet sparas tillsammans efter ett nytt
konfliktval och sparbesked.

**Användare:** Administratören och medlemmen.

**Förutsättningar:** De två sparade objekten enligt förberedelsen.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallet “UTKAST-05: a conflict choice preserves independent proposals
and requires a new save”.

**Steg:**

1. Lägg **Alex Exempel** som nytt objekt och namnändringen **Lo Lind** i
   administratörens utkast. Behåll sidan öppen.
2. Ändra samma person till **Lo Berg** som medlemmen och spara.
3. Välj **Spara hela utkastet** som administratören utan omladdning.
4. Kontrollera medlemmens karta. Välj sedan **Hämta aktuellt underlag**
   som administratören och granska de tre namnvärdena.
5. Välj **Behåll mitt förslag**. Starta om appen med samma databas och
   ladda om administratörens sida.
6. Granska utkastet och välj **Spara hela utkastet**. Ladda om hos medlemmen.

**Förväntat resultat:**

- Det första sparandet avvisas med **Inget sparades**. Medlemmen ser
  **Lo Berg** och inget **Alex Exempel**.
- Granskningen visar underlaget **Lo Exempel**, förslaget **Lo Lind** och
  det sparade namnet **Lo Berg**. Sparande kräver ett uttryckligt val.
- Konfliktvalet behåller **Alex Exempel**, ger inget sparkvitto och
  finns kvar efter omstart. Det nya sparandet gör båda förslagen gemensamma.

### UTKAST-06: granska nya samband före objektborttagning

**Syfte:** Kontrollera att borttagning kräver granskning av samband som
en annan användare lägger till.

**Användare:** Administratören och medlemmen.

**Förutsättningar:** De två sparade objekten utan samband enligt förberedelsen.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallet “UTKAST-06: deleting an object requires reviewing newly saved
relationships”.

**Steg:**

1. Öppna **Lo Exempel** som administratören och välj **Ta bort**.
2. Lägg **Lo Exempel → Använder → Molnmusik** med säkerheten
   **Osäkert uppgivet** i medlemmens utkast och spara det.
3. Försök spara administratörens äldre utkast. Hämta aktuellt underlag.
4. Granska det nytillkomna sambandet och välj **Behåll mitt förslag**.
5. Kontrollera att sambandet fortfarande finns hos medlemmen. Välj sedan
   **Spara hela utkastet** som administratören och ladda om hos medlemmen.

**Förväntat resultat:**

- Det gamla sparandet avvisas. Konflikten visar sambandet med riktning
  och säkerheten **Osäkert uppgivet**.
- Konfliktvalet lägger även **Borttagning av samband** i utkastet.
  Kartan ändras först vid det nya sparandet.
- Både personen och sambandet försvinner efter sparandet. **Molnmusik**
  finns kvar.

### UTKAST-07: välj sparad betydelse vid en konflikt om ett samband

**Syfte:** Kontrollera att granskningen skiljer osäkerhet från att något
uttryckligen saknas.

**Användare:** Administratören och medlemmen.

**Förutsättningar:** Spara **Lo Exempel → Använder → Molnmusik** med
säkerheten **Känt** utöver de två objekten enligt förberedelsen.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallet “UTKAST-07: overlapping relationship proposals show meanings
and can accept the saved value”.

**Steg:**

1. Öppna sambandet som administratören och lägg säkerheten
   **Osäkert uppgivet** i utkastet.
2. Öppna samma samband som medlemmen, välj **Uttryckligen inget**, lägg
   det i utkastet och spara.
3. Ladda om administratörens sida och granska konflikten.
4. Välj **Använd sparat värde** och kontrollera utkastet och sambandet.

**Förväntat resultat:**

- Konflikten visar både **Osäkert uppgivet** och **Uttryckligen inget**.
  Sparande är blockerat före valet.
- Valet tömmer det överlappande förslaget. Kartans samband behåller
  **Uttryckligen inget** och inget nytt sparande krävs.

### UTKAST-10: bevara oberoende status och håll slutdatumets säkerhet samlad

**Syfte:** Bevara oberoende ändringar av ett samband när ett konfliktval
görs och låta ett överlappande datumval omfatta både datum och säkerhet.

**Användare:** Administratören och medlemmen.

**Förutsättningar:** Spara **Lo Exempel → Använder → Molnmusik** med
säkerheten **Känt**, statusen **Följ slutdatum** och utan slutdatum.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallet “UTKAST-10: relationship choices preserve independent status
and keep date certainty with its value”.

**Steg:**

1. Öppna sambandet som administratören. Ange **2031-04-12** som känt
   **Sambandets slutdatum** och lägg sambandet i utkastet utan att spara.
2. Öppna samma samband som medlemmen. Välj **Upphört** under
   **Sambandets status**, lägg sambandet i utkastet och spara.
3. Ladda om administratörens sida. Granska konflikten med slutdatumet och
   den sparade statusen. Välj **Behåll mitt förslag**.
4. Kontrollera hos medlemmen att inget slutdatum är sparat. Starta om
   appen med samma databas, ladda om administratörens sida och granska
   hela utkastet igen. Välj **Spara hela utkastet**.
5. Ändra slutdatumets säkerhet till **Osäkert uppgivet** som administratören.
   Behåll datumet **2031-04-12** och lägg sambandet i utkastet.
6. Ändra slutdatumet till **2031-05-15**, behåll säkerheten **Känt** och
   välj statusen **Gäller fortfarande** som medlemmen. Lägg sambandet i
   utkastet och spara.
7. Ladda om administratörens sida, granska båda datumen, deras säkerhet
   och den sparade statusen. Välj **Behåll mitt förslag**.
8. Kontrollera hos medlemmen att det kända datumet **2031-05-15** fortfarande
   är sparat. Välj **Spara hela utkastet** som administratören och ladda
   om hos medlemmen.

**Förväntat resultat:**

- Sparande är blockerat före varje konfliktval. Valet ändrar bara utkastet
  och kräver ett nytt sparande av hela det granskade utkastet.
- Det första lösta utkastet överlever omstart. Efter sparandet innehåller
  sambandet både **Upphört** och det kända slutdatumet **2031-04-12**.
- Efter det andra sparandet innehåller sambandet **Gäller fortfarande**
  och **2031-04-12 (Osäkert uppgivet)**. Den oberoende statusen bevaras;
  det valda datumet och dess säkerhet hålls ihop.

### UTKAST-11: bevara rätt typdefinition vid borttagning efter ett typbyte

**Syfte:** Granska aktuella typer före borttagning och bevara definitionerna
som hör till de borttagna värdena i historikunderlaget.

**Användare:** Administratören och medlemmen.

**Förutsättningar:** Spara **Lo Exempel → Använder → Molnmusik** med
säkerheten **Känt** utöver de två objekten enligt förberedelsen.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallet “UTKAST-11: deletion after concurrent type changes retains the
matching historical definitions”.

**Steg:**

1. Öppna **Åtgärder för Lo Exempel** som administratören och välj **Ta bort**.
   Låt borttagningen av objektet och sambandet ligga kvar i utkastet.
2. Öppna **Lo Exempel** som medlemmen. Byt **Objekttyp** till
   **Abonnemang** och lägg ändringen i utkastet.
3. Byt sambandets typ från **Använder** till **Används av** i samma utkast.
   Behåll riktningen från Lo till Molnmusik och spara hela utkastet.
4. Ladda om administratörens sida och granska konflikterna för objektet
   och sambandet. Välj **Behåll mitt förslag** för båda.
5. Kontrollera hos medlemmen att objektet och sambandet fortfarande finns.
   Välj sedan **Spara hela utkastet** som administratören och ladda om
   hos medlemmen.

**Förväntat resultat:**

- Konflikterna visar de aktuella typerna **Abonnemang** och **Används av**.
  Hela sparandet är blockerat tills båda valen är gjorda.
- Valen ändrar bara utkastet. Efter det nya sparandet är Lo och sambandet
  borttagna, medan Molnmusik finns kvar.
- Automationen läser historikunderlaget via HTTP. Det tidigare objektet
  och sambandet har sina aktuella typ-ID:n tillsammans med motsvarande
  definitioner för **Abonnemang** och **Används av**, samt tomma eftervärden.
  Läsning och ångring i gränssnittet provas i [historikfallen](history.md).

### UTKAST-08: välj ett befintligt samband och behåll andra förslag

**Syfte:** Kontrollera att samtidiga likadana samband inte skapar dubbletter.

**Användare:** Administratören och medlemmen.

**Förutsättningar:** De två sparade objekten utan samband enligt förberedelsen.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallet “UTKAST-08: a saved duplicate can be selected without losing
another proposal”.

**Steg:**

1. Lägg **Lo Exempel → Använder → Molnmusik** och det nya objektet
   **Kim Exempel** i administratörens utkast.
2. Skapa samma samband som medlemmen och spara det.
3. Ladda om administratörens sida och granska konflikten.
4. Välj **Använd sparat värde** och sedan **Spara hela utkastet**.

**Förväntat resultat:**

- Granskningen visar **Samma samband finns redan** och det befintliga
  sambandet med läsbara objektnamn och riktning.
- Valet tar bort dubblettförslaget men behåller **Kim Exempel**.
- Efter sparandet finns Kim och exakt ett sådant samband i kartan.

### UTKAST-09: ta bort ett förslag som hänvisar till ett borttaget objekt

**Syfte:** Kontrollera att ett ofullständigt samband kan granskas efter
omstart och tas bort uttryckligen.

**Användare:** Administratören och medlemmen.

**Förutsättningar:** De två sparade objekten utan samband enligt förberedelsen.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallet “UTKAST-09: a deleted relationship endpoint has an explicit
recovery choice”.

**Steg:**

1. Lägg **Lo Exempel → Använder → Molnmusik** med säkerheten
   **Osäkert uppgivet** i administratörens utkast.
2. Öppna **Molnmusik** som medlemmen, välj **Ta bort** och spara.
3. Ladda om administratörens sida och granska konflikten.
4. Starta om appen med samma databas och öppna administratörens utkast.
5. Välj **Använd sparat värde**.

**Förväntat resultat:**

- Konflikten säger att sambandet hänvisar till ett borttaget objekt.
  **Behåll mitt förslag** erbjuds inte.
- Efter omstart visas fortfarande **Lo Exempel → Använder → Molnmusik**
  med **Osäkert uppgivet**, även om målobjektet saknas i kartan.
- Valet tar bort förslaget och visar **Inga förslag**. Inget samband
  skapas och det borttagna objektet återkommer inte.

## Status, fokus och samlat sparande

### UTKAST-25: filtrerad teckenförklaring följer kartans färger

**Syfte:** Matcha symboler och linjer med kartan och visa kategorier från
den filtrerade kartan, oberoende av kameran.

**Användare:** Administratören.

**Förutsättningar:** Spara Lo Exempel, Molnmusik och Kim Exempel samt ett
riktat samband från Lo till Molnmusik. Föreslå en ändrad beskrivning för Lo
och vänd sambandets riktning utan att spara. Upprepa i ljust och mörkt tema.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
testfallen “UTKAST-25: filtered legend matches map colours and retains only
displayed categories in light”, samma titel med “dark”.

**Steg:**

1. Stäng panelerna. Läs grönt plus, gul penna och rött kryss under
   hushållets namn. Jämför färgerna med förslagen i kartan. Läs gammalt
   samband med rött kryss och streckad linje och nytt med grönt plus och
   heldragen linje utan att markera dem eller välja Alla etiketter.
2. Öppna Navigera och panorera. Teckenförklaringens rader ska bestå.
3. Stäng Navigation och välj det nya sambandet. Ingen rad för markerat
   objekt ska tillkomma.
4. Öppna Lista, sök Kim Exempel och stäng panelerna. Förslagsraderna ska
   försvinna. Raden för punktade etikettkopplingar ska finnas kvar.
5. Markera Kim. Kontrollera markeringsraden. Sök sedan Inga träffar via
   Lista och stäng panelerna. Hela teckenförklaringen ska försvinna.

**Förväntat resultat:**

- Symboler och linjeprov matchar kartans färger i båda teman. Text och
  symbol gör innebörden begriplig även utan färg.
- Sökningen styr kategorierna, medan kameran och en vald relation inte
  skapar en objektmarkering. Inga uppgifter sparas eller byter identitet.

### UTKAST-26: sparbesked försvinner medan uppdateringsfel kan återhämtas

**Syfte:** Skilja bekräftat sparande från misslyckad hämtning utan samtal.

**Användare:** Administratören.

**Förutsättningar:** Tomt hushåll utan pågående samtal. Använd nätverkets
blockering i webbläsaren för kartans GET-anrop efter sparandet. Blockera
inte sparadressen; om ordningen inte kan styras, anteckna begränsningen.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
testfallet “UTKAST-26: confirmed save toast expires while failed refresh
remains recoverable without a conversation” samt samma titel med
“after an unknown result”.

**Steg:**

1. Lägg Lo Exempel i utkastet. Blockera hämtning av kartan och välj Spara
   hela utkastet från Lista. Stäng sparmodalen med Escape och stäng panelerna.
2. Läs Utkastet är sparat tillsammans med felet att kartan inte kunde
   hämtas. Vänta tre sekunder. Sparbeskedet försvinner; felet består.
3. Ta bort blockeringen och välj Hämta aktuellt underlag. Felet ska
   försvinna och det tidigare sparbeskedet ska inte spelas upp igen.
4. Öppna **Rapporter** och läs den enda genomförda ändringsgruppen
   för Lo Exempel i **Ändringshistorik**.
5. Upprepa med ett nytt förslag och bryt sparsvaret efter genomförandet.
   Läs Sparutfall okänt utan sparbesked. Blockera sedan kartans hämtning,
   men tillåt hämtning av sparförsök. Välj Hämta aktuellt underlag.
   Läs Utkastet är sparat och kartans hämtningsfel; Sparutfall okänt ska
   försvinna. Upprepa steg 2–4.

**Förväntat resultat:**

- Sparbeskedet och felet gäller olika resultat och kan visas samtidigt.
  Återhämtning finns utan samtal och kvittot förblir tillgängligt.
- Samma resultat gäller när återhämtning bekräftar ett tidigare okänt
  sparförsök innan kartans hämtning misslyckas.
- Integrationen styr den verkliga spartransaktionen och avbryter bara
  hämtningen efter kvittot; den kräver ingen verklig leverantör.

### UTKAST-12: behåll legend och förslag tills samma sparförsök bekräftas

**Syfte:** Följa ett privat förslag med stängda paneler och skilja väntan,
okänt resultat och verifierat sparande.

**Användare:** Administratören.

**Förutsättningar:** Ett tomt hushåll enligt förberedelsen. Upprepa med
1440, 390 och 320 pixlars bredd. För ett okänt
resultat före serverns sparande kan webbläsarens nätverksblockering användas
för adressen som slutar med `/map/save`, enligt
[SPAR-02](operations.md#spar-02-återförsöka-ett-väntande-sparande-från-en-annan-klient).

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
testfallet “UTKAST-12: closed panels retain private proposals through an
unknown save at 1440px/390px/320px and verify the same receipt”.

**Steg:**

1. Lägg objektet **Familjeabonnemanget** i utkastet. Stäng panelerna med
   kryssen.
2. Kontrollera grönt plus i teckenförklaringen under hushållets namn.
   Varken förslagsantal, gul penna eller rött kryss ska visas för detta förslag.
3. Kontrollera att **Aktuell status** inte längre finns i verktygen.
   Kartans status och teckenförklaring finns under hushållets namn.
4. Blockera sparadressen. Öppna Lista och välj **Spara hela utkastet**.
   Stäng panelerna.
   Läs **Sparutfall okänt**, det bevarade förslaget och legenden.
5. Ta bort blockeringen och välj **Hämta samma kvitto igen**. Läs resultatet.
   Öppna **Utkast och historik** och läs **Tidigare sparförsök**.

**Förväntat resultat:**

- Sparandet kräver ingen extra granskningsdialog. Ett obekräftat försök
  visas aldrig som säkert lyckat eller säkert misslyckat.
- Återkopplingens knappar kan användas utan att verktygen täcker dem.
  Ingen separat statuspanel behöver öppnas eller stängas.
- Samma försök kontrolleras och får ett verifierat kvitto. Objektet finns
  en gång i kartan. Förslagsraden försvinner efter uppdateringen, men
  markeringsringen och etikettkopplingarnas rad kan finnas kvar.
  Utkastet är sparat visas i tre sekunder och återkommer inte vid omladdning.
  Sparförsöken innehåller ett enda försök.
- Det automatiserade provet håller dessutom det riktiga serversvaret
  efter genomfört sparande. Det kontrollerar **Väntar på sparkvitto** och
  kvarvarande legend, bryter svaret och jämför samma operations-ID och
  enda historikkvitto genom det publika API:et. Nätverksblockeringen ovan
  verifierar inte ett tappat svar efter transaktionen.

### UTKAST-13: sparresultat behåller ett nyare valt textfält

**Syfte:** Sparresultat ska inte avbryta skrivande. Kartåterkopplingen
ska uppdateras utan att flytta fokus.

**Användare:** Administratören.

**Förutsättningar:** Ett tomt hushåll. Använd webbläsarens långsamma
nätverksläge så att det går att välja ett annat fält under sparandet.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
testfallet “UTKAST-13: a verified save keeps a newer field focused without the
removed
status controls”.

**Steg:**

1. Lägg **Lo Exempel** i utkastet och välj **Spara hela utkastet**.
2. Medan svaret väntar, välj **Sök objekt** och skriv **Lo**.
3. Invänta sparkvittot och fortsätt skriva ett blanksteg och **Exempel**
   utan att klicka igen.
4. Läs Utkastet är sparat under hushållets namn. Kontrollera att
   **Aktuell status** inte längre finns i verktygen.
5. Fortsätt skriva i sökfältet utan att klicka på det igen.

**Förväntat resultat:**

- Sökfältet behåller fokus och innehåller **Lo Exempel** efter sparandet.
- Sparbeskedet visas i tre sekunder. Kvittot finns kvar i Mina sparförsök.
  Sökfältet behåller fokus även när återkopplingen uppdateras.
- Det automatiserade provet håller ett verkligt lyckat serversvar för
  att säkerställa ordningen och kontrollerar att utkastet är tomt innan
  fortsatt skrivande. Ett manuellt prov där svaret hinner fram före
  fältbytet verifierar inte fokus under väntan.

### UTKAST-14: formulär, text och tal delar ett beständigt privat utkast

**Syfte:** Spara hela det gemensamma utkastet atomiskt och läsa den sparade
kartan som en annan medlem efter omstart.

**Användare:** Administratören och den inbjudna medlemmen.

**Förutsättningar:** Tomt hushåll, separat medlemsprofil och samtalsstart
med medgivande enligt förberedelsen.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
testfallet “UTKAST-14: manual text and voice proposals share one durable
private draft and an atomic household save”.

**Steg:**

1. Lägg **Lo Exempel** i utkastet genom formuläret med **Lägg i utkastet
   och stäng**.
2. Välj **Skriv till Skyttel** och **Godkänn och starta**. Skriv
   **Lägg Molnmusik i utkastet**. Kontrollera två privata förslag på
   **Visa utkastet**.
3. Välj **Prata med Skyttel** och säg **Lo använder Molnmusik**.
   Kontrollera att sambandet ingår och att **Visa utkastet** visar tre privata
   förslag.
4. Skriv ett oskickat samtalsmeddelande. Besök Inställningar och återgå till
   kartan. Stäng panelerna med kryssen. Kartan ska inte visa påminnelse om
   oskickad formulärtext. Kontrollera som medlem att den sparade kartan är tom
   och att
   administratörens förslag inte visas i medlemmens utkast.
5. Öppna Lista och välj **Nytt objekt**. Skriv **Oskickad cykel** och
   **Texten ska finnas kvar** i beskrivningen. Välj **Avbryt** och tryck
   Escape i förlustdialogen. Kontrollera att namn och beskrivning finns
   kvar utan nytt förslag. Välj **Lägg i utkastet och stäng**.
   Granska fyra förslag i hela utkastet.
   Välj **Spara hela utkastet** där och stäng panelerna.
6. Invänta bekräftat kvitto. Stäng klienterna, starta om servern med samma
   databas och öppna kartan som medlem.

**Förväntat resultat:**

- Samma privata utkast innehåller tre objekt och ett samband från alla
  tre arbetssätten. Oskickad text räknas först när den läggs i utkastet.
- Kvittot beskriver alla fyra ändringarna. Förslagsraderna i teckenförklaringen
  försvinner.
  Medlemmen ser alla tre objekten och **Lo Exempel → Använder → Molnmusik**
  efter omstart, men inga privata förslag från administratören.
- Det automatiserade provet håller den riktiga sparbegäran före
  genomförandet och kontrollerar oförändrat utkast, tom sparad karta och
  därefter ett enda kvitto för alla ändringar. En samtidig uppdatering
  från samtalet får inte ändra ett pågående sparande till okänt utfall.
  Databasen och servern är riktiga; tal och modellresultat ersätts vid
  de externa tjänsternas
  gränser. Provet verifierar inte fysisk mikrofon eller verkligt svenskt tal.

### UTKAST-15: besvara nödvändig fråga före ett nytt sparbesked

**Syfte:** Samma nödvändiga fråga ska hindra sparande från både textvyn
och utkastets arbetsyta. Ett svar ska inte i sig spara utkastet.

**Användare:** Administratören.

**Förutsättningar:** Ett tomt hushåll och ett tillgängligt samtal med Skyttel.
Provet kräver att samtalet visar en nödvändig fråga. Om tjänsten inte ger
en sådan fråga, anteckna att den delen inte har verifierats.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
testfallet “UTKAST-15: a necessary answer gates both save actions until a
fresh explicit save”.

**Steg:**

1. Lägg **Lo Exempel** i utkastet via formuläret. Välj **Skriv till Skyttel**
   och **Godkänn och starta**. Be Skyttel förbereda uppgiften och fråga
   vilket kort som avses.
2. Läs frågan i samtalstexten och stäng panelerna med kryssen. Kontrollera att
   kartan inte erbjuder sparande. Ingen separat **Nödvändigt
   svar**-ruta eller **Svara i samtalet**-knapp ska finnas.
3. Öppna Lista och **Hela mitt utkast**. Kontrollera att **Spara hela
   utkastet** är inaktiverad även där. Öppna även **Utkast** och kontrollera
   dess sparikon. Kartan har ännu inga sparade objekt.
4. Välj **Skriv till Skyttel**, svara **Kortet Lo Exempel avses** och skicka.
   Vänta tills frågan är besvarad. Stäng panelerna med kryssen igen.
5. Öppna **Utkast**. Kontrollera att sparande erbjuds men inte har genomförts.
   Välj **Spara hela utkastet** uttryckligen och läs det verifierade resultatet.

**Förväntat resultat:**

- Varken textvyn eller arbetsytan kringgår den nödvändiga frågan.
  Det privata förslaget finns kvar medan frågan besvaras.
- Att svara skapar inget sparförsök. Först det nya uttryckliga sparbeskedet
  ger ett kvitto och gör uppgifterna till sparat kartinnehåll.
- Integrationstestet styr frågan vid modellgränsen men använder riktig
  server och SQLite. Det jämför tomma sparförsök före beskedet och ett
  enda lyckat försök med samma verkliga kvitto i historiken efteråt.

### UTKAST-17: avbruten formulärförlust och oberoende utkast består vid konflikt

**Syfte:** Hitta en samtidig ändring och behålla ett oberoende förslag
efter avbruten formulärförlust och granskning.

**Användare:** Alex och Robin, två medlemmar i samma hushåll, i skilda
webbläsarsessioner enligt förberedelsen.

**Förutsättningar:** objektet Lo Exempel finns i den sparade kartan. Inget
av klienternas utkast innehåller tidigare förslag.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallet “UTKAST-17: canceled form loss and staged independent work survive
concurrent conflict review”.

**Steg:**

1. Öppna Lo Exempels redigering i båda sessionerna. Alex föreslår namnet
   Lo Lind och Robin föreslår Lo Berg. Lägg båda ändringarna i respektive
   privat utkast.
2. Låt Robin spara. Försök därefter spara Alex utkast. Kontrollera att
   försöket avvisas. Stäng **Spara utkastet** och ladda om sidan.
3. Hos Alex: öppna **Nytt objekt**, skriv Oskickad cykel och välj Avbryt.
   Kontrollera förvalt Fortsätt redigera och tryck Escape. Kontrollera
   namnet och att bara Lo Lind finns i utkastet. Lägg därefter cykeln i
   utkastet med **Lägg i utkastet och stäng**.
4. I kartans återkoppling, välj **1 konflikt i ditt utkast**. Läs
   **Granska konflikter**, **Sparat i kartan nu** och **Ditt förslag**.
5. Kontrollera att namnvalet är nåbart utan att välja det. Stäng med
   Escape, öppna Lista och **Uppgifter för Oskickad cykel**.

**Förväntat resultat:**

- Fokus hamnar på dialogens synliga rubrik Granska konflikter.
  Sparat i kartan nu visar Lo Berg och Ditt förslag visar Lo Lind.
- Avbruten förlust bevarar formulärtexten utan att lägga ett förslag.
  Efter uttryckligt tillägg finns Oskickad cykel kvar under granskningen.
- Statusnavigeringen varken sparar, ändrar utkastet eller skapar ett
  kvitto. Den gemensamma kartan innehåller Lo Berg och Alex privata
  utkast innehåller fortfarande Lo Lind och Oskickad cykel.

### UTKAST-18: hitta alla konfliktslag och läs varje underlags hela värden

**Syfte:** skilja objekt, samband och båda typdefinitionerna åt i status
och läsa tidigare, föreslagna och aktuella värden med rätt avsnitt.

**Användare:** Alex och Robin i skilda sessioner i samma hushåll.

**Förutsättningar:** Lo Exempel och Molnmusik samt ett samband mellan dem
finns sparade. Los typ har avsnittet Sparad ekonomi med den gemensamma
egenskapen skuld, benämnd Sparad skuld. Skulden är 1 200, känd och daterad
2026-09-01. Det egna textfältet Dold anteckning har ett påhittat värde.
Fältet kan tillfälligt visas när en anteckning behöver redigeras och döljas
igen innan respektive typförslag läggs i utkastet.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallen “UTKAST-18: status reaches all conflict kinds and preserves
complete snapshot values at 1440px”, samma titel med “390px”, “320px”
och “640px”. Det sista fallet använder ett 456 pixlar högt fönster.

**Steg:**

1. Alex ändrar Lo till Lo Lind, föreslår skuld 1 700 med känd säkerhet
   och datum 2026-09-03 samt en egen anteckning.
2. I samma privata utkast föreslår Alex objekttypens namn Min objekttyp,
   avsnittet Mitt ekonomiska avsnitt och skuldens visningsnamn Min skuld.
   Dölj anteckningsfältet med värdet kvar.
3. Alex föreslår också Min sambandstyp med riktningen **använder enligt
   mig**, samt osäker uppgift för sambandet från Lo till Molnmusik.
4. Robin föreslår Lo Berg, skuld 2 000 med osäker säkerhet och datum
   2026-09-02 samt en annan anteckning. Ändra båda typbeskrivningarna
   men behåll Sparad ekonomi och Sparad skuld. Dölj anteckningsfältet
   med värdet kvar och föreslå att sambandets mål är okänt. Spara allt.
5. Alex laddar om kartan utan att kasta sitt utkast. Sök efter ett namn som
   inte finns och kontrollera att fyra konflikter ändå räknas, även typerna.
   Stäng arbetspanelerna
   med kryssen. Välj **4 konflikter i ditt utkast** under hushållets namn
   med tangentbord och pekare. Kontrollera fokus på Konflikter i mitt utkast.
6. Använd tangentbordet för att besöka objekttyp, sambandstyp, samband
   och objekt från listan. Återgå till kartan mellan destinationerna.
7. Läs objektets tre underlag. Upprepa på telefon och i ett kort fönster.
8. Behåll den föreslagna objekttypen med tangentbordet medan konfliktlistan
   i hela utkastet är öppen. Fortsätt granska de återstående konflikterna.

**Förväntat resultat:**

- Konfliktlistans öppningskontroll är tydlig och går att träffa utan
  att aktivera knappen för hela utkastet intill.
- Varje val öppnar rätt ändringsrubrik med synligt, åtkomligt fokus.
  Sambandsnamnet visar riktning, båda objekten och den osäkra uppgiften.
- Det tidigare underlaget visar Sparad ekonomi och Sparad skuld 1 200.
  Förslaget visar Mitt ekonomiska avsnitt och Min skuld 1 700.
  Aktuellt sparat värde visar Sparad ekonomi och Sparad skuld 2 000,
  med osäkerheten och datumet från Robins sparande.
- Alla tre underlag innehåller sina anteckningar trots att fältet är
  dolt. Ingen uppgift försvinner eller får fel betydelse från ett annat
  underlags typdefinition.
- Hela sparandet är spärrat. Navigeringen ändrar inte kartan, privata
  förslag eller historik, och innehållet kräver ingen vågrät rullning.
- Efter typvalet har hela utkastets rubrik synligt fokus utan att döljas
  bakom status. De tre återstående konflikterna spärrar fortfarande
  sparandet. Valet ändrar bara det privata utkastet; kartan och historiken
  är oförändrade.

### UTKAST-19: rätta objektkonflikten och bevara ett oberoende förslag

**Syfte:** Skriva en egen rättelse utan att tappa annan redigering eller
oberoende sparade uppgifter, och kräva ett nytt uttryckligt sparande.

**Användare:** Alex och Robin i skilda sessioner i samma hushåll.

**Förutsättningar:** Lo Exempel finns sparad utan beskrivning. Alex har
namnförslaget Lo Lind i sitt privata utkast. Robin ändrar namnet till
Lo Berg, lägger till beskrivningen Spelar piano och sparar hela utkastet.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallet “UTKAST-19: an own object correction preserves staged independent
work and saved facts until a fresh save”.

**Steg:**

1. Alex öppnar Nytt objekt, skriver Oskickad cykel och beskrivningen Behåll den
   här texten. Välj Avbryt och tryck Escape i förlustdialogen. Kontrollera
   båda värdena och oförändrat utkast, lägg därefter hela formuläret i utkastet.
2. Välj konfliktlänken under hushållets namn och stäng dialogen med
   Escape. Öppna Lista, **Uppgifter för Lo Lind** och
   **Redigera valt objekt**.
3. Kontrollera rätt objektdialog och fokus i Namn. Ändra namnet till
   Lo Alm och välj **Lägg i utkastet och stäng**.
4. Öppna konfliktknappen, välj Visa aktuell jämförelse om kontrollen visas
   och kontrollera att valet av Lo Alm är nåbart utan att välja det.
   Stäng med Escape, öppna Lista och Uppgifter för Oskickad cykel.
   Kontrollera den bevarade beskrivningen.
5. Öppna Granska konflikter. Välj det egna namnet Lo Alm och den sparade
   beskrivningen Spelar piano, och välj **Lägg valen i utkastet**. Stäng
   med Escape och kontrollera kartan hos Robin före sparandet.
6. Spara Alex utkast och ladda om Robins karta.

**Förväntat resultat:**

- Redigera valt objekt öppnar det befintliga förslaget med fokus i namnfältet.
  Avbruten förlust bevarar cykelns text. Det oberoende cykelförslaget finns
  kvar medan Lo rättas och konflikten löses.
- Rättelsen och konfliktvalet ändrar bara Alex utkast. Inget kvitto
  skapas, och Robin ser fortfarande Lo Berg före det nya sparandet.
- Efter konfliktvalet innehåller förslaget både Lo Alm och den oberoende
  beskrivningen Spelar piano. Ett nytt uttryckligt sparande ger ett
  kvitto och gör just dessa uppgifter gemensamma.

### UTKAST-20: rätta ett samband med borttaget mål

**Syfte:** Välja ett nytt giltigt mål i ett konfliktförslag utan att
återuppliva det borttagna objektet eller spara andra förslag i förtid.

**Användare:** Alex och Robin i skilda sessioner i samma hushåll.

**Förutsättningar:** Lo Exempel, Molnmusik och Garaget finns sparade.
Alex föreslår Lo Exempel → Använder → Molnmusik med osäker uppgift,
och lägger det nya objektet Privat stol i samma privata utkast.
Robin tar bort Molnmusik och sparar. Upprepa på dator och telefon.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallen “UTKAST-20: a relationship correction replaces a deleted endpoint
and still requires a fresh save at 1440px”, samma titel med “390px”.

**Steg:**

1. Alex försöker spara hela utkastet. Kontrollera att inget sparas och
   hämta aktuellt underlag, eller ladda om sidan.
2. Stäng panelerna med kryssen, välj kartans konfliktlänk och öppna hela
utkastets konfliktlista och välj
   sambandet. Läs informationen om borttaget objekt. Behåll mitt förslag ska
   saknas.
3. Använd tangentbordet till **Rätta sambandet** och tryck Enter.
   Kontrollera fokus på Från objekt och förslagets riktning och säkerhet.
4. Välj Garaget som Till objekt. Molnmusik ska inte kunna väljas.
   Välj Lägg sambandet i mitt utkast och granska förslaget.
5. Kontrollera Robins karta före Alex nya sparbesked. Spara därefter
   hela Alex utkast och ladda om Robins karta.

**Förväntat resultat:**

- Försöket med borttaget mål sparar varken sambandet eller Privat stol.
  Statusens korrigering öppnar det befintliga privata sambandsförslaget.
- Rättelsen behåller samma samband, riktning och osäkra uppgift. Konflikten
  försvinner när målet är giltigt. Privat stol finns kvar i utkastet.
- Rättelsen skapar inget kvitto och ändrar inget i den gemensamma kartan.
  Först ett nytt uttryckligt sparande delar sambandet och stolen.
- Molnmusik förblir borttaget. Det nya sambandet går från Lo till Garaget.

### UTKAST-21: rätta typdefinitioner genom inställningarna

**Syfte:** Göra en egen rättelse av objekt- och sambandstyper, bevara
oberoende sparade uppgifter och kräva ett nytt sparbesked.

**Användare:** Alex och Robin i skilda sessioner i samma hushåll.

**Förutsättningar:** Ett hushåll med sparade objekt och typer. Alex föreslår
namnet Min typ för en befintlig typ. Robin ändrar samma typs namn till
Annans typ och beskrivningen till Oberoende typförklaring, och sparar.
Upprepa för objekttyp och sambandstyp, på dator och telefon.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallen “UTKAST-21: object-type correction opens retained settings and
preserves independent edits until a fresh save at 1440px”, samma titel med
“390px”, samt “UTKAST-21: relationship-type correction opens retained
settings and preserves independent edits until a fresh save at 1440px”,
samma titel med “390px”.

**Steg:**

1. Alex försöker spara hela utkastet. Kontrollera att inget sparas och
   hämta aktuellt underlag, eller ladda om sidan.
2. Välj kartans konfliktvarning och välj Min typ för rätt slags typ i
   utkastets konfliktlista.
   Läs det egna förslaget och Robins aktuella namn och beskrivning.
3. Använd tangentbordet till **Rätta objekttypen** eller
   **Rätta sambandstypen** och tryck Enter. Kontrollera sidan
   **Typer och egna fält**, rubrikens synliga fokus och rätt typformulär.
4. Kontrollera att formulärets namn är Min typ. Ändra det till Rättad typ
   och lägg typförslaget i utkastet.
5. Välj Tillbaka till kartan, öppna Lista och granska hela utkastet.
   Behåll den egna typdefinitionen. Kontrollera Robins karta före sparande.
6. Välj Spara hela utkastet och ladda om Robins karta.

**Förväntat resultat:**

- Rättelsen öppnar rätt befintligt formulär på den vanliga inställningssidan.
  Sparade objekt och samband förblir oförändrade genom hela flödet.
- Rättelsen och konfliktvalet ändrar bara Alex utkast. Annans typ och den
  oberoende beskrivningen är fortfarande gemensamma före ett nytt sparande.
- Konfliktvalet bevarar Oberoende typförklaring tillsammans med Rättad typ.
  Ett nytt uttryckligt sparande delar dessa uppgifter och skapar ett kvitto.

### UTKAST-22: konfliktval återför fokus till hela utkastet

**Syfte:** Fortsätta granskningen med tangentbord när konfliktens egna
valknappar försvinner utan att kartan sparas automatiskt.

**Användare:** Alex och Robin i skilda sessioner i samma hushåll.

**Förutsättningar:** Lo Exempel är sparat. Alex föreslår Lo Lind och
Robin sparar Lo Berg. Prova på telefon. Upprepa för båda konfliktvalen.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallen “UTKAST-22: a saved conflict choice returns focus to the draft
without saving” och “UTKAST-22: a proposed conflict choice returns focus
to the draft without saving”.

**Steg:**

1. Alex väljer kartans konfliktvarning och sedan Objekt: Lo Lind i
   utkastets konfliktlista.
2. Använd tangentbordet till Använd sparat värde eller Behåll mitt förslag,
   och tryck Enter. Ge inget sparbesked.
3. Kontrollera fokus, privat utkast, Robins sparade karta och historiken.

**Förväntat resultat:**

- Fokus hamnar på den synliga rubriken Hela mitt utkast när konfliktvalet
  är klart. Konfliktens valknappar försvinner och beskedet ber om granskning.
- Sparat värde tar bort namnförslaget. Eget förslag behåller Lo Lind i
  utkastet. Båda valen lämnar Lo Berg gemensamt sparat och skapar inget kvitto.

### UTKAST-23: fördröjt konfliktval bevarar senare sökfokus

**Syfte:** Fortsätta söka medan servern bekräftar ett privat konfliktval
utan att ett senare fokusval avbryts.

**Användare:** Alex och Robin i skilda sessioner i samma hushåll.

**Förutsättningar:** Samma namnkonflikt som i UTKAST-22. Testmiljön kan
fördröja svaret efter att den riktiga servern behandlar ett konfliktval.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallet “UTKAST-23: delayed conflict resolution preserves a newer search
and the private result”.

**Steg:**

1. Alex öppnar Lista och väljer Behåll mitt förslag. Fördröj svaret.
2. Kontrollera att valknappen är inaktiv. Skriv Lo i Sök objekt.
3. Släpp fram det riktiga svaret. Läs beskedet och kontrollera sökfältet,
   utkastet, Robins karta och historiken. Ge inget sparbesked.

**Förväntat resultat:**

- Sökfältet behåller texten Lo och synligt fokus efter att svaret kommer.
- Lo Lind finns i det privata utkastet. Lo Berg är fortfarande gemensamt
  sparat och ingen historikgrupp eller kvitto tillkommer.

### UTKAST-24: återfinn konfliktval och ett enda nytt sparkvitto

**Syfte:** Skilja ett beständigt privat konfliktval från ett gemensamt
sparande när deras svar försvinner på vägen till webbläsaren.

**Användare:** Alex och Robin i skilda sessioner i samma hushåll.

**Förutsättningar:** Lo Exempel är sparat. Alex föreslår Lo Lind och
det nya objektet Privat stol. Robin sparar Lo Berg med beskrivningen
Spelar piano. Testmiljön kan släppa fram en riktig förfrågan och avbryta
enbart svaret efter serverns behandling. Upprepa på dator och telefon.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
testfallen “UTKAST-24: lost resolution and save responses recover the private
choice and one fresh receipt at 1440px”, samma titel med “390px”.

**Steg:**

1. Alex öppnar Lista och väljer Behåll mitt förslag. Avbryt svaret efter
   att servern behandlar valet. Läs felet och kontrollera att sparande spärras.
2. Kontrollera Robins karta och historiken. Välj Hämta aktuellt underlag
   som Alex. Granska Lo Lind, Spelar piano och Privat stol i utkastet.
3. Ladda om Alex sida, öppna Lista och kontrollera att samma privata
   resultat finns kvar. Ge fortfarande inget sparbesked.
4. Välj Spara hela utkastet i Lista. Stäng panelerna och avbryt
   svaret efter att servern genomför sparandet.
5. Läs Sparutfall okänt. Välj Hämta samma kvitto igen. Kontrollera Robins
   karta, det tomma privata utkastet och den nya historikgruppen.

**Förväntat resultat:**

- Ett tappat konfliktvalssvar skapar inget sparförsök eller kvitto.
  Den gemensamma kartan behåller Lo Berg och saknar Privat stol.
- Uppdatering och omladdning återfinner Lo Lind, den oberoende beskrivningen
  och stolen i samma privata utkast. Ett nytt sparbesked krävs fortfarande.
- Det uttryckliga sparandet gör båda förslagen gemensamma tillsammans.
  Ett tappat sparkvitto spärrar ett nytt sparande tills utfallet kontrolleras.
- Återhämtningen ger exakt samma kvitto. Endast ett nytt sparförsök och
  en historikgrupp tillkommer; kartan sparas inte en andra gång.

### UTKAST-16: använd Navigation och utkastets återkoppling tillsammans

**Syfte:** Behålla åtkomst till personlig placering och sparande när båda
ytorna är synliga, även när förstoring kräver rullning.

**Användare:** Administratören.

**Förutsättningar:** Lo Exempel är sparad i kartan. Blå cykeln finns som
nytt privat förslag. Börja med stängd arbetsyta.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
testfallen “UTKAST-16: navigation and draft feedback keep lower controls
usable in both opening orders at 1440px”, samma titel med “640px” och “320px”.

**Steg:**

1. Markera Lo Exempel i kartan. Öppna **Navigera** från verktygen.
   Expandera verktygens namn om det behövs. Teckenförklaringen är synlig
   under hushållets namn och **Aktuell status** finns inte i verktygen.
2. Använd tangentbord och pekare för att flytta Lo i alla sex riktningar
   i Navigation.
   Rulla vid behov till de nedre kontrollerna.
3. Öppna Lista. Flytta fokus till **Spara hela utkastet** och kontrollera
   att knappen går att nå utan att spara. Det privata förslaget ska bestå.
4. Välj **Stäng navigering**. Kontrollera fokus på **Navigera**.
   Upprepa efter att först ha fokuserat hela utkastets sparknapp.
5. Upprepa på smal skärm och vid hög förstoring.

**Förväntat resultat:**

- Alla personliga flyttriktningar och hela utkastets sparknapp är
  åtkomliga i båda ordningarna, även när ytorna behöver rullas.
- Flyttningarna ändrar bara den personliga vyn. Kartans gemensamma
  innehåll och Blå cykelns privata förslag består utan sparförsök.
- Fokus följer den uttryckliga handlingen och går tillbaka till verktygen
  vid stängning. Navigation, återkoppling och verktygen täcker inte den kontroll
  som används.

## Bevarade konfliktval och kontrollerat utfall

UTKAST-49–56 använder en tillfällig installation med riktig SQLite och två
syntetiska användare: administratören Alex och medlemmen Robin. Starta från
repo-roten med `npm run build` och
`npx tsx scripts/manual-conflict-continuity.ts`. Öppna adressen som skrivs ut.
Alex är inloggad i det synliga fönstret; konsolkommandon för Robin använder
hans separata session. Inga externa AI-anrop eller medgivanden behövs.

Varje `new-*` skapar en ny tom installation och stänger föregående databas.
Använd kommandot före varje fall; behåll installationen inom fallet. Grundfallet
har Alex privata **Lo Lind**, **Min anteckning**, medan Robin har sparat
**Lo Berg**, **Robins anteckning**. Båda utgår från **Lo Exempel**.
`result` visar aktuellt privat utkast, gemensam karta och historik genom
offentlig
HTTP. `quit` stänger installationen och tar bort testdatabasen.

### UTKAST-49: behåll val mellan konflikter och vid återöppning

**Syfte:** Bevara varje posts val och spärren för inaktuell jämförelse.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-two`. Även tjänstens namn och beskrivning skiljer
sig.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
testfallet “UTKAST-49: switching conflicts and reopening preserves choices and
never clears another conflict’s stale guard”.

**Steg:**

1. Öppna **2 konflikter i ditt utkast**. Välj Alex namn och beskrivning för Lo.
2. Välj **Min musiktjänst** i konfliktlistan och välj Alex namn och beskrivning.
3. Stäng med Escape och öppna igen. Tjänstens val är kvar. Växla till Lo.
4. Kör `newer-name` medan Lo visas. Försök **Lägg valen i utkastet** och läs
   felet.
5. Växla till tjänsten, sedan tillbaka till Lo. Kontrollera båda posternas val.

**Förväntat resultat:**

- Valen för respektive post finns kvar över växling och återöppning.
- Lo visar inaktuellt underlag och kräver aktuell jämförelse. Växling till en
  annan
  post kan inte häva den spärren; tjänstens opåverkade val består.
- Ingen gemensam ändring eller nytt sparande görs av det avvisade försöket.

### UTKAST-50: gör bara om val för ändrade egenskaper

**Syfte:** Bevara oberoende val efter en samtidig ändring.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-base`.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
testfallen “UTKAST-50: refreshed conflict data clears only choices for
properties that actually changed” och “UTKAST-50: a later save after a lost
applied reply retains unchanged choices when reviewing the new conflict”.

**Steg:**

1. Öppna konflikten och välj Alex namn och beskrivning.
2. Kör `newer-name`. Försök lägga valen i utkastet; läs att underlaget ändrats.
3. Kör `check-error` och välj **Visa aktuell jämförelse**. Läs hämtningsfelet
   med fokus kvar i dialogen och båda valen bevarade.
4. Kör `network-ok` och visa aktuell jämförelse igen. Beskrivningen är
   fortfarande vald, namnet kräver val.
5. Välj Alex namn igen och lägg valen i utkastet. Kör `result`.
6. Börja om med `new-base` och `lose-applied`. Välj Alex två värden och
   bekräfta, stäng efter det oklara svaret och kör `newer-name`.
7. Öppna och kontrollera faktiskt utfall. Den nya konflikten kräver aktuell
   jämförelse; ingen lösningsbock visas. Visa jämförelsen och kontrollera att
   beskrivningen är vald medan namnet kräver nytt val. Kör `network-ok`
   innan du bekräftar igen.

**Förväntat resultat:**

- Bara det berörda namnvalet återställs. Beskrivningsvalet behålls.
- Det privata utkastet innehåller Lo Lind och Min anteckning mot nytt underlag.
- Den gemensamma kartan behåller Lo Ås och Robins anteckning. Inget sparande
  görs.

### UTKAST-51: pröva kombinationen igen efter ändrad typ eller referens

**Syfte:** Behålla opåverkade val utan att bekräfta en inaktuell eller ogiltig
kombination.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Börja med `new-type`, sedan en ny installation med
`new-reference`.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
testfallen “UTKAST-51: a changed object type revalidates mixed values while
unaffected choices remain”
och “UTKAST-51: a changed relationship reference refreshes its meaning without
clearing unchanged property choices”.

**Steg:**

1. I `new-type`, öppna konflikten. Välj Alex namn, beskrivning och **Min text**.
2. Kör `newer-type`: Robin sparar Mätobjekt och en ny förklaring för
   Anteckningsobjekt. Försök lägga valen i utkastet och visa aktuell jämförelse.
3. Namn och beskrivning är kvar. Välj Min text igen och den sparade typen
   **Mätobjekt**.
4. Läs felet. Välj Alex **Anteckningsobjekt** och lägg kombinationen i utkastet.
5. Kör `new-reference`. Öppna sambandskonflikten och välj Alex **Molnmusik**
   och **Osäkert uppgivet**.
6. Kör `newer-reference`. Försök bekräfta och visa aktuell jämförelse.
   Kontrollera det nya namnet **Ny musiktjänst** och de två valen. Bekräfta.

**Förväntat resultat:**

- Ändrad typ kräver aktuell jämförelse. Texten passar inte Mätobjekts numeriska
  fält; orsaken förklaras och bekräftelsen spärras utan automatisk ändring av
val.
- En giltig typkombination kan läggas i utkastet. Kartans sparade typ och värden
  består.
- Ändrad referens upptäcks trots oförändrat objekt-ID. Aktuellt namn visas,
  opåverkade egenskapsval behålls och prövas mot aktuellt underlag.
- Sambandet ändras bara i Alex privata utkast, inte i den gemensamma kartan.

### UTKAST-52: behåll val vid känd avvisning och återförsök efter kontroll

**Syfte:** Hantera ett nyare privat utkast utan att kasta val eller andra
förslag.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-base`.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
testfallet “UTKAST-52: a known version rejection retains choices and retries
only after a current comparison”.

**Steg:**

1. Välj Alex namn och beskrivning i konflikten.
2. Kör `newer-private`: en annan klient för Alex lägger Privat stol i utkastet.
3. Försök lägga konfliktvalen i utkastet. Läs avvisningen och kontrollera
   spärren. Kontrollera med skärmläsare att beskedet om nytt underlag bara
   annonseras en gång.
4. Visa aktuell jämförelse. Båda valen finns kvar. Bekräfta och kör `result`.

**Förväntat resultat:**

- Ett gammalt versionsförsök avvisas utan ändring; orsaken förklaras och valen
  består.
- Beskedet om nytt underlag har en enda aktiv kanal för annonsering.
- Efter aktuell jämförelse kan samma val bekräftas utan att göras om.
- Privat stol finns kvar. Bekräftelsen gör en enda privat ändring och skapar
  ingen historikgrupp.

### UTKAST-53: kontrollera ett tappat svar efter genomförd ändring

**Syfte:** Återfinna faktiskt utfall utan att skicka samma lösning två gånger.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-base`, sedan `lose-applied`.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
testfallen “UTKAST-53: a lost resolution reply stays reachable after the last
conflict disappears in Karta (proposed) at 1280px”, “UTKAST-53: a lost
resolution reply stays reachable after the last conflict disappears in Karta
(proposed) at 320px”, “UTKAST-53: a lost resolution reply stays reachable after
the last conflict disappears in Karta (saved) at 1280px”, “UTKAST-53: a lost
resolution reply stays reachable after the last conflict disappears in Karta
(saved) at 320px”, “UTKAST-53: a lost resolution reply stays reachable after the
last conflict disappears in Tabell (proposed) at 1280px”, “UTKAST-53: a lost
resolution reply stays reachable after the last conflict disappears in Tabell
(proposed) at 320px”, “UTKAST-53: a lost resolution reply stays reachable after
the last conflict disappears in Tabell (saved) at 1280px”, “UTKAST-53: a lost
resolution reply stays reachable after the last conflict disappears in Tabell
(saved) at 320px”,
“UTKAST-53: another client consuming the draft cannot turn an unknown saved
choice into private success” och “UTKAST-53: another client consuming the
draft cannot turn an unknown proposed choice into private success”.

**Steg:**

1. Välj Alex namn och beskrivning, bekräfta och läs det oklara utfallet.
2. Stäng med Escape och öppna igen. Invänta att konfliktantalet försvinner
   när aktuellt utkast hämtas. Stäng igen utan att kontrollera.
3. Välj **Visa konfliktvalet** och sedan **Kontrollera om valet lades i utkastet**.
   Kör `result`. Upprepa från `new-base` i Tabell med `lose-applied`.
4. Upprepa även på Karta och Tabell med båda Robins sparade värden valda.
   Kontrollera att samma kontroll återfinner borttaget privat förslag.
5. Upprepa båda utfallen från Karta och Tabell på smal skärm.
6. Börja om med `new-base`, `newer-private` och `lose-unsent`. Välj båda
   sparade värdena och bekräfta. Stäng efter det oklara svaret och kör
   `save-elsewhere`: en annan klient för Alex löser med föreslagna värden
   och sparar hela utkastet. Öppna och kontrollera faktiskt utfall.
7. Upprepa steg 6 med `lose-applied` och Alex föreslagna värden valda.

**Förväntat resultat:**

- Återöppning häver inte spärren för ny bekräftelse. Uppföljningen finns kvar
  på Karta och Tabell även när sista konflikten försvinner, och öppnar samma
  kontroll utan automatisk upprepning. Dialogens rubrik får fokus vid öppning.
- Kontrollen läser utkastet och visar den genomförda privata lösningen med bock.
  Postens namn och typ finns kvar; **Vald lösning** är en tillgänglig status.
- Bara en privat ändring har gjorts. Alex val finns i utkastet; när båda
  sparade värden valdes är i stället det berörda förslaget borttaget.
  Kartan och historiken har inte ändrats och inget gemensamt sparkvitto har skapats.
- Om en annan klient har sparat och tömt utkastet visas i stället aktuellt
  besked i läsläge, utan privat lösningsbock eller uppmaning att upprepa
  åtgärden. Det gemensamma sparandet framställs inte som osparat.
  Kontrollen ändrar varken det tömda utkastet, kartan eller historiken.

### UTKAST-54: kontrollera en utebliven ändring före nytt försök

**Syfte:** Behålla val även när kontrollen först misslyckas.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-base`, sedan `lose-unsent`. Upprepa på smal skärm.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
testfallen “UTKAST-54: an unsent resolution is verified before retrying with the
retained choices at 1280px”
och “UTKAST-54: an unsent resolution is verified before retrying with the
retained choices at 320px”.

**Steg:**

1. Välj Alex namn och beskrivning, bekräfta och läs det oklara utfallet.
2. Stäng och öppna igen. Kör `check-error` och välj **Kontrollera om valet lades
   i utkastet**.
3. Läs att utfallet fortfarande är oklart. Kör `network-ok` och kontrollera
   igen.
4. Läs att ändringen inte genomfördes. Bekräfta med de bevarade valen och kör
   `result`.

**Förväntat resultat:**

- Misslyckad kontroll och återöppning ger aldrig tillstånd att upprepa åtgärden.
- En lyckad faktisk kontroll av utebliven ändring tillåter ett nytt försök.
- Valen finns kvar på dator och smal skärm. Ett enda genomfört försök ändrar
  det privata utkastet; den gemensamma kartan består.

### UTKAST-55: upptäck nytt underlag vid återöppning

**Syfte:** Förhindra bekräftelse mot uppgifter som ändrats medan dialogen var
stängd.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-base`.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
testfallen “UTKAST-55: reopening discovers new saved data before stale choices
can be confirmed” och “UTKAST-55: a conflict resolved by another client becomes
read-only after reopening”.

**Steg:**

1. Välj Alex namn och beskrivning. Stäng med Escape.
2. Kör `newer-name`. Öppna konflikten igen och läs beskedet om nytt underlag.
   Kontrollera med skärmläsare att beskedet bara annonseras en gång.
3. Visa aktuell jämförelse och granska kvarvarande val. Kör `result`.
4. Börja om med `new-base`. Välj Alex två värden och stäng. Kör
   `resolve-elsewhere`: en annan klient för Alex väljer de sparade värdena.
   Öppna igen och kontrollera att den tidigare jämförelsen nu är i läsläge.

**Förväntat resultat:**

- Aktuellt underlag hämtas innan någon gammal lösning kan bekräftas.
- Beskedet om nytt underlag har en enda aktiv kanal för annonsering.
- Bara namnvalet behöver göras om. Beskrivningen behålls.
- Om en annan klient redan har löst konflikten visas aktuellt besked med
  fokus kvar på dialogens rubrik. Ingen gammal bekräftelse erbjuds.
- Ingen öppning, stängning eller jämförelse ändrar utkastet eller den gemensamma
  kartan.

### UTKAST-56: följ väntan och oklart utfall utan fokusstöld

**Syfte:** Ge ett tillgängligt besked och spärra upprepning över dialogens
livstid.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-base`, `hold` och `lose-applied`.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
testfallet “UTKAST-56: pending and unknown conflict outcomes have one accessible
status without stealing later focus”.

**Steg:**

1. Välj Alex namn och beskrivning och bekräfta. Läs väntestatusen.
2. Försök växla konflikt, stänga med krysset och använda Escape.
3. Kör `release`, läs det oklara utfallet och stäng med Escape.
4. Flytta tangentbordsfokus till Tabell i kartverktygen. Kontrollera att det
   stannar där.
5. Öppna konflikten och kontrollera faktiskt utfall.

**Förväntat resultat:**

- Under väntan kan begäran inte upprepas och dialogen kan inte lämnas.
- Vid oklart utfall går det att stänga. Ett beständigt tillgängligt statusbesked
  finns utanför dialogen och flyttar inte fokus från senare arbete.
- Bara en av konfliktflödets statusregioner är aktiv för uppläsning åt gången.
  Återöppning återställer inte bekräftelse; faktisk kontroll visar den
genomförda lösningen.

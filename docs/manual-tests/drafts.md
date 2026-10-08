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

Objekt redigeras från **Tabell** med radens **Redigera [namn]**.
**Nytt objekt** i kartans verktyg öppnar hela objektformuläret. Välj
**Lägg i utkastet och stäng** för att skicka hela formuläret.
Samband öppnas från Tabell med **Samband för [namn]** och **Redigera
samband** eller **Nytt samband**. Välj **Lägg i utkastet** och
**Stäng samband** före fortsatt arbete. Läsande översikter stängs med
krysset. Definitioner öppnas i **Inställningar → Typer och egna fält**;
välj **Tillbaka till kartan** före granskning.

Granska genom **Skriv till Skyttel → Visa utkastet**. Välj radens
**Visa förslaget: [namn]** för fullständigt tidigare underlag och förslag.
Stäng läsningen med krysset. Utkastets sparikon öppnar **Spara utkastet**
och skickar hela utkastet direkt. Vänta på **Utkastet är sparat** och
stäng textvyn före nästa arbete i Tabell eller Karta. Inga samtal eller
AI-medgivanden behövs för detta arbete.

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
[installationsguiden](../operations/installation.md),
utan demodata:

1. Logga in som den konfigurerade administratören och skapa ett hushåll.
2. Skapa personen **Lo Exempel** och tjänsten **Molnmusik** med
   **Nytt objekt**, **Namn**, **Objekttyp** och
   **Lägg i utkastet och stäng**. Välj **Spara hela utkastet**.
3. Ge medlemmen tillgång för fallen som kräver två användare. Kontrollera
   att båda ser objekten och har **Utkastet är tomt** i sina egna utkast.
4. Använd ett nytt tomt testhushåll inför varje fall. Behåll databasen vid
   omladdning och omstart inom fallet.

UTKAST-12–14 använder ett nytt tomt hushåll utan de två förberedda
objekten. UTKAST-14 behöver även en inbjuden medlem i en separat
webbläsarprofil och konfigurerat tal och text enligt
[samtalsfallen](voice-assistant.md).
Externa prov kräver den privata
konfiguration och de medgivanden som anges där.

## Privata utkast

### UTKAST-36: spara hela utkastet direkt utan samtal

**Syfte:** Bekräfta ett enda atomiskt sparande från utkastets sparikon.

**Användare:** Den syntetiska administratören Alex Exempel.

**Förutsättningar:** Starta enligt
[vanligt sparande](save-preparation.md#vanligt-sparande) på en dator med
grafisk webbläsare. Den öppnar en separat installation med riktig SQLite,
inloggad administratör och förslaget Alex blå cykel. Ingen AI-leverantör är
konfigurerad.
Terminalens kommandon styr bara leveransen av riktiga HTTP-svar. Skriv
`new-draft` inför varje nytt fall och `quit` efter provningen.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
UTKAST-36.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-save.spec.ts",
    "caseId": "UTKAST-36"
  },
  "reference": "1440 × 1000; hållen leverans skyddar väntan före kvitto.",
  "outcomes": [
    "Modalen öppnas genast med fokus på rubriken **Spara utkastet** och texten **Sparar utkastet…**. Bara krysset och Escape stänger den. Förslaget ligger kvar medan kvittot saknas.",
    "Bekräftat sparande tömmer utkastet, stänger modalen och återger fokus till utkastets rubrik när sparikonen är inaktiv.",
    "**Utkastet är sparat** visas i tre sekunder. En enda artig statusregion behåller beskedet när den visuella toasten försvinner. Faktisk uppläsning kontrolleras separat med mänsklig skärmläsarprovning.",
    "Automationen kontrollerar separat exakt ett genomfört sparförsök och ett motsvarande historikkvitto. Inget samtal startas och inget medgivande efterfrågas."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Skriv `hold` i terminalen. Öppna **Utkast** och välj **Spara hela utkastet**.
2. Läs sparmodalen och prova dess tangentbordsfokus.
3. Skriv `release`. Läs bekräftelsen, vänta tre sekunder och läs tomt utkast.

**Separat tekniskt underlag:** Integrationstestet jämför utkastet före och
efter leveransen, kräver ett enda genomfört försök och jämför hela kvittot
med den enda historikposten. Operatören kan samla samma underlag med
`result` före steg 3 och efter bekräftelsen. Råa identifierare och
jämförelser av interna uppgifter ingår inte i de vanliga UI-stegen.

**Förväntat resultat:**

- Modalen öppnas genast med fokus på rubriken **Spara utkastet** och texten
  **Sparar utkastet…**. Bara krysset och Escape stänger den. Förslaget ligger
  kvar medan kvittot saknas.
- Bekräftat sparande tömmer utkastet, stänger modalen och återger fokus till
  utkastets rubrik när sparikonen är inaktiv.
- **Utkastet är sparat** visas i tre sekunder.
  En enda artig statusregion behåller beskedet när den visuella toasten
  försvinner.
  Faktisk uppläsning kontrolleras separat med mänsklig skärmläsarprovning.
- Automationen kontrollerar separat exakt ett genomfört sparförsök och ett
  motsvarande historikkvitto.
  Inget samtal startas och inget medgivande efterfrågas.

### UTKAST-37: stäng ett väntande mobilt sparande och fortsätt annat arbete

**Syfte:** Behålla uppföljning och korrekt fokus mellan karta och tabell.

**Användare:** Alex Exempel i provinstallationen för UTKAST-36.

**Förutsättningar:** Välj `new-draft` och `hold`. Använd mobil visning.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
UTKAST-37.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-save.spec.ts",
    "caseId": "UTKAST-37"
  },
  "reference": "390 × 844; smal modal, båda vyerna och senare sökfokus.",
  "outcomes": [
    "Tangentbordet cirkulerar mellan modalens tillgängliga kontroller och lämnar inte den öppna modalen. Text och kontroller ryms i smal mobil visning.",
    "Stängning avbryter inte sparandet. Uppföljningen är nåbar i båda vyerna; efter stängning återgår fokus till **Visa sparandet**.",
    "Senare bekräftelse behåller fokus i tabellens sökfält. Toasten tar inte fokus. Automationen kontrollerar separat tomt utkast, exakt ett sparande och en historikpost."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna utkastet och spara. Prova Tab och Skift+Tab och stäng med Escape.
2. Stäng textvyn. Öppna **Visa sparandet** i kartan och stäng med krysset.
3. Öppna **Tabell**, välj **Visa sparandet** och stäng med Escape.
4. Flytta fokus till **Sök objekt i tabellen** och skriv `release` i terminalen.
5. Invänta bekräftelsen och fortsätt skriva i sökfältet utan att klicka på
   det igen.

**Separat tekniskt underlag:** Integrationstestet kräver tomt utkast, ett
enda avslutat sparförsök och en historikpost. Operatören kan samla detta
underlag med `result` efter bekräftelsen. Det är ingen vanlig UI-kontroll.

**Förväntat resultat:**

- Tangentbordet cirkulerar mellan modalens tillgängliga kontroller och
  lämnar inte den öppna modalen. Text och kontroller ryms i smal mobil visning.
- Stängning avbryter inte sparandet. Uppföljningen är nåbar i båda vyerna;
  efter stängning återgår fokus till **Visa sparandet**.
- Senare bekräftelse behåller fokus i tabellens sökfält. Toasten tar inte fokus.
  Automationen kontrollerar separat tomt utkast, exakt ett sparande och en
  historikpost.

### UTKAST-38: kontrollera samma försök efter ett tappat sparbesked

**Syfte:** Skilja okänt utfall från bekräftad framgång utan att spara två
gånger.

**Användare:** Alex Exempel i provinstallationen för UTKAST-36.

**Förutsättningar:** Välj `new-draft` och `lost-response` i terminalen.
Operatören använder den separat körbara
[hållningen av kontrollsvaret](save-preparation.md#vanligt-sparande)
med `hold-check` före steg 4 och `release-check` när vänteläget har lästs.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
UTKAST-38.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-save.spec.ts",
    "caseId": "UTKAST-38"
  },
  "reference": "Tabell; tappat svar efter genomförd transaktion.",
  "outcomes": [
    "Okänt utfall behåller förslagen och gör inget påstående om framgång. Kastande verifieras även tillsammans med dess fullständiga flöde.",
    "Kontrollen visar **Kontrollerar sparandet…**. Fokus flyttas till krysset medan kontrollknappen saknas, och till tabellens rubrik när bekräftelsen tar bort uppföljningsknappen.",
    "Automationen kontrollerar separat samma beständiga försöks-ID, ett sparanrop, ett genomfört försök och en historikpost. Ingen AI eller samtalsstart krävs."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Spara från Utkast och läs **Sparandet kunde inte bekräftas.** Stäng med
   Escape.
2. Kontrollera att förslaget ligger kvar i klienten och att nytt sparande
   och kastande är spärrade.
3. Stäng textvyn, öppna Tabell och välj **Visa sparandet**.
4. Låt operatören hålla kontrollsvaret enligt förberedelsen. Välj
   **Kontrollera sparandet igen** och läs **Kontrollerar sparandet…**.
   Kontrollknappen ska försvinna och fokus återgå till krysset.
   Låt operatören släppa kontrollsvaret och läs bekräftelsen. Fokus ska
   återgå till tabellens rubrik när uppföljningsknappen försvinner.

**Separat tekniskt underlag:** Integrationstestet kontrollerar att servern
redan har genomfört sparandet trots klientens okända utfall. Det jämför
sedan samma beständiga försöks-ID och hela kvittot efter kontrollen och
kräver ett enda sparanrop och en historikpost. Operatören kan samla
serverunderlaget med `result` efter steg 2 och efter steg 4. De råa
jämförelserna ingår inte i UI-stegen.

**Förväntat resultat:**

- Okänt utfall behåller förslagen och gör inget påstående om framgång.
  Kastande verifieras även tillsammans med dess fullständiga flöde.
- Kontrollen visar **Kontrollerar sparandet…**. Fokus flyttas till
  krysset medan kontrollknappen saknas, och till tabellens rubrik när
  bekräftelsen tar bort uppföljningsknappen.
- Automationen kontrollerar separat samma beständiga försöks-ID, ett
  sparanrop, ett genomfört försök och en historikpost. Ingen AI eller
  samtalsstart krävs.

### UTKAST-39: återuppta ett registrerat sparförsök efter omladdning

**Syfte:** Nå resultatet utan utkastikon och avsluta en inaktuell oklar
uppföljning.

**Användare:** Alex Exempel i provinstallationen för UTKAST-36.

**Förutsättningar:** Terminalkommandot `pending-attempt` registrerar ett
verkligt väntande försök genom offentlig HTTP och laddar om sidan. Automatisk
nätkontroll blockeras tills du väljer `network-ok`.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
UTKAST-39.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-save.spec.ts",
    "caseId": "UTKAST-39"
  },
  "reference": "Tomt utkast; beständigt väntande försök avvisas efter omladdning.",
  "outcomes": [
    "Uppföljningen överlever omladdning utan samtal, medgivande eller AI.",
    "Ett tomt utkast avvisas med **Utkastet kunde inte sparas.** Modalens enda knapp är krysset. Avvisningen förblir läsbar efter stängning och återöppning; inget gemensamt innehåll eller historikkvitto skapas."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Välj `new-empty` och `pending-attempt`. Ladda om sidan igen.
2. Kontrollera att Utkast-ikonen saknas men **Visa sparandet** finns.
   Öppna den och välj **Kontrollera sparandet igen**.
3. Läs det avvisade utfallet. Stäng med Escape, ladda om sidan och öppna
   uppföljningen igen.

**Separat tekniskt underlag:** Integrationstestet kontrollerar samma
beständiga försök över omladdningen, dess avvisning och att varken gemensamt
innehåll eller historikkvitto skapas. Operatören kan samla underlaget med
`result` efter steg 3; det ingår inte i de vanliga UI-stegen.

**Förväntat resultat:**

- Uppföljningen överlever omladdning utan samtal, medgivande eller AI.
- Ett tomt utkast avvisas med **Utkastet kunde inte sparas.** Modalens enda
  knapp är krysset. Avvisningen förblir läsbar efter stängning och återöppning;
  inget gemensamt innehåll eller historikkvitto skapas.

### UTKAST-40: skilj avvisning från hämtningsfel efter ett bekräftat kvitto

**Syfte:** Bevara både bekräftad framgång och osparade förslag vid rätt sorts
fel.

**Användare:** Alex Exempel i provinstallationen för UTKAST-36.

**Förutsättningar:** Välj `new-draft`. Versionskonflikten har ett separat
fall, UTKAST-102.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
UTKAST-40.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-save.spec.ts",
    "caseId": "UTKAST-40"
  },
  "reference": "Verifierat kvitto följt av misslyckad karthämtning.",
  "outcomes": [
    "Ett bekräftat kvitto stänger modalen och tömmer det sparade utkastet även om kartan inte kan hämtas. Felet förblir nåbart. Senare hämtning varken startar ett nytt sparförsök eller spelar upp det gamla beskedet igen."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Välj `refresh-failure` och spara från Utkast. Läs tomt utkast och
   bekräftelsen.
2. Stäng textvyn och läs kartans hämtningsfel. Vänta tills toasten försvinner.
3. Välj `network-ok` och **Hämta aktuellt underlag**. Läs att felet
   försvinner utan en ny sparbekräftelse.

**Separat tekniskt underlag:** Integrationstestet kontrollerar tomt utkast
och ett enda genomfört sparförsök efter karthämtningen. Operatören kan
samla samma underlag med `result` efter steg 3. Det är ingen UI-kontroll.

**Förväntat resultat:**

- Ett bekräftat kvitto stänger modalen och tömmer det sparade utkastet även
  om kartan inte kan hämtas. Felet förblir nåbart. Senare hämtning varken
  startar ett nytt sparförsök eller spelar upp det gamla beskedet igen.

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
`npx tsx scripts/manual-draft-removal.ts --chrome`. Kommandot öppnar en separat
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
UTKAST-90.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-review.spec.ts",
    "caseId": "UTKAST-90"
  },
  "reference": "1440 × 1000; fullständig läsning utan AI eller medgivande.",
  "outcomes": [
    "Utkastet öppnas utan samtal eller medgivandedialog trots att AI saknas.",
    "Alla fyra förslagsslag kan läsas fullständigt. Förslagen och den sparade kartan ändras inte av läsning.",
    "Läsdialogen börjar på rubriken. Tab stannar i dialogen; bakomliggande innehåll är inaktivt. Krysset är dess enda synliga stängkontroll. Escape och krysset återför fokus till radens öppningsknapp.",
    "Verklig olöst identitet eller obesvarad fråga har feltext och symbol. Giltiga okända, osäkra och ospecificerade uppgifter får ingen felvarning."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **Utkast** i verktygsfältet vid 1440 × 1000 pixlar.
2. Läs tabellens Symbol, Namn, Typ och Vad som ändras.
3. Öppna **Alex blå cykel** med tangentbord. Läs sparade och föreslagna
   värden, hela beskrivningen, Ramnummer och ekonomiska uppgifter.
4. Prova Tab, Skift+Tab, krysset och Escape. Öppna därefter ett samband,
   **Utkastfordon** och **Granskar**. Läs deras dolda egna fält och riktning.
5. Kontrollera fel vid **Olöst fordon** och det olösta sambandet. Läs även
   Okänt, Uttryckligen inget, Osäkert uppgivet och Ospecificerat objekt.

**Förväntat resultat:**

- Utkastet öppnas utan samtal eller medgivandedialog trots att AI saknas.
- Alla fyra förslagsslag kan läsas fullständigt.
  Förslagen och den sparade kartan ändras inte av läsning.
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
UTKAST-91.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-review.spec.ts",
    "caseId": "UTKAST-91"
  },
  "reference": "Tomt och typbegränsat utkast, kontrollerad modell.",
  "outcomes": [
    "Tomt utkast är åtkomligt även när verktygsfältets Utkast-ikon saknas. Öppning startar inget samtal och begär inget medgivande.",
    "Oskickad text finns kvar efter stängning och vybyte. Första Skicka kräver medgivande, skickar exakt meddelandet en gång och tömmer fältet efter bekräftat mottagande.",
    "Ett förslag som endast gäller en typ visar den avskilda Utkast-ikonen. Den öppnar hela utkastet direkt även utan synliga kartförslag."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **Skriv till Skyttel** och **Visa utkastet**. Läs tomt utkast.
2. Skriv **Behåll å, ä och ö i mitt meddelande**, stäng textvyn,
   besök Tabell och öppna textvyn igen.
3. Välj **Skicka**, godkänn medgivandet och invänta **Ett provsvar.**
4. Lägg en ny objekttyp i utkastet via Inställningar → Typer och egna
   fält. Återgå till hushållsarbetet, ladda om och öppna **Utkast**.

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
UTKAST-27.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-review.spec.ts",
    "caseId": "UTKAST-27"
  },
  "reference": "1440 × 1000; historiska statusar, bilder och egna fältnamn.",
  "outcomes": [
    "Sparade objektet och sambandet visar Upphört och Följ slutdatum. Förslagen visar Aktuellt och Gäller fortfarande trots samma gamla slutdatum. Giltighet och status är markerade som ändrade.",
    "Båda verkliga profilbilderna visas och bildändringen markeras även när båda sidorna har en bild. Bilderna skiljer sig i färg.",
    "Beskrivningen har respektive typs eget namn och markerad ändring. Föreslagen beskrivning och båda prisvärdena visar Ej uppgivet. Oförändrat saknat pris markeras inte som ändrat. Dolda egenskaper kan läsas.",
    "Läsningen ändrar inget underlag och startar inget samtal eller medgivande."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **Utkast** och **Blå cykel** vid 1440 × 1000 pixlar.
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

**Syfte:** Granska konflikten från Tabell och sedan Karta med nytt underlag; kombinera
värden från båda sidor med tydligt fokus och oförändrad gemensam karta.

**Användare:** Administratören och en inbjuden medlem i skilda
webbläsarprofiler. Använd medlemmens verkliga förnamn i jämförelsen.

**Förutsättningar:** Ett nytt tomt testhushåll med Lo Exempel och
Molnmusik enligt den allmänna förberedelsen. Administratören lägger
namnet Lo Lind, beskrivningen Min anteckning, Ospecificerat objekt och
Gäller fortfarande i sitt utkast. Medlemmen
sparar Lo Berg med beskrivningen Robins anteckning efter detta förslag.
Ladda om administratörens sida. Använd 1440 × 900 pixlar.

**Integrationstest:**
[conflict-properties.spec.ts](../../tests/integration/conflict-properties.spec.ts),
UTKAST-28.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-properties.spec.ts",
    "caseId": "UTKAST-28"
  },
  "reference": "1440 × 900; Tabell och därefter Karta med en ny konflikt och tangentbord; aktiva blandade egenskapsval.",
  "outcomes": [
    "Rubriken får fokus vid öppning. Tangentbordsfokus stannar i dialogen. Bakgrunden är inaktiv. Valbara värden har ramar och valda värden har starkare ramar.",
    "Alla skiljande egenskaper kräver aktiva val. Identiska värden behöver inget val och visas som vanlig text. Resultatet visar Lo Lind och Robins anteckning tillsammans, med uppgift om vilken sida valda värden kommer från.",
    "Bara utkastet ändras. Kartan visar fortfarande Lo Berg och samma beskrivning som medlemmen sparar. Historiken får ingen ny sparad ändring.",
    "Konfliktlistan behåller typ och namn med bock till höger och en enda tillgänglig status. Inga värden klipps på telefon.",
    "När den sista konflikten är löst försvinner ingången. Stängning återför fokus till kartverktygen. En kvarvarande ingång får fokus annars."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Välj Tabell och öppna **1 konflikt i ditt utkast** under hushållets namn.
2. Kontrollera rubrikens fokus och de två rutorna **Sparat i kartan nu**
   och **Ditt förslag**. Läs förklaringen med medlemmens förnamn.
   Tryck Shift+Tab och Tab; fokus ska stanna i dialogen.
3. Välj ditt namn Lo Lind. Kontrollera att bekräftelsen är spärrad.
4. Välj den sparade beskrivningen Robins anteckning och Identifierat
   objekt. Välj Gäller fortfarande från ditt förslag. Läs **Resultat av valen**.
5. Välj **Lägg valen i utkastet**. Läs status och konfliktlistans bock.
6. Stäng med Escape. Läs den sparade personen i tabellen och ditt utkast.
7. Förbered konflikten igen i ett nytt hushåll med samma värden. Öppna den
   från Karta med Enter. Använd Tab och Shift+Tab; försök nå verktygen bakom
   dialogen. Välj samma fyra värden med Enter och lägg valen i utkastet.
   Läs resultat och status, stäng med Escape och kontrollera kartverktygens
   fokus. Kartan och historiken ska vara oförändrade även efter denna väg.

**Förväntat resultat:**

- Rubriken får fokus vid öppning. Tangentbordsfokus stannar i dialogen.
  Bakgrunden är inaktiv. Valbara värden har ramar och valda värden har
  starkare ramar.
- Alla skiljande egenskaper kräver aktiva val. Identiska värden behöver
  inget val och visas som vanlig text. Resultatet visar Lo Lind och Robins
  anteckning tillsammans, med uppgift om vilken sida valda värden kommer från.
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
UTKAST-29.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-properties.spec.ts",
    "caseId": "UTKAST-29"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; ogiltiga sambandsval behålls tills kombinationen rättas.",
  "outcomes": [
    "Den ogiltiga kombinationen förklaras och bekräftelsen är spärrad. Ingen annan egenskap ändras och valen finns kvar.",
    "Den rättade kombinationen blir möjlig att bekräfta. Utifrån utkastet är målobjektet Molnmusik och uppgiften Osäkert uppgivet. Kartan behåller det som medlemmen sparar tills ett separat sparande genomförs.",
    "Servern avvisar samma ogiltiga kombination även från en äldre klient."
  ]
}
```
<!-- markdownlint-enable MD013 -->

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

UTKAST-30 är pensionerat och får inte återanvändas.
UTKAST-03 behåller markerat val vid avvisning, spärrad bekräftelse efter
aktuell jämförelse och Escape med fokus tillbaka till konfliktknappen,
innan nya val och ett uttryckligt sparande görs.

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
UTKAST-31.

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-review.spec.ts",
    "caseId": "UTKAST-31"
  },
  "reference": "320 × 740; långa obrutna fältnamn får inte dölja värden.",
  "outcomes": [
    "Hela egenskapsnamnen bryts och kan läsas utan sidledsrullning i dialogen.",
    "Escape återför fokus till radens läsknapp. Läsningen ändrar inga förslag."
  ]
}
```

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
UTKAST-32.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-review.spec.ts",
    "caseId": "UTKAST-32"
  },
  "reference": "Utgånget och framtida objekt samt samband; faktisk giltighet mot uttrycklig status.",
  "outcomes": [
    "Alla fyra rader visar Status: Följ slutdatum → Gäller fortfarande.",
    "Det utgångna objektet och dess samband visar dessutom Gäller: Upphört → Aktuellt. Framtida uppgifter får ingen falsk giltighetsändring; den uttryckliga statusändringen syns ändå.",
    "Den fullständiga läsningen visar samma betydelser som sammanfattningen. De fyra kolumnerna är kvar. Läsningen ändrar inga förslag eller sparade uppgifter och Escape återför fokus till den använda läsknappen."
  ]
}
```
<!-- markdownlint-enable MD013 -->

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

### UTKAST-33: läs långa objektnamn i objekt- och sambandskonflikter

**Syfte:** Läsa hela namnet i konfliktens rubrik och lista på smal skärm.

**Användare:** Alex och Lo i skilda webbläsarprofiler med tillgång till
hushållet.

**Förutsättningar:** Ett nytt hushåll med ett objekt vars namn består av
Föremålsnamn upprepat fjorton gånger utan mellanslag, och objektet Molnmusik.
Spara båda. Gör varje delprov i ett nytt hushåll enligt allmän förberedelse.

**Integrationstest:**
[conflict-properties.spec.ts](../../tests/integration/conflict-properties.spec.ts),
UTKAST-33.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-properties.spec.ts",
    "caseId": "UTKAST-33"
  },
  "reference": "320 × 900, objektkonflikt; långt obrutet namn.",
  "outcomes": [
    "Namnet bryts och hela innehållet kan läsas utan sidledes rullning.",
    "Escape återför fokus. Läsningen ändrar varken kartan eller utkastet."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Alex föreslår en ny beskrivning av objektet med det långa namnet.
   Lo sparar en annan beskrivning av samma objekt.
2. Använd 320 × 900 pixlar och öppna **1 konflikt i ditt utkast**.
   Läs hela namnet i rubriken och konfliktlistan utan sidledes rullning.
3. Stäng med Escape och kontrollera att konfliktknappen får fokus.

**Förväntat resultat:**

- Namnet bryts och hela innehållet kan läsas utan sidledes rullning.
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
UTKAST-34.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-properties.spec.ts",
    "caseId": "UTKAST-34"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; bevara typens egna benämningar i konflikt och resultat.",
  "outcomes": [
    "Båda sidor och resultatet visar Anteckningar och Avtalat pris, utan att ersätta dem med Beskrivning eller Pris.",
    "Utkastet innehåller Egen anteckning och 240 efter valet."
  ]
}
```
<!-- markdownlint-enable MD013 -->

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

**Syfte:** Bevara korrekt författare när senare sparanden ändrar andra
egenskaper.

**Användare:** Alex, Lo och Robin i tre skilda webbläsarprofiler med egna
konfigurerade inloggningar och tillgång till samma hushåll.

**Förutsättningar:** Ett nytt hushåll med Lo Exempel utan beskrivning.
De tre användarna är aktuella medlemmar; demodatans historiska Robin är
inte en inloggning. Använd faktiska förnamn om profilerna har andra namn.

**Integrationstest:**
[conflict-properties.spec.ts](../../tests/integration/conflict-properties.spec.ts),
UTKAST-35.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-properties.spec.ts",
    "caseId": "UTKAST-35"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; ange den verkliga spararen för varje ändrad egenskap.",
  "outcomes": [
    "Namnraden anger Lo som sparare, även efter Alex senare sparande.",
    "Beskrivningsraden anger Alex. Författarnamn hör till den ändrade egenskapen och ersätts inte av hela objektets senaste sparare.",
    "Efter Robins senare ändring anges samma verkliga sparare, utan att hävda att deras tidigare sparanden sker efter det nya förslaget."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Robin lägger namnet Eget namn och beskrivningen Egen text i sitt utkast.
2. Lo ändrar enbart objektets namn till Lo Berg och sparar.
3. Alex ändrar enbart beskrivningen till Alex text och sparar senare.
4. Robin öppnar **Granska konflikter** och läser den sparade sidans
   namnrad och beskrivningsrad.
5. Robin stänger dialogen och ändrar sitt föreslagna namn till
   **Eget senare namn** utan att spara i den gemensamma kartan.
6. Robin laddar om, öppnar **Granska konflikter** igen och läser uppgifterna om
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

**Integrationstest:**
[family.spec.ts](../../tests/integration/family.spec.ts),
UTKAST-01.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/family.spec.ts",
    "caseId": "UTKAST-01"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; återuppta en konflikt och spara oberoende förslag tillsammans.",
  "outcomes": [
    "Före konfliktvalet visar fullständig förslagsläsning ursprungsnamnet Lo Exempel och förslaget Lo Lind. Konflikten visar aktuellt sparat Lo Berg. Sparförsöket avvisas utan ändrad karta, utkast eller historik. Konflikten och adressförslaget finns kvar efter omladdning och omstart.",
    "Konfliktvalet ger inget sparkvitto. Dialogens status visar att valen finns i utkastet. Förslaget innehåller Lo Lind och den oberoende sparade beskrivningen “Spelar piano i musikföreningen.” Adressförslaget finns kvar.",
    "Sambandets tidigare underlag visar Familjens musikkonto och `familjen@example.test`. Förslaget visar Familjens rättade konto och `musik@example.test`, med samma ändpunktsidentiteter.",
    "Det uttryckliga sparandet ger ett lyckat sparkvitto. **Utkastet är tomt** även efter omladdning. Det sparade sambandet visar **Familjens rättade konto → Inloggningsadress** → `musik@example.test`."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna utkastet och **Visa förslaget: Lo Lind**. Läs det tidigare
   namnet och förslaget. Stäng läsningen och textvyn, öppna konfliktknappen
   och läs det aktuella sparade namnet. Stäng med Escape.
2. Öppna utkastet och försök spara. Läs **Utkastet kunde inte sparas**,
   stäng sparmodalen och textvyn. Ladda om sidan och starta om
   applikationen med samma databas. Granska konflikten på nytt.
3. Öppna **Granska konflikter**. Välj det egna namnet Lo Lind och den
   sparade beskrivningen. Välj **Lägg valen i utkastet** och stäng med
   Escape. Läs hela Lo-förslaget och förslaget om inloggningsadress.
4. Stäng textvyn och välj **Redigera Familjens musikkonto** i Tabell.
   Ändra namnet till **Familjens rättade konto** och välj **Lägg i
   utkastet och stäng**. Läs sedan sambandets fullständiga förslag.
5. Stäng läsningen och spara hela utkastet med sparikonen.
6. Ladda om. Läs det tomma utkastet, stäng textvyn och öppna **Samband för
   Familjens rättade konto** i Tabell.

**Förväntat resultat:**

- Före konfliktvalet visar fullständig förslagsläsning ursprungsnamnet
  Lo Exempel och förslaget Lo Lind. Konflikten visar aktuellt sparat
  Lo Berg. Sparförsöket avvisas utan ändrad karta, utkast eller historik.
  Konflikten och adressförslaget finns kvar efter omladdning och omstart.
- Konfliktvalet ger inget sparkvitto. Dialogens status visar att valen
  finns i utkastet. Förslaget innehåller Lo Lind och den oberoende
  sparade beskrivningen “Spelar piano i musikföreningen.” Adressförslaget
  finns kvar.
- Sambandets tidigare underlag visar Familjens musikkonto och
  `familjen@example.test`. Förslaget visar Familjens rättade konto och
  `musik@example.test`, med samma ändpunktsidentiteter.
- Det uttryckliga sparandet ger ett lyckat sparkvitto. **Utkastet är tomt**
  även efter omladdning. Det sparade sambandet visar **Familjens rättade
  konto → Inloggningsadress** → `musik@example.test`.

## Aktuellt underlag och borttagning

### UTKAST-02: ett gammalt kastförsök bevarar nyare förslag

**Syfte:** Kontrollera att en äldre flik inte kan kasta nyare förslag.

**Användare:** Administratören i två flikar.

**Förutsättningar:** Tom testinstallation med de två sparade objekten
enligt förberedelsen. Båda flikarna använder samma inloggning.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-02.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-02"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; ett gammalt kastförsök bevarar nyare förslag.",
  "outcomes": [
    "Det första kastförsöket avvisas eftersom förslaget eller kartan ändras. Fortsatt kastande blockeras tills aktuellt underlag hämtas.",
    "Efter hämtningen finns både **Lo Lind** och det nya sambandet kvar.",
    "Det andra kastandet tömmer hela utkastet. **Lo Exempel** och **Molnmusik** finns kvar i kartan, utan det föreslagna sambandet."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. I första fliken: välj **Tabell → Redigera Lo Exempel**, ändra namnet
   till **Lo Lind** och välj **Lägg i utkastet och stäng**.
2. Öppna **Utkast → Kasta hela utkastet** i första fliken. Låt
   bekräftelsen vara öppen utan att kasta ännu.
3. I andra fliken: öppna **Samband för Lo Lind** i Tabell, skapa
   **Lo Lind → Använder → Molnmusik** och lägg sambandet i utkastet.
4. Återvänd till den äldre bekräftelsen och välj **Ta bort hela utkastet**.
   Läs avvisningen och kontrollera att nytt kastande är spärrat.
5. Välj **Hämta aktuellt utkast**. Läs både namnförslaget och sambandet
   i bekräftelsen och kasta sedan hela det aktuella utkastet.
6. Läs det tomma utkastet och de två oförändrade sparade objekten.

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
UTKAST-03.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-03"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; ett gammalt konfliktval kräver ny granskning.",
  "outcomes": [
    "Det gamla konfliktvalet avvisas. Valmarkeringen behålls vid avvisningen; efter aktuell jämförelse krävs ett nytt val och Escape återför fokus. Namnförslaget **Lo Lind** finns kvar när det aktuella underlaget hämtas.",
    "Det nya konfliktvalet uppmanar till granskning och ändrar bara utkastet. Medlemmen ser fortfarande **Lo Ek** före det uttryckliga sparandet.",
    "Efter sparandet bekräftar kvittot **Lo Lind** och medlemmen ser det namnet."
  ],
  "evidence": [
    {
      "kind": "technical",
      "spec": "tests/integration/draft-conflicts.spec.ts",
      "title": "HTTP clients reject stale conflict choices and enforce private drafts and revoked membership",
      "purpose": "Separata HTTP-prov för inaktuella val, privata utkast och återkallat medlemskap; inga formulärhandlingar."
    }
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lägg namnändringen **Lo Lind** i administratörens utkast utan att spara.
2. Ändra samma person till **Lo Berg** som medlemmen och spara hela utkastet.
3. Ladda om administratörens sida och öppna **Granska konflikter**.
   Välj namnet Lo Lind utan att bekräfta. Låt jämförelsen vara öppen.
4. Ändra personen till **Lo Ek** som medlemmen och spara igen.
5. Välj namnet Lo Lind i den äldre jämförelsen och välj
   **Lägg valen i utkastet**. Läs att underlaget har ändrats.
6. Kontrollera att Lo Lind fortfarande är markerat efter avvisningen.
   Välj **Visa aktuell jämförelse**. Läs aktuellt Lo Ek och eget Lo Lind.
   Kontrollera att **Lägg valen i utkastet** är spärrad. Stäng med Escape,
   kontrollera fokus på konfliktknappen och öppna igen.
7. Välj det egna namnet och **Lägg valen i utkastet** igen. Stäng med
   Escape. Kontrollera medlemmens karta före något nytt sparande.
8. Öppna Utkast och spara hela administratörens utkast. Ladda om
   medlemmens sida.

**Förväntat resultat:**

- Det gamla konfliktvalet avvisas. Valmarkeringen behålls vid avvisningen;
  efter aktuell jämförelse krävs ett nytt val och Escape återför fokus.
Namnförslaget
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
UTKAST-04.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-04"
  },
  "reference": "1280 × 720; Tabell, avvisat sparande före konfliktvalet, nytt uttryckligt sparande och omstart med samma databas.",
  "outcomes": [
    "Konflikten säger att objektet är borttaget. Förslaget är läsbart men inte valbart och hela utkastet kan inte sparas före konfliktvalet.",
    "Valet tar bort namnförslaget men behåller **Kim Exempel** i utkastet. Kim finns ännu inte i medlemmens karta.",
    "Efter sparandet finns **Kim Exempel** och **Molnmusik** hos båda användarna. Varken **Lo Exempel** eller **Lo Lind** återkommer."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lägg namnändringen **Lo Lind** och ett nytt objekt **Kim Exempel** i
   administratörens utkast utan att spara.
2. Som medlemmen: expandera Lo Exempels rad i Tabell, välj **Ta bort**
   och spara hela utkastet separat.
3. Ladda om administratörens sida och försök spara hela utkastet. Läs
   **Inget sparades**, stäng sparmodalen och textvyn och välj Karta och
   **Hämta aktuellt underlag**. Välj Tabell och öppna **Granska konflikter**.
   Läs Borttaget och det fullständiga namnförslaget.
4. Välj **Acceptera borttagningen och kasta ditt förslag**. Stäng med
   Escape och läs utkastet och medlemmens karta före något nytt sparande.
5. Spara administratörens återstående utkast. Starta om applikationen
   med samma databas och ladda om båda sidorna.

**Förväntat resultat:**

- Konflikten säger att objektet är borttaget. Förslaget är läsbart
  men inte valbart och hela utkastet kan inte sparas före konfliktvalet.
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
UTKAST-05.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-05"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; en namnkonflikt blockerar även oberoende förslag.",
  "outcomes": [
    "Det första sparandet avvisas med **Inget sparades**. Medlemmen ser **Lo Berg** och inget **Alex Exempel**.",
    "Förslagsläsningen visar underlaget **Lo Exempel** och förslaget **Lo Lind**. Konfliktjämförelsen visar det aktuellt sparade namnet **Lo Berg**. Sparande kräver ett uttryckligt val.",
    "Konfliktvalet behåller **Alex Exempel**, ger inget sparkvitto och finns kvar efter omstart. Det nya sparandet gör båda förslagen gemensamma."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lägg **Alex Exempel** som nytt objekt och namnändringen **Lo Lind** i
   administratörens utkast. Behåll sidan öppen.
2. Ändra samma person till **Lo Berg** som medlemmen och spara.
3. Öppna Utkast och välj **Spara hela utkastet** som administratören.
4. Läs **Inget sparades**, stäng sparmodalen och textvyn och ladda om.
   Läs hela förslaget Lo Lind från Utkast: tidigare Lo Exempel och eget
   Lo Lind. Stäng läsningen och textvyn.
5. Öppna **Granska konflikter** och läs aktuellt Lo Berg och eget Lo Lind.
   Välj det egna namnet och **Lägg valen i utkastet**. Stäng med Escape.
6. Starta om appen med samma databas och ladda om administratörens sida.
   Läs båda förslagen, spara hela utkastet och ladda om hos medlemmen.

**Förväntat resultat:**

- Det första sparandet avvisas med **Inget sparades**. Medlemmen ser
  **Lo Berg** och inget **Alex Exempel**.
- Förslagsläsningen visar underlaget **Lo Exempel** och förslaget **Lo Lind**.
  Konfliktjämförelsen visar det aktuellt sparade namnet **Lo Berg**.
  Sparande kräver ett uttryckligt val.
- Konfliktvalet behåller **Alex Exempel**, ger inget sparkvitto och
  finns kvar efter omstart. Det nya sparandet gör båda förslagen gemensamma.

### UTKAST-06: granska nya samband före objektborttagning

**Syfte:** Kontrollera att borttagning kräver granskning av samband som
en annan användare lägger till.

**Användare:** Administratören och medlemmen.

**Förutsättningar:** De två sparade objekten utan samband enligt förberedelsen.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-06.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-06"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; granska nya samband före objektborttagning.",
  "outcomes": [
    "Det gamla sparandet avvisas. Konflikten visar sambandet med riktning och säkerheten **Osäkert uppgivet**.",
    "Konfliktvalet lägger även **Borttagning av samband** i utkastet. Kartan ändras först vid det nya sparandet.",
    "Både personen och sambandet försvinner efter sparandet. **Molnmusik** finns kvar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **Lo Exempel** som administratören och välj **Ta bort**.
2. Lägg **Lo Exempel → Använder → Molnmusik** med säkerheten
   **Osäkert uppgivet** i medlemmens utkast och spara det.
3. Försök spara administratörens äldre utkast från Utkastets sparikon. Läs
   **Utkastet kunde inte sparas**, stäng och ladda om för aktuellt underlag.
4. Öppna **Granska konflikter**, läs det nytillkomna sambandet och välj
   föreslagen borttagning för både objektet och sambandet. Välj
   **Lägg valen i utkastet**.
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
UTKAST-07.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-07"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; välj sparad betydelse vid en konflikt om ett samband.",
  "outcomes": [
    "Konflikten visar både **Osäkert uppgivet** och **Uttryckligen inget**. Sparande är blockerat före valet.",
    "Valet tömmer det överlappande förslaget. Kartans samband behåller **Uttryckligen inget** och inget nytt sparande krävs."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **Samband för Lo Exempel** i Tabell som administratören och
   redigera sambandet. Lägg säkerheten **Osäkert uppgivet** i utkastet.
2. Öppna samma samband som medlemmen, välj **Uttryckligen inget**, lägg
   det i utkastet och spara separat.
3. Ladda om administratörens sida. Försök spara hela utkastet, läs
   **Inget sparades** och stäng sparmodalen och textvyn. Välj
   **Hämta aktuellt underlag** och öppna konflikten.
4. Välj den sparade sidans värden för varje egenskap som skiljer sig.
   Identiska rader är inaktiva. Välj **Lägg valen i utkastet** och
   stäng med Escape och kontrollera utkastet och det sparade sambandet.

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
UTKAST-10.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-10"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; bevara oberoende status och håll slutdatumets säkerhet samlad.",
  "outcomes": [
    "Sparande är blockerat före varje konfliktval. Valet ändrar bara utkastet och kräver ett nytt sparande av hela det granskade utkastet.",
    "Det första lösta utkastet överlever omstart. Efter sparandet innehåller sambandet både **Manuellt upphört** och det kända slutdatumet **2031-04-12**.",
    "Efter det andra sparandet innehåller sambandet **Gäller fortfarande** och **2031-04-12 (Osäkert uppgivet)**. Den oberoende statusen bevaras; det valda datumet och dess säkerhet hålls ihop."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **Samband för Lo Exempel** i Tabell som administratören och
   redigera sambandet. Ange känt slutdatum **2031-04-12** och lägg
   sambandet i utkastet utan att spara.
2. Som medlemmen: redigera samma samband, välj **Manuellt upphört**,
   lägg sambandet i utkastet och spara hela utkastet separat.
3. Ladda om administratörens sida och öppna **Granska konflikter**.
   Välj det egna slutdatumet och den sparade statusen. Välj
   **Lägg valen i utkastet** och stäng med Escape.
4. Kontrollera hos medlemmen att inget slutdatum är sparat. Starta om
   appen med samma databas, ladda om och läs hela sambandsförslaget från
   Utkast. Stäng läsningen och spara hela utkastet separat.
5. Som administratören: lägg slutdatumet **2031-04-12** med säkerheten
   **Osäkert uppgivet** i utkastet.
6. Som medlemmen: lägg känt slutdatum **2031-05-15** och välj
   **Gäller fortfarande**. Spara hela utkastet separat.
7. Ladda om administratörens sida och granska datumen med deras säkerhet.
   Välj eget osäkert datum och sparad status, välj **Lägg valen i utkastet**
   och stäng med Escape.
8. Kontrollera medlemmens ännu oförändrade datum. Spara administratörens
   hela utkast och ladda om hos medlemmen.

**Förväntat resultat:**

- Sparande är blockerat före varje konfliktval. Valet ändrar bara utkastet
  och kräver ett nytt sparande av hela det granskade utkastet.
- Det första lösta utkastet överlever omstart. Efter sparandet innehåller
  sambandet både **Manuellt upphört** och det kända slutdatumet **2031-04-12**.
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
UTKAST-11.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-11"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; bevara rätt typdefinition vid borttagning efter ett typbyte.",
  "outcomes": [
    "Konflikterna visar de aktuella typerna **Abonnemang** och **Används av**. Hela sparandet är blockerat tills båda valen är gjorda.",
    "Valen ändrar bara utkastet. Efter det nya sparandet är Lo och sambandet borttagna, medan Molnmusik aktuell finns kvar.",
    "Automationen läser historikunderlaget via HTTP. Det tidigare objektet och sambandet har sina aktuella typ-ID:n tillsammans med motsvarande definitioner för **Abonnemang** och **Används av**, samt tomma eftervärden. Läsning i gränssnittet provas i [historikfallen](history.md).",
    "Även en senare namnändring hos ändpunkten kräver aktuell jämförelse. Det gamla valet avvisas utan ändrat utkast. Efter uttrycklig granskning visar hela borttagningsförslaget den aktuella typens betydelse och det aktuella ändpunktsnamnet."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Expandera Lo Exempels rad i Tabell som administratören och välj
   **Ta bort**. Låt objektets och sambandets borttagningar ligga i utkastet.
2. Som medlemmen: välj **Redigera Lo Exempel**, byt objekttyp till
   **Abonnemang** och lägg ändringen i utkastet.
3. Öppna **Samband för Lo Exempel** och redigera sambandet. Byt typen
   från **Använder** till **Används av**, behåll ändpunkterna och spara
   hela medlemmens utkast separat.
4. Ladda om administratörens sida och öppna **Granska konflikter**.
   Läs de aktuella typerna. Välj föreslagen borttagning på objektraden
   och **Lägg valen i utkastet**.
5. Välj sambandet i konfliktlistan och läs hela aktuella sambandet.
   Låt jämförelsen stå kvar medan medlemmen ändrar Molnmusiks namn till
   **Molnmusik aktuell** och sparar hela sitt utkast.
6. Välj föreslagen borttagning i den äldre jämförelsen och
   **Lägg valen i utkastet**. Läs avvisningen och välj
   **Visa aktuell jämförelse**. Kontrollera det aktuella ändpunktsnamnet.
7. Välj föreslagen borttagning igen och **Lägg valen i utkastet**.
   Stäng med Escape och läs hela borttagningsförslaget från Utkast.
   Kontrollera aktuell typ och Molnmusik aktuell; stäng läsningen.
8. Kontrollera medlemmens fortfarande oförändrade samband. Spara hela
   administratörens utkast och ladda om hos medlemmen.

**Förväntat resultat:**

- Konflikterna visar de aktuella typerna **Abonnemang** och **Används av**.
  Hela sparandet är blockerat tills båda valen är gjorda.
- Valen ändrar bara utkastet. Efter det nya sparandet är Lo och sambandet
  borttagna, medan Molnmusik aktuell finns kvar.
- Automationen läser historikunderlaget via HTTP. Det tidigare objektet
  och sambandet har sina aktuella typ-ID:n tillsammans med motsvarande
  definitioner för **Abonnemang** och **Används av**, samt tomma eftervärden.
  Läsning i gränssnittet provas i [historikfallen](history.md).
- Även en senare namnändring hos ändpunkten kräver aktuell jämförelse.
  Det gamla valet avvisas utan ändrat utkast. Efter uttrycklig granskning
  visar hela borttagningsförslaget den aktuella typens betydelse och
  det aktuella ändpunktsnamnet.

### UTKAST-08: välj ett befintligt samband och behåll andra förslag

**Syfte:** Kontrollera att samtidiga likadana samband inte skapar dubbletter.

**Användare:** Administratören och medlemmen.

**Förutsättningar:** De två sparade objekten utan samband enligt förberedelsen.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-08.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-08"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; välj ett befintligt samband och behåll andra förslag.",
  "outcomes": [
    "Granskningen visar **Ett sparat samband har redan samma typ, riktning och objekt.** och det befintliga sambandet med läsbara objektnamn och riktning.",
    "Valet tar bort dubblettförslaget men behåller **Kim Exempel**.",
    "Efter sparandet finns Kim och exakt ett sådant samband i kartan."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lägg **Lo Exempel → Använder → Molnmusik** och det nya objektet
   **Kim Exempel** i administratörens utkast.
2. Skapa samma samband som medlemmen och spara det.
3. Ladda om administratörens sida och granska konflikten.
4. Välj **Ta bort sambandet ur ditt utkast**. Stäng med Escape. Öppna därefter
   **Skriv till Skyttel → Visa utkastet** och spara separat.

**Förväntat resultat:**

- Granskningen visar **Ett sparat samband har redan samma typ, riktning
  och objekt.** och det befintliga
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
UTKAST-09.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-09"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; ta bort ett förslag som hänvisar till ett borttaget objekt.",
  "outcomes": [
    "Konflikten säger **Ett objekt som sambandet pekar på saknas.** Förslaget går att läsa.",
    "Efter omstart visas fortfarande **Lo Exempel → Använder → Molnmusik** med **Osäkert uppgivet**, även om målobjektet saknas i kartan.",
    "Valet tar bort förslaget och visar **Sambandet har tagits bort ur ditt utkast**. Inget samband skapas och det borttagna objektet återkommer inte."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lägg **Lo Exempel → Använder → Molnmusik** med säkerheten
   **Osäkert uppgivet** i administratörens utkast.
2. Öppna **Molnmusik** som medlemmen, välj **Ta bort** och spara.
3. Ladda om administratörens sida och granska konflikten.
4. Starta om appen med samma databas och öppna administratörens utkast.
5. Öppna **Granska konflikter** och välj **Ta bort sambandet ur ditt utkast**.

**Förväntat resultat:**

- Konflikten säger **Ett objekt som sambandet pekar på saknas.**
  Förslaget går att läsa.
- Efter omstart visas fortfarande **Lo Exempel → Använder → Molnmusik**
  med **Osäkert uppgivet**, även om målobjektet saknas i kartan.
- Valet tar bort förslaget och visar **Sambandet har tagits bort ur ditt
  utkast**. Inget samband
  skapas och det borttagna objektet återkommer inte.

## Status, fokus och samlat sparande

### UTKAST-25: filtrerad teckenförklaring följer kartans färger

**Syfte:** Matcha symboler och linjer med kartan och visa kategorier från
den filtrerade kartan, oberoende av kameran.

**Användare:** Administratören.

**Förutsättningar:** Spara Lo Exempel, Molnmusik och Kim Exempel samt ett
riktat samband från Lo till Molnmusik. Föreslå en ändrad beskrivning för Lo
och vänd sambandets riktning utan att spara. Välj ljust tema.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
UTKAST-25.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-status.spec.ts",
    "caseId": "UTKAST-25"
  },
  "reference": "Ljust tema; filtrering styr legenden, inte kameran.",
  "outcomes": [
    "Symboler och linjeprov matchar kartans färger i ljust tema. Text och symbol gör innebörden begriplig även utan färg.",
    "Sökningen styr kategorierna, medan kameran och en vald relation inte skapar en objektmarkering. Inga uppgifter sparas eller byter identitet."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Stäng textvyn och visa Karta. Läs grönt plus, gul penna och rött kryss under
   hushållets namn. Jämför färgerna med förslagen i kartan. Läs gammalt
   samband med rött kryss och streckad linje och nytt med grönt plus och
   heldragen linje utan att markera dem eller välja Alla etiketter.
2. Öppna Navigera och panorera. Teckenförklaringens rader ska bestå.
3. Stäng Navigation och välj det nya sambandet. Ingen rad för markerat
   objekt ska tillkomma.
4. Klicka i kartans sökfält, sök Kim Exempel och tryck Escape i sökfältet.
   Förslagsraderna ska försvinna. Raden för punktade etikettkopplingar ska
   finnas kvar.
5. Markera Kim. Kontrollera markeringsraden. Sök sedan Inga träffar via
   kartans sökfält och tryck Escape i sökfältet. Hela teckenförklaringen ska
   försvinna.

**Förväntat resultat:**

- Symboler och linjeprov matchar kartans färger i ljust tema. Text och
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
UTKAST-26.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-status.spec.ts",
    "caseId": "UTKAST-26"
  },
  "reference": "Bekräftat sparande; kvarstående hämtningsfel utan samtal.",
  "outcomes": [
    "Sparbeskedet och felet gäller olika resultat och kan visas samtidigt. Återhämtning finns utan samtal och kvittot förblir tillgängligt.",
    "Integrationen styr den verkliga spartransaktionen och avbryter bara hämtningen efter kvittot; den kräver ingen verklig leverantör."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lägg Lo Exempel i utkastet. Blockera hämtning av kartan och välj Spara
   hela utkastet från **Utkast**. Stäng **Spara utkastet** med Escape
   och stäng textvyn.
2. Läs Utkastet är sparat tillsammans med felet att kartan inte kunde
   hämtas. Vänta tre sekunder. Sparbeskedet försvinner; felet består.
3. Ta bort blockeringen och välj Hämta aktuellt underlag. Felet ska
   försvinna och det tidigare sparbeskedet ska inte spelas upp igen.
4. Öppna **Rapporter** och läs den enda genomförda ändringsgruppen
   för Lo Exempel i **Ändringshistorik**.
**Förväntat resultat:**

- Sparbeskedet och felet gäller olika resultat och kan visas samtidigt.
  Återhämtning finns utan samtal och kvittot förblir tillgängligt.
- Integrationen styr den verkliga spartransaktionen och avbryter bara
  hämtningen efter kvittot; den kräver ingen verklig leverantör.

### UTKAST-12: behåll legend och förslag tills samma sparförsök bekräftas

**Syfte:** Följa ett privat förslag med stängd textvy och skilja väntan,
okänt resultat och verifierat sparande.

**Användare:** Administratören.

**Förutsättningar:** Nytt tomt hushåll, 1440 × 844 pixlar. Följ
[styrd sparleverans](save-preparation.md#vanligt-sparande) och välj
`new-empty`.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
UTKAST-12.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-status.spec.ts",
    "caseId": "UTKAST-12"
  },
  "reference": "1440 × 844; väntande och tappat svar efter genomförandet.",
  "outcomes": [
    "Sparmodalen öppnas direkt och kan stängas med krysset eller Escape. Ett obekräftat försök visas aldrig som säkert lyckat eller säkert misslyckat.",
    "Återkopplingens knappar kan användas utan att verktygen täcker dem.",
    "Samma försök kontrolleras och får ett verifierat kvitto. Objektet finns en gång i kartan. Förslagsraden försvinner efter uppdateringen, men markeringsringen och etikettkopplingarnas rad kan finnas kvar. Utkastet är sparat visas i tre sekunder och återkommer inte vid omladdning. Ändringshistoriken innehåller ett enda genomfört sparande."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lägg objektet **Familjeabonnemanget** i utkastet. Stäng textvyn
   och visa Karta.
2. Kontrollera grönt plus i teckenförklaringen under hushållets namn.
   Varken förslagsantal, gul penna eller rött kryss ska visas för detta förslag.
3. Läs kartans status och teckenförklaring under hushållets namn.
4. Skriv `hold-after` i terminalen. Öppna **Utkast** och välj **Spara hela
   utkastet**.
   Stäng **Spara utkastet** med Escape och stäng textvyn.
   Läs **Väntar på sparkvitto**, det bevarade förslaget och legenden.
5. Läs **Väntar på sparkvitto** och kvarvarande legend. Skriv `drop`
   efter terminalens bekräftade status 200. Läs **Sparutfall okänt**. Välj
   **Hämta samma kvitto igen**. Läs resultatet.
   Öppna **Rapporter → Ändringshistorik** och läs det genomförda sparandet.

**Förväntat resultat:**

- Sparmodalen öppnas direkt och kan stängas med krysset eller Escape.
  Ett obekräftat försök
  visas aldrig som säkert lyckat eller säkert misslyckat.
- Återkopplingens knappar kan användas utan att verktygen täcker dem.
- Samma försök kontrolleras och får ett verifierat kvitto. Objektet finns
  en gång i kartan. Förslagsraden försvinner efter uppdateringen, men
  markeringsringen och etikettkopplingarnas rad kan finnas kvar.
  Utkastet är sparat visas i tre sekunder och återkommer inte vid omladdning.
  Ändringshistoriken innehåller ett enda genomfört sparande.

### UTKAST-13: sparresultat behåller ett nyare valt textfält

**Syfte:** Sparresultat ska inte avbryta skrivande. Kartåterkopplingen
ska uppdateras utan att flytta fokus.

**Användare:** Administratören.

**Förutsättningar:** Följ
[styrd sparleverans](save-preparation.md#vanligt-sparande).
Välj `new-empty` och `hold-after`.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
UTKAST-13.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-status.spec.ts",
    "caseId": "UTKAST-13"
  },
  "reference": "Hållet sparbesked; senare valt sökfält behåller fokus.",
  "outcomes": [
    "Sökfältet behåller fokus och innehåller **Lo Exempel** efter sparandet.",
    "Sparbeskedet visas i tre sekunder. Kvittot finns kvar i **Rapporter → Ändringshistorik**. Sökfältet behåller fokus även när återkopplingen uppdateras.",
    "Det automatiserade provet håller ett verkligt lyckat serversvar för att säkerställa ordningen och kontrollerar att utkastet är tomt innan fortsatt skrivande. Ett manuellt prov där svaret hinner fram före fältbytet verifierar inte fokus under väntan."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lägg **Lo Exempel** i utkastet och välj **Spara hela utkastet**.
2. Medan svaret väntar, stäng **Spara utkastet** med Escape och stäng
   textvyn. I Tabell, skriv **Lo** i **Sök objekt i tabellen**.
3. Skriv `release` efter fältbytet och invänta sparkvittot och fortsätt skriva
   ett blanksteg och **Exempel**
   utan att klicka igen.
4. Läs Utkastet är sparat under hushållets namn.
5. Fortsätt skriva i sökfältet utan att klicka på det igen.

**Förväntat resultat:**

- Sökfältet behåller fokus och innehåller **Lo Exempel** efter sparandet.
- Sparbeskedet visas i tre sekunder. Kvittot finns kvar i
  **Rapporter → Ändringshistorik**.
  Sökfältet behåller fokus även när återkopplingen uppdateras.
- Det automatiserade provet håller ett verkligt lyckat serversvar för
  att säkerställa ordningen och kontrollerar att utkastet är tomt innan
  fortsatt skrivande. Ett manuellt prov där svaret hinner fram före
  fältbytet verifierar inte fokus under väntan.

### UTKAST-14: formulär, text och tal delar ett beständigt privat utkast

**Syfte:** Spara hela det gemensamma utkastet atomiskt och läsa den sparade
kartan som en annan medlem efter omstart.

**Användare:** Administratören och den inbjudna medlemmen.

**Förutsättningar:** Följ
[kontrollerat text- och talunderlag](save-preparation.md#kontrollerat-text--och-talunderlag).
Starta ett nytt tomt provhushåll. Modell och media är syntetiska; riktig
server, privata utkast och gemensamt sparande används.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
UTKAST-14.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-status.spec.ts",
    "caseId": "UTKAST-14"
  },
  "reference": "Kontrollerad text och syntetiskt tal, två medlemmar, riktig SQLite.",
  "outcomes": [
    "Samma privata utkast innehåller tre objekt och ett samband från alla tre arbetssätten. Oskickad text räknas först när den läggs i utkastet.",
    "Kvittot beskriver alla fyra ändringarna. Förslagsraderna i teckenförklaringen försvinner. Medlemmen ser alla tre objekten och **Lo Exempel → Använder → Molnmusik** efter omstart, men inga privata förslag från administratören.",
    "Det automatiserade provet håller den riktiga sparbegäran före genomförandet och kontrollerar oförändrat utkast, tom sparad karta och därefter ett enda kvitto för alla ändringar. En samtidig uppdatering från samtalet får inte ändra ett pågående sparande till okänt utfall. Databasen och servern är riktiga; tal och modellresultat ersätts vid de externa tjänsternas gränser. Provet verifierar inte fysisk mikrofon eller verkligt svenskt tal."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lägg **Lo Exempel** i utkastet genom formuläret med **Lägg i utkastet
   och stäng**.
2. Välj **Skriv till Skyttel**, skriv **Lägg Molnmusik i utkastet** och
   välj **Skicka**. Godkänn samtalsmedgivandet när det efterfrågas.
   Släpp det hållna textförslaget enligt separat förberedelse.
   Kontrollera två privata förslag på
   **Visa utkastet**.
3. Välj **Prata med Skyttel** och använd terminalens `user Lo använder
   Molnmusik.` och `delegate`.
   Släpp det hållna förslaget enligt separat förberedelse.
   Kontrollera att sambandet ingår och att **Visa utkastet** visar tre privata
   förslag.
4. Skriv ett oskickat samtalsmeddelande. Besök Inställningar och återgå till
   kartan. Stäng textvyn. Kartan ska inte visa påminnelse om
   oskickad formulärtext. Kontrollera som medlem att den sparade kartan är tom
   och att
   administratörens förslag inte visas i medlemmens utkast.
5. Öppna Tabell och välj **Nytt objekt**. Skriv **Oskickad cykel** och
   **Texten ska finnas kvar** i beskrivningen. Välj **Avbryt** och tryck
   Escape i förlustdialogen. Kontrollera att namn och beskrivning finns
   kvar utan nytt förslag. Välj **Lägg i utkastet och stäng**.
   Granska fyra förslag i hela utkastet.
   Arma `save:before` i konsolen. Välj **Spara hela utkastet** från Utkast,
   stäng sparmodalen med Escape
   och stäng textvyn.
6. Kontrollera vänteläge, oförändrade fyra förslag och tom gemensam karta
   i medlemsprofilen. Släpp sparandet i konsolen och invänta bekräftat kvitto.
   Stäng klienterna, starta om servern med samma
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

**Syfte:** En nödvändig fråga ska hindra utkastets sparande. Ett svar ska
inte i sig spara utkastet.

**Användare:** Administratören.

**Förutsättningar:** Följ
[kontrollerat text- och talunderlag](save-preparation.md#kontrollerat-text--och-talunderlag).
Starta ett nytt tomt provhushåll. Modell och media är syntetiska; riktig
server, privata utkast och gemensamt sparande används.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
UTKAST-15.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-status.spec.ts",
    "caseId": "UTKAST-15"
  },
  "reference": "Kontrollerad nödvändig fråga; svar följt av nytt uttryckligt sparande.",
  "outcomes": [
    "Utkastets sparikon kringgår inte den nödvändiga frågan. Det privata förslaget finns kvar medan frågan besvaras.",
    "Att svara sparar inte utkastet. Först det nya uttryckliga sparbeskedet ger ett kvitto och gör uppgifterna till sparat kartinnehåll.",
    "Integrationstestet styr frågan vid modellgränsen men använder riktig server och SQLite. Det jämför tomma sparförsök före beskedet och ett enda lyckat försök med samma verkliga kvitto i historiken efteråt."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lägg **Lo Exempel** i utkastet via formuläret. Välj **Skriv till Skyttel**
   och be Skyttel förbereda uppgiften och fråga vilket kort som avses.
   Skicka och godkänn samtalsmedgivandet när det efterfrågas.
2. Släpp modellens nödvändiga fråga enligt separat förberedelse. Läs frågan i
   samtalstexten och stäng textvyn.
3. Öppna **Utkast**. Kontrollera att **Spara hela utkastet** är
   inaktiverad. Kartan har ännu inga sparade objekt.
4. Välj **Skriv till Skyttel**, svara **Kortet Lo Exempel avses** och skicka.
   Avsluta det hållna anropet med förberedd svarstext. Vänta tills frågan är
   besvarad. Stäng textvyn med krysset igen.
5. Öppna **Utkast**. Kontrollera att sparande erbjuds men inte har genomförts.
   Välj **Spara hela utkastet** uttryckligen och läs det verifierade resultatet.

**Separat tekniskt underlag:** Integrationstestet jämför tomma privata
sparförsök före det uttryckliga sparbeskedet och ett enda lyckat försök
med exakt samma verkliga kvitto i historiken efteråt. Dessa API-jämförelser
ingår inte i de vanliga UI-stegen.

**Förväntat resultat:**

- Utkastets sparikon kringgår inte den nödvändiga frågan.
  Det privata förslaget finns kvar medan frågan besvaras.
- Att svara sparar inte utkastet. Först det nya uttryckliga sparbeskedet
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
UTKAST-17.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-17"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; avbruten formulärförlust och oberoende utkast består vid konflikt.",
  "outcomes": [
    "Fokus hamnar på dialogens synliga rubrik Granska konflikter. Sparat i kartan nu visar Lo Berg och Ditt förslag visar Lo Lind.",
    "Avbruten förlust bevarar formulärtexten utan att lägga ett förslag. Efter uttryckligt tillägg finns Oskickad cykel kvar under granskningen.",
    "Statusnavigeringen varken sparar, ändrar utkastet eller skapar ett kvitto. Den gemensamma kartan innehåller Lo Berg och Alex privata utkast innehåller fortfarande Lo Lind och Oskickad cykel."
  ]
}
```
<!-- markdownlint-enable MD013 -->

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
   Escape, öppna Tabell och **Uppgifter för Oskickad cykel**.

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
och läsa tidigare, föreslagna och aktuella värden med rätt betydelser.

**Användare:** Alex och Robin i skilda sessioner i samma hushåll.

**Förutsättningar:** Lo Exempel och Molnmusik samt ett samband mellan dem
finns sparade. Los typ har avsnittet Sparad ekonomi med den gemensamma
egenskapen skuld, benämnd Sparad skuld. Skulden är 1 200, känd och daterad
2026-09-01. Det egna textfältet Dold anteckning har ett påhittat värde.
Fältet kan tillfälligt visas när en anteckning behöver redigeras och döljas
igen innan respektive typförslag läggs i utkastet.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-18.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-18"
  },
  "reference": "1440 × 900; samtliga konfliktslag och fullständiga underlag.",
  "outcomes": [
    "Konfliktlistans öppningskontroll är tydlig och går att träffa utan att aktivera knappen för hela utkastet intill.",
    "Varje listval fokuserar rätt konfliktrubrik med synligt, åtkomligt fokus. Sambandsnamnet visar aktuell sparad riktning och aktuella objekt samt förslagets osäkra uppgift. Förslagets egna namn läses i Utkast.",
    "Det tidigare underlaget visar Sparad ekonomi och Sparad skuld 1 200. Förslaget visar Mitt ekonomiska avsnitt och Min skuld 1 700. Aktuellt sparat värde visar Sparad ekonomi och Sparad skuld 2 000, med osäkerheten och datumet från Robins sparande.",
    "Alla tre underlag innehåller sina anteckningar trots att fältet är dolt. Ingen uppgift försvinner eller får fel betydelse från ett annat underlags typdefinition.",
    "Hela sparförsöket avvisas atomiskt. Navigeringen ändrar inte kartan, privata förslag eller historik, och innehållet kräver ingen vågrät rullning.",
    "Efter typvalet har konfliktrubriken synligt fokus. De tre återstående konflikterna avvisar fortfarande hela sparförsöket. Valet ändrar bara det privata utkastet; kartan och historiken är oförändrade."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Alex ändrar Lo till Lo Lind, föreslår skuld 1 700 med känd säkerhet
   och datum 2026-09-03 samt anteckningen Min dolda uppgift.
2. I samma utkast föreslår Alex objekttypens namn Min objekttyp,
   avsnittet Mitt ekonomiska avsnitt och skuldens visningsnamn Min skuld.
   Dölj anteckningsfältet med värdet kvar.
3. Alex föreslår Min sambandstyp med riktningen **använder enligt mig**
   samt osäker uppgift för det befintliga sambandet till Molnmusik.
4. Robin föreslår Lo Berg, skuld 2 000 med osäker säkerhet och datum
   2026-09-02 samt Annans dolda uppgift. Ändra typbeskrivningarna men
   behåll Sparad ekonomi och Sparad skuld. Föreslå okänt mål och spara allt.
5. Alex laddar om, klickar i kartans sökfält, söker ett obefintligt namn
   och trycker Escape i sökfältet. Fyra konflikter ska räknas trots tom karta.
6. Öppna **4 konflikter i ditt utkast** med tangentbord. Besök objekttyp,
   sambandstyp, samband och objekt i **Alla konflikter** med Enter.
   Läs aktuella sparade och föreslagna värden i dialogens två kolumner.
7. Välj den sparade skulden och läs Sparad skuld 2 000 i resultatet.
   Välj sedan den föreslagna skulden och läs Min skuld 1 700.
   Stäng med Escape, öppna **Utkast** och hela förslaget Lo Lind.
   Läs tidigare sparade och föreslagna värden, inklusive dolda anteckningar.
   Läs Min objekttyps fullständiga förslag för båda avsnittsbenämningarna.
8. Försök spara hela utkastet. Läs **Inget sparades**, stäng sparmodalen
   och textvyn, och ladda om sidan. Öppna konflikterna igen, välj Min objekttyp
   och välj eget värde för dess egna ändringar samt sparat värde för
   oberoende ändringar. Bekräfta **Lägg valen i utkastet** med Enter.
9. Kontrollera rubrikens fokus. Stäng med Escape, läs de tre återstående
   konflikterna. Försök spara hela utkastet igen och kontrollera **Inget
   sparades** samt oförändrade egna förslag, karta och historik.

**Förväntat resultat:**

- Konfliktlistans öppningskontroll är tydlig och går att träffa utan
  att aktivera knappen för hela utkastet intill.
- Varje listval fokuserar rätt konfliktrubrik med synligt, åtkomligt fokus.
  Sambandsnamnet visar aktuell sparad riktning och aktuella objekt samt
  förslagets osäkra uppgift. Förslagets egna namn läses i Utkast.
- Det tidigare underlaget visar Sparad ekonomi och Sparad skuld 1 200.
  Förslaget visar Mitt ekonomiska avsnitt och Min skuld 1 700.
  Aktuellt sparat värde visar Sparad ekonomi och Sparad skuld 2 000,
  med osäkerheten och datumet från Robins sparande.
- Alla tre underlag innehåller sina anteckningar trots att fältet är
  dolt. Ingen uppgift försvinner eller får fel betydelse från ett annat
  underlags typdefinition.
- Hela sparförsöket avvisas atomiskt. Navigeringen ändrar inte kartan, privata
  förslag eller historik, och innehållet kräver ingen vågrät rullning.
- Efter typvalet har konfliktrubriken synligt fokus. De tre återstående
  konflikterna avvisar fortfarande hela sparförsöket. Valet ändrar bara det
  privata utkastet; kartan och historiken
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
UTKAST-19.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-19"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; rätta objektkonflikten och bevara ett oberoende förslag.",
  "outcomes": [
    "Redigera Lo Lind öppnar det befintliga förslaget med fokus i namnfältet. Avbruten förlust bevarar cykelns text. Det oberoende cykelförslaget finns kvar medan Lo rättas och konflikten löses.",
    "Rättelsen och konfliktvalet ändrar bara Alex utkast. Inget kvitto skapas, och Robin ser fortfarande Lo Berg före det nya sparandet.",
    "Efter konfliktvalet innehåller förslaget både Lo Alm och den oberoende beskrivningen Spelar piano. Ett nytt uttryckligt sparande ger ett kvitto och gör just dessa uppgifter gemensamma."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Alex öppnar Nytt objekt, skriver Oskickad cykel och beskrivningen Behåll den
   här texten. Välj Avbryt och tryck Escape i förlustdialogen. Kontrollera
   båda värdena och oförändrat utkast, lägg därefter hela formuläret i utkastet.
2. Välj konfliktlänken under hushållets namn och stäng dialogen med
   Escape. Öppna Tabell och välj **Redigera Lo Lind**.
3. Kontrollera rätt objektdialog och fokus i Namn. Ändra namnet till
   Lo Alm och välj **Lägg i utkastet och stäng**.
4. Öppna konfliktknappen, välj Visa aktuell jämförelse om kontrollen visas
   och kontrollera att valet av Lo Alm är nåbart utan att välja det.
   Stäng med Escape, öppna Tabell och Uppgifter för Oskickad cykel.
   Kontrollera den bevarade beskrivningen.
5. Öppna Granska konflikter. Välj det egna namnet Lo Alm och den sparade
   beskrivningen Spelar piano, och välj **Lägg valen i utkastet**. Stäng
   med Escape och kontrollera kartan hos Robin före sparandet.
6. Spara Alex utkast och ladda om Robins karta.

**Förväntat resultat:**

- Redigera Lo Lind öppnar det befintliga förslaget med fokus i namnfältet.
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
Robin tar bort Molnmusik och sparar.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-20.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-20"
  },
  "reference": "1440 × 900; sambandets vanliga rättelseformulär.",
  "outcomes": [
    "Försöket med borttaget mål sparar varken sambandet eller Privat stol. Tabellens ordinarie formulär för samband öppnar samma privata förslag.",
    "Rättelsen behåller samma samband, riktning och osäkra uppgift. Konflikten försvinner när målet är giltigt. Privat stol finns kvar i utkastet.",
    "Rättelsen skapar inget kvitto och ändrar inget i den gemensamma kartan. Först ett nytt uttryckligt sparande delar sambandet och stolen.",
    "Molnmusik förblir borttaget. Det nya sambandet går från Lo till Garaget."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Alex försöker spara hela utkastet. Läs **Inget sparades**, stäng
   sparmodalen och textvyn och välj **Hämta aktuellt underlag**.
2. Öppna **1 konflikt i ditt utkast**. Läs borttaget mål och förslaget.
   Jämförelsen är läsbar, men förslaget kan inte väljas som egenskapsvärde.
3. Stäng med Escape. Öppna Tabell → **Samband för Lo Exempel** och välj
   **Redigera samband** vid det befintliga privata sambandsförslaget.
4. Kontrollera Från objekt, Sambandstyp och Uppgiftens säkerhet.
   Välj Garaget som Till objekt; Molnmusik ska inte kunna väljas.
5. Välj **Lägg i utkastet** och **Stäng samband**. Läs hela utkastet:
   det rättade sambandet och Privat stol finns kvar.
6. Kontrollera Robins karta före Alex sparande. Spara därefter hela
   Alex utkast och ladda om Robins karta.

**Förväntat resultat:**

- Försöket med borttaget mål sparar varken sambandet eller Privat stol.
  Tabellens ordinarie formulär för samband öppnar samma privata förslag.
- Rättelsen behåller samma samband, riktning och osäkra uppgift. Konflikten
  försvinner när målet är giltigt. Privat stol finns kvar i utkastet.
- Rättelsen skapar inget kvitto och ändrar inget i den gemensamma kartan.
  Först ett nytt uttryckligt sparande delar sambandet och stolen.
- Molnmusik förblir borttaget. Det nya sambandet går från Lo till Garaget.

### UTKAST-21: rätta typdefinitioner genom inställningarna

**Syfte:** Göra en egen rättelse av objekttyper, bevara
oberoende sparade uppgifter och kräva ett nytt sparbesked.

**Användare:** Alex och Robin i skilda sessioner i samma hushåll.

**Förutsättningar:** Ett hushåll med sparade objekt och typer. Alex föreslår
namnet Min typ för en befintlig typ. Robin ändrar samma typs namn till
Annans typ och beskrivningen till Oberoende typförklaring, och sparar.
Använd objekttyp vid 1440 × 844 pixlar.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-21.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-21"
  },
  "reference": "Objekttyp, 1440 × 844; rättelse i ordinarie inställningar.",
  "outcomes": [
    "Rättelsen öppnar rätt befintligt formulär på den vanliga inställningssidan. Sparade objekt och samband förblir oförändrade genom hela flödet.",
    "Rättelsen och konfliktvalet ändrar bara Alex utkast. Annans typ och den oberoende beskrivningen är fortfarande gemensamma före ett nytt sparande.",
    "Konfliktvalet bevarar Oberoende typförklaring tillsammans med Rättad typ. Ett nytt uttryckligt sparande delar dessa uppgifter och skapar ett kvitto."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Alex försöker spara hela utkastet. Läs **Inget sparades**, stäng
   sparmodalen och textvyn och välj **Hämta aktuellt underlag**.
2. Öppna **1 konflikt i ditt utkast**. Läs Min typ, Annans typ och
   Oberoende typförklaring. Stäng med Escape.
3. Öppna Inställningar → **Typer och egna fält**. På mobil, öppna
   **Välj inställning** först. Visa **Objekttyper och egna fält** och välj
   **Ändra typ: Min typ**. Kontrollera det befintliga formulärets namn.
4. Ändra till Rättad typ och lägg typförslaget i utkastet.
5. Välj Tillbaka till kartan och öppna konflikten igen. Välj det egna
   namnet och den sparade oberoende beskrivningen. Bekräfta **Lägg valen
   i utkastet** och kontrollera Robins karta före sparandet.
6. Stäng med Escape, öppna **Utkast** och välj **Spara hela utkastet**.
   Ladda om Robins karta.

**Förväntat resultat:**

- Rättelsen öppnar rätt befintligt formulär på den vanliga inställningssidan.
  Sparade objekt och samband förblir oförändrade genom hela flödet.
- Rättelsen och konfliktvalet ändrar bara Alex utkast. Annans typ och den
  oberoende beskrivningen är fortfarande gemensamma före ett nytt sparande.
- Konfliktvalet bevarar Oberoende typförklaring tillsammans med Rättad typ.
  Ett nytt uttryckligt sparande delar dessa uppgifter och skapar ett kvitto.

### UTKAST-22: konfliktval behåller användbart fokus utan att spara

**Syfte:** Fortsätta granskningen med tangentbord när valknapparna
ersätts av resultatet utan att kartan sparas automatiskt.

**Användare:** Alex och Robin i skilda sessioner i samma hushåll.

**Förutsättningar:** Lo Exempel är sparat. Alex föreslår Lo Lind och
Robin sparar Lo Berg. Använd 390 × 844 pixlar och välj sparade värden.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-22.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-22"
  },
  "reference": "390 × 844, sparade värden; fokus när valknappar försvinner.",
  "outcomes": [
    "Rubriken Lo Lind behåller synligt fokus efter bekräftelsen. Resultatet visar att valen finns i utkastet eller att förslaget tagits bort.",
    "Escape stänger modalgranskningen och återför fokus till en synlig, användbar kontroll i verktygsfältet när öppningsknappen försvinner.",
    "Sparade värden tar bort namnförslaget. Eget namn behåller Lo Lind. Båda alternativen lämnar Lo Berg sparat och skapar inget kvitto."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Välj **1 konflikt i ditt utkast** och läs **Granska konflikter**.
2. Välj sparade värden för de egenskaper som skiljer sig.
   Fokusera **Lägg valen i utkastet** och tryck Enter. Spara inte kartan.
3. Kontrollera resultatet och fokus på konfliktens rubrik. Tryck Escape.
4. Kontrollera fokus på **Karta** när den ursprungliga konfliktknappen
   försvinner. Jämför eget utkast, Robins karta och historiken.

**Förväntat resultat:**

- Rubriken Lo Lind behåller synligt fokus efter bekräftelsen.
  Resultatet visar att valen finns i utkastet eller att förslaget tagits bort.
- Escape stänger modalgranskningen och återför fokus till en synlig,
  användbar kontroll i verktygsfältet när öppningsknappen försvinner.
- Sparade värden tar bort namnförslaget. Eget namn behåller Lo Lind.
  Båda alternativen lämnar Lo Berg sparat och skapar inget kvitto.

### UTKAST-23: väntande konfliktval skyddar fokus före fortsatt sökning

**Syfte:** Skydda ett pågående konfliktval och sedan fortsätta i tabellen
utan att ett fördröjt resultat avbryter den fortsatta sökningen.

**Användare:** Alex och Robin i skilda sessioner i samma hushåll.

**Förutsättningar:** Samma namnkonflikt som i UTKAST-22. Testmiljön kan
hålla det riktiga svaret efter att servern behandlar konfliktvalet.

**Separat förberedelse:** Använd
[styrd konfliktleverans](current-conflict-preparation.md) efter att
konflikten har skapats. Arma den angivna rutten före UI-handlingen.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-23.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-23"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; väntande konfliktval skyddar fokus före fortsatt sökning.",
  "outcomes": [
    "Pågående val stannar i modalgranskningen; Escape lämnar inte ett obekräftat kommando. Rubriken behåller synligt fokus när svaret kommer.",
    "Efter uttrycklig stängning behåller sökfältet texten Lo och fokus.",
    "Lo Lind finns i eget utkast. Lo Berg är fortfarande sparat och ingen historikgrupp eller kvitto tillkommer."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Kör `arm resolve:after` i transportens terminal. Öppna Tabell och **1
   konflikt i ditt utkast**. Välj ditt föreslagna
   namn och övriga aktuella värden. Bekräfta **Lägg valen i utkastet**.
2. Invänta `application-completed` med status 200 och `held-after`. Kontrollera
   väntande besked och inaktiva bekräftelse-
   och stängknappar. Tryck Escape; dialogen ska finnas kvar.
3. Kör `release` i transportens terminal. Kontrollera resultatet och rubrikens
   fokus.
4. Stäng med Escape och skriv Lo i **Sök objekt i tabellen**.
   Kontrollera söktext och fokus samt utkast, Robins karta och historik.

**Förväntat resultat:**

- Pågående val stannar i modalgranskningen; Escape lämnar inte ett
  obekräftat kommando. Rubriken behåller synligt fokus när svaret kommer.
- Efter uttrycklig stängning behåller sökfältet texten Lo och fokus.
- Lo Lind finns i eget utkast. Lo Berg är fortfarande sparat och ingen
  historikgrupp eller kvitto tillkommer.

### UTKAST-24: återfinn konfliktval och ett enda nytt sparkvitto

**Syfte:** Skilja ett beständigt privat konfliktval från ett gemensamt
sparande när deras svar försvinner på vägen till webbläsaren.

**Användare:** Alex och Robin i skilda sessioner i samma hushåll.

**Förutsättningar:** Lo Exempel är sparat. Alex föreslår Lo Lind och
det nya objektet Privat stol. Robin sparar Lo Berg med beskrivningen
Spelar piano. Testmiljön kan släppa fram en riktig förfrågan och avbryta
enbart svaret efter serverns behandling.

**Separat förberedelse:** Använd
[styrd konfliktleverans](current-conflict-preparation.md) efter att
konflikten har skapats. Arma den angivna rutten före UI-handlingen.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-24.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-24"
  },
  "reference": "1440 × 844; genomfört konfliktval och sparande med tappade svar.",
  "outcomes": [
    "Ett tappat konfliktvalssvar skapar inget sparförsök eller kvitto. Den gemensamma kartan behåller Lo Berg och saknar Privat stol.",
    "Uppdatering och omladdning återfinner Lo Lind, den oberoende beskrivningen och stolen i samma privata utkast. Ett nytt sparbesked krävs fortfarande.",
    "Det uttryckliga sparandet gör båda förslagen gemensamma tillsammans. Ett tappat sparkvitto spärrar ett nytt sparande tills utfallet kontrolleras.",
    "Återhämtningen ger exakt samma kvitto. Endast ett nytt sparförsök och en historikgrupp tillkommer; kartan sparas inte en andra gång."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Kör `arm resolve:drop-after`. Öppna **1 konflikt i ditt utkast** från Tabell.
   Välj det egna namnet
   och sparade oberoende egenskaper, och bekräfta **Lägg valen i utkastet**.
   Kräv `application-completed` med status 200 i terminalen. Läs det oklara
utfallet och
   kontrollera att en ny bekräftelse är spärrad.
2. Kontrollera Robins karta och historiken. Välj **Kontrollera om valet
   lades i utkastet**. Läs resultatet och stäng med Escape.
3. Öppna **Utkast** och hela förslaget Lo Lind. Läs Spelar piano, stäng
   läsningen och ladda om. Kontrollera Lo Lind och Privat stol i utkastet.
4. Kör `arm save:drop-after`. Välj **Spara hela utkastet**. Kräv status 200 före
   det tappade svaret.
   Läs **Sparandet kunde inte bekräftas** i **Spara utkastet**.
5. Välj **Kontrollera sparandet igen**. Kontrollera bekräftelsen, tomt
   utkast, Robins karta och den enda nya historikgruppen.

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

**Syfte:** Behålla åtkomst till personlig placering och sparande genom växling
mellan kartan
och textvyn, även när förstoring kräver rullning.

**Användare:** Administratören.

**Förutsättningar:** Lo Exempel är sparad i kartan. Blå cykeln finns som
nytt privat förslag. Börja med stängd textvy och Navigation.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
UTKAST-16.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-status.spec.ts",
    "caseId": "UTKAST-16"
  },
  "reference": "1440 × 1000; båda öppningsordningarna och sex riktningar.",
  "outcomes": [
    "Alla personliga flyttriktningar och hela utkastets sparknapp är åtkomliga i båda ordningarna, även när ytorna behöver rullas.",
    "Flyttningarna ändrar bara den personliga vyn. Automationen jämför separat oförändrat gemensamt innehåll och privat förslag utan sparförsök.",
    "Fokus följer den uttryckliga handlingen och går tillbaka till verktygen vid stängning. Navigation, återkoppling och verktygen täcker inte den kontroll som används."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Markera Lo Exempel i kartan. Öppna **Navigera** från verktygen.
   Expandera verktygens namn om det behövs. Teckenförklaringen är synlig
   under hushållets namn.
2. Använd tangentbord och pekare för att flytta Lo i alla sex riktningar
   i Navigation.
   Rulla vid behov till de nedre kontrollerna.
3. Välj **Stäng navigering** och kontrollera fokus på **Navigera**.
   Öppna **Utkast** och fokusera **Spara hela utkastet**. Kontrollera att
   knappen går att nå med pekare utan att spara. Stäng textvyn.
4. Upprepa efter att först ha öppnat Utkast och fokuserat sparknappen,
   därefter stängt textvyn och öppnat Navigera.
5. Behåll 1440 × 1000 pixlar. Smal och kort vy har separata fall.

**Separat tekniskt underlag:** Integrationstestet jämför hela privata
utkastet och gemensamma kartinnehållet före och efter flyttningarna och
kräver tomma sparförsök. Dessa API-jämförelser ingår inte i UI-stegen.

**Förväntat resultat:**

- Alla personliga flyttriktningar och hela utkastets sparknapp är
  åtkomliga i båda ordningarna, även när ytorna behöver rullas.
- Flyttningarna ändrar bara den personliga vyn. Automationen jämför separat
  oförändrat gemensamt innehåll och privat förslag utan sparförsök.
- Fokus följer den uttryckliga handlingen och går tillbaka till verktygen
  vid stängning. Navigation, återkoppling och verktygen täcker inte den kontroll
  som används.

## Bevarade konfliktval och kontrollerat utfall

UTKAST-49–78 använder en tillfällig installation med riktig
SQLite och två
syntetiska användare: administratören Alex och medlemmen Robin. Starta från
repo-roten med `npm run build` och
`npm run test:env -- node --import tsx scripts/manual-conflict-continuity.ts
--chrome`. Öppna adressen
som skrivs ut.
För UTKAST-49–63, 73, 77 och 78 är Alex inloggad i det synliga fönstret;
konsolkommandon
för Robin använder hans separata session. Arkivfallen UTKAST-64–72 och 74–76
visar
i stället medlemmen Robin; administratören Alex använder en separat
session för export, typändring och import. Inga externa AI-anrop eller
medgivanden behövs.

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
UTKAST-49.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-49"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; behåll val mellan konflikter och vid återöppning.",
  "outcomes": [
    "Valen för respektive post finns kvar över växling och återöppning.",
    "Lo visar inaktuellt underlag och kräver aktuell jämförelse. Växling till en annan post kan inte häva den spärren; tjänstens opåverkade val består.",
    "Ingen gemensam ändring eller nytt sparande görs av det avvisade försöket."
  ]
}
```
<!-- markdownlint-enable MD013 -->

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
UTKAST-50.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-50"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; gör bara om val för ändrade egenskaper.",
  "outcomes": [
    "Bara det berörda namnvalet återställs. Beskrivningsvalet behålls.",
    "Det privata utkastet innehåller Lo Lind och Min anteckning mot nytt underlag.",
    "Den gemensamma kartan behåller Lo Ås och Robins anteckning. Inget sparande görs."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna konflikten och välj Alex namn och beskrivning.
2. Kör `newer-name`. Försök lägga valen i utkastet; läs att underlaget ändrats.
3. Kör `check-error` och välj **Visa aktuell jämförelse**. Läs hämtningsfelet
   med fokus kvar i dialogen och båda valen bevarade.
4. Kör `network-ok` och visa aktuell jämförelse igen. Beskrivningen är
   fortfarande vald, namnet kräver val.
5. Välj Alex namn igen och lägg valen i utkastet.
**Separat tekniskt underlag:** Operatörens `result` läser karta,
privat utkast och historik via HTTP. Automationen behåller dessa jämförelser
och eventuell versions- eller anropsräkning; de är inga vanliga UI-steg.

**Förväntat resultat:**

- Bara det berörda namnvalet återställs. Beskrivningsvalet behålls.
- Det privata utkastet innehåller Lo Lind och Min anteckning mot nytt underlag.
- Den gemensamma kartan behåller Lo Ås och Robins anteckning. Inget sparande
  görs.

### UTKAST-51: pröva kombinationen igen efter ändrad typ eller referens

**Syfte:** Behålla opåverkade val utan att bekräfta en inaktuell eller ogiltig
kombination.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-type`.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-51.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-51"
  },
  "reference": "Objekttyp; omprövning mot ändrad typdefinition.",
  "outcomes": [
    "Ändrad typ kräver aktuell jämförelse. Texten passar inte Mätobjekts numeriska fält; orsaken förklaras och bekräftelsen spärras utan automatisk ändring av val.",
    "En giltig typkombination kan läggas i utkastet. Kartans sparade typ och värden består."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. I `new-type`, öppna konflikten. Välj Alex namn, beskrivning och **Min text**.
2. Kör `newer-type`: Robin sparar Mätobjekt och en ny förklaring för
   Anteckningsobjekt. Försök lägga valen i utkastet och visa aktuell jämförelse.
3. Beskrivningens val är kvar. Välj Min text igen och den sparade typen
   **Mätobjekt**.
4. Läs felet. Välj Alex **Anteckningsobjekt** och lägg kombinationen i utkastet.

**Förväntat resultat:**

- Ändrad typ kräver aktuell jämförelse. Texten passar inte Mätobjekts numeriska
  fält; orsaken förklaras och bekräftelsen spärras utan automatisk ändring av
  val.
- En giltig typkombination kan läggas i utkastet. Kartans sparade typ och värden
  består.

### UTKAST-52: behåll val vid känd avvisning och återförsök efter kontroll

**Syfte:** Hantera ett nyare privat utkast utan att kasta val eller andra
förslag.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-base`.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-52.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-52"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; behåll val vid känd avvisning och återförsök efter kontroll.",
  "outcomes": [
    "Ett gammalt versionsförsök avvisas utan ändring; orsaken förklaras och valen består.",
    "Beskedet om nytt underlag har en enda aktiv kanal för annonsering.",
    "Efter aktuell jämförelse kan samma val bekräftas utan att göras om.",
    "Privat stol finns kvar. Bekräftelsen gör en enda privat ändring och skapar ingen historikgrupp."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Välj Alex namn och beskrivning i konflikten.
2. Kör `newer-private`: en annan klient för Alex lägger Privat stol i utkastet.
3. Försök lägga konfliktvalen i utkastet. Läs avvisningen och kontrollera
   spärren.
4. Visa aktuell jämförelse. Båda valen finns kvar. Bekräfta.

**Separat tekniskt underlag:** Operatörens `result` läser karta,
privat utkast och historik via HTTP. Automationen behåller dessa jämförelser
och eventuell versions- eller anropsräkning; de är inga vanliga UI-steg.

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
UTKAST-53.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-53"
  },
  "reference": "1280 × 900, Karta, båda föreslagna värden; genomförd privat ändring.",
  "outcomes": [
    "Uppföljningen förblir åtkomlig när sista konflikten försvinner. Ingen öppning eller kontroll upprepar bekräftelsen.",
    "Lo Lind och Min anteckning finns i det privata utkastet efter kontrollen. Resultatet visar bock och Vald lösning, utan gemensamt sparkvitto.",
    "Lo Berg och Robins anteckning förblir sparade. Historiken ändras inte."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Använd Karta vid 1280 × 900 pixlar. Öppna **1 konflikt i ditt utkast**.
   Välj Alex namn Lo Lind och beskrivning Min anteckning. Bekräfta och läs
   det oklara utfallet efter `lose-applied`.
2. Stäng med Escape och öppna igen. Invänta att konfliktknappen försvinner
   när aktuellt utkast hämtas. Stäng igen utan att kontrollera.
3. Välj **Visa konfliktvalet**. Kontrollera rubrikens fokus och spärrad
   **Lägg valen i utkastet**. Välj **Kontrollera om valet lades i utkastet**.
4. Läs **Valen finns i ditt utkast** och bocken. Stäng med Escape och läs
   Lo Lind och Min anteckning i Utkast. Spara inte kartan.

**Separat tekniskt underlag:** `result` jämför privat utkast, sparade
uppgifter och historik. Automationen kontrollerar en enda skickad resolution.

**Separat tekniskt underlag:** Operatörens `result` läser karta,
privat utkast och historik via HTTP. Automationen behåller dessa jämförelser
och eventuell versions- eller anropsräkning; de är inga vanliga UI-steg.

**Förväntat resultat:**

- Uppföljningen förblir åtkomlig när sista konflikten försvinner. Ingen
  öppning eller kontroll upprepar bekräftelsen.
- Lo Lind och Min anteckning finns i det privata utkastet efter kontrollen.
  Resultatet visar bock och Vald lösning, utan gemensamt sparkvitto.
- Lo Berg och Robins anteckning förblir sparade. Historiken ändras inte.

### UTKAST-54: kontrollera en utebliven ändring före nytt försök

**Syfte:** Behålla val även när kontrollen först misslyckas.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-base`, sedan `lose-unsent`. Använd 1280 × 900
pixlar.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-54.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-54"
  },
  "reference": "1280 × 900; ändringen når inte servern och kontrollen misslyckas först.",
  "outcomes": [
    "Misslyckad kontroll och återöppning ger aldrig tillstånd att upprepa åtgärden.",
    "En lyckad faktisk kontroll av utebliven ändring tillåter ett nytt försök.",
    "Valen finns kvar på dator och smal skärm. Ett enda genomfört försök ändrar det privata utkastet; den gemensamma kartan består."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **1 konflikt i ditt utkast**. Välj Alex namn och beskrivning,
   bekräfta och läs det oklara utfallet.
2. Stäng och öppna igen. Kör `check-error` och välj **Kontrollera om valet lades
   i utkastet**.
3. Läs att utfallet fortfarande är oklart. Kör `network-ok` och kontrollera
   igen.
4. Läs att ändringen inte genomfördes. Kör `network-ok` för normal leverans,
   bekräfta med de bevarade valen.

**Separat tekniskt underlag:** Operatörens `result` läser karta,
privat utkast och historik via HTTP. Automationen behåller dessa jämförelser
och eventuell versions- eller anropsräkning; de är inga vanliga UI-steg.

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
UTKAST-55.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-55"
  },
  "reference": "Karta; nya sparade uppgifter medan dialogen är stängd.",
  "outcomes": [
    "Aktuellt underlag hämtas innan någon gammal lösning kan bekräftas.",
    "Beskedet om nytt underlag har en enda aktiv kanal för annonsering.",
    "Bara namnvalet behöver göras om. Beskrivningen behålls.",
    "Ingen öppning, stängning eller jämförelse ändrar utkastet eller den gemensamma kartan."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Välj Alex namn och beskrivning. Stäng med Escape.
2. Kör `newer-name`. Öppna konflikten igen och läs beskedet om nytt underlag.
3. Visa aktuell jämförelse och granska kvarvarande val.
**Separat tekniskt underlag:** Operatörens `result` läser karta,
privat utkast och historik via HTTP. Automationen behåller dessa jämförelser
och eventuell versions- eller anropsräkning; de är inga vanliga UI-steg.

**Förväntat resultat:**

- Aktuellt underlag hämtas innan någon gammal lösning kan bekräftas.
- Beskedet om nytt underlag har en enda aktiv kanal för annonsering.
- Bara namnvalet behöver göras om. Beskrivningen behålls.
- Ingen öppning, stängning eller jämförelse ändrar utkastet eller den gemensamma
  kartan.

### UTKAST-56: följ väntan och oklart utfall utan fokusstöld

**Syfte:** Ge ett tillgängligt besked och spärra upprepning över dialogens
livstid.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-base`, `hold` och `lose-applied`.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-56.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-56"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; följ väntan och oklart utfall utan fokusstöld.",
  "outcomes": [
    "Under väntan kan begäran inte upprepas och dialogen kan inte lämnas.",
    "Vid oklart utfall går det att stänga. Ett beständigt tillgängligt statusbesked finns utanför dialogen och flyttar inte fokus från senare arbete.",
    "Bara en av konfliktflödets statusregioner är aktiv för uppläsning åt gången. Återöppning återställer inte bekräftelse; faktisk kontroll visar den genomförda lösningen."
  ]
}
```
<!-- markdownlint-enable MD013 -->

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

### UTKAST-57: acceptera en redan genomförd objektborttagning

**Syfte:** Kasta bara det egna ändringsförslaget när ett sparat objekt redan
är borttaget, utan att återställa objektet eller göra en ny borttagning.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-removed-object`. Alex föreslår **Lo Lind** och
**Mitt förslag** samt ett oberoende nytt objekt. Robin tar bort det sparade
objektet. Kör `result` för att läsa utgångsläget.

**Integrationstest:**
[conflict-special.spec.ts](../../tests/integration/conflict-special.spec.ts),
UTKAST-57.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-special.spec.ts",
    "caseId": "UTKAST-57"
  },
  "reference": "1280 och 320 × 900 i samma körning; läsbara skillnader och omflöde.",
  "outcomes": [
    "Läsning, öppning och stängning ändrar inget. Förklaringen lyder **Objektet togs bort från den gemensamma kartan medan du redigerade det.** Varningen lyder **Objektet är borttaget. Ditt ändringsförslag kan inte återställa det.**",
    "Bekräftelsen kastar endast Lo Linds förslag. Det oberoende förslaget består.",
    "Objektet förblir borttaget och historiken får ingen ny gemensam ändring. Beskedet säger att förslaget tas bort ur utkastet. Namnet och typen står kvar i konfliktlistan med en bock och tillgänglig lösningsstatus."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **1 konflikt i ditt utkast**. Läs förklaringen om den genomförda
   borttagningen och varningen att förslaget inte kan återställa objektet.
2. Läs **Borttaget** och **✓ Förvalt** på den sparade sidan och hela ditt
   förslag på den andra.
   Under **Resultat av valen** anges **Objekt: Borttaget**.
3. Stäng med Escape. Öppna konflikten igen.
4. Välj **Acceptera borttagningen och kasta ditt förslag**. Läs statusen och
   postens kvarvarande namn, typ och lösningsmarkering.

**Separat tekniskt underlag:** Operatörens `result` läser karta,
privat utkast och historik via HTTP. Automationen behåller dessa jämförelser
och eventuell versions- eller anropsräkning; de är inga vanliga UI-steg.

**Förväntat resultat:**

- Läsning, öppning och stängning ändrar inget. Förklaringen lyder
  **Objektet togs bort från den gemensamma kartan medan du redigerade det.**
  Varningen lyder **Objektet är borttaget. Ditt ändringsförslag kan inte
  återställa det.**
- Bekräftelsen kastar endast Lo Linds förslag. Det oberoende förslaget består.
- Objektet förblir borttaget och historiken får ingen ny gemensam ändring.
  Beskedet säger att förslaget tas bort ur utkastet. Namnet och typen står
  kvar i konfliktlistan med en bock och tillgänglig lösningsstatus.

### UTKAST-58: acceptera ett redan borttaget samband

**Syfte:** Kasta sambandsförslaget utan att återställa det sparade sambandet.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-removed-relationship`. Alex ändrar säkerheten
för ett sparat samband från Lo till Molnmusik. Robin tar bort sambandet.

**Integrationstest:**
[conflict-special.spec.ts](../../tests/integration/conflict-special.spec.ts),
UTKAST-58.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-special.spec.ts",
    "caseId": "UTKAST-58"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; acceptera ett redan borttaget samband.",
  "outcomes": [
    "Förklaringen lyder **Sambandet togs bort från den gemensamma kartan medan du redigerade det.** Varningen lyder **Ett ändringsförslag kan inte återställa ett borttaget samband.**",
    "Öppning och stängning ändrar inget. Bara det bekräftade förslaget kastas; oberoende förslag består. Säkerheten **Osäkert uppgivet** går att läsa.",
    "Sambandet förblir borttaget, kartan och historiken ändras inte och den lösta postens namn och typ finns kvar med lösningsmarkering."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna konflikten och läs förklaringen om det borttagna sambandet.
2. Läs **Borttaget**, **✓ Förvalt** och hela det egna förslaget i läsläge.
   Under **Resultat av valen** anges **Samband: Borttaget**.
3. Stäng med Escape och öppna igen.
4. Välj **Acceptera borttagningen och kasta ditt förslag**.

**Separat tekniskt underlag:** Operatörens `result` läser karta,
privat utkast och historik via HTTP. Automationen behåller dessa jämförelser
och eventuell versions- eller anropsräkning; de är inga vanliga UI-steg.

**Förväntat resultat:**

- Förklaringen lyder **Sambandet togs bort från den gemensamma kartan medan
  du redigerade det.** Varningen lyder **Ett ändringsförslag kan inte
  återställa ett borttaget samband.**
- Öppning och stängning ändrar inget. Bara det bekräftade förslaget kastas;
  oberoende förslag består. Säkerheten **Osäkert uppgivet** går att läsa.
- Sambandet förblir borttaget, kartan och historiken ändras inte och den
  lösta postens namn och typ finns kvar med lösningsmarkering.

### UTKAST-59: kasta bara ett föreslaget dubblettsamband

**Syfte:** Behålla det faktiskt sparade sambandet och dess uppgifter.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-duplicate`. Alex föreslår ett osäkert samband;
Robin sparar ett annat samband med samma typ, riktning och objekt.

**Integrationstest:**
[conflict-special.spec.ts](../../tests/integration/conflict-special.spec.ts),
UTKAST-59.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-special.spec.ts",
    "caseId": "UTKAST-59"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; kasta bara ett föreslaget dubblettsamband.",
  "outcomes": [
    "Förklaringen lyder **Ett sparat samband har redan samma typ, riktning och objekt.** Varningen lyder **Sambandet finns redan. Ta bort det föreslagna sambandet ur ditt utkast.**",
    "Jämförelsen visar sambandet i läsläge. Utfallet **Sambandet i ditt utkast: Tas bort ur ditt utkast** är markerat **✓ Förvalt**. Det redan sparade sambandet och dess uppgifter behålls. Efter bekräftelsen visas **Borttaget ur ditt utkast**.",
    "Öppning och stängning ändrar inget. Bekräftelsen kastar bara dubblettens förslag. Sparade uppgifter, historik och oberoende utkast består."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna konflikten. Läs det sparade sambandet och det egna förslaget.
2. Läs varningen och det förvalda utfallet under **Resultat av valen**.
3. Stäng och öppna igen.
4. Välj **Ta bort sambandet ur ditt utkast**. Läs status.

**Separat tekniskt underlag:** Operatörens `result` läser karta,
privat utkast och historik via HTTP. Automationen behåller dessa jämförelser
och eventuell versions- eller anropsräkning; de är inga vanliga UI-steg.

**Förväntat resultat:**

- Förklaringen lyder **Ett sparat samband har redan samma typ, riktning
  och objekt.** Varningen lyder **Sambandet finns redan. Ta bort det
  föreslagna sambandet ur ditt utkast.**
- Jämförelsen visar sambandet i läsläge. Utfallet
  **Sambandet i ditt utkast: Tas bort ur ditt utkast** är markerat
  **✓ Förvalt**. Det redan sparade sambandet och dess uppgifter behålls.
  Efter bekräftelsen visas **Borttaget ur ditt utkast**.
- Öppning och stängning ändrar inget. Bekräftelsen kastar bara dubblettens
  förslag. Sparade uppgifter, historik och oberoende utkast består.

### UTKAST-60: kasta ett sambandsförslag med saknat målobjekt

**Syfte:** Ta bort ett oanvändbart förslag utan att påverka andra uppgifter.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-missing-endpoint`. Robin tar bort målobjektet
Molnmusik efter att Alex föreslår ett samband till det.

**Integrationstest:**
[conflict-special.spec.ts](../../tests/integration/conflict-special.spec.ts),
UTKAST-60.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-special.spec.ts",
    "caseId": "UTKAST-60"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; kasta ett sambandsförslag med saknat målobjekt.",
  "outcomes": [
    "Förklaringen lyder **Ett objekt som sambandet pekar på saknas.** Varningen lyder **Sambandet kan inte läggas till eftersom ett objekt som det pekar på saknas.** Utfallet **Sambandet i ditt utkast: Tas bort ur ditt utkast** är förvalt och hela förslaget går att läsa. Ett nytt samband läggs till den vanliga vägen. Efter bekräftelsen visas **Borttaget ur ditt utkast**.",
    "Stängning ändrar inget. Bekräftelsen kastar bara sambandsförslaget. Den sparade borttagningen, historiken och det oberoende utkastet består."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna konflikten, läs de berörda uppgifterna och förklaringen.
2. Läs det förvalda utfallet. Stäng med Escape.
3. Öppna igen och välj **Ta bort sambandet ur ditt utkast**.
4. Läs status och kör `result` för att jämföra kartan och övriga förslag.

**Separat tekniskt underlag:** Operatörens `result` läser karta,
privat utkast och historik via HTTP. Automationen behåller dessa jämförelser
och eventuell versions- eller anropsräkning; de är inga vanliga UI-steg.

**Förväntat resultat:**

- Förklaringen lyder **Ett objekt som sambandet pekar på saknas.**
  Varningen lyder **Sambandet kan inte läggas till eftersom ett objekt
  som det pekar på saknas.**
  Utfallet **Sambandet i ditt utkast: Tas bort ur ditt utkast** är förvalt
  och hela förslaget går att läsa. Ett nytt samband läggs till den vanliga
  vägen. Efter bekräftelsen visas **Borttaget ur ditt utkast**.
- Stängning ändrar inget. Bekräftelsen kastar bara sambandsförslaget.
  Den sparade borttagningen, historiken och det oberoende utkastet består.

### UTKAST-61: behåll ett eget borttagningsförslag mot ändrade fakta

**Syfte:** Kräva ett aktivt val innan borttagningen får sparas mot nytt
underlag.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-own-removal`. Alex föreslår att Lo tas bort;
Robin sparar **Lo Berg** och **Nya sparade fakta** innan Alex hinner spara.

**Integrationstest:**
[conflict-special.spec.ts](../../tests/integration/conflict-special.spec.ts),
UTKAST-61.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-special.spec.ts",
    "caseId": "UTKAST-61"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; behåll ett eget borttagningsförslag mot ändrade fakta.",
  "outcomes": [
    "Förklaringen lyder **Du föreslår borttagning. Robin sparade ändringar i objektet innan du hann spara ditt förslag.**",
    "Bekräftelsen behåller en föreslagen borttagning mot de faktiskt nya sparade uppgifterna. Kartan ändras först vid separat sparande.",
    "Det oberoende förslaget består. Det senare atomiska sparandet genomför den uttryckligen valda borttagningen och sparar övriga giltiga förslag."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna konflikten och läs Robins aktuella uppgifter samt förklaringen.
2. Kontrollera att **Lägg valen i utkastet** är spärrad utan ett aktivt val.
3. Välj **Föreslagen borttagning** för objektet. Läs **Resultat av valen** och
   lägg valet i utkastet.
4. Stäng dialogen. Öppna **Skriv till Skyttel → Visa utkastet** och spara
   hela utkastet från sparikonen.

**Separat tekniskt underlag:** Operatörens `result` läser karta,
privat utkast och historik via HTTP. Automationen behåller dessa jämförelser
och eventuell versions- eller anropsräkning; de är inga vanliga UI-steg.

**Förväntat resultat:**

- Förklaringen lyder **Du föreslår borttagning. Robin sparade ändringar i
  objektet innan du hann spara ditt förslag.**
- Bekräftelsen behåller en föreslagen borttagning mot de faktiskt nya
  sparade uppgifterna. Kartan ändras först vid separat sparande.
- Det oberoende förslaget består. Det senare atomiska sparandet genomför
  den uttryckligen valda borttagningen och sparar övriga giltiga förslag.

### UTKAST-62: välj objekt och tillkommande samband oberoende

**Syfte:** Behålla objektet och ta bort ett samband eller välja en giltig
borttagning, utan automatiskt ändrade val.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-connections`. Robin sparar ett nytt samband
som berör Lo efter Alex borttagningsförslag.

**Integrationstest:**
[conflict-special.spec.ts](../../tests/integration/conflict-special.spec.ts),
UTKAST-62.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-special.spec.ts",
    "caseId": "UTKAST-62"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; välj objekt och tillkommande samband oberoende.",
  "outcomes": [
    "Förklaringen lyder **Du föreslår borttagning. Ytterligare ett sparat samband berör nu objektet.**",
    "Felet lyder **Objektet kan inte tas bort medan sambandet till det finns kvar. Välj att ta bort sambandet eller behåll objektet.** Inga val ändras automatiskt och inget läggs i utkastet vid den ogiltiga kombinationen.",
    "Den giltiga kombinationen kastar objektets borttagningsförslag och lägger en uttrycklig sambandsborttagning i utkastet. Kartan ändras först vid sparande.",
    "Efter sparandet består Lo med samma sparade uppgifter; bara sambandet tas bort och det oberoende objektförslaget sparas."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna konflikten. Välj föreslagen objektborttagning och det sparade
   sambandet.
2. Läs kombinationsfelet och kontrollera att bekräftelsen är spärrad.
3. Välj det sparade objektet och föreslagen borttagning av sambandet.
4. Lägg valen i utkastet. Stäng och öppna
   **Skriv till Skyttel → Visa utkastet**. Spara utkastet separat.

**Separat tekniskt underlag:** Operatörens `result` läser karta,
privat utkast och historik via HTTP. Automationen behåller dessa jämförelser
och eventuell versions- eller anropsräkning; de är inga vanliga UI-steg.

**Förväntat resultat:**

- Förklaringen lyder **Du föreslår borttagning. Ytterligare ett sparat
  samband berör nu objektet.**
- Felet lyder **Objektet kan inte tas bort medan sambandet till det finns
  kvar. Välj att ta bort sambandet eller behåll objektet.** Inga val ändras
  automatiskt och inget läggs i utkastet vid den ogiltiga kombinationen.
- Den giltiga kombinationen kastar objektets borttagningsförslag och lägger
  en uttrycklig sambandsborttagning i utkastet. Kartan ändras först vid
  sparande.
- Efter sparandet består Lo med samma sparade uppgifter; bara sambandet
  tas bort och det oberoende objektförslaget sparas.

### UTKAST-63: kontrollera oklara föreslagna borttagningar

**Syfte:** Verifiera båda faktiskt bevarade borttagningsförslagen utan replay.

**Användare:** Alex och Robin enligt förberedelsen ovan.

**Förutsättningar:** Kör `new-connections`, sedan `lose-applied`. Använd Karta
vid 320 × 900 pixlar.

**Integrationstest:**
[conflict-special.spec.ts](../../tests/integration/conflict-special.spec.ts),
UTKAST-63.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-special.spec.ts",
    "caseId": "UTKAST-63"
  },
  "reference": "320 × 900, Karta; genomförda borttagningsval med tappat svar.",
  "outcomes": [
    "Kontroll och återöppning skickar aldrig en ny resolution. Båda borttagningsförslagens faktiska underlag och privata utfall kontrolleras.",
    "Den genomförda lösningen visas med bock och båda föreslagna borttagningarna. Beskedet säger att valen finns i utkastet och kartan sparas separat.",
    "Uppföljningen förblir nåbar från Karta och Tabell när sista konflikten försvinner. Sparade objekt, samband och historik är oförändrade."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna konflikten, välj borttagning av både objektet och sambandet och
   bekräfta.
2. Läs det oklara utfallet, stäng och öppna igen så att den nya jämförelsen
   hämtas.
3. Stäng. När konfliktknappen försvinner, välj **Visa konfliktvalet**.
4. Kontrollera att vanlig bekräftelse är spärrad. Välj **Kontrollera om valet
   lades i utkastet**.

**Separat tekniskt underlag:** Operatörens `result` läser karta,
privat utkast och historik via HTTP. Automationen behåller dessa jämförelser
och eventuell versions- eller anropsräkning; de är inga vanliga UI-steg.

**Förväntat resultat:**

- Kontroll och återöppning skickar aldrig en ny resolution. Båda
  borttagningsförslagens faktiska underlag och privata utfall kontrolleras.
- Den genomförda lösningen visas med bock och båda föreslagna borttagningarna.
  Beskedet säger att valen finns i utkastet och kartan sparas separat.
- Uppföljningen förblir nåbar från Karta och Tabell när sista konflikten
  försvinner. Sparade objekt, samband och historik är oförändrade.

### UTKAST-64: saknad objekttyp och uttryckligt kastande

**Syfte:** Ge en tydlig rättelseväg eller kasta endast det berörda objektförslaget.

**Användare:** Medlemmen Robin arbetar i det synliga fönstret. Administratören
Alex förbereder den isolerade installationen genom offentliga HTTP-anrop.

**Förutsättningar:** Kör `new-missing-object-type`. Förberedelsen exporterar
Robins giltiga äldre utkast, kastar det offentligt och tar sedan bort den
oanvända typen med vanligt sparande. Alex återimporterar aktuell giltig export
med endast Robins tidigare utkast och uppdaterade arkivkontrollsummor. Robins
ägarkoppling bevaras; inga databasändringar eller externa AI-anrop används.

**Integrationstest:**
[conflict-external-corrections.spec.ts](../../tests/integration/conflict-external-corrections.spec.ts),
testfallet “UTKAST-64: a missing object type keeps its proposal readable and
discards only the explicitly confirmed object”.

**Steg:**

1. Öppna konflikten och läs varningen, hänvisningen till Inställningar och
   hela objektförslaget med **Våren 2021**.
2. Stäng och kör `result`. Läs det bevarade förslaget.
3. Öppna igen och välj **Ta bort objektet ur ditt utkast**. Kör `result`.

**Förväntat resultat:**

- Jämförelsen är i läsläge. Typen visas som **Saknas**; det egna förslaget
  finns kvar när dialogen stängs. Förhandsvisningen anger **Objektet i ditt
  utkast: Tas bort ur ditt utkast** och att övriga objekt och samband inte
  påverkas. Efter bekräftelsen visas **Borttaget ur ditt utkast**.
- Instruktionen lyder **Stäng konfliktfönstret och lägg till objekttypen under
  Inställningar → Typer och egna fält. Ditt förslag ligger kvar. Alternativt
  kan du ta bort objektet ur ditt utkast nedan.**
- Bekräftelsen kastar endast det berörda objektförslaget. Oberoende utkast,
  sparade objekt och historik består. Medlemmen behöver ingen administrativ
  behörighet för själva konfliktåtgärden.

### UTKAST-65: rätta ändrad datatyp i den vanliga objektdialogen

**Syfte:** Rätta värdet uttryckligen i ordinarie flöde före en faktisk ny bedömning.

**Användare:** Robin i det synliga fönstret och Alex som administrativ förberedare.

**Förutsättningar:** Kör `new-invalid-datatype`. Den offentliga förberedelsen
följer UTKAST-64 men ändrar lagligen Installationsår från Text till Tal medan
utkastet är tomt. Robins tidigare textvärde återimporteras mot aktuell definition.

**Integrationstest:**
[conflict-external-corrections.spec.ts](../../tests/integration/conflict-external-corrections.spec.ts),
testfallet “UTKAST-65: an incompatible historical field is corrected in the
ordinary object form before fresh conflict assessment”.

**Steg:**

1. Öppna konflikten och läs det tidigare värdet **Våren 2021** i läsläge.
2. Läs hänvisningen till den vanliga objektdialogen och välj **Stäng konfliktfönstret**.
3. Välj Tabell och **Redigera Solcellsanläggningen**. Öppna Egna fält,
   fyll Installationsår med `2021` och välj **Lägg i utkastet och stäng**.
4. Kontrollera att den enda konflikten försvinner. Kör `result`, öppna
   **Skriv till Skyttel → Visa utkastet** och spara utkastet separat från
   sparikonen.

**Förväntat resultat:**

- Stängning bevarar utkastet.
- Instruktionen lyder **Stäng konfliktfönstret och rätta uppgiften i den vanliga
  objektdialogen. Lägg ändringen i ditt utkast och kom sedan tillbaka hit.
  Ditt förslag ligger kvar under tiden.**
- Den vanliga dialogen lägger talvärdet och den aktuella typdefinitionen i
  utkastet. Faktisk ny bedömning tar bort det lösta hindret; oberoende förslag
  och sparade fakta består tills utkastet sparas separat.
- Det genomförda atomiska sparandet innehåller Installationsår `2021` som Tal.

### UTKAST-66: rätta ett samband med borttagen typ genom en faktisk ny definition

**Syfte:** Bevara läsbara historiska uppgifter och kräva ett uttryckligt
typbyte innan ett kvarvarande sambandsförslag kan sparas.

**Användare:** Robin i fönstret; Alex förbereder arkivet i sin separata session.

**Förutsättningar:** Kör `new-missing-relationship-type`. Sambandet från
**Lo Exempel** till **Molnmusik** har den borttagna typen **Förvaras i**
och ett eget fält **Installationsår: Våren 2021**. Fältets ID är
`storage-year`. Ett oberoende objektförslag finns kvar.

**Integrationstest:**
[conflict-external-corrections.spec.ts](../../tests/integration/conflict-external-corrections.spec.ts),
testfallet “UTKAST-66: a missing relationship type needs an actual new
definition and explicit ordinary correction with readable historical field loss”.

**Steg:**

1. Öppna konflikten och läs anvisningen samt förslagets historiska fältnamn
   och värde. Stäng med Escape och kör `result`.
2. Öppna **Inställningar → Typer och egna fält → Ny sambandstyp**.
   Ange namn **Förvaras i**, beskrivning **Ny faktisk definition**,
   framåtriktning **förvaras i** och bakåtriktning **förvarar**.
   Lägg till ett eget talfält med namnet **Installationsår**.
   Lägg typen i utkastet och återgå till kartan.
3. Öppna konflikten igen. Kontrollera att den fortfarande gäller trots
   samma typnamn. Stäng och välj **Tabell → Samband för Lo Exempel**.
4. Välj **Redigera samband**, byt till den nya typen och läs bekräftelsen
   **Ta bort tidigare egna fält?**. Tryck Escape och kör `result`.
5. Byt typ igen och välj **Ta bort fältvärdena och byt typ**.
   Välj **Lägg i utkastet**, stäng samband och kör `result`.
6. Öppna **Skriv till Skyttel → Visa utkastet** och spara separat.

**Förväntat resultat:**

- Den borttagna typen och **Installationsår: Våren 2021** är läsbara.
- En ny typ med samma namn har ett annat ID. Konflikten består tills
  sambandet uttryckligen använder den faktiska nya definitionen.
- Typbytesbekräftelsen visar **Installationsår**, inte `storage-year`.
  Escape bevarar alla privata förslag. Det uttryckligt bekräftade bytet
  tar bort det gamla fältvärdet utan att kopiera det till den nya typen.
- Det nya talfältet har ett annat ID och förblir obesvarat trots samma
  fältnamn. Dess formulärfält är tomt före inskickning.
- Det oberoende förslaget, kartan och historiken består under rättningen.
  Konflikten försvinner efter ny granskning; först det separata sparandet
  gör definitionen, sambandet och övriga giltiga förslag gemensamma.

### UTKAST-67: återställ en borttagen typdefinition efter uttrycklig granskning

**Syfte:** Bevara typens identitet och revisionsföljd utan att spara kartan
eller återställa objekt när konfliktvalet bekräftas.

**Användare:** Medlemmen Robin i fönstret; Alex förbereder arkivet som
administratör i en separat session.

**Förutsättningar:** Använd förberedaren ovan. Kör `new-object-restoration`
för objekttyp eller `new-relationship-restoration` för sambandstyp. Den
förbereder en faktiskt sparad definition, ett äldre privat ändringsförslag
och en senare laglig gemensam borttagning. Alex återimporterar det äldre
ägda utkastet i en aktuell, validerad export med nya kontrollsummor. Inga
databasrader ändras direkt. Ett oberoende objektförslag finns i Robins utkast.

**Integrationstest:**
[conflict-definition-restoration.spec.ts](../../tests/integration/conflict-definition-restoration.spec.ts),
testfallen “UTKAST-67: an explicitly reviewed removed object definition
restores its historical identity only on a separate save” och
“UTKAST-67: an explicitly reviewed removed relationship definition restores
its historical identity only on a separate save”.

**Steg:**

1. Öppna **1 konflikt i ditt utkast** och läs hela typdefinitionen.
2. Kontrollera **Borttaget** på den sparade sidan och att bekräftelsen är
   spärrad utan ett aktivt val. Stäng med Escape och kör `result`.
3. Öppna igen och välj hela den föreslagna **Typdefinition**. Läs resultatet.
4. Välj **Lägg valen i utkastet** och kör `result`. Läs hela definitionen i
   det bekräftade resultatet innan du stänger dialogen. Öppna
   **Skriv till Skyttel → Visa utkastet** och spara hela utkastet separat.
5. Upprepa i ett smalt mobilfönster för båda typdefinitionerna. Läs namn,
   beskrivning, fält och riktningar före val, efter val och efter bekräftelse.

**Förväntat resultat:**

- Förklaringen lyder **Typdefinitionen saknas nu i kartan. Ditt förslag
  innehåller ändringar i den.** Fullständiga privata namn, beskrivningar,
  fält och riktningar är läsbara i ett aktivt val för hela definitionen.
  Varje uppgift börjar på en egen rad i jämförelsen och i det valda och
  bekräftade resultatet, även i mobilfönstret. Inga fullständiga värden
  försvinner eller flyter ihop med nästa egenskaps namn.
- Förhandsresultatet lyder **Typdefinitionen föreslås återställas med din
  ändring.** Stängning ändrar inget. Bekräftelsen ändrar bara Robins utkast,
  behåller det oberoende förslaget och skapar inget gemensamt historikpost.
- Förslaget behåller den ursprungliga typens ID och går från den faktiskt
  borttagna revisionen 2 till revision 3. Kartan saknar typen fram till
  det separata sparandet. Inget borttaget objekt eller samband återställs.
- Sparandet gör definitionen och det oberoende objektet gemensamma.
  Den privata återställningsbehörigheten finns inte i kvittot eller historiken.

### UTKAST-68: avvisa inaktuell återställning utan delvis sparande

**Syfte:** Kräva aktuell granskning när en annan användare hunnit återställa
och ändra samma definition och bevara oberoende förslag vid avvisning.

**Användare:** Robin i fönstret; Alex i förberedarens separata session.

**Förutsättningar:** Kör `new-restoration-two`. Båda har var sitt verkligt
ägt tidigare definitionsförslag. Robin har också ett oberoende objektförslag.

**Integrationstest:**
[conflict-definition-restoration.spec.ts](../../tests/integration/conflict-definition-restoration.spec.ts),
testfallet “UTKAST-68: a newer saved definition rejects stale restoration
atomically and preserves independent proposals”.

**Steg:**

1. Kör `probe-definition-guards` före granskningen och därefter `result`.
2. Öppna Robins konflikt, välj den föreslagna definitionen och lägg valet i
   utkastet. Stäng dialogen. Kör `probe-reused-definition` för att försöka
   använda samma tidigare jämförelse igen.
3. Kör `newer-definition`. Alex granskar sitt eget förslag och sparar
   definitionen. Förberedaren försöker därefter ta bort definitionen medan
   Robins privata återställningsförslag finns kvar och kontrollerar HTTP 409
   samt oförändrade privata utkast, gemensamma uppgifter och historik.
   Alex sparar sedan **Ny gemensam typbenämning** som nästa revision.
4. Kör `try-restoration-save` och `result`.
5. Öppna den aktuella konflikten. Välj Robins föreslagna namn och beskrivning;
   samma egna fält behöver inget nytt val. Lägg valen i utkastet.
6. Öppna **Skriv till Skyttel → Visa utkastet** och spara separat.

**Förväntat resultat:**

- Felaktig jämförelse och den andra privata ägarens jämförelse avvisas med
  HTTP 409 utan utkaständring. `probe-reused-definition` avvisas också med
  HTTP 409. Förberedaren kontrollerar att båda privata utkasten, gemensamma
  uppgifter och historik är oförändrade vid varje avvisning.
- Typens användningsskydd gäller även för privata återställningsförslag;
  en annan användare får inte ta bort definitionen medan förslaget finns.
- Det gamla sparandet avvisas med HTTP 409. Robins hela utkast, sparade
  objekt, Alex revision 4 och historik består. Det oberoende objektet
  blir inte gemensamt genom det avvisade försöket.
- Ny aktuell granskning använder den faktiskt sparade definitionen. Robins
  förslag blir en vanlig ändring mot revision 4, utan gammal
  återställningsbehörighet. Separat sparande ger revision 5 och sparar
  det oberoende objektet tillsammans med definitionen.

### UTKAST-69: ompröva återställningsförslag efter import

**Syfte:** Läsa och rätta ett importerat privat förslag utan att arkivet
överför behörighet från en tidigare innehållsgeneration.

**Användare:** Robin i fönstret; administratören Alex utför export och import.

**Förutsättningar:** Kör `new-relationship-restoration`. Förberedelsen
använder verklig offentlig export, kontrollsummor och validerad import
inom samma hushåll med oförändrad betrodd privat ägare.

**Integrationstest:**
[conflict-definition-restoration.spec.ts](../../tests/integration/conflict-definition-restoration.spec.ts),
testfallet “UTKAST-69: importing a private restoration requires a fresh
explicit review in the replacement generation”.

**Steg:**

1. Granska definitionen och lägg det föreslagna återställningsvalet i utkastet.
2. Kör `result`, därefter `reimport-restoration`. Alex exporterar och
   återimporterar aktuellt innehåll genom den offentliga HTTP-gränsen.
3. Kör `try-restoration-save` och kontrollera avvisningen. Ladda om fönstret.
   Öppna konflikten på nytt och kontrollera definitionen.
4. Välj och bekräfta den föreslagna definitionen på aktuellt underlag.
5. Spara hela utkastet separat från Utkastets sparikon.

**Förväntat resultat:**

- Exporten bevarar det privata förslaget. Importen behåller dess ägare,
  värden och oberoende förslag men överför ingen gammal
  återställningsbehörighet. Innehållsgenerationen ökar.
- Förslaget är fortfarande läsbart och uttryckligen granskningsbart, inte
  tyst godkänt eller permanent spärrat. Sparande före den nya granskningen
  avvisas utan utkaständring; integrationstestet kontrollerar detta via HTTP.
- Ny bekräftelse gäller den faktiska borttagna definitionen och den nya
  generationen. Separat sparande behåller typens ID och ger revision 3.

### UTKAST-70: kontrollera återställning efter tappat svar

**Syfte:** Verifiera faktisk privat återställning med en uttrycklig hämtning
utan att upprepa bekräftelsen eller tappa åtkomst från Karta eller Tabell.

**Användare:** Robin i fönstret; Alex förbereder arkivet separat.

**Förutsättningar:** Kör `new-object-restoration`, välj Karta eller Tabell
och använd ett smalt fönster. `lose-applied` tappar bara ett verkligt svar
efter att servern behandlat bekräftelsen; det ersätter inte servern.

**Integrationstest:**
[conflict-definition-restoration.spec.ts](../../tests/integration/conflict-definition-restoration.spec.ts),
testfallen “UTKAST-70: a lost definition restoration reply verifies its
private authority without replay in Karta” och
“UTKAST-70: a lost definition restoration reply verifies its private
authority without replay in Tabell”.

**Steg:**

1. Öppna konflikten och välj den föreslagna definitionen. Kör `lose-applied`
   och bekräfta valet. Läs det oklara beskedet och stäng med Escape.
2. Öppna igen för en aktuell hämtning. Stäng när konfliktlänken försvunnit
   och välj **Visa konfliktvalet**. Kontrollera att ny bekräftelse är spärrad.
3. Välj **Kontrollera om valet lades i utkastet** och kör `result`.
4. Stäng med Escape och kontrollera synligt användbart återgångsfokus.
   Upprepa med en ny installation i den andra vyn.

**Förväntat resultat:**

- Bara en bekräftelse skickas. Återöppning upprepar ingen mutation.
  Uppföljningen består även när den sista olösta raden försvinner.
- Den uttryckliga hämtningen jämför hela faktiska privata resultatet:
  förslaget, dess underlag och dess aktuella återställningsbehörighet.
  Beskedet lyder att valen finns i utkastet och kartan sparas separat.
- Typen är fortfarande borttagen ur kartan, historiken är oförändrad och
  det oberoende objektförslaget består. Stängning återför fokus till en
  synlig användbar kontroll även när öppningsknappen har försvunnit.

### UTKAST-71: avvisa vanligt nyskapande med borttagen typidentitet

**Syfte:** Hindra att en vanlig definitionsbegäran återanvänder en borttagen
identitet eller själv tilldelar återställningsbehörighet.

**Användare:** Medlemmen Robin; administratören Alex förbereder arkivet.

**Förutsättningar:** Kör `new-object-restoration`. Terminalkommandot nedan
skickar en vanlig offentlig definitionsbegäran med det verkliga gamla ID:t
och påstådd återställningsbehörighet. Ingen databas eller server ersätts.

**Integrationstest:**
[conflict-definition-restoration.spec.ts](../../tests/integration/conflict-definition-restoration.spec.ts),
testfallet “UTKAST-71: ordinary definition creation cannot reuse a removed
identity or grant forged restoration authority”.

**Steg:**

1. Öppna konflikten och välj den sparade sidans **Borttaget** för
   **Typdefinition**. Bekräfta med **Lägg valen i utkastet**.
2. Kontrollera **Typdefinitionen förblir borttagen**. Kör `result`.
3. Kör `forge-restoration` och därefter `result` igen.

**Förväntat resultat:**

- Det uttryckliga valet kastar bara det privata definitionsförslaget.
  Det oberoende objektförslaget består och typen förblir borttagen.
- Den vanliga definitionsbegäran avvisas med HTTP 409. Dess påstådda
  behörighet tillåter varken återanvänt ID eller återställning.
- Robins utkast, gemensamma typer, objekt och historik är oförändrade
  efter den avvisade begäran.

### UTKAST-72: läs historiska fältnamn före bekräftat objektbyte till giltig typ

**Syfte:** Bevara namn och värden från en borttagen objekttyp när en vanlig
rättning kräver att tidigare egna fält tas bort.

**Användare:** Robin i fönstret; Alex förbereder arkivet i sin separata session.

**Förutsättningar:** Kör `new-missing-object-type`. Det privata objektet
**Solcellsanläggningen** har **Installationsår: Våren 2021** från en borttagen
typ. Ett oberoende objektförslag finns i samma utkast.

**Integrationstest:**
[conflict-external-corrections.spec.ts](../../tests/integration/conflict-external-corrections.spec.ts),
testfallet “UTKAST-72: ordinary correction of a missing object type preserves
historical field labels until explicitly confirmed loss”.

**Steg:**

1. Öppna **Inställningar → Typer och egna fält → Ny objekttyp**.
   Ange namn **Solcellsanläggning**, beskrivning **Ny faktisk definition**
   och lägg till ett talfält med namnet **Installationsår**.
   Lägg typen i utkastet och återgå till kartan. Kontrollera att konflikten
   fortfarande gäller trots samma typnamn.
2. Öppna **Tabell → Redigera Solcellsanläggningen**. Byt till den nya
   typen och läs **Ta bort tidigare egna fält?**. Tryck Escape och kör
   `result`. Byt till samma nya typ igen.
3. Välj **Ta bort fältvärdena och byt typ**. Öppna **Egna fält** och läs
   det tomma nya talfältet **Installationsår**. Välj **Lägg i utkastet och stäng**.
   Kör `result` och kontrollera att konflikten inte längre visas.
4. Öppna **Skriv till Skyttel → Visa utkastet** och spara separat.

**Förväntat resultat:**

- Bekräftelsen anger **Installationsår: Våren 2021**, inte fältets ID `year`.
  Escape bevarar hela utkastet och fältvärdet.
- Det uttryckliga bytet tar bort det tidigare egna värdet och lägger
  objektet i utkastet mot den faktiskt valda definitionen.
- Typen och det nya talfältet har andra ID:n trots samma namn. Det nya
  **Installationsår** förblir obesvarat; det gamla svaret kopieras inte.
- Det oberoende förslaget, sparade objekt och historik består under rättningen.
  Först det separata sparandet gör den rättade typen gemensam för objektet.

### UTKAST-73: behåll ändrade fakta när en ny förbindelse försvinner

**Syfte:** Ompröva bara det borttagna sambandet utan att förlora återstående
konflikt om objektets sparade fakta eller ett redan gjort objektval.

**Användare:** Alex i fönstret; Robin sparar i sin separata session.

**Förutsättningar:** Kör `new-combined-removal`. Alex föreslår borttagning
av Lo. Robin har sparat **Nya sparade fakta** och ett nytt samband för Lo.

**Integrationstest:**
[conflict-special.spec.ts](../../tests/integration/conflict-special.spec.ts),
UTKAST-73.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-special.spec.ts",
    "caseId": "UTKAST-73"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; behåll ändrade fakta när en ny förbindelse försvinner.",
  "outcomes": [
    "Den ogiltiga kombinationen spärrar bekräftelsen utan utkaständring.",
    "Robins borttagning berör bara det nya sambandet. De sparade fakta och deras faktiska sparare finns kvar i jämförelsen. Borttagningen av sambandet löser inte automatiskt objektets återstående konflikt.",
    "Granskningen lägger objektets val mot det faktiska aktuella underlaget i utkastet. Det oberoende förslaget, sparade objekt och historik består.",
    "Först separat sparande tar bort Lo ur den gemensamma kartan."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **1 konflikt i ditt utkast**. Läs det sparade objektets nya fakta
   och taggen **Robin** samt det nya sambandet.
2. Välj objektets **Föreslagen borttagning** och den sparade sidans samband.
   Läs varför kombinationen är ogiltig.
3. Kör `remove-new-connection`. Stäng med Escape, öppna igen och välj
   **Visa aktuell jämförelse**.
4. Läs att Robin sparade ändringar i objektet. Kontrollera att objektets
   borttagningsval finns kvar men att sambandsraden försvunnit.
5. Välj **Lägg valen i utkastet**.
6. Öppna **Skriv till Skyttel → Visa utkastet** och spara separat.

**Separat tekniskt underlag:** Operatörens `result` läser karta,
privat utkast och historik via HTTP. Automationen behåller dessa jämförelser
och eventuell versions- eller anropsräkning; de är inga vanliga UI-steg.

**Förväntat resultat:**

- Den ogiltiga kombinationen spärrar bekräftelsen utan utkaständring.
- Robins borttagning berör bara det nya sambandet. De sparade fakta och
  deras faktiska sparare finns kvar i jämförelsen. Borttagningen av
  sambandet löser inte automatiskt objektets återstående konflikt.
- Granskningen lägger objektets val mot det faktiska aktuella underlaget
  i utkastet. Det oberoende förslaget, sparade objekt och historik består.
- Först separat sparande tar bort Lo ur den gemensamma kartan.

### UTKAST-74: läs ett förlorat fälts historiska namn från ägt förslag

**Syfte:** Använda aktuell fältbenämning när den finns och annars den ägda
historiska benämningen, även när själva typdefinitionen fortfarande finns.

**Användare:** Robin i fönstret; administratören Alex förbereder arkivet.

**Förutsättningar:** Kör `new-replaced-object-field` eller
`new-replaced-relationship-field`. Förberedaren exporterar ett tidigare
ägt förslag, kastar det offentligt, ersätter det gamla textfältet med ett
nytt talfält med samma namn och återimporterar det tidigare privata förslaget
med kontrollerade arkivdelar. Det nya fältet har en annan identitet.

**Integrationstest:**
[conflict-external-corrections.spec.ts](../../tests/integration/conflict-external-corrections.spec.ts),
testfallen “UTKAST-74: an object type with a replaced field preserves the
owned historical answer label during explicit type-loss review” och
“UTKAST-74: a relationship type with a replaced field preserves the owned
historical answer label during explicit type-loss review”.

**Steg:**

1. Öppna konflikten och läs **Installationsår: Våren 2021** i förslaget.
   Stäng med Escape.
2. Välj **Tabell** och **Redigera Solcellsanläggningen** för objektfallet.
   För sambandsfallet, öppna **Samband för Lo Exempel → Redigera samband**.
3. Byt till den första vanliga typen. Läs **Ta bort tidigare egna fält?**.
   Kontrollera den historiska benämningen och svaret. Tryck Escape och
   kör `result`. Upprepa typbytet.
4. Bekräfta **Ta bort fältvärdena och byt typ**. Lägg ändringen i utkastet
   och stäng den vanliga dialogen. Kör `result`.
5. Spara separat från **Skriv till Skyttel → Visa utkastet**. Upprepa
   hela fallet i en ny installation med den andra förberedelsen.

**Förväntat resultat:**

- Den befintliga aktuella typen innehåller ett nytt talfält med samma namn,
  men den gamla svarade fältidentiteten saknas där. Bekräftelsen visar ändå
  **Installationsår: Våren 2021**, inte den gamla fältidentiteten.
- Escape bevarar hela det privata utkastet. Ett uttryckligt bekräftat byte
  tar bort gamla svar utan att kopiera dem till en annan fältidentitet.
- Det oberoende förslaget och gemensamma uppgifter består under rättningen.
  Endast ett separat sparande gör det rättade förslaget gemensamt.

### UTKAST-75: visa saknad ändpunkt och saknad typ samtidigt

**Syfte:** Bevara alla samtidiga hinder och kasta endast det uttryckligen
valda sambandsförslaget.

**Användare:** Robin i fönstret; administratören Alex förbereder arkivet.

**Förutsättningar:** Kör `new-multiple-blockers`. Förberedaren använder
validerad offentlig export och import av ett tidigare ägt sambandsförslag
efter verklig borttagning av både dess typdefinition och målobjekt.

**Integrationstest:**
[conflict-external-corrections.spec.ts](../../tests/integration/conflict-external-corrections.spec.ts),
testfallet “UTKAST-75: a missing endpoint and missing relationship type remain
visible until only the explicit target proposal is discarded”.

**Steg:**

1. Öppna **1 konflikt i ditt utkast**. Läs både den saknade ändpunkten och
   den saknade sambandstypen samt anvisningen för vanlig typrättning.
2. Läs **Molnmusik** från den historiska ändpunkten i förslaget. Kontrollera
   att förslaget är läsbart och inte ger några egenskapsval.
3. Tryck Escape, kör `result` och öppna konflikten igen.
4. Välj **Ta bort sambandet ur ditt utkast** och kör `result`.

**Förväntat resultat:**

- Båda hindren finns i samma konflikt. En primär orsak döljer inte den andra.
- Historiska ändpunktsnamn är läsbara. Stängning ändrar inget privat förslag.
- Bekräftelsen kastar bara det berörda sambandsförslaget. Det oberoende
  objektförslaget, gemensamma uppgifter, typer och historik är oförändrade.

### UTKAST-76: kasta ägt definitionsförslag utan faktisk borttagningsrevision

**Syfte:** Tillåta ett uttryckligt privat kastval när en validerad import
saknar definitionen utan att ge obestyrkt återställningsbehörighet.

**Användare:** Robin i fönstret; administratören Alex förbereder arkiven.

**Förutsättningar:** Kör `new-no-removed-object-definition` eller
`new-no-removed-relationship-definition`. Förberedaren exporterar en faktisk
utgångspunkt före typens tillkomst med Robins oberoende privata förslag,
skapar och sparar typen samt exporterar Robins ägda definitionsändring.
Den offentliga återimporten av utgångspunkten följd av det ägda privata
förslaget bevarar ägaren, men ingen faktisk borttagningsrevision finns.

**Integrationstest:**
[conflict-definition-restoration.spec.ts](../../tests/integration/conflict-definition-restoration.spec.ts),
testfallen “UTKAST-76: a retained object definition without an actual removed
revision can be explicitly discarded without granting restoration” och
“UTKAST-76: a retained relationship definition without an actual removed
revision can be explicitly discarded without granting restoration”.

**Steg:**

1. Kör `probe-unavailable-restoration` och `result`. Läs HTTP 409 och
   kontrollen av oförändrade privata utkast, gemensamma uppgifter och historik.
2. Öppna **1 konflikt i ditt utkast**. Läs **Min privata typbenämning**
   från det bevarade förslaget och beskedet att det inte kan återställas
   med det aktuella underlaget. Förslagets återställningsval är spärrat.
3. Välj den sparade sidans **Borttaget** för **Typdefinition** och
   **Lägg valen i utkastet**. Kör `result`.
4. Upprepa med en ny installation för den andra definitionstypen.

**Förväntat resultat:**

- En föreslagen återställning utan faktisk borttagningsrevision avvisas
  med HTTP 409 utan ändring. Ingen ny återställningsbehörighet tilldelas.
- Det uttryckliga sparade valet kastar bara det egna definitionsförslaget
  och ökar det privata utkastets version en gång.
- Det oberoende förslaget, gemensamma objekt, typer och historik består.

### UTKAST-77: kontrollera ett oklart kastval utan upprepad bekräftelse

**Syfte:** Bevara åtkomst och faktiskt utfall för ett fast kastval även
när dess sista konfliktrad försvinner efter att svaret tappats.

**Användare:** Alex i fönstret; Robin har sparat det redan befintliga sambandet.

**Förutsättningar:** Kör `new-duplicate` i ett smalt fönster. Använd Karta vid
320 × 900 pixlar. `lose-applied` skickar bekräftelsen till den riktiga servern
men tappar svaret; `lose-unsent` hindrar leveransen före servern.

**Integrationstest:**
[conflict-special.spec.ts](../../tests/integration/conflict-special.spec.ts),
UTKAST-77.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-special.spec.ts",
    "caseId": "UTKAST-77"
  },
  "reference": "320 × 900, Karta; genomfört kastval med tappat svar.",
  "outcomes": [
    "Återöppning och kontroll upprepar ingen mutation. Ny bekräftelse är spärrad tills faktiskt utfall har kontrollerats genom den synliga kontrollen.",
    "Genomfört kastval ger **Sambandet har tagits bort ur ditt utkast**; Det berörda förslaget är borttaget ur utkastet.",
    "Det oberoende förslaget, sparade samband, objekt och historik består. Både Karta och Tabell behåller åtkomst även när sista konflikten försvinner.",
    "Stängning ger synligt användbart fokus utan att välja en dold kontroll."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna konflikten. Kör `lose-applied` och välj **Ta bort sambandet ur ditt
   utkast**. Läs det oklara beskedet. Stäng med Escape och öppna igen.
2. När konfliktraden försvinner, stäng och välj **Visa konfliktvalet**.
   Kontrollera att ny bekräftelse fortfarande är spärrad.
3. Välj **Kontrollera om valet lades i utkastet**.
4. Stäng med Escape och kontrollera synligt användbart fokus.
**Separat tekniskt underlag:** Operatörens `result` läser karta,
privat utkast och historik via HTTP. Automationen behåller dessa jämförelser
och eventuell versions- eller anropsräkning; de är inga vanliga UI-steg.

**Förväntat resultat:**

- Återöppning och kontroll upprepar ingen mutation. Ny bekräftelse är
  spärrad tills faktiskt utfall har kontrollerats genom den synliga kontrollen.
- Genomfört kastval ger **Sambandet har tagits bort ur ditt utkast**;
  Det berörda förslaget är borttaget ur utkastet.
- Det oberoende förslaget, sparade samband, objekt och historik består.
  Både Karta och Tabell behåller åtkomst även när sista konflikten försvinner.
- Stängning ger synligt användbart fokus utan att välja en dold kontroll.

### UTKAST-78: gå till nästa verkliga konflikt efter bekräftelsen

**Syfte:** Bevara gjorda egenskapsval och använda samma läsordning och
rubrikfokus från lösningsresultatet som från konfliktlistan.

**Användare:** Alex i fönstret; Robin sparar i sin separata session.

**Förutsättningar:** Kör `new-two`. Lo och musiktjänsten har varsin
verklig konflikt enligt den gemensamma förberedelsen.

**Integrationstest:**
[conflict-special.spec.ts](../../tests/integration/conflict-special.spec.ts),
UTKAST-78.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/conflict-special.spec.ts",
    "caseId": "UTKAST-78"
  },
  "reference": "1280 × 720; Chromium och syntetiska testidentiteter; gå till nästa verkliga konflikt efter bekräftelsen.",
  "outcomes": [
    "Bekräftelsen ändrar bara Lo-förslaget mot aktuellt underlag och ökar utkastets version en gång. Den sparar inte den gemensamma kartan.",
    "**Nästa konflikt** använder de faktiskt bevarade posterna i listordning och flyttar fokus till nästa posts rubrik utan att ändra något förslag.",
    "Musiktjänstens gjorda egenskapsval och den lösta Lo-postens resultat består. Gemensamma uppgifter och historik ändras inte av navigeringen."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **2 konflikter i ditt utkast**. Välj musiktjänsten och dess
   föreslagna namn **Min musiktjänst** och beskrivning **Min tjänst**.
2. Välj Lo i listan och välj dess föreslagna namn och beskrivning.
   Välj **Lägg valen i utkastet**. Läs resultatet.
3. Välj **Nästa konflikt** från resultatet. Kontrollera fokus på rubriken
   **Min musiktjänst** och att båda tidigare valen fortfarande är markerade.
4. Välj den lösta Lo-posten i listan. Resultatet är kvar. Välj
   **Nästa konflikt** en gång till och kontrollera samma rubrikfokus.

**Separat tekniskt underlag:** Operatörens `result` läser karta,
privat utkast och historik via HTTP. Automationen behåller dessa jämförelser
och eventuell versions- eller anropsräkning; de är inga vanliga UI-steg.

**Förväntat resultat:**

- Bekräftelsen ändrar bara Lo-förslaget mot aktuellt underlag och ökar
  utkastets version en gång. Den sparar inte den gemensamma kartan.
- **Nästa konflikt** använder de faktiskt bevarade posterna i listordning
  och flyttar fokus till nästa posts rubrik utan att ändra något förslag.
- Musiktjänstens gjorda egenskapsval och den lösta Lo-postens resultat
  består. Gemensamma uppgifter och historik ändras inte av navigeringen.

## Separata referenser för granskning, status och sparande

Varje variant har ett eget ID. Ingen automatiserad körning tas bort.
UTKAST-92–105 reserveras för dessa separata scenarier; inga äldre luckor
används.

### UTKAST-92: läs hela utkastet utan AI eller medgivande

**Syfte:** Granska alla förslag, även dolda fält, utan att starta samtal.

**Användare:** Alex Exempel i den separata provinstallationen nedan.

**Förutsättningar:** Kör `npm run build` och sedan
`node --import tsx scripts/manual-draft-review.ts` i en terminal.
Öppna den utskrivna adressen och logga in med den syntetiska
Google-identiteten Alex Exempel. Ingen extern leverantör används.
Skriv `quit` i terminalen efter provningen för att ta bort installationen.

**Integrationstest:**
[draft-review.spec.ts](../../tests/integration/draft-review.spec.ts),
UTKAST-92.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-review.spec.ts",
    "caseId": "UTKAST-92"
  },
  "reference": "390 × 844; smal läsdialog och fokusfälla.",
  "outcomes": [
    "Utkastet öppnas utan samtal eller medgivandedialog trots att AI saknas.",
    "Alla fyra förslagsslag kan läsas fullständigt. Förslagen och den sparade kartan ändras inte av läsning.",
    "Läsdialogen börjar på rubriken. Tab stannar i dialogen; bakomliggande innehåll är inaktivt. Krysset är dess enda synliga stängkontroll. Escape och krysset återför fokus till radens öppningsknapp.",
    "Verklig olöst identitet eller obesvarad fråga har feltext och symbol. Giltiga okända, osäkra och ospecificerade uppgifter får ingen felvarning."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **Utkast** i verktygsfältet vid 390 × 844 pixlar.
2. Läs tabellens Symbol, Namn, Typ och Vad som ändras.
3. Öppna **Alex blå cykel** med tangentbord. Läs sparade och föreslagna
   värden, hela beskrivningen, Ramnummer och ekonomiska uppgifter.
4. Prova Tab, Skift+Tab, krysset och Escape. Öppna därefter ett samband,
   **Utkastfordon** och **Granskar**. Läs deras dolda egna fält och riktning.
5. Kontrollera fel vid **Olöst fordon** och det olösta sambandet. Läs även
   Okänt, Uttryckligen inget, Osäkert uppgivet och Ospecificerat objekt.

**Förväntat resultat:**

- Utkastet öppnas utan samtal eller medgivandedialog trots att AI saknas.
- Alla fyra förslagsslag kan läsas fullständigt.
  Förslagen och den sparade kartan ändras inte av läsning.
- Läsdialogen börjar på rubriken. Tab stannar i dialogen; bakomliggande
  innehåll är inaktivt. Krysset är dess enda synliga stängkontroll.
  Escape och krysset återför fokus till radens öppningsknapp.
- Verklig olöst identitet eller obesvarad fråga har feltext och symbol.
  Giltiga okända, osäkra och ospecificerade uppgifter får ingen felvarning.

### UTKAST-93: läs faktisk giltighet, profilbilder och typens egenskapsnamn

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
UTKAST-93.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-review.spec.ts",
    "caseId": "UTKAST-93"
  },
  "reference": "390 × 844; bilder och fullständiga fältnamn i smal läsdialog.",
  "outcomes": [
    "Sparade objektet och sambandet visar Upphört och Följ slutdatum. Förslagen visar Aktuellt och Gäller fortfarande trots samma gamla slutdatum. Giltighet och status är markerade som ändrade.",
    "Båda verkliga profilbilderna visas och bildändringen markeras även när båda sidorna har en bild. Bilderna skiljer sig i färg.",
    "Beskrivningen har respektive typs eget namn och markerad ändring. Föreslagen beskrivning och båda prisvärdena visar Ej uppgivet. Oförändrat saknat pris markeras inte som ändrat. Dolda egenskaper kan läsas.",
    "Läsningen ändrar inget underlag och startar inget samtal eller medgivande."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **Utkast** och **Blå cykel** vid 390 × 844 pixlar.
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

### UTKAST-94: filtrerad teckenförklaring följer kartans färger

**Syfte:** Matcha symboler och linjer med kartan och visa kategorier från
den filtrerade kartan, oberoende av kameran.

**Användare:** Administratören.

**Förutsättningar:** Spara Lo Exempel, Molnmusik och Kim Exempel samt ett
riktat samband från Lo till Molnmusik. Föreslå en ändrad beskrivning för Lo
och vänd sambandets riktning utan att spara. Välj mörkt tema.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
UTKAST-94.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-status.spec.ts",
    "caseId": "UTKAST-94"
  },
  "reference": "Mörkt tema; samma synliga kategori måste matcha kartans färg.",
  "outcomes": [
    "Symboler och linjeprov matchar kartans färger i mörkt tema. Text och symbol gör innebörden begriplig även utan färg.",
    "Sökningen styr kategorierna, medan kameran och en vald relation inte skapar en objektmarkering. Inga uppgifter sparas eller byter identitet."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Stäng textvyn och visa Karta. Läs grönt plus, gul penna och rött kryss under
   hushållets namn. Jämför färgerna med förslagen i kartan. Läs gammalt
   samband med rött kryss och streckad linje och nytt med grönt plus och
   heldragen linje utan att markera dem eller välja Alla etiketter.
2. Öppna Navigera och panorera. Teckenförklaringens rader ska bestå.
3. Stäng Navigation och välj det nya sambandet. Ingen rad för markerat
   objekt ska tillkomma.
4. Klicka i kartans sökfält, sök Kim Exempel och tryck Escape i sökfältet.
   Förslagsraderna ska försvinna. Raden för punktade etikettkopplingar ska
   finnas kvar.
5. Markera Kim. Kontrollera markeringsraden. Sök sedan Inga träffar via
   kartans sökfält och tryck Escape i sökfältet. Hela teckenförklaringen ska
   försvinna.

**Förväntat resultat:**

- Symboler och linjeprov matchar kartans färger i mörkt tema. Text och
  symbol gör innebörden begriplig även utan färg.
- Sökningen styr kategorierna, medan kameran och en vald relation inte
  skapar en objektmarkering. Inga uppgifter sparas eller byter identitet.

### UTKAST-96: behåll legend och förslag tills samma sparförsök bekräftas

**Syfte:** Följa ett privat förslag med stängd textvy och skilja väntan,
okänt resultat och verifierat sparande.

**Användare:** Administratören.

**Förutsättningar:** Nytt tomt hushåll, 390 × 844 pixlar. Följ
[styrd sparleverans](save-preparation.md#vanligt-sparande) och välj
`new-empty`.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
UTKAST-96.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-status.spec.ts",
    "caseId": "UTKAST-96"
  },
  "reference": "390 × 844; uppföljning och legend i smal arbetsyta.",
  "outcomes": [
    "Sparmodalen öppnas direkt och kan stängas med krysset eller Escape. Ett obekräftat försök visas aldrig som säkert lyckat eller säkert misslyckat.",
    "Återkopplingens knappar kan användas utan att verktygen täcker dem.",
    "Samma försök kontrolleras och får ett verifierat kvitto. Objektet finns en gång i kartan. Förslagsraden försvinner efter uppdateringen, men markeringsringen och etikettkopplingarnas rad kan finnas kvar. Utkastet är sparat visas i tre sekunder och återkommer inte vid omladdning. Ändringshistoriken innehåller ett enda genomfört sparande."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lägg objektet **Familjeabonnemanget** i utkastet. Stäng textvyn
   och visa Karta.
2. Kontrollera grönt plus i teckenförklaringen under hushållets namn.
   Varken förslagsantal, gul penna eller rött kryss ska visas för detta förslag.
3. Läs kartans status och teckenförklaring under hushållets namn.
4. Skriv `hold-after` i terminalen. Öppna **Utkast** och välj **Spara hela
   utkastet**.
   Stäng **Spara utkastet** med Escape och stäng textvyn.
   Läs **Väntar på sparkvitto**, det bevarade förslaget och legenden.
5. Läs **Väntar på sparkvitto** och kvarvarande legend. Skriv `drop`
   efter terminalens bekräftade status 200. Läs **Sparutfall okänt**. Välj
   **Hämta samma kvitto igen**. Läs resultatet.
   Öppna **Rapporter → Ändringshistorik** och läs det genomförda sparandet.

**Förväntat resultat:**

- Sparmodalen öppnas direkt och kan stängas med krysset eller Escape.
  Ett obekräftat försök
  visas aldrig som säkert lyckat eller säkert misslyckat.
- Återkopplingens knappar kan användas utan att verktygen täcker dem.
- Samma försök kontrolleras och får ett verifierat kvitto. Objektet finns
  en gång i kartan. Förslagsraden försvinner efter uppdateringen, men
  markeringsringen och etikettkopplingarnas rad kan finnas kvar.
  Utkastet är sparat visas i tre sekunder och återkommer inte vid omladdning.
  Ändringshistoriken innehåller ett enda genomfört sparande.

### UTKAST-97: behåll legend och förslag tills samma sparförsök bekräftas

**Syfte:** Följa ett privat förslag med stängd textvy och skilja väntan,
okänt resultat och verifierat sparande.

**Användare:** Administratören.

**Förutsättningar:** Nytt tomt hushåll, 320 × 844 pixlar. Följ
[styrd sparleverans](save-preparation.md#vanligt-sparande) och välj
`new-empty`.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
UTKAST-97.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-status.spec.ts",
    "caseId": "UTKAST-97"
  },
  "reference": "320 × 844; uppföljning vid minsta behållna bredd.",
  "outcomes": [
    "Sparmodalen öppnas direkt och kan stängas med krysset eller Escape. Ett obekräftat försök visas aldrig som säkert lyckat eller säkert misslyckat.",
    "Återkopplingens knappar kan användas utan att verktygen täcker dem.",
    "Samma försök kontrolleras och får ett verifierat kvitto. Objektet finns en gång i kartan. Förslagsraden försvinner efter uppdateringen, men markeringsringen och etikettkopplingarnas rad kan finnas kvar. Utkastet är sparat visas i tre sekunder och återkommer inte vid omladdning. Ändringshistoriken innehåller ett enda genomfört sparande."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lägg objektet **Familjeabonnemanget** i utkastet. Stäng textvyn
   och visa Karta.
2. Kontrollera grönt plus i teckenförklaringen under hushållets namn.
   Varken förslagsantal, gul penna eller rött kryss ska visas för detta förslag.
3. Läs kartans status och teckenförklaring under hushållets namn.
4. Skriv `hold-after` i terminalen. Öppna **Utkast** och välj **Spara hela
   utkastet**.
   Stäng **Spara utkastet** med Escape och stäng textvyn.
   Läs **Väntar på sparkvitto**, det bevarade förslaget och legenden.
5. Läs **Väntar på sparkvitto** och kvarvarande legend. Skriv `drop`
   efter terminalens bekräftade status 200. Läs **Sparutfall okänt**. Välj
   **Hämta samma kvitto igen**. Läs resultatet.
   Öppna **Rapporter → Ändringshistorik** och läs det genomförda sparandet.

**Förväntat resultat:**

- Sparmodalen öppnas direkt och kan stängas med krysset eller Escape.
  Ett obekräftat försök
  visas aldrig som säkert lyckat eller säkert misslyckat.
- Återkopplingens knappar kan användas utan att verktygen täcker dem.
- Samma försök kontrolleras och får ett verifierat kvitto. Objektet finns
  en gång i kartan. Förslagsraden försvinner efter uppdateringen, men
  markeringsringen och etikettkopplingarnas rad kan finnas kvar.
  Utkastet är sparat visas i tre sekunder och återkommer inte vid omladdning.
  Ändringshistoriken innehåller ett enda genomfört sparande.

### UTKAST-98: använd Navigation och utkastets återkoppling tillsammans

**Syfte:** Behålla åtkomst till personlig placering och sparande genom växling
mellan kartan
och textvyn, även när förstoring kräver rullning.

**Användare:** Administratören.

**Förutsättningar:** Lo Exempel är sparad i kartan. Blå cykeln finns som
nytt privat förslag. Börja med stängd textvy och Navigation.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
UTKAST-98.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-status.spec.ts",
    "caseId": "UTKAST-98"
  },
  "reference": "640 × 500; navigationens nedre riktningar måste nås med rullning.",
  "outcomes": [
    "Alla personliga flyttriktningar och hela utkastets sparknapp är åtkomliga i båda ordningarna, även när ytorna behöver rullas.",
    "Flyttningarna ändrar bara den personliga vyn. Automationen jämför separat oförändrat gemensamt innehåll och privat förslag utan sparförsök.",
    "Fokus följer den uttryckliga handlingen och går tillbaka till verktygen vid stängning. Navigation, återkoppling och verktygen täcker inte den kontroll som används."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Markera Lo Exempel i kartan. Öppna **Navigera** från verktygen.
   Expandera verktygens namn om det behövs. Teckenförklaringen är synlig
   under hushållets namn.
2. Använd tangentbord och pekare för att flytta Lo i alla sex riktningar
   i Navigation.
   Rulla vid behov till de nedre kontrollerna.
3. Välj **Stäng navigering** och kontrollera fokus på **Navigera**.
   Öppna **Utkast** och fokusera **Spara hela utkastet**. Kontrollera att
   knappen går att nå med pekare utan att spara. Stäng textvyn.
4. Upprepa efter att först ha öppnat Utkast och fokuserat sparknappen,
   därefter stängt textvyn och öppnat Navigera.
5. Behåll 640 × 500 pixlar. Smal och kort vy har separata fall.

**Separat tekniskt underlag:** Integrationstestet jämför hela privata
utkastet och gemensamma kartinnehållet före och efter flyttningarna och
kräver tomma sparförsök. Dessa API-jämförelser ingår inte i UI-stegen.

**Förväntat resultat:**

- Alla personliga flyttriktningar och hela utkastets sparknapp är
  åtkomliga i båda ordningarna, även när ytorna behöver rullas.
- Flyttningarna ändrar bara den personliga vyn. Automationen jämför separat
  oförändrat gemensamt innehåll och privat förslag utan sparförsök.
- Fokus följer den uttryckliga handlingen och går tillbaka till verktygen
  vid stängning. Navigation, återkoppling och verktygen täcker inte den kontroll
  som används.

### UTKAST-99: använd Navigation och utkastets återkoppling tillsammans

**Syfte:** Behålla åtkomst till personlig placering och sparande genom växling
mellan kartan
och textvyn, även när förstoring kräver rullning.

**Användare:** Administratören.

**Förutsättningar:** Lo Exempel är sparad i kartan. Blå cykeln finns som
nytt privat förslag. Börja med stängd textvy och Navigation.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
UTKAST-99.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-status.spec.ts",
    "caseId": "UTKAST-99"
  },
  "reference": "320 × 250; mycket kort smal arbetsyta måste behålla båda flödena.",
  "outcomes": [
    "Alla personliga flyttriktningar och hela utkastets sparknapp är åtkomliga i båda ordningarna, även när ytorna behöver rullas.",
    "Flyttningarna ändrar bara den personliga vyn. Automationen jämför separat oförändrat gemensamt innehåll och privat förslag utan sparförsök.",
    "Fokus följer den uttryckliga handlingen och går tillbaka till verktygen vid stängning. Navigation, återkoppling och verktygen täcker inte den kontroll som används."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Markera Lo Exempel i kartan. Öppna **Navigera** från verktygen.
   Expandera verktygens namn om det behövs. Teckenförklaringen är synlig
   under hushållets namn.
2. Använd tangentbord och pekare för att flytta Lo i alla sex riktningar
   i Navigation.
   Rulla vid behov till de nedre kontrollerna.
3. Välj **Stäng navigering** och kontrollera fokus på **Navigera**.
   Öppna **Utkast** och fokusera **Spara hela utkastet**. Kontrollera att
   knappen går att nå med pekare utan att spara. Stäng textvyn.
4. Upprepa efter att först ha öppnat Utkast och fokuserat sparknappen,
   därefter stängt textvyn och öppnat Navigera.
5. Behåll 320 × 250 pixlar. Smal och kort vy har separata fall.

**Separat tekniskt underlag:** Integrationstestet jämför hela privata
utkastet och gemensamma kartinnehållet före och efter flyttningarna och
kräver tomma sparförsök. Dessa API-jämförelser ingår inte i UI-stegen.

**Förväntat resultat:**

- Alla personliga flyttriktningar och hela utkastets sparknapp är
  åtkomliga i båda ordningarna, även när ytorna behöver rullas.
- Flyttningarna ändrar bara den personliga vyn. Automationen jämför separat
  oförändrat gemensamt innehåll och privat förslag utan sparförsök.
- Fokus följer den uttryckliga handlingen och går tillbaka till verktygen
  vid stängning. Navigation, återkoppling och verktygen täcker inte den kontroll
  som används.

### UTKAST-100: stäng ett väntande mobilt sparande och fortsätt annat arbete

**Syfte:** Behålla uppföljning och korrekt fokus mellan karta och tabell.

**Användare:** Alex Exempel i provinstallationen för UTKAST-36.

**Förutsättningar:** Välj `new-draft` och `hold`. Använd 320 × 844 pixlar.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
UTKAST-100.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-save.spec.ts",
    "caseId": "UTKAST-100"
  },
  "reference": "320 × 844; modalens omflöde och senare sökfokus.",
  "outcomes": [
    "Tangentbordet cirkulerar mellan modalens tillgängliga kontroller och lämnar inte den öppna modalen. Text och kontroller ryms i smal mobil visning.",
    "Stängning avbryter inte sparandet. Uppföljningen är nåbar i båda vyerna; efter stängning återgår fokus till **Visa sparandet**.",
    "Senare bekräftelse behåller fokus i tabellens sökfält. Toasten tar inte fokus. Automationen kontrollerar separat tomt utkast, exakt ett sparande och en historikpost."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna utkastet och spara. Prova Tab och Skift+Tab och stäng med Escape.
2. Stäng textvyn. Öppna **Visa sparandet** i kartan och stäng med krysset.
3. Öppna **Tabell**, välj **Visa sparandet** och stäng med Escape.
4. Flytta fokus till **Sök objekt i tabellen** och skriv `release` i terminalen.
5. Invänta bekräftelsen och fortsätt skriva i sökfältet utan att klicka på
   det igen.

**Separat tekniskt underlag:** Integrationstestet kräver tomt utkast, ett
enda avslutat sparförsök och en historikpost. Operatören kan samla detta
underlag med `result` efter bekräftelsen. Det är ingen vanlig UI-kontroll.

**Förväntat resultat:**

- Tangentbordet cirkulerar mellan modalens tillgängliga kontroller och
  lämnar inte den öppna modalen. Text och kontroller ryms i smal mobil visning.
- Stängning avbryter inte sparandet. Uppföljningen är nåbar i båda vyerna;
  efter stängning återgår fokus till **Visa sparandet**.
- Senare bekräftelse behåller fokus i tabellens sökfält. Toasten tar inte fokus.
  Automationen kontrollerar separat tomt utkast, exakt ett sparande och en
  historikpost.

### UTKAST-95: kontrollera okänt sparande före kvarstående hämtningsfel

**Syfte:** Kvittot bekräftas innan karthämtningen; hämtningsfel ändrar inte
utfallet.

**Användare:** Alex Exempel i den separata provinstallationen.

**Förutsättningar:** Följ
[styrd sparleverans](save-preparation.md#vanligt-sparande).
Välj `new-empty`. Aktivera `lost-response` och `refresh-failure` först
efter att Lo ligger i utkastet, före sparandet.

**Integrationstest:**
[draft-status.spec.ts](../../tests/integration/draft-status.spec.ts),
UTKAST-95.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-status.spec.ts",
    "caseId": "UTKAST-95"
  },
  "reference": "Genomförd transaktion med tappat svar följd av blockerad karthämtning.",
  "outcomes": [
    "Kvittot bekräftas innan karthämtningen; hämtningsfel ändrar inte utfallet.",
    "Hämtningsfelet består efter toasten. Ny hämtning tar bort felet och upprepar inte sparbeskedet."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Lägg Lo Exempel i utkastet och välj Spara hela utkastet. Stäng sparmodalen
   och textvyn.
2. Läs Sparutfall okänt utan sparbekräftelse. Välj Hämta aktuellt underlag.
3. Läs Utkastet är sparat tillsammans med hämtningsfelet. Vänta tills
   sparbeskedet försvinner.
4. Välj `network-ok` och Hämta aktuellt underlag. Läs det enda sparandet för Lo
   i Rapporter → Ändringshistorik.

**Förväntat resultat:**

- Kvittot bekräftas innan karthämtningen; hämtningsfel ändrar inte utfallet.
- Hämtningsfelet består efter toasten. Ny hämtning tar bort felet och upprepar
  inte sparbeskedet.

### UTKAST-101: slutför ett befintligt försök efter omladdning

**Syfte:** Samma väntande försök slutförs; den gamla okända uppföljningen och
utkastikonen försvinner.

**Användare:** Alex Exempel i den separata provinstallationen.

**Förutsättningar:** Följ
[styrd sparleverans](save-preparation.md#vanligt-sparande).
Välj `new-draft` och `pending-attempt`.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
UTKAST-101.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-save.spec.ts",
    "caseId": "UTKAST-101"
  },
  "reference": "Verkligt förslag och registrerat väntande försök, ingen AI.",
  "outcomes": [
    "Samma väntande försök slutförs; den gamla okända uppföljningen och utkastikonen försvinner.",
    "Ingen AI eller nytt medgivande behövs; ett enda kvitto och tomt utkast finns kvar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Ladda om och läs Visa sparandet.
2. Välj `network-ok` och ladda om för att tillåta automatisk kontroll.
3. Invänta bekräftelsen. Läs det tomma utkastet genom Skriv till Skyttel → Visa
   utkastet och det enda sparkvittot i Rapporter.

**Förväntat resultat:**

- Samma väntande försök slutförs; den gamla okända uppföljningen och
  utkastikonen försvinner.
- Ingen AI eller nytt medgivande behövs; ett enda kvitto och tomt utkast finns
  kvar.

### UTKAST-102: avvisa äldre utkastversion utan förlust

**Syfte:** Avvisningen behåller hela det nyare privata utkastet och skapar inget
historikkvitto.

**Användare:** Alex Exempel i den separata provinstallationen.

**Förutsättningar:** Följ
[styrd sparleverans](save-preparation.md#vanligt-sparande).
Välj `new-draft` och öppna samma adress i en andra flik.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
UTKAST-102.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-save.spec.ts",
    "caseId": "UTKAST-102"
  },
  "reference": "Två klienter för samma användare; gammalt sparunderlag mot nyare förslag.",
  "outcomes": [
    "Avvisningen behåller hela det nyare privata utkastet och skapar inget historikkvitto.",
    "Ny läsning erbjuder sparande av det aktuella underlaget utan att själv spara."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna Utkast i första fliken. Ändra cykelns namn till Alex nya cykelnamn i
   andra fliken och lägg i utkastet.
2. Spara från första flikens gamla granskning. Läs avvisningen och Inget
   sparades av detta försök. Stäng med Escape.
3. Kontrollera spärrat sparande. Stäng textvyn och välj Hämta aktuellt underlag.
4. Öppna Utkast och läs det nya namnet och tillgängligt sparande. Kontrollera
   tom historik.

**Förväntat resultat:**

- Avvisningen behåller hela det nyare privata utkastet och skapar inget
  historikkvitto.
- Ny läsning erbjuder sparande av det aktuella underlaget utan att själv spara.

### UTKAST-103: återför fokus när tabellens uppföljning försvinner

**Syfte:** När den fokuserade uppföljningen försvinner går fokus till tabellens
synliga hushållsrubrik.

**Användare:** Alex Exempel i den separata provinstallationen.

**Förutsättningar:** Följ
[styrd sparleverans](save-preparation.md#vanligt-sparande).
Välj `new-draft` och `hold`.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
UTKAST-103.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-save.spec.ts",
    "caseId": "UTKAST-103"
  },
  "reference": "Tabell; uppföljningsknappen äger fokus vid sen bekräftelse.",
  "outcomes": [
    "När den fokuserade uppföljningen försvinner går fokus till tabellens synliga hushållsrubrik.",
    "Sparandet avslutas utan att lämna fokus på en borttagen kontroll."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna Utkast och spara. Stäng med Escape och stäng textvyn.
2. Öppna Tabell och Visa sparandet. Stäng med Escape och behåll fokus på Visa
   sparandet.
3. Skriv `release` och kontrollera fokus när knappen försvinner.

**Förväntat resultat:**

- När den fokuserade uppföljningen försvinner går fokus till tabellens synliga
  hushållsrubrik.
- Sparandet avslutas utan att lämna fokus på en borttagen kontroll.

### UTKAST-104: återför synlig utkastkontext efter kontroll från Karta

**Syfte:** Kvittokontrollen öppnar tomt Utkast med fokus på dess synliga rubrik
när modalens uppföljning försvinner.

**Användare:** Alex Exempel i den separata provinstallationen.

**Förutsättningar:** Följ
[styrd sparleverans](save-preparation.md#vanligt-sparande).
Välj `new-draft`, `lost-response` och 1280 pixlars bredd.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
UTKAST-104.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-save.spec.ts",
    "caseId": "UTKAST-104"
  },
  "reference": "1280 × 850; kartans uppföljning saknas efter verifierat kvitto.",
  "outcomes": [
    "Kvittokontrollen öppnar tomt Utkast med fokus på dess synliga rubrik när modalens uppföljning försvinner.",
    "Bekräftelsen finns utan samtal eller medgivande. Automationen jämför separat samma enda sparförsök."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna Utkast och spara. Läs Sparandet kunde inte bekräftas. Stäng med Escape
   och stäng textvyn.
2. Behåll Karta. Välj Visa sparandet och Kontrollera sparandet igen.
3. Invänta bekräftelsen och kontrollera det synliga tomma utkastet och fokus.

**Separat tekniskt underlag:** Integrationstestet jämför samma enda
sparförsök före och efter kontrollen. Råa identifierare och försöksantal
ingår inte i de vanliga UI-stegen.

**Förväntat resultat:**

- Kvittokontrollen öppnar tomt Utkast med fokus på dess synliga rubrik när
  modalens uppföljning försvinner.
- Bekräftelsen finns utan samtal eller medgivande. Automationen jämför
  separat samma enda sparförsök.

### UTKAST-105: återför synlig utkastkontext efter kontroll från Karta

**Syfte:** Kvittokontrollen öppnar tomt Utkast med fokus på dess synliga rubrik
när modalens uppföljning försvinner.

**Användare:** Alex Exempel i den separata provinstallationen.

**Förutsättningar:** Följ
[styrd sparleverans](save-preparation.md#vanligt-sparande).
Välj `new-draft`, `lost-response` och 390 pixlars bredd.

**Integrationstest:**
[draft-save.spec.ts](../../tests/integration/draft-save.spec.ts),
UTKAST-105.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/draft-save.spec.ts",
    "caseId": "UTKAST-105"
  },
  "reference": "390 × 850; kartans uppföljning saknas efter verifierat kvitto.",
  "outcomes": [
    "Kvittokontrollen öppnar tomt Utkast med fokus på dess synliga rubrik när modalens uppföljning försvinner.",
    "Bekräftelsen finns utan samtal eller medgivande. Automationen jämför separat samma enda sparförsök."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna Utkast och spara. Läs Sparandet kunde inte bekräftas. Stäng med Escape
   och stäng textvyn.
2. Behåll Karta. Välj Visa sparandet och Kontrollera sparandet igen.
3. Invänta bekräftelsen och kontrollera det synliga tomma utkastet och fokus.

**Separat tekniskt underlag:** Integrationstestet jämför samma enda
sparförsök före och efter kontrollen. Råa identifierare och försöksantal
ingår inte i de vanliga UI-stegen.

**Förväntat resultat:**

- Kvittokontrollen öppnar tomt Utkast med fokus på dess synliga rubrik när
  modalens uppföljning försvinner.
- Bekräftelsen finns utan samtal eller medgivande. Automationen jämför
  separat samma enda sparförsök.

## Separata referenser för aktuella konflikter

UTKAST-106–137 har egna stabila identiteter. Bredd, vy, vald sida och
genomförd eller utebliven leverans skiljs åt. Varje grundprocedur körs
en gång med observationerna under dess angivna steg. UTKAST-136 kräver
faktisk skärmläsarobservation; övriga fall har en vanlig motsvarighet.

UTKAST-57 behåller kontrast, varningssymbol, läsbara skillnader och omflöde.
Dess exakta box-shadow-sträng och bakgrundspixelvärde kontrolleras inte.
Ett fel som bara ändrar dessa dekorativa värden kan därför undgå testet.

### UTKAST-106: egen referens för UTKAST-28

**Syfte:** 390 × 900; Tabell och Karta med nytt underlag; smalt omflöde
och tangentbordsfokus vid blandade val.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-28](#utkast-28-kombinera-aktiva-egenskapsval-utan-att-spara-kartan)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[conflict-properties.spec.ts](../../tests/integration/conflict-properties.spec.ts),
UTKAST-106.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "390 × 900; Tabell och Karta med nytt underlag; smalt omflöde och tangentbordsfokus vid blandade val.",
  "outcomes": [
    "Blandade val ändrar bara utkastet; sparade uppgifter och historik består.",
    "Fokus stannar i dialogen. Escape återför fokus till Karta."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-properties.spec.ts",
    "caseId": "UTKAST-106"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-28 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd 390 × 900 i steg 1–7.
   Under steg 2–5 ska alla egenskaper vara läsbara och nåbara utan
   vågrät sidrullning. I steg 7 används samma bredd i ett nytt hushåll;
   kontrollera motsvarande val med tangentbord från Karta utan att spara kartan.

**Förväntat resultat:**

- Blandade val ändrar bara utkastet; sparade uppgifter och historik består.
- Fokus stannar i dialogen. Escape återför fokus till Karta.

### UTKAST-107: läs långt ändpunktsnamn i en sambandskonflikt

**Syfte:** 320 × 900; sambandets rubrik och lista med långt obrutet namn.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Nytt hushåll med Föremålsnamn upprepat fjorton gånger
utan mellanslag och Molnmusik. Spara ett känt samband mellan objekten.

**Integrationstest:**
[conflict-properties.spec.ts](../../tests/integration/conflict-properties.spec.ts),
UTKAST-107.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "320 × 900; sambandets rubrik och lista med långt obrutet namn.",
  "outcomes": [
    "Hela namnet är läsbart utan vågrät rullning.",
    "Läsningen ändrar varken utkastet, objekten eller sambanden."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-properties.spec.ts",
    "caseId": "UTKAST-107"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Alex föreslår Osäkert uppgivet för sambandet. Robin sparar
   Manuellt upphört för samma samband.
2. Alex laddar om och öppnar **1 konflikt i ditt utkast**. Läs hela
   ändpunktsnamnet i rubriken och Alla konflikter.
3. Stäng med Escape och kontrollera fokus på konfliktknappen.

**Förväntat resultat:**

- Hela namnet är läsbart utan vågrät rullning.
- Läsningen ändrar varken utkastet, objekten eller sambanden.

### UTKAST-108: egen referens för UTKAST-18

**Syfte:** 390 × 844; alla konfliktslag med nåbar status och synligt fokus.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-18](#utkast-18-hitta-alla-konfliktslag-och-läs-varje-underlags-hela-värden)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-108.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "390 × 844; alla konfliktslag med nåbar status och synligt fokus.",
  "outcomes": [
    "Alla fyra konfliktslag, fullständiga värden och typbetydelser bevaras.",
    "Tre kvarstående konflikter blockerar sparande efter typvalet."
  ],
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-108"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-18 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd 390 × 844 i steg 1–9.
   Under steg 5–6 ska konfliktknappen och varje fokuserad rubrik vara
   synliga. Under steg 7–9 ska underlag och resultat vara läsbara
   utan vågrät sidrullning.

**Förväntat resultat:**

- Alla fyra konfliktslag, fullständiga värden och typbetydelser bevaras.
- Tre kvarstående konflikter blockerar sparande efter typvalet.

### UTKAST-109: egen referens för UTKAST-18

**Syfte:** 320 × 844; alla konfliktslag med nåbar status och synligt fokus.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-18](#utkast-18-hitta-alla-konfliktslag-och-läs-varje-underlags-hela-värden)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-109.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "320 × 844; alla konfliktslag med nåbar status och synligt fokus.",
  "outcomes": [
    "Alla fyra konfliktslag, fullständiga värden och typbetydelser bevaras.",
    "Tre kvarstående konflikter blockerar sparande efter typvalet."
  ],
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-109"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-18 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd 320 × 844 i steg 1–9.
   Under steg 5–6 ska konfliktknappen och varje fokuserad rubrik vara
   synliga. Under steg 7–9 ska underlag och resultat vara läsbara
   utan vågrät sidrullning.

**Förväntat resultat:**

- Alla fyra konfliktslag, fullständiga värden och typbetydelser bevaras.
- Tre kvarstående konflikter blockerar sparande efter typvalet.

### UTKAST-110: egen referens för UTKAST-18

**Syfte:** 640 × 456; alla konfliktslag med nåbar status och synligt fokus.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-18](#utkast-18-hitta-alla-konfliktslag-och-läs-varje-underlags-hela-värden)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-110.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "640 × 456; alla konfliktslag med nåbar status och synligt fokus.",
  "outcomes": [
    "Alla fyra konfliktslag, fullständiga värden och typbetydelser bevaras.",
    "Tre kvarstående konflikter blockerar sparande efter typvalet."
  ],
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-110"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-18 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd 640 × 456 i steg 1–9.
   Under steg 5–6 ska konfliktknappen och varje fokuserad rubrik vara
   synliga. Under steg 7–9 ska underlag och resultat vara läsbara
   utan vågrät sidrullning.

**Förväntat resultat:**

- Alla fyra konfliktslag, fullständiga värden och typbetydelser bevaras.
- Tre kvarstående konflikter blockerar sparande efter typvalet.

### UTKAST-111: egen referens för UTKAST-20

**Syfte:** 390 × 900; rätta borttaget mål genom vanligt sambandsformulär.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-20](#utkast-20-rätta-ett-samband-med-borttaget-mål)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-111.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "390 × 900; rätta borttaget mål genom vanligt sambandsformulär.",
  "outcomes": [
    "Sambandets identitet, riktning och osäkerhet samt Privat stol bevaras.",
    "Nytt sparande delar rättelsen; Molnmusik återkommer inte."
  ],
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-111"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-20 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd 390 × 900 i steg 1–6.
   Under steg 3–5 ska samma privata samband öppnas, Molnmusik saknas
   bland mål och Garaget vara nåbart. Slutför sparandet i steg 6.

**Förväntat resultat:**

- Sambandets identitet, riktning och osäkerhet samt Privat stol bevaras.
- Nytt sparande delar rättelsen; Molnmusik återkommer inte.

### UTKAST-112: egen referens för UTKAST-21

**Syfte:** Objekttyp, 390 × 844; rätt befintlig definitionsredigering.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-21](#utkast-21-rätta-typdefinitioner-genom-inställningarna)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-112.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Objekttyp, 390 × 844; rätt befintlig definitionsredigering.",
  "outcomes": [
    "Rättad typ och Oberoende typförklaring finns tillsammans i utkastet.",
    "Kartans fakta består; nytt uttryckligt sparande delar definitionen."
  ],
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-112"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-21 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd objekttyp vid 390 × 844
   i steg 1–6. I steg 3 öppna
   **Välj inställning** och kontrollera nåbara fält och knappar. Slutför
   hela sparandet i steg 6.

**Förväntat resultat:**

- Rättad typ och Oberoende typförklaring finns tillsammans i utkastet.
- Kartans fakta består; nytt uttryckligt sparande delar definitionen.

### UTKAST-113: egen referens för UTKAST-21

**Syfte:** Sambandstyp, 1440 × 844; rätt befintlig definitionsredigering.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-21](#utkast-21-rätta-typdefinitioner-genom-inställningarna)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-113.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Sambandstyp, 1440 × 844; rätt befintlig definitionsredigering.",
  "outcomes": [
    "Rättad typ och Oberoende typförklaring finns tillsammans i utkastet.",
    "Kartans fakta består; nytt uttryckligt sparande delar definitionen."
  ],
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-113"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-21 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd sambandstyp vid 1440 × 844
   i steg 1–6. I steg 3 välj **Sambandstyper och riktning → Ändra
   sambandstyp: Min typ**. I steg 4 använd **Sambandstypens namn** och
   **Lägg sambandstypen i mitt utkast**. Slutför
   hela sparandet i steg 6.

**Förväntat resultat:**

- Rättad typ och Oberoende typförklaring finns tillsammans i utkastet.
- Kartans fakta består; nytt uttryckligt sparande delar definitionen.

### UTKAST-114: egen referens för UTKAST-21

**Syfte:** Sambandstyp, 390 × 844; rätt befintlig definitionsredigering.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-21](#utkast-21-rätta-typdefinitioner-genom-inställningarna)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-114.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Sambandstyp, 390 × 844; rätt befintlig definitionsredigering.",
  "outcomes": [
    "Rättad typ och Oberoende typförklaring finns tillsammans i utkastet.",
    "Kartans fakta består; nytt uttryckligt sparande delar definitionen."
  ],
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-114"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-21 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd sambandstyp vid 390 × 844
   i steg 1–6. I steg 3 välj **Sambandstyper och riktning → Ändra
   sambandstyp: Min typ**. I steg 4 använd **Sambandstypens namn** och
   **Lägg sambandstypen i mitt utkast**. I steg 3 öppna
   **Välj inställning** och kontrollera nåbara fält och knappar. Slutför
   hela sparandet i steg 6.

**Förväntat resultat:**

- Rättad typ och Oberoende typförklaring finns tillsammans i utkastet.
- Kartans fakta består; nytt uttryckligt sparande delar definitionen.

### UTKAST-115: egen referens för UTKAST-22

**Syfte:** 390 × 844, föreslaget värde; fokus efter egenskapsval.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-22](#utkast-22-konfliktval-behåller-användbart-fokus-utan-att-spara)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-115.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "390 × 844, föreslaget värde; fokus efter egenskapsval.",
  "outcomes": [
    "Lo Lind finns i utkastet; Lo Berg förblir sparat utan nytt kvitto.",
    "Escape återför fokus till synlig Karta utan konfliktknappen."
  ],
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-115"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-22 en gång. Anpassa och observera under dess
   angivna steg enligt följande: välj föreslagna värden i steg 2.
   Kontrollera Lo Lind och rubrikfokus i steg 3 och Karta-fokus i
   steg 4. Avsluta utan gemensamt sparande.

**Förväntat resultat:**

- Lo Lind finns i utkastet; Lo Berg förblir sparat utan nytt kvitto.
- Escape återför fokus till synlig Karta utan konfliktknappen.

### UTKAST-116: egen referens för UTKAST-24

**Syfte:** 390 × 844; tappade svar efter konfliktval och sparande.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-24](#utkast-24-återfinn-konfliktval-och-ett-enda-nytt-sparkvitto)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-116.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "390 × 844; tappade svar efter konfliktval och sparande.",
  "outcomes": [
    "Lo Lind, Spelar piano och Privat stol bevaras i utkastet.",
    "Ett uttryckligt sparande ger ett kvitto och tomt utkast.",
    "Kartan och historiken innehåller ett enda nytt sparande."
  ],
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-116"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-24 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd 390 × 844 i steg 1–5.
   Arma resolve och save före deras egna handlingar med status 200
   efter behandling. Läs nåbara kontrollknappar och besked.

**Förväntat resultat:**

- Lo Lind, Spelar piano och Privat stol bevaras i utkastet.
- Ett uttryckligt sparande ger ett kvitto och tomt utkast.
- Kartan och historiken innehåller ett enda nytt sparande.

### UTKAST-117: behåll ett ändrat samband och ompröva objektborttagningen

**Syfte:** Tabell; sparat samband efter samtidiga typbyten.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered UTKAST-11 med objektets och sambandets
borttagningsförslag samt Robins sparade Abonnemang och Används av.
Robin ändrar inte Molnmusiks namn i detta fall.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-117.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Tabell; sparat samband efter samtidiga typbyten.",
  "outcomes": [
    "Bara sambandets borttagningsförslag kastas; objektborttagningen finns kvar.",
    "Objekt och samband är oförändrade. Historiken får ingen ny grupp."
  ],
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-117"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **2 konflikter i ditt utkast**. Välj objektets föreslagna
   borttagning och **Lägg valen i utkastet**.
2. Välj sambandet i Alla konflikter. Läs Används av, välj sparade
   värden och **Lägg valen i utkastet**.
3. Stäng med Escape. Läs kvarvarande objektborttagning i Utkast
   och Robins fortfarande sparade samband. Försök spara hela utkastet,
   läs **Inget sparades** och stäng sparmodalen och textvyn.
   Välj Karta och **Hämta aktuellt underlag**; det kvarvarande förslaget består.

**Förväntat resultat:**

- Bara sambandets borttagningsförslag kastas; objektborttagningen finns kvar.
- Objekt och samband är oförändrade. Historiken får ingen ny grupp.

### UTKAST-118: bevara en beskrivning som bara den andre ändrar

**Syfte:** Karta; eget namn och oberoende sparad beskrivning genom nytt
  sparande.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Lo Exempel är sparad utan beskrivning. Alex föreslår
Lo Lind. Robin behåller Lo Exempel, ändrar till Spelar piano och sparar.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-118.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Karta; eget namn och oberoende sparad beskrivning genom nytt sparande.",
  "outcomes": [
    "Lo Lind och den oberoende beskrivningen Spelar piano sparas tillsammans."
  ],
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-118"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna konflikten. Välj föreslagna ändringar och
   **Lägg valen i utkastet**.
2. Stäng med Escape. Öppna Utkast och läs Lo Lind.
3. Spara hela utkastet. Läs Lo Lind och Spelar piano i sparade uppgifter.

**Förväntat resultat:**

- Lo Lind och den oberoende beskrivningen Spelar piano sparas tillsammans.

### UTKAST-119: egen referens för UTKAST-54

**Syfte:** 320 × 900; uteblivet anrop och misslyckad kontroll på smal skärm.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-54](#utkast-54-kontrollera-en-utebliven-ändring-före-nytt-försök)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-119.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "320 × 900; uteblivet anrop och misslyckad kontroll på smal skärm.",
  "outcomes": [
    "Lyckad kontroll av utebliven ändring behåller valen och tillåter nytt försök.",
    "Bekräftelsen ändrar bara utkastet; alla knappar är nåbara."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-119"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-54 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd 320 × 900 i steg 1–4.
   Under steg 2–3 får återöppning och misslyckad kontroll aldrig göra
   bekräftelsen möjlig. Återställ leveransen före återförsöket i steg 4.

**Förväntat resultat:**

- Lyckad kontroll av utebliven ändring behåller valen och tillåter nytt försök.
- Bekräftelsen ändrar bara utkastet; alla knappar är nåbara.

### UTKAST-120: egen referens för UTKAST-53

**Syfte:** Karta, 320 × 900, föreslagna värden; genomfört val med tappat svar.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-53](#utkast-53-kontrollera-ett-tappat-svar-efter-genomförd-ändring)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-120.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Karta, 320 × 900, föreslagna värden; genomfört val med tappat svar.",
  "outcomes": [
    "Resultatet återfinns utan upprepad bekräftelse, även utan konfliktknapp.",
    "Karta och historik är oförändrade; Lo Lind och Min anteckning finns i utkastet."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-120"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-53 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd Karta vid 320 × 900
   i steg 1–4. Välj Alex
   föreslagna namn och beskrivning i steg 1. Under steg 2–3 förblir
   Visa konfliktvalet nåbar utan konfliktknappen. Avsluta efter steg 4
   utan gemensamt sparande.

**Förväntat resultat:**

- Resultatet återfinns utan upprepad bekräftelse, även utan konfliktknapp.
- Karta och historik är oförändrade; Lo Lind och Min anteckning finns i
  utkastet.

### UTKAST-121: egen referens för UTKAST-53

**Syfte:** Karta, 1280 × 900, sparade värden; genomfört val med tappat svar.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-53](#utkast-53-kontrollera-ett-tappat-svar-efter-genomförd-ändring)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-121.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Karta, 1280 × 900, sparade värden; genomfört val med tappat svar.",
  "outcomes": [
    "Resultatet återfinns utan upprepad bekräftelse, även utan konfliktknapp.",
    "Karta och historik är oförändrade; berört förslag är kastat."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-121"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-53 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd Karta vid 1280 × 900
   i steg 1–4. Välj Lo Berg
   och Robins anteckning från sparade sidan i steg 1. I steg 4 visas
   **Förslaget har tagits bort ur ditt utkast** och utkastet är tomt. Under steg
2–3 förblir
   Visa konfliktvalet nåbar utan konfliktknappen. Avsluta efter steg 4
   utan gemensamt sparande.

**Förväntat resultat:**

- Resultatet återfinns utan upprepad bekräftelse, även utan konfliktknapp.
- Karta och historik är oförändrade; berört förslag är kastat.

### UTKAST-122: egen referens för UTKAST-53

**Syfte:** Karta, 320 × 900, sparade värden; genomfört val med tappat svar.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-53](#utkast-53-kontrollera-ett-tappat-svar-efter-genomförd-ändring)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-122.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Karta, 320 × 900, sparade värden; genomfört val med tappat svar.",
  "outcomes": [
    "Resultatet återfinns utan upprepad bekräftelse, även utan konfliktknapp.",
    "Karta och historik är oförändrade; berört förslag är kastat."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-122"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-53 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd Karta vid 320 × 900
   i steg 1–4. Välj Lo Berg
   och Robins anteckning från sparade sidan i steg 1. I steg 4 visas
   **Förslaget har tagits bort ur ditt utkast** och utkastet är tomt. Under steg
2–3 förblir
   Visa konfliktvalet nåbar utan konfliktknappen. Avsluta efter steg 4
   utan gemensamt sparande.

**Förväntat resultat:**

- Resultatet återfinns utan upprepad bekräftelse, även utan konfliktknapp.
- Karta och historik är oförändrade; berört förslag är kastat.

### UTKAST-123: egen referens för UTKAST-53

**Syfte:** Tabell, 1280 × 900, föreslagna värden; genomfört val med tappat svar.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-53](#utkast-53-kontrollera-ett-tappat-svar-efter-genomförd-ändring)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-123.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Tabell, 1280 × 900, föreslagna värden; genomfört val med tappat svar.",
  "outcomes": [
    "Resultatet återfinns utan upprepad bekräftelse, även utan konfliktknapp.",
    "Karta och historik är oförändrade; Lo Lind och Min anteckning finns i utkastet."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-123"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-53 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd Tabell vid 1280 × 900
   i steg 1–4. Välj **Tabell** före konfliktknappen i steg 1. Välj Alex
   föreslagna namn och beskrivning i steg 1. Under steg 2–3 förblir
   Visa konfliktvalet nåbar utan konfliktknappen. Avsluta efter steg 4
   utan gemensamt sparande.

**Förväntat resultat:**

- Resultatet återfinns utan upprepad bekräftelse, även utan konfliktknapp.
- Karta och historik är oförändrade; Lo Lind och Min anteckning finns i
  utkastet.

### UTKAST-124: egen referens för UTKAST-53

**Syfte:** Tabell, 320 × 900, föreslagna värden; genomfört val med tappat svar.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-53](#utkast-53-kontrollera-ett-tappat-svar-efter-genomförd-ändring)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-124.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Tabell, 320 × 900, föreslagna värden; genomfört val med tappat svar.",
  "outcomes": [
    "Resultatet återfinns utan upprepad bekräftelse, även utan konfliktknapp.",
    "Karta och historik är oförändrade; Lo Lind och Min anteckning finns i utkastet."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-124"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-53 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd Tabell vid 320 × 900
   i steg 1–4. Välj **Tabell** före konfliktknappen i steg 1. Välj Alex
   föreslagna namn och beskrivning i steg 1. Under steg 2–3 förblir
   Visa konfliktvalet nåbar utan konfliktknappen. Avsluta efter steg 4
   utan gemensamt sparande.

**Förväntat resultat:**

- Resultatet återfinns utan upprepad bekräftelse, även utan konfliktknapp.
- Karta och historik är oförändrade; Lo Lind och Min anteckning finns i
  utkastet.

### UTKAST-125: egen referens för UTKAST-53

**Syfte:** Tabell, 1280 × 900, sparade värden; genomfört val med tappat svar.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-53](#utkast-53-kontrollera-ett-tappat-svar-efter-genomförd-ändring)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-125.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Tabell, 1280 × 900, sparade värden; genomfört val med tappat svar.",
  "outcomes": [
    "Resultatet återfinns utan upprepad bekräftelse, även utan konfliktknapp.",
    "Karta och historik är oförändrade; berört förslag är kastat."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-125"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-53 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd Tabell vid 1280 × 900
   i steg 1–4. Välj **Tabell** före konfliktknappen i steg 1. Välj Lo Berg
   och Robins anteckning från sparade sidan i steg 1. I steg 4 visas
   **Förslaget har tagits bort ur ditt utkast** och utkastet är tomt. Under steg
2–3 förblir
   Visa konfliktvalet nåbar utan konfliktknappen. Avsluta efter steg 4
   utan gemensamt sparande.

**Förväntat resultat:**

- Resultatet återfinns utan upprepad bekräftelse, även utan konfliktknapp.
- Karta och historik är oförändrade; berört förslag är kastat.

### UTKAST-126: egen referens för UTKAST-53

**Syfte:** Tabell, 320 × 900, sparade värden; genomfört val med tappat svar.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-53](#utkast-53-kontrollera-ett-tappat-svar-efter-genomförd-ändring)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-126.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Tabell, 320 × 900, sparade värden; genomfört val med tappat svar.",
  "outcomes": [
    "Resultatet återfinns utan upprepad bekräftelse, även utan konfliktknapp.",
    "Karta och historik är oförändrade; berört förslag är kastat."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-126"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-53 en gång. Anpassa och observera under dess
   angivna steg enligt följande: använd Tabell vid 320 × 900
   i steg 1–4. Välj **Tabell** före konfliktknappen i steg 1. Välj Lo Berg
   och Robins anteckning från sparade sidan i steg 1. I steg 4 visas
   **Förslaget har tagits bort ur ditt utkast** och utkastet är tomt. Under steg
2–3 förblir
   Visa konfliktvalet nåbar utan konfliktknappen. Avsluta efter steg 4
   utan gemensamt sparande.

**Förväntat resultat:**

- Resultatet återfinns utan upprepad bekräftelse, även utan konfliktknapp.
- Karta och historik är oförändrade; berört förslag är kastat.

### UTKAST-127: ompröva ett samband när ändpunktens namn ändras

**Syfte:** Karta; samma ändpunkt med nytt namn och bevarade val.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Kör `new-reference` i den tillfälliga
konfliktinstallationen.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-127.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Karta; samma ändpunkt med nytt namn och bevarade val.",
  "outcomes": [
    "Aktuellt namn visas trots oförändrad ändpunktsidentitet.",
    "Opåverkade val finns kvar; bara det privata sambandsförslaget ändras."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-127"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna konflikten. Välj Molnmusik och Osäkert uppgivet från
   Ditt förslag. Operatören kör `newer-reference`.
2. Försök lägga valen i utkastet, läs avvisningen och välj
   **Visa aktuell jämförelse**.
3. Läs Ny musiktjänst. Mål och Osäkert uppgivet är fortfarande
   markerade. Lägg valen i utkastet.

**Förväntat resultat:**

- Aktuellt namn visas trots oförändrad ändpunktsidentitet.
- Opåverkade val finns kvar; bara det privata sambandsförslaget ändras.

### UTKAST-128: läs en konflikt som en annan klient redan har löst

**Syfte:** Karta; annan klient för samma ägare löser en stängd konflikt.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Kör `new-base`.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-128.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Karta; annan klient för samma ägare löser en stängd konflikt.",
  "outcomes": [
    "Återöppningen visar läsläge utan gammal bekräftelse.",
    "Läsningen ändrar varken aktuellt utkast eller sparad karta."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-128"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna konflikten och välj Alex namn och beskrivning. Stäng med Escape.
2. Operatören kör `resolve-elsewhere`. Öppna konfliktknappen igen.
3. Läs **Konflikten finns inte längre**. Kontrollera rubrikfokus och
   att ingen bekräftelse erbjuds. Stäng med Escape.

**Förväntat resultat:**

- Återöppningen visar läsläge utan gammal bekräftelse.
- Läsningen ändrar varken aktuellt utkast eller sparad karta.

### UTKAST-129: kontrollera okänt val efter annan klients hela sparande

**Syfte:** Karta, saved; annat fönster för Alex sparar och tömmer utkastet.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Kör `new-base`, `newer-private` och
`lose-unsent`.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-129.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Karta, saved; annat fönster för Alex sparar och tömmer utkastet.",
  "outcomes": [
    "Ingen privat lösningsbock, ny bekräftelse eller uppmaning att försöka igen visas.",
    "Lo Lind och Privat stol är sparade; utkastet är tomt.",
    "Kontrollen beskriver inte sparandet som osparat och ändrar inget."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-129"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna konflikten. Välj Lo Berg och Robins anteckning.
   Bekräfta, läs det oklara utfallet och stäng med Escape.
2. Operatören kör `save-elsewhere`: en annan klient för Alex
   löser med föreslagna värden och sparar hela utkastet.
3. Öppna igen och välj **Kontrollera om valet lades i utkastet**.
   Läs Konflikten finns inte längre och läsläget.

**Förväntat resultat:**

- Ingen privat lösningsbock, ny bekräftelse eller uppmaning att försöka igen
  visas.
- Lo Lind och Privat stol är sparade; utkastet är tomt.
- Kontrollen beskriver inte sparandet som osparat och ändrar inget.

### UTKAST-130: kontrollera okänt val efter annan klients hela sparande

**Syfte:** Karta, proposed; annat fönster för Alex sparar och tömmer utkastet.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Kör `new-base`, `newer-private` och
`lose-applied`.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-130.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Karta, proposed; annat fönster för Alex sparar och tömmer utkastet.",
  "outcomes": [
    "Ingen privat lösningsbock, ny bekräftelse eller uppmaning att försöka igen visas.",
    "Lo Lind och Privat stol är sparade; utkastet är tomt.",
    "Kontrollen beskriver inte sparandet som osparat och ändrar inget."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-130"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna konflikten. Välj Lo Lind och Min anteckning.
   Bekräfta, läs det oklara utfallet och stäng med Escape.
2. Operatören kör `save-elsewhere`: en annan klient för Alex
   löser med föreslagna värden och sparar hela utkastet.
3. Öppna igen och välj **Kontrollera om valet lades i utkastet**.
   Läs Konflikten finns inte längre och läsläget.

**Förväntat resultat:**

- Ingen privat lösningsbock, ny bekräftelse eller uppmaning att försöka igen
  visas.
- Lo Lind och Privat stol är sparade; utkastet är tomt.
- Kontrollen beskriver inte sparandet som osparat och ändrar inget.

### UTKAST-131: granska en ny konflikt efter ett tappat genomfört val

**Syfte:** Karta; senare sparat namn efter faktiskt genomfört privat val.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Kör `new-base` och `lose-applied`.

**Integrationstest:**
[conflict-continuity.spec.ts](../../tests/integration/conflict-continuity.spec.ts),
UTKAST-131.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Karta; senare sparat namn efter faktiskt genomfört privat val.",
  "outcomes": [
    "Lo Ås kräver ny granskning trots det tidigare genomförda valet.",
    "Oförändrat beskrivningsval behålls; bara namnvalet görs om.",
    "Kartan behåller Lo Ås och Robins anteckning."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-continuity.spec.ts",
    "caseId": "UTKAST-131"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna konflikten. Välj Alex namn och beskrivning, bekräfta och
   stäng efter det oklara utfallet.
2. Operatören kör `newer-name`. Öppna igen och kontrollera om valet
   lades i utkastet. Bekräftelsen är spärrad och ingen lösningsbock visas.
3. Visa aktuell jämförelse. Beskrivningen är markerad men namnet
   kräver nytt val. Välj Lo Lind igen.
4. Operatören kör `network-ok`. Lägg valen i utkastet utan att spara kartan.

**Förväntat resultat:**

- Lo Ås kräver ny granskning trots det tidigare genomförda valet.
- Oförändrat beskrivningsval behålls; bara namnvalet görs om.
- Kartan behåller Lo Ås och Robins anteckning.

### UTKAST-132: kontrollera ett uteblivet kastval för dubblettsamband

**Syfte:** 320 × 900, Karta; kastval stoppat före servern.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Kör `new-duplicate` och `lose-unsent`.

**Integrationstest:**
[conflict-special.spec.ts](../../tests/integration/conflict-special.spec.ts),
UTKAST-132.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "320 × 900, Karta; kastval stoppat före servern.",
  "outcomes": [
    "Lyckad kontroll skiljer uteblivet kastval från genomfört kastande.",
    "Hela utkastet, sparade samband, objekt och historik består."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-special.spec.ts",
    "caseId": "UTKAST-132"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Välj Karta. Öppna konflikten och välj
   **Ta bort sambandet ur ditt utkast**. Läs oklart utfall.
2. Stäng med Escape och öppna igen. Konflikten finns kvar och
   kastknappen är spärrad.
3. Kontrollera om valet lades i utkastet. Läs att det inte lades
   i utkastet och att kastknappen nu går att använda.
4. Stäng med Escape och kontrollera synligt fokus. Kasta inte igen.

**Förväntat resultat:**

- Lyckad kontroll skiljer uteblivet kastval från genomfört kastande.
- Hela utkastet, sparade samband, objekt och historik består.

### UTKAST-133: egen referens för UTKAST-77

**Syfte:** 320 × 900, Tabell; genomfört dubblettkastande med tappat svar.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-77](#utkast-77-kontrollera-ett-oklart-kastval-utan-upprepad-bekräftelse)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[conflict-special.spec.ts](../../tests/integration/conflict-special.spec.ts),
UTKAST-133.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "320 × 900, Tabell; genomfört dubblettkastande med tappat svar.",
  "outcomes": [
    "Dubblettförslaget kastas utan ändrat sparat samband.",
    "Återöppning och kontroll upprepar inte kastvalet; fokus är användbart."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-special.spec.ts",
    "caseId": "UTKAST-133"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-77 en gång. Anpassa och observera under dess
   angivna steg enligt följande: välj Tabell före steg 1.
   Utför steg 1–4. Under steg 2–3 förblir Visa konfliktvalet nåbar
   utan konfliktknappen.

**Förväntat resultat:**

- Dubblettförslaget kastas utan ändrat sparat samband.
- Återöppning och kontroll upprepar inte kastvalet; fokus är användbart.

### UTKAST-134: kontrollera ett uteblivet kastval för dubblettsamband

**Syfte:** 320 × 900, Tabell; kastval stoppat före servern.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Kör `new-duplicate` och `lose-unsent`.

**Integrationstest:**
[conflict-special.spec.ts](../../tests/integration/conflict-special.spec.ts),
UTKAST-134.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "320 × 900, Tabell; kastval stoppat före servern.",
  "outcomes": [
    "Lyckad kontroll skiljer uteblivet kastval från genomfört kastande.",
    "Hela utkastet, sparade samband, objekt och historik består."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-special.spec.ts",
    "caseId": "UTKAST-134"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Välj Tabell. Öppna konflikten och välj
   **Ta bort sambandet ur ditt utkast**. Läs oklart utfall.
2. Stäng med Escape och öppna igen. Konflikten finns kvar och
   kastknappen är spärrad.
3. Kontrollera om valet lades i utkastet. Läs att det inte lades
   i utkastet och att kastknappen nu går att använda.
4. Stäng med Escape och kontrollera synligt fokus. Kasta inte igen.

**Förväntat resultat:**

- Lyckad kontroll skiljer uteblivet kastval från genomfört kastande.
- Hela utkastet, sparade samband, objekt och historik består.

### UTKAST-135: egen referens för UTKAST-63

**Syfte:** 320 × 900, Tabell; båda genomförda borttagningsvalen med tappat svar.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Förbered
[UTKAST-63](#utkast-63-kontrollera-oklara-föreslagna-borttagningar)
i ett nytt hushåll.
Använd konfigurationen som anges här.

**Integrationstest:**
[conflict-special.spec.ts](../../tests/integration/conflict-special.spec.ts),
UTKAST-135.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "320 × 900, Tabell; båda genomförda borttagningsvalen med tappat svar.",
  "outcomes": [
    "Båda borttagningarna återfinns i utkastet utan upprepat val.",
    "Objekt, samband och historik är oförändrade."
  ],
  "counterpart": {
    "spec": "tests/integration/conflict-special.spec.ts",
    "caseId": "UTKAST-135"
  }
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-63 en gång. Anpassa och observera under dess
   angivna steg enligt följande: välj Tabell före steg 1.
   Utför steg 1–4. Kontrollera åtkomsten i steg 2–3 och båda privata
   borttagningarna i steg 4. Avsluta utan gemensamt sparande.

**Förväntat resultat:**

- Båda borttagningarna återfinns i utkastet utan upprepat val.
- Objekt, samband och historik är oförändrade.

### UTKAST-136: hör konfliktbesked med riktig skärmläsare

**Syfte:** Riktig skärmläsare; separat talobservation vid avvisning, återöppning
och väntan.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Tillfällig konfliktinstallation i dokumenterad vy.
Återställ mellan de tre fallen, inte under ett okänt utfall.

**Kräver mänsklig observation:** Faktiskt tal från en riktig skärmläsare.
Anteckna program, version och webbläsare.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Riktig skärmläsare; separat talobservation vid avvisning, återöppning och väntan.",
  "outcomes": [
    "Beskeden hörs begripligt en gång vid sina tillståndsövergångar.",
    "Senare fokus består. Anteckna faktiskt hörda ord och eventuella fel."
  ],
  "humanObservation": {
    "kind": "screen-reader",
    "observation": "Lyssna på riktigt skärmläsartal: ett begripligt besked utan dubbla annonseringar och utan att senare fokus flyttas."
  },
  "evidence": [
    {
      "kind": "overlap",
      "spec": "tests/integration/conflict-continuity.spec.ts",
      "caseId": "UTKAST-52",
      "purpose": "DOM-status och fokus; inget bevis på faktiskt skärmläsartal."
    },
    {
      "kind": "overlap",
      "spec": "tests/integration/conflict-continuity.spec.ts",
      "caseId": "UTKAST-55",
      "purpose": "DOM-status och fokus; inget bevis på faktiskt skärmläsartal."
    },
    {
      "kind": "overlap",
      "spec": "tests/integration/conflict-continuity.spec.ts",
      "caseId": "UTKAST-56",
      "purpose": "DOM-status och fokus; inget bevis på faktiskt skärmläsartal."
    }
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Utför UTKAST-52 en gång. Lyssna under steg 3 på ett enda
   besked om ändrat underlag.
2. Återställ med new-base och utför UTKAST-55 en gång. Lyssna
   under steg 2 när dialogen öppnas efter Robins senare sparande.
3. Återställ och utför UTKAST-56 en gång. Lyssna under steg 1 och 3
   på väntan och oklart utfall. Under steg 4–5 får status och återöppning
   inte ge dubbelt tal eller flytta senare fokus.

**Förväntat resultat:**

- Beskeden hörs begripligt en gång vid sina tillståndsövergångar.
- Senare fokus består. Anteckna faktiskt hörda ord och eventuella fel.

### UTKAST-137: spara oberoende objektändringar från två webbläsare

**Syfte:** Tabell; två medlemmars formulärförslag genom sparande och omstart.

**Användare:** Alex och Robin i skilda sessioner enligt grundfallet.

**Förutsättningar:** Nytt hushåll med Lo Exempel och Molnmusik,
två aktuella medlemmar och tomma egna utkast.

**Integrationstest:**
[draft-conflicts.spec.ts](../../tests/integration/draft-conflicts.spec.ts),
UTKAST-137.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "reference": "Tabell; två medlemmars formulärförslag genom sparande och omstart.",
  "outcomes": [
    "Båda sparanden bekräftas utan konflikt om det andra objektet.",
    "Lo Lind och Ny musiktjänst finns hos båda efter omstart.",
    "Båda egna utkasten är tomma."
  ],
  "counterpart": {
    "spec": "tests/integration/draft-conflicts.spec.ts",
    "caseId": "UTKAST-137"
  },
  "evidence": [
    {
      "kind": "technical",
      "spec": "tests/integration/draft-conflicts.spec.ts",
      "title": "independent users save unrelated objects without a meaningless conflict",
      "purpose": "Bevarat HTTP-prov för samtidiga oberoende förslag; omstart, sparad karta och båda privata utkast jämförs separat."
    }
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna Tabell i båda profilerna. Alex redigerar Lo Exempel till
   Lo Lind och väljer **Lägg i utkastet och stäng**.
2. Robin redigerar Molnmusik till Ny musiktjänst och lägger hela
   formuläret i sitt eget utkast.
3. Robin sparar hela sitt utkast, därefter sparar Alex hela sitt utkast.
   Stäng textvyn i båda profilerna.
4. Starta om med samma databas. Ladda om båda sidorna
   och läs Tabell och egna Utkast.

**Förväntat resultat:**

- Båda sparanden bekräftas utan konflikt om det andra objektet.
- Lo Lind och Ny musiktjänst finns hos båda efter omstart.
- Båda egna utkasten är tomma.

# Manuella testfall för sambandstyper

Testfallen omfattar riktning, gemensamma definitioner, privata utkast,
dubbletter, samtidiga ändringar samt egna fält och sambandsvärden.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

- Alex är administratör i testhushållet och loggar in med Google.
- Lo är vanlig medlem i samma hushåll och använder en separat profil.
  Alex bjuder in Lo enligt [tillgångsguiden](../user-guide/access.md).
- Kim är inloggad men saknar tillgång till hushållet.
- Alla uppgifter är påhittade och lagras i en separat testinstallation.

## Allmän förberedelse

Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor) när
fallen anger formulär, samtal, profil eller administration.

För att ändra ett samband, öppna **Tabell**, välj **Samband för** objektet
och **Redigera samband** vid den aktuella kopplingen. Välj **Nytt samband**
i samma dialog för ett tillägg. Objekt som saknas skapas separat med
**Nytt objekt**. **Lägg i utkastet** skickar hela sambandsformuläret och
lämnar dialogen öppen. Välj **Stäng samband** innan du sparar utkastet
eller fortsätter med annat arbete.

Definitioner öppnas genom **Inställningar → Typer och egna fält**.
Välj **Tillbaka till kartan** före sambandsarbete och granskning.
Granska hela utkastet genom **Skriv till Skyttel → Visa utkastet** och
öppna **Visa förslaget: [namn]** för kompletta definitioner och värden.
Stäng läsningen med krysset. Spara separat med utkastets sparikon och vänta
på **Utkastet är sparat**. Stäng textvyn före fortsatt arbete i Tabell.
En läsande sambandsöversikt stängs med krysset; **Stäng samband** hör till
sambandsarbetet efter tillägg och redigering.

1. Starta appen enligt
   [provförberedelsen](../development/devcontainer.md#disposable-local-database)
   med riktig SQLite. Börja varje fall i ett nytt hushåll utan privata förslag.
2. Använd [sambandstypguiden](../user-guide/relationship-types.md) för att hitta
   formulären. Starta bara om den separata testinstallationen.
3. Vid HTTP-kontroll, använd den inloggade profilens nätverkspanel.
   Kartans adress är `/api/households/<hushållets id>/map` och historiken
   har tillägget `/history`. Hushållets ID finns i kartans vanliga
   nätverksbegäran. Publicera inga sessionsuppgifter eller testinnehåll.

## Definition och koppling

### STY-01: Definition och valfria ändpunkter sparas tillsammans

**Syfte:** Kontrollera beständigt utkast, samlat sparande och historik.

**Användare:** Alex.

**Förutsättningar:** Typen Förvaring saknas.

**Integrationstest:**
[relationship-types.spec.ts](../../tests/integration/relationship-types.spec.ts),
testfallet “STY-01: a directed definition and arbitrary endpoints share a
durable draft, save and history”.

**Steg:**

1. Skapa Förvaring med beskrivningen Var hushållets saker finns och
   benämningarna förvaras i och innehåller. Lägg typen i utkastet.
2. Skapa Alex blå cykel och Garaget med valfria olika objekttyper.
   Koppla cykeln till garaget med den nya sambandstypen.
3. Starta om och ladda om. Kontrollera kartans HTTP-svar: definitionen,
   objekten och sambandet finns bara i det egna utkastet.
4. Spara hela utkastet. Läs kvittot, starta om igen och läs kartan samt
   historiken. Återförsök samma sparbegäran med samma operations-ID och
   utkastversion via nätverkspanelen.

**Förväntat resultat:**

- Definition och innehåll finns kvar i utkastet efter omstart och blir
  gemensamma tillsammans vid sparandet.
- Båda benämningarna, stabila identiteter och definitionsversion finns
  i kartan och kvittot. Historik och återförsök ger samma kvitto.

### STY-02: Båda benämningarna öppnar samma riktade samband

**Syfte:** Kontrollera formulär, obligatorisk typ och rättade definitioner.

**Användare:** Alex.

**Förutsättningar:** Alex blå cykel och Garaget finns i utkastet.

**Integrationstest:**
[relationship-types.spec.ts](../../tests/integration/relationship-types.spec.ts),
testfallet “STY-02: forms show the same directed relationship from both
objects and edit the shared definition”.

**Steg:**

1. Skapa Förvaring med benämningarna och beskrivningen i STY-01.
2. Öppna cykelns sambandsdialog, välj Nytt samband och garaget. Prova att lägga
   kopplingen i utkastet utan typ. Välj sedan Förvaring och lägg till.
3. Öppna utkastets fullständiga definitionsläsning och läs båda
   benämningarna. Stäng läsningen och textvyn. Prova ett identiskt
   tillägg i samma utkast och läs beskedet med cykelns och garagets namn.
   Välj **Avbryt redigeringen** och bekräfta att bara den oskickade
   dubblettinmatningen kastas. Stäng sambandsdialogen, spara hela utkastet
   och ladda om. Öppna **Samband för Alex blå cykel** i Tabell. Läs
   cykelns benämning, stäng dialogen och öppna **Samband för Garaget**.
4. Läs garagets benämning och välj **Redigera samband**.
   Kontrollera att startobjektet fortfarande är cykeln och målobjektet
   garaget. Välj **Avbryt redigeringen** och stäng översikten med krysset.
5. Ändra typens namn till Plats, beskrivningen till Hushållets
   förvaringsplatser och startbenämningen till finns i. Granska skillnaden,
   spara och ladda om. Läs kartans samband via HTTP.

**Förväntat resultat:**

- Kopplingen kräver en typ. Benämningarna beskriver samma samband:
  cykeln förvaras i garaget och garaget innehåller cykeln.
- Även när typen är privat beskriver ett upprepat tillägg det befintliga
  sambandet med namn och benämning utan att skapa en dubblett.
- Definitionens rättelse ändrar visad text men inte sambandets identitet,
  revision, startobjekt eller målobjekt. Bara ett samband finns.

### STY-03: Medlemmar redigerar typer utan att privata förslag röjs

**Syfte:** Kontrollera medlemsroll, förifyllda typer och hushållsgränser.

**Användare:** Alex, Lo och Kim.

**Förutsättningar:** Lo är vanlig medlem och Kim saknar tillgång.

**Integrationstest:**
[relationship-types.spec.ts](../../tests/integration/relationship-types.spec.ts),
testfallet “STY-03: members share editable prefills while private definitions
and household boundaries stay protected”.

**Steg:**

1. Lo lägger Förvaring i sitt utkast. Alex laddar om och läser kartan.
   Lo sparar, varefter Alex laddar om igen.
2. Lo ändrar en förifylld typ till Redigerad förifylld typ och anger båda
   benämningarna. Spara och ladda om. Skapa **Medlemmens cykel** separat
   och lägg objektet i utkastet. Öppna dess sambandsdialog och
   **Nytt samband**. Kontrollera typens namn och stäng utan tillägg.
3. Alex skapar och sparar en separat typ som också heter Förvaring.
4. Kopiera Alex vanliga typbegäran i nätverkspanelen. Prova tomt namn,
   tom benämning från respektive håll och ogiltiga `fields: null` i
   definitionen. Använd aktuell utkastversion för varje försök.
5. Kim försöker läsa kartan och skicka en typbegäran till samma adress.

**Förväntat resultat:**

- Privata definitioner röjs inte. Vanliga medlemmar får skapa typer och
  rätta förifyllda definitioner; formuläret visar aktuellt namn.
- Lika namn ger två separata identiteter. Ogiltiga definitioner ger
  HTTP 400 och ändrar inget utkast.
- Kim får HTTP 403 för både läsning och ändring.

## Samtidighet och dubbletter

### STY-04: Konfliktval bevarar oberoende definitionsändringar

**Syfte:** Stoppa hela sparandet och bevara oberoende rättelser i historiken.

**Användare:** Alex och Lo.

**Förutsättningar:** Förvaring är sparad med benämningarna i STY-01.

**Integrationstest:**
[relationship-types.spec.ts](../../tests/integration/relationship-types.spec.ts),
testfallet “STY-04: stale definitions stop the whole save and explicit
resolution preserves independent edits”.

**Steg:**

1. Alex ändrar typnamnet till Plats och målbenämningen till har. Lägg
   definitionen samt nya objekt och ett samband av typen i utkastet.
2. Lo ändrar beskrivningen till Los nya förklaring och målbenämningen
   till rymmer. Lo sparar före Alex.
3. Alex försöker spara. Hämta aktuellt underlag och läs konflikten.
   Kontrollera att inga av Alex objekt sparas och att utkastet finns kvar.
4. Öppna **Granska konflikter**. Välj eget typnamn Plats och egen
   målbenämning har, men den sparade beskrivningen Los nya förklaring.
   Välj **Lägg valen i utkastet** och stäng med Escape. Kontrollera att
   objekten fortfarande är privata och spara sedan hela utkastet.
5. Starta om och läs kartan samt historiken via HTTP.

**Förväntat resultat:**

- Hela det äldre sparandet stoppas. Konfliktvalet ändrar bara utkastet.
- Det nya sparandet innehåller Plats, Los nya förklaring och har samt
  objekten och sambandet. Historiken bevarar även Los tidigare definition
  med rymmer. Sambandets definitionsunderlag motsvarar den nya versionen.

### STY-05: Dubbletter ger ett begripligt resultat utan delsparande

**Syfte:** Kontrollera tillägg, ändring och samtidiga försök med egna typer.

**Användare:** Alex och Lo.

**Förutsättningar:** Cykeln, Garaget och Förrådet finns samt typerna
Förvaring och Annan betydelse, med skilda identiteter.

**Integrationstest:**
[relationship-types.spec.ts](../../tests/integration/relationship-types.spec.ts),
testfallet “STY-05: duplicate adds, edits and concurrent saves preserve
identity and reject every partial write”.

**Steg:**

1. Skapa och spara ett samband av varje typ från cykeln till garaget.
   Prova ett identiskt tillägg av Förvaring. Kontrollera befintlig identitet
   i tilläggsbegärans HTTP-svar.
2. Försök ändra det andra sambandet till Förvaring med samma ändpunkter.
   Kontrollera avvisningen och att både karta och utkast är oförändrade.
3. Ändra i stället det andra sambandet till Förvaring i omvänd riktning.
   Markera Upphört och ange slutdatum `2020-01-01`. Granska och spara.
4. Alex föreslår ett nytt typnamn, ett nytt objekt och Förvaring från
   cykeln till förrådet. Lo lägger samma samband i sitt eget utkast och
   sparar först. Alex försöker sedan spara hela utkastet.
5. Kontrollera att inget av Alex förslag sparas. Hämta aktuellt underlag,
   öppna **Granska konflikter** och läs dubbletten utan egenskapsval.
   Stäng med Escape och kontrollera att utkastet är oförändrat.
   Öppna igen och välj **Ta bort sambandet ur ditt utkast**.
   Kontrollera att typnamnsförslaget, det oberoende objektförslaget och
   Los sparade samband finns kvar samt att historiken är oförändrad.
   Spara återstående förslag separat från
   **Skriv till Skyttel → Visa utkastet**. Läs kartan och historiken via HTTP.

**Förväntat resultat:**

- Ett upprepat tillägg ger befintligt samband; en överlappande ändring
  avvisas. Olika typer och motsatt riktning kan ha separata samband.
- Samtidig dubblett stoppar hela sparandet, även typnamn och nytt objekt.
  Efter konfliktval finns Los samband kvar utan Alex dubblett.
- Historiken bevarar tidigare typ, riktning och ändpunkter. Status och
  slutdatum hör till samma samband efter rättelsen.

## Egna sambandsuppgifter

### STY-06: Fyra valfria fältslag sparas med sambandet

**Syfte:** Kontrollera att definition och egna svar delar utkast och sparande.

**Användare:** Alex.

**Förutsättningar:** Cykeln och Garaget finns i utkastet med olika objekttyper.

**Integrationstest:**
[relationship-fields.spec.ts](../../tests/integration/relationship-fields.spec.ts),
testfallen “STY-06: optional relationship fields share definitions, editing
and durable save at 1440px” och “STY-06: optional relationship fields share
definitions, editing and durable save at 390px”.

**Steg:**

1. Öppna Ny sambandstyp. Ange Förvaring, beskrivningen Var saker finns
   och benämningarna förvaras i och innehåller.
2. Lägg till Anteckning som Text, Belopp som Tal, Startdatum som Datum
   samt Bekräftat och Obesvarat som Ja/nej. Kontrollera att fokus hamnar
   på det nya fältets namn. Lägg definitionen i utkastet.
3. Skapa ett samband från Cykeln till Garaget med Förvaring. Ange
   Låst skåp, 0, 2026-09-27 och Nej. Lämna Obesvarat utan svar.
4. Lägg sambandet i utkastet med tangentbordet, välj **Stäng samband**,
   öppna **Utkastet → Visa förslaget: Cykeln → förvaras i → Garaget**
   och läs värdena. Stäng läsningen och spara med sparikonen.
   Starta om testinstallationen och ladda om sidan.
5. Öppna **Samband för Cykeln** i Tabell och välj **Redigera samband**.
   Kontrollera samtliga svar. Ändra Anteckning till Övre hyllan, lägg
   ändringen i utkastet, stäng dialogen och spara utkastet.
6. Upprepa på mobil och med tangentbord. Kontrollera att kontrollerna
   går att nå genom intern rullning och har synligt fokus.

**Förväntat resultat:**

- Definition, riktning och svar sparas tillsammans och återläses efter
  omstart. Noll och Nej består; Obesvarat förblir obesvarat.
- Ändring av Anteckning behåller övriga svar och samma sambandsidentitet.
- Fältnamn och kontroller går att läsa och använda på dator och mobil.

### STY-07: Typbyte kräver beslut om tidigare egna svar

**Syfte:** Förhindra att ett typbyte omtolkar eller tappar egna svar.

**Användare:** Alex.

**Förutsättningar:** Förvaring och Tillgång har varsitt textfält Anteckning.
Ett sparat samband av typen Förvaring har svaret Behåll som historik.

**Integrationstest:**
[relationship-fields.spec.ts](../../tests/integration/relationship-fields.spec.ts),
testfallet “STY-07: relationship type changes require an explicit decision
about earlier custom answers”.

**Steg:**

1. Öppna cykelns sambandsdialog och välj **Redigera samband**.
2. Välj Tillgång. Läs **Ta bort tidigare egna fält?**, med
   **Anteckning: Behåll som historik**. Typen och det sparade sambandet
   är oförändrade innan beslutet.
3. Välj **Ta bort fältvärdena och byt typ**. Kontrollera att den nya
   typens Anteckning är tom. Skriv Ny betydelse och lägg sambandet i
   utkastet med tangentbordet. Välj **Stäng samband**.
4. Öppna Utkastet och Visa förslaget för sambandet. Läs tidigare värde
   och förslag, stäng läsningen och spara med sparikonen. Läs historiken.

**Förväntat resultat:**

- Förslaget kan inte skickas före det uttryckliga beslutet. Fält med
  samma namn får inte automatiskt samma svar.
- Den nya typen har Ny betydelse. Historiken behåller Behåll som historik
  med den tidigare typens definition och samma sambandsidentitet.

### STY-08: Avsnitt bevarar dolda svar och privata definitioner

**Syfte:** Ordna sambandens formulär utan att ändra fältidentitet eller svar.

**Användare:** Alex.

**Förutsättningar:** Cykeln och Garaget finns i hushållets karta eller utkast.
Ett nytt provhushåll används för varje skärmbredd.

**Integrationstest:**
[relationship-sections.spec.ts](../../tests/integration/relationship-sections.spec.ts),
testfallen:

- “STY-08: relationship sections preserve hidden answers and private
  presentation after restart at 1440px”.
- “STY-08: relationship sections preserve hidden answers and private
  presentation after restart at 390px”.
- “STY-08: relationship sections preserve hidden answers and private
  presentation after restart at 320px”.

**Steg:**

1. Öppna Inställningar → Typer och egna fält och välj Ny sambandstyp.
   Ange Förvaring och benämningarna förvaras i och innehåller.
2. Namnge avsnitten Uppgifter och Service. Flytta Service upp med
   tangentbordet och kontrollera att fokus följer avsnittet.
3. Lägg till Leverantör som Text, Effekt som Tal, Datum som Datum samt
   Batteri och Reserv som Ja/nej. Placera dem i Uppgifter. Kontrollera
   läsbarhet och åtkomliga kontroller i ljust och mörkt tema.
4. Lägg definitionen i utkastet. Skapa sambandet Cykeln → Förvaring →
   Garaget med svaren Exempelsol, 0, 2026-09-01 och Nej. Lämna Reserv
   obesvarat och lägg sambandet i utkastet.
5. Ändra definitionen i Inställningar. Dölj Effekt och flytta Leverantör
   till Service. Lägg förslaget i utkastet och spara hela utkastet.
6. Starta om testinstallationen och ladda om sidan. Öppna sambandet för
   redigering. Effekt ska vara dolt, Batteri ska vara Nej och Reserv
   obesvarat. Välj **Avbryt redigeringen** och stäng sambandsdialogen med krysset.
7. Ändra definitionen igen och visa Effekt i Service. Lägg den i utkastet
   och öppna sambandet. Kontrollera att Effekt är 0 och alla andra svar
   består redan innan definitionen sparas.
8. Upprepa på mobil, med tangentbord och med minskad rörelse.

**Förväntat resultat:**

- Avsnittens ordning och fältens placering följer det privata utkastet.
  Förslagen sparas tillsammans; omstart förlorar inga dolda svar.
- Återvisning behåller samma fältidentiteter och tidigare värden.
  Noll, Nej och obesvarat förblir skilda.
- Fokus går att följa och kontrollerna är nåbara på dator och mobil.
  Temabyte och intern rullning bevarar pågående redigering.

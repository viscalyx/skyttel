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

### STY-01: Typ- och fältformulär sparas med ett riktat samband

**Syfte:** Kontrollera native formulärvalidering, beständigt utkast och samlat
sparande av definition, objekt och samband.

**Användare:** Alex.

**Förutsättningar:** Ett tomt provhushåll där Förvaring saknas.

**Integrationstest:**
[relationship-types.spec.ts](../../tests/integration/relationship-types.spec.ts),
STY-01. Exakt HTTP-kvitto och återspelning är separat tekniskt underlag.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/relationship-types.spec.ts",
    "caseId": "STY-01"
  },
  "reference": "Chromium, datorvy; angivna roller och förberedda hushållsdata",
  "outcomes": [
    "Typ- och fältformulär sparas med ett riktat samband"
  ],
  "evidence": [
    {
      "kind": "technical",
      "spec": "tests/integration/relationship-types.spec.ts",
      "title": "directed definition HTTP staging preserves exact receipt and history replay",
      "purpose": "Exakt definitionsunderlag, beständigt kvitto och identisk återspelning"
    }
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna Inställningar → Typer och egna fält och Ny sambandstyp.
   Försök lägga i utkastet utan namn. Fyll Förvaring, försök igen utan
   startbenämning, fyll förvaras i och försök utan målbenämning.
   Kontrollera att fokus går till varje obligatoriskt fält. Fyll innehåller
   och beskrivningen Var hushållets saker finns.
2. Välj Lägg till fält och försök skicka med tomt fältnamn. Kontrollera
   fokus på Fältets namn. Ange Anteckning som Text och lägg typen i utkastet.
3. Välj Tillbaka till kartan. Skapa Alex blå cykel som Fordon och Garaget
   som Bostad i separata objektformulär; lägg båda i utkastet.
4. Öppna Samband för Alex blå cykel och Nytt samband. Välj Förvaring,
   Garaget som mål och skriv Låst skåp i Anteckning. Lägg i utkastet och stäng.
5. Starta om provinstallationen och ladda om. Öppna Utkastet och Visa
   förslaget: Alex blå cykel → förvaras i → Garaget. Läs Låst skåp.
   Stäng läsningen, spara hela utkastet och invänta Utkastet är sparat.
6. Starta om igen och ladda om. Öppna sambanden för cykeln respektive
   garaget i Tabell och läs riktningen från båda objekten. Stäng läsningen,
   redigera sambandet från cykeln och kontrollera Anteckning: Låst skåp.
   Skicka ingen ytterligare rättelse.

**Förväntat resultat:**

- Ogiltiga definitioner ger ingen del av ett förslag. Fokus visar det
  obligatoriska typ-, benämnings- eller fältnamnet som behöver fyllas i.
- Definition, båda olika objekttyperna och sambandet finns kvar tillsammans
  i utkastet efter omstart. Låst skåp går att läsa före gemensamt sparande.
- Sparandet gör uppgifterna gemensamma tillsammans. Efter omstart visas
  cykeln förvaras i garaget och garaget innehåller cykeln.

### STY-02: Båda benämningarna öppnar samma riktade samband

**Syfte:** Kontrollera formulär, obligatorisk typ och rättade definitioner.

**Användare:** Alex.

**Förutsättningar:** Alex blå cykel och Garaget finns i utkastet.

**Integrationstest:**
[relationship-types.spec.ts](../../tests/integration/relationship-types.spec.ts),
testfallet “STY-02: forms show the same directed relationship from both
objects and edit the shared definition”.

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/relationship-types.spec.ts",
    "caseId": "STY-02"
  },
  "reference": "Chromium, datorvy; angivna roller och förberedda hushållsdata",
  "outcomes": [
    "Båda benämningarna öppnar samma riktade samband"
  ]
}
```

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

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/relationship-types.spec.ts",
    "caseId": "STY-03"
  },
  "reference": "Chromium, datorvy; angivna roller och förberedda hushållsdata",
  "outcomes": [
    "Medlemmar redigerar typer utan att privata förslag röjs"
  ]
}
```

**Ytterligare tekniskt underlag:** Samma automatisering provar tomt namn,
tom benämning från vardera håll, ogiltiga fältdefinitioner, oförändrat utkast
efter HTTP 400 och Kims HTTP 403 för läsning och ändring. Dessa är tekniska
kontroller; den vanliga UI-proceduren kräver inte att begäranden redigeras.

**Steg:**

1. Lo öppnar Inställningar → Typer och egna fält och Ny sambandstyp.
   Fyll Förvaring, beskrivningen Förvaringsplats samt benämningarna
   förvaras i och innehåller. Lägg typen i utkastet.
2. Alex öppnar samma inställning och avsnittet Sambandstyper och riktning.
   Kontrollera att Los privata Förvaring inte visas. Lo återgår till kartan,
   öppnar Utkastet och läser det fullständiga definitionsförslaget.
   Lo stänger läsningen och sparar hela utkastet. Alex laddar om och öppnar
   avsnittet igen; Förvaring ska nu vara gemensam.
3. Lo öppnar en förifylld typ för ändring och anger Redigerad förifylld typ,
   Förvaringsplats, förvaras i och innehåller. Lägg i utkastet, återgå till
   kartan och spara. Skapa Medlemmens cykel separat i utkastet och öppna
   dess sambandsdialog och Nytt samband. Kontrollera typens nya namn.
   Stäng utan att lägga till något samband.
4. Alex skapar genom Ny sambandstyp en separat definition med samma namn
   Förvaring och samma benämningar. Lägg i utkastet, spara och återgå till
   typinställningen. Öppna Sambandstyper och riktning vid behov.

**Förväntat resultat:**

- Lo kan skapa och rätta definitioner genom samma formulär som Alex.
  Alex ser inte Los privata definition före sparandet.
- Rättad förifylld typ visas i sambandsformuläret med det nya namnet.
- Två separata Förvaring visas i katalogen; lika namn slår inte ihop typer.
  Den separata automatiska identitets- och åtkomstkontrollen behålls.

## Samtidighet och dubbletter

### STY-04: Konfliktval bevarar oberoende definitionsändringar

**Syfte:** Stoppa hela sparandet och bevara oberoende rättelser i historiken.

**Användare:** Alex och Lo.

**Förutsättningar:** Förvaring är sparad med benämningarna i STY-01.

**Separat förberedelse:**

1. Alex öppnar Förvaring i typinställningen, föreslår Plats och
   målbenämningen har. Lägg definitionen, Cykeln och Garaget som nya objekt
   samt ett Förvaring-samband mellan dem i Alex utkast; spara inte.
2. Lo föreslår Los nya förklaring och målbenämningen rymmer i samma sparade
   typ och sparar före Alex. Återgå till Alex och ladda om kartan.
   Automatiseringen förbereder samma två användares underlag genom HTTP.

**Ytterligare tekniskt underlag:** Den gamla sparbegärans HTTP 409,
oförändrat utkast och inga delsparade objekt, samt definitionsversioner och
historik efter omstart, kontrolleras i samma test. Konfliktens browserval
utförs genom den vanliga dialogen enligt stegen nedan.

**Integrationstest:**
[relationship-types.spec.ts](../../tests/integration/relationship-types.spec.ts),
testfallet “STY-04: stale definitions stop the whole save and explicit
resolution preserves independent edits”.

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/relationship-types.spec.ts",
    "caseId": "STY-04"
  },
  "reference": "Chromium, datorvy; angivna roller och förberedda hushållsdata",
  "outcomes": [
    "Konfliktval bevarar oberoende definitionsändringar"
  ]
}
```

**Steg:**

1. Öppna Tabell och välj 1 konflikt i ditt utkast. Läs Granska konflikter
   och den aktuella sparade beskrivningen Los nya förklaring.
2. Välj det egna typnamnet Plats och målbenämningen har samt den sparade
   beskrivningen Los nya förklaring. Välj Lägg valen i utkastet och stäng
   med Escape.
3. Öppna Utkastet och Visa förslaget: Plats. Läs Los nya förklaring.
   Stäng läsningen och spara hela utkastet separat.
4. Starta om provinstallationen med samma databas.

**Förväntat resultat:**

- Konfliktvalet ändrar bara utkastet; det utför inget gemensamt sparande.
- Förslaget och det nya sparandet innehåller Plats, Los nya förklaring och
  har tillsammans med objekten och sambandet.
- Automatiseringen bevarar den äldre definitionen med rymmer i historiken
  och kontrollerar sambandets nya definitionsunderlag efter omstart.

### STY-05: Dubbletter ger ett begripligt resultat utan delsparande

**Syfte:** Kontrollera tillägg, ändring och samtidiga försök med egna typer.

**Användare:** Alex och Lo.

**Förutsättningar:** Cykeln, Garaget och Förrådet finns samt typerna
Förvaring och Annan betydelse, med skilda identiteter.

**Separat förberedelse:**

1. Skapa och spara Förvaring och Annan betydelse samt Cykeln, Garaget och
   Förrådet. Skapa ett samband av varje typ från Cykeln till Garaget.
2. Rätta det andra sambandet till Förvaring i omvänd riktning. Välj Upphört
   och känt slutdatum 2020-01-01. Lägg rättelsen i utkastet och spara.
3. Alex föreslår typnamnet Mitt nya namn, objektet Privat följeslagare
   samt Förvaring från Cykeln till Förrådet. Spara inte. Lo lägger samma
   riktade samband i sitt utkast och sparar först. Återgå till Alex och
   ladda om kartan. Automatiseringen förbereder dessa underlag genom HTTP.

**Ytterligare tekniskt underlag:** Upprepat HTTP-tillägg ger befintlig
identitet; en överlappande ändring avvisas utan mutation. Det gamla hela
sparandet avvisas utan delsparande. Samma test behåller tidigare typ,
riktning, ändpunkter och datum i historiken. Detta är automatiska
protokollkontroller, inte extra steg i det vanliga browserfallet.

**Integrationstest:**
[relationship-types.spec.ts](../../tests/integration/relationship-types.spec.ts),
testfallet “STY-05: duplicate adds, edits and concurrent saves preserve
identity and reject every partial write”.

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/relationship-types.spec.ts",
    "caseId": "STY-05"
  },
  "reference": "Chromium, datorvy; angivna roller och förberedda hushållsdata",
  "outcomes": [
    "Dubbletter ger ett begripligt resultat utan delsparande"
  ]
}
```

**Steg:**

1. Välj 1 konflikt i ditt utkast. Läs beskedet att ett sparat samband
   redan har samma typ, riktning och objekt. Kontrollera att dubbletten
   inte erbjuder egenskapsval eller Lägg valen i utkastet.
2. Stäng med Escape. Öppna konflikten igen och välj
   Ta bort sambandet ur ditt utkast. Invänta bekräftelsen.
3. Granska det återstående utkastet och spara separat genom
   Skriv till Skyttel → Visa utkastet.

**Förväntat resultat:**

- Stängning utan val behåller förslagen. Borttagningsvalet tar endast bort
  Alex dubblett; typnamnsförslaget och Privat följeslagare behålls.
- Los sparade samband och historiken ändras inte av konfliktvalet.
- Det nya sparandet behåller Los samband, det oberoende objektet och
  typnamnet. Det tidigare omvända sambandet behåller Upphört och slutdatum.

## Egna sambandsuppgifter

### STY-06: Fyra valfria fältslag sparas med sambandet

**Syfte:** Kontrollera att definition och egna svar delar utkast och sparande.

**Användare:** Alex.

**Förutsättningar:** Cykeln och Garaget finns i utkastet med olika objekttyper.
Använd webbläsarvy 1440 × 1000 för hela spara- och omstartskedjan.

**Integrationstest:**
[relationship-fields.spec.ts](../../tests/integration/relationship-fields.spec.ts),
STY-06, komplett referens vid 1440 × 1000.

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/relationship-fields.spec.ts",
    "caseId": "STY-06"
  },
  "reference": "1440 × 1000; komplett spara- och omstartskedja",
  "outcomes": [
    "Fyra valfria fältslag sparas med sambandet"
  ]
}
```

**Steg:**

1. Öppna Ny sambandstyp. Ange Förvaring, beskrivningen Var saker finns
   och benämningarna förvaras i och innehåller.
2. Lägg till Anteckning som Text, Belopp som Tal, Startdatum som Datum
   samt Bekräftat och Obesvarat som Ja/nej. Kontrollera att fokus hamnar
   på det nya fältets namn. Lägg definitionen i utkastet.
3. Skapa ett samband från Cykeln till Garaget med Förvaring. Ange
   Låst skåp, 0, 2026-09-27 och Nej. Lämna Obesvarat utan svar.
4. Prova Tab genom de egna fälten till Obesvarat. Rulla fram Lägg i
   utkastet och skicka med Enter. Välj **Stäng samband**,
   öppna **Utkastet → Visa förslaget: Cykeln → förvaras i → Garaget**
   och läs värdena. Stäng läsningen och spara med sparikonen.
   Starta om testinstallationen och ladda om sidan.
5. Öppna **Samband för Cykeln** i Tabell och välj **Redigera samband**.
   Kontrollera samtliga svar. Ändra Anteckning till Övre hyllan, lägg
   ändringen i utkastet, stäng dialogen och spara utkastet.

**Förväntat resultat:**

- Definition, riktning och svar sparas tillsammans och återläses efter
  omstart. Noll och Nej består; Obesvarat förblir obesvarat.
- Ändring av Anteckning behåller övriga svar och samma sambandsidentitet.
- Fältnamn och kontroller går att läsa och använda på dator.
  Mobilens native arbete har ett eget fall, STY-09.

### STY-07: Typbyte kräver beslut om tidigare egna svar

**Syfte:** Förhindra att ett typbyte omtolkar eller tappar egna svar.

**Användare:** Alex.

**Förutsättningar:** Förvaring och Tillgång har varsitt textfält Anteckning.
Ett sparat samband av typen Förvaring har svaret Behåll som historik.

**Integrationstest:**
[relationship-fields.spec.ts](../../tests/integration/relationship-fields.spec.ts),
testfallet “STY-07: relationship type changes require an explicit decision
about earlier custom answers”.

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/relationship-fields.spec.ts",
    "caseId": "STY-07"
  },
  "reference": "Chromium, datorvy; angivna roller och förberedda hushållsdata",
  "outcomes": [
    "Typbyte kräver beslut om tidigare egna svar"
  ]
}
```

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
Använd webbläsarvy 1440 × 1000 med minskad rörelse.
STY-10 och STY-11 skyddar separat mobilens native arbete.

**Integrationstest:**
[relationship-sections.spec.ts](../../tests/integration/relationship-sections.spec.ts),
STY-08, komplett referens vid 1440 × 1000.

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/relationship-sections.spec.ts",
    "caseId": "STY-08"
  },
  "reference": "1440 × 1000; komplett kedja, båda teman, minskad rörelse",
  "outcomes": [
    "Avsnitt bevarar dolda svar och privata definitioner"
  ]
}
```

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
   obesvarat. Rulla fram Avbryt redigeringen, kontrollera fokus och att
   åtgärden ryms i vyn. Välj den och stäng sambandsdialogen med krysset.
7. Ändra definitionen igen och visa Effekt i Service. Lägg den i utkastet
   och öppna sambandet. Kontrollera att Effekt är 0 och alla andra svar
   består redan innan definitionen sparas.

**Förväntat resultat:**

- Avsnittens ordning och fältens placering följer det privata utkastet.
  Förslagen sparas tillsammans; omstart förlorar inga dolda svar.
- Återvisning behåller samma fältidentiteter och tidigare värden.
  Noll, Nej och obesvarat förblir skilda.
- Fokus går att följa och kontrollerna är nåbara vid den valda bredden.
  Temabyte och intern rullning bevarar pågående redigering.

## Mobilens native formulär

### STY-09: Mobilens fältformulär behåller svar och återfokus

**Syfte:** Kontrollera mobil navigation, tangentbordsfält, rullning och
återfokus utan att upprepa hela spara- och omstartskedjan.

**Användare:** Alex.

**Förutsättningar:** Cykeln och Garaget finns i utkastet med olika objekttyper.
Använd webbläsarvy 390 × 1000 för mobil navigation och formulärets
rullning och fokus.

**Integrationstest:**
[relationship-fields.spec.ts](../../tests/integration/relationship-fields.spec.ts),
STY-09, native mobilreferens vid 390 × 1000.

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/relationship-fields.spec.ts",
    "caseId": "STY-09"
  },
  "reference": "390 × 1000; mobil navigation, fält, rullning och fokus",
  "outcomes": [
    "Mobilens fältformulär behåller svar och återfokus"
  ]
}
```

**Steg:**

1. Öppna Inställningar och Välj inställning. Välj Typer och egna fält
   och Ny sambandstyp. Ange Förvaring, beskrivningen Var saker finns
   och benämningarna förvaras i och innehåller.
2. Lägg till Anteckning som Text, Belopp som Tal, Startdatum som Datum
   samt Bekräftat och Obesvarat som Ja/nej. Kontrollera att fokus hamnar
   på det nya fältets namn. Lägg definitionen i utkastet.
3. Skapa ett samband från Cykeln till Garaget med Förvaring. Ange
   Låst skåp, 0, 2026-09-27 och Nej. Lämna Obesvarat utan svar.
4. Prova Tab genom de egna fälten till Obesvarat. Rulla fram
   Lägg i utkastet och skicka med Enter. Stäng sambandet och läs
   det fullständiga förslaget i
   Utkastet. Kontrollera Låst skåp och Nej. Stäng läsningen och textvyn.
5. Öppna Samband för Cykeln och Redigera samband. Kontrollera 0, Nej och
   obesvarat. Ändra Anteckning till Övre hyllan, lägg i utkastet och stäng.
   Kontrollera återfokus på Samband för Cykeln. Spara inte hela utkastet.

**Förväntat resultat:**

- Mobilens Välj inställning ger åtkomst till Typer och egna fält.
  Nya fält får fokus och de sista fälten och åtgärderna kan rullas fram.
- Förslaget och rättelsen behåller 0, Nej och obesvarat som olika svar.
  Återfokus går till sambandsknappen; uppgifterna är fortfarande i utkastet.
- Hela sparandet och omstarten provas separat i STY-06.

### STY-10: Avsnitt bevarar dolda svar och privata definitioner

**Syfte:** Ordna sambandens formulär utan att ändra fältidentitet eller svar.

**Användare:** Alex.

**Förutsättningar:** Cykeln och Garaget finns i hushållets karta eller utkast.
Använd webbläsarvy 390 × 1000 med minskad rörelse.
Syftet är mobil navigation och intern rullning.

**Integrationstest:**
[relationship-sections.spec.ts](../../tests/integration/relationship-sections.spec.ts),
STY-10, native referens vid 390 × 1000.

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/relationship-sections.spec.ts",
    "caseId": "STY-10"
  },
  "reference": "390 × 1000; avsnitt, dolda svar, båda teman och fokus",
  "outcomes": [
    "Avsnitt bevarar dolda svar och privata definitioner"
  ]
}
```

**Steg:**

1. Öppna Inställningar och Välj inställning → Typer och egna fält.
   Välj Ny sambandstyp. Ange Förvaring och benämningarna förvaras i och
   innehåller.
2. Namnge avsnitten Uppgifter och Service. Flytta Service upp med
   tangentbordet och kontrollera att fokus följer avsnittet.
3. Lägg till Leverantör som Text, Effekt som Tal, Datum som Datum samt
   Batteri och Reserv som Ja/nej. Placera dem i Uppgifter. Kontrollera
   läsbarhet och åtkomliga kontroller i ljust och mörkt tema.
4. Lägg definitionen i utkastet. Skapa sambandet Cykeln → Förvaring →
   Garaget med svaren Exempelsol, 0, 2026-09-01 och Nej. Lämna Reserv
   obesvarat och lägg sambandet i utkastet.
5. Ändra definitionen i Inställningar. Dölj Effekt och flytta Leverantör
   till Service. Lägg förslaget i utkastet; spara inte hela utkastet.
6. Välj Tillbaka till kartan. Öppna sambandet för redigering. Effekt ska
   vara dolt, Batteri ska vara Nej och Reserv obesvarat. Rulla fram
   Avbryt redigeringen, kontrollera fokus och att åtgärden ryms i vyn.
   Välj den och stäng sambandsdialogen med krysset.
7. Ändra definitionen igen och visa Effekt i Service. Lägg den i utkastet
   och öppna sambandet. Kontrollera att Effekt är 0 och alla andra svar
   består medan hela definitionen fortfarande ligger i utkastet.

**Förväntat resultat:**

- Avsnittens ordning och fältens placering följer det privata utkastet.
  Dolda svar behålls under den privata definitionens ändringar.
- Återvisning behåller samma fältidentiteter och tidigare värden.
  Noll, Nej och obesvarat förblir skilda.
- Fokus går att följa och kontrollerna är nåbara vid den valda bredden.
  Temabyte och intern rullning bevarar pågående redigering.

### STY-11: Avsnitt bevarar dolda svar och privata definitioner

**Syfte:** Ordna sambandens formulär utan att ändra fältidentitet eller svar.

**Användare:** Alex.

**Förutsättningar:** Cykeln och Garaget finns i hushållets karta eller utkast.
Använd webbläsarvy 320 × 1000 med minskad rörelse.
Syftet är smalt omflöde och nåbara sista åtgärder.

**Integrationstest:**
[relationship-sections.spec.ts](../../tests/integration/relationship-sections.spec.ts),
STY-11, native referens vid 320 × 1000.

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/relationship-sections.spec.ts",
    "caseId": "STY-11"
  },
  "reference": "320 × 1000; smalt omflöde, båda teman och fokus",
  "outcomes": [
    "Avsnitt bevarar dolda svar och privata definitioner"
  ]
}
```

**Steg:**

1. Öppna Inställningar och Välj inställning → Typer och egna fält.
   Välj Ny sambandstyp. Ange Förvaring och benämningarna förvaras i och
   innehåller.
2. Namnge avsnitten Uppgifter och Service. Flytta Service upp med
   tangentbordet och kontrollera att fokus följer avsnittet.
3. Lägg till Leverantör som Text, Effekt som Tal, Datum som Datum samt
   Batteri och Reserv som Ja/nej. Placera dem i Uppgifter. Kontrollera
   läsbarhet och åtkomliga kontroller i ljust och mörkt tema.
4. Lägg definitionen i utkastet. Skapa sambandet Cykeln → Förvaring →
   Garaget med svaren Exempelsol, 0, 2026-09-01 och Nej. Lämna Reserv
   obesvarat och lägg sambandet i utkastet.
5. Ändra definitionen i Inställningar. Dölj Effekt och flytta Leverantör
   till Service. Lägg förslaget i utkastet; spara inte hela utkastet.
6. Välj Tillbaka till kartan. Öppna sambandet för redigering. Effekt ska
   vara dolt, Batteri ska vara Nej och Reserv obesvarat. Rulla fram
   Avbryt redigeringen, kontrollera fokus och att åtgärden ryms i vyn.
   Välj den och stäng sambandsdialogen med krysset.
7. Ändra definitionen igen och visa Effekt i Service. Lägg den i utkastet
   och öppna sambandet. Kontrollera att Effekt är 0 och alla andra svar
   består medan hela definitionen fortfarande ligger i utkastet.

**Förväntat resultat:**

- Avsnittens ordning och fältens placering följer det privata utkastet.
  Dolda svar behålls under den privata definitionens ändringar.
- Återvisning behåller samma fältidentiteter och tidigare värden.
  Noll, Nej och obesvarat förblir skilda.
- Fokus går att följa och kontrollerna är nåbara vid den valda bredden.
  Temabyte och intern rullning bevarar pågående redigering.

## Täckningens gräns

Den kompletta kedjan definition → samband → rättelse → spara → omstart
provas vid 1440px i STY-06 och STY-08. Mobilfallen STY-09–11 behåller
inställningsnavigation, tangentbordsfält, avsnittsordning, dolda värden,
rullning, teman och fokus vid sina angivna bredder. Ett fel i den kombinerade
spara- och omstartskedjan som bara inträffar vid 390 eller 320px kan undgå
referensen; mobilfallen påstår inte likvärdig beständighet vid alla bredder.
STY-07 behåller typbyte mellan lika fältnamn med olika betydelse.
Inga befintliga fallidentiteter pensioneras eller återanvänds.

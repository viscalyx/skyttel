# Manuella testfall för kartans bakgrunder

Testfallen är för den som verifierar personliga bakgrundsval i den vanliga
rymdkartan. Anteckna commit, webbläsare, skärmstorlek och resultat.
Bildgranskning i Chromium är separat från prov på fysisk GPU eller mobil.

## Konfigurerade användare

Alex Exempel har tillgång till ett isolerat provhushåll. Använd samma konto
i två webbläsarprofiler för att kontrollera återläsning på annan klient.
Alla uppgifter ska vara påhittade.

## Allmän förberedelse

1. Starta en isolerad installation enligt
   [provförberedelsen](../development/devcontainer.md#disposable-local-database).
2. Skapa och spara 16 objekt med namn **Provobjekt 00** till **Provobjekt
   15**, olika objekttyper och samband mellan dem. Aktivera **Alla
   etiketter** för BAKGRUND-01–03. Använd ett separat hushåll med 80 objekt,
   **Provobjekt 00** till **Provobjekt 79**, för jämförelsen av en tät
   karta. Beskrivningen
   kan vara **Påhittat underlag för bakgrundsbedömning.** Återställ inte
   personliga val mellan återläsningarna inom samma fall.
3. Använd datorvy 1440 × 960 och smal vy 390 × 844. Öppna **Karta**.
   Jämför fria kartvyer samt vyer med **Navigera** och ett objekts
   egenskapsfönster öppna. Bedöm ikoner, samband, etiketter, urval och
   kontroller mot det godkända uttrycket: blårosa moln och ljusa öppningar
   för Gryningsdis; stjärnor, galaxer, nebulosor, stoft, stjärnhopar och en
   gles ringform för Universum. Bildresultatet ska vara lugnt utan egen
   animation. Automatiken dokumenterar bilder; den fastställer inte
   fullständig tillgänglighet eller prestanda på fysisk hårdvara.
4. I kartan med 16 objekt: välj ett objekt, öppna **Navigera** och flytta
   objektet uppåt i din personliga vy. Rotera åt vänster, panorera åt höger
   och stäng navigeringen innan du byter bakgrund. Det ger en sparad
   placering och en egen kameravy att kontrollera vid bytena.

Kartan med 80 objekt och **Alla etiketter** aktiverat är ett stressprov.
Etiketter och markörer kan överlappa, särskilt i den smala vyn. Anteckna
trängseln separat från bakgrundens färger och motiv. Öppna det valda
objektets uppgifter med tangentbordsmenyn för att läsa hela innehållet.
De automatiska bilderna döljer inte denna begränsning och bevisar inte att
alla etiketter går att läsa samtidigt.

## Personliga val

### BAKGRUND-01: Gryningsdis följer ljust tema och återläses

**Syfte:** Verifiera ett synligt personligt val utan att ändra kartan.

**Användare:** Alex Exempel i två klienter.

**Förutsättningar:** Kartan med 16 objekt och ljust systemtema.

**Automatiskt motsvarande test:**
[background-appearance.spec.ts](../../tests/integration/background-appearance.spec.ts),
BAKGRUND-01. Provet använder riktig app, scen och isolerad SQLite, inklusive
serveromstart och en andra klient.

<!-- markdownlint-disable MD013 -->
<!--
```manual-mapping
{
  "counterpart": {
    "runner": "playwright",
    "suite": "integration",
    "spec": "tests/integration/background-appearance.spec.ts",
    "caseId": "BAKGRUND-01"
  },
  "reference": "Chromium, ljust systemtema: 16/80 objekt prövar luftig/tät karta, 1440/390 px prövar dator/omflöde, öppna paneler prövar läsbarhet; två klienter prövar beständighet.",
  "outcomes": [
    "Gryningsdis syns och kan endast väljas för ljust tema.",
    "Valet återläses efter omstart och i annan klient.",
    "Kamera, placeringar och övriga inställningar bevaras."
  ]
}
```
-->
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **Inställningar → Rymdkartan** och välj **Gryningsdis** under
   **Bakgrund i ljust tema**. Kontrollera att det andra temats val består.
2. Återgå med **Tillbaka till kartan**. Kontrollera blårosa dis med ljusa
   öppningar och markera ett objekt genom dess synliga markör.
3. Växla systemtema till mörkt. Kontrollera att mörka temats tidigare
   bakgrund visas. Växla tillbaka och kontrollera samma kameravy.
4. Ladda om, starta om servern och öppna samma hushåll i den andra klienten.
   Läs bakgrundsvalet i inställningarna.
5. Jämför 16 och 80 objekt i datorvy och smal vy. Öppna ett objekts
   egenskapsfönster: fokusera markören, tryck Skift+F10 och välj **Visa
   uppgifter för Provobjekt 00**. Stäng det och öppna
   **Navigera**. Rotera åt vänster och luta uppåt. Granska de ljusa
   öppningarna, etiketterna och kontrollerna i de olika kamerariktningarna.

**Förväntat resultat:**

- Gryningsdis finns endast i den ljusa väljaren och har inga mörka
  stjärnprickar. Kartans markörer kan fortfarande väljas.
- Valet består efter omladdning, serveromstart och på den andra klienten.
- Kamerans utsnitt, objektplaceringar och övriga personliga val består.

### BAKGRUND-02: Universum följer mörkt tema och återläses

**Syfte:** Verifiera en läsbar stjärnhimmel som ett beständigt personligt val.

**Användare:** Alex Exempel i två klienter.

**Förutsättningar:** Kartan med 16 objekt och mörkt systemtema.

**Automatiskt motsvarande test:**
[background-appearance.spec.ts](../../tests/integration/background-appearance.spec.ts),
BAKGRUND-02. Provet använder riktig app, scen och isolerad SQLite, inklusive
serveromstart och en andra klient. Bilder av 16/80 objekt i båda bredderna
ger underlag för visuell jämförelse; motivens igenkänning granskas av
människan.

<!-- markdownlint-disable MD013 -->
<!--
```manual-mapping
{
  "counterpart": {
    "runner": "playwright",
    "suite": "integration",
    "spec": "tests/integration/background-appearance.spec.ts",
    "caseId": "BAKGRUND-02"
  },
  "reference": "Chromium, mörkt systemtema: 16/80 objekt prövar luftig/tät karta, 1440/390 px prövar dator/omflöde, öppna paneler prövar läsbarhet; två klienter prövar beständighet.",
  "outcomes": [
    "Universum syns och kan endast väljas för mörkt tema.",
    "Valet återläses efter omstart och i annan klient.",
    "Kamera, placeringar och övriga inställningar bevaras."
  ]
}
```
-->
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **Inställningar → Rymdkartan** och välj **Universum** under
   **Bakgrund i mörkt tema**. Kontrollera att det ljusa temats val består.
2. Återgå med **Tillbaka till kartan** och markera ett objekt. Kontrollera
   stjärnhimlen med galaxer, nebulosor, stoft, stjärnhopar och en gles
   ringform runt den lugna ytan bakom hushållsinformationen.
3. Växla systemtema till ljust. Kontrollera det ljusa temats tidigare
   bakgrund. Växla tillbaka och kontrollera samma kameravy.
4. Ladda om, starta om servern och öppna samma hushåll i den andra klienten.
   Läs bakgrundsvalet i inställningarna.
5. Jämför 16 och 80 objekt i datorvy och smal vy. Öppna ett objekts
   egenskapsfönster: fokusera markören, tryck Skift+F10 och välj **Visa
   uppgifter för Provobjekt 00**. Stäng det och öppna
   **Navigera**. Rotera åt vänster och luta uppåt. Granska motiv, urval,
   samband, etiketter och kontroller från de olika kamerariktningarna.

**Förväntat resultat:**

- Universum finns endast i den mörka väljaren. Markörer kan väljas genom
  bakgrunden och öppna egenskapsfönster visar objektets uppgifter.
- Stjärnhimlen har ingen egen animation, puls eller blinkning.
- Valet består efter omladdning, serveromstart och på den andra klienten.
- Kamerans utsnitt, objektplaceringar och övriga personliga val består.

## Under världshavet

### BAKGRUND-03: Ljust hav, navigering och sparade val

**Syfte:** Spara ljust Under världshavet och behålla kartarbete vid
navigering, temabyte, omladdning, omstart och användning på en andra klient.

**Användare:** Den inloggade användaren från förberedelsen.

**Förutsättningar:** Börja med 16 objekt och 1440 × 960 CSS-pixlar.
Behåll **Alla etiketter** aktiverat. Flytta ett objekt i din personliga vy,
markera det och panorera kameran före bakgrundsbytet. Prova sedan läsning
med 16 respektive 80 objekt vid 1440 respektive 390 pixlars bredd.
Datorvyn provar den stora kartytan; den smala vyn provar åtkomliga
objektuppgifter när paneler och etiketter trängs.

**Automatiskt motsvarande test:**
[background-ocean.spec.ts](../../tests/integration/background-ocean.spec.ts),
BAKGRUND-03, använder riktig app, SQLite, omstart och två klienter.
[background-rendering.test.tsx](../../tests/browser/background-rendering.test.tsx)
ger separat tekniskt underlag för havets färger, riktningar och stillhet.
Bildmätningarna körs en gång per tema och bredd. De ersätter inte en
mänsklig bedömning av motivens former eller prov på fysisk grafikhårdvara.

<!--
```manual-mapping
{
  "counterpart": {
    "runner": "playwright",
    "suite": "integration",
    "spec": "tests/integration/background-ocean.spec.ts",
    "caseId": "BAKGRUND-03"
  },
  "reference": "Ljust hav, Alla etiketter, 16/80 objekt, 1440/390 px, två klienter.",
  "outcomes": [
    "Valet återkommer efter omladdning, omstart och på en andra klient.",
    "Temabyte bevarar båda bakgrundsvalen, markering och objektplaceringar.",
    "Navigering och läsning av objekt fungerar över bakgrunden."
  ],
  "evidence": [{
    "kind": "technical",
    "runner": "vitest",
    "suite": "browser",
    "spec": "tests/browser/background-rendering.test.tsx",
    "title": "ocean stillness, direction and theme isolation: light, 1440px",
    "purpose": "Separata pixelprov av sand, yta, stillhet och temabyte."
  }]
}
```
-->

**Steg:**

1. Öppna **Inställningar → Rymdkartan**. Välj **Under världshavet** i
   **Bakgrund i ljust tema** med tangentbordet. Kontrollera sparbeskedet,
   bevarat fokus och att det mörka bakgrundsvalet finns kvar.
2. Återgå till kartan. Kontrollera bevarad markering, kamera och
   objektplacering. Öppna **Navigera**. Prova lutning uppåt och nedåt,
   rotation vänster och höger, panorering höger och zoom in. Stäng panelen.
3. Byt till mörkt tema. Kartans utsnitt ska vara kvar. Öppna inställningarna
   och kontrollera att båda bakgrundsvalen finns kvar. Återgå till kartan
   och byt tillbaka till ljust tema.
4. Låt provinstallationen starta om och öppna hushållet igen. Kontrollera
   havsvalet i inställningarna. Öppna hushållet på den andra klienten och
   kontrollera samma val och **Alla etiketter**.
5. Med 16 och sedan 80 objekt, prova 1440 × 960 och 390 × 844. Ladda om,
   öppna kartan och kontrollera etikettvalet. Fokusera Provobjekt 00,
   tryck **Skift+F10**, välj **Visa uppgifter för Provobjekt 00** och
   stäng uppgifterna. Objektet ska gå att läsa vid varje kombination.

**Förväntat resultat:**

- Valet sparas för användaren i hushållet, oberoende för ljust och mörkt tema.
- Omstart, omladdning och en andra klient bevarar val och objektplaceringar.
- Fokus och sparbesked fungerar. Kartans reglage och objektuppgifter är
  åtkomliga även i den smala vyn. Överlappande etiketter innebär inte att
  alla objekt har fria pekytor; tangentbordsvägen provas uttryckligen.

### BAKGRUND-04: Mörkt hav, navigering och sparade val

**Syfte:** Spara mörkt Under världshavet med automatiska etiketter och
behålla arbete över samma navigerings- och återöppningsgränser.

**Användare:** Den inloggade användaren från förberedelsen.

**Förutsättningar:** Samma provdata och storlekar som BAKGRUND-03, men
mörkt tema och **Alla etiketter** avstängt.

**Automatiskt motsvarande test:**
[background-ocean.spec.ts](../../tests/integration/background-ocean.spec.ts),
BAKGRUND-04. Separata tekniska renderingsprov kontrollerar hela mörka
havsbildens stillhet och förändring vid fyra kamerariktningar.
De identifierar inte djurens former eller bevisar fri pekyta för varje objekt.

<!--
```manual-mapping
{
  "counterpart": {
    "runner": "playwright",
    "suite": "integration",
    "spec": "tests/integration/background-ocean.spec.ts",
    "caseId": "BAKGRUND-04"
  },
  "reference": "Mörkt hav, 16/80 objekt, 1440/390 px, två klienter.",
  "outcomes": [
    "Valet återkommer efter omladdning, omstart och på en andra klient.",
    "Temabyte bevarar båda bakgrundsvalen, markering och objektplaceringar.",
    "Navigering och läsning av objekt fungerar över bakgrunden."
  ],
  "evidence": [{
    "kind": "technical",
    "runner": "vitest",
    "suite": "browser",
    "spec": "tests/browser/background-rendering.test.tsx",
    "title": "ocean stillness, direction and theme isolation: dark, 1440px",
    "purpose": "Separata pixelprov av stillhet, kamerariktningar och temabyte."
  }]
}
```
-->

**Steg:**

1. Följ BAKGRUND-03 steg 1–5 med **Bakgrund i mörkt tema** och
   **Alla etiketter** avstängt. Byt till ljust tema vid temakontrollen
   och återgå sedan till mörkt.
2. Kontrollera det ljusa bakgrundsvalet separat. Bekräfta på båda klienterna
   att automatisk etikettvisning gäller även efter omstart.

**Förväntat resultat:**

- Samma beständighet, fokus, navigering och objektläsning som BAKGRUND-03.
- Det mörka havsvalet skriver inte över det ljusa valet.
- Automatisk etikettvisning består över omladdning och klientbyte.

### BAKGRUND-09: Känna igen havets motiv och deras riktningar

**Syfte:** Bedöma motivens igenkännbara former separat från sparande och
numeriska pixelprov i BAKGRUND-03/04.

**Användare:** Den inloggade användaren från den allmänna förberedelsen.

**Förutsättningar:** Under världshavet i båda teman, 16 och 80 provobjekt
vid 1440 × 960 och 390 × 844 CSS-pixlar. Använd Alla etiketter i ljust tema
och automatisk etikettvisning i mörkt tema.

**Kräver mänsklig observation:** Känn igen sandbotten, vattenyta och de sex
djurlivsformerna. Numerisk färgskillnad eller en ändrad bild visar inte att
ett djur går att känna igen. Bedöm även hur paneler och etiketter skymmer
motiven; notera brister utan att tolka tangentbordsåtkomst som fri pekyta.

<!--
```manual-mapping
{
  "humanObservation": {
    "kind": "visual-symbol-recognition",
    "observation": "Känn igen sand, vattenyta och sex djurformer."
  },
  "reference": "Ljust/mörkt hav, 16/80 objekt, 1440/390 px.",
  "outcomes": [
    "Sandbotten och vattenyta skiljs från mellanlägets vatten.",
    "Alla sex djurlivsformer går att känna igen genom kameranavigering.",
    "Överlappning och dolda motiv redovisas separat."
  ]
}
```
-->

**Steg:**

1. Öppna Navigera i ljust tema. Luta uppåt sex gånger, sedan nedåt tolv
   gånger och tillbaka uppåt sex gånger. Granska sandbotten, vattenyta och
   mellanlägets vatten. Ljusmönstren ska följa sand och yta utan spiral.
2. Byt till mörkt tema. Rotera åt båda hållen och luta uppåt och nedåt.
   Granska kronmanet, sifonofor, lanternfish, vampyrbläckfisk,
   musselkräftors ljusspår och djuphavsmarulk med lysande lockbete.
3. Stäng navigeringen mellan riktningarna och låt kameran stå still.
   Motivet ska inte simma, pulsera, blinka eller fortsätta röra sig.
4. Upprepa med respektive kartstorlek och bredd. Öppna objektuppgifter
   växelvis med navigering och anteckna skymda former och etiketter.

**Förväntat resultat:**

- Ljust hav har sand nedanför, vattenyta ovanför och vatten däremellan.
- Mörkt hav innehåller alla sex former tillsammans; kamerans riktning
  avgör vilka som syns. Stillastående kamera ger stillastående motiv.
- Brister i igenkänning och överlappning redovisas per konfiguration.

BAKGRUND-09 skiljer ut den mänskliga bildbedömningen från BAKGRUND-03/04.
De två ursprungliga ID:na behåller sina automatiserade spar- och läsflöden.

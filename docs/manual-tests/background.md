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
   etiketter**. Använd ett separat hushåll med 80 objekt, **Provobjekt 00**
   till **Provobjekt 79**, för jämförelsen av en tät karta. Beskrivningen
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

**Syfte:** Kontrollera att ljust Under världshavet har sand nedanför
kameran, vattenyta ovanför och vatten däremellan, och att valet sparas.

**Användare:** Den inloggade användaren från förberedelsen.

**Förutsättningar:** Prova båda kartstorlekarna i datorvy och smal vy.
Öppna navigeringspanelen och ett objekts uppgifter växelvis under
granskningen.
Flytta ett objekt i din personliga vy, markera det och panorera kameran
innan du ändrar bakgrundsvalet.

**Automatiskt motsvarande test (integration):**
[background-ocean.spec.ts](../../tests/integration/background-ocean.spec.ts),
BAKGRUND-03. Provet använder riktig app, scen och isolerad SQLite-databas.
De sparade inställningarna kontrolleras även efter omstart och i en andra
webbläsare. Bilderna är underlag för visuell granskning, inte ett intyg om
prestanda på fysisk grafikhårdvara eller fullständig tillgänglighet.

**Känd begränsning i provunderlaget:** I det syntetiska 80-objektsprovet
vid 390 px överlappar Havsobjekt 1 pekytan för Havsobjekt 0. Provet öppnar
därför uppgifter via tangentbordets snabbmeny. Dolda etiketter och denna
överlappning ska redovisas vid läsbarhetsbedömningen; tangentbordsvägen
bevisar inte att alla objekt har en fri pekyta.

<!--
```manual-mapping
{
  "counterpart": {
    "runner": "playwright",
    "suite": "integration",
    "spec": "tests/integration/background-ocean.spec.ts",
    "caseId": "BAKGRUND-03"
  },
  "reference": "Ljust hav, 16/80 objekt, dator/smal, tre vyer, två klienter.",
  "outcomes": [
    "Ljust hav återkommer efter omladdning och i en annan webbläsare.",
    "Vanlig navigering visar sand nedanför, yta ovanför och vatten mellan dem.",
    "Temabyte bevarar båda bakgrundsvalen och objektplaceringar.",
    "Bakgrunden hindrar inte kartans navigering eller val av objekt."
  ]
}
```
-->

**Steg:**

1. Öppna **Inställningar → Rymdkartan**. Välj **Under världshavet** i
   **Bakgrund i ljust tema** med tangentbordet. Kontrollera sparbeskedet
   och att fokus stannar på väljaren.
2. Gå tillbaka till kartan. Kontrollera att kamera, markering och
   objektplaceringar finns kvar. Öppna **Navigera**.
3. Prova **Luta uppåt** och **Luta nedåt** för att se sandbotten,
   vattenytan och mellanläget. Prova även panorering och zoom.
4. Välj ett objekt och öppna dess uppgifter. I täta vyer kan du fokusera
   objektet med tangentbordet, trycka **Skift+F10** och välja
   **Visa uppgifter**. Kontrollera objekt, samband,
   etiketter, markering och kontroller i alla tre kamerariktningarna.
   Upprepa med 16 och 80 objekt i datorvy och smal vy.
5. Växla till mörkt tema och tillbaka. Kontrollera att det mörka valet
   och den personliga placeringen bevaras och att ljust hav återkommer.
6. Ladda om sidan och öppna samma hushåll i den andra webbläsaren.
   Kontrollera att **Under världshavet** finns kvar i den ljusa väljaren.

**Förväntat resultat:**

- Sanden finns nedanför kameran och vattenytan ovanför. Vattnet skiljer
  planen åt. Ljusmönstren följer sand och yta utan spiral eller centrum.
- Bakgrunden står still när kameran står still. Kartans vanliga reglage
  fungerar och innehållet går att läsa över bakgrunden.
- Anteckna överlappande objekt och dolda etiketter i täta vyer. Att öppna
  uppgifter med tangentbordet visar inte att alla pekytor är fria.
- Valet sparas för användaren i hushållet. Byten flyttar inte kartan eller
  objekten. Sparbesked och tangentbordsfokus fungerar.

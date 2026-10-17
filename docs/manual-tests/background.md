# Manuella testfall för bakgrunder

Testfallen hjälper testare att kontrollera den dekorativa miljön i
rymdkartan. Anteckna commit, webbläsare och resultat vid körning.

## Konfigurerade användare

Använd en inloggad Skyttel-användare med tillgång till ett provhushåll.
Använd samma konto i en andra webbläsare för att kontrollera sparade val.

## Allmän förberedelse

1. Använd en testinstallation med påhittade hushållsuppgifter. Förbered
   kartor med 16 respektive 80 objekt och samband mellan objekten.
2. Kör i datorvy och smal vy. Börja med ljust tema och synlig bakgrund.
   Behåll kartan mellan vybyten; återställ bakgrundsvalen efter provet.

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

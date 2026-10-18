# Manuella testfall för fria egenskaper

Fallen gäller objektets fria egenskaper genom redigering, ditt utkast och
samlat sparande. Anteckna commit, webbläsare och resultat vid körning.

## Konfigurerade användare

Använd en inloggad Skyttel-användare i ett syntetiskt hushåll. Följ
[installationsguiden](../operations/installation.md) för miljön.
Använd inga verkliga hushållsuppgifter.

## Allmän förberedelse

1. Starta en separat testinstallation enligt
   [installationsguiden](../operations/installation.md). Skapa ett tomt
   hushåll. Börja varje fall med en ny testdatabas.
2. Öppna hushållet. **Nytt objekt** öppnar objektformuläret.
   **Tabell → Redigera [namn]** öppnar ett befintligt objekt.
3. **Skriv till Skyttel → Visa utkastet** öppnar utkastvyn.
   **Visa förslaget: [namn]** visar hela förslaget.
   Stäng förslaget och välj **Spara hela utkastet** för samlat sparande.
4. Behåll databasen vid omstart inom fallet. Stäng textvyn efter sparandet.

## Redigering och beständighet

### EGENSKAP-01: redigera, ordna och rätta egenskaper på dator

**Syfte:** Bevara separata egenskaper med samma etikett, ogiltig inmatning
och skillnaden mellan tömning och borttagning.

**Användare:** Den inloggade Skyttel-användaren.

**Förutsättningar:** Fönsterbredd 1440 bildpunkter, tomt hushåll och
testinstallation som kan startas om med samma databas.

**Automatiskt motsvarande test:**
[free-object-properties.spec.ts](../../tests/integration/free-object-properties.spec.ts),
EGENSKAP-01. Provet använder riktiga formulär, HTTP och SQLite.

<!-- markdownlint-disable MD013 -->
<!--
```manual-mapping
{
  "counterpart": {
    "runner": "playwright",
    "suite": "integration",
    "spec": "tests/integration/free-object-properties.spec.ts",
    "caseId": "EGENSKAP-01"
  },
  "reference": "Chromium, 1440 × 900, syntetiskt hushåll. Felaktigt tal efter datatypbyte skyddar inmatning och utkast; upprepade etiketter skyddar oberoende redigering.",
  "outcomes": [
    "Fel bevarar inmatning och lämnar utkastet orört.",
    "Tangentbordets ordningsknappar bevarar Nej och noll genom sparande och omstart.",
    "Tömning behåller etikett och datatyp; separat borttagning och objekttypbyte påverkar endast avsedda uppgifter."
  ],
  "evidence": [
    {
      "kind": "technical",
      "runner": "vitest",
      "suite": "server",
      "spec": "tests/unit/server/object-properties-http.test.ts",
      "title": "ordered independent properties survive draft, atomic receipt and SQLite restart without label side effects",
      "purpose": "Verifierar mer än 100 egenskaper, alla datatyper, tomt med och utan datatyp, tom text, historik, identiteter och frånvaro av etikettstyrda bieffekter genom publik HTTP."
    },
    {
      "kind": "technical",
      "runner": "vitest",
      "suite": "server",
      "spec": "tests/unit/server/assistant-work.test.ts",
      "title": "MCP allocates property identities and edits, clears, removes and orders the returned identities",
      "purpose": "Verifierar samma ordning, separata identiteter, rättelse och tömning genom den gemensamma MCP-ingången."
    }
  ]
}
```
-->
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Välj **Nytt objekt**, ange **Egenskapscykeln** som namn och öppna
   **Fria egenskaper**. Välj **Lägg till egenskap**. Kontrollera fokus på
   **Etikett**.
2. Ange etiketten **Pris**, datatypen **Text** och värdet **Gratis idag**.
   Byt datatyp till **Tal** och välj **Lägg i utkastet och stäng**.
   Kontrollera felsammanfattning, bevarad text och att inget läggs i utkastet.
3. Rätta värdet till **0**. Lägg till en andra egenskap med etiketten
   **Pris**, datatypen **Ja/nej** och värdet **Nej**.
4. Fokusera den andra egenskapens **Flytta upp** och tryck Enter.
   Kontrollera ordningsbeskedet och fokus på den flyttade postens etikett.
   Lägg till **Beskrivning** som Text med **Egen anteckning**, **Slutdatum**
   som Datum med **2000-01-01**, **Tomt tal** som Tal utan värde och
   **Tomt utan datatyp** utan datatyp eller värde. Lägg i utkastet och stäng.
5. Öppna förslaget i utkastvyn. Kontrollera **Nej** före **0**,
   anteckningen, datumet och båda tomma egenskaperna.
   Stäng förslaget, spara hela utkastet, starta om servern med samma
   databas och ladda om sidan.
6. Öppna objektets redigering och **Fria egenskaper**. Kontrollera samma
   ordning och värden. Byt första egenskapens datatyp till **Tal** utan att
   ändra värdet. Försök lägga i utkastet och kontrollera felet. Tryck Escape,
   välj **Fortsätt redigera** och kontrollera att texten **false** finns kvar.
   Byt tillbaka till **Ja/nej** och välj första egenskapens **Töm värdet**.
   Kontrollera etiketten **Pris** och datatypen **Ja/nej**, med tomt värde.
7. Välj andra egenskapens **Ta bort egenskapen**. Öppna
   **Grunduppgifter**, byt objekttyp och lägg ändringen i utkastet.
   Öppna redigeringen igen och kontrollera den kvarvarande tomma egenskapen.

**Förväntat resultat:**

- Fel visas och får fokus utan att inmatning går förlorad.
- Upprepade etiketter behåller sina separata värden och den valda ordningen.
- Sparat och föreslaget innehåll är åtskilda. Omstart bevarar sparade värden.
- Tömning bevarar egenskapen; borttagning tar endast bort den valda posten.
  Objekttypbyte bevarar den kvarvarande egenskapen.

### EGENSKAP-02: samma redigering och omstart på mobil

**Syfte:** Utför samma fullständiga egenskapsarbete vid smal skärmbredd.

**Användare:** Den inloggade Skyttel-användaren.

**Förutsättningar:** Fönsterbredd 320 bildpunkter, höjd 900 bildpunkter.
Använd ett tomt syntetiskt hushåll och samma omstartsförberedelse som ovan.

**Automatiskt motsvarande test:**
[free-object-properties.spec.ts](../../tests/integration/free-object-properties.spec.ts),
EGENSKAP-02. Provet använder riktig server och SQLite.

<!-- markdownlint-disable MD013 -->
<!--
```manual-mapping
{
  "counterpart": {
    "runner": "playwright",
    "suite": "integration",
    "spec": "tests/integration/free-object-properties.spec.ts",
    "caseId": "EGENSKAP-02"
  },
  "reference": "Chromium, 320 × 900, syntetiskt hushåll; samma avgränsade fel och egenskaper som datorfallet.",
  "outcomes": [
    "Alla egenskapskontroller, fel och sparåtgärder kan användas vid smal skärmbredd.",
    "Ordning och Nej respektive noll bevaras genom utkast, sparande och omstart."
  ]
}
```
-->
<!-- markdownlint-enable MD013 -->

**Steg:** Utför steg 1–7 i EGENSKAP-01 vid den angivna smala bredden.

**Förväntat resultat:** Samma innehåll och återfokus som i datorfallet.
Kontrollerna kan nås utan dragning och utan horisontell sidrullning.

Automatiska prov verifierar semantiska namn, tangentbordsordning,
fokus, fel, status och formulärarbete i Chromium. Verklig uppläsning med
skärmläsare, förstoring och fysisk mobilinmatning behöver fortfarande
mänsklig observation; dessa prov fastställer inte fullständig överensstämmelse.

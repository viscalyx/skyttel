# Manuella testfall för stora kartor

Testfallet gäller sökning, sidvisning, fokus och redigering i en karta med
500 objekt och 1 500 samband. Anteckna commit, webbläsare och godkänt eller
underkänt resultat vid körning. Tidsmätning och etikettgeometri provas separat
enligt [mätplanen](large-map-performance.md).

## Konfigurerade användare

Den tillfälliga installationen använder **Alex Exempel** som administratör.
Välj Google vid inloggning. Identitetsleverantören är en ersättare i
testmiljön; inga verkliga inloggningsuppgifter behövs.

## Allmän förberedelse

Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor) när
fallen anger formulär, samtal, profil eller administration.

Välj **Tabell** för alla objekt, även när grafiken inte fungerar. Namnet
expanderar fullständiga uppgifter; **Redigera [namn]** öppnar det vanliga
objektformuläret. **Samband för [namn]** öppnar alla objektets samband,
inklusive ofullständiga och upphörda. Läsning ändrar inte informationen.

1. Installera projektets beroenden och Chromium enligt
   [utvecklingsguiden](../development/devcontainer.md#prepare-and-start).
2. Kör `MAP_PAUSE=1 npm run measure:map` i utvecklingsmiljön. Öppna den
   lokala adress som skrivs ut. Vid användning av värddatorns webbläsare,
   vidarebefordra den utskrivna porten från devcontainern. Logga in.
3. Låt kommandot vänta under provet. Det skapar en separat tillfällig
   databas med enbart påhittade uppgifter. Starta om kommandot för ett nytt
   prov. Använd inte den ändrade databasen för jämförande tidsmätning.

## Hitta och redigera

### STORKARTA-01: hela innehållet är åtkomligt i en tät karta

**Syfte:** Kontrollera att färre etiketter och sidvisning inte gömmer
innehåll eller tappar formulärtext, utkast eller personliga placeringar.

**Användare:** Alex Exempel.

**Förutsättningar:** Den nya provkartan visar 500 objekt och 1 500 samband.

**Integrationstest:**
[large-map.spec.ts](../../tests/integration/large-map.spec.ts), testfallet
“STORKARTA-01: dense overview keeps readable labels and every object and
relationship reachable”.

**Steg:**

1. Börja i **Karta**. Läs beskedet om färre etiketter. Kontrollera att de
   synliga etiketterna är läsbara och inte ligger över varandra.
2. Välj **Tabell**, **Filter** och **Ta med upphörda**. Stäng filtret.
   Bläddra genom de tio tabellsidorna med **Nästa**. Varje sida visar
   50 objekt, med en namngiven sambandsknapp och rätt antal samband.
   Öppna en sambandsknapp på varje sida, läs alla dess samband och välj
   **Stäng samband**. Kontrollera att samma tabellsida finns kvar.
3. Sök **Provobjekt 499** i **Sök objekt i tabellen**. Kontrollera en träff
   och välj **Redigera Provobjekt 499**. Kontrollera det fullständiga namnet.
   Ange **Oskickad text i den täta kartan** i **Beskrivning**.
4. Välj **Stäng objektdialogen** och kontrollera fokus på **Fortsätt redigera**.
   Tryck Escape. Texten finns kvar och tidigare sparade fakta är oförändrade.
   Välj **Lägg i utkastet och stäng**, öppna **Visa utkastet** via textvyn och
   **Visa förslaget: Provobjekt 499**. Läs hela förslaget och stäng läsningen
   med dess kryss.
5. Välj **Spara hela utkastet**. Invänta sparutfallet och stäng textvyn.
   Ladda om, öppna tabellen och läs samma objekt. Granska ändringen genom
   **Rapporter** → **Ändringshistorik**. Kontrollera de tidigare personliga
   placeringarna. Automatprovet läser även efter omstart av samma server
   med bibehållen databas.
6. Logga ut. Kontrollera att provkartan inte visas för en oinloggad besökare.
   Prova också återkallad medlemstillgång i en separat syntetisk profil om
   rollen och förberedelsen tillåter det; annars anteckna den delen ej utförd.

**Förväntat resultat:**

- Alla 500 objekt nås via tabellens sidor, även de upphörda. Varje
  sambandsknapp öppnar objektets fullständiga samband. Automatprovet
  stämmer av alla knapparnas antal mot hela det publika innehållet och
  kontrollerar att de tillsammans ger vägar till samtliga 1 500 samband.
- Fokus visar sammanhang utan att ändra information eller placeringar.
- Escape avbryter formulärförlust och bevarar hela texten. Förslaget
  tillkommer först när hela formuläret uttryckligen läggs i utkastet.
- Kvittot, återlästa detaljer och historik beskriver samma sparade ändring.
  Automatprovet återläser även efter serveromstart och kontrollerar samtliga
  objekt, samband och tidigare personliga placeringar.
- Utloggning tar bort tillgången till kartan. Automatprovet kontrollerar
  även nekad åtkomst med en tidigare session efter återkallat medlemskap.

# Kartbakgrundens respons och stabilitet

Den här planen är för utvecklare och provare som jämför hela kartans
respons, bildrutor och stabilitet med bakgrunder. Använd påhittade uppgifter.
Anteckna commit, byggd klient, webbläsare, grafikdrivrutin, enhet och resultat.
En smal datorvy ersätter inte en fysisk mobil.

## Mätning

Kör separat från andra tester för att undvika konkurrerande belastning:

```sh
MAP_BACKGROUNDS=1 MAP_REPORT=/tmp/backgrounds.json npm run measure:map
```

Kommandot bygger produktionsklienten och använder den riktiga applikationen
med en tillfällig SQLite-installation. Inloggningsleverantören är ersatt;
inga riktiga hushåll, modell- eller röstanrop används. Det vanliga läget
för 500 objekt och dess gränser behålls när `MAP_BACKGROUNDS` utelämnas.

Matrisen innehåller 16 respektive 80 objekt med samband, 1440 × 960 och
390 × 844, alla sju bakgrunder samt av i varje tema. Navigering och ett
objekts uppgifter är öppna. Varje kombination värms före två omgångar med
12 navigeringshandlingar. `MAP_RUNS` och `MAP_FRAME_SAMPLES` ändrar antalet.
Handlingen är **Rotera vänster**, med den vanliga knappens Enter-handling.
`MAP_APPEARANCES=off,universe` begränsar ett felsökningsprov; det ersätter
inte hela matrisen. `MAP_HEADED=1` öppnar den installerade Chromium på den
aktuella datorns skärm. Kontrollera rapportens faktiska grafikprocessor;
ett synligt fönster bevisar inte hårdvaruacceleration.
Smal vy använder samma datorwebbläsare med pixeltäthet 1 och utan
mobil- eller pekemulering. Verkliga mobiler kan ha högre pixeltäthet och
annan bildskärmsfrekvens; motsvarande kostnad ingår inte i detta prov.

Rapporten skiljer mellan tre mått, alla i millisekunder:

- Respons: från tangenttryckningens avsändande tills en hel PNG-bild av
  sidan är färdig. Kartans verkliga canvas, SVG, etiketter och öppna
  paneler ingår, liksom inmatning, bildkodning och överföring. Det är en
  konservativ observerad svarstid, ingen ren knapphanterartid.
- Bildrutans pipeline: Chromium-spårningens `PipelineReporter` från
  bildrutans början till helt presenterat resultat (`STATE_PRESENTED_ALL`).
  Delvis presenterade och tappade försök redovisas separat; de räknas inte
  som en helt uppdaterad karta. Råa händelser, tillstånd,
  antal, median och närmaste rang för 95-percentilen sparas. Resultatet
  omfattar webbläsarens bildrutepipeline, ingen fysisk skärms fördröjning.
- Bildfångstens takt: tidsavstånd mellan kompositorns bildfångster.
  Seriella PNG-bilder och inmatningspauser ingår. Detta mått är varken
  en ren renderingstid eller ett mått på grafikprocessorns kapacitet.

Bildfångst och spårning påverkar belastningen. Jämför samma metod och miljö.
Rårapporten innehåller grafikidentifiering, operativsystem, CPU, synliga
resursgränser, byggda filers kontrollsummor och enskilda observationer.
JavaScript-observation av skapade och frigjorda WebGL-resurser samt heap
efter skräpinsamling redovisas under upprepade val. Det är antal levande
resurser, inte en mätning av grafikminne eller ett bevis mot alla läckor.

Se [mätresultat och numerisk budget](background-performance-results.md).
`MAP_CALIBRATE=1` skriver ett referensunderlag utan att tillämpa budgeten;
rapportens `targetsMet` blir då `null`, aldrig ett godkänt budgetprov.
Använd det för en uttrycklig referensmätning i en ny miljö. Ändra inte
budgetgränser för att dölja ett misslyckat regressionsprov.
Använd samma metod på en dator med riktig grafikacceleration. Prova också
en fysisk mobil med verkliga pekgester och längre bruk. Redovisa modell,
operativsystem, webbläsare, drivrutin, temperatur och strömläge. Separera
SwiftShader från fysisk grafik. Prov i utvecklingsbehållaren ger inget
löfte om fysisk mobilprestanda.

## Konfigurerade användare och förberedelse

Använd en Skyttel-användare med tillgång till ett separat provhushåll.
Förbered 16 påhittade objekt och samband enligt
[bakgrundsfallens förberedelse](background.md#allmän-förberedelse).
Välj **Karta** så att rymdkartan visas. Börja med systemets minskade rörelse av.
Återställ vyn mellan bakgrunderna; behåll personliga placeringar.

### BAKGRUND-05: Alla bakgrunder behåller navigering och stabilitet

**Syfte:** Upptäcka tappade bildrutor, felaktigt återanvända bakgrundsbilder,
oavsiktlig animation och förlorad orientering efter upprepade val.

**Användare:** Provhushållets Skyttel-användare.

**Förutsättningar:** Förberedelsen ovan, datorvy och 16 objekt.

**Automatiskt motsvarande test:**
[background-stability.spec.ts](../../tests/integration/background-stability.spec.ts),
BAKGRUND-05. Provet använder den riktiga applikationen och tillfällig
SQLite. Jämförelsen använder endast bakgrundspixlar som är fria från
DOM-överlägg i båda bilderna; vanliga helsidesbilder av
zoomens ytterlägen behålls också. Bildigenkänning av motiven och fysisk
pekrespons bedöms separat.

<!--
```manual-mapping
{
  "counterpart": {
    "runner": "playwright",
    "suite": "integration",
    "spec": "tests/integration/background-stability.spec.ts",
    "caseId": "BAKGRUND-05"
  },
  "reference": "16 objekt, datorvy, sju bakgrunder och rörelsens ytterlägen.",
  "outcomes": [
    "Bakgrunden är stilla utan kamerahandlingar och återställning ger samma vy.",
    "Nollstyrkor stoppar panoreringens och zoomens bakgrundsrespons.",
    "Objektflyttning lämnar bakgrunden stilla.",
    "Upprepade bakgrundsval bevarar kamera och personliga placeringar."
  ]
}
```
-->

**Steg:**

1. Välj varje bakgrund genom **Inställningar → Rymdkartan** och dess tema.
   Återgå till kartan och öppna **Navigera**. Välj **Återställ vy** vid behov.
2. Kontrollera att bakgrunden står stilla utan navigering. Rotera ett helt
   varv och tillbaka. Panorera upprepade gånger, zooma till båda ytterlägena
   och välj **Återställ vy**.
3. Växla **Visa bakgrund** av och på tre gånger för samma bakgrund.
   Kontrollera att objektens lägen och kamerans orientering behålls.
4. Sätt **Panoreringsstyrka** och **Zoomstyrka** till noll. Panorera och
   zooma kartan. Kontrollera att bakgrunden står stilla. Återställ vyn och
   sätt sedan styrkorna till 100 procent. Prova **Lageravstånd** 0,5 och 2,0
   med samma panorering och zoom efter återställd vy. Kontrollera synlig
   rörelse och skillnad mellan lageravstånden.
5. Återställ vyn och välj **Återställ rörelse**. Markera ett objekt,
   öppna **Ordna min vy** och flytta objektet uppåt med knappen.
   Kontrollera att bakgrunden står stilla och placeringen sparas.

**Förväntat resultat:**

- Navigering fungerar även över hela varv och zoomens ytterlägen.
- Ingen självständig animation, skarv, tom bakgrund eller tappad karta uppstår.
- Nollstyrkor, upprepade val och återställning ger resultaten ovan.

Den visuella jämförelsen av sand, yta och de sex djurformerna hör till
[bakgrundsfallen](background.md). Täta kartors överlappningar bedöms
separat; detta fall lovar inte fria pekmål för dem.

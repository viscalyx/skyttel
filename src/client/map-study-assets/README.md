# Utforska Skyttels rymdkarta

Kastbart underlag för
[Hur visar rymdkartan överblick, fokus och detaljer på mobil och dator?](https://github.com/viscalyx/skyttel/issues/105).
Beställaren föredrar A som fortsatt riktning. Vanligt klick markerar;
detaljer öppnas uttryckligen. Helheten väntar på fortsatt återkoppling.

Prototypen bygger vidare på den godkända navigationsgrenen, version
[`6586ee7`](https://github.com/viscalyx/skyttel/tree/6586ee7).
D:s skal, logotyper, temaval och B:s fria paneler är gemensamma. A, B och C
i detta underlag gäller kartans utforskning, inte panelmodellen.
Kameran och stjärnhimlen använder den befintliga rymdkartans kod enligt
[förtydligandet om återanvändning](https://github.com/viscalyx/skyttel/issues/105#issuecomment-5845606335).

Rymdkartan täcker hela viewporten. Verktygslåda, status och fria paneler
ligger ovanpå kartan även på små skärmar. Exempelobjekten ligger i fyra
rumsliga grupper med djup både inom och mellan grupperna, som flera
planetsystem. Grupperingen är en personlig placering och tillför inga
nya uppgifter eller samband.

## Öppna underlaget

På grenen `prototype/skyttel-map-exploration`, med projektets beroenden
tillgängliga, kör:

```sh
npm run prototype:map
```

- [A · Fri överblick](http://localhost:4175/?prototype=map&variant=A).
- [B · Ett sammanhang](http://localhost:4175/?prototype=map&variant=B).
- [C · Följ en kedja](http://localhost:4175/?prototype=map&variant=C).

Pilarna i provpanelen byter alternativ och uppdaterar adressen.
Vänster/höger fungerar också utanför inmatning, kartan och arbetspaneler.
Kamera, personliga placeringar, sökning och pågående panelarbete finns
kvar vid bytet. Välj tema i den gemensamma verktygslådan.

## Vad alternativen prövar

- **A · Fri överblick:** kartan och dess etiketter bär orienteringen.
  Valt objekts direkta samband framhävs. Uppgifter öppnas vid behov.
- **B · Ett sammanhang:** det valda objektets kopplingar framhävs och en
  separat remsa samlar deras läsning. Du kan rama in sammanhanget.
- **C · Följ en kedja:** en synlig väg visar de samband du följer. Välj
  ett tidigare steg för att gå tillbaka. Ett hopp till en annan del av
  kartan börjar en ny sammanhängande kedja när du följer nästa samband.

Alla objekt och samband finns kvar i överblicken. Klick i kartan markerar
utan att flytta kameran eller öppna en panel. **Visa nära i kartan**,
**Rama in sammanhanget** och
**Visa hela kartan** är uttryckliga kamerahandlingar. **Lämna fokus**
behåller kameran.

**Ctrl-klick** markerar objektet och öppnar dess uppgifter direkt.
Cmd-klick fungerar också. **Visa detaljer** finns vid markeringen och
i verktygslådan, så samma handling fungerar med pekskärm och tangentbord.
Enter eller mellanslag på ett objekt markerar; Ctrl/Cmd och Enter öppnar
uppgifterna. En redan öppen redigering återanvänds med arbetet bevarat.

Verktygslådan innehåller **Sök i kartan** med förstoringsglas,
**Navigera** med kompass och en växlande kameraknapp. **Visa hela kartan**
har utåtriktade pilar och sparar vyn du lämnar. Knappen byter sedan till
**Återgå till föregående vy**, med en återgångspil. Den återställer den
sparade vyn även efter rotation, panorering, variantbyte eller nya
förslag. Namn och hjälptext följer ikonens aktuella handling.

## Pröva samma uppgifter

1. Klicka på Familjeabonnemang. Objektet och dess samband markeras.
   Öppna **Visa detaljer** och följ **betalas från** till Gemensamt
   bankkonto. Jämför vanligt klick, Ctrl-klick och sökträffar.
2. Öppna **Provlägen** och välj en tät karta. Befintliga placeringar och
   kamera ligger kvar. Använd **Visa hela kartan** för att se hela rymden.
   Rotera och luta för att pröva djupet mellan och inom grupperna.
3. Slå på **Visa privata förslag**. Familjeabonnemangets pris ändras,
   betalningen föreslås gå via kortet och Filmlyktan med ett samband till
   Lo tillkommer. Den tidigare betalningskopplingen finns kvar som ett
   streckat förslag till borttagning. `+`, `~`, `×` och text kompletterar
   färgerna. Upphört innehåll har en separat textmarkering i det täta provet.
4. Öppna **Aktuell status** och **Visa utkast**. Fyra kartändringar ingår
   i samma utkast som eventuella namnändringar. Spara hela utkastet och
   välj **Simulera sparfel** eller **Simulera kvitto** i provpanelen.
   Ett lyckat kvitto lämnar de sparade uppgifterna kvar utan
   förslagsmarkeringar. Tal och sparande är helt simulerade.
5. Öppna **Ordna min vy** i ett objekts panel. Flytta objektet med de sex
   riktningsknapparna. Hushållets uppgifter och privata utkast ändras inte.
6. Dölj kartgrafiken under **Provlägen**. Sök, läs samband, följ deras
   ändpunkter och öppna samma uppgifter genom **Sök i kartan** och
   listans separata **Visa detaljer**-knappar.

Provreglaget för förslag byter exempeldata; det är ett provverktyg och
ingår inte i förslaget till användargränssnitt. Efter ett simulerat
sparande kan reglaget starta om samma exempel. Omladdning tömmer all
tillfällig information i skissen.

## Läsbarhet och alternativa arbetssätt

Namnlappar mäts och placeras där de får plats. Valet och dess samband
prioriteras. Antalet synliga namn anges; objektens personliga placeringar
ändras inte för att ge plats åt text. Ikonerna finns kvar när namn inte
ryms. Originalets typikoner används även i täta och stora kartor.

Text och lista är åtkomliga via **Sök i kartan** i verktygslådan.
Sökningen omfattar samtliga sidor. Att skriva ändrar inte kameran.
När du väljer en objektträff markeras objektet och visas tillsammans
med sina direkta grannar i kartan. Söklistan stängs; andra öppna paneler
och oskickat arbete finns kvar. Ingen detaljpanel öppnas automatiskt.
Söktexten finns kvar när du öppnar listan igen. Utan kartgrafik stannar
listan öppen och **Visa detaljer** ger tillgång till uppgifterna.
Objekt och samband har separata listval, med 50 poster per sida.
Samband skrivs som källa, riktning, betydelse och mål.
Kartarbete kräver inte kartgester.

**Navigera** ger knappar för panorering, rotation, lutning och zoom.
Bakgrundsdrag roterar; Skift och dragning panorerar. Kartans piltangenter
panorerar, Skift och pilar roterar, plus/minus zoomar. Webbläsarens
zoomkommandon lämnas orörda. Objekt kan dras eller flyttas med knappar.
Avbruten dragning återställer startpositionen.
Skift-drag på ett objekt flyttar det i höjdled, längs kartans Y-axel.
En höjdguide visar förflyttningen. Du kan växla Skift under dragningen;
sidled och djup låses medan höjdflytten pågår.
Ett andra stillastående finger ger samma höjdflytt på pekskärm.
Den befintliga kartans gester hanterar två fingrars panorering och zoom.
Stjärnhimlen kan slås av och på under **Navigera**. Den följer kamerans
rotation och zoom, men inte panorering eller objektens placeringar.

Kamerabyten sker utan animation. Korta mobilvyer använder intern rullning
i flytande verktyg och paneler. Kartan behåller viewportens storlek när
paneler öppnas, stängs eller flyttas. Fria arbetspaneler har den godkända
mobilväljaren.

## Skärmbilder

- Fri överblick: [dator](A-dator.png), [mobil](A-mobil.png).
- [Samma rumsliga grupper efter rotation och lutning](A-djup-roterad.png).
- [Höjdguide på mobil](A-hojdguide-mobil.png).
- Ett sammanhang: [dator](B-dator.png), [mobil](B-mobil.png).
- Följ en kedja: [dator](C-dator.png), [mobil](C-mobil.png).
- [Tät karta med privata förslag](B-tat-med-forslag.png).
- [Karttext i dubbel storlek](A-text-200.png).
- [Verklig webbläsarzoom på 200 procent](B-webblasarzoom-200.png).
- Sökning och detaljer vid [320 × 568](B-lista-320-568.png) och
  [320 × 400](B-lista-320-400.png).

## Kontroller och kvarstående prövning

TypeScript, Biome, Markdown och stavningskontroller passerar.
Produktionsbygget passerar och innehåller inte kartprovets ingång,
komponenter eller stilmallar.
Den befintliga kartmotorns sju webbläsartester passerar efter anpassningen.

Lokala Chromium-kontroller omfattar följande:

- A, B och C vid 1440 × 1000 och 390 × 844 utan horisontellt sidspill.
- Kartan täcker viewporten även när sökning, objektdetaljer,
  navigeringsverktyg och provlägen öppnas. Även 320 × 400 och verklig
  webbläsarzoom på 200 procent ingår.
- Textsökning och objektdetaljer vid 320 × 568 och 320 × 400.
- Vanligt kartklick markerar utan panel eller kameraflytt. Ctrl-klick,
  Cmd-klick och Ctrl-högerklick öppnar rätt objekt. Separat detaljknapp
  fungerar med tangentbord och på mobil.
- Sökträff visar en synlig markering, stänger enbart söklistan och
  bevarar annan pågående redigering och mikrofontillstånd. Listans
  separata detaljknapp fungerar även utan kartgrafik.
- Skift-drag ändrar bara höjd och lämnar kameran stilla. Byte av
  modifierartangent under dragning ger inget hopp; Escape återställer
  startpositionen. Emulerat andra stillastående pekfinger ger höjdflytt.
- Alla 500 objektmarkörer har originalets typikon i det stora provet.
- Verklig flikzoom på 200 procent: sidans bredd går från 1440 till
  720 CSS-pixlar och pixelkvoten från 1 till 2. Sökning och detaljer
  fungerar utan horisontellt sidspill. Zoomnivån styrs och avläses via
  [Chromiums flik-API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom).
- Separat dubblering av kartans text med bibehållna markörer och utan
  överlappande namnlappar i det glesa provet.
- Kamera som består vid kartklick, variantbyte och nya provförslag.
  Avbruten objektdragning återställer startpositionen.
- Verktygslådans överblicksknapp återställer den sparade vyn även efter
  mellanliggande kamerarörelser och nya provobjekt. Upprepade tryck på
  Home ramar in hela kartan och behåller samma återgångsvy.
- Navigeringspanelen får tangentbordsfokus när den öppnas. Escape
  stänger den och återför fokus till verktygslådans kompass.
- Paneldrag som inte flyttar kameran och rotation genom dragning i fri
  kartyta efter panelplacering. Återgång till föregående kameravy och
  emulerad pekrotation på mobil ingår.
- Oskickat namn, samtalstext och mikrofontillstånd genom alternativbyten
  och tillfälliga inställningar.
- Sparfel som behåller utkastet och lyckat kvitto som tar bort
  förslagsmarkeringarna men behåller de nya uppgifterna.
- Sammanhängande följning av samband och global sökning efter sista
  objektet i provet med 500 objekt och 1 500 samband.
- Systemvalet för minskad rörelse utan pågående animationer.
- Kartans linjer och pilar har 4,75:1 kontrast i mörkt tema och 3,88:1
  i ljust tema mot bakgrundsfärgen. En opak bakgrund bakom sambandslinjen
  håller stjärnorna borta från linjens bakgrund.

Detta är en designbedömning, inte verifierad WCAG 2.2 AA-överensstämmelse.
Fysiska iPhone-/iPad-prov, verkligt tal, skärmläsare och en fullständig
bedömning av alla sidor och flöden återstår inom den tidigare beslutade
avgränsningen. Skärmläsarordningen kan granskas i den semantiska listan
och fria paneler, men den är inte verifierad med ett hjälpmedel här.

Prototypen använder befintliga `spatial-scene.ts` och
`spatial-navigation.ts` för WebGL, kamera, stjärnhimmel och kameragester.
Små tillägg på prototypgrenen ger återgång till föregående kameravy och
anpassning till ljust och mörkt tema. Vanliga anrop behåller sitt
ursprungliga beteende. Det är inte ett nytt teknikval eller ett
prestandabevis för produktion. `use-object-movement.ts`,
`SpatialHeightGuide` och `SpatialObjectGlyph` återanvänds för objektdrag,
höjdguide och typikoner. Knapparna ger alla sex riktningar.
Närliggande markörer kan överlappa i täta utsnitt; använd zoom, fokus och
listan. Läsbarheten hos den rumsliga överblicken kräver användarens
bedömning, särskilt på mobil.

Skift-klick för flerval och stjärnrörelse vid panorering är noterade
önskemål att bedöma vidare. De ingår inte i denna version eller i
originalets kontrollerade beteende.

## Produktregler som ligger fast

- [Rymdvy och personliga placeringar](https://github.com/viscalyx/skyttel/issues/8#issuecomment-5655478727).
- [Grundspecifikationens regler för innehåll och etiketter](https://github.com/viscalyx/skyttel/issues/13#issuecomment-5697070021).
- [Godkänd navigation, paneler och bevarande av arbete](https://github.com/viscalyx/skyttel/issues/104#issuecomment-5845580885).
- [Tillgänglighetskravet för hela Skyttel](https://github.com/viscalyx/skyttel/issues/110#issuecomment-5843998158).

Personliga placeringar och kameravyer beskriver presentation. En verklig
implementation ska fortfarande bevara personliga placeringar över besök
och enheter. Skissens minnestillstånd ändrar inte den produktregeln.
Inga nya domänbegrepp eller produktförmågor beslutas genom provkoden.

Exempelpositionerna är deterministiska: samma objekt behåller sina
koordinater när provets täthet eller privata förslag ändras. Spridningen
är kontrollerad i alla tre axlar och saknar ett gemensamt plan, även
inom de tätare grupperna. Detta prövar den önskade rumskänslan; det är
ingen automatisk omplacering av användarens objekt.

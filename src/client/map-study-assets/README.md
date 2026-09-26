# Utforska Skyttels rymdkarta

Kastbart underlag för
[Hur visar rymdkartan överblick, fokus och detaljer på mobil och dator?](https://github.com/viscalyx/skyttel/issues/105).
De tre alternativen väntar på beställarens återkoppling. Inget nytt
designbeslut är fastställt.

Prototypen bygger vidare på den godkända navigationsgrenen, version
[`6586ee7`](https://github.com/viscalyx/skyttel/tree/6586ee7).
D:s skal, logotyper, temaval och B:s fria paneler är gemensamma. A, B och C
i detta underlag gäller kartans utforskning, inte panelmodellen.
Kameran och stjärnhimlen använder den befintliga rymdkartans kod enligt
[förtydligandet om återanvändning](https://github.com/viscalyx/skyttel/issues/105#issuecomment-5845606335).

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
  Uppgifter öppnas i fria paneler när du väljer ett objekt eller samband.
- **B · Ett sammanhang:** det valda objektets kopplingar framhävs och en
  separat remsa samlar deras läsning. Du kan rama in sammanhanget.
- **C · Följ en kedja:** en synlig väg visar de samband du följer. Välj
  ett tidigare steg för att gå tillbaka. Ett hopp till en annan del av
  kartan börjar en ny sammanhängande kedja när du följer nästa samband.

Alla objekt och samband finns kvar i överblicken. Urval och fokus
flyttar inte kameran. **Visa nära i kartan**, **Rama in sammanhanget** och
**Rama in allt** är uttryckliga kamerahandlingar. **Föregående kameravy**
återgår till föregående läge. **Lämna fokus** behåller kameran.

## Pröva samma uppgifter

1. Välj Familjeabonnemang och följ **betalas från** till Gemensamt
   bankkonto. Läs riktning och ändpunkter i panelen. Jämför A, B och C.
2. Öppna **Provlägen** och välj en tät karta. Befintliga placeringar och
   kamera ligger kvar. Använd **Rama in allt** för att se hela ytan.
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
   ändpunkter och öppna samma uppgifter genom **Objekt och samband**.

Provreglaget för förslag byter exempeldata; det är ett provverktyg och
ingår inte i förslaget till användargränssnitt. Efter ett simulerat
sparande kan reglaget starta om samma exempel. Omladdning tömmer all
tillfällig information i skissen.

## Läsbarhet och alternativa arbetssätt

Namnlappar mäts och placeras där de får plats. Valet och dess samband
prioriteras. Antalet synliga namn anges; objektens personliga placeringar
ändras inte för att ge plats åt text. Ikonerna finns kvar när namn inte
ryms. Stora kartor använder mindre markörer för överblick.

Text och lista är åtkomliga direkt i verktygslådan och via **Sök i kartan**.
Sökningen omfattar samtliga sidor och lämnar kameran orörd. Objekt och
samband har separata listval, med 50 poster per sida. Samband skrivs som
källa, riktning, betydelse och mål. Kartarbete kräver inte kartgester.

**Navigera** ger knappar för panorering, rotation, lutning och zoom.
Bakgrundsdrag roterar; Skift och dragning panorerar. Kartans piltangenter
panorerar, Skift och pilar roterar, plus/minus zoomar. Webbläsarens
zoomkommandon lämnas orörda. Objekt kan dras eller flyttas med knappar.
Avbruten dragning återställer startpositionen.
Den befintliga kartans gester hanterar två fingrars panorering och zoom.
Stjärnhimlen kan slås av och på under **Navigera**. Den följer kamerans
rotation och zoom, men inte panorering eller objektens placeringar.

Kamerabyten sker utan animation. Korta mobilvyer använder sidrullning så
att status och provpanelen inte täcker kartan. Fria arbetspaneler har
den godkända mobilväljaren och intern rullning.

## Skärmbilder

- Fri överblick: [dator](A-dator.png), [mobil](A-mobil.png).
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
- Textsökning och objektdetaljer vid 320 × 568 och 320 × 400.
- Verklig flikzoom på 200 procent: sidans bredd går från 1440 till
  720 CSS-pixlar och pixelkvoten från 1 till 2. Sökning och detaljer
  fungerar utan horisontellt sidspill. Zoomnivån styrs och avläses via
  [Chromiums flik-API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom).
- Separat dubblering av kartans text med bibehållna markörer och utan
  överlappande namnlappar i det glesa provet.
- Kamera som består vid urval, variantbyte och nya provförslag.
  Avbruten objektdragning återställer startpositionen.
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
prestandabevis för produktion. Objektens dragning prövar bildplanet;
knapparna ger alla sex riktningar. Det befintliga höjddraget behöver
fortsatt prövning tillsammans med panelerna.
Närliggande markörer kan överlappa i täta utsnitt; använd zoom, fokus och
listan. Läsbarheten hos den rumsliga överblicken kräver användarens
bedömning, särskilt på mobil.

## Produktregler som ligger fast

- [Rymdvy och personliga placeringar](https://github.com/viscalyx/skyttel/issues/8#issuecomment-5655478727).
- [Grundspecifikationens regler för innehåll och etiketter](https://github.com/viscalyx/skyttel/issues/13#issuecomment-5697070021).
- [Godkänd navigation, paneler och bevarande av arbete](https://github.com/viscalyx/skyttel/issues/104#issuecomment-5845580885).
- [Tillgänglighetskravet för hela Skyttel](https://github.com/viscalyx/skyttel/issues/110#issuecomment-5843998158).

Personliga placeringar och kameravyer beskriver presentation. En verklig
implementation ska fortfarande bevara personliga placeringar över besök
och enheter. Skissens minnestillstånd ändrar inte den produktregeln.
Inga nya domänbegrepp eller produktförmågor beslutas genom provkoden.

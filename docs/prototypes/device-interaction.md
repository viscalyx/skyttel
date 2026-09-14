# Kastbar prototyp för enheter och tillgängliga arbetssätt

Prototypen ger underlag till
[Kan Skyttels kartarbete fungera på valda enheter med pekgester och tillgängliga alternativ?](https://github.com/viscalyx/skyttel/issues/16).
Ärendet är öppet. Beställarens prövning på iPhone 12 Pro ger de första
fysiska gestresultaten nedan. Ytterligare kontroller och återkoppling
återstår. Dokumentet innehåller ingen resolution.

## Kör lokalt

Grenen är `codex/prototype-device-interaction`. Kör från repositoryts rot:

```sh
python3 -m http.server 8771 --bind 127.0.0.1 --directory docs/prototypes
```

Öppna [enhetsprototypen](http://localhost:8771/spatial-prototype.html).
Adressen fungerar på datorn som kör servern. Beställaren tillåter också en
tillfällig server på port 8772 för prov från det lokala nätverket.
Den servern delar endast kopior av de tre webbfilerna i en separat
provmapp. Dokumentation och övriga repositoryfiler ingår inte
i den delningen. Det är ingen permanent driftsättning.

Alla uppgifter är påhittade. Prototypen använder varken mikrofon,
AI-tjänst eller beständig lagring. Omladdning tar bort hela tillståndet,
även simulerat sparande. Använd inga verkliga hushållsuppgifter.

## Arbetssätt som prövas

`device-interaction.js` och `device-interaction.css` utökar den godkända
[rymdprototypen](spatial-prototype.md). Samma karta och redigering används
i de olika presentationerna.

- Smal skärm eller pekinmatning ger lista och detaljer som startvy.
- Samlad vy visar lista, karta och detaljer tillsammans där utrymmet räcker.
- Öppna karta över hela webbytan fyller webbläsarens synliga arbetsyta.
  Redigera val öppnar samma detaljpanel i en dialog. Till listan återgår
  till listläget; webbläsarens egen helskärmsfunktion behövs inte.
- Listan erbjuder sökning, typfilter, nytt objekt och nytt samband.
  Detaljpanelen erbjuder namnändring, redigering av samband och föreslagen
  borttagning. Den erbjuder också knappar för objektens placering.
- Ändringslistan samlar utkastet. Spara ändringarna godkänner hela listan
  i prototypens minne. Kasta förslag och Ångra senaste sparandet prövar
  återgång. Objektens placeringar är separat presentationstillstånd.

Utkast, val och placeringar följer med mellan presentationerna. Text som
ännu inte skickas från detaljformuläret bevaras vid växling av presentation
för samma valda objekt eller samband.

Listan och detaljpanelen ger en väg genom innehållet utan rumslig
navigering. Kartans SVG, som ritas om vid interaktion, är undantagen från
tangentbordsordningen och skärmläsarens innehåll. Fokus flyttas till
detaljrubriken vid val och återgår efter stängd kartdialog. Detta är
avsedd tillgänglig funktion, inte bekräftat skärmläsarstöd.

Systemets inställning för minskad rörelse stänger av stjärnbakgrunden
och gör dess reglage otillgängligt. Kameran byter läge direkt utan
animation. Listläget kräver ingen kamerarörelse.

## Pekgester och avbrutna drag

Ett finger kan välja, flytta ett objekt i kamerans bildplan eller rotera
tom rymd. När första fingret håller ett objekt och ett andra finger
landar blir det andra fingret ett ankare. Första fingrets rörelse uppåt
och nedåt ändrar då enbart objektets höjd, Y. X och Z behåller värdena
från när ankaret landade. Objektet hoppar inte vid övergången.

Om ankaret flyttas mer än 12 CSS-pixlar byter gesten till kamerans
panorering och zoom. Objektet återgår då till placeringen före hela
dragningen och kameragesten får en ny utgångspunkt utan kamerahopp.
Två fingrar som börjar i tom rymd styr kameran direkt: gemensam rörelse
panorerar och ändrat avstånd zoomar. Tröskeln för ankarfingrets rörelse
är en prototyphypotes som behöver prövas på fysisk pekskärm.

Efter en tvåfingersgest kan ett kvarvarande finger inte börja flytta ett
objekt. Alla fingrar måste lyftas före nästa enfingersdragning. Gesten
håller ett stabilt fingerpar; ett tredje finger påverkar inte gesten.
Höjdgesten stannar om något av dess två fingrar lyfts. Kameragesten
kan byta par när minst två fingrar finns kvar och får då en ny
utgångspunkt från den aktuella kameran.
Övergångar mellan fingerantal och fingerpar återstår att verifiera
fysiskt. Beställarens resultat för grundgesterna finns nedan.

Hela den mörka HTML-ytan runt SVG-bilden tar emot pekhändelser och håller
pekfångsten. SVG-bilden ger fortfarande koordinatsystemet för kamera och
objekt. `touch-action: none` gäller den mörka ytan; formulär och övrig
sida har vanlig zoom och rullning.

[W3C:s regler för touch-action](https://www.w3.org/TR/pointerevents3/#determining-supported-touch-behavior)
anger att webbläsarens zoomhantering beror på den träffade ytan och dess
föräldrar. Regeln finns därför på kartans HTML-yta före gestens början.
Det är en teknisk grund för ändringen, inte bevis för effekten på iPhone.

## Kontroller i Codex inbyggda webbläsare

Följande lokala webbläsarprov är genomförda av agenten:

- Byta betalare från Alex till Kim, spara och ångra sparandet.
- Lägga till Bokljus, föreslå namnet Bokljus plus och lägga till
  sambandet Lo använder Bokljus.
- Behålla formulärtext mellan lista, karta och kartans redigeringsdialog.
- Flytta ett objekt med högerknappen för objektplacering.
- Föreslå borttagning och kasta utkastet.
- Söka och välja med Tab och Enter samt föreslå namnändring med tangentbord.

Prov med simulerat visningsutrymme visar kartan vid 390 × 844 och en
redigeringsdialog som ryms vid 844 × 390. Lista vid 768 × 1024 och samlad
vy vid 1024 × 768 saknar vågrät sidrullning i kontrollen.
Det är emulerade skärmstorlekar, inte prov på en fysisk telefon eller platta.

## Kontroller i Chrome på Mac

Provdatum är 14 september 2026. Den anslutna webbläsaren är Chrome
153.0.8010.37 på macOS 26.6.2. Macens modellidentifierare är `Mac16,13`.
Versionerna kommer från lokal systeminformation; provet verifierar inte
att den installerade Chrome-versionen är den senaste stabila utgåvan.

Agentens programstyrda prov genom Chrome-tillägget omfattar:

- Sökning, val med Tab och Enter samt fokus på redigeringsrubriken.
- Byte av betalare från Alex till Kim, samlat sparande och ångring.
- Bevarad namntext vid byte till kartdialogen och förslag på namnändring.
- Sparande och ångring i dialogen med bekräftelse i dialogens statusfält.
- Ny tjänst Bokljus och ett nytt samband där Lo använder Bokljus.
- Föreslagen borttagning av tjänsten tillsammans med dess samband.
- Att den avgränsade nätverkslänken går att öppna från Macen.

Detta är körning i Chrome på den fysiska Macen med programstyrd inmatning.
Det verifierar inte känslan i fysisk mus eller styrplatta, Shift-dragning,
skärmläsarens uppläsning eller åtkomst från andra enheter.

Ett kompletterande programstyrt prov med 390 × 844 pixlar visar att
dragning långt ned i den mörka ytan roterar kameran och behåller objektens
placeringar. Sidzoomens inställningar är oförändrade utanför kartan.
Det tidigare sidzoomsproblemet på iPhone är inte reproducerat i detta
datorprov.

Efter ändringen av höjdgesten fungerar vanlig objektdragning fortsatt
i Chrome. Vid 390 × 844 ligger axelvisarens behållare fyra pixlar från
den synliga kartytans nederkant och sidan har ingen vågrät överströmning.
JavaScript-kontrollerna hittar inga syntaxfel.

Nio separata logikkontroller med syntetiska pekhändelser mot prototypens
händelsehanterare i Node passerar: vanlig dragning, höjdlås från aktuell
placering, vågrät rörelse utan höjdändring, ankarjitter, övergång till
kamera med återställd placering, lyft av respektive finger, avbrott,
vanlig nypning med extra finger samt Shift. Dessa kontroller använder
ersättningar för ritning och DOM; de bevisar inte hur iOS levererar
pekhändelser eller hur gesten känns med två fingrar.

## Beställarens prov på iPhone 12 Pro

Beställaren anger den 14 september 2026 en fysisk iPhone 12 Pro med iOS
och bekräftar att objektflyttning, nypzoom och panorering med två fingrar
fungerar. Webbläsaren och exakta versioner för iOS och webbläsare behöver
fortfarande anges.

Ett hinder finns i stående orientering: nypning långt ned zoomar hela
webbsidan även när båda fingrarna börjar inne i den mörka kartytan.
Det är ett kvarvarande interaktionsfel som behöver prövas, inte ett
godkänt undantag för första versionen.

Ändringen till en gemensam HTML-yta för alla kartgester ovan är avsedd
att omfatta också den nedre mörka marginalen. Orsakssambandet är en
hypotes; datorprovet fastställer inte hur iPhone hanterar träffytan.
Beställaren behöver ladda om provet och kontrollera nypning nedtill igen.

Beställaren efterfrågar också direkt höjdflyttning med pekgester och
rapporterar att X/Y/Z-visaren sitter för högt i stående orientering.
Den föreslagna höjdgesten använder ett andra stilla finger enligt
beställarens beskrivning ovan. Axelvisarens nedre placering följer nu
den synliga kartytans nederkant med hänsyn till enhetens säkra kant.
Båda ändringarnas känsla och placering på iPhone återstår att bekräfta.

## Målenheter som återstår

<!-- markdownlint-disable MD013 -->
| Mål | Inmatning att pröva | Status |
| --- | --- | --- |
| Windows | Mus, tangentbord, skärmläsare | Fysisk prövning återstår |
| macOS | Mus, styrplatta, tangentbord, skärmläsare | Chrome-kontroll ovan; eget prov återstår |
| iPhone | Pekskärm, skärmtangentbord, skärmläsare | Grundgester prövade på 12 Pro; sidzoom återstår |
| iPad | Pekskärm, skärmtangentbord, skärmläsare | Fysisk prövning återstår |
<!-- markdownlint-enable MD013 -->

Målenheternas operativsystem, webbläsare och versioner ska anges när de
prövas. De emulerade storlekarna ovan ersätter ingen rad i matrisen.

## Avgränsad fortsatt prövning

1. På telefon och iPad: välj objekt och samband, rotera tom rymd,
   panorera och nypzooma. Håll ett objekt med första fingret och lägg
   till ett stilla ankarfinger. Dra första fingret uppåt och nedåt;
   kontrollera att bara Y ändras, även med roterad kamera. Flytta sedan
   även ankaret och kontrollera övergången till kamera och återgången
   till objektets ursprungliga placering. Lyft ett finger och fortsätt
   rörelsen; objektet ska ligga kvar. Pröva också ett tredje finger,
   byte av kamerans fingerpar och axelvisaren vid telefonens nederkant.
2. Med mus och styrplatta: pröva val, dragning, rotation, panorering,
   zoom och Shift-dragning i höjdled. Kontrollera att övriga objekt och
   hushållets uppgifter är oförändrade vid objektflyttning.
3. Med enbart tangentbord och sedan skärmläsare: hitta Tonmoln familj,
   följ och ändra betalningssambandet, lägg till objekt och samband,
   byt namn, föreslå borttagning, granska, spara och ångra. Kontrollera
   tydligt fokus, läsbara namn och att dolda vyer inte tar fokus.
4. Slå på systemets minskade rörelse. Kontrollera att stjärnbakgrunden
   är avstängd och att hela redigeringsuppgiften går att lösa i listan.
5. Pröva liggande telefon samt stående och liggande iPad. Öppna
   redigeringsdialogen och skärmtangentbordet. Kontrollera att det
   aktiva fältet, formulärets knapp och vägen tillbaka går att nå.
6. Växla mellan lista, karta och dialog under ett pågående utkast.
   Kontrollera formulärtext, ändringslista och objektplaceringar.
   Samla beställarens bedömning innan ärendet kan avgöras.

## Preliminär komplexitetsbedömning

En gemensam editor begränsar dubblering av logik för hushållets uppgifter.
De extra delarna gäller fokus, växlande synligt skärmutrymme, dialoger och
samordning mellan enfingersdragning och flerfingergester. Dessa delar
kräver verifiering även om själva redigeringen delas mellan vyerna.

Prototypen belägger ingen uppskattning i persontimmar. Ramverk,
produktionslösning och teknikval avgörs separat i
[Vilken sammanhängande teknik och lagring uppfyller de prövade behoven?](https://github.com/viscalyx/skyttel/issues/12).

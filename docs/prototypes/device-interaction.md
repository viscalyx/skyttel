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
- Håll fingret stilla på ett objekt i kartan för att öppna objektmenyn.
  Menyn erbjuder Redigera objekt, Visa kopplingar och Ta bort objekt.
  Borttagning öppnar detaljpanelens befintliga beskrivning av objektet
  och berörda samband, följd av Föreslå borttagning. Högerklick på
  objektet öppnar samma meny på datorn. Listan och Redigera val
  behåller motsvarande vanliga åtgärder utan långtryck.
- Listan erbjuder sökning, typfilter, nytt objekt och nytt samband.
  Valt objekt visar Redigera och Ta bort direkt under sin listrad.
  Fokus stannar på raden och Tab når åtgärderna. Redigera rullar fram
  formuläret; Ta bort öppnar och visar beskedet om berörda kopplingar.
  Åtgärderna visas bara för objekt som fortfarande finns i utkastet.
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

Ett stilla tryck på ett objekt öppnar menyn efter 550 millisekunder.
Vanlig dragning börjar direkt efter sin befintliga rörelsetröskel och
avbryter väntan på menyn. Ett andra finger, släpp, avbruten pekhändelse,
förlorad pekfångst eller fönsterfokus avbryter också väntan. När menyn
öppnas måste alla fingrar lyftas innan ett menyval kan göras. Släppet
från långtrycket ska inte aktivera eller stänga menyn av misstag.
Tidsgränsen och rörelsetröskeln är hypoteser att pröva på iPhone.

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
- Att oskickad namntext och valt objekt bevaras när Tab flyttar fokus
  till formulärknappen och Escape trycks. Escape-skyddet omfattar hela
  formuläret, även knapparna.
- Objektmenyn via högerklick vid 390 × 844 och 844 × 390 pixlar. Alla
  menyknappar ryms i den synliga ytan och har minst 44 pixlars höjd.
- Menyns namnändring och Visa kopplingar, samt borttagning med besked om
  Tonmoln familj och fyra kopplingar. Förslaget tar bort dessa ur utkastet
  och behåller dem i sparat tillstånd. Kasta förslag återställer dem.
- Menyn stängs med Avbryt, Escape eller tryck på bakgrunden. Valet
  behålls och fokus återgår till Redigera val. Vanlig objektdragning
  fungerar efteråt utan att ändra hushållsuppgifter eller kamera.
- Fokus efter Spara, Ångra och Kasta förslag återgår till ändringslistans
  fasta rubrik. Rubrikens identifierare sitter på rätt element även
  när den valda detaljen ritas om. Inga nya JavaScript-fel i omprovet.
- Listans snabbåtgärder vid 390 × 844: radval behåller fokus och Tab
  når Redigera samt Ta bort. Även sista radens båda 44 pixlar höga
  knappar ryms i listans rullyta. Redigera visar rätt namnformulär högt
  på sidan och oskickad namntext bevaras vid nytt val av samma objekt.
- Listans Ta bort visar först beskedet utan att ändra utkastet.
  Föreslagen borttagning av Tonmoln familj tar med fyra kopplingar;
  Kasta förslag återställer objektet. Borttagning av ett osparat
  Bokljus-förslag lämnar ingen ändring mot den sparade exempelkartan.
  Snabbåtgärderna ryms även vid 844 × 390 utan vågrät överströmning.
  Kartmenyns borttagningsväg fungerar i det kompletterande omprovet.

Borttagningsvalet rullar fram hela det öppna beskedet och dess knapp när
utrymmet räcker. Menyprovet använder högerklick i Chrome på Mac;
långtryckets händelseföljd i iOS och känslan med finger är inte verifierade.

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

Efter tillägget av objektmenyn passerar 34 logikkontroller: de nio
gestfallen ovan och 25 fall för långtryck, tidsgräns, avbrott, släpp,
efterföljande klick, nytt tryck, tangentbordsklick och högerklick.
Den tillfälliga Node-kontrollen använder verkliga händelsehanterare
med simulerad timer och angiven händelseordning. Den verifierar inte
webbläsarens pekfångst, dialogfokus eller klicksyntes på iOS.

Dialogprovet omfattar också minskning av den synliga höjden från
844 × 390 till 844 × 140 medan namnfältet har fokus. Med den uppdaterade
layouten ryms etikett och fält i dialogen; Tab rullar fram formulärets
knapp och en namnändring kan föreslås. Fältet ryms även vid 390 × 100.
Texten bevaras vid återgång till 390 × 844 och när kartdialogen stängs
och öppnas. Fokus återgår till Redigera val efter stängning.

Detta är ändringar av Chromes visningsutrymme. De efterliknar mindre
utrymme men återskapar inte iOS-tangentbordet eller dess förskjutning
av den synliga ytan.

## Beställarens prov på iPhone 12 Pro

Beställaren anger den 14 september 2026 en fysisk iPhone 12 Pro med iOS
och Safari och bekräftar att objektflyttning, nypzoom och panorering
med två fingrar fungerar. Beställaren prövar även Chrome på samma
iPhone och visar namnfältet med tangentbordet öppet i liggande läge.
Exakta versioner för iOS, Safari och Chrome behöver fortfarande anges.
Gestresultaten gäller Safari; motsvarande gester är inte separat
bekräftade i Chrome. Safari-provet ändrar inte i sig plattformsbeslutet.

Beställaren bekräftar att listprovet går att genomföra och förstå
tydligt: välj Tonmoln familj, öppna sambandet Alex betalar Tonmoln
familj, byt Från till Kim och föreslå ändringen. Beställaren bekräftar
också att samlat sparande behåller Kim som betalare och att Ångra
senaste sparandet återför betalaren till Alex. Resultat och
bekräftelser bedöms fungera i det fysiska provet.

Beställaren bekräftar att nästa prov är tydligt: skapa tjänsten Bokljus,
lägg till Lo använder Bokljus, spara och föreslå borttagning av Bokljus.
Det framgår att tjänsten och dess samband föreslås tas bort tillsammans.
Beställaren efterfrågar därefter en meny via långtryck på kartobjekt,
med redigering och borttagning direkt åtkomliga från rymdkartan.
Objektmenyn ovan prövar detta önskemål; fysisk återkoppling återstår.

Beställaren bedömer att borttagning är svår att hitta efter objektval
i listan och efterfrågar snabb åtkomst till redigering och borttagning.
De synliga åtgärderna under vald listrad prövar detta önskemål.
Beställaren återkopplar att detta ser ut att fungera i iPhone-provet.
Det ger positiv återkoppling på snabbåtgärderna och deras placering
vid listval. Återkopplingen redovisar inte varje åtgärd separat.
Kartans långtrycksmeny behöver fortfarande bekräftas fysiskt.

Ett tidigare hinder i stående orientering var att nypning långt ned
zoomade hela webbsidan även när båda fingrarna började inne i den mörka
kartytan. Efter uppdateringen bekräftar beställaren uttryckligen att
även nypzoom längst ned fungerar. Felet är därmed inte längre
kvarvarande i beställarens prov på iPhone 12 Pro.

Ändringen till en gemensam HTML-yta för alla kartgester ovan är avsedd
att omfatta också den nedre mörka marginalen. Orsakssambandet är en
hypotes; det positiva fysiska omprovet bekräftar beteendet men isolerar
inte den tekniska orsaken.

Beställaren efterfrågar också direkt höjdflyttning med pekgester och
rapporterar att X/Y/Z-visaren sitter för högt i stående orientering.
Den föreslagna höjdgesten använder ett andra stilla finger enligt
beställarens beskrivning ovan. Axelvisarens nedre placering följer nu
den synliga kartytans nederkant med hänsyn till enhetens säkra kant.
Efter uppdateringen återkopplar beställaren att det verkar fungera bra.
Det ger ett positivt fysiskt prov av höjdgesten på iPhone 12 Pro.
Återkopplingen redovisar inte ankartröskel, avbrutna gester eller
axelvisarens placering var för sig.

I liggande orientering rapporterar beställaren ett redigeringshinder:
namnfältet syns inte när skärmtangentbordet är öppet. Det går att
stänga tangentbordet och återgå till kartan. Bilden visar dialogen som
en tunn remsa ovanför tangentbordet. Bildens personliga autofyllnadsdata
ingår inte i prototypen eller repositoryt.

Dialogen har nu uttrycklig höjd och position efter den synliga ytan,
med fri nederkant. När höjden är liten rullar även dialogens överkant
så att den inte upptar plats framför fältet. Vid fokus och ändrad
synlig yta rullas enbart dialogen för att visa det aktiva fältet.
I det fysiska omprovet går namnfältet att rulla fram, men beställaren
bedömer redigeringen som trång och obekväm. Beställaren accepterar
den nuvarande lösningen och väljer att gå vidare: telefonen kan vändas
till stående läge för bekvämare textredigering och användas liggande
för kartarbete. Det är ett accepterat arbetssätt och en känd begränsning,
inte ett krav på ett mindre eller eget tangentbord. Ingen ny
redigeringslayout eller låsning av skärmriktningen ingår i detta prov.
Beställarens bild från Chrome på iPhone visar också mycket litet
utrymme för namnfältet när tangentbordet är öppet i liggande läge.
Det accepterade arbetssättet med stående textredigering behålls.

Namnfältet begär nu `autocomplete="off"`, liksom fältet för nytt objekt.
Det är en begäran om att avstå lagrad autofyllnad för ett objektnamn,
inte en kontroll över tangentbordets höjd. Safari kan åsidosätta
begäran; effekten på raden Autofyll kontakt är inte fysiskt verifierad.
[HTML:s regler för autofyllnad](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill)
beskriver attributet och webbläsarens möjlighet att åsidosätta det.

[HTML:s tangentbordskontroller](https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-inputmode-attribute)
ger önskemål om inmatningstyp, inte systemtangentbordets höjd.
[Apples tangentbordsinställningar](https://support.apple.com/sv-se/104995)
låter personen stänga av textförslag. Detta garanterar inte mer
arbetsutrymme för prototypen och är inget krav för att använda Skyttel.

[WebKits standardstil för dialoger](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/css/html.css)
anger innehållsanpassad höjd och positionering mot båda kanterna.
Kombinationen med prototypens tidigare övre förskjutning och enbart
maxhöjd är en möjlig förklaring till remsan; orsaken är inte isolerad
på enheten.
[WebKits beskrivning av Visual Viewport](https://webkit.org/blog/9674/new-webkit-features-in-safari-13/#visual-viewport-api)
stödjer att använda den synliga ytan för innehåll ovanför tangentbordet.

## Målenheter som återstår

<!-- markdownlint-disable MD013 -->
| Mål | Inmatning att pröva | Status |
| --- | --- | --- |
| Windows | Mus, tangentbord, skärmläsare | Fysisk prövning återstår |
| macOS | Mus, styrplatta, tangentbord, skärmläsare | Chrome-kontroll ovan; eget prov återstår |
| iPhone | Pekskärm, skärmtangentbord, skärmläsare | Safari: gester fungerar. Chrome: liggande tangentbord prövat. Listans relationsändring, sparande, ångring, tillägg och borttagning fungerar. Positiv återkoppling på snabbåtgärder vid listval; kartans långtrycksmeny och övriga prov återstår |
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
7. Håll ett objekt stilla i drygt en halv sekund. Lyft fingret och välj
   Redigera objekt, Visa kopplingar eller Ta bort objekt. Kontrollera att
   släppet inte väljer något av misstag, att Avbryt fungerar och att
   vanlig dragning samt ett andra finger avbryter väntan på menyn.

## Preliminär komplexitetsbedömning

En gemensam editor begränsar dubblering av logik för hushållets uppgifter.
De extra delarna gäller fokus, växlande synligt skärmutrymme, dialoger och
samordning mellan enfingersdragning och flerfingergester. Dessa delar
kräver verifiering även om själva redigeringen delas mellan vyerna.

Kodgranskningen pekar också ut sådant som behöver prövas med verklig
skärmläsare: återgång från detaljpanelen till rätt plats i listan,
förklaring av kvarvarande kartfokus som begränsar listan och uppläsning
av träffantal och status. Sidstruktur och programstyrda kontroller
avgör inte om uppläsning och läsposition fungerar genom hela flödet.

Prototypen belägger ingen uppskattning i persontimmar. Ramverk,
produktionslösning och teknikval avgörs separat i
[Vilken sammanhängande teknik och lagring uppfyller de prövade behoven?](https://github.com/viscalyx/skyttel/issues/12).

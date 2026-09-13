# Kastbar prototyp för Skyttels rymdvy

Prototypen ger underlag till
[Hur gör 3D-vyn hushållets samband tydliga och redigerbara?](https://github.com/viscalyx/skyttel/issues/8).
Den är ett diskussionsunderlag. Den avgör inte produktionsbibliotek,
plattform eller lagring.

## Kör

Öppna `spatial-prototype.html` direkt i en webbläsare, eller kör från
repositoryts rot:

```sh
python3 -m http.server 8768 --bind 127.0.0.1 --directory docs/prototypes
```

Öppna sedan
[rymdprototypen](http://127.0.0.1:8768/spatial-prototype.html).

Alla uppgifter är påhittade. Prototypen använder inga externa resurser,
mikrofoner, modeller eller lagringstjänster. Även bekräftat sparande
försvinner vid omladdning.

## Samlad rymdvy med objektfokus

Beställaren föredrar A hittills och väljer att C ska utgå. Funktionen från
B ingår i A: Ctrl-klick på en ikon visar det objektets direkta kopplingar.
Knappen Visa objektets kopplingar gör samma sak för det valda objektet,
även på pekskärm. Ctrl+Enter på en ikon ger ett tangentbordsalternativ.

Klick eller Ctrl-klick på tom rymd visar hela rymden igen. Escape och
Visa hela rymden gör samma sak: lämnar fokus och rensar sökning och typfilter.
Kamerans vinkel, zoom och panorering behålls. Återställ vy återställer också
kameran. Objektens placeringar och hushållets ändringsförslag påverkas inte.
Vanligt klick väljer ett objekt eller samband utan att byta fokusobjekt.
Drag på tom yta roterar vyn och lämnar kvar det aktuella objektfokuset.
Klick, Ctrl-klick och Ctrl med högerklick på tom rymd är kontrollerade i
webbläsaren. De visar hela urvalet och behåller kamerans läge; drag lämnar
kvar objektfokuset.

Det finns en huvudvy och ingen variantväxlare. Länkar med `?variant=A`,
`?variant=B` eller `?variant=C` öppnar samma samlade vy. Objektlistan finns
som komplement till rymdkartan. Tillståndspanelen visar aktuellt tillstånd.

Klick och drag i rymdytan väljer objekt, samband eller styr vyn. Etiketternas
text är inte markerbar, även när Alla etiketter är aktiverat. Textfält och
text utanför rymdytan behåller vanlig textmarkering.

## Pröva

1. Hitta Tonmoln familj och skilj betalare, användare och betalningsmedel.
2. Välj betalningssambandet, byt Alex till Kim och granska ändringslistan.
3. Slå på tätare karta, sök efter extrakortet och följ dess samband.
4. Flytta ett befintligt objekt genom att dra det. Lägg till det simulerade
   AI-förslaget och flytta även ett nytt objekt. Använd Närmare och Längre
   bort för att pröva djupled. Kontrollera att andra objekt ligger kvar.
5. Nyp med två fingrar i kartan för att zooma in och ut. Flytta fingrarna
   tillsammans för att panorera åt alla håll. Pröva även tvåfingersscroll
   på en styrplatta. Håll Shift och dra ett objekt uppåt eller nedåt för
   enbart höjdled, även efter rotation. Ctrl-klicka på en ikon, välj ett
   samband och återgå med Escape respektive Visa hela rymden.
6. Lös samma uppgifter genom listan och detaljpanelen utan rotation.
7. Pröva namnändring, borttagning och att lägga till användning av en tjänst
   från en person. Spara hela förslaget, kasta förslag och ångra sparande.
8. Jämför typikonerna i kartan och listan. Välj en person och byt mellan
   personikon och påhittade profilbilder. Granska förslaget och spara det.
9. Slå på och av Universumsbakgrund och bedöm läsbarheten.
10. Jämför Följ systemet med Egen riktning för panoreringen. Vänd vågrät
    och lodrät riktning var för sig. Kontrollera att zoom fungerar likadant.

## Krav och antaganden

Beställaren anger att både befintliga och nya objekt ska kunna flyttas i
rymden. Beställaren önskar också nypzoom med två fingrar på en platta och
Shift tillsammans med musrörelse uppåt eller nedåt för flyttning i höjdled.
Prototypen tolkar det som Shift-dragning av ett objekt längs rummets
höjdaxel. Sidled och djup är då fasta även när kameran är roterad.

Beställaren har svårt att uppfatta höjdförflyttningen och vill pröva
hjälplinjer som gör den rumsliga rörelsen tydligare. Följande förslag visas
när Shift hålls nere för ett valt objekt eller Visa höjdhjälp är aktiverat:

- En blå höjdaxel med markeringar går genom objektet.
- En streckad ring anger starten på höjdförflyttningen och en starkare
  linje visar sträckan till den aktuella positionen.
- En hjälplinje går till objektets fotpunkt på ett litet perspektivritat
  rutnät. Rutnätet är ett visuellt hjälpplan, inte ett verkligt golv.
- En ruta anger hur många steg högre eller lägre objektet ligger jämfört
  med starten. Stegen gäller endast visuell placering, inte meter.

Hjälplinjerna följer samma projektion som objektet när kameran vrids.
Shift låser sidled och djup. Startmarkeringen börjar om när en ny
höjdförflyttning inleds, även om Shift trycks ned mitt i ett vanligt drag.
Upp- och nedknapparna använder också rummets höjdaxel och visar höjdhjälpen.
Hjälpen kan lämnas synlig när vyn roteras och skymmer inte klickytorna.

Vanlig dragning sker i kamerans bildplan. Knapparna erbjuder flyttning i
alla tre riktningar. Kopplingarna följer objekten. AI-förslag ändrar inte
befintliga placeringar eller kameran.

Två fingrar i kartan zoomar kameran genom avståndet mellan fingrarna och
panorerar genom fingrarnas gemensamma rörelse. Zoomningen utgår från
fingrarnas mittpunkt. Objektens egna koordinater ändras inte.
Enfingersflyttning eller rotation upphör när det andra fingret sätts ned.
Båda fingrarna måste lyftas innan nästa dragning börjar. Nypning på
styrplattor som skickar Ctrl-hjulhändelser zoomar också kartan.
Vanliga hjulhändelser över kartan panorerar vågrätt och lodrätt. Utanför
kartan fungerar sidans vanliga rullning. Återställ vy återställer kameran.

Beställaren bekräftar att tvåfingerspanorering fungerar och vill kunna
vända riktningen både vågrätt och lodrätt, eller följa exempelvis Mac.
Följ systemet använder webbläsarens rullningshändelser med vanlig
rullningsriktning. Prototypen läser inte operativsystemets inställning
direkt. Egen riktning kan vända varje axel separat. På pekskärm följer
panorering fingrarnas gemensamma rörelse om axeln inte är vänd.
Riktningsinställningarna påverkar inte nypzoom, rotation eller objektflyttning.

Beställaren önskar skilda typikoner, möjlighet till en liten profilbild på
en person och en universumsbakgrund som kan slås av och på. Prototypen
visar en egen ikon för varje förekommande objekttyp. En person kan få en
av tre påhittade exempelbilder eller återgå till personikonen.
Bildbytet ingår i ändringsförslaget. Inga verkliga foton laddas upp.

Beställaren preciserar att universumsbakgrunden ska vara en genererad
stjärnhimmel över hela rymdvyns viewport. Prototypen genererar stjärnor
med olika storlek, färgton och ljusstyrka på ett separat canvaslager.
Lagret fyller hela rymdytan även när kartans proportioner eller
fönsterstorleken ändras. Ingen bakgrundsbild läses in.

Stjärnhimlen är dekorativ och stilla. Samma utgångsvärde håller stjärnorna
stabila mellan omritningar. Panorering och objektflyttning påverkar inte
stjärnhimlen. Ikoner och exempelprofilbilder är lokala vektorformer.

Följande är prototypförslag som behöver användarens återkoppling:

- Placering och avstånd ordnar presentationen utan egen domänbetydelse.
- Flyttning ändrar vyn direkt, separat från förslag om hushållets uppgifter.
- Sökning och typfilter begränsar synliga objekt. Visa hela rymden rensar dem.
- Etikettkollisioner minskas genom att dölja etiketter; listan ger alla namn.

Personlig eller gemensam placering och beständig lagring av layouten är
öppna frågor. Prototypen avgör dem inte genom sin minnesmodell.

## Kontroll och begränsningar

JavaScript-syntax, byte av betalare, ändringslista, simulerat sparande,
rörelse med knappar, dragning av ett nytt objekt, stabil befintlig placering
vid AI-förslag, fokus på tätare karta och sökning i smal listvy är
kontrollerade i lokal webbläsare. Användarprövningen återstår.

Typikoner, byte till en exempelprofilbild och dess ändringsförslag samt
universumsbakgrunden är kontrollerade i webbläsaren. Vågrät och lodrät
panorering via rullningshändelser ändrar kameran utan att ändra objektens
koordinater. Fysiska flerfingergester är ännu inte verifierade.

Ctrl-klick och Ctrl med högerklick fokuserar objektet i webbläsarprovet.
Val av en koppling behåller fokusobjektet. Escape och Visa hela rymden
visar hela urvalet igen; återgångsknappen behåller kamerans läge.
Rullningsprov visar att Egen riktning kan vända varje axel separat medan
zoom och den andra axeln behåller sina värden.

Höjdhjälpen är kontrollerad i en lutad vy med uppknapparna: rutan visar
50 steg högre än start efter två steg, med oförändrad sidled och djup.
Startmarkering, hjälpplan och indikator följer projektionen. Känslan i
själva Shift-dragningen behöver fortsatt användarprövning.

Rymden är en enkel perspektivprojektion till SVG. Objekt djupsorteras men
linjer har ingen fullständig skymning. Etiketter kan överlappa linjer och
punkter. Textalternativet ger samma redigering, men full tillgänglighet och
verklig mobil användning är inte verifierade. Nypzoom och panorering
behöver prövas på en fysisk platta och Shift-dragning behöver användarens
prövning. Ingen automatisk rörelse ingår. Handplacerade exempel prövar
interaktionen;
de verifierar inte generell placering eller prestanda för stora kartor.

Relationens parter kan bytas till objekt av samma typ. Ny användning av en
tjänst kan läggas till från en person. Prototypen erbjuder inte en komplett
relationseditor för alla begrepp. Tal och nätverksfel prövas i den separata
samtalsprototypen.

Tätare karta byter exempelunderlag och börjar om ångra-historiken.
Pågående ändringsförslag följer med. Börja om återställer exempelkartan.

## Status

A är beställarens föredragna huvudvy, med B:s fokusfunktion inkluderad och
C bortvald. Beslutet om hela utformningen är fortsatt öppet. Användarens
återkoppling och slutliga beslut hör hemma i ärendet.

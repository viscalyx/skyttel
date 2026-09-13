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

## Tre alternativ

- `?variant=A`: hela rymdkartan med detaljpanel bredvid.
- `?variant=B`: det valda objektets direkta samband, med detaljpanelen först.
- `?variant=C`: sökbar objektlista först, med en mindre rumslig vy.

Växla med knapparna längst ned eller vänster/höger piltangent utanför
inmatningsfält. Objekt, förslag och placeringar följer med mellan vyerna.
Tillståndspanelen visar hela det relevanta tillståndet vid varje åtgärd.

## Pröva

1. Hitta Tonmoln familj och skilj betalare, användare och betalningsmedel.
2. Välj betalningssambandet, byt Alex till Kim och granska ändringslistan.
3. Slå på tätare karta, sök efter extrakortet och följ dess samband.
4. Flytta ett befintligt objekt genom att dra det. Lägg till det simulerade
   AI-förslaget och flytta även ett nytt objekt. Använd Närmare och Längre
   bort för att pröva djupled. Kontrollera att andra objekt ligger kvar.
5. Pröva rotation, zoom, fokus, översikt, alla etiketter och smal vy.
6. Lös samma uppgifter genom listan och detaljpanelen utan rotation.
7. Pröva namnändring, borttagning och att lägga till användning av en tjänst
   från en person. Spara hela förslaget, kasta förslag och ångra sparande.

## Krav och antaganden

Beställaren anger att både befintliga och nya objekt ska kunna flyttas i
rymden. Prototypen erbjuder dragning i kamerans bildplan och knappar för
alla tre riktningar. Kopplingarna följer objekten. AI-förslag ändrar inte
befintliga placeringar eller kameran.

Följande är prototypförslag som behöver användarens återkoppling:

- Placering och avstånd ordnar presentationen utan egen domänbetydelse.
- Flyttning ändrar vyn direkt, separat från förslag om hushållets uppgifter.
- Fokus behåller koordinaterna och visar direkta grannar.
- Sökning och typfilter begränsar synliga objekt. Översikt rensar dem.
- Etikettkollisioner minskas genom att dölja etiketter; listan ger alla namn.

Personlig eller gemensam placering och beständig lagring av layouten är
öppna frågor. Prototypen avgör dem inte genom sin minnesmodell.

## Kontroll och begränsningar

JavaScript-syntax, byte av betalare, ändringslista, simulerat sparande,
rörelse med knappar, dragning av ett nytt objekt, stabil befintlig placering
vid AI-förslag, fokus på tätare karta och sökning i smal listvy är
kontrollerade i lokal webbläsare. Användarprövningen återstår.

Rymden är en enkel perspektivprojektion till SVG. Objekt djupsorteras men
linjer har ingen fullständig skymning. Etiketter kan överlappa linjer och
punkter. Textalternativet ger samma redigering, men full tillgänglighet och
verklig mobil användning är inte verifierade. Ingen automatisk rörelse,
nypzoom eller panorering ingår. Handplacerade exempel prövar interaktionen;
de verifierar inte generell placering eller prestanda för stora kartor.

Relationens parter kan bytas till objekt av samma typ. Ny användning av en
tjänst kan läggas till från en person. Prototypen erbjuder inte en komplett
relationseditor för alla begrepp. Tal och nätverksfel prövas i den separata
samtalsprototypen.

Tätare karta byter exempelunderlag och börjar om ångra-historiken.
Pågående ändringsförslag följer med. Börja om återställer exempelkartan.

## Status

Ingen variant är vald och beslutet är öppet. Användarens återkoppling och
slutliga beslut hör hemma i ärendet; denna fil beskriver underlaget.

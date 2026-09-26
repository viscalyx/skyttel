# Pröva att skapa objekt och byta typ i Skyttel

Kastbart provunderlag för
[Hur utformas listor, detaljer och redigering som öppnas vid behov?](https://github.com/viscalyx/skyttel/issues/107).
Frågan är hur ett nytt objekt och ett typbyte fungerar inom de godkända
detaljavsnitten i B, med samma karta, privata utkast och sparbesked.

[Skapande och typbyte är godkänt](https://github.com/viscalyx/skyttel/issues/107#issuecomment-5847984799).
Nästa prov gäller [profilbilder](../profile-study-assets/README.md).

## Fast grund

Grenen `prototype/skyttel-object-creation` börjar på godkända
[`6e1458c89e11d0af8db5b01f82d29aa2f0d6d7e9`](https://github.com/viscalyx/skyttel/tree/6e1458c89e11d0af8db5b01f82d29aa2f0d6d7e9).
Se [godkännandet av typredigeringen](https://github.com/viscalyx/skyttel/issues/107#issuecomment-5847845443).
Startversionen ingår i grenens historik. Karta A, fria paneler,
listmönster B, typinställningarna och D:s talåterkoppling består.
B ligger fast; detta prov inför inga nya detaljvarianter.

## Öppna

På prototypgrenen med projektets beroenden tillgängliga:

```sh
npm run prototype:objects
```

[Skapa ett objekt på port 4180](http://localhost:4180/?prototype=objects&variant=B&view=new-object&theme=light).
Den delade förhandsvisningen finns också på
[port 5173](http://localhost:5173/?prototype=objects&variant=B&view=new-object&theme=light).
För direkt prov av typbyte, öppna
[Familjeabonnemangets redigering](http://localhost:5173/?prototype=objects&variant=B&view=edit&theme=light).

## Skapa ett objekt

1. Ange exempelvis **Cykeln vid garaget** och välj **Fordon**. Typens
   avsnitt visas i samma formulär. Alla egenskaper är valfria.
2. Ange en beskrivning. Stäng panelen och välj **Aktuell status →
   Fortsätt redigera**. Oskickade uppgifter finns kvar.
3. Välj **Lägg till i utkastet**. Objektet visas med privat förslag i
   kartan, listan och detaljerna. Det kan nu väljas i ett nytt samband.
4. Lägg till att Alex använder cykeln. Spara hela utkastet. Under
   **Prova tillstånd**, välj **Kvitto: sparat**. Samma kvitto omfattar
   det nya objektet och sambandet.

En egen objekttyp som ligger i utkastet går också att välja. Öppna
**Hantera typer i Inställningar**, skapa typen och dess egenskaper,
lägg typdefinitionen i utkastet och återgå till det oskickade objektet.
Samma namn på två objekt tillåts och leder inte till sammanslagning.

## Byt typ

1. Öppna Familjeabonnemangets redigering och **Anpassa typen i
   Inställningar**. Lägg till den egna textegenskapen **Kundnummer**
   och lägg typändringen i utkastet.
2. Återgå, ange **A-42** och lägg objektets ändring i utkastet.
3. Välj en annan typ under **Byt typ**. Den nya typens egna fält börjar
   tomma. Tidigare fältvärden visas separat, med ursprunglig typ och namn.
4. För över de värden du vill behålla manuellt. Bekräfta **Jag har
   hanterat tidigare fältvärden för typbytet** före placering i utkastet.
5. Öppna **Uppgifter utanför typens avsnitt**. Befintliga gemensamma
   uppgifter, exempelvis priset 189, finns kvar även när den nya typen
   inte placerar dem i något avsnitt. Namn och samband består också.

Att byta fram och tillbaka kopierar inte värden automatiskt. Tidigare
ifyllda egna värden från flera typbyten visas tillsammans under pågående
redigering. Flytt av en egenskap mellan avsnitt inom samma typ har den
redan godkända regeln: egenskapens identitet och värden består.

## Befintliga produktregler

Läsningen av originalkoden gäller version
[`466f5df`](https://github.com/viscalyx/skyttel/tree/466f5dfb33fc70114587f36360bd0ed406a3e208).
Provet prövar gränssnittet för följande befintliga regler:

- Namn och typ krävs. Namnet får ha högst 200 tecken och beskrivningen
  högst 2 000. Egna fält är frivilliga; tomt svar skiljer sig från noll
  och nej. Se [objektguiden](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/docs/user-guide/map.md).
- **Identifierat objekt**, **Ospecificerat objekt** och **Obesvarad
  identitetsfråga** är olika val. Ett obesvarat identitetsval får ligga
  i utkastet men blockerar hela sparandet. Provet visar ett begripligt
  besked och en väg till objektet när användaren försöker spara.
- Typbyte behåller gemensamma uppgifter och samband. Den nya typens egna
  fält får inga automatiskt överförda värden, även om fältnamn och
  värdeslag stämmer. Tidigare värden kräver uttrycklig hantering. Se
  [guiden för objekttyper](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/docs/user-guide/object-types.md).

## Bilder

[Skapande på dator](skapa-dator.png) och [på mobil](skapa-mobil.png).
[Typbyte på dator](typbyte-dator.png) och [på mobil](typbyte-mobil.png).

## Verifiering och begränsningar

Lokala Chromium-prov omfattar skapande, oskickad redigering över
panelstängning och Inställningar, valideringsfokus, egna typer och fält,
gemensamma uppgifter vid typbyte och uttrycklig hantering av tidigare
egna värden. Nya objekt finns i karta och lista och kan vara ändpunkter
för samband innan utkastet sparas. Kvitto omfattar objekt och samband
tillsammans. Obesvarad identitet blockerar sparandet och kan rättas.
Omflöde vid 390 och 320 pixlars bredd ingår.

Talets ändrade betalning och manuella samband fungerar i samma sparande.
Typkontroll, riktad Biome, Markdown, stavning och produktionsbygget
passerar. Prototypens ingång ingår inte i produktionspaketet. Bygget
visar projektets befintliga varning om ett stort klientpaket.

Tillstånd finns endast i minnet. Omladdning tömmer provet. Tal och
sparresultat är simulerade. Provet ger inget nytt beständigt
produktionsstöd och ersätter inte den verkliga utkastmodellen.

Profilbilder, historik, ångring, borttagning, återställning,
sammanslagning och fullständig konflikthantering återstår i designarbetet.
Tillgänglighetsmålet är WCAG 2.2 AA; detta prov fastställer inte
fullständig överensstämmelse. Fysiska enheter, skärmläsare, verkligt tal
och verklig webbläsarzoom behöver verifieras separat.

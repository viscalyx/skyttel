# Pröva profilbild och valfri ikon inom B

Kastbart underlag för
[Hur utformas listor, detaljer och redigering som öppnas vid behov?](https://github.com/viscalyx/skyttel/issues/107).
Alla objekttyper kan ha en profilbild, exempelvis en tjänsts logotyp.
Utan bild visas objektets valda ikon och annars typens standardikon.
Ikonvalet ändrar endast det aktuella objektet.

## Grund och biblioteksval

Grenen `prototype/skyttel-object-icons` börjar på godkända
[`8d48596e584a0ee2d2200abd9ac3869a7a24f6b4`](https://github.com/viscalyx/skyttel/tree/8d48596e584a0ee2d2200abd9ac3869a7a24f6b4).
Se [godkännandet och önskat ikonval](https://github.com/viscalyx/skyttel/issues/107#issuecomment-5848133931).
B, kartan A, fria paneler och D:s talåterkoppling ligger fast.

Beställaren väljer Lucide. Hela katalogen från version 1.48.0, med
1 854 ikoner, finns lokalt i provet. Namn och engelska nyckelord samt
vanliga svenska sökord är sökbara. Svenska benämningar finns för vanliga
motiv; hela katalogen är inte översatt. Se
[källor, version och licens](SOURCE.md).

## Öppna

På grenen med projektets beroenden tillgängliga:

```sh
npm run prototype:icons
```

[Öppna ikonprovet på port 4182](http://localhost:4182/?prototype=icons&variant=B&view=edit&theme=light).
Den delade förhandsvisningen finns på
[port 5173](http://localhost:5173/?prototype=icons&variant=B&view=edit&theme=light).

## Pröva

1. Öppna avsnittet **Ikon** under **Profilbild**. Sök exempelvis efter
   **musik**, **cykel**, **hus** eller ett engelskt ikonnamn. Alla ikoner
   kan väljas oberoende av objekttyp. Bläddra för att se fler träffar.
2. Välj en ikon. Den visas direkt i kartan, listan och bildens tomma
   förhandsvisning. Valet är ett privat förslag i samma utkast som text.
3. Välj **Prova tillstånd → Använd provbild på Familjeabonnemang**.
   Bilden visas först. Ikonvalet finns kvar under bilden.
4. Välj **Ta bort profilbild**. Den valda ikonen visas igen. Byt objektets
   typ och kontrollera att bild och eget ikonval består.
5. Välj **Typens standardikon** för att återgå till typens symbol.
   Återgång till ett redan sparat ikonval tar bort endast ikonförslaget.
6. Öppna det valfria utkastet för att jämföra före och efter. Välj
   **Spara hela utkastet** och **Prova tillstånd → Kvitto: sparat**.
   Text, bild och ikon har samma kvitto och räknas som ett objektförslag.

Oskickad text och nya objekt läggs först i utkastet. Därefter går det att
välja bild och ikon. Stängning av panelen bevarar förslaget. Under
bildbehandling och pågående eller okänt sparande är ikonändringar
blockerade. **Kvittot saknas → Kontrollera sparresultat** behåller samma
försök och föreslagna värden.

## Originalkod och fortsatt genomförande

Originalkoden stöder profilbilder på objekt men saknar ett sparat eget
ikonval. Dess lokala typsymboler är handskriven SVG och något externt
ikonbibliotek är inte installerat. Lucide är därför ett nytt uttryckligt
biblioteksval. Produktionsstödet följs i
[Låt objekt ha en valfri sökbar ikon från Lucide](https://github.com/viscalyx/skyttel/issues/118).

## Verifiering och begränsningar

Chromium-prov passerar för sökning, sidbyte, tomma träffar,
tangentbordsval, fokus, skapande, typbyte och stängning av paneler.
Bild, ikon och text räknas som ett objektförslag och visas i samma kvitto.
Bildens företräde, återgång till vald ikon, typens standardikon i listan
och spärrar under bildbehandling och okänt sparande är kontrollerade.
Mobilbredder 390 och 320 ger inget horisontellt överflöde. Inga sidfel
upptäcks i dessa prov.

Typkontroll, riktad Biome, Markdown och stavning passerar.
`NODE_ENV=production npm run build` passerar och innehåller inga
prototypmarkörer eller ikondata. Projektets befintliga varning om ett
stort klientpaket kvarstår. Ikonernas former och licens jämförs mot det
låsta originalunderlaget. Inga paketberoenden ändras.

Se [datorbilden](ikoner-dator.png) och [mobilbilden](ikoner-mobil.png).

Tillstånd finns bara i minnet och töms vid omladdning. Bilder laddas
inte upp. Sökning och ikoner använder inga externa anrop. Tal och
sparresultat är simulerade. Prototypen är endast tillgänglig i
utvecklingsläget och ingår inte i produktionspaketet.

WCAG 2.2 AA är designkrav. Provet är inte en fullständig verifiering.
Fysiska enheter, skärmläsare och verklig webbläsarzoom behöver prövas
separat. Fullständiga konfliktval och livscykelflöden återstår i
designarbetet. Ikonväljaren inväntar beställarens återkoppling.

# Arkiv över nollreferenser och tillhörande navigering

Det här registret är för den som ska återfinna, köra eller jämföra
prototyperna inför implementation. Omfattningen är nollreferenserna och
den tillhörande navigeringen, inte projektets andra prototyparbeten.

Börja med [implementationsunderlaget](../../docs/design/nollreferenser-och-navigering.md).
Det innehåller godkända krav och verifieringskrav. Experimentens tillfälliga
förval och äldre bilder får inte ersätta de senaste besluten.

## Fasta versioner för varje steg

Varje länk nedan använder en fullständig commitidentitet. Den pekar därför
på samma källversion även när prototypgrenen får nya ändringar.
Grenarna `prototype/zero-reference-planes-live` och
`prototype/zero-reference-planes-concept` finns på origin.
Behåll dem som arkiv; de är inte produktionsgrenar att slå samman.

### Konceptbilder

[Källversion och tillgångar](https://github.com/viscalyx/skyttel/tree/00198e0aacc3238c7bf300946e0c9a48fc251e4e/prototypes/zero-reference-planes).

Tre visuella styrkor; visar riktning, inte verklig geometri eller slutlig funktion.

### Första jämförelsen i appen

[Källversion och tillgångar](https://github.com/viscalyx/skyttel/tree/96b402a176e674b7d8af55b54eb564611c2b9d46/prototypes/zero-reference-planes-live).

Kvadrat/oval och tre styrkor; mindre provmått än de slutligt valda.

### Större ovaler

[Källversion och tillgångar](https://github.com/viscalyx/skyttel/tree/a3546e36cac46b3ae26d21b3876c4f719ec43e9a/prototypes/zero-reference-planes-live).

Halvaxlarna 27 och 18,9.

### Cirkelvarianten

[Källversion och tillgångar](https://github.com/viscalyx/skyttel/tree/3168fb0a6b612611cf150fc497d966968798fd29/prototypes/zero-reference-planes-live).

Cirkel med radie 27 tillkommer.

### Kvadrat och cirkel får jämförbara mått

[Källversion och tillgångar](https://github.com/viscalyx/skyttel/tree/c7674dfcd9b100a167fc600650695c1991fc0ef2/prototypes/zero-reference-planes-live).

Kvadratens sida motsvarar cirkelns diameter.

### Linjer och alla tolv kombinationer

[Källversion och tillgångar](https://github.com/viscalyx/skyttel/tree/0167f510df5c091e0879eabea7617ae278a2685e/prototypes/zero-reference-planes-live).

Fyra varianter med tre styrkor; Cirkel och Diskret är förval.

### Första jämförelsen av toning

[Källversion och tillgångar](https://github.com/viscalyx/skyttel/tree/26ca4ee3cd1c57698cab0181dbc15a96e3672ab3/prototypes/zero-reference-planes-live).

Svag ton jämförs med innehåll framför planen; fasta tonvärden är provvärden.

### Stark ton och kamerakostnad

[Källversion och tillgångar](https://github.com/viscalyx/skyttel/tree/4ba7e02f7d429a6047e81ca545ebdf0847621ee5/prototypes/zero-reference-planes-live).

Starkare ton, reglage och vektorbaserad toning; 60 procent är inte produktförval.

### Positionsdel i egenskaperna

[Källversion och tillgångar](https://github.com/viscalyx/skyttel/tree/ffe2ff25fd2953e164017a6465b22af36d76c893/prototypes/zero-reference-planes-live).

Tre alternativ finns som underlag. Placeringen i egenskaperna är bortvald.

### Koordinater i navigeringsfönstret

[Källversion och tillgångar](https://github.com/viscalyx/skyttel/tree/d80e5587afb713d1137b13bd94b731a986b61222/prototypes/zero-reference-planes-live).

Tre fält i rad ovanför objektflyttknapparna. Verkställningsknappen är bortvald.

### Direkt flytt vid giltigt värde

[Källversion och tillgångar](https://github.com/viscalyx/skyttel/tree/120ffd87326b26c2b6a2505f8c79672b2e6a86c6/prototypes/zero-reference-planes-live).

Ingen verkställningsknapp; axlarna valideras oberoende.

### Två decimaler och infoikon

[Källversion och tillgångar](https://github.com/viscalyx/skyttel/tree/7981112afab2cfdac72df639bc5a132926a31b82/prototypes/zero-reference-planes-live).

Avrundning, infoikon, ingen dubbel positionstext och ingen rotationsmening.

### Slutlig minivy i denna granskning

[Källversion och tillgångar](https://github.com/viscalyx/skyttel/tree/ee7a31709c158deb774c483379aa96de7d72e482/prototypes/zero-reference-planes-live).

Rubrik, infoikon och öppen hjälp döljs i miniläge; koordinaterna finns kvar.
Denna källversion har fälten i en rad. Implementationsunderlaget kräver
i stället en kolumn med tre rader i miniläget.

## Bilder och rapporter i den aktuella grenen

<!-- markdownlint-disable MD013 -->
| Underlag | Innehåll och begränsning |
| --- | --- |
| [Konceptbilder och prompter](../../.codex/artifacts/zero-reference-planes/) | Diskret, ursprunglig och framträdande i flera bakgrunder; illustrerade bilder, inte verklig rendering. |
| [Tidigt planutkast](../../.codex/artifacts/planes-first.png) och [ovalutkast](../../.codex/artifacts/planes-oval.png) | Kompletterande visuella referenser, inte måttspecifikationer. |
| [Gles karta](evidence-9/) | Nio objekt, teman, bakgrunder, kamera, lokal flytthjälp och observationsrapport. |
| [Tät karta](evidence-80/) | Åttio objekt, teman, bakgrunder, kamera och observationsrapport. |
| [Svag ton](evidence-depth/) | Jämförelse mellan ofärgat och tonat, passager genom plan, rotation och närbild. |
| [Stark ton](evidence-depth-strong/) | Alla varianter, båda teman, toning, kamera, mobilvy och observationsrapport. |
| [Kameramätning](evidence-motion/) | Före/efter vid samma lilla provkarta; inga generella prestandalöften. |
| [Positionsförsök](evidence-position/) | Både bortvalda och aktuella gränssnitt; välj rätt bild enligt nedan. |
<!-- markdownlint-enable MD013 -->

Bilderna i `evidence-9` och `evidence-80` visar de första kvadrat- och
ovalmåtten. De bevisar inte de större slutmåtten eller alla tolv
kombinationer. Källversionerna för formändringarna ovan visar de exakta
stegen. Konceptbilder visar inte kamera, klippning eller tillgänglighet.

### Vilka positionsbilder beskriver nuvarande riktning?

- [Normal navigering med infoikon](evidence-position/navigation-precision.png).
- [Koordinatförklaringen](evidence-position/navigation-precision-help.png).
- [Arkiverad minivy med koordinatraden](evidence-position/navigation-mini-fields.png).

Dessa tre bilder ska läsas tillsammans. Normalvyns rubrik och infoikon
ska inte tas med till minivyn. Den synliga minivyn får inte användas som
skäl att ta bort tillgängliga namn från fälten.
Minibilden visar den arkiverade radlayouten. Den beslutade minivyn staplar
X, Y och Z i tre rader för mer läsbara värden; bilden visar inte det kravet.

Övriga positionsbilder är historiska experiment:

- `a-*`, `b-*` och `c-*` visar den bortvalda placeringen i egenskaperna.
- `navigation-normal`, `navigation-mini` och `navigation-mobile` visar
  försöket med verkställningsknapp, som inte ska implementeras.
- `navigation-immediate` visar direktflytten före tvådecimalspresentation
  och infoikon. Den är inte den slutliga visuella förebilden.

## Återkörning och bevarande

[Körguiden](README.md) och [positionsguiden](POSITION.md) beskriver
`npm run prototype:planes`, den syntetiska inloggningen och den tillfälliga
databasen. Kör kommandot från den version som ska jämföras, i en separat
arbetskopia. Äldre versioner kan ha andra beroenden och bara delar av
experimentet. Använd deras egna låsfiler och körguider.

Den lokala adressen och dess port är tillfälliga och är inte arkivet.
Arkivet består av pushad kod, bilder, prompter, rapporter och detta register.
Ingen ny generering av bilder eller billbara modell-/röstanrop behövs för
att läsa underlaget. Ingen prototyp behöver köras för att förstå kraven.

[Manifestet](archive-manifest.json) listar de fasta källversionerna samt
filstorlek och SHA-256 för den bevarade körbara koden och tillgångarna.
Guidernas text ligger i Git; manifestet hashar inte sig självt eller de
löpande guiderna. Kontrollera filerna mot manifestet innan arkivet flyttas.
Bevara även äldre bilder när nya granskningsbilder tillkommer, och märk
vad varje bild visar i registret. Skriv inte över historiska bevis med en
ny körning av fångstskripten utan att bevara deras källversion.

## Bevisens gränser

Rapporterna beskriver en viss provkarta och miljö. En låg bildkostnad,
etiketter som syns på en bild eller en godkänd kodkontroll betyder inte att
alla kartor, bakgrunder, hjälpmedel och enheter fungerar. Prototypen för
positioner använder bara minne. Inställningslagring, slutlig automatisk
visning, zoomrespons och tillgänglighetskrav ska hanteras
utifrån implementationsunderlaget, inte antas vara klara i experimentet.

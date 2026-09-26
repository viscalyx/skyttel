# Pröva typer, egenskaper och avsnitt i Skyttel

Kastbar vidarebyggnad av detaljvariant B i
[Hur utformas listor, detaljer och redigering som öppnas vid behov?](https://github.com/viscalyx/skyttel/issues/107).
Användaren väljer B:s avsnitt och vill kunna anpassa både objekttyper och
sambandstyper från Inställningar. Frågan är hur egna egenskaper och avsnitt
fungerar tillsammans med kartan, detaljerna och det gemensamma sparandet.

B ligger fast i denna omgång. Här finns ingen ny jämförelse mellan A, B
och C. Alla förifyllda och egna typer ska kunna redigeras. Egenskaper ska
kunna flyttas mellan egna avsnitt eller döljas utan att värden försvinner.
Sambandstyper ska kunna användas mellan valfria objekt.

[Typredigeringen är godkänd](https://github.com/viscalyx/skyttel/issues/107#issuecomment-5847845443).
Nästa prov gäller [skapande och typbyte av objekt](../object-study-assets/README.md).

## Grund och produktionsstöd

Grenen `prototype/skyttel-types-sections` utgår från
[`762f89bb7a384d57aa64c91b4e867c113c2d3e9d`](https://github.com/viscalyx/skyttel/tree/762f89bb7a384d57aa64c91b4e867c113c2d3e9d).
Den behåller kartan A, de fria panelerna, listan B och
[D · Kartan berättar](https://github.com/viscalyx/skyttel/issues/106#issuecomment-5847031061).
Typdefinitioner och ändrade värden använder samma privata utkast och
simulerade sparande som samtalet. Bekräftat kvitto krävs innan förslagen
visas som sparade. Oskickade formulär ingår inte i sparandet.

Originalkoden har redan redigerbara objekt- och sambandstyper, egna fält
på objekttyper och fria kombinationer av objekt i samband. Egna avsnitt
och egna egenskaper på samband behöver tillkomma i produktionen.
[Granskningen av originalkoden](originalkod.md) skiljer befintligt stöd
från det som saknas. Genomförandet följs i
[Gör typers egenskaper och avsnitt redigerbara från Inställningar](https://github.com/viscalyx/skyttel/issues/116).

## Öppna

På prototypgrenen med projektets beroenden tillgängliga:

```sh
npm run prototype:types
```

Öppna
[B med redigerbara typer på port 4179](http://localhost:4179/?prototype=types&variant=B&view=detail&theme=light).
Den delade förhandsvisningen kan också öppnas via
[port 5173](http://localhost:5173/?prototype=types&variant=B&view=detail&theme=light).

**Prova tillstånd** innehåller grundens kontroller för simulerat tal och
sparresultat. Provets hushållsuppgifter är påhittade.

## Pröva en objekttyp

1. Öppna **Inställningar → Objekt- och sambandstyper**. Välj
   **Objekttyper** och **Abonnemang**. Ändra namnet på ett avsnitt eller
   välj **Lägg till avsnitt** och ange ett eget namn.
2. Välj **Lägg till egen egenskap**. Ange namn, välj text, tal, datum eller
   ja/nej och välj avsnitt. Prova att ändra ordningen med knapparna.
3. Välj **Lägg typändringen i utkast**. Öppna Familjeabonnemangets detaljer
   och redigering. Avsnitten och egenskaperna följer typförslaget. Fyll i
   ett värde och lägg objektets ändring i utkastet.
4. Återvänd till typen i Inställningar. Flytta egenskapen till ett annat
   avsnitt och lägg typändringen i utkastet. Kontrollera värdet i
   Familjeabonnemanget. Prova sedan **Dölj** och visa egenskapen igen genom
   **Visa i avsnitt**. Värdet ska finnas kvar.
5. Spara utkastet med grundens sparbesked och simulerade kvitto. Typens
   definition och objektets värden ingår i samma sparande. Pröva även att
   lämna formulär oskickade, stänga panelen och öppna arbetet igen.

För objekt kan **Lägg till gemensam egenskap** placera exempelvis
beskrivning, pris eller startdatum i typens avsnitt. Befintliga
egenskapers värdeslag ligger fast så att deras värden inte tolkas om.

## Pröva ett fritt samband

1. Välj **Sambandstyper** i samma inställningar och sedan
   **Ny sambandstyp**. Ange exempelvis **Kontaktväg**, med benämningarna
   **har kontaktadress** och **är kontaktadress för**.
2. Skapa avsnittet **Kontaktuppgifter** och en egen textegenskap
   **Anteckning** i avsnittet. Lägg typändringen i utkastet.
3. Öppna **Nytt samband**. Välj **Gemensamt bankkonto** som startobjekt,
   den nya sambandstypen och `alex@example.test` som målobjekt. Ange
   en anteckning och välj **Lägg sambandet i mitt utkast**.
4. Kontrollera sambandet och anteckningen. Prova att flytta eller dölja
   egenskapen via typen och sedan visa den igen. Förslagen använder samma
   utkast som objekten och typdefinitionerna.
5. Prova talets exempel med ändrad betalning. Spara med samma sparflöde
   och jämför sambanden med kvittot. Ett nytt identiskt samband ska
   stoppas med ett begripligt besked.

Sambandets start- och målobjekt väljs fritt. Exemplet med bankkonto och
e-postadress demonstrerar att kombinationen inte låses av objekttyperna.

## Skärmbilder

| Innehåll | Dator | Mobil |
| --- | --- | --- |
| Typer i Inställningar | [Dator](typer-dator.png) | [Mobil](typer-mobil.png) |
| Samband med egna egenskaper | [Dator](samband-dator.png) | [Mobil](samband-mobil.png) |

[Objektets egna avsnitt på mobil](avsnitt-mobil.png).

## Verifiering

Lokala Chromium-prov av samband passerar: manuell redigering, talets
betalningsförslag, gemensamt simulerat sparande och dubblettkontroll.
Sambandsflödet fungerar i provet vid mobilbredden 390 pixlar.

Det samlade Chromium-provet passerar för byte av typnamn till
Musikavtal, ett eget Kontaktavsnitt med Kundnummer samt flytt av Pris
med värdet 189 bevarat. Oskickade uppgifter finns kvar när Inställningar
öppnas och stängs. Döljning och återvisning behåller fältvärdet A-42.

En ny sambandstyp med avsnittet Bakgrund och egenskapen Anledning kan
koppla bankkontot till e-postadressen. Definitioner, objektvärden och
sambandsvärden ingår i samma utkast och bekräftade kvitto. Mobilprov vid
390 och 320 pixlars bredd passerar utan fel i webbläsaren. Fokus vid
valideringsfel och unika fält-ID i samtidiga paneler passerar också.

Typkontroll, riktad Biome, Markdown, stavning och produktionsbygget
passerar. Prototypen ingår inte i produktionspaketet. Bygget visar
projektets befintliga varning om ett stort klientpaket.

## Begränsningar

Tillstånd finns bara i minnet och töms vid omladdning. Tal, extern
behandling och sparresultat är simulerade. Provet tillför inget beständigt
produktionsstöd och ersätter inte produktregeln om bevarade privata utkast.

Egna egenskaper har fyra värdeslag: text, tal, datum och ja/nej. Byte av
objekttyp på befintliga objekt, skapande av objekt, bilder, livscykel,
historik och fullständig konflikthantering är inte färdigprovade här.
Ärendet om listor, detaljer och redigering förblir öppet för återstående
arbete och beslut.

WCAG 2.2 AA är designkrav. Provet fastställer inte fullständig
överensstämmelse. Fysiska enheter, verkligt tal, skärmläsare,
webbläsarzoom och hela arbetsflöden behöver verifieras separat.

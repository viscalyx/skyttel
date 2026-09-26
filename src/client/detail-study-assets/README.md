# Pröva detaljer och redigering i Skyttel

Kastbart underlag för nästa omgång i
[Hur utformas listor, detaljer och redigering som öppnas vid behov?](https://github.com/viscalyx/skyttel/issues/107).
Frågan är hur uppgifter och redigering av ett befintligt objekt blir
överskådliga, även med många fält och ofullständig information.
**B · Avsnitt** är vald riktning. Vidarebyggnaden ska ge både objekt-
och sambandstyper redigerbara egenskaper och egna avsnitt under
Inställningar. Se [nästa prototypunderlag](../type-study-assets/README.md).

## Grund och avgränsning

Grenen `prototype/skyttel-details-editing` utgår från
[`63818783cca6cef036e5231448ee53d72ade690d`](https://github.com/viscalyx/skyttel/tree/63818783cca6cef036e5231448ee53d72ade690d).
[Listan B är godkänd som delbeslut](https://github.com/viscalyx/skyttel/issues/107#issuecomment-5847411453),
med flera typval och Bara markerade under Filter samt separat Sortering.
Listan ligger fast i denna omgång.

[D · Kartan berättar](https://github.com/viscalyx/skyttel/issues/106#issuecomment-5847031061)
och dess grund
[`5c09ac5778b4a649292b5535b2f652f5da427c07`](https://github.com/viscalyx/skyttel/tree/5c09ac5778b4a649292b5535b2f652f5da427c07)
ingår i grenens historik. Kartan A, de fria panelerna, tal och text
består. Redigeringen använder samma privata utkast och sparande, med
bekräftat kvitto innan ändringar räknas som sparade.

Underlaget omfattar namn, beskrivning och nio ekonomiska uppgifter på
befintliga objekt: pris, valuta, betalningsintervall, startdatum,
slutdatum, avtalsvillkor, skuld, kreditutrymme och utnyttjad kredit.
Skuld och kredit kan ha ett eget datum för uppgiften. Belopp är
beskrivande text. Säkerheten skiljer Ej uppgivet, Känt, Okänt,
Uttryckligen inget och Osäkert uppgivet.

Skapande av objekt, redigering av samband, egna typer och fält,
profilbilder, livscykel, historik, sammanslagning, borttagning och
återställning återstår inom samma beslutsärende. Grundens begränsade
priskonflikt kan behålla det egna förslaget; övriga konfliktval och
fullständiga konflikter återstår. Listans delbeslut avslutar inte ärendet.

## Öppna och jämför

På prototypgrenen med projektets beroenden tillgängliga:

```sh
npm run prototype:details
```

- [A · Läs och ändra](http://localhost:4178/?prototype=details&variant=A&view=detail&theme=light):
  uppgifterna följer i en sammanhängande vy.
- [B · Avsnitt](http://localhost:4178/?prototype=details&variant=B&view=detail&theme=light):
  avsnitt med sammanfattningar öppnas vid behov.
- [C · Flikar](http://localhost:4178/?prototype=details&variant=C&view=detail&theme=light):
  uppgifter, ekonomi och tid visas var för sig.

Pilarna längst ned byter detaljvariant utan omladdning. Listan behåller
godkända B. **Prova tillstånd** innehåller grundens kontroller för
simulerat tal, sparresultat och användning utan kartgrafik.

## Pröva

1. Läs Familjeabonnemangets uppgifter i A, B och C. Välj
   **Redigera uppgifter**, ändra namn och beskrivning och jämför hur
   lätt det är att hitta tillbaka till samma uppgifter.
2. Ändra priset till `250` och välj **Osäkert uppgivet**. Jämför
   slutdatum som **Okänt**, **Uttryckligen inget** och **Ej uppgivet**.
   Välj sedan **Känt** utan värde och pröva **Lägg i utkast** för att se
   felbeskedet och vägen till rätt fält.
3. Under **Skuld och kredit**, ange en senast uppgiven skuld och ett
   datum för uppgiften. Lämna övriga belopp obesvarade. Kontrollera att
   både säkerheten och datumet går att läsa och rätta.
4. Lämna redigeringen oskickad. Byt variant, öppna en annan panel,
   stäng objektets panel och öppna objektet igen. Växla mellan mobil
   och dator och kontrollera att påbörjat arbete finns kvar.
5. Välj **Lägg i utkast** och öppna hela utkastet. Pröva även talets
   exempel och kontrollera hur dess prisförslag samspelar med manuell
   redigering. Spara hela utkastet och välj ett simulerat kvitto i
   provkontrollerna. Jämför uppgifter, lista, karta och kvitto. Prova
   också okänt sparresultat och kontroll av samma försök.

Alla hushållsuppgifter är påhittade. Tal, extern behandling och
sparresultat är simulerade. Tillstånd finns bara i minnet och töms vid
omladdning. Detta ändrar inte produktregeln om beständiga privata utkast.
Oskickad redigering ingår inte i sparandet.

## Skärmbilder

| Alternativ | Dator | Mobil |
| --- | --- | --- |
| A · Läs och ändra | [Dator](A-dator.png) | [Mobil](A-mobil.png) |
| B · Avsnitt | [Dator](B-dator.png) | [Mobil](B-mobil.png) |
| C · Flikar | [Dator](C-dator.png) | [Mobil](C-mobil.png) |

[Redigering på mobil](redigering-mobil.png) och
[textarbete utan kartgrafik](utan-grafik-mobil.png).

## Verifiering

Lokala Chromium-prov passerar för A, B och C: namnvalidering och tomt
pris, fokus på felsammanfattningen och länk till rätt fält, osäkert
belopp och daterad okänd skuld. Mobilvyer på 390 × 844 och 320 × 400
ger ingen horisontell sidrullning.

Samspelet med D passerar i mörkt tema: talets prisförslag uppdaterar
orörda fält medan egen oskickad text består. Oskickad redigering och
mikrofonläge finns kvar över panelstängning och variantbyte. Manuell
rättelse visas i samma utkast, lista och verifierade kvitto. Väntande
och okänt sparresultat spärrar formuläret tills försöket kontrolleras.
Ett återställt pris tar bort förslaget och dess listmarkering.

Det begränsade konfliktprovet visar det aktuella prisförslaget och kan
behålla det utan att starta ett AI-samtal. Valet sparar inget; ett nytt
sparbesked krävs. Flikval med tangentbord, unika fält i två samtidiga
paneler, byte mellan mobilpaneler och textarbete utan kartgrafik passerar.

Typkontroll, riktad Biome, Markdown och stavningskontroll passerar.
Produktionsbygget med `NODE_ENV=production npm run build` passerar;
detaljprototypen ingår inte i dess klientpaket. Bygget visar projektets
befintliga varning om ett stort klientpaket.

WCAG 2.2 AA är fortsatt designkrav. Underlaget fastställer inte
WCAG-överensstämmelse i den färdiga applikationen. Fysiska enheter,
verkligt tal, skärmläsare, webbläsarzoom och hela beslutsärendets flöden
behöver verifieras. Produktionsimplementation och driftsättning ingår
inte.

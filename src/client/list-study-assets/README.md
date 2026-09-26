# Pröva listor i Skyttel

Kastbart underlag för första omgången i
[Hur utformas listor, detaljer och redigering som öppnas vid behov?](https://github.com/viscalyx/skyttel/issues/107).
Underlaget prövar hur användaren hittar och väljer rätt objekt bland få
eller flera hundra objekt. **B · Typkatalog** är godkänt listmönster i
[delbeslutet om listor](https://github.com/viscalyx/skyttel/issues/107#issuecomment-5847411453).
Valet innebär inte ett slutligt godkännande av hela beslutsärendet.

Beställarens återkoppling placerar typkatalogen under **Filter** och
behåller **Sortering** som en separat kontroll. I vidarebyggnaden samlas
typkatalog och **Bara markerade** under **Filter**, som öppnas vid behov.
Flera typer kan kryssas i samtidigt. Resultaten omfattar objekt av någon
av de valda typerna. Utan valda typer visas alla typer; **Alla typer**
nollställer typvalen. Listan behåller sin gruppering efter typ och
sorteringen styrs separat. Den reviderade utformningen är godkänd;
övriga frågor i samma beslut finns kvar nedan.

## Godkänd grund

Grenen `prototype/skyttel-lists-editing` utgår direkt från
[`5c09ac5778b4a649292b5535b2f652f5da427c07`](https://github.com/viscalyx/skyttel/tree/5c09ac5778b4a649292b5535b2f652f5da427c07)
på `prototype/skyttel-voice-feedback`. Startversionen är verifierad som
förfader före kodändringar.

[D · Kartan berättar](https://github.com/viscalyx/skyttel/issues/106#issuecomment-5847031061)
ligger fast: tal, text, gemensamt privat utkast, kartans ändringsmarkeringar
och verifierad sparåterkoppling använder samma prototyp som tidigare.
Kartan A och de fria panelerna består. A/B/C i denna omgång gäller
enbart listans struktur. Samtalsprototypens egen ingång finns kvar.

## Öppna underlaget

På prototypgrenen, med projektets beroenden tillgängliga:

```sh
npm run prototype:lists
```

[Öppna kartan med B](http://localhost:4177/?prototype=lists&variant=B&theme=light).
Välj **Sök i kartan** för att öppna listan, eller
[öppna B · Typkatalog direkt](http://localhost:4177/?prototype=lists&variant=B&view=list&theme=light).
De tidigare alternativen finns kvar som jämförelseunderlag:

- [A · Kompakt lista](http://localhost:4177/?prototype=lists&variant=A&view=list&theme=light).
- [C · Sök och inspektera](http://localhost:4177/?prototype=lists&variant=C&view=list&theme=light).

Pilarna längst ned byter alternativ utan omladdning. Där visas också
antal objekt, markeringar, oskickade redigeringar och privata förslag.
**Prova tillstånd** innehåller val av litet eller stort hushåll och
grundens kontroller för simulerat tal, sparande och användning utan grafik.
`size=small` i länken öppnar det lilla hushållet direkt.

## Pröva och jämför

1. Sök efter **cykeln 42** i det stora hushållet. Öppna detaljer för
   träffen och gå tillbaka till listan. Sökningen och urvalet finns kvar.
2. Töm sökningen i B. Öppna **Filter** och kryssa i både **Avtal** och
   **Fordon** i typkatalogen. Kontrollera att båda typerna visas i sina
   grupper över listsidorna. Stäng Filter, byt ordning med kontrollen
   **Sortering** och bläddra till nästa sida. Markera flera objekt,
   öppna samma Filter igen och välj **Bara markerade**. Välj **Alla typer**
   för att nollställa typvalen; markeringarna finns kvar. Avmarkera
   **Bara markerade** för att visa alla objekt igen.
3. Välj ett objekts handling för att visa det i kartan. Listan stängs
   medan detaljer i andra paneler finns kvar. Öppna listan igen och
   fortsätt från samma sökning och sida.
4. Bedöm B med typkatalogen under Filter och separat Sortering. A:s
   kompakta lista och C:s förhandsvisning finns kvar för jämförelse.
   I C väljer du först en träff och läser dess samband i förhandsvisningen.
5. Öppna **Visa samband som lista**. Den godkända grundens textalternativ
   för samband finns kvar. Välj **Objekt** för att återgå till jämförelsen.
6. Öppna detaljer, välj **Ändra uppgifter** och skriv ett namn. Byt
   panel, stäng den och öppna samma objekt igen. Namnet finns kvar som
   oskickad redigering. **Lägg i utkast** använder samma privata utkast
   och sparande som samtalsprototypen.
7. Byt till mobilbredd, växla mellan öppna paneler och prova båda teman.
   Upprepa sökningen utan kartgrafik och med enbart tangentbord.

Tal, extern behandling och sparresultat är simulerade. Hushållet Lind
och alla uppgifter är påhittade. Tillstånd finns bara i minnet och töms
vid omladdning. Detta ändrar inte produktregeln om beständiga privata
utkast.

## Återstående frågor i samma beslut

Fortsatt arbete utgår från B, flera samtidiga typval under Filter och
separat Sortering.
Det befintliga namnprovet är inte ett färdigt redigeringsförslag.
Följande ingår fortfarande i beslutsärendet:

- Täta detaljer, fri fälträttelse, formulär, validering och ofullständiga
  eller osäkra uppgifter.
- Skapande och ändring av objekt, samband och avtal, egna typer och fält
  samt profilbilder.
- Sammanslagning, historik, ångring, borttagning och återställning.
- Andra konfliktval än grundens begränsade prisexempel och deras
  samspel med oskickad redigering och hela det privata utkastet.

Produktreglerna för dessa flöden är underlag för utformningen, inte nya
val. Se [utkast](../../../docs/user-guide/drafts.md),
[historik](../../../docs/user-guide/history.md),
[sammanslagning](../../../docs/user-guide/object-merge.md) och
[ordlistan](../../../CONTEXT.md).

## Bedömning och verifiering

WCAG 2.2 AA är fortsatt designkrav. Prototypbedömningen ska omfatta
tangentbord, fokus vid panelbyte, resultatantal, omflöde i smala vyer
och status som kan uppfattas utan färg eller ljud. Kartans undantag för
tvådimensionellt innehåll gäller inte automatiskt listor och formulär;
se [W3C:s vägledning om omflöde](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
och [fokusordning](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html).

Lokala Chromium-prov omfattar sökning bland 500 objekt, typfilter,
sortering, sidbyte, tomma resultat, flerval och bevarad sökning, sida och
rullning när listan stängs och öppnas. Detaljer och kartval använder samma
objekt, och andra öppna paneler består. Oskickad namnredigering består
genom panelstängning och byte mellan mobil och dator. Simulerat tal lägger
till Filmlyktan i både kartan och listan; mikrofonen behåller sitt
tillstånd vid variantbyte. Manuellt utkast, okänt sparresultat, kontroll
och kvitto använder D:s befintliga flöde. Textarbete utan grafik ingår.

Kontrollresultaten ovan omfattar det första jämförelseunderlaget.
B:s samlade Filter och separata Sortering har även ett riktat prov:
123 avtal och 62 fordon ger 185 träffar när båda typerna är valda.
Typval med tangentbord, nollställning med Alla typer, kombination med
Bara markerade, sidbyte och bevarande efter stängning passerar.
Sorteringen ändrar inte resultatmängden. Mobilprov omfattar 390 × 844
och 320 × 400 utan horisontell sidrullning.

Skärmbilder finns för de tre alternativen:

| Alternativ | Dator | Mobil |
| --- | --- | --- |
| A · Kompakt lista | [Dator](A-dator.png) | [Mobil](A-mobil.png) |
| B · Typkatalog | [Dator](B-dator.png) | [Mobil](B-mobil.png) |
| C · Sök och inspektera | [Dator](C-dator.png) | [Mobil](C-mobil.png) |

Aktuella B-bilder visar den reviderade utformningen. Filter med flera
ikryssade typer visas på [dator](B-filter-dator.png) och
[mobil](B-filter-mobil.png).

Det första jämförelseunderlaget visar också
[tal och listan i mörkt tema](tal-och-lista-morkt.png) samt
[en kort mobilvy](kort-mobil.png). Mobilprov omfattar 390 × 844 och
320 × 400; innehållet rullar inom panelerna utan horisontell sidrullning.
Typkontroll, Biome, Markdown och stavningskontroll gäller underlaget.
Produktionsbygget körs med `NODE_ENV=production npm run build` och
innehåller inte prototypens ingång eller listkomponenter.

Fysiska enheter, verkligt tal, skärmläsare, verklig webbläsarzoom och
hela beslutsärendets flöden
återstår. Underlaget bevisar inte WCAG-överensstämmelse i den färdiga
applikationen. Produktionsimplementation och driftsättning ingår inte.

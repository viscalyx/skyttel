# Pröva listor i Skyttel

Kastbart underlag för första omgången i
[Hur utformas listor, detaljer och redigering som öppnas vid behov?](https://github.com/viscalyx/skyttel/issues/107).
Underlaget prövar hur användaren hittar och väljer rätt objekt bland få
eller flera hundra objekt. Inget av listalternativen är godkänt ännu.

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

[Öppna kartan](http://localhost:4177/?prototype=lists&variant=A&theme=light).
Välj **Sök i kartan** för att öppna listan. För jämförelse går det även
att öppna respektive alternativ med listan framme:

- [A · Kompakt lista](http://localhost:4177/?prototype=lists&variant=A&view=list&theme=light).
- [B · Typkatalog](http://localhost:4177/?prototype=lists&variant=B&view=list&theme=light).
- [C · Sök och inspektera](http://localhost:4177/?prototype=lists&variant=C&view=list&theme=light).

Pilarna längst ned byter alternativ utan omladdning. Där visas också
antal objekt, markeringar, oskickade redigeringar och privata förslag.
**Prova tillstånd** innehåller val av litet eller stort hushåll och
grundens kontroller för simulerat tal, sparande och användning utan grafik.
`size=small` i länken öppnar det lilla hushållet direkt.

## Pröva och jämför

1. Sök efter **cykeln 42** i det stora hushållet. Öppna detaljer för
   träffen och gå tillbaka till listan. Sökningen och urvalet finns kvar.
2. Töm sökningen. Öppna **Filter och sortering**, filtrera på **Avtal**,
   byt sortering och bläddra till nästa sida. Markera flera objekt och
   välj att bara visa markerade.
3. Välj ett objekts handling för att visa det i kartan. Listan stängs
   medan detaljer i andra paneler finns kvar. Öppna listan igen och
   fortsätt från samma sökning och sida.
4. Jämför typkatalogen i B med den kompakta listan i A. I C väljer du
   först en träff och läser en förhandsvisning med dess samband.
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

Nästa omgång bygger vidare på återkopplingen om listans struktur.
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

Skärmbilder finns för de tre alternativen:

| Alternativ | Dator | Mobil |
| --- | --- | --- |
| A · Kompakt lista | [Dator](A-dator.png) | [Mobil](A-mobil.png) |
| B · Typkatalog | [Dator](B-dator.png) | [Mobil](B-mobil.png) |
| C · Sök och inspektera | [Dator](C-dator.png) | [Mobil](C-mobil.png) |

Se också [tal och listan i mörkt tema](tal-och-lista-morkt.png) samt
[en kort mobilvy](kort-mobil.png). Mobilprov omfattar 390 × 844 och
320 × 400; innehållet rullar inom panelerna utan horisontell sidrullning.
Typkontroll, Biome, Markdown och stavningskontroll gäller underlaget.
Produktionsbygget körs med `NODE_ENV=production npm run build` och
innehåller inte prototypens ingång eller listkomponenter.

Fysiska enheter, verkligt tal, skärmläsare, verklig webbläsarzoom och
hela beslutsärendets flöden
återstår. Underlaget bevisar inte WCAG-överensstämmelse i den färdiga
applikationen. Produktionsimplementation och driftsättning ingår inte.

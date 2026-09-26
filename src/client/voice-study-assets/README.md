# Pröva talets återkoppling i Skyttel

Kastbart beslutsunderlag för
[Hur görs tal till det primära arbetssättet med tydlig återkoppling?](https://github.com/viscalyx/skyttel/issues/106).
Alternativen väntar på beställarens återkoppling. De är inte fastställda
designbeslut.

## Aktuell prövning: kartan berättar

Beställarens inriktning är att förändringarna ska framgå direkt i kartan.
**D · Kartan berättar** prövar detta med ett mindre statuskort och
markeringar på objekt, samband och deras namn. A/B/C finns kvar som
tidigare jämförelser av statuskort.

[Öppna D med exempeländringar synliga](http://localhost:4176/?prototype=voice&variant=D&changes=example&theme=light).
Ingen talstart behövs för att se exemplet.

- **Amber och penna:** ett befintligt objekt eller samband föreslås ändras.
- **Rött och kryss:** något föreslås tas bort. Den tidigare kopplingen
  finns kvar som en streckad linje tills sparandet är bekräftat.
- **Grönt och plus:** ett objekt eller samband föreslås läggas till.
  Grönt är beställarens val för nytt; det blå alternativet är borttaget.

Urval har en separat ring och ändrar inte förslagets färg. Text och
symboler kompletterar färgerna. Förändrade objekt och samband prioriteras
när namn placeras i kartan; listan ger tillgång även när etiketter inte
ryms. En förklaring av markeringarna visas på kartan bara när utkastet
innehåller ändringar. Den döljs när utkastet är tomt, även efter ett
bekräftat sparande.

Markeringarna beskriver privata förslag. De finns kvar under sparande
och vid okänt resultat. Ett verifierat kvitto gör förslagen till vanliga
uppgifter och tar bort den tidigare betalningskopplingen.
Färgerna är fastställda genom beställarens återkoppling. Det samlade
samtalsbeslutet är fortfarande öppet.

## Grund och avgränsning

Grenen `prototype/skyttel-voice-feedback` utgår från godkänd
`91ab65f6b622f749a141de9092525d3d0eca2256` på
`prototype/skyttel-map-exploration`. Startversionen ingår i grenens
historik. Kartans **A · Fri överblick**, D:s visuella grund och B:s fria
paneler används i alla samtalsalternativ.

Tal, extern behandling och sparresultat simuleras. Inga mikrofonanrop
eller anrop till en assistent görs. Hushållet Lind och alla uppgifter
är påhittade. Provets tillstånd finns bara i minnet och töms vid
omladdning. Det ändrar inte produktregeln om beständiga privata utkast.
Produktionsimplementation och driftsättning ingår inte.

## Öppna underlaget

På prototypgrenen, med projektets beroenden tillgängliga:

```sh
npm run prototype:voice
```

- [A · Senaste beskedet](http://localhost:4176/?prototype=voice&variant=A):
  det senaste beskedet och nästa handling får mest utrymme.
- [B · Två spår](http://localhost:4176/?prototype=voice&variant=B):
  samtalets tillstånd och kartans ändringar har var sin rad.
- [C · Händelseföljd](http://localhost:4176/?prototype=voice&variant=C):
  de senaste händelserna visas med den nyaste överst.
- [D · Kartan berättar](http://localhost:4176/?prototype=voice&variant=D&changes=example):
  kartan visar förändringarna med färger och symboler.

Pilarna i provpanelen byter alternativ. Samtalet, utkastet, mikrofonens
tillstånd och kartan finns kvar vid byte. Alternativets bokstav gäller
återkopplingen; kartans godkända A byts inte.

Den ursprungliga kartstudien kan fortfarande öppnas med
`npm run prototype:map` och `?prototype=map&variant=A`.

## Pröva en samtalsrunda

1. Välj mikrofonen, läs de två medgivandena och välj **Starta talsamtal**.
   Alternativet **Börja med text** finns på samma plats.
2. Öppna **Prova tillstånd** i provpanelen längst ned. Välj
   **Anslutning klar**, **Tal klart: familjeabonnemang**, **Arbete klart**
   och **Svar klart** i den ordningen. Mellan stegen visas anslutning,
   lyssnande, arbete, talat svar och privat utkast.
3. Stäng provmenyn och samtalspanelen. Jämför A, B och C. Kartans
   förslagsmarkeringar och återkopplingen finns kvar.
4. Pausa mikrofonen från verktygslådan. Öppna samtalet och skriv
   **Vad ändras?**. Texten använder samma samtal; panelbytet ändrar inte
   mikrofonens tillstånd.
5. Välj **Spara hela utkastet**. Välj sedan **Kvittot saknas** i
   provmenyn. Stäng menyn och välj **Kontrollera sparresultat** i
   återkopplingen. Välj **Kvitto: sparat** i provmenyn. **Visa kvittot**
   öppnar resultatets innehåll.

Ladda om för att börja om familjeexemplet från dess ursprungliga data.
Det är en avgränsad simulering, inte fri tolkning av godtyckliga uppdrag.
De textkommandon som stöds visas under
**Det här kan du skriva i prototypen** i samtalspanelen.

Pröva även **Tal klart: oklart kort**, **Mikrofon nekad**, **Nätet bryts**,
**Kvitto: avvisat** och **Priskonflikt**. Frågan om kortet hindrar sparande
tills den besvaras. Konfliktprovet visar återkopplingen för ett konkurrerande
pris och låter dig behålla ditt förslag före ett nytt sparbesked.
Det är en skiss av konflikthanteringens presentation; andra konfliktval
och fri rättelse av alla fält återstår att pröva i fortsatt dialog.

## Skärmbilder

Aktuellt kartförslag:

- [Grönt för nytt, ljust tema](D-gront.png).
- [Mörkt tema](D-morkt.png).
- [Mobil i mörkt tema](D-mobil.png).

Tidigare jämförelse av statuskort, från den första prototypomgången:

| Alternativ | Dator | Mobil |
| --- | --- | --- |
| A · Senaste beskedet | [Dator](A-dator.png) | [Mobil](A-mobil.png) |
| B · Två spår | [Dator](B-dator.png) | [Mobil](B-mobil.png) |
| C · Händelseföljd | [Dator](C-dator.png) | [Mobil](C-mobil.png) |

- [Okänt sparresultat med stängd samtalspanel](okant-mobil.png).
- [Kort mobilvy i mörkt tema](liten-mobil.png).

## Vad underlaget prövar

- Upptäcka och starta tal från kartan, med tydliga val för extern
  behandling och mikrofonåtkomst.
- Skilja mikrofonens tillstånd från att Skyttel arbetar, talar eller
  behöver ett svar. Pausad mikrofon och pågående svar kan förekomma
  samtidigt.
- Visa förstådd information, frågor och privata förslag även när
  samtalets text är stängd.
- Öppna samtal och utkast vid behov. Textinmatning finns i samma samtal.
- Skilja oskickad manuell redigering från ändringar i det privata
  utkastet. Alla ändringar i utkastet omfattas av samma sparande.
- Visa skillnaden mellan pågående sparande, bekräftat resultat, känt
  fel, konflikt och okänt resultat.
- Avsluta rösten utan att kasta utkast eller förväxla avbrott med att
  ångra ett genomfört sparande.

## Påhittade uppgifter

Det sammanhängande exemplet återanvänder kartstudiens fyra förslag:

1. Familjeabonnemangets pris ändras från 189 till 199 kr per månad.
2. Betalningen flyttas från Gemensamt bankkonto till Kort ·· 4242.
3. Filmlyktan läggs till som tjänst.
4. Sambandet Lo använder Filmlyktan läggs till.

Markeringar visar tillägg, ändring och föreslagen borttagning. Ett
simulerat kvitto lämnar uppgifterna kvar i kartan och tar bort deras
förslagsmarkeringar. Manuella namnändringar kan läggas till i samma
utkast genom objektets redigeringsfönster.

## Produktbeslut som gäller

- [Samtalets sammanfattning, rättelser och sparande](https://github.com/viscalyx/skyttel/issues/7#issuecomment-5654691943).
- [Korta talbesked och verifierat resultat](https://github.com/viscalyx/skyttel/issues/14#issuecomment-5688291674).
- [Hela utkastet och uttryckligt sparbesked](https://github.com/viscalyx/skyttel/issues/15#issuecomment-5667325819).
- [Privata utkast och beständig information](https://github.com/viscalyx/skyttel/issues/9#issuecomment-5655680457).
- [Avbrott och okänt sparutfall](https://github.com/viscalyx/skyttel/issues/10#issuecomment-5662601732).
- [Medgivande för extern behandling](https://github.com/viscalyx/skyttel/issues/6#issuecomment-5654275475).
- [Godkänd navigation och bevarande av arbete](https://github.com/viscalyx/skyttel/issues/104#issuecomment-5845580885).
- [Godkänd rymdkarta](https://github.com/viscalyx/skyttel/issues/105#issuecomment-5846524059).
- [WCAG-version och nivå för hela Skyttel](https://github.com/viscalyx/skyttel/issues/110#issuecomment-5843998158).

## Bedömning och kvarstående prov

WCAG 2.2 AA är designkravet. Prototypen ska göra frågor, fel och resultat
åtkomliga utan ljud och utan att flytta fokus när ett tillstånd ändras.
Samma samtalsarbete ska gå att pröva med text och kontroller.

Lokala kontroller omfattar växling mellan A/B/C, mikrofonpaus, text och
oskickad manuell redigering över panelbyten, förslag i kartan, sparfel,
okänt resultat och kontroll följd av kvitto. Kvitto och objektuppgifter
visar resultatet efter sparandet. Manuella ändringar använder samma
sparande och blir kvar vid avvisat försök. Mobilvyer omfattar 390 × 844
och 320 × 400; korta vyer rullar internt. Ljust och mörkt tema ingår.

För D ingår markering av förändrade objekt, namn och samband, och att
förslagens markeringar finns kvar vid
okänt sparresultat men försvinner efter verifierat kvitto. Mobilprovet
omfattar 390 × 844. Färgerna har beräknad kontrast mot de använda
bakgrundsfärgerna: lägsta värde är 4,61:1 för amber mot ljus kartbakgrund.
Den neutrala bakgrunden bakom namn och linjer skiljer dem från stjärnorna.

Typkontroll, Biome, Markdown och stavning kontrolleras för underlaget.
Produktionsbygget körs med `NODE_ENV=production npm run build`.
Prototypens kod ingår inte i det bygget. Den lokala miljön har
`NODE_ENV=development`, vilket annars gör att Vite även bygger
prototypingångarna. Ingen verifiering av verkligt tal görs här.

Verkligt tal, fysiska iPhone- och iPad-enheter, skärmläsare och fullständig
utvärdering av alla flöden återstår. Underlaget är inte bevis på
WCAG-överensstämmelse. Kartbeslutets kvarstående arbete, bland annat
stjärnrörelse vid panorering och läsbarhet i täta mobilkartor, gäller
fortfarande.

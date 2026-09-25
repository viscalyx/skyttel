# Manuella testfall för rymdkartan

Testfallen omfattar gemensam redigering, navigering och bevarad text i
lista och rymdkarta. Anteckna commit, webbläsare, enhet, fysisk eller
emulerad inmatning samt godkänt eller underkänt resultat vid körning.
Fysiska enhetsprov och hjälpmedelsprov följs separat i
[uppföljningen för manuella prov](https://github.com/viscalyx/skyttel/issues/97).

## Konfigurerade användare

Alex Exempel är inloggad medlem i ett separat provhushåll. Använd bara
påhittade uppgifter. Administratörsrollen behövs inte för kartarbetet.

## Allmän förberedelse

1. Starta en isolerad installation enligt
   [utvecklingsguiden](../development/testing.md). Använd ett nytt
   provhushåll mellan fallen så att inget tidigare utkast finns kvar.
2. Skapa förslag för personen Lo Exempel och tjänsten Molnmusik. Lägg vid
   behov till sambandet Lo Exempel → Använder → Molnmusik. Lämna förslagen
   osparade om fallet inte uttryckligen säger annat.

## Gemensam redigering

### RYMD-01: samma utkast och beständiga sparande i båda vyerna

**Syfte:** Prova att rymdkartan använder samma uppgifter som listan.

**Användare:** Alex Exempel.

**Förutsättningar:** De två objektförslagen finns i eget utkast.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-01: spatial and list editing share private proposals and one
durable save”.

**Steg:**

1. Öppna rymdkartan, välj Molnmusik och skriv Molnmusik familj som namn.
2. Byt till Lista och detaljer. Kontrollera texten och lägg den i utkastet.
3. Granska och spara hela utkastet. Starta om appen och öppna kartan igen.

**Förväntat resultat:**

- Namntexten finns kvar vid vybytet. Förslagen ändrar inte sparad karta.
- Ett samlat sparande ger kvitto. Båda objekten och det rättade namnet
  finns kvar efter omstart, i både lista och karta.

### RYMD-02: fokus och filter ändrar urvalet med bevarad kamera

**Syfte:** Prova riktade samband, fokus och kamerans separata kontroller.

**Användare:** Alex Exempel.

**Förutsättningar:** De två objekten och användningssambandet finns.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-02: focus, filters and camera navigation preserve the shared
selection”.

**Steg:**

1. Öppna rymdkartan. Kontrollera pilen från Lo Exempel till Molnmusik
   före och efter rotation och panorering. Byt till Samlad vy och välj
   Lo Exempels runda symbol. Kontrollera att sambandets etikett visas.
   Filtrera på Person och kontrollera att tjänsten döljs.
2. Välj Visa hela rymden och Ctrl-klicka Lo Exempel. Kontrollera fokus.
3. Panorera med knappen under Navigera rymden. Välj Visa hela rymden.
4. Sök efter Lo. Flytta tangentbordsfokus till en kameraknapp och tryck
   Escape.
5. Fokusera Lo Exempel igen, sök efter Lo och filtrera på Person. Välj
   Återställ vy, välj Alla etiketter och sedan användningssambandets etikett.

**Förväntat resultat:**

- Pilspetsen syns utanför målets runda symbol, även efter kamerarörelse.
  Riktning och rätt ändobjekt syns. Sambandets etikett visas när ett
  anslutet objekt väljs eller Alla etiketter är på. Fokus visar direkta
  samband.
- Visa hela rymden rensar filter och fokus med bibehållen kamera.
- Escape rensar sökningen utanför formuläret. Sambandet öppnar rätt
  detaljer med Molnmusik som mål.
- Återställ vy rensar även fokus, sökning och typfilter och ramar in hela
  kartan.

### RYMD-03: menyer och symboler visar ändringar före sparande

**Syfte:** Skilja förslag från sparad karta och kasta vanlig borttagning.

**Användare:** Alex Exempel.

**Förutsättningar:** De två objekten och användningssambandet är förslag.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-03: context actions and draft symbols distinguish proposals
from saved content”.

**Steg:**

1. Öppna kartan, välj Alla etiketter och kontrollera plusmarkeringarna.
   Visa utkastet och spara.
2. Högerklicka Molnmusik och välj Redigera objekt. Lägg en ändrad
   beskrivning i utkastet. Gå tillbaka till kartan.
3. Kontrollera gul tilde, öppna menyn och välj Ta bort objekt.
4. Kontrollera objektet, sambandet och hela ändringslistan. Kasta utkastet.

**Förväntat resultat:**

- Nytt innehåll har guldgult plus, ändringar gul tilde och borttagningar
  korallfärgat kryss. Objektens namn visas bredvid de runda symbolerna.
- Samband som föreslås tas bort visas med en böjd, streckad linje.
- Borttagningen omfattar det anslutna sambandet direkt i utkastet.
  Sparad karta och det andra objektet ändras inte.
- Kasta hela utkastet återgår till sparad karta utan historisk ångring.

## Inmatning och återhämtning

### RYMD-04: pekmeny och grafikavbrott bevarar oskickad text

**Syfte:** Prova långtryck, orientering och fortsatt redigering vid avbrott.

**Användare:** Alex Exempel.

**Förutsättningar:** Telefon eller emulerad pekinmatning, minskad rörelse
påslagen och de två objektförslagen i eget utkast.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-04: touch menus, viewport changes and graphics recovery retain
unsent editing”.

**Steg:**

1. Kontrollera att Lista och detaljer är startläge. Öppna kartan och håll
   på Molnmusik tills menyn visas. Släpp och välj Redigera objekt.
2. Skriv Oskickad mobiltext i beskrivningen. Vänd enheten och byt vy.
3. Öppna kartan igen. Använd webbläsarens verktyg för att simulera förlust
   och återställning av WebGL-kontext, eller kör det länkade automatiska
   provet för detta avbrott. Anteckna separat vad som faktiskt provas.
4. Öppna detaljerna, kontrollera texten, lägg den i utkastet och spara.

För ett avbrott i Chromes utvecklarkonsol, med kartan öppen:

```javascript
const skyttelGraphics = document.querySelector('canvas')
  .getContext('webgl2').getExtension('WEBGL_lose_context');
skyttelGraphics.loseContext();
setTimeout(() => skyttelGraphics.restoreContext(), 4000);
```

**Förväntat resultat:**

- Fingersläppet väljer inte någon menyåtgärd. Kartan ryms i tillgänglig
  webbyta i båda orienteringarna och listan kan nås.
- Avbrottsbeskedet förklarar att utkastet finns kvar. Detaljerna behåller
  oskickad text. Texten är inte sparad förrän utkastet sparas med kvitto.

### RYMD-05: etiketter och tangentbord behåller sambandets formulär

**Syfte:** Prova etikettläge och redigering utan rumsliga gester.

**Användare:** Alex Exempel.

**Förutsättningar:** De två objekten och användningssambandet finns.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-05: labels, keyboard editing and relationship text survive view
changes”.

**Steg:**

1. Öppna Samlad vy och välj Lo Exempels runda symbol. Kontrollera namn,
   typikoner och sambandets etikett. Välj Alla etiketter, panorera och
   välj Återställ vy.
2. Välj sambandet i listan med tangentbord. Ange känt slutdatum
   2026-12-31 utan att skicka formuläret.
3. Öppna kartan, ändra fönsterstorlek och öppna detaljer och utkast.
4. Kontrollera datumet, lägg sambandet i utkastet och spara hela utkastet.

**Förväntat resultat:**

- Alla etiketter ger ett närmare panorerbart utsnitt. Återställ vy ger
  överblick igen och behåller valet Alla etiketter. Objektnamn ligger nära
  sina runda symboler och stödlinjer visar anknytningen.
- Tangentbordsvägen öppnar rätt samband. Oskickat slutdatum finns kvar
  efter vybyte och blir beständigt först vid det samlade sparandet.

### RYMD-06: förlorad tillgång lämnar helskärmen och visar inloggningsvägen

**Syfte:** Prova att en nekad ändring inte låser navigationen.

**Användare:** Alex Exempel som medlem; en annan administratör återkallar
tillgången från en separat inloggning.

**Förutsättningar:** Alex har öppnat Molnmusik i helskärmskartan och
skrivit oskickad text. Administratören kan administrera hushållet.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-06: losing household access in fullscreen restores login
navigation”.

**Steg:**

1. Återkalla Alex tillgång från administratörens separata inloggning.
2. Försök lägga Alex oskickade text i utkastet innan nästa omladdning.
3. Läs beskedet och välj Logga ut i den vanliga sidans navigation.

**Förväntat resultat:**

- Ändringen nekas, privata uppgifter döljs och helskärmsläget lämnas.
- Navigationen kan användas omedelbart. Utloggning visar inloggningssidan
  utan kvarvarande oskickad text.

## Uppgifter över tid

### RYMD-07: upphörda uppgifter behåller status bredvid ändringssymboler

**Syfte:** Skilja upphört från förslag i rymdkartans objekt och samband.

**Användare:** Alex Exempel.

**Förutsättningar:** De två objekten och användningssambandet är förslag.

**Integrationstest:**
[spatial.spec.ts](../../tests/integration/spatial.spec.ts),
testfallet “RYMD-07: ended objects and relationships retain status beside
draft symbols”.

**Steg:**

1. Välj Molnmusik i listan, välj status Upphört och lägg i utkastet.
2. Välj Lo Exempel. Ange ett känt slutdatum i det förflutna under
   Ekonomiska uppgifter och avtalsvillkor, välj Gäller fortfarande och
   lägg i utkastet.
3. Välj användningssambandet. Ange ett känt slutdatum i det förflutna,
   behåll Följ slutdatum och lägg sambandet i utkastet.
4. Öppna rymdkartan, välj Alla etiketter och kontrollera objektens och
   sambandets etiketter.
5. Visa detaljer och utkast, spara hela utkastet, starta om appen och
   öppna rymdkartan igen.
6. Välj sambandets etikett, välj Gäller fortfarande och lägg sambandet
   i utkastet. Gå tillbaka till kartan.

**Förväntat resultat:**

- Molnmusik visar Upphört vid namnet och plus vid den runda symbolen.
  Sambandets etikett visar både Upphört och plus. Status och förslag har
  olika färger. Lo Exempel visar inget Upphört trots slutdatumet.
- Namn, typikon och riktning är fortfarande begripliga. Upphört finns
  kvar efter sparande och omstart; plusmarkeringarna försvinner.
- Sambandets rättelse visar tilde och tar bort dess Upphört-markering.
  Molnmusiks status påverkas inte.

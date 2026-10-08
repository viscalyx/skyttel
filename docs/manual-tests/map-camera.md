# Manuella testfall för kamerans urvalsfokus

Testfallen omfattar rotation, fokus och återgång till en tidigare vy.
Anteckna commit, webbläsare, fysisk eller emulerad inmatning samt godkänt
eller underkänt resultat. Fysiska enheter och hjälpmedel provas separat.

## Konfigurerade användare

Alex Exempel är inloggad medlem i ett separat provhushåll. Använd bara
påhittade uppgifter. Administratörsrollen behövs inte.

## Allmän förberedelse

1. Starta en isolerad installation enligt
   [provförberedelsen](../development/devcontainer.md#disposable-local-database).
   Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor).
2. Skapa Lo Exempel, Kim Exempel, Alex Exempel och Långt borta. Koppla Lo
   till Kim och Kim till Långt borta. Flytta objekten till olika personliga
   placeringar, även i höjdled. Placera Långt borta tydligt utanför gruppen.
3. Börja varje fall med en omladdad karta. Kamerarörelser ska inte skapa
   hushållsförslag eller ändra personliga objektplaceringar.

## Rotation och kameravy

### KAMERA-01: Rotera kring personlig placering utan hopp

**Syfte:** Verifiera rotationscentrum med knappar och tangentbord.

**Användare:** Alex Exempel.

**Förutsättningar:** Lo ligger utanför bildens mitt i översikten.

**Integrationstest:**
[map-camera.spec.ts](../../tests/integration/map-camera.spec.ts),
testfallet “KAMERA-01: rotation keeps the selected personal position fixed
on screen without a selection jump”.

**Steg:**

1. Markera Lo och kontrollera att kameran ligger kvar utan hopp.
2. Öppna **Navigera** och välj **Rotera vänster**.
3. Fokusera samma knapp med tangentbord och tryck Enter.
4. Flytta Lo uppåt med **Navigera**. Vänta på bekräftad personlig
   placering och välj **Luta nedåt** under **Navigera**.

**Förväntat resultat:**

- Lo behåller sin plats i bilden under rotationen och är fortsatt markerad.
- Rotation ändrar inte hushållets uppgifter eller objektens placeringar.
- Efter den uttryckliga flyttningen roterar kartan kring Los nya läge.

### KAMERA-02: Fokusera direkta grannar och återgå till sparad vy

**Syfte:** Verifiera avgränsat fokus och kamerans bestående återgångsvy.

**Användare:** Alex Exempel.

**Förutsättningar:** Alla fyra objekt syns i översikten på dator.

**Integrationstest:**
[map-camera.spec.ts](../../tests/integration/map-camera.spec.ts),
testfallet “KAMERA-02: focus fits only selection and direct neighbors while
overview retains its return view”.

**Steg:**

1. Kontrollera att **Fokusera markering** är inaktiv med tomt urval.
2. Markera Lo och välj **Visa detaljer**. Läs Los fasta uppgifter.
3. Välj **Fokusera markering**. Kontrollera Lo och Kim i det närmare
   utsnittet, med marginal till verktygen och oförändrad kamerariktning.
4. Välj **Visa hela kartan**. Panorera, fokusera markeringen igen och
   rotera. Välj sedan **Återgå till föregående vy**.
5. Stäng **Navigera**. Välj **Redigera Lo Exempel** och skriv Oskickat under
   kamerafokus i **Beskrivning**. Välj **Stäng objektdialogen** och kontrollera
   fokus på **Fortsätt redigera**. Tryck Escape och kontrollera att texten består.
6. Stäng igen och välj uttryckligen **Kasta ändringarna och fortsätt**.
   Kontrollera oförändrad kamera, tidigare utkast och sparade uppgifter.

**Förväntat resultat:**

- Endast Lo och dess direkta granne Kim bestämmer fokusutsnittet.
  Långt borta utökar inte fokusutsnittet genom Kims andra samband; övrigt
  kartinnehåll finns fortfarande kvar.
- Kim blir inte markerad. Den fasta läsytan behåller sitt läge under
  kamerarörelser. Escape bevarar senare oskickad formulärtext, medan
  uttryckligt kastande lämnar tidigare fakta och utkast oförändrade.
- Återgången återställer vyn före översikten trots mellanliggande rörelser.
  Knappen heter åter **Visa hela kartan** och urvalet består.

### KAMERA-03: Rotera med mus och pekskärm i smala vyer

**Syfte:** Verifiera samma rotationsregel, pekmål och grafikavbrott.

**Användare:** Alex Exempel.

**Förutsättningar:** Prova i 390 och 320 CSS-bildpunkters bredd. För att
prova grafikavbrott behövs webbläsarens stöd för att avbryta och återställa
WebGL. Saknas det stödet, anteckna den delen som ej utförd.

**Integrationstest:**
[map-camera.spec.ts](../../tests/integration/map-camera.spec.ts),
testfallet “KAMERA-03: mouse and touch rotation preserve the pivot and
narrow focus controls survive unavailable graphics”.

**Steg:**

1. Markera Lo och välj **Fokusera markering**. Börja dra tom rymd med
   mus. Kontrollera både start och fortsatt rotation.
2. Upprepa med ett finger på pekskärmen. Kontrollera att Lo ligger kvar
   på samma plats i bilden och behåller markeringen.
3. Öppna **Tabell** och återgå med **Karta**. Kontrollera att fokus går att
   använda igen och att båda kameraknapparna är åtkomliga.
4. Avbryt kartgrafiken, kontrollera att fokus är inaktivt och återställ
   grafiken. Kontrollera att fokusering blir tillgänglig igen.

**Förväntat resultat:**

- Mus och pekskärm ger inget hopp och roterar kring samma personliga läge.
- Knapparna har begripliga namn, synligt tangentbordsfokus och pekmål som
  ryms i vyn. Kartgrafik som döljs eller avbryts kan inte fokuseras.
- Urval och pågående arbete finns kvar efter vybyte och grafikavbrott.

### KAMERA-04: Fokusera i en kort vy med åtkomliga verktyg

**Syfte:** Verifiera kartutrymme och verktyg vid kraftig webbläsarzoom.

**Användare:** Alex Exempel.

**Förutsättningar:** Börja med Lo markerad. Prova 400 procent riktig
webbläsarzoom från en vy på 1280 × 1000 bildpunkter, så innehållet får
320 × 250 CSS-bildpunkter. Anteckna faktiskt mått och zoomnivå.

**Integrationstest:**
[map-camera.spec.ts](../../tests/integration/map-camera.spec.ts),
testfallet “KAMERA-04: short viewports retain a usable focus rectangle
and reachable camera and display controls”. Testet använder motsvarande
CSS-mått; riktig webbläsarzoom provas separat.

För de två kontrollerade svaren i steg 7 använder du bara provinstallationens
påhittade uppgifter och webbläsarens utvecklarkonsol. Kör följande före varje
försök. Det verkliga svaret hålls efter att den personliga flytten har genomförts;
`releasePersonalMove()` släpper samma svar. Detta är ingen telefonförberedelse
eller uppgift om faktiskt utförd fysisk provning.

```js
(() => {
  const originalFetch = window.fetch.bind(window);
  let deliver;
  window.releasePersonalMove = () => deliver?.();
  window.fetch = async (input, options) => {
    const response = await originalFetch(input, options);
    const url = input instanceof Request ? input.url : input;
    const method = options?.method
      ?? (input instanceof Request ? input.method : 'GET');
    if (new URL(url, location.href).pathname.endsWith('/map/view/position')
        && method === 'POST') {
      window.fetch = originalFetch;
      await new Promise(resolve => { deliver = resolve; });
    }
    return response;
  };
})();
```

**Steg:**

1. Fokusera **Fokusera markering** med tangentbord och tryck Enter.
2. Kontrollera Lo och Kim mellan övre och nedre verktyg. Välj översikt
   och återgå till den föregående vyn.
3. Öppna **Visningsval**, slå på och av **Alla etiketter** och stäng valet.
4. Öppna **Navigera**. Läs söksammanfattningen och hushållets återkoppling
   bredvid navigeringen. Fokusera sammanhangsytan med tangentbord; rulla
   vid behov hela arbetsytan för att läsa den. Kontrollera att den saknar
   knappen **Visa samband i kartan**.
   Nå var och en av de sex **Flytta Lo Exempel**-knapparna med tangentbord och
   aktivera dem: vänster, höger, uppåt, nedåt, framåt och bakåt. Kontrollera
   fokus och att enbart din personliga placering ändras. Rotera och stäng
   navigeringen. Upprepa detta steg vid 640 × 500 CSS-pixlar.
5. Välj **Visa verktygens namn** och kontrollera att **Skriv till Skyttel**
   samt **Visa detaljer** går att nå.
6. Aktivera kamerafokus med tangentbord från det utökade verktygsfältet.
   Upprepa med översikt och återgång efter att verktygsnamnen öppnats igen.
7. Förbered det kontrollerade svaret och öppna Navigera. Flytta Lo med
   tangentbord och kontrollera att flyttknappen blir inaktiv i väntan på svaret.
   Flytta fokus till **Stäng navigering** utan att aktivera den. Släpp samma
   svar med `releasePersonalMove()` och kontrollera att fokus ligger kvar.
   Upprepa förberedelsen och flytten, men aktivera nu **Stäng navigering**
   före svaret. Släpp svaret och kontrollera att **Navigera** behåller fokus;
   den stängda navigeringen återöppnas inte.

**Förväntat resultat:**

- Både markeringen och dess direkta granne får plats i fri kartarea med
  marginal till verktygen och går att välja. Kamerafokus ligger kvar på
  den aktiverade knappen.
- Kamera- och visningskontroller går att använda. Inga kontroller kräver
  vågrät rullning av sidan.
- Kameraåtgärder fäller ihop verktygsnamnen och behåller fokus på samma
  knapp. Urval och personliga inställningar finns kvar.
- Efter en vanlig flytt återgår fokus till samma aktiva flyttknapp.
  Ett kontrollerat fördröjt svar tar inte fokus från en senare kontroll och
  återöppnar inte stängd navigering.
- Navigering och återkoppling täcker inte varandras kontroller. Sökräkningen,
  fullständiga benämningar och alla sex flyttknappar går att läsa och nå
  med tangentbord och rullning. Sparade fakta och privata förslag ändras inte.

# Manuella testfall för kamerans urvalsfokus

Testfallen omfattar rotation, fokus, kamerans vyhistorik och återställning.
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

### KAMERA-02: Fokusera direkta grannar och backa kameran

**Syfte:** Verifiera avgränsat fokus och återgång utan förlorat arbete.

**Användare:** Alex Exempel.

**Förutsättningar:** Alla fyra objekt syns i översikten på dator.

**Integrationstest:**
[map-camera.spec.ts](../../tests/integration/map-camera.spec.ts),
testfallet “KAMERA-02: focus fits only selection and direct neighbors while
camera history preserves work”.

**Steg:**

1. Fokusera Lo utan att markera objektet och tryck Shift+F10. Kontrollera
   att **Fokusera markering** är inaktiv med tomt urval. Stäng med Escape.
2. Dubbelklicka Lo. Läs Los fasta uppgifter.
3. Öppna Los högerklicksmeny och välj **Fokusera markering**. Kontrollera
   Lo och Kim i det närmare utsnittet, med marginal till verktygen och
   oförändrad kamerariktning.
4. Öppna **Navigera**, panorera höger och rotera vänster. Välj
   **Föregående vy** två gånger för att gå tillbaka till fokusutsnittet.
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
- Två steg bakåt återställer vyn före panoreringen och rotationen.
  Knappen heter fortsatt **Föregående vy** och urvalet består.

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

1. Markera Lo, öppna högerklicksmenyn och välj **Fokusera markering**. Börja
   dra tom rymd med mus. Kontrollera både start och fortsatt rotation.
2. Upprepa med ett finger på pekskärmen. Kontrollera att Lo ligger kvar
   på samma plats i bilden och behåller markeringen.
3. Öppna **Tabell** och återgå med **Karta**. Kontrollera att fokus går att
   använda igen från högerklicksmenyn och att översikt är åtkomlig.
4. Öppna Los högerklicksmeny. Avbryt kartgrafiken, kontrollera att
   **Fokusera markering** är inaktiv och återställ grafiken. Kontrollera att
   fokusering blir tillgänglig igen.

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

1. Fokusera Lo med tangentbord och tryck Shift+F10. Nå
   **Fokusera markering** med högerpil och tryck Enter.
2. Kontrollera Lo och Kim i den fria kartytan. Välj **Föregående vy**
   medan verktygsnamnen är öppna. Knappen behåller fokus och blir dimmad.
   Öppna namnen igen och fokusera markeringen via högerklicksmenyn.
3. Slå på och av **Alla etiketter** med etikettikonen under
   **Föregående vy** i verktygsfältet.
4. Öppna **Navigera**. Läs söksammanfattningen och hushållets återkoppling
   bredvid navigeringen. Fokusera sammanhangsytan med tangentbord; rulla
   vid behov hela arbetsytan för att läsa den.
   Nå var och en av de sex **Flytta Lo Exempel**-knapparna med tangentbord och
   aktivera dem: vänster, höger, uppåt, nedåt, framåt och bakåt. Kontrollera
   fokus och att enbart din personliga placering ändras. Rotera och stäng
   navigeringen. Upprepa detta steg vid 640 × 500 CSS-pixlar.
5. Välj **Visa verktygens namn** och kontrollera att **Skriv till Skyttel**
   går att nå.
6. Öppna Los högerklicksmeny med Shift+F10 och aktivera
   **Fokusera markering** med tangentbord medan verktygsnamnen är öppna.
7. Förbered det kontrollerade svaret och öppna Navigera. Flytta Lo med
   tangentbord och kontrollera att flyttknappen blir inaktiv i väntan på svaret.
   Flytta fokus till **Stäng navigering** utan att aktivera den. Släpp samma
   svar med `releasePersonalMove()` och kontrollera att fokus ligger kvar.
   Upprepa förberedelsen och flytten, men aktivera nu **Stäng navigering**
   före svaret. Släpp svaret och kontrollera att **Navigera** behåller fokus;
   den stängda navigeringen återöppnas inte.

**Förväntat resultat:**

- Både markeringen och dess direkta granne får plats i fri kartarea med
  marginal till verktygen och går att välja. Menyn stängs och
  tangentbordsfokus går till kartan.
- Kamera- och visningskontroller går att använda. Inga kontroller kräver
  vågrät rullning av sidan.
- Kameraåtgärder fäller ihop verktygsnamnen. Menyns urvalsfokus flyttar
  fokus till kartan; **Föregående vy** behåller fokus på samma knapp.
  Urval och personliga inställningar finns kvar.
- Efter en vanlig flytt återgår fokus till samma aktiva flyttknapp.
  Ett kontrollerat fördröjt svar tar inte fokus från en senare kontroll och
  återöppnar inte stängd navigering.
- Navigering och återkoppling täcker inte varandras kontroller. Sökräkningen,
  fullständiga benämningar och alla sex flyttknappar går att läsa och nå
  med tangentbord och rullning. Sparade fakta och privata förslag ändras inte.

### KAMERA-05: Högerklickets kartåtgärder förklarar urval och filter

**Syfte:** Skilja de tre kartåtgärderna och bevara flera markeringar.

**Användare:** Alex Exempel.

**Förutsättningar:** De fyra objekten finns enligt allmän förberedelse.

**Integrationstest:**
[map-camera.spec.ts](../../tests/integration/map-camera.spec.ts),
testfallet “KAMERA-05: context focus preserves multiple selections and
filters with distinct described actions”.

**Steg:**

1. Sök **Exempel** och markera **Ta med upphörda** i kartans filter.
2. Markera Lo och lägg till Alex i urvalet med Ctrl-klick eller Cmd-klick.
3. Högerklicka Långt borta utan att ändra urvalet. Läs verktygstipsen och
   beskrivningarna med skärmläsare för de tre kartåtgärderna.
4. Nå **Fokusera markering** med tangentbord och tryck Enter.
5. Välj **Föregående vy** och kontrollera att kameran återgår. Kontrollera
   markeringarna, kartans söktext, filtret och utkastet.

**Förväntat resultat:**

- Kartikonen **Visa i kartan** förklarar att Långt borta markeras, att sökning och
  filter rensas och att upphörda tas med vid behov.
- Nätverksikonen **Visa samband i kartan** förklarar att Långt borta markeras och
  att sökning, filter och tidigare visat innehåll behålls.
- Fokusramen **Fokusera markering** förklarar att alla markerade objekt och
  deras direkta grannar ramas in med bevarat urval, sökning och filter.
  Alla tre behåller kamerans riktning.
- Efter urvalsfokus är Lo och Alex fortsatt markerade, Kim är inte markerad.
  Lo, Alex och den direkta grannen Kim är åtkomliga. Menyn stängs och
  tangentbordsfokus går till kartan. Söktexten och **Ta med upphörda** består.
- Sparade uppgifter och utkastet är oförändrade.
  **Föregående vy** bevarar också sökning, filter och båda markeringarna.

### KAMERA-06: Etikettikonen växlar och sparar personligt visningsval

**Syfte:** Verifiera etikettknappens läge, växling och bestående val.

**Användare:** Alex Exempel.

**Förutsättningar:** Börja med **Alla etiketter** avstängt på dator.

**Integrationstest:**
[map-camera.spec.ts](../../tests/integration/map-camera.spec.ts),
testfallet “KAMERA-06: toolbar label mode toggles with pointer and keyboard
and survives reload”.

**Steg:**

1. Hitta etikettikonen **Alla etiketter** under **Föregående vy**.
   Kontrollera att knappen visas som avstängd.
2. Klicka på etikettikonen. Kontrollera att den visar påslaget läge och
   att objektens och sambandens etiketter visas, även om de överlappar.
3. Ladda om sidan. Kontrollera att knappen fortfarande är påslagen.
4. Minska vyn till 320 × 250 CSS-pixlar. Fokusera etikettikonen med
   tangentbord och tryck mellanslag. Kontrollera att läget blir avstängt.
5. Ladda om igen. Kontrollera att läget fortfarande är avstängt.

**Förväntat resultat:**

- Knappen har en etikettikon, synligt fokus och ett tydligt aktivt läge.
  Skärmläsaren läser namnet **Alla etiketter** och om knappen är på eller av.
- Ett klick slår på valet och nästa klick slår av. Enter och mellanslag
  växlar samma val. Automatiska etiketter används när valet är avstängt.
- Den personliga inställningen består vid omladdning och i en kort vy.
- Tangentbordsfokus ligger kvar på knappen efter växling. Hushållets
  sparade uppgifter och utkastet ändras inte.

### KAMERA-07: Återställningsikonen återgår till hela kartan

**Syfte:** Verifiera återställning från verktygsfältets kameragrupp.

**Användare:** Alex Exempel.

**Förutsättningar:** Alla fyra objekt finns enligt allmän förberedelse.

**Integrationstest:**
[map-camera.spec.ts](../../tests/integration/map-camera.spec.ts),
testfallet “KAMERA-07: toolbar reset clears map search and selection while
preserving label mode and personal positions”.

**Steg:**

1. Sök **Lo** i kartan och markera Lo. Slå på **Alla etiketter**.
2. Hitta cirkelpilen **Återställ vy** under etikettikonen i verktygsfältet.
3. Aktivera återställningen med tangentbord och kontrollera kartan.
4. Kontrollera sökfältet, markeringen, etikettvalet och utkastet.

**Förväntat resultat:**

- Kameran ramar in hela kartan. Sökning och filter återställs och inget
  objekt är markerat. Kamerans riktning behålls.
- **Föregående vy** och **Återställ vy** är dimmade. Vyhistoriken är tom.
- **Alla etiketter** är fortsatt påslaget. Tangentbordsfokus ligger kvar
  på återställningsknappen.
- Personliga objektplaceringar, sparade uppgifter och utkastet är oförändrade.
- Information om dolda etiketter och närmare utsnitt finns under kartans
  status när sådan information behövs.

### KAMERA-08: Backa genom kamerans vyer och töm historiken

**Syfte:** Verifiera varje steg bakåt och återställningens nya startläge.

**Användare:** Alex Exempel.

**Förutsättningar:** Omladdad karta på dator, utan sökning eller markering.

**Integrationstest:**
[map-camera.spec.ts](../../tests/integration/map-camera.spec.ts),
testfallet “KAMERA-08: previous view walks each camera change back to the
initial view and reset clears history”.

**Steg:**

1. Kontrollera att **Föregående vy** och **Återställ vy** är dimmade.
   Sök **Lo** utan att flytta kameran. Återställningsknappen aktiveras,
   men **Föregående vy** är fortsatt inaktiv. Välj **Återställ vy** och
   kontrollera tom sökning och att båda knapparna är dimmade igen.
2. Öppna **Navigera**. Välj **Rotera vänster**, **Panorera uppåt** och
   **Zooma in**. Lägg märke till utsnittet efter varje knapptryckning.
3. Fokusera **Föregående vy** och tryck Enter tre gånger. Kontrollera varje
   utsnitt i omvänd ordning. Tryck Enter igen när knappen är dimmad.
4. Välj **Zooma ut** och **Återställ vy**. Kontrollera den återställda kartan.
5. Panorera vänster och välj **Föregående vy** en gång.
6. Kontrollera hushållets uppgifter, utkast och personliga placeringar.

**Förväntat resultat:**

- Varje navigeringsknapp skapar ett steg i kamerans historik och aktiverar
  båda kameraknapparna. Stegen går att backa i omvänd ordning, inklusive
  riktning och zoom. Namnet är alltid **Föregående vy**.
- Efter sista steget tillbaka är båda knapparna dimmade. Fokus ligger kvar
  på **Föregående vy**, även då den är inaktiv. Ett nytt tryck ändrar inget.
- **Återställ vy** visar hela kartan och tömmer historiken. Båda knapparna
  blir dimmade. Efter en ny panorering räcker ett steg tillbaka till det
  återställda läget; äldre vyer återkommer inte.
- Hushållets uppgifter, utkast och objektplaceringar är oförändrade.
  Skärmläsaren förmedlar knapparnas namn och inaktiva lägen.

### KAMERA-09: En sammanhängande gest blir ett steg bakåt

**Syfte:** Verifiera hela gester utan mellanliggande rörelsefragment.

**Användare:** Alex Exempel.

**Förutsättningar:** Omladdad karta, mus och pekskärm tillgängliga. Anteckna
om pekskärmen är emulerad eller fysisk.

**Integrationstest:**
[map-camera.spec.ts](../../tests/integration/map-camera.spec.ts),
testfallet “KAMERA-09: mouse drags, wheel bursts and touch pinch create
complete previous views”.

**Steg:**

1. Rotera kartan med en sammanhängande vänsterdragning på tom rymd.
2. Panorera med en sammanhängande högerdragning på tom rymd.
3. Zooma med en sammanhängande nypgest på styrplattan eller flera snabba
   Ctrl-rullningar med musen.
4. Välj **Föregående vy** tre gånger. Kontrollera utsnitten efter varje steg.
5. Panorera och zooma med två fingrar på pekskärm under samma gest. Släpp
   båda fingrarna och välj **Föregående vy** en gång.
6. Kontrollera hushållets uppgifter och utkastet.

**Förväntat resultat:**

- Ett tryck bakåt återställer vyn före hela zoomningen, nästa före hela
  panoreringen och nästa före hela rotationen. Knappen blir sedan dimmad.
- Hela tvåfingersgesten går att backa med ett tryck, även när den innehåller
  både panorering och zoom. Knappen blir dimmad i startläget.
- Gester och återgång ändrar inga hushållsuppgifter eller utkast.

# Manuella testfall för personliga placeringar

Testfallen omfattar egna placeringar och visningsval. Anteckna commit,
webbläsare, enhet, fysisk eller emulerad inmatning och godkänt eller
underkänt resultat. Programstyrda Chromium-prov ersätter inte fysiska
Chrome-prov på iPhone eller iPad eller fullständiga hjälpmedelsprov.

## Konfigurerade användare

Alex Exempel är administratör i provhushållet Linden. Robin Exempel är
medlem och har en separat webbläsarprofil. Använd bara påhittade uppgifter.
En tredje profil är utloggad. Använd två klienter med Alex inloggning för
att prova samtidighet.

## Allmän förberedelse

Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor) när
fallen anger formulär, samtal, profil eller administration.

1. Starta en isolerad installation enligt
[provförberedelsen](../development/devcontainer.md#disposable-local-database).
   Använd ett nytt hushåll
   mellan fallen.
2. Skapa Lampan och Cykeln och spara hela utkastet. Bjud in Robin till
   hushållet när fallet anger det.
3. Öppna rymdkartan. Alla flyttar och val gäller bara den inloggade
   Skyttel-användarens presentation.

## Flyttning och beständighet

### PLACERING-01: mus, höjdled, tangentbord och återläsning

**Syfte:** Kontrollera tre dimensioner och beständig personlig lagring.

**Användare:** Alex Exempel i två klienter.

**Förutsättningar:** Lampan och Cykeln är sparade.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
testfallet “PLACERING-01: mouse, height and keyboard movement persist across
reload, clients and server restart”.

**Steg:**

1. Dra Lampan åt sidan och nedåt. Håll Shift och dra uppåt. Kontrollera
   höjdhjälpens start och riktning under draget.
2. Välj namnet Lampan i **Tabell** och öppna **Karta**. Öppna Navigera, fokusera
   Flytta [objektets namn]: nedåt och håll Shift utan att dra. Släpp Shift och
   välj Visa höjdhjälp i Navigera för att granska flyttningens start.
   Tryck Enter på Flytta [objektets namn]: nedåt och kontrollera ett steg
   nedåt från den nya starten. Slå av höjdhjälpen och flytta nedåt igen.
   Valet ska förbli av. Slå på det och kontrollera två steg från samma start.
   Öppna Inställningar → Rymdkartan och aktivera Visa
   stjärnhimmel.
   Återgå med Tillbaka till kartan.
3. Ladda om, starta om servern och öppna samma hushåll i en annan klient
   med Alex inloggning.

**Förväntat resultat:**

- Vanligt drag flyttar i bildplanet. Shift-drag ändrar bara rummets höjd.
  Shift visar höjdhjälp före drag. Senaste start och höjdskillnad går att
  granska efteråt. Höjdknapparna följer höjdhjälpsvalet.
- Knappar fungerar med tangentbord. Flyttar och stjärnval återkommer
  efter omstart och i den andra klienten.
- Hushållets sparade uppgifter och utkast ändras inte av flyttningen.
- Höjdhjälpsvalet är av efter omladdning.

### PLACERING-08: stabil höjdhjälp och bevarat val i navigeringen

**Syfte:** Kontrollera förhandsvisning, dragets start och höjdhjälpsvalet.

**Användare:** Alex Exempel med mus och tangentbord.

**Förutsättningar:** Lampan och Cykeln är sparade.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
testfallet “PLACERING-08: height help keeps its preview stable and manual
choice across navigation modes and selection”.

**Steg:**

1. Välj Lampan. Öppna Navigera och nå Visa höjdhjälp med tangentbordet.
   Tryck mellanslag för att aktivera valet. Byt till mininavigering och
   kontrollera att hela etiketten syns under flyttknapparna.
2. Stäng navigeringen. Håll Shift och kontrollera Startläge. Dra Lampan
   uppåt och kontrollera att hjälpplanet ligger kvar där förhandsvisningen
   visar det. Släpp musknappen utan att släppa Shift. Kontrollera Startläge
   vid den nya placeringen. Dra uppåt igen och kontrollera samma beteende.
3. Släpp Shift. Granska den senaste flyttningens höjdskillnad. Öppna
   navigeringen och kontrollera att Visa höjdhjälp fortfarande är på.
4. Välj namnet Cykeln i **Tabell** och återgå till **Karta**. Kontrollera att
valet består. Markera även Lampan
   genom Control-klick i kartan, öppna Navigera igen och kontrollera
   att reglaget blir inaktivt med texten
   Välj ett objekt för att visa höjdhjälp.

**Förväntat resultat:**

- Förhandsvisning och drag använder samma start; hjälpplanet hoppar inte
  när dragningen börjar. Nästa drag får en ny start vid aktuell placering.
- Shift visar nästa förhandsvisning mellan drag. När Shift släpps visas
  senaste dragets resultat eftersom valet är på.
- Reglaget och hela etiketten syns i båda navigeringsstorlekarna. Valet
  består när fönstret stängs och urvalet ändras.
- Flera markerade objekt gör reglaget inaktivt utan att ändra dess värde.

### PLACERING-02: samtidiga flyttar och visningsval

**Syfte:** Kontrollera att äldre klienter inte skriver över nyare val.

**Användare:** Alex Exempel i två klienter.

**Förutsättningar:** Båda klienterna visar samma ursprungliga vy.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
testfallet “PLACERING-02: concurrent clients retain independent moves and
visibly reject stale placement and settings”.

**Steg:**

1. Välj Lampan i båda klienterna. Flytta den uppåt i den första och
   nedåt i den andra.
2. Läs konfliktbeskedet i den andra klienten och flytta nedåt igen.
3. Flytta Cykeln från den första klienten utan att läsa om Lampan.
4. Aktivera Visa axlar hela tiden i den första klienten. Försök aktivera
   Visa stjärnhimmel från den andra klientens äldre inställningar under
   Inställningar → Rymdkartan. Återgå till kartan för att kontrollera axlarna.

**Förväntat resultat:**

- Den äldre flytten av Lampan avvisas synligt och aktuell placering visas.
  En ny flytt efter granskning fungerar.
- Cykelns oberoende flytt och Lampans senaste placering finns båda kvar.
- Äldre visningsval avvisas med besked. Den andra klienten visar de
  aktuella inställningarna. Inget nytt kartutkast skapas.

### PLACERING-03: pekgester, avbrott och fingerbyten

**Syfte:** Kontrollera avgränsningen mellan objektflytt och kamerarörelse.

**Användare:** Alex Exempel på pekskärm.

**Förutsättningar:** Öppen rymdkarta med de sparade objekten.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
testfallet “PLACERING-03: synthetic touch gestures handle height,
interruption, finger changes and empty-space navigation”.

**Steg:**

1. Dra Lampan med ett finger. Lägg ett andra finger stilla på kartan och
   dra det första uppåt. Lägg till ett tredje finger. Släpp det andra
   först, rör det första igen och lyft sedan alla fingrar.
2. Börja ett nytt drag och avbryt pekgesten, exempelvis genom att lämna
   webbläsaren. Återgå och kontrollera placeringen.
3. Börja höjdflyttning men släpp det första fingret före det andra.
   Fortsätt röra det kvarvarande fingret och släpp det.
4. Börja höjdflyttning igen och flytta även ankarfingret. Kontrollera
   återgången till ursprungsplaceringen. Fortsätt med båda fingrarna
   för panorering och nypzoom. Lyft alla fingrar.
5. Dra i tom rymd med ett finger. Panorera sedan med två fingrar: flytta
   båda lika långt åt samma håll utan att ändra avståndet mellan dem.
   Släpp båda. Börja en ny tvåfingergest och dra isär fingrarna lika långt
   åt varsitt håll för att zooma in.

**Förväntat resultat:**

- Bildplansdrag och höjdled fungerar. Höjdhjälpen syns under höjdgesten.
- Höjdflytten sparas oavsett vilket av parets fingrar som lyfts först.
  Återstående fingrar flyttar ingenting innan alla har lyfts. Ett tredje
  finger påverkar inte det aktiva paret.
- Flyttat ankare återställer objektet och övergår utan hopp till kameran.
  Avbruten objektgest återställer utan sparad flytt.
- Tom rymd styr kameran utan att ändra objektens placeringar.
  Panorering förskjuter utsnittet utan att märkbart ändra skalan.
  När fingrarna dras isär ökar objektens avstånd på skärmen.
  Axelvisaren syns under rörelse och försvinner en kort stund efteråt.

## Visningsval och åtkomst

### PLACERING-04: visningsval, nya förslag och bevarad text

**Syfte:** Kontrollera personliga val och fortsatt arbete vid vyändringar.

**Användare:** Alex Exempel.

**Förutsättningar:** Systemets minskade rörelse är aktiverad.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
testfallet “PLACERING-04: personal display settings, new proposals and
viewport changes preserve existing placement and unsent text”.

**Steg:**

1. Flytta Lampan. Öppna Ordna min vy i Navigera. Aktivera Visa axlar hela
   tiden och välj hörnet uppe
   till vänster. Vänd panorering separat i sidled och höjdled.
2. Öppna Inställningar → Rymdkartan. Kontrollera att stjärnhimlen är
   avstängd och reglaget inaktivt. Stäng
   av systemets minskade rörelse och aktivera stjärnhimlen. Slå på
   minskad rörelse igen utan omladdning och granska samma reglage och
   bakgrund genom att växla mellan inställningarna och kartan. Stäng av
   minskad rörelse igen och välj Tillbaka till kartan.
3. Välj **Nytt objekt** i verktygen, ange Ny sak och välj
   **Lägg i utkastet och stäng**. Öppna **Karta** igen.
4. Välj **Tabell** och **Redigera Lampan**. Skriv Oskickad text som nytt namn.
   Växla mellan stående 390 × 844 och liggande 844 × 390 CSS-pixlar medan
   formuläret är öppet. Kontrollera det oskickade namnet i båda vyerna.
5. Välj **Stäng objektdialogen**, kontrollera fokus på **Fortsätt redigera**
   och tryck Escape. Namnet finns kvar. Stäng igen och välj uttryckligen
   **Kasta ändringarna och fortsätt**. Välj **Karta** och kontrollera
   axelvisarens placering utan att ändra egna flyttar eller Ny sak-förslaget.

**Förväntat resultat:**

- Visningsval sparas personligt. Minskad rörelse stänger av stjärnorna
  och inaktiverar reglaget, även när det personliga valet är på. När
  minskad rörelse stängs av återkommer det personliga valet. Axelvisaren
  stannar inom kartans synliga yta. Ingen automatisk animation krävs.
- Nya förslag flyttar inte befintliga placeringar eller kameran.
- Lampans oskickade namn består genom storleksbyten och avbruten förlust.
  Efter uttryckligt kastande finns sparade namn, personliga val och hela
  tidigare Ny sak-förslaget kvar.

### PLACERING-05: personlig avskildhet och återkallad tillgång

**Syfte:** Kontrollera att personliga vyer kräver aktuell hushållstillgång.

**Användare:** Alex, Robin och den utloggade profilen.

**Förutsättningar:** Följ
[förberedelsen för två provhushåll](../development/testing.md#a-second-household-on-the-same-installation).
Alex har Linden och Robin har först bara Eken på **samma installation**.
Skapa och flytta Lampan som Alex. Behåll Lindens adress och hushålls-ID
från Alex profil. Använd en tredje, utloggad profil för åtkomstprovet.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
testfallet “PLACERING-05: personal views stay private and revocation denies
further reads and both mutations”.

**Steg:**

1. Försök öppna Lindens adress utloggad och med Robins andra hushållstillgång.
   Kör åtkomstprovet nedan i båda profilernas Console.
2. Bjud in Robin till Linden och acceptera inbjudan som Robin. Öppna
   Lindens adress uttryckligen även om startsidan visar Eken. Flytta Lampan
   och ändra stjärnvalet som Robin.
3. Kontrollera Alex vy. Låt Robin behålla kartan öppen medan Alex
   återkallar Robins tillgång.
4. Välj Läs in min aktuella vy som Robin och försök fortsätta arbeta.
   Kör åtkomstprovet igen som Robin. Alla tre svar ska vara HTTP 403.

Kör följande endast när profilen **saknar** tillgång till Linden. Ange
Lindens ID från Alex kartbegäran i nätverkspanelen. Provet försöker läsa
vyn och göra båda slags ändringar genom appens publika HTTP-gränssnitt.
De tomma ändringarna ska nekas av tillgångskontrollen före valideringen.
Utloggad profil ska få tre HTTP 401; Robin utan tillgång ska få tre HTTP 403.

```js
await (async () => {
  const householdId = prompt('Lindens hushålls-ID');
  const identity = await (await fetch('/api/version')).json();
  const viewPath =
`/api/households/${encodeURIComponent(householdId)}/map/view`;
  console.log('read', (await fetch(viewPath)).status);
  for (const kind of ['position', 'settings']) {
    const response = await fetch(`${viewPath}/${kind}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Skyttel-Build': `${identity.commit}:${identity.version}`,
      },
      body: '{}',
    });
    console.log(kind, response.status);
  }
})();
```

**Förväntat resultat:**

- Utloggad och fel hushållstillgång ger inte tillgång till Lindens vyer.
- Robin ser egna val och ändrar inte Alex placeringar eller inställningar.
- Återkallad tillgång hindrar fortsatt läsning och båda slags sparanden.
  Inloggningsnavigationen är tillgänglig när helskärmskartan stängs.

## Inläsning och kamera

### PLACERING-06: sen första inläsning och bevarad kamera vid uppdatering

**Syfte:** Kontrollera att sparade placeringar syns vid kartans start och
att senare inläsningar och visningsval bevarar användarens kameravy.

**Användare:** Alex Exempel på dator med mus.

**Förutsättningar:** Lampan och Cykeln är sparade. Använd ett brett fönster
där lista och rymdkarta visas samtidigt. Webbläsaren kan simulera en långsam
anslutning. För fördröjningsdelen behöver rymdkartan hinna visas innan de
personliga placeringarna är färdiga att använda. Anteckna om denna ordning
inte går att återskapa; då är den delen inte bedömd manuellt.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
testfallet “PLACERING-06: delayed initial personal positions frame once and
later refreshes preserve the camera”.

**Steg:**

1. Välj namnet Lampan via **Tabell** och återgå med **Karta**.
   Öppna **Navigera**. Använd
   Flytta [objektets namn]: höger upprepade gånger tills Lampan ligger helt
   utanför den ursprungliga vyn. Vänta på beskedet att din personliga vy är
   sparad. Gör samma sak med Cykeln, utan att ändra kameran.
2. Aktivera långsam anslutning i webbläsarens nätverksinställningar och
   ladda om sidan. Kontrollera att **Tabell** och **Karta** kan öppnas.
Kontrollera
   Visa stjärnhimmel under Inställningar → Rymdkartan medan valet är
   inaktivt i väntan på de personliga placeringarna. Använd inte Återställ vy
   eller kameraknapparna.
3. Vänta tills Visa stjärnhimmel går att använda. Välj Tillbaka till kartan
   och kontrollera att båda objekten syns. Återgå till normal anslutning.
4. Öppna Navigera och använd Panorera höger så att objekten hamnar
   tydligt vid sidan av sina första lägen på skärmen. Behåll dem synliga
   och lägg märke till utsnittet.
5. Välj Läs in min aktuella vy under Ordna min vy. Vänta tills läsningen
   är klar och jämför utsnittet med det du valde i föregående steg.
6. Öppna Inställningar → Rymdkartan och aktivera Visa stjärnhimmel.
   Återgå med Tillbaka till kartan. Vänta på beskedet att vyn är sparad och
   jämför utsnittet igen.

**Förväntat resultat:**

- När de första personliga placeringarna är klara ramas de båda flyttade
  objekten in automatiskt. De syns utan att användaren återställer vyn,
  även när rymdkartan visas före den personliga inläsningen.
- Efter den första inramningen kan användaren välja ett eget utsnitt.
  Läs in min aktuella vy bevarar det utsnittet utan att kameran hoppar
  tillbaka eller zoomar om.
- Stjärnhimlen visas. Även efter att valet sparas ligger objekten kvar
  på samma ställen i utsnittet och kameran bevaras.

### PLACERING-07: stjärnval i Rymdkartans inställningar

**Syfte:** Anpassa bakgrunden utan att förlora urval eller personlig vy.

**Användare:** Alex Exempel.

**Förutsättningar:** Lampan och Cykeln är sparade enligt förberedelsen.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
testfallet “PLACERING-07: map settings retain the personal star choice through
navigation, reduced motion and restart”.

**Steg:**

1. Markera Lampan. Öppna Navigera och flytta den uppåt. Stäng navigeringen
   och lägg märke till urval och utsnitt.
2. Öppna Inställningar → Rymdkartan. Aktivera Visa stjärnhimmel och vänta
   på beskedet att din personliga vy är sparad.
3. Slå på systemets minskade rörelse. Kontrollera att reglaget är avstängt
   och inaktivt. Stäng av minskad rörelse och kontrollera att valet återkommer.
4. Välj Tillbaka till kartan. Kontrollera samma urval och utsnitt.
5. Starta om testinstallationen och ladda om sidan. Öppna Rymdkartans
   inställningar och kontrollera att stjärnvalet består.

**Förväntat resultat:**

- Valet sparas personligt och återkommer efter omstart.
- Minskad rörelse stänger av stjärnorna utan att radera det sparade valet.
- Kartans urval, kamera och tidigare placeringar består genom vybytet.
- Reglaget finns i inställningarna och går att nå med tangentbord.

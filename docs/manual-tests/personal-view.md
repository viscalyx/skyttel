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

1. Starta en isolerad installation enligt
   [utvecklingsguiden](../development/testing.md). Använd ett nytt hushåll
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
2. Välj Lampan i listan och öppna kartan. Öppna Ordna min vy, fokusera
   Flytta nedåt i rummet och tryck Enter. Aktivera Visa stjärnhimmel.
3. Ladda om, starta om servern och öppna samma hushåll i en annan klient
   med Alex inloggning.

**Förväntat resultat:**

- Vanligt drag flyttar i bildplanet. Shift-drag ändrar bara rummets höjd.
- Knappar fungerar med tangentbord. Flyttar och stjärnval återkommer
  efter omstart och i den andra klienten.
- Hushållets sparade uppgifter och utkast ändras inte av flyttningen.

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
   Visa stjärnhimmel från den andra klientens äldre inställningar.

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
   dra det första uppåt. Släpp det andra först och sedan det första.
2. Börja ett nytt drag och avbryt pekgesten, exempelvis genom att lämna
   webbläsaren. Återgå och kontrollera placeringen.
3. Börja höjdflyttning men släpp det första fingret före det andra.
   Fortsätt röra det kvarvarande fingret och släpp det.
4. Dra i tom rymd med ett finger. Panorera och nypzooma med två fingrar.

**Förväntat resultat:**

- Bildplansdrag och höjdled fungerar. Höjdhjälpen syns under höjdgesten.
- Avbruten gest och byte av det flyttande fingret återställer placeringen
  utan sparad flytt eller oavsiktlig redigering.
- Tom rymd styr kameran utan att ändra objektens placeringar.
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

1. Flytta Lampan. Aktivera Visa axlar hela tiden och välj hörnet uppe
   till vänster. Vänd panorering separat i sidled och höjdled.
2. Aktivera stjärnhimlen. Kontrollera bakgrunden.
3. Skapa Ny sak i listan och lägg i utkastet. Öppna kartan igen.
4. Skriv Oskickad text som nytt namn på Lampan utan att skicka texten.
   Öppna kartan och växla mellan stående och liggande smal visningsyta.
   Återgå till detaljerna.

**Förväntat resultat:**

- Visningsval sparas personligt. Stjärnhimlen syns och axelvisaren stannar
  inom kartans synliga yta. Ingen automatisk animation krävs.
- Nya förslag flyttar inte befintliga placeringar eller kameran.
- Lampans text och val samt det nya utkastet finns kvar efter vybyten.

### PLACERING-05: personlig avskildhet och återkallad tillgång

**Syfte:** Kontrollera att personliga vyer kräver aktuell hushållstillgång.

**Användare:** Alex, Robin och den utloggade profilen.

**Förutsättningar:** Alex har flyttat Lampan. Robin har först bara
tillgång till ett annat provhushåll.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
testfallet “PLACERING-05: personal views stay private and revocation denies
further reads and both mutations”.

**Steg:**

1. Försök öppna Linden utloggad och med Robins andra hushållstillgång.
2. Bjud in Robin till Linden. Flytta Lampan och ändra stjärnvalet som Robin.
3. Kontrollera Alex vy. Låt Robin behålla kartan öppen medan Alex
   återkallar Robins tillgång.
4. Välj Läs in min aktuella vy som Robin och försök fortsätta arbeta.

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

1. Välj Lampan via Lista och detaljer och öppna rymdkartan. Öppna Ordna
   min vy. Använd Flytta höger i rummet upprepade gånger tills Lampan
   ligger helt utanför den ursprungliga vyn. Vänta på beskedet att din
   personliga vy är sparad. Gör samma sak med Cykeln, utan att ändra kameran.
2. Aktivera långsam anslutning i webbläsarens nätverksinställningar och
   ladda om sidan. Kontrollera att lista och rymdkarta visas. Öppna Ordna
   min vy medan Visa stjärnhimmel ännu är inaktiv i väntan på de personliga
   placeringarna. Använd inte Återställ vy eller kameraknapparna.
3. Vänta tills Visa stjärnhimmel går att använda och kontrollera att båda
   objekten syns. Återgå till normal anslutning.
4. Öppna Navigera rymden och använd Panorera höger så att objekten hamnar
   tydligt vid sidan av sina första lägen på skärmen. Behåll dem synliga
   och lägg märke till utsnittet.
5. Välj Läs in min aktuella vy under Ordna min vy. Vänta tills läsningen
   är klar och jämför utsnittet med det du valde i föregående steg.
6. Aktivera Visa stjärnhimmel. Vänta på beskedet att vyn är sparad och
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

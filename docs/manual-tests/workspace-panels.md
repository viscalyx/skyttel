# Manuella testfall för fria paneler

Fallen omfattar objekt, samtal, panelplacering och byte av skärmstorlek.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

Alex är administratör i ett separat provhushåll. Använd en konfigurerad
testidentitet och påhittade uppgifter.

## Allmän förberedelse

1. Förbered en
   [separat provdatabas](../development/devcontainer.md#disposable-local-database)
   och logga in. Skapa ett hushåll med objekten Cykeln, Bilen och Garaget.
2. Spara hela utkastet. Börja varje fall med stängda paneler utan oskickad
   text. Behåll fliken mellan stegen.
3. För samtalet krävs en
   [konfigurerad assistent](setup/assistants.md). Använd text; mikrofon
   behöver inte startas.
4. Kör även med tangentbord och skärmläsare på fysisk telefon och dator.
   Anteckna hjälpmedel och plattformar separat från Chromium-emulering.

## Objekt och samtal

### PANEL-01: flera objekt i ett gemensamt utkast

**Syfte:** Jämföra och redigera flera objekt utan att kasta oskickad text.

**Användare:** Alex.

**Förutsättningar:** De tre objekten finns i den sparade kartan.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-01: independent object panels preserve unsent work and
reuse each object”.

**Steg:**

1. Öppna Lista och välj Cykeln. Kontrollera rubrikfokus, välj
   **Redigera valt objekt** och skriv en beskrivning utan att skicka den.
2. Öppna Lista igen och upprepa för Bilen och Garaget. Öppna även
   **Samtal och text**.
3. Välj Cykeln i **Öppna paneler** och stäng den med **Stäng Cykeln**.
   Öppna Cykeln från listan två gånger.
4. Välj varje objektpanel och lägg dess text i utkastet. Välj
   **Spara hela utkastet** från **Lista och utkast**.
5. Läs sparbeskedet, ladda om och öppna de tre objekten igen.

**Förväntat resultat:**

- Alla tre objekt och samtalet kan vara öppna samtidigt på dator.
- Varje objekt återanvänder sin panel och sin egen oskickade text.
- Panelstängning skickar eller kastar ingen text. Den uttryckliga
  handlingen **Stäng utan att skicka texten** kastar formulärtexten.
- Alla tre förslag kan läggas i samma privata utkast och sparas tillsammans.
  Beskrivningarna finns kvar efter omladdning.

### PANEL-02: flytta paneler och fortsätt på mobil

**Syfte:** Bevara samtalstext, objekttext och datorplacering vid skärmbyte.

**Användare:** Alex.

**Förutsättningar:** Cykeln finns i kartan och textassistenten är tillgänglig.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-02: mobile panel choice retains conversation, object text
and desktop positions”.

**Steg:**

1. Öppna Cykeln på dator och skriv en oskickad beskrivning.
2. Fokusera **Flytta Cykeln** och flytta med piltangenter. Klicka på
   rubrikens flyttkontroll, välj **Vänster** och stäng flyttknapparna med
   Escape. Dra därefter rubriken. Anteckna placeringen.
3. Öppna samtalet, lämna nödvändiga medgivanden och starta textassistenten.
   Skriv ett meddelande utan att skicka det.
4. Minska fönstret till telefonbredd. Välj varje panel med **Öppna paneler**.
   Stäng samtalspanelen och öppna den igen från verktygsfältet.
5. Återgå till den ursprungliga datorbredden och välj Cykeln.

**Förväntat resultat:**

- Dragning, piltangenter och flyttknappar fungerar. Escape återför fokus
  från flyttknapparna till flyttkontrollen.
- Aktiv panel kommer framför övriga vid pekning eller fokus.
- Mobil visar en panel i taget och väljaren kommer före panelen i
  läsordningen. Väljaren innehåller alla öppna paneler.
- Nya paneler får rubrikfokus; stängning går till nästa panel eller
  väljaren. När sista panelen stängs går fokus till Lista i verktygsfältet.
- Oskickad objekttext och samtalstext finns kvar. Datorplaceringen återkommer.
- Kontroller och text kan nås utan horisontell sidrullning.

### PANEL-03: ett nyare förslag får inte skrivas över

**Syfte:** Bevara oskickad text när samma objekt får ett annat förslag.

**Användare:** Alex.

**Förutsättningar:** Cykeln finns i kartan och textassistenten är tillgänglig.

**Integrationstest:**
[workspace-panels.spec.ts](../../tests/integration/workspace-panels.spec.ts),
testfallet “PANEL-03: an intervening proposal for the same object preserves
text and blocks stale staging”.

**Steg:**

1. Öppna Cykeln, välj **Redigera valt objekt** och skriv
   **Min oskickade text** som beskrivning utan att skicka formuläret.
2. Starta textassistenten och be om ett förslag till en annan beskrivning
   för samma cykel. Vänta på det bekräftade förslaget i ditt utkast.
3. Välj Cykeln i panelväljaren. Läs varningen och kontrollera din text.
4. Kopiera eventuell text som ska behållas. Välj
   **Stäng utan att skicka texten**, öppna Cykeln igen och börja redigera.

**Förväntat resultat:**

- Den oskickade texten bevaras men ett äldre formulär kan inte läggas i
  utkastet över det nyare förslaget.
- Efter uttrycklig stängning av formuläret bygger nästa redigering på det
  aktuella förslaget. Inget gemensamt sparande sker automatiskt.

# Manuella testfall för externa assistenter

Testfallen omfattar OAuth-medgivande, separat val om AI-behandling,
avgränsade läsningar, privata utkast och återkallad åtkomst. Anteckna commit,
webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

- Alex Exempel är administratör i Hushållet Linden och loggar in med Google.
- Robin Exempel är medlem i Linden och loggar in med Microsoft. Robin
  har också tillgång till Hushållet Eken, som Alex inte kan öppna.
- En extern textklient kan anslutas med OAuth. Klientens namn kan skilja
  sig från CI-provets Påhittad textassistent.

## Allmän förberedelse

1. Använd en testinstallation med enbart påhittade data. Förbered verklig
   klientåtkomst enligt [integrationsguiden](../development/assistants.md).
2. Skapa ett sparat objekt i Linden. Lägg olika privata förslag i Alex och
   Robins utkast. Lämna dem osparade. Behåll data mellan fallen men
   återkalla anslutningar och återställ medlemskap mellan körningarna.
3. Håll Alex och Robin inloggade i skilda webbläsarprofiler. Anteckna om
   klientprovet gäller ChatGPT web eller Codex-appen. CI använder riktiga
   protokoll och ersatta identitetsleverantörer; det är ett separat resultat.

## Medgivande

### AI-01: OAuth krävs innan assistenten kan läsa kartan

**Syfte:** Kontrollera att en okänd klient saknar kartåtkomst.

**Användare:** Alex och textklienten.

**Förutsättningar:** Klienten saknar en godkänd Skyttel-anslutning.

**Integrationstest:**
[assistants.spec.ts](../../tests/integration/assistants.spec.ts),
testfallet “AI-01: OAuth krävs innan assistenten kan läsa kartan”.

**Steg:**

1. Lägg till Skyttels MCP-adress i klienten med OAuth.
2. Begär en läsning utan att slutföra Skyttels medgivande.
3. Logga in i Skyttel i webbläsaren. Begär därefter `read_map` på `/mcp`
   från samma webbläsarsession med dess vanliga inloggningscookie men utan
   OAuth-token. Kör följande i utvecklarverktygens konsol på Skyttels sida:

   ```javascript
   const svar = await fetch('/mcp', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       jsonrpc: '2.0',
       id: 1,
       method: 'tools/call',
       params: { name: 'read_map', arguments: {} },
     }),
   });
   console.log(svar.status, await svar.json());
   ```

**Förväntat resultat:**

- Klienten behöver autentisering och medgivande. Inget kartinnehåll visas.
- Skyttels vanliga webbinloggning räcker inte som assistentmedgivande.
  Även anropet med enbart inloggningscookie får HTTP 401 utan kartinnehåll.

### AI-02: uttryckligt AI-val ger läsning och återkallelse stoppar gamla token

**Syfte:** Kontrollera läsåtkomst och omedelbar återkallelse.

**Användare:** Alex och textklienten.

**Förutsättningar:** Alex har tillgång till Linden.

**Integrationstest:**
[assistants.spec.ts](../../tests/integration/assistants.spec.ts),
testfallet “AI-02: uttryckligt AI-val ger läsning och återkallelse stoppar gamla
token”.

**Steg:**

1. Anslut klienten, välj Linden och godkänn extern AI-behandling och
   läsåtkomst. Be klienten läsa det sparade objektet.
2. Öppna Assistentanslutningar i Skyttel och återkalla klienten.
3. Begär en ny läsning i samma öppna klient.

**Förväntat resultat:**

- Första läsningen visar tillåtet kartinnehåll. Verktygen är läsande.
- Efter återkallelsen behövs ett nytt medgivande. Ingen ny läsning lyckas
  med den gamla anslutningen. Redan hämtad information kan finnas kvar
  hos klienten; Skyttel lovar inte att den raderas där.

### AI-03: medgivandet kräver val av hushåll och AI-behandling

**Syfte:** Kontrollera ett begripligt och aktivt behandlingsval.

**Användare:** Alex och textklienten.

**Förutsättningar:** Alex är inloggad i Skyttel.

**Integrationstest:**
[assistants.spec.ts](../../tests/integration/assistants.spec.ts),
testfallet “AI-03: medgivandet kräver val av hushåll och AI-behandling”.

**Steg:**

1. Starta anslutningen från klienten. Läs användarnamn, användar-ID,
   klientnamn, omfattning och information om extern behandling.
2. Välj Linden. Kontrollera att godkännande fortfarande är inaktiverat.
3. Markera AI-valet och godkänn läsåtkomsten. Läs kartan från klienten.
4. Återkalla anslutningen i Skyttel och återgå till kartan.

**Förväntat resultat:**

- Valet är skilt från cookies och lämnas inte förmarkerat. Texten lovar
  inte att extern AI-behandling enbart sker i EU.
- Rätt identifierad användare och valt hushåll framgår. Godkännandet
  kräver både hushållsval och AI-val. Efter återkallelse är listan tom
  och manuellt kartarbete finns kvar.

### AI-04: inloggning följs av medgivande och ett nej bevarar kartarbete

**Syfte:** Kontrollera inloggning och nekad anslutning.

**Användare:** Alex och textklienten.

**Förutsättningar:** Alex är utloggad i webbläsaren och klienten saknar
en godkänd anslutning.

**Integrationstest:**
[assistants.spec.ts](../../tests/integration/assistants.spec.ts),
testfallet “AI-04: inloggning följs av medgivande och ett nej bevarar
kartarbete”.

**Steg:**

1. Starta OAuth-anslutningen och logga in med Google när Skyttel ber om det.
2. Välj Nej, anslut inte på medgivandesidan.
3. Öppna Assistentanslutningar och återgå till kartan.

**Förväntat resultat:**

- Inloggningen återkommer till rätt medgivande. Klienten får nekad
  åtkomst och ingen aktiv anslutning skapas.
- Kartans manuella funktioner förblir tillgängliga.

## Åtkomstgränser

### AI-05: eget utkast förblir privat och återkallad åtkomst stoppar klienten

**Syfte:** Kontrollera privata utkast, hushåll och aktuellt medlemskap.

**Användare:** Alex, Robin och Robins anslutna textklient.

**Förutsättningar:** Båda har olika osparade utkast i Linden. Robins
medgivande gäller Linden, även om Robin också har tillgång till Eken.

**Integrationstest:**
[assistants.spec.ts](../../tests/integration/assistants.spec.ts),
testfallet “AI-05: eget utkast förblir privat och återkallad åtkomst stoppar
klienten”.

**Steg:**

1. Be Robins klient läsa det egna utkastet och därefter Alex utkast.
2. Begär att samma anslutning ska läsa Eken genom att ange dess namn.
3. Låt Alex återkalla Robins medlemskap genom Administrera tillgång.
4. Be Robins fortfarande öppna klient läsa utkastet igen.

**Förväntat resultat:**

- Endast Robins privata förslag i Linden kan läsas. Namn och alternativa
  identifierare ger inte tillgång till Alex utkast eller Eken.
- Återkallat medlemskap stoppar nästa anrop även i den öppna klienten.
  Administrativa åtgärder saknas bland assistentens verktyg.

### AI-06: avgränsad läsning visar direkta samband utan orelaterade uppgifter

**Syfte:** Kontrollera att en objektfråga får nödvändigt sammanhang utan
att hela kartan eller orelaterade typdefinitioner följer med.

**Användare:** Alex och den anslutna textklienten.

**Förutsättningar:** Klienten har läsåtkomst till Linden. Skapa och spara
fordonen Blå bilen och Cykeln två steg bort samt personerna Kim och Lo.
Ge personerna egna beskrivningar. Skapa också objekttypen Privat samling
med en egen beskrivning och ett textfält med beskrivning, och ett objekt
Samlingen av den typen. Spara följande samband: Blå bilen → Äger → Kim,
Lo → Använder → Blå bilen med osäker uppgift, Blå bilen → Används av →
Okänt, och Kim → Använder → Cykeln två steg bort.

**Integrationstest:**
[assistants.spec.ts](../../tests/integration/assistants.spec.ts),
testfallet “AI-06: avgränsad läsning visar direkta samband utan orelaterade
uppgifter”.

**Steg:**

1. Anropa `read_map` med Blå bilens `objectId`. Granska verktygssvaret.
2. Anropa samma verktyg med `query` satt till `BILEN`, och sedan med både
   Blå bilens ID och söktexten `bilen`.
3. Sök efter `ingen träff` och begär därefter ett obefintligt objekt-ID.
4. Ange både Blå bilens ID och söktexten `Samlingen`.
5. Begär slutligen hela den sparade kartan utan avgränsning.

**Förväntat resultat:**

- De tre läsningarna om bilen visar dess sparade uppgifter och tre direkta
  samband. Osäker och okänd uppgift har kvar sin betydelse.
- Kim och Lo visas som ändpunkter med endast ID, namn och typ i
  `contextObjects`. Deras beskrivningar, cykeln och Kims andra samband
  följer inte med. Samlingen och dess typ- och fältbeskrivningar saknas.
- Endast objekttyperna Fordon och Person samt sambandstyperna Äger,
  Använder och Används av följer med i de avgränsade svaren.
- Utebliven träff, obefintligt ID och motsägande ID och söktext ger tomma
  listor även för ändpunkter och typdefinitioner.
- Den oavgränsade läsningen visar de fem skapade objekten och fyra samband.
  `contextObjects` är då tom eftersom ändpunkterna redan är fullständiga
  objekt i svaret.

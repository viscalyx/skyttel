# Manuella testfall för externa assistenter

Testfallen omfattar OAuth-medgivande, separat val om AI-behandling,
avgränsade läsningar, privata utkast och återkallad åtkomst. Anteckna commit,
webbläsare och godkänt eller underkänt resultat vid körning. AI-07 är ett
separat manuellt prov med verklig Google-inloggning och Codex CLI. Det körs
inte i CI och har egna användare och förberedelser nedan.

## Konfigurerade användare

Följande användare gäller AI-01 till AI-06:

- Alex Exempel är administratör i Hushållet Linden och loggar in med Google.
- Robin Exempel är medlem i Linden och loggar in med Microsoft. Robin
  har också tillgång till Hushållet Eken, som Alex inte kan öppna.
- En extern textklient kan anslutas med OAuth. Klientens namn kan skilja
  sig från CI-provets Påhittad textassistent.

## Allmän förberedelse

Följande förberedelser gäller AI-01 till AI-06. För AI-07 används i stället
den isolerade installation som anges i testfallet.

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

## Verklig lokal klient

### AI-07: manuellt Codex CLI-prov med Google i devcontainern

**Syfte:** Kontrollera verklig Google-inloggning, OAuth-medgivande, läsning
av sparad karta och eget utkast samt återkallelse och ny anslutning från
Codex CLI i devcontainern.

**Användare:** Den Google-identitet som redan är konfigurerad som första
administratör i den privata `.env.local`. Samma person använder sin
befintliga Codex-inloggning. Personerna i demokartan är påhittade objekt,
inte ytterligare inloggade Skyttel-användare.

**Förutsättningar:** Följ
[den lokala Codex-förberedelsen](../development/assistants.md#manual-local-codex-cli-setup).
Terminal A kör den kompilerade appen på `http://localhost:3301` med en ny,
tillfällig databas. Google-klienten heter **Skyttel local development** och
har `http://localhost:3301/api/auth/callback/google` som tillåten returadress.
Port 3301 är vidarebefordrad till värddatorn. Terminal B används för Codex.
Öppna ett nytt privat webbläsarfönster. Återanvänd inte den vanliga
utvecklingsdatabasen eller en tidigare körnings databas.

Databasen innehåller `TestHousehold`, abonnemanget Familjens Molnmusik,
tjänstekontot Familjens musikkonto och administratörens osparade demoutkast.
Spara eller kasta inte utkastet under provet. Det innehåller även andra
påhittade förslag; detta fall kontrollerar förslaget om inloggningsadress.

**Integrationstest:** Endast manuellt. Verklig Google- och Codex-inloggning
ingår inte i CI eller pull request-körningar och kräver inga hemligheter
där. Närliggande protokollbeteenden täcks med ersatta identitetsleverantörer i
[assistants.spec.ts](../../tests/integration/assistants.spec.ts), bland annat
“AI-02: uttryckligt AI-val ger läsning och återkallelse stoppar gamla token”
och “AI-05: eget utkast förblir privat och återkallad åtkomst stoppar klienten”.
Dessa tester är inte bevis för genomfört AI-07.

**Steg:**

1. Starta `bash scripts/manual-codex-case.sh` i terminal B för guidad körning,
   eller kör integrationsguidens CLI-kommandon själv vid respektive steg.
   Kör först `mcp login` enligt guiden.
   Öppna den utskrivna adressen i värddatorns privata webbläsarfönster.
2. Välj **Fortsätt med Google** och logga in med den konfigurerade
   administratörens Google-konto. Kontrollera att du kommer tillbaka till
   Skyttels medgivandesida på port 3301.
3. Kontrollera användaren och klientnamnet, välj `TestHousehold`, läs
   informationen om extern AI-behandling och markera det separata AI-valet.
   Välj **Godkänn läsåtkomst**. Kopiera den fullständiga slutliga
   returadressen från webbläsaren till den väntande CLI-inloggningen.
   Klistra inte in adressen i Codex-konversationen. Webbläsaren kan visa
   anslutningsfel vid returadressen; CLI måste ändå bekräfta inloggningen.
4. Starta den interaktiva Codex-klienten med integrationsguidens kommando.
   Be den: ”Använd endast MCP-servern skyttel_development_case. Anropa
   read_map med query Familjens Molnmusik. Visa abonnemangets sparade pris
   och direkta samband. Läs inga lokala filer och använd inte terminalen
   för att hitta svaret.” Kontrollera det faktiska verktygsanropet och
   svaret, inte enbart modellens sammanfattning.
5. Begär ett nytt `read_map` med `query` satt till `Familjens musikkonto`.
   Kontrollera kontots sparade samband **Inloggningsadress**. Begär sedan
   `read_my_draft` utan argument. Be Codex skilja den sparade adressen från
   förslaget i ditt privata utkast. Kontrollera båda verktygssvaren.
6. Öppna `http://localhost:3301` i samma privata webbläsarfönster. Öppna
   **Assistentanslutningar** i `TestHousehold` och välj
   **Återkalla anslutning** för testklienten. Låt Codex-sessionen vara öppen.
7. Begär ett nytt `read_map` för Familjens Molnmusik i samma Codex-session.
   Kräv ett nytt verktygsanrop och granska resultatet. Godkänn inte en ny
   inloggning eller ett nytt medgivande ännu. Ett svar från tidigare
   konversation bevisar varken ny läsning eller nekad åtkomst.
8. Avsluta Codex-sessionen. Kör guidens `mcp logout` för testservern och
   därefter samma `mcp login` igen. Slutför ett nytt Skyttel-medgivande i
   webbläsaren och överför returadressen till CLI. Google kan minnas sin
   inloggning; ett nytt Skyttel-medgivande krävs ändå.
9. Starta Codex med samma serverinställning och begär ett nytt `read_map`
   för Familjens Molnmusik. Kontrollera att verktyget åter kan läsa data.
10. Återkalla även den nya anslutningen i Skyttel. Följ guidens städning:
    avsluta Codex, ta bort testserverns CLI-inloggning, stäng det privata
    webbläsarfönstret och stoppa terminal A. Kontrollera att den tillfälliga
    databasen tas bort. Behåll ordinarie utvecklingsdata och inloggningar.
11. Anteckna datum, commit, Codex-version, webbläsare, lokal adress, Google
    som leverantör, resultat per kontroll och städningens resultat. Utelämna
    hemligheter, personliga identiteter och returadressens frågeparametrar.

**Förväntat resultat:**

- Rätt Skyttel-användare ger uttryckligt medgivande för `TestHousehold`.
  Codex-inloggningen ensam ger ingen tillgång till hushållet.
- Abonnemangets beskrivning anger det påhittade priset 149 kr per månad.
  Alex Exempel står på avtalet, Kim Exempel betalar och betalningsmedlet
  är Familjens musikkort. Uppgifterna kommer från ett lyckat `read_map`.
- Kontots sparade inloggningsadress är `familjen@example.test`.
  `read_my_draft` visar förslaget `musik@example.test` i administratörens
  eget utkast. Förslaget är inte en sparad ändring i den gemensamma kartan.
- Återkallelsen stoppar en ny verktygsläsning med den gamla anslutningen.
  Ett autentiseringsfel eller krav på nytt medgivande ger inga nya kartdata.
  Uppgifter som redan finns i konversationen behöver inte försvinna.
- En ny anslutning med nytt medgivande kan läsa kartan igen. Efter städning
  återstår ingen aktiv testanslutning, testserver eller tillfällig databas.

**Resultatstatus:** Inte genomfört. Om klientregistrering eller inloggning
inte fungerar, anteckna blockerat och ett felbesked utan känsliga värden.
Om ett observerat resultat strider mot kraven, anteckna underkänt. Om inget
nytt verktygsanrop kan visas, är den kontrollen inte verifierad. Anteckna
godkänt först när alla kontroller är genomförda. Ett godkänt AI-07 verifierar
inte ChatGPT på webben, Codex-appen, Microsoft-inloggning eller den
driftsatta HTTPS-ingången.

Kör fallet efter att hela specifikation #31 är implementerad. Registrera
resultatet i den separata, icke blockerande
[restlistan #97](https://github.com/viscalyx/skyttel/issues/97).

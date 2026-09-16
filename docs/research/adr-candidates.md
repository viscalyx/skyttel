# Inventering av kandidater till Skyttels arkitekturbeslut

Kunskapsläge: 16 september 2026. Rapporten är researchunderlag till
[Vilka fattade beslut är kandidater för ADR:er?][inventering],
inför beställarens prövning i
[Vilka ADR:er ska ingå i Skyttels arkitekturdokumentation?][urval].
Den fastställer inget ADR-urval och ändrar inga produktbeslut.

## Resultat och läsanvisning

Hela kartans 23 avslutade poster omfattas. De ger färre självständiga
arkitekturfrågor än antalet ärenden: research, prototyper och den samlade
specifikationen stödjer ofta samma beslut. Nedan finns sexton avgränsade
kandidater, varav flera uttryckligen behöver mer belägg eller sannolikt
hör bättre hemma i den befintliga specifikationen.

Starkast sammanhängande underlag finns för gemensamma MCP-regler, samlat
sparande, fullständig export med separat åtkomst, redigerbara typer och
Render med SQLite. Detta är en **bedömning**, inte ett godkänt urval.
Återställning med egen export och extern AI-behandling har särskilt
betydelsefulla konsekvenser, men även där måste de tre villkoren prövas
var för sig. Ett viktigt krav eller ett dokumenterat tekniknamn räcker
inte. Källstödet ger framför allt inte automatiskt en dyr byteskostnad.

### Metod och kriterier

Primärkällorna är beslutskartan, varje indexerad resolution, kommentarerna
som resolutionerna uttryckligen införlivar och versionsbundna underlag.
Ärendekroppar och mellananteckningar används för sammanhang och alternativ,
inte som slutliga beslut där en senare resolution preciserar valet.
Rapporten gör ingen ny leverantörs-, pris- eller kompatibilitetskontroll:
leverantörsuppgifter återges bara som del av beslutsunderlagets jämförelse.

De lästa lokala instruktionerna är research, domain-modeling och dess
ADR-FORMAT.md, samt repositoryts AGENTS.md, CONTEXT.md,
.github/copilot-instructions.md och .github/instructions/*.md.
Domain-modeling kräver samtidigt:

1. Betydande kostnad att ändra beslutet senare.
2. Ett val som behöver förklaras för en framtida läsare.
3. En verklig avvägning mellan alternativ, med skäl för det valda.

**Källfakta** betyder vad ett angivet underlag faktiskt säger.
**Bedömning** betyder denna rapports slutsats. Ingen källa uppskattar
byteskostnad i arbetstid för kandidaterna; sådan kostnad nedan är en
kvalitativ bedömning av de uttryckligen beslutade kopplingarna.
**Lucka** innebär att uppgiften inte kan beläggas tillräckligt, inte att
ett nytt motiv får konstrueras.

ADR-FORMAT.md anger kort svensk titel och normalt ett stycke med
sammanhang, beslut och varför. Alternativ, konsekvenser och status är
valfria när de tillför något. Formatet motiverar inte en fil per bibliotek,
acceptansfall eller ordlistepost.

### Repositoryts dokumentation och källstatus

Huvudcheckoutens HEAD är
[repositoryts startrevision][startrevision].
CONTEXT.md och docs/planning/README.md är lokala, ännu ej incheckade
arbetsfiler vid inventeringen. Ingen befintlig docs/adr/-katalog finns i
checkouten. Arbetsfilerna är lästa men kopieras inte till researchbranchen
och får inte utgöra enda beständiga belägg.

CONTEXT.md är en ordlista. Den skiljer bland annat person från
Skyttel-användare, objekttyp från objekt, sambandstyp från samband,
utkast från sparad karta samt upphört, borttaget och permanent raderat.
De beständiga definitionerna och valen kan spåras till
[Vilka objekt, relationer och ord behöver Skyttels första scenario?][begrepp],
[Vem får se och ändra hushållets information?][atkomst],
[Vilken information ska sparas, ändras över tid och kunna återställas?][information]
och
[Hur ska hushållet skapa och ändra egna objekt- och sambandstyper?][typer].
En ADR får inte göra ordlistans exempel till låsta typer.

docs/planning/README.md anger att detaljer hör hemma i resolutionerna.
Det stämmer med Wayfinders krav att kartan är ett index och att
beslutsdetaljen finns på en kanonisk plats. Hur eventuella ADR:er ska
komplettera detta är fortfarande frågan i
[Vilka ADR:er ska ingå i Skyttels arkitekturdokumentation?][urval].

## Täckning av beslutskartan

Varje länk nedan går till kartans kanoniska resolution. Även avslutad
research och den praktiska åtkomstuppgiften redovisas; avslutad betyder
inte automatiskt ett godkänt produktval.

- [Vilka tekniska vägar kan stödja svenska samtal som ändrar en relationskarta?][talresearch]:
  stöd till **Delegerat tal med gemensamt kartarbete** och **Extern
  AI-behandling utan beständiga samtal i Skyttel**. Forskningsalternativ,
  ingen självständig vald arkitektur.
- [Hur kan externa AI-assistenter läsa och föreslå ändringar i Skyttel?][assistentresearch]:
  stöd till **Gemensam MCP-ingång med avgränsat kartarbete**.
  Föreslagna flöden blir inte krav förrän senare beslut.
- [Vilka objekt, relationer och ord behöver Skyttels första scenario?][begrepp]:
  huvudsakligen ordlista och funktionella identitetskrav. Avgränsad
  möjlig kandidat **E-postadressens identitet frikopplas från kontot**;
  delar ingår också i samlat sparande och redigerbara typer.
- [Vem får se och ändra hushållets information?][atkomst]:
  kandidaterna **Gemensam hushållskarta med lika vardagsåtkomst** och
  **Extern AI-behandling utan beständiga samtal i Skyttel**.
  Hemlighetsgränsen bedöms separat bland bortvalen.
- [Hur ska samtalet skapa, rätta och spara en begriplig karta?][samtal]:
  ingår i **Privata utkast sparas som en kontrollerad ändringsgrupp**.
  Färger, markeringar och dialogens detaljer är funktionskrav.
- [Hur gör 3D-vyn hushållets samband tydliga och redigerbara?][rymd]:
  **Rymdvy och lista delar kartarbete men inte domänbetydelse** behöver
  kompletterande jämförelsemotiv. Grafikbibliotek fastställs senare.
- [Vilken information ska sparas, ändras över tid och kunna återställas?][information]:
  bidrar till samlat sparande, personlig presentation, extern behandling,
  export med separat åtkomst och permanent radering. Bildstorlek,
  frivilliga fält och statusbegrepp behöver ingen separat ADR.
- [Vilken roll ska externa AI-assistenter få i första Skyttel?][mcp]:
  **Gemensam MCP-ingång med avgränsat kartarbete**; sparregeln ingår
  i den gemensamma kandidaten om utkast och ändringsgrupper.
- [Vilka enheter och distributionsformer behöver första Skyttel?][plattform]:
  **Webb med internetkrav och gemensamt arbete på flera enheter**.
  Exakt Chrome-målbild och senare prov är specifikationsgränser.
- [Kan en extern assistent genomföra Skyttels gemensamma MCP-flöde?][mcpprov]:
  prototypbelägg för MCP och samlat sparande, ingen separat ADR om
  provets Python, stdio eller simulerade identitet.
- [Kan Skyttels kartarbete fungera på valda enheter med pekgester och tillgängliga alternativ?][enhetsprov]:
  stöd till gemensam presentation och plattformskandidat. Gestdetaljer
  och accepterade provantaganden är krav respektive verifieringsstatus.
- [Ordna API-nyckel och åtkomst för Skyttels talprov][talatkomst]:
  inget ADR-behov; en praktisk förutsättning och provbudget.
- [Vilken talväg klarar det godkända samtalsflödet på svenska?][talprov]:
  **Delegerat tal med gemensamt kartarbete**. Modelljämförelsen har
  belägg, men modellinställningens byteskostnad är inte visad.
- [Vilka drift- och lagringsalternativ passar Skyttels krav och kostnadsram?][driftresearch]:
  jämförelseunderlag för Render/SQLite, export, egen återställning och
  radering. Forskningsalternativen är inte egna produktbeslut.
- [Vilka villkor och klientstöd gäller för Skyttels valda AI- och MCP-flöden?][airesearch]:
  stöd till MCP, tal och extern behandling. Dokumenterat stöd är skilt
  från verifierad fjärranslutning.
- [Kan Cloudflare ge Skyttel billigare sammanhängande drift?][cloudflareresearch]:
  verkligt jämförelsealternativ till Render; ingen ADR för en införd
  Cloudflare-arkitektur.
- [Vad kan Gandi erbjuda för Skyttels drift och lagring?][gandiresearch]:
  jämförelseunderlag för driftkandidaten. Inget permanent Gandi-avslag.
- [Kan Azure Static Web Apps Free bära första Skyttel?][azureresearch]:
  jämförelseunderlag för driftkandidaten. Inget beslut att Azure är
  omöjligt eller att gratisdrift är verifierad.
- [Vilka säkerhetskontroller och uppdateringsflöden bör Skyttel återanvända från Kravhantering?][sakerhetsresearch]:
  stöd till **En granskad merge levererar samma verifierade bild**
  och **Blockerande säkerhetskontroller även utan tillgänglig fix**.
- [Vilket devcontainer-upplägg ger fungerande Codex för Skyttels stack?][devresearch]:
  inget självständigt ADR-behov belagt. Rättighetsvalet är ännu inte
  fastställt; vanlig profil först är accepterad utgångspunkt.
- [Vilken sammanhängande teknik och lagring uppfyller de prövade behoven?][teknik]:
  flera kandidater: drift/lagring, export, återställning, radering,
  release, säkerhet och teknikgrund. Den fullständiga tekniklistan
  ska inte bli en enda ogenomskinlig ADR.
- [Hur ska hushållet skapa och ändra egna objekt- och sambandstyper?][typer]:
  **Hushållets typer är redigerbara data med bevarad historik**.
  Livscykel och spärrar är konsekvenser; ord och acceptansfall stannar
  i ordlista respektive grundspecifikation.
- [Vad ska första användbara Skyttel innehålla och hur vet vi att det räcker?][specifikation]:
  samlar och preciserar kandidaternas krav. Ingen separat ADR för att
  specifikationen godkänns, för provstorlek eller för varje acceptansfall.

## Kandidater och belägg

### Gemensam hushållskarta med lika vardagsåtkomst

**Källfakta.** Hushållets Skyttel-användare ser och redigerar hela den
gemensamma kartan, även andras uppgifter. Privata kartdelar och rättigheter
per objekt behövs inte i första versionen. Administratörer hanterar
tillgång; flera är möjliga. Syftet är att en annan hushållsmedlem ska kunna
förstå och ta över åtaganden. Hushåll isoleras från varandra.
[Vem får se och ändra hushållets information?][atkomst]

Det dokumenterade alternativet är privata delar eller behörigheter per
objekt. Källan anger varför gemensam insyn behövs, men ingen detaljerad
jämförelse med varje tänkbar rollmodell. Privata utkast är ett separat
arbetsläge, och fullständig export ger administratören insyn i dem.
[Vilken information ska sparas, ändras över tid och kunna återställas?][information]

- **Kostnad att ändra – troligen betydande, bedömning.** Per-objektåtkomst
  skulle påverka UI, MCP, bilder och export eftersom alla nu använder
  hushållsgränsen. Dessa ytor är uttryckliga i
  [grundspecifikationens åtkomstfall][acceptans].
  Kostnadens storlek är inte uppskattad.
- **Förklaringsbehov – väl belagt.** Likvärdig redigering trots olika
  uppgiftslämnare och begränsad administratörsroll kan annars se felaktig
  ut; överlämningssyftet förklarar det. [Åtkomstbeslutet][atkomst]
- **Verklig avvägning – delvis belagd.** Gemensam insyn väljs framför
  privata kartdelar; syftet finns. Källan visar inget krav på detaljerade
  roller som aktivt vägs bort. [Åtkomstbeslutet][atkomst]

**Överlapp och lucka.** Avgränsa till vardagsåtkomstens hushållsgräns.
MCP:s verktygsgräns och exportens särskilda insyn har egna kandidater.
Definitionerna av person, användare och administratör hör till ordlistan.
Nästa prövning behöver avgöra om det belagda alternativet och syftet
utgör tillräcklig avvägning; uppfinn inget säkerhets- eller kostnadsmotiv.

### E-postadressens identitet frikopplas från kontot

**Källfakta.** E-postadressen är eget objekt, i stället för det första
förslaget att bara vara en kontouppgift. Flera personer och tjänstekonton
kan dela adress; ett konto behåller identiteten vid adressbyte. Namn
och adress avgör inte ensamma identitet. Det är det dokumenterade valet,
alternativet och sammanhanget.
[Vilka objekt, relationer och ord behöver Skyttels första scenario?][begrepp]

- **Kostnad att ändra – möjlig, inte fastställd.** Identitet och historik
  behöver bevaras vid adressbyte enligt
  [informationsbeslutet][information].
  En senare sammanblandning kan kräva datamigrering, men detta är en
  bedömning; källan fastställer uttryckligen inte databasstrukturen.
- **Förklaringsbehov – belagt.** Ett separat adressobjekt kan förvåna när
  adress vanligtvis kan beskrivas som ett fält. Delning och skilda
  adressroller ger källstödd förklaring. [Begreppsbeslutet][begrepp]
- **Verklig avvägning – belagd på domännivå.** Det första fältförslaget
  ersätts uttryckligen av eget objekt för de många kopplingarna.
  [Begreppsbeslutet][begrepp]

**Överlapp och lucka.** Preliminärt tveksam som egen ADR: mycket finns
redan där det ska finnas, i ordlistan och specifikationen. En möjlig ADR
måste beskriva identitetsgränsens arkitekturella konsekvens, inte kopiera
definitionerna eller hävda ett fastställt SQL-schema. Den är inte ett
beslut om att samma adress ska länka Google- och Microsoft-identiteter.

### Extern AI-behandling utan beständiga samtal i Skyttel

**Källfakta.** Extern behandling accepteras för att prioritera funktionens
kvalitet; lokal behandling är inget krav. Användaren gör ett tydligt val.
Relevant kartinnehåll inom hushållets åtkomst får skickas för uppgiften.
[Åtkomstbeslutet][atkomst]
Skyttel bevarar utkastets nödvändiga sammanfattning men inte ljud och
fullständig samtalshistorik som beständigt hushållsinnehåll.
[Informationsbeslutet][information]
Det accepterade teknikunderlaget använder global OpenAI-API och
`store: false`; EU-databas betyder inte att all AI-behandling är i EU,
och noll leverantörslagring är inte utlovad.
[Skyttels teknikbeslut – AI-data och kostnadsuppföljning][teknik-ai]

Lokal behandling är ett verkligt beskrivet alternativ i
[talresearchens jämförelse][talrapport].
Ett separat motiv för att inte bevara fullständiga samtal anges däremot
inte i resolutionen; rapporten tillskriver inte beslutet ett nytt
kostnads-, integritets- eller efterlevnadsmotiv.

- **Kostnad att ändra – delvis belagd.** Externt behandlade uppgifter
  omfattas av externa lagringsvillkor; ett senare lokalt val gör inte
  sådan behandling ogjord. [AI- och MCP-underlaget][airapport]
  Byte av behandlingsarkitektur bedöms betydande; inga timmar anges.
- **Förklaringsbehov – väl belagt.** Privat hushållskarta och extern
  behandling är avsiktligt förenliga. Valet av kvalitet och den skilda
  leverantörslagringen förklarar detta. [Åtkomstbeslutet][atkomst]
- **Verklig avvägning – belagd för extern kontra lokal behandling.**
  Kvalitet prioriteras uttryckligen. För separat ADR om att kasta ljud
  saknas motsvarande jämförande motiv. [Åtkomstbeslutet][atkomst]

**Överlapp och lucka.** En eventuell kort ADR bör avgränsas till den
externa behandlingsgränsen och använda samtalslagringen som ett villkor.
Talmodeller, leverantörskopior vid radering och hushållsbehörighet är
separata frågor. Cookieval är uttryckligen skilt från AI-valet i
[grundspecifikationen][specifikation]. Inga juridiska garantier härleds.

### Hushållets typer är redigerbara data med bevarad historik

**Källfakta.** Hushållets katalog är öppen; förifyllda typer är vanliga,
redigerbara definitioner. Alla kartredigerare kan föreslå ändringar.
Formulär och assistenter använder aktuella definitioner. Typändring
bevarar objektets identitet och samband. Aktuell användning och privata
utkast blockerar borttagning; historiska definitioner bevaras utan att
låsa den aktuella katalogen.
[Hur ska hushållet skapa och ändra egna objekt- och sambandstyper?][typer]

Verkliga alternativ som behandlas är låsta standardtyper, automatisk
fältkonvertering, sammanslagning av definitioner och automatisk
borttagning av användande innehåll. Valet är redigerbara typer, uttrycklig
hantering av fält/typbyten och spärr vid användning. Bakgrunden är
beställarens fria registrering bortom den ursprungliga exempelkatalogen.
[Grundspecifikationens omfattningsprecisering][specstatus]

- **Kostnad att ändra – stark kvalitativ bedömning.** Definitioner,
  fält, utkast, historik, export, formulär och MCP måste följa samma
  katalog. Att senare hårdkoda typer berör sparat hushållsinnehåll.
  Kopplingarna är källfakta i [typbeslutet][typer]; byteskostnaden är
  inferens, inte uppmätt.
- **Förklaringsbehov – väl belagt.** Ordlistans etablerade vardagsbegrepp
  ger inga skyddade standardtyper och historik låser inte katalogen.
  Detta förtydligas uttryckligen i [typbeslutet][typer].
- **Verklig avvägning – delvis belagd.** Alternativen och den valda vägen
  är dokumenterade. Fri registrering motiverar öppen katalog.
  Detaljskäl för varje nej till automatik saknas; påstå inte att de
  beror på budget eller ett genomfört komplexitetsmått. [Typbeslutet][typer]

**Överlapp och lucka.** Stark kandidat för själva dataägda typkatalogen.
Livscykelreglerna är konsekvenser, inte en ADR per knapp eller fälttyp.
Orddefinitioner och åtta acceptansfall stannar i befintliga underlag.
Teknikunderlagets generella validering får inte läsas som en sluten
katalog; den senare typresolutionen styr detta.

### Gemensam MCP-ingång med avgränsat kartarbete

**Källfakta.** Egen och extern assistent använder samma MCP-ingång för
karta, eget utkast, historik och ångring. Samma hushållsregler ska gälla
oavsett var samtalet förs. Administrativa funktioner erbjuds inte som
assistentverktyg, även för en administratör; de finns i Skyttels UI/API.
[Vilken roll ska externa AI-assistenter få i första Skyttel?][mcp]
Webbformulär och MCP använder samma kartregler enligt
[Skyttels teknikbeslut – gränser mellan delarna][teknik-granser].

Direkta verktyg och MCP är verkliga researchalternativ.
[Externa AI-assistenter och privat åtkomst][assistentrapport]
MCP på/av prövas också utan påvisad betydande lokal transportfördröjning;
det bevisar inte att MCP gör modellen snabbare.
[Talprovets jämförelser][taltester]

- **Kostnad att ändra – stark kvalitativ bedömning.** Klientverktyg,
  inloggning, utkast, versionskontroll och administrativa hänvisningar
  binds till den gemensamma ingången. [MCP-beslutet][mcp]
  Byte påverkar flera klientkontrakt; kostnadsmått saknas.
- **Förklaringsbehov – väl belagt.** Även den egna assistenten använder
  MCP och även en administratör saknar administrativa verktyg.
  Den gemensamma regeltillämpningen är uttryckligt motiv. [MCP-beslutet][mcp]
- **Verklig avvägning – belagd för gemensam ingång.** Direkta anrop finns
  som alternativ och jämförelse, medan samma regler väljs.
  Motivet för just administrationens verktygsgräns är mindre utförligt
  dokumenterat; kalla det inte ett verifierat skydd mot alla AI-risker.
  [MCP-beslutet][mcp], [talprovets jämförelser][taltester]

**Överlapp och lucka.** Sparprotokollet är en egen kandidat. Håll isär
leverantörsmodell och extern assistent. Lokal stdio med simulerad identitet
är provbevisning; produktionsvalet är HTTPS/Streamable HTTP och OAuth,
vars faktiska fjärrflöden återstår att verifiera.
[Godkänt MCP-provs rekommendation][mcprekommendation],
[teknikbeslutet][teknik]

### Privata utkast sparas som en kontrollerad ändringsgrupp

**Källfakta.** Förslag syns löpande i ett privat beständigt utkast.
Användarens sparbesked gäller hela det aktuella utkastet. Ett separat
obligatoriskt granskningssteg ersätts av sammanfattningen under samtalet.
En entydig rättelse med sparbesked får slutföras utan extra ja.
[Samtalsbeslutet][samtal], [MCP-provet][mcpprov]

Servern kontrollerar medlemskap, utkastversion, berörda värden och
domänvillkor; karta, historik, förbrukad version och kvitto skrivs
tillsammans. Samma operations-ID med samma innehåll återger samma
resultat. Ångring är ett nytt förslag mot dagens tillstånd och bevarar
oberoende senare ändringar.
[Skyttels teknikbeslut – lagring och samlat sparande][teknik-sparande]
Överlapp med eget utkast stoppar ångring tills konflikten är löst.
[Grundspecifikationens acceptansfall][acceptans]

- **Kostnad att ändra – stark kvalitativ bedömning.** Sparade grupper,
  historik, återförsök, privata utkast och samtliga klienters kontrakt
  hänger ihop. Dessa beroenden är explicit beslutade i
  [teknikunderlaget][teknik-sparande]; ändringskostnaden är inferens.
- **Förklaringsbehov – väl belagt.** Ett sparat kvitto väger tyngre än
  modellens besked; avbrutet tal upphäver inte sparande. Sammanfattning
  och sparbesked ersätter extra ja utan att släppa serverkontroller.
  [Samtalsbeslutet][samtal], [MCP-beslutet][mcp]
- **Verklig avvägning – belagd.** Separat granskningssteg är ett faktiskt
  ersatt prototypupplägg. Fullt utkast väljs uttryckligen även när en
  konflikt skulle lämna oberoende förslag möjliga att spara separat.
  [Samtalsbeslutet][samtal], [sparregelns förtydligande][sparregel]

**Överlapp och lucka.** Kandidaten gäller livscykeln från privat förslag
till verifierad ändringsgrupp, inte alla formulärkrav. Den beslutar inte
event sourcing, CRDT eller allmän distribuerad synk; inga sådana val är
belagda. Intern modellkontroll är inget oberoende bevis på mänskligt
godkännande. Se [MCP-provet][mcpprov] och
[det godkända tekniska detaljunderlaget][teknik-sparande].

### Fullständig export återställer innehåll men inte gammal åtkomst

**Källfakta.** Administratören exporterar och återimporterar allt unikt
hushållsinnehåll i en sammanhållen operation. Import ersätter innehållet,
den slår inte ihop det. Aktuell åtkomst bevaras; äldre export ger aldrig
automatiskt en borttagen användare tillgång igen. Exporten omfattar även
andras privata utkast, vilket ska framgå.
[Informationsbeslutet][information]

Den fastställda tekniska vägen är versionerad ZIP med manifest, JSON,
bilder, kontrollsummor och stabila identiteter. Hemligheter, sessioner och
aktiva OAuth-token ingår inte. Historiska identiteter kopplas uttryckligen
på ny installation; omappade identiteter bevaras utan åtkomst.
[Skyttels teknikbeslut – export, återimport och radering][teknik-export]
Flytt sker via detta format; konsekvent SQLite-kopia är möjlig men är
inte användarens planerade flyttväg.
[Skyttels teknikbeslut – container, databas och byte av driftvärd][teknik-flytt]

- **Kostnad att ändra – stark kvalitativ bedömning.** Redan utgivna
  exportversioner och historiska identiteter kräver fortsatt läsning
  eller explicit formatmigrering. Det dokumenteras i
  [teknikunderlaget][teknik-export]. Kostnadsbelopp saknas.
- **Förklaringsbehov – väl belagt.** Full återställning har ett avsiktligt
  undantag för åtkomst och synliggör privata utkast för administratören.
  Skälet att inte återge borttagna användare tillgång är uttryckligt.
  [Informationsbeslutet][information]
- **Verklig avvägning – belagd.** Ersättande import väljs framför
  sammanslagning; separat format väljs framför beroende av gammal disk.
  Innehåll och historisk författare bevaras utan att historisk identitet
  räcker för inloggning. [Informationsbeslutet][information],
  [teknikunderlaget om flytt][teknik-flytt]

**Överlapp och lucka.** Flyttbarhet och åtkomstundantaget bildar här samma
exportkontrakt. Om nästa prövning delar dem måste den undvika dubbla
beskrivningar av formatet. Återställningsberedskap utan backup är ett
annat beslut. ADR:n behöver inte återge hela filformatet eller
administratörsbegreppets definition.

### En portabel appcontainer med SQLite och små bilder i databasen

**Källfakta.** Render Hobby med betald app och beständig disk väljs.
Node-processen använder SQLite som bibliotek; ingen separat
databascontainer behövs. Små omkodade bildversioner ligger i databasen.
En enda appinstans och kort uppdateringsavbrott accepteras.
[Teknikbeslutet][teknik]

Det tydliga slutalternativet är billigare Cloudflare med mer
leverantörsanpassad server-, lagrings- och sessionslogik. Vanlig container,
enklare sammanhängande lagring och framtida flyttbarhet är dokumenterade
motiv för Render. [Godkänt teknikunderlag][teknikrapport]
Render med PostgreSQL, Supabase och egen server är också utredda
alternativ, liksom Gandi och Azure; de utgör jämförelseunderlag och
innebär inga varaktiga avslag.
[Driftunderlaget][driftrapport], [Gandi-underlaget][gandirapport],
[Azure-underlaget][azurerapport]

- **Kostnad att ändra – väl underbyggd bedömning.** SQLite ger lokal disk
  och en skrivmodell; Cloudflare-portering byter flera plattformsgränssnitt,
  och PostgreSQL kräver adapter/importarbete. De konkreta beroendena
  anges i [teknikunderlaget om flytt][teknik-flytt]. Vanlig container
  minskar kostnaden men eliminerar den inte.
- **Förklaringsbehov – väl belagt.** En relationsdatabas för en visuell
  nätverkskarta och bildbytes i databasen kan överraska. Transaktioner,
  få serverdelar och konsekvent export förklarar formen.
  [Driftunderlagets datamodell och bilder][driftrapport]
- **Verklig avvägning – väl belagd.** Lägsta pris vägs mot anpassning och
  portabilitet. PostgreSQL underlättar flera appinstanser; SQLite minskar
  delar. Bilder i databasen ger större databas men förenklar samstämmig
  lagring/export. [Teknikunderlaget][teknikrapport],
  [driftunderlaget][driftrapport]

**Överlapp och lucka.** Arkitekturens sammanhängande drift- och
lagringsform motiverar gruppen; en eventuell separat bild-ADR bör bara
finnas om avvägningen behöver egen synlighet. Exakta priser är daterade
räkneunderlag, inte motiv att låsa en evig prisrelation. Frankfurt,
diskstorlek och enskilda bibliotek behöver inte egna ADR:er. Exportens
åtkomstregler och backupvalet hålls skilda.

### Egen export är den planerade återställningsvägen

**Källfakta.** Ingen extra automatisk backup införs. Vid större haveri kan
allt efter senaste egna export gå förlorat och flera dygns återställning
accepteras. Normal omstart och driftsättning ska bevara sparad data.
[Teknikbeslutet][teknik]
Låg kostnad och egen export tills vidare är uttryckliga ramar; ingen
garanterad högsta dataförlust läggs till.
[Godkänt teknikunderlag – ramar][teknikrapport]

Alternativ med förvaltad databasservice och återställningsverktyg finns i
[driftunderlaget][driftrapport]. Det dokumenterade slutvalet är att inte
lägga till automatisk backup, inte att leverantörer saknar interna kopior.

- **Kostnad att ändra – blandad bedömning.** Att lägga till backup senare
  behöver inte vara dyrt. Däremot kan data som förloras innan dess inte
  återvinnas från en aldrig gjord export. Den accepterade förlusten är
  explicit i [teknikbeslutet][teknik]. Nästa prövning måste skilja
  följdens oåterkallelighet från kostnaden att ändra arkitekturen.
- **Förklaringsbehov – väl belagt.** Ett privat system med beständig
  historik saknar ändå extra automatisk backup. Det är ett uttryckligt
  begränsat återställningsval, inte ett glömt driftskrav.
  [Teknikunderlaget][teknikrapport]
- **Verklig avvägning – belagd.** Låg driftkostnad och egen export
  prioriteras med accepterad dataförlust och väntan; andra
  återställningsalternativ finns. [Teknikunderlaget][teknikrapport],
  [driftunderlaget][driftrapport]

**Överlapp och lucka.** Kandidat som avsiktlig avvikelse och viktig
driftram, men första kriteriet är inte självklart. Tillskriv inte
beställaren ett beständigt förbud mot framtida backup eller en maximal
förlust på ett dygn/en vecka. Exportformatet är en separat kandidat.

### Permanent radering avgränsas mot leverantörskopior och exporter

**Källfakta.** Permanent radering gör berört innehåll oåtkomligt i
Skyttel, inklusive historik, utkast, bildversioner, operationsresultat
och cache. Leverantörernas vanliga villkor accepteras; omedelbar fysisk
radering ur alla interna kopior garanteras inte. Nedladdade exporter
påverkas inte. Detta är ett uttryckligt slutval.
[Teknikbeslutet][teknik],
[Skyttels teknikbeslut – export, återimport och radering][teknik-export]

- **Kostnad att ändra – delvis belagd.** Redan nedladdade exporter och
  interna kopior ligger utanför Skyttels direkta raderingsoperation.
  Starkare garanti kan inte införas retroaktivt för dem. Det är
  källstött; arbetskostnaden att välja annan drift eller avtal är inte
  uppskattad. [Informationsbeslutet][information],
  [teknikunderlaget][teknik-export]
- **Förklaringsbehov – väl belagt.** Ordet permanent kan annars tolkas
  som fysisk radering överallt. Gränsen uttrycks tydligt för att hålla
  appens funktion skild från externa kopior.
  [Teknikbeslutet][teknik]
- **Verklig avvägning – otillräckligt belagd.** Leverantörens vanliga
  villkor accepteras uttryckligen, men underlaget visar inte en
  konkret genomförbar starkare lösning som väljs bort med jämförda
  skäl. [Teknikunderlaget][teknik-export]

**Överlapp och lucka.** Betydelsefull kandidat som ännu saknar starkt
tredje kriterium. Kan vara en konsekvens i drift-/export-ADR i stället.
Hitta inte på krypterings-, avtals- eller lagkrav som alternativ.
Definitionen av permanent raderat hör till ordlistan; det konkreta
beteendet och dess begränsningar hör redan till specifikationen.

### Webb med internetkrav och gemensamt arbete på flera enheter

**Källfakta.** Vanlig webb via länk och inloggning väljs. Internet krävs.
Windows/macOS, iPhone och iPad med Chrome ska stödja vanligt kartarbete,
med anpassad presentation. Installerbar webb, desktopapp och mobilapp
bedöms; inget behov motiverar separata leveranser i första versionen.
[Plattformsbeslutet][plattform]

- **Kostnad att ändra – trolig för plattformsformen, bedömning.**
  Installerad/offline klient skulle förändra distribution och hur
  utkast, identitet och sparresultat nås. Kraven på serverbeständighet
  och avbrott finns i [teknikunderlaget][teknikrapport].
  Källan beräknar inte byteskostnad; byte av enstaka webbläsarmål är
  inte samma sak.
- **Förklaringsbehov – måttligt.** Internetkrav trots beständiga privata
  utkast kan behöva förklaring. Vanlig webb i sig är inte särskilt
  överraskande. [Plattformsbeslutet][plattform]
- **Verklig avvägning – belagd.** Länkåtkomst och flera enheter utan
  installation ställs mot installerbara/separata appar. Inget
  identifierat behov motiverar separata leveranser.
  [Plattformsbeslutet][plattform]

**Överlapp och lucka.** Möjlig kandidat för distributionens gräns om
förklaringsbehovet bedöms tillräckligt. Enhetsspecifika gester, Chrome-listan
och uppskjutna prov är inte egna arkitekturbeslut. Sökbar mobil lista
innebär inte en oredigerbar mobil karta.
[Enhetsbeslutet][enhetsprov], [grundspecifikationen][specifikation]

### Rymdvy och lista delar kartarbete men inte domänbetydelse

**Källfakta.** Samlad rymdvy A med fokusfunktionen från B väljs; C,
lista först med mindre rymdvy, utgår ur prototypens variantval. Avstånd
och position har ingen domänbetydelse. Lista/detaljer kompletterar
arbetet; på små skärmar börjar användaren där. Placeringar är personliga
och AI-förslag flyttar inte redan placerade objekt.
[Rymdbeslutet][rymd], [informationsbeslutet][information],
[enhetsbeslutet][enhetsprov]

En gemensam redigering och tillståndsmodell begränsar dubblering och
listan bär hela vardagsflödet med tangentbord/skärmläsare.
[Enhetsbeslutet][enhetsprov]
Alternativen och det tidiga valet går att följa i
[prototypens tre vyer][rymdalternativ],
[beställarens val av huvudvy][rymdval] och
[den slutliga prototypdokumentationen][rymdrapport].

- **Kostnad att ändra – trolig, bedömning.** Delat tillstånd och
  beständiga personliga placeringar berör både lagring och flera
  presentationer. [Teknikunderlaget][teknikrapport]
  Betydande kostnad för att ändra själva huvudvyn är inte visad.
- **Förklaringsbehov – belagt.** En 3D-position är presentation, ingen
  egenskap hos hushållets åtagande. Listan måste fungera utan rumslig
  navigering. [Rymdbeslutet][rymd], [enhetsbeslutet][enhetsprov]
- **Verklig avvägning – delvis belagd.** A/B/C finns och ett val görs,
  men jämförande skäl för just A framför C är tunna. Motivet om
  begränsad dubblering gäller gemensam redigering, inte automatiskt
  3D framför lista eller personlig framför gemensam layout.
  [Rymdvalet][rymdval], [enhetsbeslutet][enhetsprov]

**Överlapp och lucka.** Gruppen behöver troligen avgränsas ytterligare
eller avstås vid urvalet. Koppla inte ett belagt motiv till fel delbeslut.
Tre möjliga delar är huvudvy, delad arbetsmodell och personlig layout;
ingen ska få en egen ADR enbart för att teknisk kostnad kan föreställas.
Three.js-valet hör till teknikgrunden; exakta zoomvärden, bakgrund och
gestkontroller stannar som interaktionsunderlag.

### Delad TypeScript-grund med separat webbklient och appserver

**Källfakta.** TypeScript med React/Vite/React Router och Hono på Node
väljs. Python är ett verkligt alternativ och finns i prototyperna;
TypeScript ger gemensamma datatyper och valideringsscheman. Next.js är
möjligt, men privat hushållsinnehåll har inget identifierat behov av
serverrendering som motiverar dess ytterligare servermodell.
[Skyttels teknikbeslut – vald teknikgrund][teknik-grund]

- **Kostnad att ändra – trolig för språk/runtime, bedömning.**
  Gemensamma typer och scheman kopplar klient och server; annat språk
  kräver anpassning. Källan anger denna delning, men ingen
  arbetsuppskattning. [Teknikgrunden][teknik-grund]
- **Förklaringsbehov – svagt till måttligt.** Valet kan behöva förklara
  varför Python-prototypen inte styr produktionen och varför
  serverrendering uteblir. En vanlig TypeScript-webbapp är i sig inget
  överraskande val. [Teknikgrunden][teknik-grund]
- **Verklig avvägning – belagd.** Python och Next.js är angivna
  alternativ med explicita skäl för det valda upplägget.
  [Teknikgrunden][teknik-grund]

**Överlapp och lucka.** Preliminärt svagare kandidat än driftformen.
Bedöm om ett kort sammanhang i drift-ADR räcker. React Router, Vite,
Hono, Sharp och better-sqlite3 är inte var för sig belagda ADR-kandidater.
Three.js ersätter egen kameramatematik, men jämförelsen bevisar inte
betydande byteskostnad för varje grafikbibliotek.

### Delegerat tal med gemensamt kartarbete

**Källfakta.** GPT-Live-1/marin, WebRTC och client-delegering samt Terra
låg väljs med MCP och kombinerat avslut. Terra upplevs rappare.
[Talbeslutet][talprov]
Jämförelsen ger Terra, Sol och Astra åtta korrekta steg var; Luna fem.
Terra har lägre median och beräknad kostnad än Sol i just provet.
Mini är en tidigare, ersatt kandidat. MCP på/av och avslutsflöden
jämförs separat. [Talprovets fullständiga testsammanfattning][taltester]

- **Kostnad att ändra – svagt belagd för modellval.** Provet erbjuder
  modellbyte mellan samtal. Modellnamn/nivå kan därför vara en billig
  ändring; påstå inte leverantörslåsning av det. En annan talarkitektur
  påverkar serveradapter och återkoppling enligt
  [teknikunderlaget][teknik-granser], men dess byteskostnad är okänd.
- **Förklaringsbehov – belagt.** Live sköter samtalet medan kartarbetet
  delegeras och kvittot styr bekräftelsen. Det kan annars vara oklart
  varför flera modeller/komponenter finns.
  [Talbeslutet][talprov], [teknikunderlaget][teknik-granser]
- **Verklig avvägning – stark för modellinställning och avslutsflöde,
  svagare för arkitekturens alla delar.** Mätbara alternativ finns i
  [taltesterna][taltester]. Den ursprungliga kedjan med transkribering
  respektive direkt ljuddialog är researchalternativ, inte båda
  fullständigt jämförda användarprov. [Talresearchen][talrapport]

**Överlapp och lucka.** Villkoren möts inte tydligt för samma avgränsade
beslut: det bäst jämförda modellvalet förefaller lättare att ändra.
Behåll kandidatens osäkerhet. Ingen särskild modell-ADR rekommenderas
enbart på provresultaten. Publicerat källstöd för mätningen är kommentaren;
de nya rapporterna och råresultaten är uttryckligen inte publicerade i
en fast prototyprevision. Mac-provet verifierar inte andra plattformar.

### En granskad merge levererar samma verifierade bild

**Källfakta.** Uppdateringsförslag och tester är automatiska, merge till
main godkänns manuellt och därefter driftsätts exakt GHCR-bild med digest
automatiskt när releasekontrollerna lyckas. Ingen ombyggnad eller extra
manuell godkännandepunkt i Render ingår. Preview-versioner från main är
också avsedda att köras; äldre stabil tagg får inte ersätta nyare main.
[Teknikbeslutet][teknik],
[Skyttels teknikbeslut – säkerhet och uppdateringar][teknik-release]

Alternativt ombygge hos driftvärden och extra godkännande avgränsas
uttryckligen bort. Kravhanterings filtrering av vissa dokumentations- och
teständringar kopieras inte automatiskt; Skyttels main styr leveransen.
Motiven i underlaget är verifierbar koppling mellan kod, version och
körande bild samt beställarens val av automatiskt införande.
[Teknikunderlaget][teknik-release]

- **Kostnad att ändra – möjlig, bedömning.** Publicerade releasebevis,
  bildidentiteter, återgång och daglig skanning kopplas ihop. Ny
  leveranskedja kräver omverifiering; den kan ändå vara enklare att
  ändra än datakontrakt. [Teknikunderlaget][teknik-release]
- **Förklaringsbehov – väl belagt.** Preview i drift och ingen manuell
  spärr efter merge kan annars missförstås. Main betyder betrodd kod
  avsedd att köras, och samma digest binder kontroller till leverans.
  [Teknikunderlaget][teknik-release]
- **Verklig avvägning – delvis belagd.** Alternativen avgränsas och
  beställarens automatiseringsval är uttryckligt. Det finns ingen
  detaljerad kostnadsjämförelse med två godkännanden; uppfinn inte en.
  [Teknikbeslutet][teknik], [teknikunderlaget][teknik-release]

**Överlapp och lucka.** Kandidat för leveransens tillitsgräns, inte en
ADR per CI-verktyg. Säkerhetströskeln nedan är oberoende och får inte
försvinna i samma stycke om den väljs. GitVersion-mekanik,
versionsnamn och uppgraderingsanteckningars detaljer hör till den
befintliga leveransspecifikationen.

### Blockerande säkerhetskontroller även utan tillgänglig fix

**Källfakta.** High/Critical stoppar merge och ny leverans även utan fix
om ett granskat, avgränsat och tidsbegränsat undantag saknas. Det är
striktare än Kravhanterings containergräns för fixbara fynd. Verktygsfel
och saknade obligatoriska kontroller blockerar också. Faktiskt körande
digest skannas dagligen.
[Godkänt teknikunderlag – kontroller före införande][teknik-kontroller]

Den fixbara gränsen är ett verkligt referensalternativ dokumenterat i
[Säkerhetskontroller och uppdateringar för Skyttel][sakerhetsrapport].
Det samlade slutvalet är godkänt, men ett utförligt motiv för just
severity-tröskeln finns inte.

- **Kostnad att ändra – otillräckligt belagd.** Tröskeln kan vara
  konfiguration och policy. Konsekvenser för leverans är betydelsefulla,
  men det bevisar inte dyrt byte. [Teknikunderlaget][teknik-kontroller]
- **Förklaringsbehov – väl belagt.** Även ett fynd utan möjlig fix
  blockerar tills ett undantag granskas; referensprojektets regel skiljer
  sig. [Teknikunderlaget][teknik-kontroller]
- **Verklig avvägning – delvis belagd.** Fixbara kontra alla High/Critical
  är verkliga alternativ. Beställaren väljer det senare, men det
  särskilda motivet är tunt dokumenterat.
  [Säkerhetsunderlaget][sakerhetsrapport], [teknikbeslutet][teknik]

**Överlapp och lucka.** Sannolikt säkerhetspolicy snarare än egen ADR
om första kriteriet inte styrks. Förklara inte valet genom uppfunna
riskberäkningar. Den dagliga skanningen av faktisk bild kan vara en
konsekvens i leveranskandidaten; skanningsverktygens namn behöver ingen
separat ADR.

## Motiverade bortval och detaljer som stannar i grundspecifikationen

Följande är **researchens bedömningar av ADR-behov**, inte nya produktavslag.

- **Vardagsbegrepp och relationsroller.** Person, tjänstekonto, bankkonto,
  avtalspart, betalar, använder och upphört behöver konsekvent
  definition, men inte var sin ADR. [Begreppsbeslutet][begrepp] säger
  uttryckligen att exempelvis skuldbegreppet inte väljer databasstruktur.
  E-postens fristående identitet prövas separat ovan.
- **Hemligheter utanför Skyttel.** Fullständiga kontonummer, lösenord
  och betalningshemligheter ingår inte.
  [Åtkomstbeslutet][atkomst] och [specifikationen][specifikation]
  belägger gränsen men ingen verklig jämförelse med ett valt valv- eller
  betalningsalternativ. Gränsen är ett viktigt produktkrav; inga nya
  efterlevnadsskäl eller permanenta framtida avslag skapas här.
- **Ekonomiska uppgifter och automatik.** Frivilliga belopp, datum,
  skuld/kredit samt nej till beräkningar, betalningar och påminnelser
  hör till funktionell omfattning. [Informationsbeslutet][information],
  [specifikationen][specifikation]. Ingen dokumenterad arkitektonisk
  avvägning gör varje sådan gräns till en ADR.
- **Bilder och presentationsdetaljer.** 300 × 300, 10 MB, JPEG/PNG/WebP,
  färger, ikonform, stjärnhimmel, gester och etikettvärden är krav eller
  prototyputformning, inte belagd stor byteskostnad.
  [Informationsbeslutet][information], [rymdbeslutet][rymd],
  [enhetsbeslutet][enhetsprov]. Bildlagringens sammanhang ingår däremot
  i drift-/lagringskandidaten.
- **Provnivåer.** 500 objekt, 1 500 samband och 5/1/2 sekunder är
  acceptansnivåer, inte lagringsgränser eller uppmätta garantier.
  [Grundspecifikationen][specifikation]. Deras ändring behöver normalt
  ingen ADR.
- **Google/Microsoft och Better Auth.** Leverantörsinloggning är vald,
  egna konton är dokumenterad reserv och OAuth är separat MCP-medgivande.
  [Teknikunderlaget][teknikrapport] beskriver detta och
  [driftunderlaget][driftrapport] jämför Better Auth/Supabase.
  Kostnad för identitetsbyte kan vara betydande, men specifikt
  jämförelsemotiv för valet av Better Auth saknas. Ingen fristående
  kandidat uppfyller därför alla tre villkor med nuvarande belägg.
  Identitetskoppling och aktuell åtkomst hör redan till export/MCP.
- **Enskilda bibliotek och versionsnummer.** Namn i teknikpaketet
  innebär inte automatiskt kvartalslånga byteskostnader.
  [Teknikunderlaget][teknik-grund] motiverar en sammanhängande grund;
  det motiverar inte en ADR per paket.
- **Devcontainer och privilegier.** Utvecklingsmiljö är krav, men
  nödvändiga extra Linux-rättigheter per Codex-klient är ännu inte
  bestämda. [Devcontainer-resolutionen][devresearch],
  [versionsbundet devcontainer-underlag][devrapport].
  Skapa ingen ADR om att SYS_ADMIN eller avstängd seccomp alltid krävs.
- **Research- och provutförande.** API-åtkomst, provbudget, lokal stdio,
  Python-prototyp och antal godkända kontroller är fakta om arbetet,
  inte produktarkitektur. [Talåtkomsten][talatkomst],
  [MCP-provet][mcpprov], [talprovet][talprov].
- **Uppskjuten verifiering och kartans avslut.** Godkända antaganden är
  inte bevis för fungerande Windows, Chrome på iPad eller komplett
  skärmläsarstöd. [Enhetsbeslutet][enhetsprov],
  [talbeslutet][talprov], [specifikationen][specifikation].
  De är inte nya blockerare genom denna inventering och utgör inga
  automatiska varaktiga avslag för framtida triage.

## Slutliga val, preciseringar och ersatta formuleringar

- **Visuell granskning.** [Begreppsbeslutet][begrepp] fastställer
  granskning före sparande. [Samtalsbeslutet][samtal] ersätter extra
  granskningssteg med löpande förslag. [MCP-beslutet][mcp] tillåter text
  eller tal utanför kartvyn. Det är inte ett krav att extern assistent
  alltid måste öppna Skyttel.
- **Sparande efter rättelse.** En äldre version får inte återanvändas,
  men [sparregelns förtydligande][sparregel] tillåter entydig rättelse
  och sparbegäran i samma besked för hela det resulterande utkastet.
  [MCP-provet][mcpprov] och [teknikbeslutet][teknik] bevarar serverns
  kontroller. Extra ja får inte införas enbart för versionsbytet.
- **Ångring och eget utkast.** Prototypens begränsning blir inte krav
  på helt tomt utkast. [Grundspecifikationens acceptansfall][acceptans]
  stoppar ångring vid överlapp och bevarar oberoende förslag.
- **Typer.** [Typresolutionen][typer] styr över tidigare öppna
  typfrågor: obligatorisk men fritt vald sambandstyp, valfria ändpunkter,
  redigerbara förifyllda typer och bevarad identitet vid typbyte.
  Inga prototypbegränsningar till en hårdkodad katalog följer med.
- **Drift och teknik.** Det godkända dokumentet är
  [Skyttels teknikbeslut i accepterad revision][teknikrapport].
  Äldre teknikförslag eller researchens Cloudflare-, Gandi- och
  Azure-kandidater är jämförelser, inte parallellt valda driftslösningar.
  Rå SQLite-kopia är möjlig, men export/import är den planerade flytten.
- **Tal.** [Den slutliga talresolutionen][talprov] fastställer Terra låg
  och ersätter testsammanfattningens krav att hålla ärendet öppet för
  ytterligare plattformsprov. Mätningarnas gränser kvarstår.
  Ingen publicerad fast revision av de nya talprototypfilerna påstås.
- **Backup och radering.** [Teknikbeslutet][teknik] anger egen export,
  ingen extra backup och accepterade leverantörskopior. Ingen tidigare
  forskningsidé om backup eller maximalt dataförlustfönster gäller som
  krav framför detta.
- **Godkännande och fortsatt karta.** [Grundspecifikationen][specifikation]
  införlivar de tretton acceptansfallen och typbeslutets åtta fall.
  Dess äldre avslutstext om färdig karta ersätts av
  [kartans aktuella destination och Notes][karta] samt
  [kompletteringen med ADR-arbete][kartkomplettering].
  Produkten förblir beslutad medan dokumentationsarbetet fortsätter.

## Möjliga sätt att dokumentera utan konkurrerande beslutsunderlag

Detta avsnitt är **förslag till nästa beslut**, inte fastställd
dokumentationspolicy.

1. **Kort ADR som orientering till resolutionen.** Ett svenskt stycke
   anger sammanhang, val och belagt varför. Det länkar beslutets exakta
   kommentar och den godkända underlagsrevisionen. Resolutionen bär
   fortsatt detaljer och acceptansfall. Fördelen är läsbar orientering
   i koden utan full kopia; risken är att sammanfattningen driver isär
   om dess status inte underhålls.
2. **Kort ADR med uttrycklig status och ersättningskedja.** Samma
   begränsade innehåll kompletteras med accepterad status. Ett framtida
   uttryckligt beslut ger ny ADR och länk från den äldre till den nya;
   resolutionen lämnas som historiskt beslutsunderlag och pekar vid
   behov till det nya beslutet. Det gör giltighet synlig men kräver
   samordnad indexuppdatering. Ingen historisk resolution behöver
   skrivas om till att låtsas vara ett nytt beslut.
3. **Endast länkar i planeringsöversikten för svaga kandidater.**
   Beslut som saknar något villkor får ingen ADR. Ordlistan definierar
   ord och specifikationen äger funktionskraven. Detta minskar dubblering
   men ger mindre arkitekturell orientering intill koden.

**Bedömning.** Det första upplägget med det andras statuskedja är ett
rimligt diskussionsunderlag för utvalda kandidater. Alla detaljer från en
resolution ska inte kopieras in i ADR:n; däremot ska läsaren kunna förstå
valet och varför utan att bara mötas av en naken länk. Ett slutligt beslut
behöver ange vilken källa som styr vid skillnad, hur en senare ändring
markeras, vem som uppdaterar pekarna och hur ett nytt resonemang märks
som nytt. Rapporten fastställer inte dessa regler.

Versionsbundna GitHub-filer ger stabilt textinnehåll. En länk till en
issuekommentar identifierar exakt källa men kommentaren kan redigeras;
den är inte samma sak som en oföränderlig Git-revision. En kort ADR kan
ange beslutsdatum och den granskade fasta underlagsrevisionen utan att
skapa en ny fullständig kopia av resolutionen. Om motiv bara finns i en
kommentar, som delar av talprovet, ska just den begränsningen framgå.

## Kvarstående frågor för urvalet

- Är de kvalitativt bedömda byteskostnaderna tillräckligt betydande för
  varje avgränsat beslut? Särskilt backup, säkerhetströskel, modellval,
  webbform och releasepolicy behöver prövas utan att betydelse
  förväxlas med svårighet att ändra.
- Vilka dokumenterade alternativ visar en verklig avvägning med ett
  belagt motiv? Rymdvy, raderingsgaranti och administrationens MCP-gräns
  har svagare stöd på den punkten än Render/Cloudflare-jämförelsen.
- Ska sammanhängande exportregler respektive drift- och lagringsform
  hållas ihop, och ska den blandade presentationskandidaten avgränsas
  eller avstås? En ADR per ärende och en ADR för hela teknikpaketet
  är båda otillräckliga genvägar.
- Vilka motiv kan återges direkt och vilka saknas? Ett nytt skäl från
  beställaren kan dokumenteras som ett nytt förtydligande, aldrig som
  ett tidigare dokumenterat motiv.
- Vilket arbetssätt ovan gör korta ADR:er förenliga med kanoniska
  resolutioner? Urval, statusregler och faktiska ADR-filer kräver det
  efterföljande beslutsärendets oberoende granskning och beställarval.

## Källregister

Täckningslistan och kandidaterna länkar exakta resolutioner. Följande
versionsbundna material är granskat som fördjupning; researchrapporter
har den status som deras resolutioner anger, inte status som nya val.

- [Skyttels teknikbeslut, godkänd revision][teknikrapport].
- [Samtalsprototypens dokumentation][samtalsrapport].
- [Rymdprototypens slutliga dokumentation][rymdrapport].
- [MCP-provets rekommendation][mcprekommendation],
  [observationer][mcpobservationer] och [klientgränser][mcpklienter].
- [Enhetsprototypens provunderlag][enhetsrapport].
- [Drift och lagring][driftrapport], [AI och MCP][airapport],
  [Cloudflare][cloudflarerapport], [Gandi][gandirapport] och
  [Azure][azurerapport].
- [Säkerhetskontroller och uppdateringar][sakerhetsrapport] samt
  [Devcontainer med Codex][devrapport].
- [Talresearch][talrapport] och [assistentresearch][assistentrapport]
  är också kontrollerade mot de lokala rapporterna; deras förslag
  bedöms genom de senare kanoniska besluten.

[karta]: https://github.com/viscalyx/skyttel/issues/2
[begrepp]: https://github.com/viscalyx/skyttel/issues/3#issuecomment-5654166004
[talresearch]: https://github.com/viscalyx/skyttel/issues/4#issuecomment-5653964246
[assistentresearch]: https://github.com/viscalyx/skyttel/issues/5#issuecomment-5653964755
[atkomst]: https://github.com/viscalyx/skyttel/issues/6#issuecomment-5654275475
[samtal]: https://github.com/viscalyx/skyttel/issues/7#issuecomment-5654691943
[rymd]: https://github.com/viscalyx/skyttel/issues/8#issuecomment-5655478727
[information]: https://github.com/viscalyx/skyttel/issues/9#issuecomment-5655680457
[mcp]: https://github.com/viscalyx/skyttel/issues/10#issuecomment-5662601732
[plattform]: https://github.com/viscalyx/skyttel/issues/11#issuecomment-5663538779
[teknik]: https://github.com/viscalyx/skyttel/issues/12#issuecomment-5691771132
[specifikation]: https://github.com/viscalyx/skyttel/issues/13#issuecomment-5697070021
[talprov]: https://github.com/viscalyx/skyttel/issues/14#issuecomment-5688291674
[mcpprov]: https://github.com/viscalyx/skyttel/issues/15#issuecomment-5667325819
[enhetsprov]: https://github.com/viscalyx/skyttel/issues/16#issuecomment-5678916527
[talatkomst]: https://github.com/viscalyx/skyttel/issues/17#issuecomment-5679042669
[driftresearch]: https://github.com/viscalyx/skyttel/issues/18#issuecomment-5688577251
[airesearch]: https://github.com/viscalyx/skyttel/issues/19#issuecomment-5688577722
[cloudflareresearch]: https://github.com/viscalyx/skyttel/issues/20#issuecomment-5688731768
[gandiresearch]: https://github.com/viscalyx/skyttel/issues/21#issuecomment-5688766972
[azureresearch]: https://github.com/viscalyx/skyttel/issues/22#issuecomment-5688787471
[sakerhetsresearch]: https://github.com/viscalyx/skyttel/issues/23#issuecomment-5691424692
[devresearch]: https://github.com/viscalyx/skyttel/issues/24#issuecomment-5691593794
[typer]: https://github.com/viscalyx/skyttel/issues/26#issuecomment-5696089834
[inventering]: https://github.com/viscalyx/skyttel/issues/28
[urval]: https://github.com/viscalyx/skyttel/issues/29
[startrevision]: https://github.com/viscalyx/skyttel/tree/d10843ec7c7af019cc43e5b4435bfa85034b6f63
[acceptans]: https://github.com/viscalyx/skyttel/issues/13#issuecomment-5692691536
[specstatus]: https://github.com/viscalyx/skyttel/issues/13#issuecomment-5692315413
[sparregel]: https://github.com/viscalyx/skyttel/issues/15#issuecomment-5666680822
[taltester]: https://github.com/viscalyx/skyttel/issues/14#issuecomment-5688052442
[kartkomplettering]: https://github.com/viscalyx/skyttel/issues/2#issuecomment-5697192526
[rymdalternativ]: https://github.com/viscalyx/skyttel/issues/8#issuecomment-5654788302
[rymdval]: https://github.com/viscalyx/skyttel/issues/8#issuecomment-5654906469
[talrapport]: https://github.com/viscalyx/skyttel/blob/ff1b9f632264cfce74013a36b7f903447e4d06fa/docs/research/voice-input.md
[assistentrapport]: https://github.com/viscalyx/skyttel/blob/80104303e5163ac72c7e4cd04c2e28b8c0cb64cb/docs/research/external-assistants.md
[rymdrapport]: https://github.com/viscalyx/skyttel/blob/90447399c197aa5f95911e85982c0fa827688fb4/docs/prototypes/spatial-prototype.md
[mcpobservationer]: https://github.com/viscalyx/skyttel/blob/90cf757b4d2fc1744686dfc4f868909daa544d2a/prototypes/external-mcp/observations.md
[mcpklienter]: https://github.com/viscalyx/skyttel/blob/90cf757b4d2fc1744686dfc4f868909daa544d2a/prototypes/external-mcp/client-feasibility.md
[teknikrapport]: https://github.com/viscalyx/skyttel/blob/ec59c74119e28ada77ab23e6c5919b8c9ecc2292/docs/planning/technology-proposal.md
[samtalsrapport]: https://github.com/viscalyx/skyttel/blob/85d324507fdeaebac5ecaaa1e3e8116a2d361ebe/docs/prototypes/conversation-prototype.md
[mcprekommendation]: https://github.com/viscalyx/skyttel/blob/90cf757b4d2fc1744686dfc4f868909daa544d2a/prototypes/external-mcp/recommendation.md
[enhetsrapport]: https://github.com/viscalyx/skyttel/blob/38cf6abbc5de0828e6ec4ab15fbe97d7b2a74c6d/docs/prototypes/device-interaction.md
[driftrapport]: https://github.com/viscalyx/skyttel/blob/96c641dbf5d9f34944f8f285212bb44c7b959c9b/docs/research/hosting-storage.md
[airapport]: https://github.com/viscalyx/skyttel/blob/64fddd101e4e1ca3437e183f056a113d773c959c/docs/research/ai-mcp-production.md
[cloudflarerapport]: https://github.com/viscalyx/skyttel/blob/9964630664215caec5204c4d3999d1527f922d5b/docs/research/cloudflare.md
[gandirapport]: https://github.com/viscalyx/skyttel/blob/04dd6291a582149cc9376b07fb6e50de03de0e39/docs/research/gandi.md
[azurerapport]: https://github.com/viscalyx/skyttel/blob/331c21fc8b05232cb6718cc873a724bdbe2d5bc9/docs/research/azure.md
[sakerhetsrapport]: https://github.com/viscalyx/skyttel/blob/a590d9b6cdd06bdfc3e61c86f04df7dc3dd1babc/docs/research/security-maintenance.md
[devrapport]: https://github.com/viscalyx/skyttel/blob/dc82219845092331dafe90b2dbc1b7ea968d96c4/docs/research/devcontainer-codex.md
[teknik-ai]: https://github.com/viscalyx/skyttel/blob/ec59c74119e28ada77ab23e6c5919b8c9ecc2292/docs/planning/technology-proposal.md#ai-data-och-kostnadsuppföljning
[teknik-granser]: https://github.com/viscalyx/skyttel/blob/ec59c74119e28ada77ab23e6c5919b8c9ecc2292/docs/planning/technology-proposal.md#gränser-mellan-delarna
[teknik-sparande]: https://github.com/viscalyx/skyttel/blob/ec59c74119e28ada77ab23e6c5919b8c9ecc2292/docs/planning/technology-proposal.md#lagring-och-samlat-sparande
[teknik-export]: https://github.com/viscalyx/skyttel/blob/ec59c74119e28ada77ab23e6c5919b8c9ecc2292/docs/planning/technology-proposal.md#export-återimport-och-radering
[teknik-flytt]: https://github.com/viscalyx/skyttel/blob/ec59c74119e28ada77ab23e6c5919b8c9ecc2292/docs/planning/technology-proposal.md#container-databas-och-byte-av-driftvärd
[teknik-grund]: https://github.com/viscalyx/skyttel/blob/ec59c74119e28ada77ab23e6c5919b8c9ecc2292/docs/planning/technology-proposal.md#vald-teknikgrund
[teknik-release]: https://github.com/viscalyx/skyttel/blob/ec59c74119e28ada77ab23e6c5919b8c9ecc2292/docs/planning/technology-proposal.md#säkerhet-och-uppdateringar
[teknik-kontroller]: https://github.com/viscalyx/skyttel/blob/ec59c74119e28ada77ab23e6c5919b8c9ecc2292/docs/planning/technology-proposal.md#kontroller-före-införande

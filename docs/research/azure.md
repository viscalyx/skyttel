# Azure Static Web Apps Free för Skyttel

Kontrolldatum: 2026-09-16. Underlag till
[Kan Azure Static Web Apps Free bära första Skyttel?](https://github.com/viscalyx/skyttel/issues/22).
Inget teknikval är låst. Render och Cloudflare är jämförelsealternativ.

## Slutsats

Static Web Apps Free passar Skyttels statiska webbklient och publicering
från GitHub. Gratisnivåns inbyggda serverfunktioner är däremot ingen
självklar värd för längre kartjobb och talets serveranslutning. En rimlig
Azure-kandidat är därför Free för webbklienten, separat Container Apps
Consumption för API/MCP/talstyrning och Azure SQL Databases gratiserbjudande
för beständig lagring.

Denna kombination kan få noll tjänstekostnad inom återkommande kvoter.
Det är en villkorad möjlighet, ingen verifierad nollkalkyl för Skyttel.
Särskilt databasens vakna tid mellan anrop kan förbruka gratiskvoten.
Azure har fler komponenter och inställningar än Render; det behöver
vägas mot lägre löpande kostnad. Nedan är en teknisk bedömning och
kontrollpunkter för implementation, inte ett beställarbeslut.

## Vad Static Web Apps Free ger

Microsoft beskriver Free för personliga projekt. GitHub-publicering,
två egna domäner, förnyade TLS-certifikat och tre förhandsmiljöer ingår.
Detta är en tjänstenivå, inte en tidsbegränsad välkomstkredit.
[Planer](https://learn.microsoft.com/en-us/azure/static-web-apps/plans).

Free har 250 MB statiska filer per miljö, 500 MB totalt och 100 GB
trafik per månad. Överskjutande trafik kan inte köpas på Free. Utrymmet
är webbpublicering, inte en skrivbar databas för hushållets uppgifter.
GitHub Actions har separata kvoter för körningar och artefakter.
[Kvoter](https://learn.microsoft.com/en-us/azure/static-web-apps/quotas).

Inbyggda managed Functions ingår, men har bara HTTP-triggers och
saknar Durable Functions och managed identity. Aktuell runtime-lista
omfattar Node.js 22; äldre begränsningslistor på API-sidan är inte
tillräckliga som versionsbeslut.
[Managed Functions](https://learn.microsoft.com/en-us/azure/static-web-apps/apis-functions),
[runtime-stöd](https://learn.microsoft.com/en-us/azure/static-web-apps/languages-runtimes).

Alla API:er som går genom SWA:s `/api` har högst 45 sekunders anropstid
och saknar WebSocket-stöd. Att koppla in en egen Azure-backend bakom
denna adress kräver Standard och tar inte bort dessa gränser. En
långlivad SSE-ström kan därför inte antas fungera obegränsat; faktisk
buffring och kortare SSE är inte verifierade här.
[API-begränsningar](https://learn.microsoft.com/en-us/azure/static-web-apps/apis-overview).

## En helhetskandidat med Free-webbklienten

Begränsningarna bevisar inte att managed Functions är omöjliga. Korta
HTTP-anrop och polling kan bära delar av flödet, och Live-delegering
kräver inte i sig sideband. Separat backend är här en bedömd enkel väg
till vanlig serverkod och längre arbete, inte ett bevisat minimum.
En ren Functions-variant behöver visa hur beständiga jobb, avbrott och
slutlig användningsmätning fungerar inom dess körmodell.

Arkitekturförslag: webbklienten anropar en separat HTTPS-adress för
Container Apps direkt. Då används ingen Standard-krävande SWA-koppling
och dess 45-sekundersproxy ligger inte i API-vägen. Backend ansvarar
själv för sessioner, CORS, Google/Microsoft, MCP-OAuth, behörigheter och
databasanslutning. Den behöver aldrig lita på en användaridentitet som
webbläsaren själv påstår.

Container Apps stöder vanliga Linux-containrar, valfri runtime och
Node-bibliotek. Minsta Consumption-kombination är 0,25 vCPU och
0,5 GiB minne; den är ett mätbart startförslag, inte styrkt kapacitet
för bilder och fullständig export. Publicering från GitHub Actions
stöds, med separat containerbygge och register.
[Containerkrav](https://learn.microsoft.com/en-us/azure/container-apps/containers),
[GitHub-publicering](https://learn.microsoft.com/en-us/azure/container-apps/github-actions).

Direkt Container Apps-ingång stöder WebSocket och har 240 sekunders
HTTP-timeout. MCP över HTTP behöver korta anrop eller återanslutning;
SSE-buffring och tidsgränser ska kontrolleras i den faktiska kedjan.
En WebSocket får inte felaktigt likställas med ett vanligt långt
HTTP-anrop.
[Ingress](https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview).

Live-ljudet går direkt mellan webbläsaren och OpenAI via WebRTC.
Backend startar sessionen och kan hålla utgående sideband-WebSocket;
Terra anropas via HTTPS. Det är främst serverns livscykel som behöver
anpassas. Skalning till noll behöver bevara jobbtillstånd och tåla
kallstart, omstart och ny revision. En utgående anslutning ensam är
inte här verifierad som skydd mot nedskalning. Längre fristående
arbete kan behöva ett Container Apps Job; det tillför körning och
livscykelhantering.
[Skalning](https://learn.microsoft.com/en-us/azure/container-apps/scale-app),
[fristående jobb](https://learn.microsoft.com/en-us/azure/container-apps/jobs).

## Inloggning och externa klienter

SWA Free har förkonfigurerad Entra- och GitHub-inloggning. Microsoft
anger stöd för alla Microsoft-konton, inklusive privata. Google via
SWA:s egen anpassade providerkonfiguration kräver Standard. Det kravet
gäller inte en fristående backend som själv implementerar inloggningen.
[Förkonfigurerad auth](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization),
[anpassad auth](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom).

SWA:s användarheader och `/.auth/me` är inte en färdig OAuth-server för
ChatGPT webb och Codex-appen. Separat medgivande, tokenkontroll och
återkallelse behövs. Better Auth kan vara en bibliotekskandidat, men
dess exakta adapter till Azure SQL och hela OAuth-kombinationen är
inte verifierade i denna Microsoft-avgränsade research. Det gäller
även korrekta klientregistreringar och callback-adresser.
[SWA:s identitetsgränssnitt](https://learn.microsoft.com/en-us/azure/static-web-apps/user-information).

## Databas, bilder och export

Azure SQL:s erbjudande ger per databas och månad 100 000 vCore-sekunder,
32 GB data och 32 GB backuplagring. Det gäller abonnemangets livstid,
inte bara första året. Välj uttryckligen paus till nästa kalendermånad
när gratismängden tar slut om databasens kostnad ska hållas vid noll.
Alternativet är fortsatt användning med debitering; efter det valet
går det inte att återgå till samma pausinställning enligt dokumentationen.
[Gratiserbjudandet](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer?view=azuresql).

Azure SQL har vanliga explicita transaktioner. Bedömning: versioner,
aktuella värden, historik, bilder och kvitto kan sparas atomiskt, med
unika operations-ID:n och korrekta lås-/konfliktregler. Privata utkast
kräver användar- och hushållsfilter. Små omkodade bilder kan lagras som
`varbinary(max)`; något separat bildlager krävs därför inte av datatypen.
Backend behöver omkoda till högst 300 × 300 bildpunkter, begränsa
filstorlek och kasta originalet. Bildbibliotek och resursbehov återstår
att välja och kontrollera.
[Transaktioner](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/transactions-transact-sql),
[binära värden](https://learn.microsoft.com/en-us/sql/t-sql/data-types/binary-and-varbinary-transact-sql).

Full export behöver konsekvent läsning av hushållets innehåll, inklusive
historik och bilder. Atomär återimport kan byggas genom validering i
osynlig mellanlagring och byte av aktiv dataversion i en transaktion.
Detta är ett implementationsförslag; en databasprodukt levererar inte
automatiskt Skyttels exportformat eller återimportregler.

Ingen extra backup läggs till. Användarens egen export räcker enligt
prioriteringen. Gratisdatabasens inkluderade leverantörsbackup ändrar
inte det beslutet. Behörigheter och gamla giltiga sessioner ska inte
återupplivas när hushållsinnehåll återimporteras.

Cosmos DB Free är ett alternativ med 1 000 RU/s och 25 GB under kontots
livstid, men bara ett sådant konto per abonnemang och inte i serverless-
läge. Dess transaktionsbatch gäller samma logiska partition och högst
100 operationer, 2 MB och fem sekunder. Det ger mer anpassning för
samlat sparande och större återimport; därför är Azure SQL den enklare
relationskandidaten att bedöma här.
[Cosmos gratisnivå](https://learn.microsoft.com/en-us/azure/cosmos-db/free-tier),
[Cosmos transaktionsgränser](https://learn.microsoft.com/en-us/azure/cosmos-db/transactional-batch).

Lokal SQLite i containerns filsystem är inte beständig: filer försvinner
när containern stängs eller startas om. Azure Files kan ge beständig
nätverkslagring men tillför kostnad och en annan lagringsmodell än
Render-disken. Den varianten är inte verifierad för SQLite här.
[Lagringens livslängd](https://learn.microsoft.com/en-us/azure/container-apps/storage-mounts).

## Kostnader och vad noll kronor förutsätter

Container Apps Consumption inkluderar per abonnemang och månad
180 000 vCPU-sekunder, 360 000 GiB-sekunder och två miljoner HTTP-anrop.
Överskott debiteras; noll repliker ger ingen körkostnad. Vid 0,25 vCPU
och 0,5 GiB motsvarar båda resurskvoterna 200 repliktimmar. Inräknat
måste vara start, tomgång, alla revisioner och eventuella jobb.
[Debiteringsmodell](https://learn.microsoft.com/en-us/azure/container-apps/billing).

Azure SQL är den snävare kvoten: 100 000 vCore-sekunder är 27,78
vCore-timmar. Serverless har normalt 0,5 vCore som minimum och
60 minuters inaktivitet före paus; fördröjningen kan sättas till minst
15 minuter. Även minnesanvändningen påverkar debiterad beräkning.
55,56 vakna timmar vid exakt 0,5 vCore är därför bara ett illustrativt
övre tidsexempel, inte garanterad gratis användningstid.
[Serverless-kostnad och paus](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-overview?view=azuresql).

Ett exempel visar betydelsen av användningsmönstret: 120 separata
tvåminutersbesök med 15 minuters efterföljande vakentid ger cirka
34 vakna databastimmar trots bara fyra aktiva timmar. Vid 0,5 vCore
motsvarar det cirka 61 200 vCore-sekunder. Med en timmes pausfördröjning
blir samma mönster 124 timmar och 223 200 vCore-sekunder. Beräkningen
antar separerade besök, ingen ytterligare last och inga högre
minnes-/CPU-behov. Öppna databaskopplingar kan dessutom förhindra paus.
[Gratisdatabasens FAQ](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer-faq?view=azuresql).

Log Analytics, containerregister, nätverk och GitHub-körningar måste
räknas separat. För lägsta tjänstekostnad kan Container Apps köra utan
sparade loggar, med direkt loggström kvar. Betalt Azure Container
Registry är inte obligatoriskt; registervalets egna kvoter gäller.
[Loggalternativ](https://learn.microsoft.com/en-us/azure/container-apps/log-options).
Den publika
[prislistan](https://azure.microsoft.com/en-us/pricing/details/container-apps/)
visar regionsberoende belopp dynamiskt; exakta överkvotpriser kan inte
fastställas från den hämtade sidtexten. Nollscenariot inkluderar inga
sådana debiterade tillägg och är därför inte ett färdigt fakturalöfte.

Pay-as-you-go har inget valfritt generellt hårt utgiftstak. Azures
spending limit hör till kreditabonnemang och kan inte sättas till ett
eget belopp. Databasens särskilda pausalternativ är ett separat skydd;
det stoppar inte andra tjänsters kostnader.
[Utgiftsgränser](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/spending-limit).

### Jämförbara exempel med AI

Samma AI-antagande som tidigare: 3 USD Live och 1,47 USD Terra per
samtalstimme, med 30 kartuppdrag, två anrop per uppdrag och 5 000
indata-/1 000 utdata- inklusive resonemangstoken per anrop.
Räknekursen är 10 SEK/USD med hypotetiskt 25 procent skattepåslag.
Det är ingen dagskurs eller skattebedömning.

<!-- markdownlint-disable MD013 -->
| Taltid | Azure om samtliga gratiskvoter räcker | Cloudflare + samma AI | Render + samma AI |
| --- | --- | --- | --- |
| 1 timme | 55,88 kr + eventuella tillägg | 118,38 kr | 146,50 kr |
| 4 timmar | 223,50 kr + eventuella tillägg | 286,00 kr | 314,13 kr |
| 10 timmar | 558,75 kr + eventuella tillägg | 621,25 kr | 649,38 kr |
<!-- markdownlint-enable MD013 -->

Azure-kolumnen är ett villkorat kostnadsgolv. Samtalstimmar räcker inte
för att avgöra gratisutfallet; databasens sessionsspridning och övrigt
textarbete måste mätas. Domän/DNS hos Gandi/Cloudflare och befintliga
ChatGPT-/Codex-abonnemang räknas separat för alla alternativen.
Cirka 200 kr är ett mjukt riktmärke.

Kalkylens AI-antaganden och jämförelsebaser finns i
[Vilka villkor och klientstöd gäller för Skyttels valda AI- och MCP-flöden?](https://github.com/viscalyx/skyttel/issues/19),
[Kan Cloudflare ge Skyttel billigare sammanhängande drift?](https://github.com/viscalyx/skyttel/issues/20)
och
[Vilka drift- och lagringsalternativ passar Skyttels krav och kostnadsram?](https://github.com/viscalyx/skyttel/issues/18).

## Utvecklingsarbete och flyttbarhet

Render har färre delar och en enkel flyttbar SQLite-fil. Cloudflare
har särskilda databas- och körgränssnitt. Azure-kandidaten ger en
vanlig portabel servercontainer men fler tjänsteinställningar och
SQL Server-specifikt schema/adapterarbete. Eget versionerat exportformat
minskar beroendet av alla tre leverantörerna.

Implementationens kontrollpunkter är samlat konkurrerande sparande,
återimport, bildomkodning, rätt inloggningskonton, båda MCP-klienterna,
långa Live-sessioner samt faktisk paus- och skalningskostnad. Rapporten
verifierar dokumenterade möjligheter och begränsningar; inget konto,
ingen resurs och inget betalt API-anrop skapas.

# Cloudflare för första Skyttel

Kontrolldatum: 2026-09-15. Forskningsunderlag, inte ett teknikbeslut.
Frågan är
[Kan Cloudflare ge Skyttel billigare sammanhängande drift?](https://github.com/viscalyx/skyttel/issues/20)
inför
[Vilken sammanhängande teknik och lagring uppfyller de prövade behoven?](https://github.com/viscalyx/skyttel/issues/12).

## Bedömning

Cloudflare kan ge lägre tjänstekostnad än Render med SQLite: omkring
63 mot 91 kr per månad i samma räkneexempel. Besparingen är cirka
28 kr per månad. Workers Free kan vara billigare, men dess CPU-gräns
är olämplig att lova för hela appen utan mätning. Cloudflare kräver
anpassad databasåtkomst och livscykel för tal; samma SQLite-fil och
serverprogram kan inte bara flyttas dit.

Inget teknikval är låst. Render med SQLite är här en jämförelsebas.
Min tekniska rekommendation är villkorad: föredra Render om enkel
implementation väger tyngre än denna besparing.
Om lägsta återkommande kostnad väger tyngre, pröva Workers Paid med
D1 för inloggning och ett SQLite-baserat Durable Object per hushåll
för kartan. Detta är en genomförbarhetsbedömning, inte ett verifierat
Skyttel-system eller beställarens slutliga val.

Beställaren accepterar egen export och förlust av sådant som inte
exporteras. Ingen extra automatisk backup, bestämd högsta dataförlust
eller återställningsjour ingår. Privat hushållsinnehåll och korrekt
åtkomstkontroll gäller fortfarande. Befintliga ChatGPT-/Codex-abonnemang
räknas separat; cirka 200 kr är ett mjukt riktmärke för tillkommande
drift och API-användning. Första externa klienter är ChatGPT webb och
Codex-appen, med text.

## Minsta rimliga Cloudflare-kandidat

En Worker levererar webbklient, HTTP-API, OAuth och gemensam MCP-ingång.
Ett hushållsobjekt lagrar karta, privata utkast, historik, kvitton och
små bildversioner. D1 ger en dokumenterad integrationsväg för
inloggningsbiblioteket. Auth direkt i Durable Objects SQLite behöver
separat adapterutredning. Hushållsmedlemskap kontrolleras där kartan
ändras, även om en extern klient fortfarande har en token.

Detta är ett arkitekturförslag. Delningen får inte skapa ett krav på
atomära transaktioner mellan D1 och hushållsobjektet. Återimport ersätter
hushållsinnehåll; aktiva inloggningshemligheter och giltiga sessioner
ska inte återinföras från en gammal export.

Containers förenklar vanliga Linux-beroenden men har tillfällig disk;
vid nästa start efter vila är disken ny. Det ger ingen direkt
motsvarighet till Render med beständig SQLite-fil. Extern lagring och
ytterligare driftkomponenter gör det till ett onödigt tillägg i denna
minimikandidat.
[Containers diskmodell](https://developers.cloudflare.com/containers/concepts/architecture/).

## Lagring och atomiskt sparande

### D1

D1:s `batch()` kör förberedda SQL-satser sekventiellt i en transaktion
och rullar tillbaka serien om en sats misslyckas. Det är inte samma
sak som att läsa i JavaScript, fatta beslut och därefter skriva inom
en öppen lokal SQLite-transaktion. En misslyckad versionskontroll som
bara uppdaterar noll rader är inte automatiskt ett SQL-fel.
[D1 batch och sessionsmodell](https://developers.cloudflare.com/d1/worker-api/d1-database/).

Bedömning: D1 kan användas för kartan om samtliga kontroller och
skrivningar uttrycks korrekt i SQL, exempelvis med villkor och
begränsningar som verkligen avbryter hela operationen. Att kontrollera
version före en separat batch räcker inte. Samlad historik, bilder och
unikt spar-ID måste omfattas av samma skydd. Det innebär mer
SQL-specifik utformning än Render eller följande alternativ.

D1 har högst 500 MB per databas på Free och 10 GB på Paid, 2 MB per
rad/BLOB, 100 bundna parametrar per fråga och 30 sekunders frågetid.
Inbyggd Time Travel är 7 respektive 30 dagar och ersätter inte export.
[D1-gränser](https://developers.cloudflare.com/d1/platform/limits/).

### SQLite i Durable Objects

`transactionSync()` kör synkrona läsningar, JavaScript-kontroller och
SQL-skrivningar atomiskt; ett kastat fel återställer transaktionen.
Vanliga `BEGIN`-satser används inte. Detta passar bedömningsmässigt
kontroll av granskat underlag, exakt utkastversion, kartändringar,
historik och beständigt kvitto i ett samlat sparande. Privata utkast
kräver fortfarande uttryckliga användar- och hushållskontroller.
[Transaktions-API](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/).

Lagringen är begränsad till 10 GB per objekt och 2 MB per rad/BLOB.
Obegränsad historik i produkten betyder därför att växande lagring
måste följas upp. Bilder efter omkodning passar sannolikt väl, men
faktisk bytegräns behövs utöver 300 × 300 bildpunkter.
[Objektens gränser](https://developers.cloudflare.com/durable-objects/platform/limits/).

Fullständig export behöver en konsekvent läsversion. Återimport kan
valideras till osynliga mellanlagrade tabeller och avslutas med ett
atomiskt byte av aktiv dataversion. Då krävs inte att hela historiken
ryms i en Worker eller en enda uppladdning. Detta är ett föreslaget
mönster som behöver provas, inklusive avbruten import och rensning.
Skyttels exporterbara format ska vara leverantörsoberoende; varken en
D1-dump eller objektets återställningsfunktion är hela produktflödet.
[D1:s administrativa import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/).

## Tal, HTTP och körmiljö

Live använder WebRTC direkt mellan webbläsaren och OpenAI; Skyttel
startar sessionen med serverhemligheten. Terra kan anropas med vanlig
HTTPS till Responses. Cloudflare behöver därför inte transportera
ljudet, men serverns sideband-WebSocket och pågående kartjobb behöver
egen livscykel. Modellval och priser följer
[underlaget för AI och externa klienter](https://github.com/viscalyx/skyttel/issues/19).

Workers har 128 MB minne. Free ger 10 ms CPU per anrop; Paid har
30 sekunder som standard, konfigurerbart till fem minuter. Nätverksväntan
förbrukar inte CPU-tiden. HTTP kan fortsätta medan klienten är ansluten;
efter svar eller frånkoppling ger `waitUntil()` bara upp till
30 sekunder. Det är ingen fristående bakgrundsserver. Större exporter
måste strömmas eller delas upp.
[Workers gränser](https://developers.cloudflare.com/workers/platform/limits/).

Ett utgående WebSocket i ett Durable Object kan inte hibernera.
Anslutningen håller ensamt objektet levande högst 15 minuter; därefter
kan vanliga inaktivitetsregler åter gälla, även om själva anslutningen
ännu fungerar. Längre tal behöver därför en explicit aktiv
klient-/serverlivscykel, beständigt jobbtillstånd och återanslutning.
Detta är ett konkret verifieringsbehov, inte bevis att Live är omöjligt.
[WebSocket-regler](https://developers.cloudflare.com/durable-objects/best-practices/websockets/),
[objektets livscykel](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/).

`nodejs_compat` ger många Node-API:er men även begränsade eller tomma
implementationer. Ett bibliotek som går att importera är därför inte
automatiskt körbart. Lokal SQLite-drivrutin och bildbibliotek som
förutsätter vanliga native-tillägg behöver ersättas eller särskilt
verifieras; denna undersökning verifierar ingen sådan paketkombination.
[Node-kompatibilitet](https://developers.cloudflare.com/workers/runtime-apis/nodejs/).

Images-binding kan ta privata bildbytes direkt, skala och omkoda utan
publik originaladress. Förslaget är att bearbeta uppladdningen en gång,
spara enbart den lilla slutbilden i hushållsdatabasen och kasta
originalet. JPEG, PNG och WebP samt metadata och felaktiga bilder måste
ingå i provet. Upp till 5 000 unika omvandlingar per månad ingår gratis;
Images-lagring för 5 USD behövs inte i denna modell.
[Bildbytes i Workers](https://developers.cloudflare.com/images/optimization/binding/),
[Images-priser](https://developers.cloudflare.com/images/pricing/).

## Inloggning och externa klienter

Better Auth har direkt stöd för D1 genom `database: env.DB` sedan
version 1.5. Den inbyggda adaptern använder D1-batch för atomiska
operationer; detta tillför inte interaktiva transaktioner till D1.
[Better Auths D1-stöd](https://better-auth.com/blog/1-5#cloudflare-d1-support).

Better Auth erbjuder Google/Microsoft och OAuth-provider, men
leverantörernas appregistreringar och klienthemligheter behövs även
här. Cloudflare dokumenterar dessutom OAuth för MCP på Workers med
egna autentiserings- och medgivandevyer. Ingen sådan dokumentation
bevisar Skyttels fulla kombination med båda externa klienterna.
[Google](https://better-auth.com/docs/authentication/google),
[Microsoft](https://better-auth.com/docs/authentication/microsoft),
[OAuth-provider](https://better-auth.com/docs/plugins/oauth-provider),
[MCP-auktorisering på Workers](https://developers.cloudflare.com/agents/model-context-protocol/protocol/authorization/).

Före slutligt Cloudflare-val behöver samma prov täcka båda
inloggningsleverantörerna, OAuth-upptäckt och registrering, rätt
returadresser, medgivande, tokenförnyelse och indraget medlemskap.
Skyttels egen assistent och externa textklienter ska använda samma
verktygsregler för utkast och sparande. En generell klientbekräftelse
ersätter inte kontroll av exakt granskat utkast.

## Månadskostnad

Workers Paid kostar minst 5 USD per konto och månad: 10 miljoner
anrop och 30 miljoner CPU-ms ingår, därefter 0,30 USD per miljon
anrop och 0,02 USD per miljon CPU-ms. Statiska filer är gratis;
ingen särskild utgående trafikavgift tillkommer.
[Workers-priser](https://developers.cloudflare.com/workers/platform/pricing/).

D1 inkluderar 5 GB, 25 miljarder lästa och 50 miljoner skrivna rader
per månad; därefter 0,75 USD/GB-månad, 0,001 USD/miljon lästa och
1 USD/miljon skrivna rader. SQLite-objekt har motsvarande inkluderade
radkvoter och 5 GB, därefter 0,20 USD/GB-månad. DO-körtid inkluderar
400 000 GB-sekunder och en miljon anrop; överskott kostar
12,50 USD/miljon GB-sekunder och 0,15 USD/miljon anrop, med
avrundning enligt prislistan.
[D1-priser](https://developers.cloudflare.com/d1/platform/pricing/),
[Durable Objects-priser](https://developers.cloudflare.com/durable-objects/platform/pricing/).

Ett kontinuerligt aktivt objekt under 1, 4 och 10 timmar använder
cirka 461, 1 843 och 4 608 GB-sekunder vid prislistans 128 MB.
Det ryms väl i Paid-kvoten. Övrig aktivitet, radantal och CPU måste
också rymmas; antalet samtalstimmar är inte ensamt en kostnadsgaranti.

Följande är jämförbara räkneexempel med 10 SEK/USD och hypotetiskt
25 procent skattepåslag på hela summan, inte aktuell valutakurs eller
skattebesked. AI-scenariot är 3 USD Live plus 1,47 USD Terra per timme
enligt det separata AI-underlaget: 30 kartuppdrag/timme, två anrop
per uppdrag, 5 000 indatatoken och 1 000 utdata-/resonemangstoken
per anrop, med antagen cacheskrivning och utan cacheträffar.

<!-- markdownlint-disable MD013 -->
| Tal per månad | Cloudflare drift | Cloudflare + AI-exempel | Render + samma AI-exempel |
| --- | --- | --- | --- |
| 1 timme | 62,50 kr | 118,38 kr | 146,50 kr |
| 4 timmar | 62,50 kr | 286,00 kr | 314,13 kr |
| 10 timmar | 62,50 kr | 621,25 kr | 649,38 kr |
<!-- markdownlint-enable MD013 -->

Domän och DNS finns redan hos Cloudflare och kostnaden räknas separat
för båda driftalternativen; samma domän kan användas med Render.
Eventuella e-postutskick, kvotöverskott och extra textarbete tillkommer.
Befintliga abonnemang ingår inte. Vid fyra och tio timmar
är AI-kostnaden större än skillnaden mellan driftalternativen.

## Kvar före val och leverantörsbyte

Ett avgränsat prov behöver visa konkurrerande sparanden, tappat kvitto,
atomär återimport, privata utkast och bildexport; dessutom längre
Live-sideband och OAuth i de två valda klienterna. Inga resurser,
konton, betalda API-anrop eller hemligheter ingår i denna research.

Portabiliteten blir bättre med en fristående domänmodell och ett
versionerat eget exportformat. Cloudflare-bindningar, DO-transaktioner,
livscykel och migreringsverktyg måste ändå ersättas vid byte. Render
har här fördelen att vanlig Node och en lokal SQLite-fil lättare
kan köras på en annan server. Kostnadsbesparingen behöver vägas mot
det extra utvecklingsarbetet; dess timantal är inte känt.

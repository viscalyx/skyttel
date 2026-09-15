# AI, tal och externa MCP-klienter i Skyttel

Kunskapsläge: 2026-09-15. Faktaunderlag för
[Vilka villkor och klientstöd gäller för Skyttels valda AI- och MCP-flöden?](https://github.com/viscalyx/skyttel/issues/19).
Underlaget låser inga nya produktval. Cirka 200 kr per månad är ett mjukt
riktmärke för drift, lagring, tal och AI, inte en hård maxnivå.
Externa textflöden räcker i första versionen; tal behövs i Skyttel.

## Sammanfattning

- De beslutade modellerna finns med exakt API-namn `gpt-live-1` och
  `gpt-5.6-terra`; `marin` och resonemangsnivån `low` stöds.
- En timmes öppen Live-session kostar 3 USD före kartmodell och drift.
  Tystnad och väntan på kartarbetet ingår i sessionstiden.
- `store: false` stänger inte av all leverantörslagring. Missbruksloggar,
  promptcache och klientens egen historik behöver bedömas separat.
- Gemensam MCP-ingång är tekniskt möjlig, men Skyttel måste äga
  behörighet, eget utkast, versionskontroll och beständiga sparkvitton.
- Codex CLI i text över lokal stdio är det prövade externa flödet.
  Fjärransluten MCP med riktig inloggning och ChatGPT-flödet återstår
  att pröva. Dokumenterat stöd är inte ett sådant provresultat.

Källor, avgränsningar och härledning följer i respektive avsnitt.

## De beslutade modellerna och ansvarsfördelningen

`gpt-live-1` använder `/v1/live/sessions`, inte `/v1/realtime` eller
Responses. Modellen hanterar tal och kan lyssna och tala samtidigt.
Backend debiteras separat. Modellkatalogen anger 25 samtidiga sessioner
på API Tier 1; fri API-nivå stöds inte.
[OpenAI: GPT-Live 1](https://developers.openai.com/api/docs/models/gpt-live-1).

Talrösten anges som `audio.output.voice: "marin"`. `marin` är även
standard. Modell, röst och delegeringssätt väljs vid sessionsstart;
byte kräver ny session. `store` är normalt `false`.
[OpenAI: Live-sessioner](https://developers.openai.com/api/docs/guides/live-conversations).

`gpt-5.6-terra` stöder Responses, funktionsanrop, strukturerade svar
och MCP. `reasoning.effort: "low"` är ett giltigt värde. Modellen
tar text och bild som indata och lämnar text; ljud stöds inte.
Det finns därför inget skäl i dessa källor att byta de beslutade
modellerna. Tillgång för ett visst API-projekt är inte kontrollerad.
[OpenAI: GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra).

Med `delegation.type: "client"` bygger Skyttel modellunderlaget,
driver kartarbetet och kontrollerar resultaten innan de går till
talmodellen. Delegeringshändelsen innehåller metadata, inte hela
arbetsuppdraget; Skyttel behöver transkript och eget tillstånd.
Avbrutet tal avbryter inte automatiskt ett pågående kartjobb.
Behörighet, bekräftelse och beständigt tillstånd är applikationens
ansvar, även när OpenAI driver en delegerad backend.
[OpenAI: delegering och verktyg](https://developers.openai.com/api/docs/guides/live-delegation).

### Webbläsare och server

Webbläsaren skapar ett WebRTC-erbjudande. Skyttels server skapar
Live-sessionen med projektets API-nyckel och lämnar tillbaka svaret.
Ljud går över mediespåren; transkript och styrhändelser går över
datakanalen. API-nyckel och betrodd sessionskonfiguration hör hemma
på servern. Sessionsstart behöver Skyttels inloggning, behörighet,
anropsgränser och HTTPS; en kontroll av webbsidans ursprung räcker inte.
[OpenAI: WebRTC för Live](https://developers.openai.com/api/docs/guides/voice-webrtc?api=live).

Servern kan följa samma session via en autentiserad sideband-WebSocket.
Den kan ta emot transkript och även kopior av ljud. Sideband gör
inte automatiskt händelser privata från webbläsaren och styr inte
själv det hörbara ljudet. Skyttel behöver hålla verktygshemligheter
och auktorisering på servern samt begränsa vilken kontext som återförs.
[OpenAI: serverstyrning](https://developers.openai.com/api/docs/guides/voice-server-controls?api=live).

**Slutsats för teknikvalet:** ordet `client` i client-delegering
betyder att applikationen driver arbetet. Det är inget krav på att
kartlogik, nycklar eller behörighetsbeslut ligger i webbläsaren.

## Kostnader och räkneexempel

Priserna nedan gäller modellernas ordinarie API-användning. Exemplen
använder **räknekursen 10 kr/USD**, inte en verifierad dagskurs.
Moms, eventuell skatt, kortpåslag och valutapåslag tillkommer där de
gäller. Drift och lagring ingår inte i AI-exemplen.

### Tal: 1, 4 och 10 timmar per månad

Live kostar 0,05 USD per minut, debiterat per sekund.
[OpenAI: Live-pris](https://developers.openai.com/api/docs/models/gpt-live-1).

| Öppen sessionstid | Live i USD | Live i kr |
| ---------------- | ---------- | --------- |
| 1 timme          | 3          | 30        |
| 4 timmar         | 12         | 120       |
| 10 timmar        | 30         | 300       |

Tiden omfattar användarens tal, assistentens tal, tystnad och väntan
på backend. Tyst mikrofon avslutar inte sessionen. WebRTC-start
debiterar först 15 sekunder, motsvarande 0,0125 USD; dessa avräknas
när sessionen börjar köras och ska inte adderas till exempelvis en
90-sekunderssession. Upprepade starter behöver ändå ingå i uppföljningen.
Slutlig användning hämtas när sessionen avslutas.
[OpenAI: röstkostnader](https://developers.openai.com/api/docs/guides/voice-latency-cost?api=live).

### Kartmodell: mät token och antal anrop separat

Terra kostar per miljon token: 2 USD för vanlig indata, 0,20 USD
för cacheläsning och 12 USD för utdata. Cacheskrivning kostar 1,25
gånger vanligt indatapris, alltså 2,50 USD. Över 272 000 indatatoken
fördubblas indatapriset och utdata blir 1,5 gånger dyrare för hela
anropet; sådana anrop ingår inte i exemplen.
[OpenAI: Terra-pris](https://developers.openai.com/api/docs/models/gpt-5.6-terra).

Utdata i kalkylen måste inkludera debiterade resonemangstoken,
inte bara det synliga svaret. Ett anrop kan kosta även om det når
sin utgräns innan det ger ett användbart resultat.
[OpenAI: resonemangsmodeller](https://developers.openai.com/api/docs/guides/reasoning).

För normal kontextstorlek, med tokenmängder i miljoner:

```text
Terra USD = 2 × vanlig indata + 2,5 × cacheskrivning
          + 0,2 × cacheläsning + 12 × utdata

Månad SEK = drift och lagring SEK
          + räknekurs × (Live USD + Terra USD + andra API-avgifter)
          + tillämpliga skatter och betalningspåslag
```

Tokenklasserna hålls åtskilda; samma token räknas inte både som
vanlig indata och cacheskrivning. Cacheträffar och återanvändning
är beroende av kontexten, inte garanterade rabatter.
[OpenAI: promptcache](https://developers.openai.com/api/docs/guides/prompt-caching).

**Enbart illustrativ arbetslast:** 30 kartuppdrag per samtalstimme,
två Terra-anrop per uppdrag, 5 000 indatatoken och 1 000 utdata-
inklusive resonemangstoken per anrop. Anta ingen cacheläsning och
att samtliga indatatoken debiteras som cacheskrivning. Då kostar
ett anrop 0,0245 USD, ett uppdrag 0,049 USD och en timmes sådana
kartuppdrag 1,47 USD. Detta är ett räknescenario, inte uppmätt
hushållsanvändning eller ett tak.

<!-- markdownlint-disable MD013 -->

| Sessionstid | Live kr | Illustrativ Terra kr | AI-summa kr före drift och påslag |
| --- | --- | --- | --- |
| 1 timme | 30 | 14,70 | 44,70 |
| 4 timmar | 120 | 58,80 | 178,80 |
| 10 timmar | 300 | 147,00 | 447,00 |

<!-- markdownlint-enable MD013 -->

Fler modellomgångar, växande historik, rättelser och återförsök kan
höja kostnaden. Återanvänd cache eller färre kartuppdrag kan sänka
den. Textarbete utanför röstsamtal tillkommer separat.
Riktmärket 200 kr lämnar därför olika utrymme för drift beroende på
användningen; fyra timmars exemplet lämnar cirka 21 kr före påslag.
Det mjuka riktmärket är inget skäl att automatiskt välja bort ett
alternativ som kräver mindre driftarbete.

## Data, lagring och region

API-data används inte för träning utan aktivt medgivande.
Missbruksloggar kan innehålla kundinnehåll och sparas normalt upp
till 30 dagar; angivna säkerhets- och rättsliga undantag finns.
`store: false` stänger inte av dessa loggar. Modifierad
missbruksövervakning och Zero Data Retention, ZDR, kräver godkännande.

Responses sparar annars applikationstillstånd normalt 30 dagar.
Live lagrar ingen sessionsinspelning som standard; `store: true`
kräver aktiverat projektstöd och ger 30 dagars lagring. Inspelning
och förgrening saknas med ZDR. Publik raderingsendpoint för lagrade
Live-sessioner saknas. Att en ny session har `store: false` raderar
inte en tidigare inspelning.

EU-regional lagring och behandling dokumenteras för båda modellerna,
Live och Responses, via `eu.api.openai.com`. Utanför USA krävs
godkända missbrukskontroller och särskilt lagringsavtal. Systemdata
och tredjepartstjänster omfattas inte av samma regionala löfte.
Responses `background: true` stöds inte i EU-regionen.

Promptcache kan dessutom behålla krypterade tillstånd på GPU-maskiner
upp till 24 timmar. Alltså betyder `store: false` inte ”inga spår”.
Det aktuella projektets avtal, region och godkännanden är okända.
[OpenAI: datakontroller](https://developers.openai.com/api/docs/guides/your-data).

För Terra gäller `prompt_cache_options.ttl: "30m"` som minsta
cachelivslängd, inte en maximal lagringstid. Explicit cacheläge utan
brytpunkter dokumenteras som ett sätt att undvika cacheskrivning
och cacheanvändning för anropet. Det ändrar inte säkerhetsloggningen.
Manuell cacheradering finns inte. Exakt vald kombination behöver
stämmas av mot projektets datakontroller före produktion.
[OpenAI: cachelagring och explicit cache](https://developers.openai.com/api/docs/guides/prompt-caching).

**Slutsats för Skyttel:** behandla ljud, transkript, kartkontext,
verktygsargument, svar, utkast och kvitton som skilda dataflöden.
Skyttels egen raderingsregel styr inte automatiskt leverantörens
loggar eller kopior i en extern assistent. `store: false` bör
därför beskrivas som avstängd sessions-/svarslagring, med separata
villkor för loggar och cache.

### Externa klienters villkor är ett eget lager

Codex med ChatGPT-inloggning följer arbetsytans regler och relevanta
ChatGPT-inställningar. Codex med API-nyckel följer API-organisationens
dataregler. Ett valt `store: false` i Skyttels eget API-anrop styr
inte en extern ChatGPT-konversation.
[ChatGPT Learn: autentisering](https://learn.chatgpt.com/docs/auth).

För Work i Enterprise/Edu dokumenteras skilda livscykler för
konversationer, filer och körmiljöer. Kopierat innehåll från en
ansluten tjänst följer lagringsplatsens regler. API:ets ZDR definierar
inte Work-lagring. Detta belägger inte motsvarande inställningar
för ett privat Plus-konto; kontotyp och inställningar behöver väljas.
[ChatGPT Learn: Work och datalagring](https://learn.chatgpt.com/docs/enterprise/chatgpt-work-cloud-security).

## Externa klienter: dokumenterat stöd och kvarvarande prov

Aktuell dokumentation använder benämningen ChatGPT desktopapp även
för Codex-ytor. En produktbenämning ersätter inte kontroll av den
installerade klientens version och åtkomst.

<!-- markdownlint-disable MD013 -->

| Yta | Dokumenterat anslutningssätt | Tal och begränsning för Skyttel |
| --- | --- | --- |
| ChatGPT webb | Installerad plugin med fjärransluten MCP; läser inte lokal Codex-konfiguration. | Skyttels externa textflöde är oprövat. |
| Desktop, Codex CLI och IDE | Lokal stdio eller Streamable HTTP, Bearer-token eller OAuth. Delar MCP-konfiguration på samma Codex-värd. | CLI-provet omfattar endast text och stdio. IDE har MCP men saknar pluginstöd. |
| ChatGPT mobil | Tillgängliga plugins i Chat/Work; plugins märkta Desktop only kan inte användas där. | Egen Skyttel-plugin och sparflöde behöver provas. |
| Codex via mobil Remote | Telefonen styr uppgifter på parkopplad Mac/PC som är vaken och ansluten. | Skilt från fristående MCP på telefonen. Röst dokumenteras för iOS Remote med desktopvärd. |

<!-- markdownlint-enable MD013 -->

Källor:
[ChatGPT Learn: MCP](https://learn.chatgpt.com/docs/extend/mcp),
[plugins och mobil](https://learn.chatgpt.com/docs/plugins),
[Remote](https://learn.chatgpt.com/docs/remote),
[Voice](https://learn.chatgpt.com/docs/features/voice).

Externt tal ligger utanför första versionens krav. För ett eventuellt
senare beslut dokumenteras Voice i desktopappen för Chat, Work och
Codex med Plus, Pro, Business, Edu eller Enterprise samt iOS Remote.
Utrullning och arbetsytepolicy påverkar åtkomst. Svensk röst med
Skyttels MCP är inte verifierad; detta är inte bevis på att stödet
saknas. Diktering till text är skilt från ett levande röstsamtal.
[ChatGPT Learn: Voice](https://learn.chatgpt.com/docs/features/voice).

För att testa egen MCP i ChatGPT beskrivs utvecklarläge, publik
HTTPS med Streamable HTTP eller Secure MCP Tunnel. Tillgång till
utvecklarläge beror på konto och arbetsyta. Tunnel är ett
testalternativ; plugininlämning kräver publik HTTPS. Uppdaterad
verktygsmetadata behöver uppdateras i anslutningen och provas i
en ny konversation.
[OpenAI: anslut och testa plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt).

**Förslag till avgränsat första klientprov:** ChatGPT på webben med
egen fjärransluten MCP-plugin samt Codex CLI eller desktop med
Streamable HTTP. Det matchar dokumenterade textvägar och bygger
vidare på CLI-provet. Beställaren behöver fortfarande välja exakt
Codex-yta; kontoåtkomst och OAuth-flöde kontrolleras i provet.

### Abonnemang hålls skilda från Skyttels API-kostnad

Den öppnade prislistan anger Plus 20 USD/månad, Pro från 100 USD
och Business 20 USD per användare/månad vid årsbetalning eller
25 USD vid månadsbetalning, med minst två användare. Codex har
också API-baserad användning. Lokalt pris, skatt, avtal och kontots
aktuella åtkomst är inte kontrollerade. Om ett befintligt abonnemang
ska räknas in i hushållets riktmärke återstår att besluta.
[ChatGPT Learn: priser](https://learn.chatgpt.com/docs/pricing).

Ett externt klientanrop till Skyttels MCP betyder i sig inte ett
nytt Terra-anrop i Skyttel. Den externa klienten driver modellen;
Skyttel utför kartverktyget. Den egna talassistenten använder däremot
Skyttels Live- och Terra-API. Detta är en kostnadsslutsats av de två
separata körvägarna, inte en ny vald implementation.

## Autentisering, återkallelse och sparbesked

OpenAI:s pluginavtal för skyddad MCP bygger på OAuth 2.1:
resursmetadata, auktoriseringsmetadata, korrekt `resource`, PKCE
med annonserat `S256` och klientregistrering via CIMD, DCR eller
förregistrerad klient. ChatGPT och Codex har olika återkopplingsadresser;
kopiera den faktiskt visade adressen för respektive klient.
Servern kontrollerar token, utfärdare, målgrupp, utgång och scopes
vid varje verktygsanrop. Verktygens `securitySchemes` och
autentiseringsfel måste även låta klienten starta inloggningen.
[OpenAI: MCP-autentisering](https://developers.openai.com/plugins/build/auth).

Codex dokumenterar även vanliga Bearer-token. Dess speciella
ChatGPT-sessionsautentisering gäller betrodda förstapartstjänster;
det är inte en inloggningslösning för en godtycklig Skyttel-server.
OAuth-klientregistrering och callbacks måste provas med det valda
identitetssystemet.
[ChatGPT Learn: MCP-autentisering](https://learn.chatgpt.com/docs/extend/mcp).

Avinstallation av en plugin lämnar separat anslutna MCP-kopplingar
kvar tills de kopplas från. Lokal CLI-hjälp visar `mcp logout` för
att koppla från en namngiven server; hjälpen bevisar ingen omedelbar
serveråterkallelse av redan utfärdade token.
[ChatGPT Learn: ta bort plugin](https://learn.chatgpt.com/docs/plugins).
Lokal kontroll: Codex CLI 0.153.0, `codex mcp --help` och
`codex mcp logout --help`; inga anslutningar ändras i undersökningen.

**Konsekvens för Skyttel:** koppla användare och hushåll till en
betrodd identitet. Kontrollera även aktuell medlemskap/åtkomst i
Skyttel. Återkallelse behöver göra fortsatt läsning och sparande
omöjligt på servern, även om klienten behåller en token eller en
öppen anslutning. Exakt mekanism beror på identitetssystemet och
är en kvarvarande designfråga, inte en egenskap som MCP löser själv.

### Gemensam MCP-ingång

Responses kan anropa fjärransluten MCP. Applikationen sköter OAuth
och skickar åtkomsttoken med varje nytt anrop. `authorization`
lagras inte i Response-objektet. Verktygsgodkännanden krävs normalt
men går att konfigurera bort. Därför kan en allmän klientdialog
inte ensam vara Skyttels bevis för godkännande av exakt utkastversion.
[OpenAI: MCP i Responses](https://developers.openai.com/api/docs/guides/tools-connectors-mcp).

**Genomförbarhetsbedömning, inte nytt beslut:** en gemensam skyddad
HTTP-ingång kan användas av de externa klienterna och Skyttels egen
serveradapter. Egen serveradapter kan översätta modellens
funktionsanrop till samma MCP-verktyg. Hosted MCP i Responses är
en annan möjlig transportvariant; den behövs inte för att dela
domänregler. Produktionsvägen behöver bevara följande prövade krav:

1. Läsningar begränsas till användarens tillåtna hushåll.
2. Förslag ändrar personens eget utkast, inte den sparade kartan.
3. Sparande kontrollerar granskad kartversion och exakt utkastversion.
4. Samma spar-ID ger samma beständiga kvitto, utan dubblerad ändring.
5. Vid osäkert svar hämtas kvittot innan en ny ändring görs.
6. Export, återimport, permanent radering och åtkomsthantering ligger
   i Skyttels administrativa gränssnitt, utanför kartverktygen.

Kravens källa är det godkända
[externa MCP-provet](https://github.com/viscalyx/skyttel/issues/15#issuecomment-5667325819).
OAuth-inloggning bevisar användarens delegerade behörighet; den
bevisar inte ensam att modellen tolkar ett visst sparbesked rätt.

## Avbrott, återanslutning och faktisk verifiering

Live behöver slutlig `session.closed` för bekräftad avslutning och
användning. Ett avbrutet nätverk är inte samma bekräftelse. En
ersättningssession behöver relevant sparad historik; en förgrening
av en lagrad session är en ny session med nytt ID. Skyttels väntande
kartarbete måste kontrolleras separat före återförsök. Den lästa
guiden nämner utgången session men fastställer inte en numerisk
maxlängd; prototypens fem minuter är dess egen gräns.
[OpenAI: sessionslivscykel](https://developers.openai.com/api/docs/guides/live-conversations).

### Vad underlagen faktiskt visar

- Det externa provet använder Codex CLI 0.153.0, macOS och text över
  stdio med syntetiskt hushåll. Förslag, separat sparande, konflikter,
  ångraförslag och kvittokontroll finns i observationerna.
- Återanslutning efter förlorat sparkvitto sker genom provledarens
  återstart. Automatisk klientåteranslutning är inte verifierad.
- Röstprototypens källkod anger Live med `marin`, client-delegering,
  Terra `low`, `service_tier: "default"` samt `store: false` för
  Live och Responses. Den använder lokalt MCP och global
  `api.openai.com`; det är inget EU-produktionsprov.
- Riktig inloggning, OAuth-återkallelse, fjärransluten MCP,
  produktionslagring och ChatGPT-sparflödet saknar motsvarande prov.

Lokala källor finns på prototypgrenarna
`codex/prototype-swedish-voice` och `codex/prototype-external-mcp`:
`prototypes/swedish-voice/server.py`,
`prototypes/swedish-voice/sideband.py`,
`prototypes/external-mcp/observations.md` och
`prototypes/external-mcp/client-feasibility.md`.
Det kanoniska talvalet finns i
[Vilken talväg klarar det godkända samtalsflödet på svenska?](https://github.com/viscalyx/skyttel/issues/14#issuecomment-5688291674).

## Kvarvarande fakta att klarlägga före produktion

- Vilka ChatGPT-/Codex-ytor ska ingå i första externa textflödet?
- Vilket konto och abonnemang ger faktisk åtkomst till egen plugin,
  utvecklarläge? Ska abonnemanget räknas i riktmärket?
- Vilka API-datakontroller och EU-villkor kan hushållets projekt få?
- Vilka data får den externa klienten behålla i sin egen historik?
- Vilken OAuth-lösning fungerar med båda klienternas upptäckt,
  registrering, callbacks, utgångna token och återkallelse?
- Hur många kartuppdrag och modellomgångar kräver verklig användning,
  och hur mycket kontext skickas i varje anrop?

Denna research gör inga betalda API-anrop, kontokopplingar eller
konfigurationsändringar. Den använder officiell dokumentation,
redan tillgängliga offentligt avsedda prototypanteckningar och
källkod. Hushållsdata, körfiler, API-nycklar och råtranskript ingår
inte i undersökningen.

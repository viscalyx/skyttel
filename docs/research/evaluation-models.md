# OpenAI-modeller och priser för text- och talutvärderingen

Underlag för [ärende #168](https://github.com/viscalyx/skyttel/issues/168)
inom kartan [#166](https://github.com/viscalyx/skyttel/issues/166).
Uppgifterna används för modellregistret och kostnadsuppskattningen.

**Kontrolldatum:** 2026-09-30. Alla uppgifter kommer från OpenAI:s
dokumentation på `developers.openai.com` (Markdown-versionerna av sidorna)
och gäller standardbehandling (Standard) utan regional behandling.
Priser anges i USD per miljon tokens om inget annat står. Inga betalda
anrop gjordes. Åtkomst bekräftades med den kostnadsfria modellistan
`GET /v1/models`, som listade samtliga modell-id i dokumentet för
projektets nyckel.

## Svar i korthet

Alla fem backendmodeller finns och är bekräftade, även GPT-6.1 Sol. De
anropas med sina id i Responses API, stöder verktygsanrop och kan köras
med `store: false`. Utgångsuppsättningens nivåer `low` och `high` stöds av
samtliga. GPT-6 Astra och GPT-6.1 Sol saknar nivån `none`. För tal är
`gpt-live-1` (0,05 USD per minut, debiteras per sekund) den modell som
delegerar arbete till en backend. Realtime-modellerna `gpt-realtime-2.1`,
`gpt-realtime-2.1-mini`, `gpt-realtime-2` och `gpt-realtime-1.5` tar emot
tal över WebRTC och anropar funktionsverktyg, men debiteras per ljudtoken.
Ingen av sidorna anger uttryckligen svenska som stött språk för taligenkänning.
Det måste därför visas med talscenarierna.

## Backendmodeller (Responses API)

<!-- markdownlint-disable MD013 -->
| Modell | Id i API:et | Resonemangsnivåer | Indata | Cachad indata | Cacheskrivning | Utdata |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| GPT-5.6 Luna | `gpt-5.6-luna` | `none`, `low`, `medium` (standard), `high`, `xhigh`, `max` | 0,20 | 0,02 | 0,25 | 1,20 |
| GPT-5.6 Terra | `gpt-5.6-terra` | `none`, `low`, `medium` (standard), `high`, `xhigh`, `max` | 2,00 | 0,20 | 2,50 | 12,00 |
| GPT-5.6 Sol | `gpt-5.6-sol` | `none`, `low`, `medium` (standard), `high`, `xhigh`, `max` | 4,00 | 0,40 | 5,00 | 20,00 |
| GPT-6 Astra | `gpt-6-astra` | `low`, `medium`, `high`, `xhigh`, `max` | 10,00 | 1,00 | 12,50 | 50,00 |
| GPT-6.1 Sol | `gpt-6.1-sol` | `low`, `medium` (standard), `high`, `xhigh`, `max` | 2,00 | 0,10 | 2,50 | 10,00 |
<!-- markdownlint-enable MD013 -->

Priserna gäller korta anrop, det vill säga högst 272 000 tokens indata.
Källor: modellsidorna för
[GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna),
[GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra),
[GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol),
[GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra),
[GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol)
och [prissidan](https://developers.openai.com/api/docs/pricing).

### Långa anrop

Anrop med mer än 272 000 tokens indata debiteras för hela anropet med
dubbelt pris för indata och cache samt 1,5 gånger priset för utdata.
Prissidan anger dessa belopp:

<!-- markdownlint-disable MD013 -->
| Id i API:et | Indata | Cachad indata | Cacheskrivning | Utdata |
| --- | ---: | ---: | ---: | ---: |
| `gpt-5.6-luna` | 0,40 | 0,04 | 0,50 | 1,80 |
| `gpt-5.6-terra` | 4,00 | 0,40 | 5,00 | 18,00 |
| `gpt-5.6-sol` | 8,00 | 0,80 | 10,00 | 30,00 |
| `gpt-6-astra` | 20,00 | 2,00 | 25,00 | 75,00 |
| `gpt-6.1-sol` | 4,00 | 0,20 | 5,00 | 15,00 |
<!-- markdownlint-enable MD013 -->

### Villkor som påverkar kostnaden

- Cacheskrivning kostar 1,25 gånger det ocachade priset för indata för
  GPT-5.6 och senare. En läsning från cachen kostar 0,1 gånger priset, och
  0,05 gånger för GPT-6.1 Sol. Varje indatatoken debiteras med exakt ett av
  priserna för ocachad indata, cachad indata eller cacheskrivning; avgiften
  för cacheskrivning läggs inte ovanpå
  ([prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)).
- Ett prefix måste vara minst 1 024 synliga tokens för att cachas för
  GPT-5.6 och senare. Cachens livslängd styrs med
  `prompt_cache_options.ttl`, där `30m` är enda och standardvärdet.
  Användningen redovisas i `usage.input_tokens_details.cached_tokens` och
  `usage.input_tokens_details.cache_write_tokens`.
- GPT-5.6 Sol har ett kampanjpris som gäller minst till och med
  2026-11-21. Priset kan därefter ändras
  ([prissidan](https://developers.openai.com/api/docs/pricing)).
- Regional behandling (dataresidens) kostar 10 procent extra för modeller
  som släppts 2026-03-05 eller senare. Batch och Flex kostar hälften av
  Standard, och Fast mode dubbelt.
- Resonemangstokens debiteras som utdata. Högre resonemangsnivå ger därför
  i regel högre kostnad och längre svarstid
  ([reasoning](https://developers.openai.com/api/docs/guides/reasoning)).

### Resonemangsnivåer

`reasoning.effort` anges i Responses API. GPT-6 Astra returnerar HTTP 400
för `none`, och GPT-6.1 Sol stöder varken `none` eller `minimal`
([reasoning](https://developers.openai.com/api/docs/guides/reasoning),
[Using GPT-6](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra)).
Kartans utgångsuppsättning, `low` för alla och `high` för GPT-6 Astra och
GPT-6.1 Sol, stöds därmed av samtliga modeller. Modellsidan för GPT-6 Astra
anger inte vilken nivå som är standard. Ange därför alltid nivån
uttryckligen i utvärderingen.

### Verktygsanrop och `store: false`

- Alla fem modellerna stöder `v1/responses` och har `function_calling` bland
  sina funktioner. Responses API stöder även verktyget `mcp` för alla fem.
- GPT-6 Astra och GPT-6.1 Sol kräver Responses API för verktygsanrop; Chat
  Completions stöder dem bara utan verktyg.
- `store` är en parameter i
  [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)
  med standardvärdet `true`. Ingen modellsida anger något undantag för
  `store: false`. I tillståndslöst läge, det vill säga med `store: false`,
  innehåller resonemangsobjekten i `output` krypterat innehåll
  (`encrypted_content`) som standard. Ett flerstegssamtal kräver därför att
  hela `output` skickas tillbaka i nästa anrop
  ([conversation state](https://developers.openai.com/api/docs/guides/conversation-state)).
- Med `store` utelämnat eller `true` sparar Responses API svaret i minst
  30 dagar som applikationstillstånd
  ([data controls](https://developers.openai.com/api/docs/guides/your-data)).

## Talmodeller

### GPT-Live (`gpt-live-1`)

[GPT-Live 1](https://developers.openai.com/api/docs/models/gpt-live-1) är en
fullduplexmodell som lyssnar och talar samtidigt och delegerar resonemang
och verktyg till en backend.

- **Pris:** 0,05 USD per minut, debiteras per sekund utan avrundning uppåt.
  Hela den aktiva sessionen debiteras, även tystnad och tid då backend
  arbetar. Att stänga av mikrofonen stänger inte sessionen.
- **WebRTC-start:** `POST /v1/live/sessions` debiterar 15 sekunder när
  sessionen initieras. Beloppet räknas av mot sessionens tid när den körs
  och läggs alltså inte till
  ([cost optimization](https://developers.openai.com/api/docs/guides/voice-latency-cost)).
- **Delegering:** `delegation.type` är `responses` eller `client`. Med
  Responses-delegering väljer sessionen en backendmodell och stöder
  verktygen `function` och `web_search`. Med klientdelegering kör
  applikationen valfri backend och skickar resultaten tillbaka. Backendens
  tokens debiteras separat enligt backendmodellens pris
  ([delegation](https://developers.openai.com/api/docs/guides/live-delegation)).
- **Transkription:** Sessionen skickar `session.input_transcript.delta` och
  `session.output_transcript.delta`. Dokumentationen anger ingen separat
  avgift för dessa utöver minutpriset
  ([managing sessions](https://developers.openai.com/api/docs/guides/live-conversations)).
- **Sessionsgränser:** Kontextfönstret är 128 000 tokens. Över 90 procent
  startar GPT-Live en ersättande röstmotor i samma session med
  instruktionerna och högst 8 192 tokens historik. Instruktionerna får vara
  högst 16 384 tokens, och varje `session.*.append` högst 500 tokens.
  `session.started` anger `expires_at`, och sessionen stängs med orsaken
  `expired` när tidsgränsen nås. Någon fast maxlängd anges inte i
  dokumentationen.
- **Samtidiga sessioner:** 25 (nivå 1), 50 (nivå 2), 200 (nivå 3), 300
  (nivå 4) och 500 (nivå 5). Gratisnivån stöds inte.
- **Lagring:** `store` är `false` som standard för nya sessioner
  ([Live-referensen](https://developers.openai.com/api/reference/resources/live/primary-websocket)).

### Realtime-modeller

Modellerna tar emot ljud och text, svarar med ljud och text och anropar
funktionsverktyg via `v1/realtime`. De ansluter över WebRTC, WebSocket och
SIP ([WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc)).
Delegering sker genom att applikationen kör modellens funktionsanrop, inte
genom Live-delegering.

<!-- markdownlint-disable MD013 -->
| Id i API:et | Ljud in | Cachat ljud in | Ljud ut | Text in | Cachad text in | Text ut | Kontext |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `gpt-realtime-2.1` | 32,00 | 0,40 | 64,00 | 4,00 | 0,40 | 24,00 | 128 000 |
| `gpt-realtime-2.1-mini` | 10,00 | 0,30 | 20,00 | 0,60 | 0,06 | 2,40 | 128 000 |
| `gpt-realtime-2` | 32,00 | 0,40 | 64,00 | 4,00 | 0,40 | 24,00 | 128 000 |
| `gpt-realtime-1.5` | 32,00 | 0,40 | 64,00 | 4,00 | 0,40 | 16,00 | 32 000 |
<!-- markdownlint-enable MD013 -->

- Användarens ljud motsvarar 1 token per 100 ms (600 tokens per minut) och
  assistentens ljud 1 token per 50 ms (1 200 tokens per minut). En minut
  ocachat ljud in kostar alltså cirka 0,019 USD för `gpt-realtime-2.1` och
  0,006 USD för `gpt-realtime-2.1-mini`. En minut ljud ut kostar cirka
  0,077 respektive 0,024 USD. Hela samtalet skickas som indata vid varje
  svar, så senare turer kostar mer
  ([cost optimization](https://developers.openai.com/api/docs/guides/voice-latency-cost)).
- En Realtime-session varar högst 60 minuter
  ([Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)).
- `gpt-realtime-2.1`, `gpt-realtime-2` och `gpt-realtime-2.1-mini` stöder
  resonemangstokens och konfigurerbar resonemangsnivå. Sidan för
  `gpt-realtime-1.5` anger inget stöd för resonemang.
- Transkription av indata i en Realtime-session debiteras separat enligt
  transkriptionsmodellens pris.
- `gpt-realtime` och `gpt-realtime-mini` avvecklas 2027-01-20 och ersätts av
  `gpt-realtime-2.1` respektive `gpt-realtime-2.1-mini`
  ([deprecations](https://developers.openai.com/api/docs/deprecations)).

### Transkriptionsmodeller

<!-- markdownlint-disable MD013 -->
| Id i API:et | Användning | Pris |
| --- | --- | ---: |
| `gpt-live-transcribe` | Realtidstranskription över WebRTC eller WebSocket | 0,017 USD/min |
| `gpt-realtime-whisper` | Realtidstranskription | 0,017 USD/min |
| `gpt-transcribe` | Filer och avslutade turer i Realtime, endast WebSocket | 0,0045 USD/min |
<!-- markdownlint-enable MD013 -->

`whisper-1`, `gpt-4o-transcribe` och `gpt-4o-mini-transcribe` avvecklas
2027-02-26 och ersätts av `gpt-live-transcribe` eller `gpt-transcribe`
([realtime transcription](https://developers.openai.com/api/docs/guides/realtime-transcription),
[prissidan](https://developers.openai.com/api/docs/pricing)).

### Svenska

Ingen av sidorna för `gpt-live-1`, Realtime- eller transkriptionsmodellerna
listar vilka språk taligenkänningen stöder. Transkriptionsmodellerna tar
språkkoder i ISO 639-1-format, till exempel `sv`, i fältet `languages`.
GPT-Lives extra röster finns på engelska och portugisiska.
Dokumentationen rekommenderar att prompten skrivs på det språk som
assistenten ska tala och att varje språk testas. Endast guiden för
[talsyntes](https://developers.openai.com/api/docs/guides/text-to-speech)
nämner svenska uttryckligen. Att modellerna förstår svenskt tal måste därför
bekräftas med talscenarierna.

## Övriga iakttagelser

- `gpt-6-luna` (0,10 / 0,01 / 0,125 / 0,50) och `gpt-6-sol` finns också.
  GPT-6.1 Sol ersätter GPT-6 Sol. OpenAI:s exempel på Responses-delegering
  för GPT-Live använder `gpt-6-luna` och föreslår `gpt-6-sol` för mer
  komplexa uppgifter. Ingen av dem ingår i kartans utgångsuppsättning.
- Priserna för `gpt-5.6-terra` och `gpt-live-1` stämmer med
  `currentRates` i `src/server/cost-estimates.ts` (kontrollerat
  2026-09-25).

## Ej bekräftat

- Uttryckligt stöd för svenskt tal i `gpt-live-1`, Realtime-modellerna och
  transkriptionsmodellerna.
- Fast maxlängd för en GPT-Live-session. Dokumentationen anger bara
  `expires_at` per session och orsaken `expired`.
- Standardnivå för resonemang i GPT-6 Astra.
- Att `store: false` fungerar i praktiken för varje modell. Detta är
  dokumenterat per endpoint och inte provat med betalda anrop.

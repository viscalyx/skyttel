# Hur andra projekt avgränsar assistentens uppdrag

Underlag för dem som ska utforma Skyttels samtal. Källor och priser är
kontrollerade 2026-11-02. Jämförelsen gäller fritt naturligt språk om
hushållets karta, direkt hjälp med kartfunktioner och korta förklaringar
som behövs i det aktuella kartarbetet. Allmän chatt ligger utanför.
Avvisningar ska kunna formuleras dynamiskt. Rapporten väljer ingen
arkitektur, produkt eller tolerans för fel.

**En separat produkt är valfri.** Befintliga Responses kan användas för
en egen semantisk kontroll. Öppna bibliotek kan ordna sådana kontroller,
och en molntjänst kan sköta klassificeringen. Inget av alternativen
bevisar att svenska kartbegäranden bedöms rätt eller stoppar automatiskt
GPT Lives direkta WebRTC-ljud.
[Structured Outputs][structured], [Skyttels textväg][text],
[Skyttels uppspelning][voice].

## Vad som faktiskt undersöks

Ämnesavgränsning bedömer om en begäran hör till uppdraget.
Skadlighetsmoderering bedömer andra kategorier: OpenAI Moderation är
kostnadsfri men klassificerar skadligt innehåll i text och bild, inte
Skyttels uppdrag eller ljud. Promptinjektion försöker ändra kontrollens
instruktioner, exempelvis genom kartdata; en ofarlig allmän fråga behöver
inte vara en injektion. Behörighet till kartan och kontroll av sparande
behöver fortfarande prövas i appen.
[Moderation][moderation], [NeMos säkerhetsbeskrivning][nemo-faq],
[befintlig svarshantering][text-flow].

Nedan skiljs **dokumenterad mekanism**, **kodgranskning** och
**anekdotisk egen erfarenhet** åt. Inga produkter installeras eller körs,
inga konton skapas och inga debiterbara anrop görs. Därmed finns inga
reproducerade kvalitets- eller tidsmått för Skyttel. Exempelkod och
leverantörers resultat är inte sådana mått.

## Fyra representativa angreppssätt

<!-- markdownlint-disable MD013 -->
| Kandidat | Kontroll och naturligt språk | Kontext, begränsning och leveranspunkt |
| --- | --- | --- |
| Egen klassificering via befintliga Responses | Instruktioner beskriver uppdraget; ett schema kan skilja kontrollbeslut från fri svarstext. Ingen ny produkt behövs. [Gränssnitt][structured]. | Appen väljer relevant samtal och kartkontext. Bedömning före generering kan neka begäran; efter färdigt svar kan den hålla tillbaka ämnesavsteg. Schema garanterar format, inte rätt innebörd. Skyttels textväg ger en sådan kontrollpunkt. [Kod][text], [schema][structured]. |
| NeMo Guardrails med Topic Control | Pythonbibliotek med egna ämnesinstruktioner och särskild klassificeringsmodell. Ingen lista med exakta godkända användarrepliker krävs. [Konfiguration][nemo-doc]. | Den granskade kontrollen skickar samtalskontext och senaste användarmeddelandet till modellen. Det är en ingångskontroll; en separat utgångskontroll behövs för färdiga svar. [Kod][nemo-action]. |
| Semantic Router, v1 IndexedRouter | Vektorlikhet mot representativa exempel väljer en väg. Exemplen är semantiska referenser, inte en uttömmande lista med godkända meddelanden. Lokal modell och lokalt index är möjliga. [Kod][router-index]. | Standardanropet tar en textsträng och väljer en väg; appen behöver tillföra samtalskontext och hantera blandade begäranden. Utan tröskel vinner bästa väg även vid svag matchning. Klassificerar inte automatiskt ett senare svar. [Kod][router-base]. |
| Amazon Bedrock Guardrails, denied topics | Hanterad tjänst; ApplyGuardrail bedömer text från även externa modeller utan Bedrock-modellanrop. [API][aws-api]. | Högst 30 förbjudna ämnen; negativa definitioner som ”allt utom kartarbete” ska inte användas. Därför uttrycker detta inte ensamt Skyttels positiva uppdrag. Bedömning av in- och utdata är möjlig. [Ämnesregler][aws-topics]. |
<!-- markdownlint-enable MD013 -->

Instruktioner i den svarande modellen styr dess beteende, medan en
separat kontroll ger appen ett beslut att verkställa. Att bara begränsa
verktygen räcker inte för vanligt språk: Skyttel kan ta emot ett textsvar
utan verktygsanrop. Det är en slutsats från kodvägen, inte ett uppmätt
jämförelseresultat. [Svarshantering][text-flow].

## Dynamiska avvisningar kräver särskild integration

Egen kontroll kan returnera en kategori och låta en modell formulera
en kort förklaring utifrån sammanhanget. Kategorierna begränsar inte
användarens formuleringar. Även den genererade avvisningen behöver
omfattas av den valda leveranskontrollen; ett nytt fritt modellsteg kan
annars skapa ett nytt ämnesavsteg. Detta är en möjlig integration,
inte ett beslutat flöde. [Strukturerade utdata][structured].

NeMos medföljande Colang-flöde innehåller en fast avvisningsreplik.
Den delen behöver ersättas med dynamisk formulering eller ett
kontrollresultat som Skyttel hanterar. Kodgranskningen visar dessutom
att ingångskontrollen tolkar exakt `off-topic` som avvisning och annan
svarstext som godkännande. Ett sådant tolkningsbeteende kräver särskild
bedömning av oväntade modellresultat; bibliotekets namn ger ingen
garanti. [Avvisningsflöde][nemo-flow], [tolkning][nemo-action].

Semantic Router ger ett vägval, inte användarsvaret. Appen kan därför
behålla dynamisk formulering. Trösklar behöver kalibreras på separata
märkta exempel; dokumentationen varnar för kalibrering på samma repliker
som ligger i indexet. Högre tröskel innebär fler begäranden utan vald
väg. Det är ett dokumenterat avvägningsproblem, inte en fastställd
tröskel för Skyttel. [Kalibrering][router-cal].

Bedrocks blockerade utdata är normalt ett konfigurerat standardsvar.
Appen kan använda kontrollresultatet och formulera en egen avvisning,
men den nya texten måste då hanteras före leverans. Standardsvaret
uppfyller inte kravet på dynamiska avvisningar. [API-svar][aws-api].

## Kostnad, licens och ytterligare mottagare

Priserna nedan är USD, utan antagen skatt eller valutaväxling. Gratis
bibliotek betyder inte gratis modellkörning, infrastruktur eller drift.

<!-- markdownlint-disable MD013 -->
| Kandidat | Pris och fria möjligheter den 2026-11-02 | Drift och data |
| --- | --- | --- |
| Egen Responses-kontroll | Ingen separat produktavgift. Exempel med befintlig modell `gpt-6.1-sol`, standardläge och kort kontext: 2 USD in och 10 USD ut per miljon token, utan cache. Kontrollanrop och dynamisk avvisning tillkommer till ordinarie modellarbete. Ingen särskild kostnadsfri ämneskontrollkvot är belagd. [Prislista][openai-prices]. | Kan använda befintlig SDK och leverantör. Ingen ytterligare leverantör behövs; den kontext som kontrollen behöver skickas åter till OpenAI. [Gränssnitt][structured], [befintligt anrop][text]. |
| NeMo och Topic Control | Bibliotek: Apache-2.0, ingen licensavgift. Modell: NVIDIA Community Model License samt Llama 3.1-villkor; NIM-container har egna villkor. NVIDIA erbjuder gratis utvecklings-API med möjlig strypning; fast fri kvot och produktionspris per anrop är inte publicerade på modellsidan. [Bibliotekslicens][nemo-license], [modell/container][nim-license], [gratis API][nvidia-trial]. | Egen Pythondrift och modellresurser, exempelvis GPU för NIM. Lokal kontroll kan behålla innehållet lokalt; valt moln-API får begäran och samtalskontext. Bibliotekets användningstelemetri är skild från modell- och spårningsanrop. [Drift][nim-start], [dataflöden][nemo-faq]. |
| Semantic Router | MIT-licens utan biblioteksavgift. Lokal modell/index kan undvika externa kontrollavgifter men kräver beräkningsresurser; modelllicensen granskas separat. Väljs ett externt vektormodell-API betalas dess användning. [Licens][router-license], [lokala och externa modeller][router-encoders]. | Egen Pythondrift. Lokalt index och lokal modell behöver ingen ytterligare innehållsmottagare. Externt modell-API får texten; externt index tillför också en mottagare för lagrade exempel/vektorer. [Indexkod][router-index], [modellval][router-encoders]. |
| Bedrock denied topics | 0,15 USD per 1 000 textenheter. En enhet är upp till 1 000 tecken, avrundat uppåt per text. Två kontroller med 200 respektive 1 500 tecken ger 3 enheter, alltså 0,00045 USD, enbart för ämnesfiltret. Ingen permanent fri ämneskvot beläggs; gratis ord-/regexfilter ersätter inte ämneskontroll. [Prislista][aws-price]. | AWS-konto, konfigurerad tjänst och API-integration; ingen självhostad öppen modell ingår. Insänd begäran, svar och eventuell sammanfogad kontext får en ytterligare mottagare, AWS. Ljud ingår inte i det jämförda textanropet. [API][aws-api]. |
<!-- markdownlint-enable MD013 -->

**NIM-priset behöver kontrolleras för vald utgåva.** NVIDIAs allmänna
FAQ anger AI Enterprise från 4 500 USD/GPU/år eller cirka 1 USD/GPU/timme
i molnet. Nyare NIM-dokumentation, uppdaterad 2026-10-31, skiljer på
avgiftsfria NIM/Certified Feature Branch och abonnemang för Certified
Production Branch. Det är inte belagt vilken utgåva som erbjuds för
den aktuella TopicControl-containern. Detta är inte en offert eller en
verifierad total driftkostnad. [FAQ][nim-price], [utgåvor][nim-offerings].

NVIDIAs provvillkor begränsar API:t till test och utvärdering, medger
användning av in- och utdata för produktförbättring och begränsar
personuppgifter och konfidentiellt innehåll. Det fria API:t är därför
ingen fri produktionslösning för hushållsuppgifter. Detta är en
villkorsbegränsning, inte en fullständig avtalsgranskning.
[Provtjänstvillkor][nvidia-terms].

## Erfarenheter och evidensens gränser

- **Egen erfarenhet, 2024-07:** en NeMo-användare beskriver att en
  politisk fråga passerar och att flödet gör tre modellanrop. Användaren
  bekräftar senare att ändrad konfiguration minskar till ett anrop,
  medan ett annat försök avvisar även tillåtna frågor. Det visar
  konfigurationens betydelse, inte dagens felandel eller ett fel i den
  nuvarande Topic Control-modellen. [Diskussion med kod][nemo-community].
- **Egen erfarenhet, 2024-04:** en utvecklare av en intern supportbot
  beskriver allmänna svar i stället för domänsvar och ungefär 30 till
  80 sekunders väntan efter integration. Detta är en äldre
  LangChain-integration med specifik konfiguration, inte en generell
  NeMo-fördröjning. [Egen felrapport][nemo-stream-community].
- **Utvecklarförslag, 2025-01:** en Semantic Router-användare beskriver
  behovet av samtalshistorik och föreslår omskrivning eller två
  vektorbedömningar. Det är inte ett uppmätt resultat. Den nu granskade
  v1-koden tar fortfarande en sträng per bedömning; integrationen
  behöver avgöra hur sammanhanget representeras.
  [Diskussion][router-history], [aktuell kod][router-base].

Det finns inga verifierade felandelar för svenska, blandade kartbegäranden
eller upprepade kringgåenden i detta underlag. NeMo anger uttryckligen
att träffsäkerhet och fördröjning beror på konfigurationen och måste
mätas separat. En semantisk likhetsmatchning bevisar exempelvis inte
att varje del av ”lägg till bilen och skriv en dikt” är tillåten.
Det senare är en slutsats från metodens vägval, inte ett körresultat.
[Utvärderingsvillkor][nemo-faq], [vägval][router-base].

## Före synlig text och hörbart tal

Skyttels Responses-väg strömmar inte: hela svaret finns på servern innan
det visas. Alla jämförda textkontroller har därför en möjlig
integrationspunkt där. Enbart ingångskontroll bedömer inte vad modellen
sedan säger. [Modellanrop][text], [svarshantering][text-flow].

Vid strömning är inställningen avgörande. NeMo dokumenterar buffring och
`stream_first: False` för kontroll före utlämning. Bedrock dokumenterar
synkron buffring; asynkront läge kan lämna ut innehåll innan kontrollen
är klar. Det är kontroller av respektive textflöde, inte stöd för
Skyttels direkta Live-ljud. [NeMo][nemo-faq], [Bedrock][aws-stream].

GPT Live skickar i befintlig kod ljud direkt till webbläsarens spelare.
Varken ett bibliotek runt Responses, Bedrocks text-API eller en
klassificerare som får transkript blir därmed en spärr före detta ljud.
En sådan garanti kräver att leveranspunkten kan hålla tillbaka ljudet
och koppla det till ett kontrollresultat; den lösningen återstår att
besluta och prova. Realtime-stöd ska inte överföras till Live.
[Uppspelning][voice], [tidigare leverantörsundersökning][provider-report].

## Kandidater och frågor för senare design

Egen Responses-kontroll, NeMo Topic Control och lokal semantisk routing
är kandidater för ett avgränsat jämförelseprov. Bedrock är en jämförelse
för hanterade förbudsfilter, med otillräckligt uttryck för hela uppdraget
som dokumenterad begränsning. Ingen kandidat väljs här.

1. Vilken kontext krävs för ”vad betyder det?” efter en försäkring,
   och hur återställs bedömningen vid ett verkligt ämnesbyte?
2. Hur ska blandade begäranden hanteras: kartdel, orelaterad del och
   dynamisk förklaring? Vilka felaktiga avvisningar respektive
   genomsläppta svar kan accepteras?
3. Hur skiljs citerad kartinformation från instruktioner, även vid
   rollspel, upprepade omformuleringar och gradvisa ämnesbyten?
4. Vilken kontrollpunkt kan hålla tillbaka allt hörbart Live-ljud,
   även utan delegering, vid sena beslut och vid avbrott?
5. Hur hanteras okänt klassificeringsresultat, tjänstefel och ett
   avvisningsförsök som självt lämnar uppdraget?
6. Vilket alternativ ger acceptabel väntan och extrakostnad för
   svenska samtal? Mät fel åt båda håll, antal kontrollanrop,
   token/tecken, samt tid till första godkända text respektive ljud.
7. Vilka uppgifter behöver lämna Skyttel, och är ytterligare
   leverantör, provvillkor och lokal drift acceptabla?

[structured]: https://developers.openai.com/api/docs/guides/structured-outputs
[moderation]: https://developers.openai.com/api/docs/guides/moderation
[openai-prices]: https://developers.openai.com/api/docs/pricing
[text]: https://github.com/viscalyx/skyttel/blob/3e54da7f0de727ca1679d48a070cf1b7644746ae/src/server/text-assistant-model.ts
[text-flow]: https://github.com/viscalyx/skyttel/blob/3e54da7f0de727ca1679d48a070cf1b7644746ae/src/server/text-assistant.ts#L1454-L1583
[voice]: https://github.com/viscalyx/skyttel/blob/3e54da7f0de727ca1679d48a070cf1b7644746ae/src/client/voice-transport.ts#L170-L204
[provider-report]: https://github.com/viscalyx/skyttel/blob/c4198420d060db9d89187fb1a13b61ea965bc7dd/docs/research/household-map-assistant-scope-controls.md
[nemo-doc]: https://github.com/NVIDIA-NeMo/Guardrails/blob/dc046e4e1db894893214ffab487c35f451f5baad/docs/configure-rails/guardrail-catalog/topic-control.mdx
[nemo-action]: https://github.com/NVIDIA-NeMo/Guardrails/blob/dc046e4e1db894893214ffab487c35f451f5baad/nemoguardrails/library/topic_safety/actions.py
[nemo-flow]: https://github.com/NVIDIA-NeMo/Guardrails/blob/dc046e4e1db894893214ffab487c35f451f5baad/nemoguardrails/library/topic_safety/flows.v1.co
[nemo-license]: https://github.com/NVIDIA-NeMo/Guardrails/blob/dc046e4e1db894893214ffab487c35f451f5baad/LICENSE.md
[nemo-faq]: https://docs.nvidia.com/nemo/guardrails/v0.24.1/resources/runtime-security-faq
[nim-license]: https://docs.nvidia.com/nim/llama-3-1-nemoguard-8b-topiccontrol/latest/index.html
[nim-start]: https://docs.nvidia.com/nim/llama-3-1-nemoguard-8b-topiccontrol/latest/getting-started.html
[nim-price]: https://docs.api.nvidia.com/nim/docs/product
[nim-offerings]: https://docs.nvidia.com/nim/large-language-models/latest/about-nim-llm/nim-offerings.html
[nvidia-trial]: https://build.nvidia.com/nvidia/llama-3_1-nemoguard-8b-topic-control
[nvidia-terms]: https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf
[nemo-community]: https://github.com/NVIDIA-NeMo/Guardrails/issues/633
[nemo-stream-community]: https://github.com/NVIDIA-NeMo/Guardrails/issues/473
[router-index]: https://github.com/aurelio-labs/semantic-router/blob/1fa1937e390fe57fb85ee3bbb8b3db593a4145db/semantic_router/routers/indexed.py
[router-base]: https://github.com/aurelio-labs/semantic-router/blob/1fa1937e390fe57fb85ee3bbb8b3db593a4145db/semantic_router/routers/base.py
[router-cal]: https://github.com/aurelio-labs/semantic-router/blob/1fa1937e390fe57fb85ee3bbb8b3db593a4145db/docs/user-guide/features/calibration.md
[router-license]: https://github.com/aurelio-labs/semantic-router/blob/1fa1937e390fe57fb85ee3bbb8b3db593a4145db/LICENSE
[router-encoders]: https://github.com/aurelio-labs/semantic-router/blob/1fa1937e390fe57fb85ee3bbb8b3db593a4145db/semantic_router/encoders/__init__.py
[router-history]: https://github.com/aurelio-labs/semantic-router/issues/494
[aws-topics]: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-denied-topics.html
[aws-api]: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-independent-api.html
[aws-price]: https://aws.amazon.com/bedrock/pricing/
[aws-stream]: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-streaming.html

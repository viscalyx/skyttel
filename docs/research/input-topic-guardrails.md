# Ämneskontroll av användarens begäran

Underlag för dem som ska välja hur Skyttel avgränsar samtalet till
hushållets karta. Källorna är kontrollerade 2026-11-02. Omfattningen är
användarens begäran och den kontext som behövs för att förstå den.
Assistentens svar granskas inte. Inga debiterbara anrop, installationer
eller produktionsändringar ingår.

**Ja, Decisions eller en särskild ämnesklassificerare kan kontrollera
indata utan ett extra generellt Responses-anrop.** Kontrollen kräver
fortfarande beräkning och, för molnalternativen, ytterligare anrop.
Dokumentationen belägger ingen automatisk spärr i Live som inväntar
godkänd indata före allt tal. Det är en annan fråga än vilken
klassificerare som ger ett snabbt och billigt beslut.
[Decisions API][decision-api], [Live-referensen][live-api].

## Var röst och text kan kontrolleras

I granskad Skyttelkod samlar röstvägen användarens transkript och skickar
det som `text` till samma `messages`-hantering som textläget. Där finns
en möjlig gemensam serverkontroll före ordinarie modellarbete och
kartåtgärder. Röstvägen samlar även sena fragment och rättelser innan
överlämningen; kontroll av ett tidigare fragment får därför inte gälla
en senare, ändrad begäran. [Röstinsamling][voice-work],
[överlämning][voice-request], [gemensam hantering][text-work].

Live tar samtidigt emot ljud och skickar eget ljud direkt till
webbläsaren. Instruktionen att delegera kartarbete och invänta servern
är modellstyrning. En kontroll i `messages` stoppar därför inte i sig
Lives direkta svar utan delegering. Detta följer av kodvägarna,
inte av ett nytt röstprov. [Session][voice-session],
[instruktioner][voice-instructions], [uppspelning][playback].

## Decisions och Lives inbyggda stöd

Decisions är allmänt tillgängligt med `gpt-6-luna`. Ett
`POST /v1/decisions` kan bedöma flera frågor över samma underlag och
returnera fasta val eller sannolikheter. Samtalsmeddelanden och
verktygsresultat kan ge kontext; ljud stöds inte som indata. Frågan kan
exempelvis skilja kartarbete, orelaterat, blandat och oklart. Dessa
kategorier är ett möjligt upplägg, inte validerade regler för Skyttel.
[Guide][decisions], [API][decision-api].

Priset är **0,10 USD per miljon indatatoken utan cache**, utan avgift för
utdatatoken. Ett exempel med 1 000 debiterade indatatoken kostar
0,0001 USD per kontroll, eller 0,10 USD för 1 000 kontroller, före
tillämpliga tillägg. Instruktioner och kontext måste räknas med.
Cache kan sänka kostnaden, men korta kontroller ska inte förutsättas få
cacheträff. OpenAI beskriver cirka tio gånger snabbare svar än Responses;
det är ingen utfästelse om millisekunder i Skyttel. [Guide][decisions].

Live erbjuder två inbyggda vägar:

- `delegation.type: "decisions"` låter Live anropa Decisions direkt
  med samtalets transkript. Appen läser resultatet och verkställer
  tillåtna åtgärder. Det ersätter ägaren av delegeringen; det läggs inte
  samtidigt ovanpå nuvarande `type: "client"`.
- En `session.input_transcript.delta`-trigger kan köras oberoende av
  klientdelegeringen. Den ger löpande signaler under talet. Deltan kan
  slås ihop och resultat komma i annan ordning. En trigger är därför
  inte likvärdig med ett slutligt godkännande av en hel begäran.

[Röstintegrationen][decisions-voice], [sessionsfält][live-api].

**Ingen av vägarna dokumenteras som obligatorisk väntespärr.**
`acknowledgement_delay_ms` för Decisions har standardvärdet 400 ms,
men referensen säger uttryckligen att modellen kan tala före denna
fördröjning. Transkripttriggers kör oberoende av delegation. Ett
`decision.completed`-resultat måste alltså kopplas till en kontrollpunkt
som applikationen faktiskt upprätthåller. [Live-referensen][live-api].

En server kan invänta kontrollen innan den anropar kartverktyg, även om
klienten manipuleras. För tal anger OpenAI att sideband ensamt inte styr
uppspelning; klient eller medieled behöver kunna hålla tillbaka ljud.
Klientens egen ljudavstängning upprätthåller ingen gräns mot en
manipulerad klient. Slutsatsen är att en sådan garanti behöver en
betrodd kontroll av ljudvägen, eller en arkitektur där godkänd indata
föregår svarsgenerering. Detta kräver design och prov; det innebär inte
att assistentens utdata ska klassificeras. [Serverstyrning][server-controls].

## Relevanta alternativ

Tabellen avser en kontroll av en färdig begäran, utöver ordinarie
svarsgenerering. Löpande transkriptbedömning kan ge flera kontroller.
Ingen kandidat har uppmätta ämneskontrolltider för Skyttel i underlaget.

<!-- markdownlint-disable MD013 -->
| Alternativ | Anrop, kostnad och drift | Uppdrag, kontext och svenska |
| --- | --- | --- |
| Decisions | Ett specialiserat API-anrop; OpenAI får valt underlag. Ingen lokal modelllicens eller ny leverantör krävs. Pris ovan; ingen kostnadsfri kontrollkvot beläggs. | Instruktionsstyrda frågor och strukturerad kontext. Sannolikheter behöver kalibreras på egna exempel. Svensk ämneskvalitet är inte verifierad. [Guide][decisions]. |
| Amazon Bedrock Guardrails, denied topics | Ett `ApplyGuardrail` med `source: INPUT`, utan Bedrock-modellanrop. AWS blir ytterligare datamottagare. Hanterad tjänst: 0,15 USD per 1 000 textenheter för ämnesfiltret; upp till 1 000 tecken per enhet, avrundat uppåt. 1 000 kontroller med högst 1 000 tecken kostar 0,15 USD enbart för detta filter. [API][aws-api], [pris][aws-price]. | Standard tier anger svenska som optimerat och stött. Högst 30 förbjudna ämnen; negativa definitioner som ”allt utom kartarbete” ska inte användas. Därför uttrycker filtret inte ensamt hela Skyttels positiva uppdrag. Appen måste skicka relevant textkontext. [Språk][aws-languages], [ämnesregler][aws-topics]. |
| NVIDIA Llama 3.1 NemoGuard 8B Topic Control | En särskild modellinferens med instruktion och samtal. Egen drift kan hålla underlaget lokalt men kräver modellserver och beräkningsresurser; NIM-exemplet använder NVIDIA GPU. Modellvillkor: NVIDIA Community och Llama 3.1. Moln-API tillför NVIDIA som mottagare. Något fast produktionspris per kontroll beläggs inte. [Modellkort][topic-model], [drift][topic-start]. | Modellen bedömer senaste användarmeddelandet med samtalskontext som `on-topic` eller `off-topic`. Uppdraget kan definieras positivt. Flerspråkig basmodell är inte belägg för svensk ämneskvalitet. Binärt svar saknar ett eget blandat eller oklart utfall. [Modellkort][topic-model]. |
<!-- markdownlint-enable MD013 -->

NVIDIAs prov-API tillåter inte produktionsanvändning. NIM och NIM
Certified Feature Branch anges som avgiftsfria enligt tillämpliga
licenser; Certified Production Branch kräver abonnemang. Vilken utgåva
som gäller för vald Topic Control-container behöver klarläggas.
Avgiftsfri programvara betyder inte avgiftsfri GPU, drift eller
modellkörning. [Provvillkor][nvidia-trial], [utgåvor][nim-offerings].

Ett lättare lokalt jämförelsespår är semantisk routing mot märkta
exempel, exempelvis Semantic Router med lokal vektormodell och index.
Det kräver en lokal beräkning per begäran, utan externt kontrollanrop;
bibliotekets MIT-licens är skild från modellens licens. Kodens ingång
är en textsträng, så appen måste representera sammanhanget. Ett bästa
likhetsval bevisar inte att alla delar av en blandad begäran är tillåtna.
[Index][router-index], [lokala modeller][router-encoders],
[vägval][router-base], [licens][router-license].

## Vad underlaget räcker till och vad som behöver provas

Den befintliga Decisions-piloten från 2026-10-10 visar medianen cirka
126 ms över 45 klassificeringsanrop. Fallen gäller sambandsriktning,
sparavsikt och uppdragsval, med en omgång och syntetiskt märkta exempel.
Det är varken ett aktuellt mått för svensk ämneskontroll eller hela
röstflödets väntan. Resultaten visar även klassificeringsfel; ett typat
svar garanterar inte rätt beslut. [Resultat och begränsningar][pilot].

För Bedrock, NVIDIA och lokalt vägval saknas jämförbara uppmätta
tider här. Nätverk, kontextlängd, samtidighet och lokal hårdvara behöver
ingå i jämförelsen. Ingen tjänst ska antas sakna fördröjning.

Ett senare avgränsat prov behöver besvara följande:

1. Bedöms svenska kartbegäranden, rättelser och följdsvar rätt?
   Skilj exempelvis ”vad betyder det?” efter en kartförklaring från ett
   nytt ämne. Pröva blandningen ”lägg till bilen och skriv en dikt”,
   citerade instruktioner och upprepade försök att byta uppdrag.
2. Vilken kontext behövs, och vilka falska godkännanden respektive
   avvisningar uppstår? Kalibrera osäkerhetsgränser på annat underlag
   än slutprovet. Ofullständiga transkript och tjänstefel behöver ett
   uttryckligt utfall; de får inte råka bli godkännanden.
3. Kan kontrollresultatet bindas till exakt begäran och version, även
   vid sena deltan, ändrade instruktioner, avbrott och manipulerad klient?
   Verifiera kartåtgärder och vad användaren faktiskt hör separat.
4. Hur påverkas median, p95, antal anrop, kostnad och tid till första
   svar? Jämför en färdig begäran med löpande triggers. Pilotens och
   leverantörens hastighetstal ersätter inte detta prov.

Klassificeraren kan lämna ett beslut till den ordinarie svarsvägen, som
formulerar en dynamisk avvisning eller hanterar den tillåtna kartdelen.
Ingen extra generell modell behöver anropas för själva granskningen.
Ett avvisat anrop blir däremot inte helt modellfritt om dess avvisning
ska formuleras dynamiskt. Decisions väljer utfall; appen bestämmer vad
som sedan körs. [API][decision-api]. Designen behöver välja detta flöde
och dess accepterade felrisk; rapporten fastställer ingen tröskel eller
produktintegration.

[decisions]: https://developers.openai.com/api/docs/guides/decisions
[decision-api]: https://developers.openai.com/api/reference/resources/decisions/methods/create
[live-api]: https://developers.openai.com/api/reference/resources/live/methods/create
[decisions-voice]: https://developers.openai.com/api/docs/guides/decisions-voice
[server-controls]: https://developers.openai.com/api/docs/guides/voice-server-controls?api=live
[voice-work]: https://github.com/viscalyx/skyttel/blob/9ebdd2a069154a5918eb87b7794c603781b9e85f/src/server/voice-work.ts#L510-L545
[voice-request]: https://github.com/viscalyx/skyttel/blob/9ebdd2a069154a5918eb87b7794c603781b9e85f/src/server/voice-work.ts#L329-L344
[text-work]: https://github.com/viscalyx/skyttel/blob/9ebdd2a069154a5918eb87b7794c603781b9e85f/src/server/text-assistant.ts#L2189-L2215
[voice-session]: https://github.com/viscalyx/skyttel/blob/9ebdd2a069154a5918eb87b7794c603781b9e85f/src/server/voice-assistant.ts#L540-L568
[voice-instructions]: https://github.com/viscalyx/skyttel/blob/9ebdd2a069154a5918eb87b7794c603781b9e85f/src/server/assistant-instructions.ts#L244-L266
[playback]: https://github.com/viscalyx/skyttel/blob/9ebdd2a069154a5918eb87b7794c603781b9e85f/src/client/voice-transport.ts#L173-L207
[aws-api]: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-independent-api.html
[aws-price]: https://aws.amazon.com/bedrock/pricing/
[aws-languages]: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-supported-languages.html
[aws-topics]: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-denied-topics.html
[topic-model]: https://build.nvidia.com/nvidia/llama-3_1-nemoguard-8b-topic-control/modelcard
[topic-start]: https://docs.nvidia.com/nim/llama-3-1-nemoguard-8b-topiccontrol/latest/getting-started.html
[nvidia-trial]: https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf
[nim-offerings]: https://docs.nvidia.com/nim/large-language-models/latest/about-nim-llm/nim-offerings.html
[router-index]: https://github.com/aurelio-labs/semantic-router/blob/1fa1937e390fe57fb85ee3bbb8b3db593a4145db/semantic_router/routers/indexed.py
[router-encoders]: https://github.com/aurelio-labs/semantic-router/blob/1fa1937e390fe57fb85ee3bbb8b3db593a4145db/semantic_router/encoders/__init__.py
[router-base]: https://github.com/aurelio-labs/semantic-router/blob/1fa1937e390fe57fb85ee3bbb8b3db593a4145db/semantic_router/routers/base.py
[router-license]: https://github.com/aurelio-labs/semantic-router/blob/1fa1937e390fe57fb85ee3bbb8b3db593a4145db/LICENSE
[pilot]: https://github.com/viscalyx/skyttel/blob/ed0f78b2667f55420ef5ef3569dbbcb11ceef43e/scripts/decision-prototype/results/classifiers.json

# Varför taluppdraget inte når textassistenten

Underlag för
[Ta reda på varför talet tystnar när textassistenten klarar samma uppdrag](https://github.com/viscalyx/skyttel/issues/167)
i kartan
[Skyttel – väg till fungerande tal och standardiserad modellutvärdering](https://github.com/viscalyx/skyttel/issues/166).
Kontrolldatum: 2026-10-09. Underlaget hjälper de kommande besluten om
scenarier och talreparation. Det innehåller ingen reparation.

## Fastställt fel och avgränsning

Båda talproven når GPT-Live, transkriberas och delegeras till klienten.
Det sista transkriptionsfragmentet slutar 200 ms efter delegeringens
tidsgräns. `voiceWork` kräver att samtliga väntande fragment slutar senast
vid gränsen. Villkoret fallerar och hela uppdraget avvisas innan
textassistenten, Terra eller MCP anropas.

Total tystnad från rösten återskapas inte. Båda proven ger ett neutralt
mellanbesked och ett generiskt förtydligande, men ingen riktad fråga om
sambandstyp, ingen ändring och inget felbesked från Skyttel.
Det fastställda felet är den uteblivna överlämningen. Det är inte bevis
för att samma fel ensamt förklarar all tystnad i produktion.

## Startkarta och yttranden

Varje prov använder en ny lokal installation med riktig SQLite och tre
sparade tjänster: Microsoft 365, Tenant Norrsken Bygg och Molnlagring
Plus 2 TB. Sambandstypen Ingår i har riktningarna ”ingår i” och
”omfattar”. Inga samband eller osparade förslag finns från början.
Alla hushållsuppgifter och samband är påhittade.

Utan sambandstyp:

> Jag vill relatera tjänsten Microsoft 365 och tjänsten Tenant Norrsken Bygg.

Med sambandstyp och riktning:

> Jag vill relatera tjänsten Microsoft 365 och tjänsten Tenant Norrsken
> Bygg med sambandstypen Ingår i. Microsoft 365 ingår i Tenant Norrsken
> Bygg. Spara inte.

## Observerade utfall

<!-- markdownlint-disable MD013 -->
| Prov | Utfall |
| --- | --- |
| Text utan sambandstyp | Modellen antar Ingår i och riktningen Microsoft 365 till Tenant Norrsken Bygg. Ett osparat samband och beskedet ”Utkastet är uppdaterat.”, ingen följdfråga. |
| Text med sambandstyp | Det beställda sambandet finns i utkastet. Beskedet ”Utkastet är uppdaterat.”. |
| Tal utan sambandstyp | Delegeringen avvisas. Ingen backendkörning eller ändring. Rösten säger ett mellanbesked och frågar generiskt vad som ska relateras. |
| Tal med sambandstyp | Delegeringen avvisas. Ingen backendkörning eller ändring. Rösten ger ett mellanbesked och ber generiskt om ett nytt tydligt uppdrag. |
<!-- markdownlint-enable MD013 -->

Alla fyra proven har noll nya sparanden utöver startkartans separata
förberedande sparande. Talproven lämnar både karta och utkast oförändrade.

En tidigare textkörning utan sambandstyp ger i stället en fråga om
sambandets riktning. Dess väntkontroll är felaktig och den räknas inte som
en godkänd utvärderingskörning. Modellens faktiska frågeanrop är ändå
underlag för variationen mellan att fråga och att anta. Scenariokatalogen
behöver bestämma det korrekta beteendet; dessa utfall är ingen norm.

## Var överlämningen stannar

| Talprov | Delegeringens gräns | Sista fragmentets slut | Överlapp |
| --- | ---: | ---: | ---: |
| Utan sambandstyp | 7 000 ms | 7 200 ms | 200 ms |
| Med sambandstyp | 15 600 ms | 15 800 ms | 200 ms |

Det sista fragmentet finns redan hos servern när delegeringen behandlas.
Detta är alltså inte ett prov där transkriptionen kommer först efter
delegeringen. Den överskrider däremot gränsen i sina tidsuppgifter.

[voice-work.ts](https://github.com/viscalyx/skyttel/blob/f0c19ff65b296c2bbda366860d755f4f755b4900/src/server/voice-work.ts#L305)
gör då följande:

1. `pending.every(item => item.endMs <= event.offset_ms)` blir falskt.
2. `text` blir tom trots att de transkriberade orden finns i `pending`.
3. `pending` och dess versionsankare behålls. `execute` anropas inte.
4. Servern skickar ”Be om ett nytt tydligt uppdrag. En paus eller tidigare
   repliker är inget nytt sparbesked.” som kommentar till GPT-Live.
5. Ingen kanonisk `response` eller väntande backendfråga registreras.

Återspelning av de insamlade transkriptions- och delegeringshändelserna
genom den oförändrade `voiceWork` ger noll `messages`-anrop i båda fallen.
I ett separat kontrollprov flyttas enbart delegeringens gräns till sista
fragmentets slut. Då gör båda proven exakt ett `messages`-anrop med hela
den transkriberade texten. Kontrollprovet använder en syntetisk backend,
gör inga API-anrop och är ingen föreslagen reparation.

## Uteslutna och kvarstående orsaker

- WebRTC är anslutet i båda talproven. Både skickade ljudpaket och
  mottagen ljudenergi är större än noll. Ljudet når GPT-Live och ljud
  kommer tillbaka till webbläsaren.
- GPT-Live skickar en verklig delegering med `target: client` i båda
  fallen. Orsaken i dessa prov är inte utebliven delegering.
- Textvägen hittar tjänsterna och kan skapa sambandet med samma MCP,
  typdefinitioner och SQLite. Namnen eller sambandsverktyget är alltså
  inte ett allmänt hinder för motsvarande textuppdrag.
- Taligenkänningen är felaktig på det påhittade namnet: ett r i Norrsken
  faller bort och Bygg får ett extra e. ”Spara inte” blir ”bara inte” i det
  längre provet. Dessa fel behöver egna scenariokrav. De orsakar inte det
  observerade tidsvillkorets avvisning; inga ord når backend i dessa prov.
- Saknad överlämning behandlas inte som ett fel i gränssnittet.
  Backendens `questionPending` är falskt och röstens `response` saknas.
- Fullständig akustisk begriplighet och det exakta produktionsutfallet
  är inte verifierade. Mottagen energi och transkription ersätter inte
  mänsklig lyssning.

## Berörda delar och sannolik omfattning

- `src/server/voice-work.ts`: transkriptionsbuffert, tidsvillkor,
  avvisningsbesked och starten av backenduppdraget.
- `src/server/voice-assistant.ts`: verklig Live-anslutning, sidokanal och
  överlämning till samma textassistent som textläget använder.
- `src/client/voice-transport.ts`: ljudtransport och transkriptionshändelser.
- `src/client/use-voice.ts`: status och kontroll av röstens kanoniska svar.
- `src/server/assistant-instructions.ts`: det önskade delegeringsbeteendet.

Tidsvillkoret gäller alla talade kartuppdrag, inte bara samband. Ett
slutfragment som överlappar delegeringsgränsen kan därför påverka
ändringar, rättelser, sparanden, kartfrågor och svar på följdfrågor.
Två prov visar mekanismen, inte hur ofta den uppstår.

Väntgränsen på 120 sekunder i `execute` hjälper inte före överlämningen.
Serverns anslutningskontroll kontrollerar webbläsarens regelbundna
statusanrop, inte om ett transkriberat yttrande har fått ett svar.
En utebliven delegering eller återgivning är ytterligare en möjlig
mekanism för tystnad, men visas inte av dessa två prov.

## Provmetod och reproduktion

Programkoden motsvarar incheckningen
`f0c19ff65b296c2bbda366860d755f4f755b4900`.
Bygget utgår från `ad7e53f2075a43291970ff68753ff982275c515d`;
skillnaderna fram till provets incheckning gäller bara agentinstruktioner.
Node.js är 24.21.0, Playwright 1.64.0, Chromium 156.0.8078.4 och
OpenAI SDK 7.30.1. Backendmodellen är `gpt-5.6-terra`, resonemang `low`;
talmodellen är `gpt-live-1`, rösten `marin`.

Talet skapas lokalt med `piper-tts` 1.8.0, `onnxruntime` 1.31.0 och
`sv_SE-nst-medium`, med båda brusparametrarna satta till noll.
Det är en syntetisk röst. Korta 16-bitars PCM WAV-klipp, 22 050 Hz mono,
finns som underlag:

- [Yttrande utan sambandstyp](voice-silence-diagnosis/missing-clip.wav)
- [Yttrande med sambandstyp](voice-silence-diagnosis/named-clip.wav)
- [Ljudmanifest och kontrollsummor](voice-silence-diagnosis/audio.json)

Röstmodellen hämtas från `rhasspy/piper-voices` vid incheckningen
`c10ece1aade47bb51c153c893d14e5bf8e5b7117` och har SHA-256
`df011f56825a59dd1efc080c38a65a1ef70407e60f63050e9246f43a3d7e471e`.

Chromiums vanliga testmikrofon och filmikrofon ger `NotSupportedError`
i denna miljö, även utan fil och med både 22 050 och 48 000 Hz.
Skyttel visar då ett begripligt fel om att webbläsaren saknar röststöd.
Detta är ett separat lokalt hinder, inte den rapporterade tystnaden.

De verkliga talproven använder därför Web Audio-metoden från
[Hur skapas reproducerbart syntetiskt svenskt tal för talscenarierna?](https://github.com/viscalyx/skyttel/issues/169#issuecomment-5919470652).
Testet ersätter `getUserMedia` med en ström från
`MediaStreamAudioDestinationNode`, spelar klippet när anslutningen är
klar och använder annars den riktiga kodvägen. Ingen transkription,
delegering, SDP eller leverantörsreplik injiceras i dessa prov.

För upprepning: använd `tests/support/installation.ts` för en separat
installation, syntetisk inloggning och den beskrivna startkartan.
Öppna samtalet via `tests/support/conversation-page.ts`. Observera den
riktiga sidokanalens fragment och gränser, backendens anrop, hela utkastet,
historiken och RTP-statistik före stängning. Spara endast sammanfattningen.

API-nyckeln laddas uttryckligen från `.env.local` och skrivs aldrig ut.
Bygge, verkliga prov och lokal återspelning körs genom repositoryts
`npm run build` respektive `npm run test:env` och dess gemensamma lås.
Den ordinarie familjesviten TAL-01 körs inte med ett annat yttrande än
det den är skriven för. Produktionskoden ändras inte.

## Kostnad och begränsningar

Samtliga försök, även brister i provskriptets väntkontroller och en för
konservativ första kostnadsvakt, ingår i kostnadsredovisningen.
27 Responses-anrop ger uppskattningsvis 0,1952193 USD. De två Live-proven
rapporterar slutlig användning på 15 respektive 18 sekunder, ungefär
0,0275 USD. Totalt ungefär 0,2227193 USD, avrundat 0,23 USD.
Det är en uppskattning från leverantörens användningsuppgifter, ingen
faktura. Med anslutningarnas hela väggtid i stället för rapporterade
Live-sekunder blir uppskattningen ungefär 0,29 USD.

Priserna kontrolleras mot
[GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
och
[GPT-Live 1](https://developers.openai.com/api/docs/models/gpt-live-1).
Beräkningen tar med cachad indata och skrivning till cache separat.

Kostnadsvakten reserverar före varje modellbegäran med serialiserade
UTF-8-byte som övre tokengräns och högre priser än prislistan samt ett
tak på 2 000 utdatatokens. Taket inkluderar resonemang. Ingen redovisad
modellrespons är ofullständig. Modellreserven, inklusive tidigare försök,
är högst 0,80 USD. Högst två Live-anslutningar stängs efter senast
100 sekunder vardera. Den sammanlagda reserven är under 1 USD.

Rådata och lokala provskript stannar utanför det incheckade underlaget.
Den förenklade
[sammanfattningen](voice-silence-diagnosis/summary.json)
innehåller observerade gränser, kartutfall och ljudmått, inte råa
API-responser. Detta är felsökning av två yttranden och ingen första
baslinjekörning eller modellrekommendation.

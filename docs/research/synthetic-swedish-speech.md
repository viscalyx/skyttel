# Syntetiskt svenskt tal för talscenarierna

<!-- cspell:ignore hundrati -->

Underlag för
[#169](https://github.com/viscalyx/skyttel/issues/169) i kartan
[#166](https://github.com/viscalyx/skyttel/issues/166). Kontrollerat
2026-09-30. Inga betalda API-anrop gjordes.

## Fråga

Hur skapas syntetiskt svenskt tal som ger samma ljud vid varje körning,
kan checkas in i ett publikt repository och spelas av Chromium som falsk
mikrofon? Hur hanteras tystnad före och efter yttrandet och
flerstegsdialoger, när TAL-01 i dag spelar en enda WAV-fil med 35 sekunders
inledande tystnad?

## Kort svar

Generera talet lokalt med Piper (`piper-tts` 1.8.0) och rösten
`sv_SE-nst-medium`, med `noise_scale` och `noise_w` satta till `0`. Då ger
samma text, röst och programversion på samma plattform en bitidentisk
16-bitars PCM WAV-fil (22 050 Hz, mono). Checka in de korta talklippen
tillsammans med text, röst, inställningar, versioner och SHA-256. Den
incheckade filen är referensen. En ny generering är en ny version av
scenariot, inte en reproduktion.

Lägg tystnaden i testkoden, inte i de incheckade klippen. Ett enstegsscenario
kan fortsätta använda Chromiums filbaserade falska mikrofon. Filen måste
då sluta med tystnad, eftersom Chromium fortsätter leverera den sista
ljudbufferten när en fil med `%noloop` har spelats klart. Flerstegsdialoger
bör i stället styras från testet genom att klipp spelas in i en
Web Audio-ström när gränssnittet visar att Skyttel lyssnar.

OpenAI:s talsyntes är ett rimligt reservalternativ om Pipers kvalitet inte
räcker. Kunden äger utdata och kostnaden är försumbar, men API:et saknar
seed-parameter, och OpenAI:s användningspolicy kräver att lyssnare
upplyses om att rösten är AI-genererad.

## Jämförelse

| Verktyg | Svenska | Licens | Kostnad | Samma fil |
| --- | --- | --- | --- | --- |
| Piper `nst` | Bra | CC0-data, MIT | Ingen | Ja, brus 0 |
| Piper `alma` | Bra | CC BY 4.0 | Ingen | Ja, brus 0 |
| Piper `lisa` | Bra | Oklar | Ingen | Ja, brus 0 |
| eSpeak NG `sv` | Maskinmässig | Fri | Ingen | Ja |
| `gpt-4o-mini-tts` | Ej prövad | Kunden äger | Låg | Ej säkert |
| `tts-1`, `tts-1-hd` | Ej prövad | Kunden äger | Låg | Ej säkert |
| MMS-TTS `swe` | Ej prövad | CC BY-NC 4.0 | Ingen | Ej prövad |
| Coqui XTTS-v2 | Saknas | CPML | – | – |

`gpt-4o-mini-tts` och `tts-1` är OpenAI:s modeller och MMS-TTS är Metas.
Piper och eSpeak NG skriver 16-bitars PCM WAV som Chromium kan spela.
OpenAI levererar `wav` direkt. Licensen avser det genererade ljudet.
”Bra” och ”Maskinmässig” bygger på en lokal automatisk kontroll, inte på
mänsklig lyssning. Se [Begriplighet](#begriplighet).

## Lokala prov

Proven kördes i devcontainern (Ubuntu 24.04, aarch64, Python 3.12) i en
virtuell Python-miljö utanför repositoryt:

- `piper-tts` 1.8.0 med `onnxruntime` 1.30.0.
- Röster från `rhasspy/piper-voices` vid incheckningen
  `c10ece1aade47bb51c153c893d14e5bf8e5b7117`.
- eSpeak NG 1.51 ur Ubuntus paket, uppackat lokalt utan installation.
- `faster-whisper` med modellen `small` som automatisk hörkontroll.
- Chromium 153.0.8010.12 från Playwright 1.63.0.

Provmeningen var TAL-01:s yttrande: ”Behåll Lo-förslaget, rätta priset för
Familjens Molnmusik till 189 kronor per månad och spara hela utkastet.”

### Samma text ger samma fil

Varje röst syntetiserades två gånger med standardinställningar och två
gånger med `--noise-scale 0 --noise-w 0`.

- Med standardinställningarna (`noise_scale` 0,667 och `noise_w` 0,8 från
  röstens `.onnx.json`) skilde sig SHA-256 mellan körningarna för alla tre
  Piper-röster.
- Med brus 0 var filerna bitidentiska för alla tre röster.
- eSpeak NG gav bitidentiska filer med standardinställningarna.

Förklaringen finns i Pipers modellkod: VITS-modellen drar slumpbrus med
`torch.randn` och `torch.randn_like`, skalat med `noise_scale` och
`noise_w`, och bruset exporteras in i ONNX-modellen
([`models.py`](https://github.com/OHF-Voice/piper1-gpl/blob/efffbfb226bfb511ebbcf55d0cecd8b35a89743d/src/piper/train/vits/models.py#L111)).
Det finns ingen seed att sätta vid inferens. Brus 0 tar bort slumpen.

Bitidentiteten är prövad på samma maskin och med samma versioner. Olika
processorarkitekturer eller versioner av `onnxruntime` kan ge små
flyttalsskillnader. Därför ska den incheckade filen vara referensen, och
generatorn ska låsa versioner och kontrollera SHA-256 i stället för att
testet genererar ljudet vid varje körning.

### Begriplighet

Ingen mänsklig lyssning gjordes. Som en grov automatisk kontroll
transkriberades varje fil lokalt med Whisper `small` och språket svenska:

- Alla tre Piper-röster: meningen känns igen nästan ord för ord. Samtliga
  gav ”målmusik” i stället för ”Molnmusik” och ”loförslaget” för
  ”Lo-förslaget”. Talet `189` uppfattades som ”etthundraåttionio”.
- eSpeak NG: ”Molnmusik” uppfattades rätt, men början blev ”Håll upp
  förslaget” och priset blev ”ett hundrati ny kronor”.
- Brus 0 försämrade inte transkriptionen märkbart. Lisa med brus 0 gav den
  mest korrekta transkriptionen av priset.

Talscenarierna bör därför föredra vanliga ord och låta namn och belopp
provas särskilt. En människa bör lyssna på varje klipp innan det checkas
in. Om Skyttels egen taligenkänning misslyckas på ett klipp som Whisper
förstår, är det ett fynd om talmodellen, inte om klippet.

## Verktygen

### Piper

- Det ursprungliga `rhasspy/piper` (MIT) är arkiverat. Utvecklingen
  fortsätter i `OHF-Voice/piper1-gpl` under GPL-3.0; senaste utgåva
  v1.8.0 publicerades 2026-09-04
  ([GitHub](https://github.com/OHF-Voice/piper1-gpl)).
- Installation: `pip install piper-tts` i en virtuell miljö. Paketet
  innehåller den eSpeak NG-fonemisering som behövs; något systempaket
  krävs inte ([CLI](https://github.com/OHF-Voice/piper1-gpl/blob/efffbfb226bfb511ebbcf55d0cecd8b35a89743d/docs/CLI.md),
  [Python-API](https://github.com/OHF-Voice/piper1-gpl/blob/efffbfb226bfb511ebbcf55d0cecd8b35a89743d/docs/API_PYTHON.md)).
- Tre svenska röster, alla `medium` och 22 050 Hz. Utdata är 16-bitars PCM
  WAV i mono.
- Rösternas licenser står i varje `MODEL_CARD`, och Piper-projektet
  uppmanar användaren att läsa dem
  ([VOICES.md](https://github.com/OHF-Voice/piper1-gpl/blob/efffbfb226bfb511ebbcf55d0cecd8b35a89743d/docs/VOICES.md)):
  - `nst`: tränad från grunden av KBLab vid Kungliga biblioteket på
    NST-data från Språkbanken vid Nationalbiblioteket i Norge. Datamängden
    anges som CC0; repositoryt med rösterna har licensen MIT
    ([modellkort](https://huggingface.co/rhasspy/piper-voices/blob/c10ece1aade47bb51c153c893d14e5bf8e5b7117/sv/sv_SE/nst/medium/MODEL_CARD),
    [Språkbanken](https://www.nb.no/sprakbanken/en/resource-catalogue/page/37/)).
  - `alma`: vikterna anges som CC BY 4.0 och kräver alltså
    tillskrivning. Modellkortet hänvisar till samma NST-data men uppger en
    annan licens än `nst`
    ([modellkort](https://huggingface.co/rhasspy/piper-voices/blob/c10ece1aade47bb51c153c893d14e5bf8e5b7117/sv/sv_SE/alma/medium/MODEL_CARD)).
  - `lisa`: finjusterad från en norsk röst utan angiven licens
    ([modellkort](https://huggingface.co/rhasspy/piper-voices/blob/c10ece1aade47bb51c153c893d14e5bf8e5b7117/sv/sv_SE/lisa/medium/MODEL_CARD)).
    Undvik den tills licensen är klarlagd.
- Programmets GPL gäller i allmänhet inte det ljud som programmet
  skapar av användarens text
  ([GNU:s GPL-FAQ](https://www.gnu.org/licenses/gpl-faq.html#WhatCaseIsOutputGPL)).
  Det som avgör är röstens licens.
- `--sentence-silence` lägger tystnad efter varje mening utom den sista.
  Det räcker inte för inledande eller avslutande tystnad.

### eSpeak NG

- GPL-3.0, aktivt underhållen
  ([GitHub](https://github.com/espeak-ng/espeak-ng)). Finns som paket i
  Ubuntu 24.04 (1.51).
- `espeak-ng -v sv -w fil.wav "text"` ger 16-bitars PCM WAV, 22 050 Hz,
  mono. Utdata var bitidentisk mellan körningar.
- Formantsyntes: begriplig men tydligt maskinmässig. Den fungerar som
  stresstest, men dåligt som mått på hur en talmodell hanterar naturligt
  tal. MBROLA-rösterna `mb-sw1` och `mb-sw2` har egna licensvillkor och
  prövades inte.

### OpenAI:s talsyntes

Enligt
[guiden för talsyntes](https://developers.openai.com/api/docs/guides/text-to-speech)
och
[API-referensen](https://developers.openai.com/api/reference/resources/audio/subresources/speech/methods/create):

- Modeller: `gpt-4o-mini-tts` (ögonblicksbilder `gpt-4o-mini-tts-2025-03-20`
  och `gpt-4o-mini-tts-2025-12-15`), `tts-1` och `tts-1-hd`
  ([modellsida](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts)).
- 13 inbyggda röster; `marin` eller `cedar` rekommenderas för bäst
  kvalitet. Skyttels röstläge använder redan `marin` som utdataröst.
- Svenska finns i listan över språk, men ”Voices are currently optimized
  for English.”
- `response_format` kan vara `wav` eller `pcm`. `pcm` är rå 24 kHz 16-bitars
  signerad little-endian utan huvud och behöver ett WAV-huvud. Chromium
  läser en WAV-fil även om storleksfälten i huvudet är fel, eftersom den
  läser högst så mycket data som finns kvar
  ([`wav_audio_handler.cc`](https://chromium.googlesource.com/chromium/src/+/9a197e807021f5763e386a7321194925565c172e/media/audio/wav_audio_handler.cc)).
- Parametrarna är `model`, `input` (högst 4 096 tecken), `voice`,
  `instructions`, `response_format`, `speed` och `stream_format`. Det finns
  ingen seed. Ingen upprepning prövades, eftersom det kräver betalda anrop.
  Samma fil vid varje generering kan därför inte förutsättas.
- Pris: `gpt-4o-mini-tts` kostar 0,60 USD per miljon texttoken och 12 USD
  per miljon ljudtoken; `tts-1` 15 USD och `tts-1-hd` 30 USD per miljon
  tecken ([prissida](https://developers.openai.com/api/docs/pricing)).
  TAL-01:s mening på omkring 110 tecken kostar knappt 0,002 USD med
  `tts-1`. Även några dussin klipp ryms med marginal inom kartans
  kostnadsram.
- Villkor: enligt
  [OpenAI Services Agreement](https://cdn.openai.com/osa/openai-services-agreement.pdf)
  (version ONLINE v.010126, avsnitt 4.1) äger kunden all utdata. Avsnitt
  4.4 påpekar att utdata inte behöver vara unik. Enligt guiden kräver
  OpenAI:s användningspolicy att lyssnare tydligt upplyses om att rösten
  är AI-genererad. En mening i ljudkatalogens beskrivning bör räcka för
  ett repository; det är en tolkning, inte något villkoren anger.

### Andra alternativ

- Meta MMS-TTS `facebook/mms-tts-swe` har licensen CC BY-NC 4.0
  ([Hugging Face](https://huggingface.co/facebook/mms-tts-swe)).
  Icke-kommersiell licens passar dåligt i ett publikt repository utan
  uttalat syfte.
- Coqui XTTS-v2 har 17 språk utan svenska och en egen icke-kommersiell
  licens för modellen ([Hugging Face](https://huggingface.co/coqui/XTTS-v2)).

## Chromium som falsk mikrofon

Fakta ur Chromiums källkod (`main` vid
`9a197e807021f5763e386a7321194925565c172e`) och egna prov med Chromium
153:

- `--use-file-for-fake-audio-capture=<fil>` spelar filen i slinga;
  `<fil>%noloop` spelar den en gång. Flaggan gäller hela webbläsaren och
  måste kombineras med `--use-fake-device-for-media-stream`
  ([`media_switches.cc`](https://chromium.googlesource.com/chromium/src/+/9a197e807021f5763e386a7321194925565c172e/media/base/media_switches.cc),
  [`fake_audio_input_stream.cc`](https://chromium.googlesource.com/chromium/src/+/9a197e807021f5763e386a7321194925565c172e/media/audio/fake_audio_input_stream.cc)).
- Godkända WAV-format är PCM med 8, 16 eller 32 bitar och flyttal med 32
  eller 64 bitar. Filen konverteras till Chromiums ljudparametrar, så
  22 050 Hz och 24 kHz fungerar. En 24-bitars PCM-fil gav bara tystnad,
  utan felmeddelande på sidan.
- Varje ny ljudström skapar en ny filkälla som läser filen från början.
  I provet började ljudet 2,07 sekunder efter `getUserMedia` i en fil med 2
  sekunders inledande tystnad. Efter att spåren stoppats och
  `getUserMedia` anropats igen spelades filen åter från början.
- Med `%noloop` returnerar filkällan inga nya ramar när filen är slut,
  men strömmen levererar fortsatt den senast fyllda bufferten
  ([`simple_sources.cc`](https://chromium.googlesource.com/chromium/src/+/9a197e807021f5763e386a7321194925565c172e/media/audio/simple_sources.cc)).
  I provet hördes en ton som slutade abrupt i minst 3,5 sekunder efter
  filens slut. Filen måste därför sluta med tystnad.
- Chromium varnar för att ljudbehandlingen i WebRTC kan förvränga
  filljudet. Skyttel anropar `getUserMedia({ audio: true })` med
  webbläsarens standardbehandling, så nivån ändrades under provet. Det är
  samma väg som en riktig mikrofon och bör behållas i TAL-01.

## Tystnad före och efter yttrandet

Skyttel öppnar mikrofonen innan röstanslutningen är klar och aktiverar
spåret först när anslutningen är upprättad
([`voice-transport.ts`](https://github.com/viscalyx/skyttel/blob/a6a4eca966e626a937851e32d81db9ef8bf4e0e9/src/client/voice-transport.ts)).
Filen spelas i realtid från att mikrofonen öppnas, även medan spåret är
avstängt. Därför behövs TAL-01:s inledande tystnad, och 35 sekunder
täcker klientens startgräns på 30 sekunder.

- Checka in klippen med högst en kort, fast marginal, till exempel 0,3
  sekunder, före och efter talet. Det håller filerna små: 16-bitars mono i
  22 050 Hz är ungefär 43 kB per sekund, och 35 sekunders tystnad skulle
  ensam vara omkring 1,5 MB.
- Låt testet sätta ihop den WAV-fil som Chromium spelar: inledande
  tystnad, klippet och avslutande tystnad, som nollsampel i samma format.
  Det är deterministiskt och går att kontrollera med SHA-256.
- Avslutande tystnad behövs av två skäl: leverantörens turdetektering
  väntar på tystnad innan turen avslutas, och Chromium upprepar annars den
  sista bufferten. Skyttel anger ingen egen turdetektering, och OpenAI:s
  dokumentation anger inte standardvärdena
  ([VAD-guiden](https://developers.openai.com/api/docs/guides/realtime-vad)).
  Behåll TAL-01:s fem sekunder.
- Den inledande tystnaden är en väntetid, inte en synkronisering. Ett
  alternativ som bara gäller enstegsscenarier är att låta filen vara lång
  och tyst och i stället starta talet från testet, se nästa avsnitt.

## Flerstegsdialoger

Chromiums filkälla är en enda tidslinje per ljudström, och Skyttel håller
mikrofonen öppen hela röstsamtalet. Alternativen:

1. **En sammanfogad fil med fasta pauser.** Enkel och deterministisk som
   ljud, men tiden mellan turerna beror på modellens svarstid. För korta
   pauser gör att nästa tur avbryter svaret; långa pauser gör körningen
   långsam. Passar bara om avbrott är det som ska provas.
2. **En fil per tur med ny ljudström.** Filen läses om när en ny ström
   öppnas, men sökvägen är fast för hela webbläsaren och Skyttel öppnar
   inte mikrofonen per tur. Kräver att filen byts på disk mellan turerna.
   Rekommenderas inte.
3. **Klipp som testet spelar in i en Web Audio-ström.** Ett skript som
   Playwright lägger in före sidan (`addInitScript`) ersätter
   `navigator.mediaDevices.getUserMedia` med en ström från en
   `MediaStreamAudioDestinationNode`. Testet spelar nästa klipp när
   gränssnittet visar att Skyttel lyssnar eller att svaret är klart.
   Ingen inledande tystnad behövs, och turordningen följer samtalet.
   Nackdelen är att webbläsarens ljudbehandling för mikrofonen inte
   används. Det byter fortfarande bara ut mikrofonen, men på ett högre
   lager än i dag.

Rekommendation: behåll filvägen för TAL-01 och andra enstegsscenarier,
eftersom den ligger närmast en riktig mikrofon. Använd alternativ 3 för
flerstegsdialoger och låt samma incheckade klipp användas av båda vägarna.
Spara i resultathistoriken vilken väg ett talscenario använde.

## Förslag till arbetsflöde

1. Skriv scenariots yttranden i en manifestfil med id, text, röst och
   Piper-inställningar.
2. Ett generatorskript, som körs manuellt i en virtuell miljö med låsta
   versioner av `piper-tts` och `onnxruntime`, laddar ner rösten vid en
   fast incheckning i `rhasspy/piper-voices`, kontrollerar modellens
   SHA-256 och skriver 16-bitars PCM WAV med `noise_scale` och `noise_w`
   satta till `0`.
3. Manifestet får filens SHA-256, längd, programversioner och
   röstmodellens SHA-256. En människa lyssnar, och en lokal
   transkribering sparas som stöd.
4. Klippen checkas in. Testet kontrollerar SHA-256 och sätter ihop
   tystnad och klipp vid körning. Ljudet genereras aldrig i testet.
5. Ljudkatalogens beskrivning anger att rösterna är syntetiska, att
   innehållet är påhittat och vilken licens varje röst har.

## Öppna frågor

- Om en röst räcker eller om scenarierna ska provas med flera röster,
  till exempel `nst` och `alma`, för att undvika att en talmodell bara
  klarar en röst. `alma` kräver tillskrivning.
- Hur mycket Web Audio-vägen påverkar taligenkänningen jämfört med
  filvägen. Det kan mätas med samma klipp i båda vägarna.
- Om OpenAI:s talsyntes behövs. Det avgörs först om Piper-klippen visar
  sig för svåra eller för lätta för talmodellerna.

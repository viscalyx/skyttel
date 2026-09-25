# Talprov på svenska

Engångsprototyp för beslutet
[Vilken talväg klarar det godkända samtalsflödet på svenska?](https://github.com/viscalyx/skyttel/issues/14).
Syftet är att prova samtal, rättelser och synliga utkast. Prototypen
fastställer ingen produktarkitektur. Använd påhittade hushållsuppgifter.

## Starta

Installera provets tillfälliga beroende separat:

```sh
python3 -m pip install --target /private/tmp/skyttel-voice-deps \
  websockets==17.1
```

Starta sedan från ursprungsrepositoryt. Dess arbetsmiljö har
API-nyckeln; worktree-katalogen har ingen egen direnv-miljö:

<!-- markdownlint-disable MD013 -->

```sh
cd /Users/johlju/source/skyttel
python3 /private/tmp/skyttel-prototype-swedish-voice/prototypes/swedish-voice/server.py --port 8765
```

<!-- markdownlint-enable MD013 -->

Öppna [talprovet](http://localhost:8765). Ett verkligt talprov kräver
mikrofontillstånd och en OpenAI-projektnyckel med modellåtkomst.
Nyckeln hör hemma i serverns miljö, aldrig i webbläsarens kod,
skärmbilder, Git eller ärendekommentarer.

Koden ligger i en separat worktree. Kördata ligger i
`/private/tmp/skyttel-swedish-voice-runtime`, utanför checkouten.
Där finns budgetboken `PROTOTYPE-budget.json` och kartfunktionernas
syntetiska kartfil i underkatalogen `mcp`.

Behåll budgetboken mellan körningar så att provets sammanlagda
kostnad och osäkra reservationer finns kvar. Att starta om servern
eller nollställa kartan ger ingen ny kostnadsbudget. Starta endast
en serverprocess mot denna runtime; filen har inget lås som
samordnar budgeten mellan flera processer.

`PROTOTYPE-last-failure.json` bevarar senaste felorsak och kontrollerade
sparutfall över omstart. Det är lokal kördata och ska inte publiceras.
Efter ett lyckat sparande formuleras beskedet direkt från ett verifierat
kvitto och lyder bara **”Sparat.”** En ny fråga om vad som sparades läser
senaste sparade ändringsgrupp från historiken. Storleksgränsen för
modellanrop kan därför inte avvisa ett extra
anrop som bara behövs för att säga att sparandet är klart.

Även förslag, återställningar och ångring får korta besked, till exempel
”Utkastet är uppdaterat.” och ”Återställt.” Kartan visar detaljerna;
människan kan be om uppläsning av förslag, kartuppgifter eller senaste
sparandet. Nödvändiga följdfrågor och konkreta felbesked finns kvar.

Historik läses i sidor genom taladaptern. `read_history` med `limit=1`
hämtar bara senaste sparandet, exempelvis inför ångring. Äldre grupper
kan läsas med `next_before_map_version` som nästa `before_map_version`.
Utan `limit` visas fem grupper; `has_more` visar om fler finns. Varje
grupps fullständiga ändringslista och all lagrad historik finns kvar.

”Markera … i kartan” väljer och centrerar en verifierad post i kartvyn.
Klienten skickar beskedet ”Markerad.” först när markeringen tillämpas.
Detta är lokal visning och ändrar eller sparar inga kartuppgifter.

## Kandidaten

### Kortare väntan med kombinerat avslut

Provservern använder `--completion-mode combined` som standard. Modellen
kan lämna hela sitt färdiga ändringsuppdrag till `submit_changes` i ett
anrop. Servern utför förslag, kontrollerar resultatet och avslutar med
osparat besked eller ett verifierat sparbesked. Riktade frågor får följa
ett delvis färdigt utkast; de hindrar fortfarande sparande.

`--completion-mode standard` behåller separata modellomgångar för
förslag, resultatrapport och sparande. Båda använder den valda modellen
och samma kartfunktioner. Vanliga verktyg finns kvar i det kombinerade läget
när uppdraget behöver mellanliggande läsningar eller återställning.

Under **Senaste tidsdiagnostik** visas tider för klientens mottagna
texthändelser samt tid, tokens och verktygsnamn per modellanrop. Det
mäter inte hörbara ljudpauser. Inga ljudinspelningar tillkommer.

Se [jämförelsen av avslutsflöden](../../docs/prototypes/swedish-voice-completion-comparison.md)
för metod, resultat, budgetstopp och kvarvarande mänskligt röstprov.
Det isolerade kontrollflödet körs från prototypens worktree:

```sh
python3 prototypes/swedish-voice/compare_completion.py --dry-run
```

Med `--comparison transport` jämför samma kontrollflöde MCP och direkt
kartåtkomst, med kombinerat avslut i båda. Lägenas ordning växlar mellan
två omgångar. Varje läge får åtta dialogsteg på genererade kartor. Tiden
`reply_ms` slutar när backend svarar, före skriptets extra kontrolläsning;
`elapsed_ms` behåller även den kontrolltiden för jämförelse med äldre prov.

En betald körning kräver `--ledger-runtime` med den befintliga provbudgeten
och en stoppad provserver. Den får högst 1,50 USD inom samma 10-USD-ram.
Skriptet skapar nya genererade kartor; det läser ingen befintlig provkarta.

### Jämföra MCP och direktanrop

Kryssrutan **Använd MCP** växlar kartåtkomst mellan samtalen:

- Markerad: samma lokala MCP-process och stdio-protokoll som tidigare.
- Avmarkerad: direkt Python-anrop till samma kartfunktioner och lagring.

GPT-5.6 Terra med låg nivå är standardmodell. Talmodell, instruktioner, verktyg,
sparregler, karta och utkast är desamma i båda lägena. Modellens
funktionsanrop finns kvar; försöket isolerar den lokala MCP-transporten.
Bytet sparar inga ändringar och raderar ingen provdata.

Avsluta samtalet och invänta klart kartarbete innan du byter.
Kryssrutan är spärrad under samtal, arbete och okänt sparutfall.
Serveromstart väljer MCP igen; `--transport direct` väljer direktläge
vid start. En vanlig omladdning av sidan behåller serverns aktuella läge.

Under kryssrutan visas senaste färdiga kartuppdraget per läge: total tid,
modellens tid och antal anrop, kartarbete och kö. Detta är backendens tid,
inte tiden från avslutat tal till hörbart svar. Kartarbete omfattar också
resultatkontroll och filåtkomst, så hela värdet är inte MCP-kostnad.

Det isolerade, kostnadsfria provet körs från prototypens worktree:

```sh
python3 prototypes/swedish-voice/compare_transports.py
```

Det använder nya genererade kartor, inga modellanrop och ingen gemensam
budgetbok. Se [transportjämförelsen](../../docs/prototypes/swedish-voice-transport-comparison.md)
för metod och mätresultat. Manuella röstprov använder den vanliga budgeten.

### Välja kartmodell och resonemangsnivå

Under **Experiment** finns val för GPT-5 Mini, GPT-5.6 Luna, Terra,
Sol och GPT-6 Astra samt resonemangsnivåerna **Låg** och **Hög**.
Standard är **GPT-5.6 Terra · Låg**. Talmodellen är fortfarande
`gpt-live-1`; modellvalet styr kartarbetet bakom rösten.

Byt mellan samtalen, efter att kartarbetet och eventuellt sparande är
klart. Servern avvisar byte medan ett samtal startar eller pågår,
kartarbete väntar eller körs eller ett sparkvitto saknas. Valet ändrar
inte kartan och gör inget betalt anrop. Nästa kartuppdrag använder
den valda modellens pris, reservation och resonemangsnivå.

Sidan läser alternativen och aktuellt val från `model_settings` i
`/api/state`. `POST /api/model` tar `model` och `reasoning_effort`.
Svaret har ett versionsnummer för att äldre svar inte ska återställa
ett nytt val. Omladdning behåller serverns val; omstart använder
Terra låg eller uttryckliga `--backend-model` och `--reasoning-effort`.
Valet lagras inte i webbläsaren.

### Jämföra backendmodeller

`compare_models.py` använder helt nygenererade kartor och besked i separata
MCP-processer. Ett tydligt uppdrag och ett uppdrag med två följdfrågor
körs två gånger per modell, med omvänd modellordning andra gången.
Det verifierar hela förväntade utkastet, bevarade äldre förslag,
oförändrad sparad karta och frågornas avgränsning.

Kör först `python3 prototypes/swedish-voice/compare_models.py --dry-run`
i prototypens worktree. Det använder simulerade modellsvar, inget API
och ingen gemensam kostnadsbok. Tiderna där är inga modellresultat.

Avsluta talsamtalet och stoppa provservern före en betald jämförelse.
Kör följande från katalogen där projektets API-nyckel finns i miljön:

<!-- markdownlint-disable MD013 -->

```sh
python3 /private/tmp/skyttel-prototype-swedish-voice/prototypes/swedish-voice/compare_models.py --ledger-runtime /private/tmp/skyttel-swedish-voice-runtime
```

<!-- markdownlint-enable MD013 -->

Jämförelsen får högst 2 USD inom den befintliga ramen på 10 USD. Nästa
anrops hela reservation måste rymmas. Oklar slutkostnad stoppar körningen.
Resultatkatalogen skrivs ut vid avslut; misslyckade försök ingår i både
sammanfattning och spårning. Starta provservern igen när körningen är klar.

### Jämföra Luna, Terra, Sol och Astra

`compare_model_family.py` använder samma genererade uppdrag som
jämförelsen av kombinerat avslut. Luna, Terra och Sol kör med `low`;
Astra kör både `low` och `high`. Varje inställning får åtta dialogsteg,
MCP, kombinerat avslut, `service_tier=default` och högst 4096
utdatatokens. Ordningen roterar och vänds mellan två omgångar.

```sh
python3 prototypes/swedish-voice/compare_model_family.py --dry-run \
  --output /private/tmp/skyttel-family-new-dry
python3 prototypes/swedish-voice/compare_model_family.py \
  --ledger-runtime /private/tmp/skyttel-swedish-voice-runtime \
  --output /private/tmp/skyttel-family-new-paid
```

Stoppa provservern före betald körning. Katalogerna ska vara nya.
Jämförelsen använder högst 5 USD och aldrig mer än budgetbokens
återstående utrymme. En delram höjer inte det gemensamma budgettaket.
Beställarens tillstånd krävs för mer budget; bevara tidigare poster.

Hela kartan, bevarade tidigare förslag, riktade frågor, sparkvitto,
antal sparanden och obeställda sparförsök kontrolleras. Misslyckade
steg ingår i resultatet. `results.json` innehåller råa API-underlag,
svar och tider; `summary.json` visar kvalitet, svarstid, tokenförbrukning,
konservativ kostnad och kostnadsuppskattning med cacherabatt.
Mikrofon, taligenkänning, uppläsning, kartmarkering och ångring ingår
inte i denna mätserie.

Priserna i `backend_models.py` följer respektive modells standardpris:
[Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna),
[Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra),
[Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol) och
[Astra](https://developers.openai.com/api/docs/models/gpt-6-astra).
`--reasoning-effort low` är serverns standard. `high` kan väljas för
en jämförelse utan att ändra verktyg eller sparregler.

### Tal och kartarbete

- **Tal:** `gpt-live-1`, rösten `marin`, instruktioner på svenska och
  WebRTC mellan webbläsaren och OpenAI.
- **Tolkning och verktyg:** `gpt-5.6-terra` som standard via egna
  Responses-anrop med resonemangsnivån `low`. Den lokala adaptern utför
  tillåtna kartoperationer. `--backend-model gpt-5-mini-2025-08-07`
  väljer Mini för jämförelse med samma verktyg och resonemangsnivå.
- **Delegering:** `client`. Applikationen väljer samtalskontext och
  budgeterar varje backendanrop innan det skickas.

GPT-Live kan lyssna och tala samtidigt. Verktyg och längre resonemang
hanteras av en separat backend. Valet av client-delegering ger
applikationen kontroll över anrop, rättelser och resultat som skickas
tillbaka till rösten. Detta är ett skäl att prova kandidaten; det är
inte ett uppmätt kvalitetsresultat.
[OpenAI: GPT-Live](https://developers.openai.com/api/docs/models/gpt-live-1),
[OpenAI: delegering](https://developers.openai.com/api/docs/guides/live-delegation).

GPT-5 Mini stöder funktionsanrop, strukturerade svar och MCP genom
Responses API. Modellens fasta ögonblicksversion gör provet lättare
att upprepa. En lokal MCP-adapter håller verktygsutförandet i den
egna processen; talmodellen behöver ingen publik MCP-adress.
[OpenAI: GPT-5 Mini](https://developers.openai.com/api/docs/models/gpt-5-mini).

## Verkligt och simulerat

Vid ett verkligt talprov behandlar OpenAI mikrofonljudet. GPT-Live
producerar tal och transkript. Backendmodellen behandlar transkript
och den syntetiska kartkontext som applikationen skickar.

Hushåll, personer, tjänster och tjänstekonton i provet är syntetiska.
Kartoperationerna använder en verklig lokal MCP-process eller samma
funktioner direkt, beroende på kryssrutan. Ett sparkvitto gäller den
gemensamma kastbara kartfilen i båda lägena. Det bevisar
inte att produktens lagring, behörigheter, historik eller
återanslutning är färdiga.

Skriftlig inmatning och lokala kontrollflöden kan användas för att
kontrollera adaptern. De är inte ett prov av svensk talförståelse,
röstkvalitet eller avbrott under uppspelning. Ett godkänt talbeslut
kräver att en människa faktiskt talar med och bedömer kandidaten.

## API-kontrakt för prototypen

Servern skapar WebRTC-sessionen med JSON till
`POST https://api.openai.com/v1/live/sessions`:

```json
{
  "session": {
    "model": "gpt-live-1",
    "audio": { "output": { "voice": "marin" } },
    "instructions": "Tala svenska. Delegera kartändringar till backend.",
    "delegation": { "type": "client" },
    "store": false
  },
  "transport": { "type": "webrtc", "sdp": "<webbläsarens SDP>" }
}
```

Detta är ett minimalt konfigurationsexempel. Den fulla prompten i
`server.py` beskriver följdfrågor, rättelser och vilka uppgifter
backend kan utföra. `audio.format` utelämnas eftersom WebRTC förhandlar
ljudformat. Svarets `transport.sdp` används som WebRTC-svar. Vänta
på `session.started` före kommandon; skicka inte `session.start`
igen på datakanalen.
[OpenAI: WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc?api=live).

Transkript kommer i fragment:

```json
{
  "type": "session.input_transcript.delta",
  "event_id": "example_transcript",
  "delta": "Kim betalar",
  "start_ms": 1000,
  "end_ms": 1800
}
```

Samma fält finns för `session.output_transcript.delta`. Bevara
fragmenten exakt, inklusive mellanslag. Tidsstämplarna tillhör
sessionens tidslinje. Fragment har inget definitivt turavslut;
leveranspauser är inte bevis på att användaren talat färdigt.
[OpenAI: transkript](https://developers.openai.com/api/docs/guides/live-conversations#transcript-deltas).

Delegering kommer separat:

```json
{
  "type": "session.delegation.created",
  "event_id": "example_delegation",
  "offset_ms": 1800,
  "delegation": {
    "id": "item_example",
    "type": "delegation",
    "target": "client"
  }
}
```

Eventet innehåller ingen uppgiftstext. Backend behöver ackumulerade
transkript och aktuell applikationsstatus för att tolka exempelvis
”ja” eller ”nej, Kim betalar”. Returnera en kort verifierad uppgift:

```json
{
  "type": "session.commentary.append",
  "event_id": "example_result",
  "delegation_id": "item_example",
  "content": "Utkastet visar nu Kim som betalare. Det är inte sparat."
}
```

Använd det verkliga delegerings-ID:t oförändrat. Dessa appends tillåter
högst 500 tokens. Backendresultat behöver vara aktuella för samma
utkastversion när de återförs.
[OpenAI: client-delegering](https://developers.openai.com/api/docs/guides/live-delegation?delegation-mode=client#receive-a-client-delegation).

### Aktuellt mänskligt besked

Prototypen håller en aktiv användarpost med eget ID. Inkommande fragment
fogas till den även när talassistenten svarar eller backend arbetar.
Assistentens mellanbesked avslutar inte användarens text. Posten avslutas
när backend har behandlat den aktuella revisionen; det är en lokal
bearbetningsgräns, inte en mätning av när människan slutade tala.
Skriftlig inmatning börjar alltid en ny post.

Den synliga dialogen har separata rader. Kort paus fortsätter samma rad;
minst två sekunders paus tillsammans med mellanliggande tal från Skyttel
ger en ny användarrad. Den visuella indelningen delar inte upp backendens
aktiva besked eller återanvänder sparbesked. Arbetsstatus ligger kvar
längst ned i samtalspanelen, utanför transkriptets scrollområde.

Backend får aktuell post separat och samtalshistoriken som skilda
användar- och assistentmeddelanden. Assistentens efterföljande mellanbesked
ingår inte i det aktuella uppdraget. Flera Live-delegeringar för samma
post och revision återanvänder ett resultat, med svar till varje
ursprungligt delegerings-ID.

Ett kvitterat sparbesked förbrukas. En sen fortsättning i samma post
behandlas för sig och ärver inte tillstånd att spara. Utan ett jakande
sparuttryck exponeras inte `save_draft` för modellen. Ordträffen är bara
en första kontroll; modellen måste även skilja en verklig begäran från
en hypotetisk fråga. Versions- och kvittokontrollerna gäller i båda lägena.

## Avbrott och rättelser

Återställning av föreslagna borttagningar, kontroll av resultattexter och
svenska relationsord beskrivs i
[provets beteendekontrakt](../../docs/prototypes/swedish-voice.md).

Röstprompten ber modellen att lyssna när användaren avbryter.
Talavbrott avbryter inte automatiskt backendarbete. En rättelse
behöver därför ändra den lokala uppgiften och hindra sena resultat
från att återställa det äldre utkastet. En kvittens på kontextinjektion
bevisar varken att användaren hör svaret eller att något sparas.
[OpenAI: röstprompt](https://developers.openai.com/api/docs/guides/live-prompting),
[OpenAI: serverkontroll](https://developers.openai.com/api/docs/guides/voice-server-controls?api=live).

## Kostnad och avslut

Kontrolldatum för priser och API-kontrakt: 2026-09-15.

- GPT-Live: **0,05 USD per minut**, debiterat per sekund.
- GPT-5 Mini: **0,25 USD per miljon indatatokens**,
  **0,025 USD per miljon cachelagrade indatatokens** och
  **2 USD per miljon utdatatokens**.
- GPT-5.6 Sol: **4 USD per miljon indatatokens**, **0,40 USD per miljon
  cachelagrade indatatokens** och **20 USD per miljon utdatatokens**.
  Skrivning till cache kostar 1,25 gånger ordinarie indatapris.

Rösttiden omfattar tystnad och väntan på backend. Skapandet av en
WebRTC-session debiterar 15 sekunder som räknas av mot sessionens
senare tid; lägg inte till 15 sekunder en gång till. Backendkostnad
tillkommer separat.
[OpenAI: röstkostnader](https://developers.openai.com/api/docs/guides/voice-latency-cost?api=live),
[OpenAI: backendpris](https://developers.openai.com/api/docs/models/gpt-5-mini).
[OpenAI: Sol-pris](https://developers.openai.com/api/docs/models/gpt-5.6-sol).

### Lokal kostnadsvakt

Servern bokför en provram som normalt är 10 USD. Budgetbokens
`limit_usd` anger det aktuella taket. Ändra det endast efter uttrycklig
budget från beställaren, med servern stoppad; bevara alla kostnadsposter.
Ogiltiga tak avvisas. Följande kontroller gäller:

- **0,30 USD reserveras före varje Live-start.** Det motsvarar fem
  minuters prov plus en minuts avslutsmarginal till 0,05 USD per minut.
  Marginalen ger ingen extra aktiv samtalstid och är ingen hård gräns
  hos OpenAI.
- **Reservation per backendanrop:** Mini 0,077 USD, Luna 0,021 USD,
  Terra 0,21 USD, Sol 0,40 USD och Astra 1,00 USD.
  JSON-underlaget får vara högst 60 000 byte och svaret högst 4096 utdatatokens.
  Backend kör högst åtta modellsteg per delegerad uppgift.
- En ny Live-start kräver att minst 0,50 USD dessutom återstår till
  backend. Bakgrundsanrop får använda detta utrymme; samma marginal
  krävs inte igen. Alla reservationer räknas mot provets aktuella tak.
  API-anrop har ingen automatisk omkörning.
- En separat servertråd skickar `session.close` efter fem minuter.
  Kumulativ användning på minst fem minuter begär också avslut.
  Stoppet är oberoende av webbläsarens timer. Om serverprocessen
  avslutas kan den inte längre bevaka eller stoppa sessionen.
- Serverns autentiserade sideband läser slutligt
  `session.closed.usage.seconds`. Först detta besked kan ersätta
  röstreservationen med `max(15, seconds) × 0,05 / 60` USD.
  Webbläsarens uppgift om avslut frigör aldrig reservationen.
- Backendkostnad beräknas från rapporterade indata- och utdatatokens.
  Alla indatatokens räknas till ordinarie pris, även cacheträffar,
  och Sols cachelagring får sitt pristillägg. Beloppet kan därför vara
  högre än leverantörens faktiska kostnad. Modelljämförelsen redovisar
  också en uppskattning med rapporterad cacherabatt.
- Saknad slutmätning behåller reservationen. När sideband-bevakningen
  rapporterar fel eller slutbeskedet saknar giltig varaktighet spärras
  nya debiterade anrop. Vid omstart återställs spärren från obekräftade
  röstreservationer i budgetboken. Minskande slutanvändning avvisas.
  Ett känt kostnadsöverdrag bokförs i sin helhet och kräver kontroll;
  även den spärren överlever omstart.

Budgetboken skiljer mellan bekräftad användning och kvarvarande
reservationer. Vid osäkert avslut ska reservationen behållas och
kostnaden kontrolleras före fortsatt betald körning, även efter en
omstart. Radera inte budgetboken för att komma förbi spärren.

Detta är en lokal konservativ provvakt, inte en verifierad hård
leverantörsgräns. Varken en tidsbegäran eller en lokal reservation
garanterar att OpenAI slutar debitera vid nätfel eller processhaveri.
Talprovets faktiska avslut och användningsrapport behöver observeras.

### Leverantörens mätning och slutbesked

`session.usage.updated.usage.seconds` är en kumulativ ögonblicksbild,
inte en ökning att summera. Skicka `{"type":"session.close"}` och
låt media och datakanal vara öppna tills `session.closed` kommer.
Dess `usage.seconds` är den slutliga rösttiden. Ett avbrott utan det
eventet ger osäker slutkostnad; frigör inte budgetreservationen på
basis av den senaste delmätningen.
[OpenAI: mätning och avslut](https://developers.openai.com/api/docs/guides/live-conversations#usage-and-graceful-close).

API-schemat anger `session.started.session.expires_at` som sessionens
sluttid i Unix-sekunder. En generell gräns på 60 minuter för GPT-Live
är inte belagd i dessa källor. Blanda inte ihop detta med Realtime
API:s dokumenterade gräns på 60 minuter. Prototypen registrerar
`expires_at`, men använder den inte för att minska reservationen
eller som bevis på en kostnadsgräns.
[OpenAI: Live-schema](https://developers.openai.com/api/reference/typescript/resources/live),
[OpenAI: Realtime-sessioner](https://developers.openai.com/api/docs/guides/realtime-conversations#session-lifecycle-events).

API-referensen listar också
`POST /v1/live/sessions/{session_id}/hangup`, men beskriver den som
avslut av SIP-samtal. För WebRTC är `session.close` på datakanalen
eller en ansluten sideband den tydligt dokumenterade vägen.
[OpenAI: hangup](https://developers.openai.com/api/reference/typescript/resources/live/subresources/sessions/methods/hangup),
[OpenAI: sideband](https://developers.openai.com/api/docs/guides/voice-server-controls?api=live).

Projektets hårda utgiftsgräns kan komplettera lokal budgetbokföring.
OpenAI anger att verkställandet kan släpa efter och tillåta en mindre
överskridning. En sådan gräns ensam garanterar därför inte att hela
provets lokalt angivna tak hålls exakt.
[OpenAI: utgiftsgränser](https://developers.openai.com/api/docs/guides/spend-limits).

## Underlag för beslut

Anteckna för varje faktiskt genomfört scenario:

1. Vilken svensk formulering som används och om transkriptet är korrekt.
2. Om personer, tjänstekonton och sambanden betalar, äger och använder
   hamnar rätt i utkastet.
3. Om följdfrågor, överlappande tal och rättelser fungerar när användaren
   avbryter rösten.
4. Om ett godkännande gäller det synliga utkastet och om kvittot stämmer
   med den lokala adapterns resultat.
5. Tid till första användbara synliga utkast respektive hörbara svar.
6. Bekräftad rösttid, backendbruk och osäkra kostnadsreservationer.

Källornas stöd för funktioner är inte ett svenskt provresultat.
Dokumentera misslyckade försök och kostnader tillsammans med lyckade
försök innan beslutsticketen får en slutsats.

# Leverantörskontroller för samtalets uppdrag

Underlag för dem som ska utforma Skyttels samtal. Kontrollerat 2026-11-02
mot kodversion `3e54da7f0de727ca1679d48a070cf1b7644746ae`, installerat
OpenAI SDK 7.43.0 och nedanstående primärkällor. Inga modell- eller
röstanrop ingår; beteende, träffsäkerhet och tidsmått är inte verifierade.

Målet är att hindra orelaterad användning av den inbyggda assistenten och
behålla fritt naturligt språk för hushållets karta, nödvändig apphjälp och
korta förklaringar i kartans sammanhang. Svar och avvisanden ska kunna
formuleras dynamiskt. En lista med godkända repliker ingår inte. Allmänna
användningskvoter och externa MCP-assistenters allmänna chatt ligger
utanför undersökningen. Rapporten väljer ingen arkitektur eller tolerans
för felklassificering.

## Faktiska gränssnitt och leveransvägar

- **Text:** `textModel` anropar `client.responses.create` utan strömning,
  med instruktioner och verktyg. Standardprofilen är `gpt-6.1-sol`.
  Servern får hela resultatet innan `output_text` läggs i samtalet.
  Behörighet och utkastversion kontrolleras även för vanliga textsvar;
  dessa kontroller bedömer inte ämnets relevans.
  [Modellanrop][text-model], [svarshantering][text-flow],
  [modellprofiler][profiles].
- **Röst:** `client.live.create` använder `gpt-live-1`, röst `marin`,
  `delegation: { type: 'client' }`, `store: false` och WebRTC.
  En `SidebandWS` ansluts till samma session. Webbläsaren kopplar
  inkommande mediespår till ett ljudelement och startar uppspelningen.
  Ljudet passerar därmed inte Skyttels server för godkännande.
  Klientens datahändelser begränsas till `session.close`; denna
  behörighetskontroll är skild från ljudets mediespår.
  [Sessionsstart][voice-start], [uppspelning][playback].
- SDK 7.43.0 stämmer med låsfilen. Live och Responses har egna typer;
  undersökningen överför inga Realtime-kontroller till Live.
  [Låst version][lock], [SDK-källans fasta version][sdk-live].

**Slutsats från kodvägarna:** text har redan en möjlig servergräns före
visning. Röst har en direkt ljudväg som en kontroll av delegerat arbete
inte täcker. Befintliga instruktioner kräver delegering av kartarbete,
men ett sådant instruktionskrav är ingen mekanisk spärr mot andra svar.
[Instruktioner][instructions], [delegerat röstarbete][voice-work].

## Text: instruktioner, klassificering och innehållskontroll

Responses stöder instruktioner och strukturerade utdata med
`text.format`, `type: 'json_schema'` och `strict: true`.
`gpt-6.1-sol` stöder Structured Outputs. Det gör en strukturerad
bedömning av begäran eller ett färdigt svar möjlig, med fri svarstext
vid sidan av ett kategoriserat beslut. Schemats kategorier behöver inte
begränsa användarens ordval eller svarens formuleringar.
Schemaföljsamhet garanterar däremot inte rätt semantisk bedömning;
säkerhetsavvisande och ofullständiga resultat måste hanteras separat.
[Structured Outputs][structured], [modellstöd][sol].

Det befintliga anropet begär inte denna klassificering. Att lägga in en
bedömning före modellens arbete respektive efter färdig svarstext är
olika möjliga kontrollpunkter. En ingångsbedömning hindrar inte ensam
ett senare ämnesavsteg. Utgångsbedömning kräver att även dynamiska
avvisanden kontrolleras före publicering. Dessa är slutsatser om
kontrollpunkter, inte val av lösning eller bevis på korrekt klassificering.
[Nuvarande anropsparametrar][text-model].

`tool_choice` styr verktygsanrop: `none`, `auto`, `required` eller ett
bestämt verktyg. Ett tvingat anrop kan kräva ett strukturerat steg, men
varken verktygsval eller schemavalidering bevisar att vanligt språk ligger
inom uppdraget. Att neka en mutation eller sakna allmänna verktyg hindrar
inte modellen från att formulera ett orelaterat faktasvar.
[Function calling][functions], [befintlig textväg][text-flow].

Moderation bedömer dokumenterade skadekategorier i text och bild, inte
Skyttels egen gräns mellan kartarbete och allmän chatt. Ljud stöds inte av
`omni-moderation-latest`. En ofarlig fråga om ett annat ämne kan därför
kräva en separat uppdragsbedömning.
[Moderation][moderation].

## Live: styrning är skild från godkännande före ljud

Live hanterar själv tal och avgör när hjälp från bakgrunden behövs.
Client delegation låter appen granska, kasta eller kombinera
bakgrundsresultat innan de skickas till Live; modellen kan fortsätta tala
under granskningen. Bakgrundens verktyg och `tool_choice` gäller först
efter delegering. `response.create` begär eller fortsätter delegerat
Responses-arbete och är ingen startknapp för allt tal.
[Delegering][delegation], [SDK:s händelsetyper][sdk-live].

Startinstruktioner kan avgränsa uppdraget och styra delegering.
`session.instructions.append` tillför nya instruktioner under samtalet;
`session.thinking.append` tillför tyst kontext och
`session.commentary.append` innehåll som modellen kan tala om.
Kvittens avser uppskattad kontextinjektion, inte färdig återgivning.
Transkriptfragment saknar markör för färdig samtalstur. Fragment är därför
inte likvärdiga med en avslutad begäran eller ett komplett svar.
[Sessionshantering][sessions].

Prompten kan uppmana modellen att sluta tala vid avbrott men ger inte
exakt kontroll över stoppögonblicket. Detta behöver provas med svenska
och vald röst, även när avbrottet ändrar begärans innebörd.
[Live-promptning][prompting].

En sideband kan observera och styra sessionen men stoppar inte
uppspelningen. `session.input_audio.mute` stoppar indata, inte modelltal.
För kontroll före hörbart innehåll beskriver OpenAI buffring i spelare
eller mediebrygga: samla ljud och transkript, granska, släpp godkända
segment och kasta övriga eller sena segment. Buffring ökar fördröjningen;
en talpaus bevisar inte att hela svaret är klart. Tillbakahållet ljud finns
kvar i modellens kontext. En korrigerande instruktion kan inte återkalla
redan hört ljud. [Serverkontroller][server-controls].

**Säkerhetsgräns, härledd från leveransvägen:** en spärr i Skyttels vanliga
webbläsarklient kan hindra dess uppspelning, men en ändrad klient kan spela
det ljud som leverantören redan skickar direkt via WebRTC. Det är därför
inte belagt att enbart klientspärr och sideband kan framtvinga serverns
godkännande före all leverans. Primär WebSocket kan bära ljud via en
betrodd server; mediebrygga är också dokumenterad. Dessa är möjliga
undersökningsspår, inte ett arkitekturval.
[Direkt uppspelning][playback], [WebSocket-transport][websockets].

## Klassificering i Live och versionsgränser

SDK 7.43.0 innehåller Decisions-integration: egna frågor av typen
`predicate`, `choice` eller `score`, manuell `decision.create` samt
`session.triggers` på inkommande eller utgående transkript. Triggers kan
köras oberoende av delegering, och resultat kan anlända i annan ordning.
Det är klassificeringssignaler för appens beslut, ingen dokumenterad
automatisk spärr för ljud. Skyttel konfigurerar inte sådana triggers i
nuvarande sessionsstart.
[SDK][sdk-live], [Decisions i röst][decisions-voice], [startkod][voice-start].

Decisions kan också bedöma en textdialog separat. Leverantören rekommenderar
märkta exempel från den egna appen för val av trösklar; sannolikheter och
`confidence` är inte bevis på tillräcklig träffsäkerhet för Skyttel.
[Decisions][decisions].

Aktuell dokumentation beskriver `acknowledgement_delay_ms` och ett tomt
`session.thinking.append` som kan stoppa väntande automatiska
mellanbesked. Det stoppar inte redan genererat ljud eller självständigt
modelltal. Fältet saknas i installerade 7.43.0:s `ClientDelegation`;
dokumenterat serverstöd får inte beskrivas som redan typat SDK-stöd.
Ingen motsvarighet till Realtime-fältet `turn_detection.create_response`
eller `response.cancel` finns i Live-typerna som granskas här.
[Aktuell dokumentation][delegation], [SDK 7.43.0][sdk-live].

## Kvar att prova och besluta

Ingen dokumenterad kontroll här bevisar perfekt ämnesklassificering.
Följande frågor behöver ett senare avgränsat praktiskt prov:

1. Mät felaktiga tillåtelser och avvisanden för fria svenska kartbegäranden,
   nödvändig apphjälp, korta förklaringar, orelaterade frågor, blandade
   begäranden, rättelser och instruktionsliknande kartdata.
2. Mät första mottagna och hörda ljud mot transkript och kontrollresultat,
   även före delegering. Prova ändrad klient, sen sideband, nätverksfel,
   utebliven kontroll, avbrott och återanslutning.
3. Visa hur segment kopplas till rätt transkript och uppdrag, hur färdig
   svarsinnebörd fastställs och hur gamla godkännanden och ljud kastas.
   Prova fortsatt dialog när modellen har sagt något användaren inte hör.
4. Jämför extra modellarbete, förbrukning och svarstid för förhandsbedömning,
   efterhandsbedömning och transkripttriggers. Buffring sparar inte redan
   utförd generering; fler kontrollanrop kan tillföra kostnad och väntan.
   Inga sådana mått eller prisuppskattningar fastställs här.

Senare design behöver avgöra var leverans får ske, vilken semantisk
felrisk som accepteras och hur dynamiska svar kan återges utan att
granskning kringgås. Den här rapporten avgränsar vad gränssnitten stöder
och vad som fortfarande saknar praktiskt belägg.

[text-model]: https://github.com/viscalyx/skyttel/blob/3e54da7f0de727ca1679d48a070cf1b7644746ae/src/server/text-assistant-model.ts
[text-flow]: https://github.com/viscalyx/skyttel/blob/3e54da7f0de727ca1679d48a070cf1b7644746ae/src/server/text-assistant.ts#L1454-L1583
[profiles]: https://github.com/viscalyx/skyttel/blob/3e54da7f0de727ca1679d48a070cf1b7644746ae/src/server/conversation-capacity.ts#L1-L12
[voice-start]: https://github.com/viscalyx/skyttel/blob/3e54da7f0de727ca1679d48a070cf1b7644746ae/src/server/voice-assistant.ts#L539-L582
[playback]: https://github.com/viscalyx/skyttel/blob/3e54da7f0de727ca1679d48a070cf1b7644746ae/src/client/voice-transport.ts#L170-L204
[lock]: https://github.com/viscalyx/skyttel/blob/3e54da7f0de727ca1679d48a070cf1b7644746ae/package-lock.json#L6343-L6346
[sdk-live]: https://github.com/openai/openai-node/blob/d02d4de77ea7a6f82325c02e6f44deb34ee3992c/src/resources/live/live.ts
[instructions]: https://github.com/viscalyx/skyttel/blob/3e54da7f0de727ca1679d48a070cf1b7644746ae/src/server/assistant-instructions.ts
[voice-work]: https://github.com/viscalyx/skyttel/blob/3e54da7f0de727ca1679d48a070cf1b7644746ae/src/server/voice-work.ts#L548-L591
[structured]: https://developers.openai.com/api/docs/guides/structured-outputs
[sol]: https://developers.openai.com/api/docs/models/gpt-6.1-sol
[functions]: https://developers.openai.com/api/docs/guides/function-calling
[moderation]: https://developers.openai.com/api/docs/guides/moderation
[delegation]: https://developers.openai.com/api/docs/guides/live-delegation
[sessions]: https://developers.openai.com/api/docs/guides/live-conversations
[prompting]: https://developers.openai.com/api/docs/guides/live-prompting
[server-controls]: https://developers.openai.com/api/docs/guides/voice-server-controls?api=live
[websockets]: https://developers.openai.com/api/docs/guides/voice-websockets?api=live
[decisions-voice]: https://developers.openai.com/api/docs/guides/decisions-voice
[decisions]: https://developers.openai.com/api/docs/guides/decisions

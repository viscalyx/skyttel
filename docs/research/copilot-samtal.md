# GitHub Copilot SDK för Skyttels samtal

**Bedömning.** Copilot kan ta över loopen mellan arbetsmodellen och verktygen
och hålla ihop modellens kontext mellan meddelanden. Låt i så fall Skyttels
textläge och OpenAI GPT-Live använda samma Copilot-session för kartarbetet.
Skyttel behöver fortfarande röstkopplingen och serverreglerna för kartan.
Vinsten i egen kod är därför mindre än vad en jämförelse av textläget ensamt
visar. Underlaget räcker för riktade prov före ett beslut om att byta.
[Copilots agentloop](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/docs/features/agent-loop.md),
[GPT-Live med klientdelegering](https://developers.openai.com/api/docs/guides/live-delegation),
[Skyttels röstkoppling](../../src/server/voice-assistant.ts#L517).

Underlaget gäller TypeScript-paketet `@microsoft/copilot-sdk` **2.0.1** och
Skyttels `main` vid `267c39dbef6972a72bad3c8509602dc561a5dab4`. Det bygger på
källkod och leverantörernas dokumentation. Vi har ännu inga mätvärden
för Copilots svarstid.
[SDK-versionen](https://github.com/microsoft/copilot-sdk/releases/tag/v2.0.1),
[Skyttels kodversion](https://github.com/viscalyx/skyttel/tree/267c39dbef6972a72bad3c8509602dc561a5dab4).

## Samma samtal i text och röst

### Så fungerar Skyttel i dag

Webbläsaren skickar och tar emot ljud direkt via WebRTC. Servern öppnar en
separat styranslutning till samma GPT-Live-session. När GPT-Live delegerar
kartarbetet använder röstkopplingen Skyttels gemensamma serverflöde. Det
flödet anropar OpenAI Responses API, kör verktyg, matar tillbaka resultat och
bygger underlag för nästa meddelande. Skyttel skickar det verifierade svaret
till rösten och håller samtalstexten och utkastet tillgängliga för textvyn.
[Ljudtransport](../../src/client/voice-transport.ts#L63),
[Röststart](../../src/server/voice-assistant.ts#L517),
[Delegerat arbete](../../src/server/voice-work.ts#L280),
[Modellanrop](../../src/server/text-assistant-model.ts#L100),
[Verktygsresultat i kontexten](../../src/server/text-assistant.ts#L3620).

### Så kan ett byte mellan text och röst fungera

1. Användaren skriver ”Ändra priset för internet till 399 kronor”. Skyttel
   kopplar sitt samtal till en Copilot-session och skickar texten dit.
   Copilot föreslår verktygsanrop. Skyttel granskar ändringen, skriver den i
   utkastet och visar utfallet. Samma utkast finns hos Skyttel när
   användaren slår på mikrofonen.
   [Copilots agentloop](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/docs/features/agent-loop.md),
   [Skyttels granskning och utkast](../../src/server/text-assistant.ts#L3082).
2. Användaren säger ”Visa vilket pris som gäller nu”. Skyttel skickar den
   godkända begäran som text till samma Copilot-session. Om Copilot
   läser utkastet via MCP ingår verktygsresultatet i dess kontext även när
   nästa fråga kommer via text. Skyttel ger GPT-Live det verifierade
   resultatet att säga och för in resultatet i samtalstexten. Om ljudet
   bryts kan användaren ändå fråga ”Vilket pris sa du?” och få svaret från
   utfallet. Läs aktuellt utkast om priset kan ha ändrats sedan dess.
   [Copilots bevarande av verktygsresultat](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/docs/features/session-persistence.md#what-gets-persisted),
   [GPT-Live återger resultat](https://developers.openai.com/api/docs/guides/live-delegation).
3. Om arbetet bryts av avbryter Skyttel både pågående modellarbete och
   uppspelning, spärrar sena skrivningar och läser utfallet från sin egen
   databas. Ett redan genomfört sparande står fast. Vid omstart kan Skyttel
   återuppta en bevarad Copilot-session med `resumeSession`. Slutförda
   verktygsresultat som Copilot redan har lagrat följer med. Behåll
   standardvalet `continuePendingWork: false` och låt Skyttel återfinna
   pågående kartarbete innan det får fortsätta.
   [Copilot `abort`](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/nodejs/src/session.ts#L3165),
   [Copilot `continuePendingWork`](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/nodejs/src/types.ts#L3032),
   [Skyttels avbrott i röstläge](../../src/server/voice-work.ts#L125),
   [Skyttels spartransaktion](../../src/server/map.ts#L889).

SDK:t dokumenterar textmeddelanden, bilagor och textströmning. Det
beskrivna gränssnittet ger inget stöd för dubbelriktat strömmande ljud.
GPT-Live kan också föra dialog utan att delegera. För att de replikerna
ska vara tillgängliga i textläget behöver Skyttel föra över relevanta
transkript, väntande delar och egna bekräftade resultat som underlag,
exempelvis via `onUserPromptSubmitted` när nästa begäran kommer. Ett
resultat från ett verktyg som Copilot själv anropade behöver ingen sådan
överföring. Underlag från servern ska aldrig kunna utlösa ett sparande.
[Copilots meddelandegränssnitt](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/nodejs/src/types.ts#L3308),
[Copilots tillägg av kontext](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/docs/hooks/user-prompt-submitted.md#add-project-context),
[Skyttels gemensamma kontext](../../src/server/text-assistant.ts#L5979).

## Behörighet och sparande

Copilot stöder MCP över HTTP med en åtkomsttoken per session. Skyttel
knyter sin token till inloggad användare och valt hushåll. `/mcp` kontrollerar
token och aktuell behörighet. Modellen behöver varken se token eller ange
användarens eller hushållets identitet. Copilots egen autentisering, eller
en egen modellnyckel, gäller modellanropet. Använd `mode: "empty"` med en
lista över tillåtna verktyg, så att sessionen bara kan anropa de verktyg
Skyttel avser att ge den.
[Copilot och MCP över HTTP](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/docs/features/mcp.md#L448),
[Copilot för flera användare](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/docs/setup/multi-tenancy.md),
[Copilot med egen modellnyckel](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/docs/auth/byok.md),
[Skyttels åtkomstkontroll](../../src/server/assistant-routes.ts#L210).

**Förslag.** Första provet kan registrera Skyttels verktyg som funktioner i
Copilot och låta dem gå via dagens behörighetskontrollerade MCP-klient.
En direkt HTTP-koppling kan ersätta klienttransporten först när den också
bevarar kontrollen per begäran. SDK:t kan skicka Skyttels `clientTurnId`
vid MCP-anrop så att servern kan slå upp en godkänd begäran. Det ID:t är
en referens till begäran. Behörigheten kommer från Skyttels kontroll av
kopplingen, och ett återupptaget arbete får inget återställt `clientTurnId`
på verktygsanropet. Ge bara modellen verktyg som går genom Skyttels
granskning. Stoppa skrivningar utan giltig begäran även om en kontroll i
SDK:t uteblir.
[Copilots koppling mellan begäran och MCP-anrop](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/docs/hooks/pre-mcp-tool-call.md#tool-call-and-turn-ids-in-_meta),
[Skyttels MCP-klient](../../src/server/text-assistant-mcp.ts#L111),
[Skyttels kontroll per verktygsanrop](../../src/server/text-assistant.ts#L1353).

Skyttel avgör om den aktuella texten eller det nya talet uttryckligen ber
om sparande. Servern granskar hela utkastet och dess version och håller
fast vid samma `operationId` om svaret försvinner eller begäran upprepas.
Den läser då det befintliga sparförsöket, återanvänder ett pågående försök
och bekräftar bara ett beständigt sparkvitto. Kartvyn uppdateras från det
sparade utfallet. Copilots verktygskvitto och sessionens kontext ersätter
ingen av de kontrollerna.
[Skyttels spargranskning](../../src/server/text-assistant.ts#L3480),
[Sparförsök och sparkvitto](../../src/server/map-operations.ts#L21),
[Bekräftelsen i textvyn](../../src/client/use-conversation.ts#L289),
[Omläsning av kartan](../../src/client/use-household-work.ts#L346).

## Kod, drift och väntetid

- **Kod som kan tas bort.** Copilot kan ersätta kopplingen till Responses API
  för huvudloopen, hanteringen av modellens verktygsanrop och återkoppling
  av svar för nästa modellomgång. Det kan även bära sessionens kontext och
  komprimera den. Skyttels egna modellanrop för tolkning och kontroll kan
  finnas kvar. Ta med dem i jämförelsen tills prov visar vilka som går
  att ersätta med bibehållet beteende. För att ta bort huvudloopen måste
  båda lägena använda ersättaren för kartarbetet.
  [Copilots agentloop](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/docs/features/agent-loop.md),
  [Långa Copilot-sessioner](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/docs/features/session-persistence.md#infinite-sessions-for-long-running-workflows),
  [Skyttels tolkning och kontroll](../../src/server/assistant-turn-scope.ts#L155).
- **Kod som behövs.** Skyttels gränssnitt, väntande delar, samtalsmedgivande,
  ordning för samtidiga begäranden, verktygsbehörighet, utkast, sparande
  och återhämtning behöver fortsatt egna regler. GPT-Live, ljudtransporten,
  styranslutningen, transkriptionen, avbrott och presentation av verifierade
  svar behövs också. Lägg till en koppling mellan Skyttels samtal och
  Copilot-sessionen, verktygsfunktioner eller en kontrollerad MCP-koppling,
  översättning av Copilot-händelser samt överföring av kontext från rösten.
  Samordna åtkomst, lagringstid och radering av Copilots loggar med Skyttels
  samtalsmedgivande och lagring. Hur mycket egen kod som går att ta bort
  totalt är ännu oklart.
  [Skyttels samtalslagring](../../src/server/conversation-storage.ts#L78),
  [Skyttels väntande delar](../../src/server/pending-parts.ts#L72),
  [Skyttels röstleverans](../../src/server/voice-commentary.ts#L35),
  [Copilots sessioner och radering](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/docs/features/session-persistence.md#permanently-deleting-a-session-deletesession).
- **Drift.** Version 2 laddar normalt en medföljande inbyggd Copilot-motor
  i Node-processen. En separat process är ett alternativ om ett fel i
  motorn ska kunna hanteras oberoende av Skyttel. SDK-paketet har alternativ
  för Linux med musl, det C-bibliotek som används av Skyttels Alpine-avbild.
  Det behöver gå att starta, stänga ner och återuppta i den faktiska
  avbilden. Motorn och dess sessionslagring tillkommer även om den körs i
  samma process.
  [Copilots körsätt och plattformar](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/docs/setup/in-process-runtime.md),
  [SDK:ts val av Linux-paket](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/nodejs/src/runtimeArtifacts.ts#L209),
  [Skyttels avbild](../../Dockerfile#L24).
- **Väntetid.** Skyttel har redan steg för röststart och anslutning,
  delegering efter tal, väntan på ledigt kartarbete, modellomgångar,
  verktygskontroll, väntan på att användaren slutar tala och uppläsning.
  Copilot tillför start eller återupptagning av sin motor och en egen
  MCP-anslutning om den kopplas direkt. Tiden påverkas också av hur många
  modellomgångar som behövs och om arbetet väntar på komprimering. Dagens
  kod kan läsa kartan och tolka uppdraget parallellt med visst modellarbete.
  Löpande händelser kan visa att arbetet har börjat. Det första verifierade
  utfallet eller det första hörbara svaret kan ändå dröja. Mät kall start
  och varma sessioner var för sig och jämför samma modell när det går.
  [Skyttels röststart](../../src/server/voice-assistant.ts#L823),
  [Skyttels väntan före uppläsning](../../src/server/voice-work.ts#L424),
  [Skyttels överlappande arbete](../../src/server/text-assistant.ts#L2423),
  [Copilots agentloop](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/docs/features/agent-loop.md),
  [Copilots händelser](https://github.com/microsoft/copilot-sdk/blob/v2.0.1/docs/features/streaming-events.md).

## Prov som kan påverka valet

1. **Kan nästa textmeddelande använda röstens verktygsresultat?** Kör den
   beskrivna växlingen med lokala, styrda modellsvar, en spelad rösthändelse
   och ett utkast med ett känt pris. Inspektera modellunderlaget efter ett
   avbrott. Nästa textmeddelande ska få det verifierade priset och kunna
   skilja det från sådant rösten bara hann säga.
2. **Ger ett omförsök efter avbrott samma sparkvitto?** Låt den lokala
   servern genomföra sparandet men tappa svaret. Återuppta från text.
   Försöket ska bara ge en sparad ändring och samma beständiga kvitto.
3. **Kan två samtidiga sessioner hållas isär vid verktygsanrop?** Kör
   samma lokala MCP-anrop i två sessioner för användare i olika hushåll.
   Låt ett sent anrop anlända efter att en behörighet har återkallats.
   Bara den fortfarande godkända begäran får ändra sitt eget utkast.
4. **Går motorn att köra i Skyttels produktionsavbild?** Prova start,
   ping och avslut i den lokala Alpine-avbilden med det avsedda paketet
   och utan ett riktigt modellanrop.
5. **Hur stor blir skillnaden i väntetid?** Mät först lokalt med styrda
   svar hur mycket kopplingen och motorstarten tillför. Om beslutet sedan
   kräver en uppmätt skillnad för verkligt tal och modellsvar, jämför samma
   uppdrag från talets slut till första hörbara **verifierade** svar, och
   från skickad text till verifierat svar. Det provet kräver godkännande
   för anrop som kostar pengar.

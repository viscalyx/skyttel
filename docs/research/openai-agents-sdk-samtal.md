# OpenAI Agents SDK i Skyttels samtal

För utvecklare som bedömer om Skyttel kan minska sin egen kod för text och röst.
Underlaget gäller JavaScript/TypeScript-paketen `@openai/agents` och
`@openai/agents-realtime` 0.22.0 (OpenAI `8aeac0e`) och Skyttel
`267c39dbef6972a72bad3c8509602dc561a5dab4`. Källorna är kontrollerade
22 november 2026. [OpenAI:s utgåva][release], [Skyttels kodversion][skyttel].

**Bedömning.** Behåll GPT-Live för röst och pröva `Runner` för det
serverarbete som både tal och text leder till. SDK:t kan ta över upprepade
modellanrop och den allmänna hanteringen av verktygsanrop. Vinsten uppstår
om Skyttels kontroller går att flytta till ett fåtal tydliga anrop utan att
bygga upp samma styrning runt SDK:t. Skyttel behöver fortfarande hålla ihop
samtalet, kontrollera vem som får göra vad och verifiera vad som sparas.
[OpenAI:s körloop][runner], [Skyttels arbetsloop][work], [GPT-Live][live].

## Från en ändring i text till att fortsätta med röst

1. **Ändra i text.** Användaren skriver ”Lägg till en blå cykel i mitt
   utkast”. Skyttel kontrollerar inloggningen, hushållet och versionen av
   utkastet. Modellen föreslår ändringen. Skyttel granskar förslaget mot
   begäran och genomför en godkänd ändring i användarens utkast. Den
   gemensamma kartan uppdateras vid ett uttryckligt sparbesked.
   [Antagning av begäran][request], [granskning av ändringar][review].
2. **Fortsätt med röst.** Användaren sätter på mikrofonen och säger ”Lägg
   till att cykeln står i förrådet”. Skyttel skickar relevant samtalstext
   och vid behov en sammanfattning när GPT-Live startar. Röstens begäran
   går till samma arbete som textens och servern läser det aktuella
   utkastet. Användaren kan skriva även när röstläget är på. Samtalstexten
   hjälper modellen att tolka ”cykeln”. Servern kontrollerar vilken cykel
   ändringen gäller och ställer en fråga om den behöver förtydligas.
   [Start av röstläge][voice], [arbete från röstläge][voicework],
   [innehåll till arbetsmodellen][work].
3. **Fortsätt efter ett avbrott.** Om rösten bryts kan användaren skriva
   vidare i samma samtal så länge Skyttel har det kvar. Vid en ny
   anslutning får GPT-Live den bevarade texten. Skyttel kan återställa det
   lagrade samtalet i upp till sju dagar när lagringen har godkänts och
   åtkomstvillkoren fortfarande är uppfyllda. Där finns även väntande
   delar och uppgifter om oavslutat arbete. Tal som aldrig kommer fram,
   bortfallen samtalstext och en pågående modellkörning kan behöva ersättas
   med en ny begäran. Utkastet finns kvar separat. Vid ett oklart utfall
   kontrollerar Skyttel ändringen eller sparförsöket innan arbetet fortsätter.
   [Samtalslagring][storage], [återställning][restore], [kontroll av
   ändringsutfall][recover].

**Dokumenterat stöd.** `Runner` kan själv lägga till modellens meddelanden och
verktygsresultat i en `Session`. `MemorySession` ligger i processens minne.
En egen `Session` kan använda Skyttels lagring. OpenAI:s
`OpenAIConversationsSession` lagrar samtalsposter hos OpenAI tills de tas
bort. Det ersätter varken Skyttels lagringsregler eller kopplingen mellan
samtal, versioner och utkast. Vissa avbrutna körningar kan fortsätta från
`RunState`, exempelvis efter väntan på ett godkännande. Vid förlorat
verktygssvar behöver Skyttel fortfarande slå upp resultatet. En
Responses- eller sessionsidentifierare för text återskapar inte ett
röstsamtal. GPT-Live kan starta från en tidigare inspelning efter att den
sparats och slutförts. Skyttel kör med `store: false` och återför text i en
ny anslutning.
[SDK:s sessionsstöd][sessions], [OpenAI:s datalagring][data],
[GPT-Lives stöd för att fortsätta][livecontinuity], [Skyttels röststart][voice].

## Behörighet, utkast och upprepade begäranden

Dagens interna MCP-klient anropar Skyttels `/mcp` inom servern. Den bygger
en anslutning från webbläsarens inloggning och valt hushåll. Servern
kontrollerar kopplingen till det aktiva uppdraget och aktuell åtkomst.
Externa klienter använder en OAuth-token. Skyttel kontrollerar mottagare,
utfärdare, om anropet har rätt att skriva och att användaren och klienten
matchar det godkända hushållet. Båda vägarna använder samma kartregler.
[Intern MCP-klient][mcpclient], [åtkomst i MCP-ingången][mcproute].

**Bedömning.** Låt servern knyta varje körning till verifierad användare,
hushåll och samtal. Ett lokalt funktionsverktyg i `Runner` kan förmedla
anropet till dagens MCP-klient med den kopplingen. SDK:t kan också hantera
den lokala MCP-klienten via `MCPServerStreamableHttp`. Om OpenAI i stället
gör MCP-anropet behöver tjänsten nå en nätverksadress och få en avgränsad
åtkomsttoken från Skyttels server. Verktygslistan kan begränsas, men
servern måste kontrollera behörigheten för varje operation. Dagens
skrivbehörighet för externa klienter och verktygets uppmaning att spara
endast vid uttrycklig begäran bevisar inte i sig att det finns ett sådant
besked i det aktuella Skyttelsamtalet. Låt därför modellens skrivverktyg
lämna förslag till den lokala granskningen och låt servern utföra
sparandet. Ett eventuellt prov kan begränsa MCP-anropen via OpenAI till
verktyg för läsning. Responses och Realtime har båda stöd för
sådana anrop. GPT-Live kan också använda MCP om rösttjänsten själv får
delegera till en Responses-modell. Då går arbetet en annan väg än text
och Skyttel behöver fortfarande bevara den gemensamma granskningen och
kontrollen av sparbesked.
[MCP i SDK:t][sdkmcp], [MCP i Responses][responsesmcp],
[MCP i Realtime][realtimemcp], [delegering i GPT-Live][live],
[Skyttels sparverktyg][mcpwork], [serverns sparspärrar][save].

Om samma begäran levereras igen känner Skyttel igen begärans ID och
innehåll. Samma ID med ändrat innehåll avvisas. Om svaret försvinner efter
att ändringen eller sparandet har skickats, frågar Skyttel efter utfallet
med operationens ursprungliga ID. Sparförsöket är bundet till användaren,
hushållet och de granskade versionerna. En redan genomförd operation ger
samma sparkvitto, och kartvyn visar den sparade ändringen. En omformulering
med nytt ID kan vara en ny begäran och behöver tolkas och granskas på nytt.
Modellens ID för ett verktygsanrop räcker därför inte som nyckel för
återförsök. [Begärans ID][request], [ändringsoperationer][batch],
[sparförsök][operation], [spartransaktion][map].

## Kod att byta ut eller behålla

- **Möjlig besparing.** `Runner` kan ersätta kod som anropar Responses,
  kopplar modellens funktionsanrop till resultat och skickar resultaten
  vidare till nästa modellanrop. En lokal MCP-anslutning via SDK:t kan
  även ersätta delar av klienten för att lista och anropa verktyg. Vid ett
  enkelt uppdrag kan `toolUseBehavior` avsluta körningen efter ett
  verifierat resultat från ett funktionsverktyg. Skyttel gör redan
  motsvarande när serverns svar räcker och ska behålla den bedömningen.
  [Skyttels arbetsloop][work], [Responses-klienten][model],
  [SDK:s körloop][runner], [avslut efter verktyg][tools], [MCP-klienten][sdkmcp].
- **Behövs även framöver.** Behåll det egna gränssnittet, samtalstexten,
  kön för begäranden i text och röst, väntande delar och återställning.
  Servern behöver fortsatt kontrollera användarens avsikt och åtkomst,
  ändringarnas ordning och granskade versioner, samt att ett sparbesked
  fortfarande gäller. Behåll den atomiska hanteringen av ändringsgrupper,
  sparförsök, kvitton och visning i kartan.
  [Samtalstillstånd][state], [ändringsgranskning][review],
  [sparspärrar][save], [spartransaktion][map].
- **Ny kod med `Runner`.** Koppla ihop dess modellinmatning och
  funktionsverktyg med Skyttels uppdrag, avbrott och verifierade utfall.
  Samla beroende ändringar i ett granskat anrop så att SDK:ts verktygskörning
  aldrig bryter deras ordning. Förmedla modellval, resonemangsnivå,
  användningsmätning, fel och status till dagens gränssnitt. Ställ in
  `store: false` och SDK:ts spårning så att samma regler för data gäller.
  Ett eget sessionslager behövs om SDK:t ska sköta modellens samtalsposter
  via den lokala lagringen. [Körinställningar][runner], [sessionsstöd][sessions],
  [spårning][tracing], [Skyttels modellklient][model].
- **Röst.** Med dagens GPT-Live finns röstanslutningen, överföringen av
  samtalstext och uppläsningen av verifierade resultat kvar. Agents SDK:s
  `RealtimeSession` använder Realtime API. Ett byte kan förenkla
  hanteringen av rösthändelser och låta användaren avbryta uppspelningen
  utan att starta om hela röstanslutningen. Det kräver en ny koppling från
  WebRTC och serverns styrkanal till Skyttels gränssnitt och arbete.
  Realtime tar emot text och ljud i en öppen anslutning, men vid en ny
  anslutning måste Skyttel bygga upp sammanhanget igen. SDK:ts lokala
  kopia kan sakna en slutlig samtalstext efter ett avbrott. Den kan inte
  återskapa tidigare MCP-anrop genom `updateHistory()`. En ny röstanslutning
  behöver relevant samtalstext och verifierade resultat från servern.
  [Dagens röstavbrott][silence], [samtalstext och avbrott i Realtime][realtime],
  [Realtime-kod för återföring][realtimecode], [serverstyrt röstexempel][sideband].

## Väntetid

I dag kan Skyttel tolka uppdraget medan arbetsmodellen arbetar. Det
kontrollerar utkastet inför modellomgångarna och granskar föreslagna
ändringar och hela utkastet före ett sparande. Oberoende läsningar kan gå
parallellt. I röstläge tillkommer anslutning och delegering från GPT-Live
samt återföring av resultat innan uppläsningen. Långa eller verifierade
resultat kan invänta kvittenser innan Skyttel ber GPT-Live tala.
[Skyttels arbetsloop][work], [uppdragstolkning][scope],
[sparspärrar][save], [uppläsning][commentary].

**Bedömning.** `Runner` kan strömma svar men tar inte bort modellomgångar
som beror på verktygsresultat eller Skyttels kontroller. MCP via OpenAI
lägger till nätverksanrop för verktygslistan och verktygen. Responses kan
återanvända listan när `mcp_list_tools` följer med i sammanhanget.
Godkännande under ett sådant anrop kan kräva en fortsättning innan svaret
blir klart. Ett byte till Realtime kan minska väntan vid avbruten
uppspelning, men en ny anslutning behöver återfå sammanhanget. Om Realtime
delegerar till samma arbetsmodell kvarstår den modellens tid. Väntetiderna
är inte uppmätta för alternativen.
[Körloop och strömning][runner], [MCP-flöde i Responses][responsesmcp],
[Realtime-händelser][realtime], [serverstyrd anslutning][sideband].

## Små prov som kan ändra beslutet

1. **Kan `Runner` ersätta arbetsloopen?** Kör lokalt med `ScriptedModel` och
   Skyttels befintliga förslag till en ordnad grupp av ändringar, följt av
   ett uttryckligt sparbesked. Kräv samma kontroller och samma verifierade
   svar utan en extra modellomgång. Jämför hur mycket av den nuvarande
   loopen som kan tas bort när den nya kopplingen räknas med. Om samma
   styrning behöver byggas runt SDK:t minskar skälet att byta.
2. **Bevarar kopplingen samma samtal när rösten försvinner?** Mata in
   händelser lokalt för ett textförslag, en röstfråga som väntar på
   förtydligande och en stängd röstanslutning. Återöppna i text, svara på
   frågan och kontrollera att samma väntande del och utkast följer med.
   Om endast tidigare ord följer med behöver Skyttel fylla luckan.
3. **Sparas ändringen bara en gång när svaret försvinner?** Bryt svaret
   efter att databasen har sparat. Skicka om samma begäran och kontrollera
   att samma sparkvitto hämtas, att bara en ändring finns i kartans
   ändringshistorik och att kartvyn visar den.
4. **Påverkas tiden till ett användbart svar?** Om den lokala prövningen
   visar att kod kan tas bort, jämför dagens lösning med kandidaten med
   samma modellval, resonemangsnivå och begäran. Mät från inskickad text
   eller avslutat tal till första användbara svar respektive verifierat
   utfall. Mät röststart och start efter avbrott separat. Ett verkligt
   modell- eller röstprov kräver uttryckligt godkännande i förväg.

De lokala proven kan använda styrda modellsvar och rösthändelser. De kan
visa vilken kod som fortfarande behövs. Tolkning av verkligt tal och
upplevd väntetid behöver mätas med tjänsten. Inga modell- eller röstanrop
ingår i underlaget. [SDK:s stöd för lokala prov][testing].

[release]: https://github.com/openai/openai-agents-js/releases/tag/%40openai%2Fagents%400.22.0
[skyttel]: https://github.com/viscalyx/skyttel/commit/267c39dbef6972a72bad3c8509602dc561a5dab4
[runner]: https://github.com/openai/openai-agents-js/blob/8aeac0eb255dbdff9adcdc65a0eae638cbcea74f/docs/src/content/docs/guides/running-agents.mdx
[tools]: https://github.com/openai/openai-agents-js/blob/8aeac0eb255dbdff9adcdc65a0eae638cbcea74f/docs/src/content/docs/guides/agents.mdx#forcing-tool-use
[sessions]: https://github.com/openai/openai-agents-js/blob/8aeac0eb255dbdff9adcdc65a0eae638cbcea74f/docs/src/content/docs/guides/sessions.mdx
[sdkmcp]: https://github.com/openai/openai-agents-js/blob/8aeac0eb255dbdff9adcdc65a0eae638cbcea74f/docs/src/content/docs/guides/mcp.mdx
[realtime]: https://github.com/openai/openai-agents-js/blob/8aeac0eb255dbdff9adcdc65a0eae638cbcea74f/docs/src/content/docs/guides/voice-agents/build.mdx
[realtimecode]: https://github.com/openai/openai-agents-js/blob/8aeac0eb255dbdff9adcdc65a0eae638cbcea74f/packages/agents-realtime/src/openaiRealtimeBase.ts#L1067
[sideband]: https://github.com/openai/openai-agents-js/blob/8aeac0eb255dbdff9adcdc65a0eae638cbcea74f/examples/realtime-server-controlled/README.md
[tracing]: https://github.com/openai/openai-agents-js/blob/8aeac0eb255dbdff9adcdc65a0eae638cbcea74f/docs/src/content/docs/guides/tracing.mdx
[testing]: https://github.com/openai/openai-agents-js/blob/8aeac0eb255dbdff9adcdc65a0eae638cbcea74f/docs/src/content/docs/guides/testing.mdx
[live]: https://developers.openai.com/api/docs/guides/live-delegation
[livecontinuity]: https://developers.openai.com/api/docs/guides/live-conversations#store-and-fork-a-session
[responsesmcp]: https://developers.openai.com/api/docs/guides/tools-connectors-mcp
[realtimemcp]: https://developers.openai.com/api/docs/guides/realtime-mcp
[data]: https://developers.openai.com/api/docs/guides/your-data
[model]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/text-assistant-model.ts#L99
[work]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/text-assistant.ts#L2744
[scope]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/text-assistant.ts#L2438
[review]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/text-assistant.ts#L3095
[save]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/text-assistant.ts#L3472
[recover]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/text-assistant.ts#L1605
[restore]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/text-assistant.ts#L4745
[request]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/text-assistant.ts#L5306
[state]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/conversation-state.ts
[storage]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/conversation-storage.ts
[voice]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/voice-assistant.ts#L523
[voicework]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/voice-work.ts#L341
[silence]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/client/use-voice.ts#L873
[commentary]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/voice-commentary.ts#L33
[mcpclient]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/text-assistant-mcp.ts#L53
[mcproute]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/assistant-routes.ts#L214
[mcpwork]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/assistant-work.ts#L415
[batch]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/map-draft-batches.ts#L58
[operation]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/map-operations.ts#L91
[map]: https://github.com/viscalyx/skyttel/blob/267c39dbef6972a72bad3c8509602dc561a5dab4/src/server/map.ts#L894

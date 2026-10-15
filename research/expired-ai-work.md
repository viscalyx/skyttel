# Mottaget AI-arbete vid inloggningens utgång

Research för
[Hur slutförs mottaget AI-arbete säkert när inloggningen går ut?][ticket]
i kartan
[Skyttel – väg till cookie- och lagringshantering med återanvända formulär][map].
Läsare är den som fattar återstående produktbeslut och senare utformar
eller granskar implementationen. Underlaget är fruset mot Skyttel
`8f86c81dbe8f4007e93973f6735a47c409397ff5`, med källkontroll och
syntetiska körningar 2026-10-15. Ingen produktionskod ändras.

## Slutsats och bevisnivå

Det beslutade undantaget kräver en uppgiftsbehörighet som är skild från
inloggningens allmänna behörighet. Den måste bindas till en oföränderlig,
servermottagen instruktion, rätt inloggningssession, användare, hushåll,
innehållsgeneration och medgivande. Den gäller till mottagandet plus
30 minuter och måste kunna spärras även efter vanlig sessionsutgång.
Samma kontroll måste följa med ända in i databasens skrivtransaktion.
Detta är ett **föreslaget kontrakt**, inte en befintlig egenskap.

Dagens kod gör motsatsen vid utgång: den kontrollerar den ursprungliga
inloggningens `expiresAt` även under uppgiften och stoppar därefter
arbetet. Två syntetiska prober genom verkliga app-, OAuth- och
MCP-gränser, en för text och en för röst, bekräftar denna begränsning.
Tidigare lagrade utkast överlever ny inloggning och omstart i proberna.
De bevisar **inte** att det föreslagna undantaget fungerar.
[Textens kontroller][text-auth], [MCP-kopplingen][mcp],
[röstens backendanrop][voice-work] och körningen nedan.

Den tydligaste återstående produktfrågan gäller gränsen för **mottagen
röstuppgift**: Live ger transkriptfragment, inte ett slutligt
användarmeddelande. Talstart före utgång bevisar inte att en hel,
avgränsad instruktion har tagits emot. Ett precist HITL-förslag finns
längre ned. Det ska avgöras innan överlämningen kallas färdig.

Bevisnivåerna används konsekvent:

- **Kodbelägg:** frusen produktkod, låsfil och installerad bibliotekskod.
- **Källbelägg:** officiella protokoll, OpenAI-dokumentation och SQLite.
- **Körbevis:** namngivna syntetiska nulägesprober och befintliga tester.
- **Kontraktsförslag:** framtida regler och kontroller, utan körbevis för
  hela lösningen, verifierad säkerhet eller fullständig leveransgaranti.

## Beslut som underlaget tillämpar

[Vilka tidsgränser och lagringsval ska gälla under en pågående inloggning?][limits]
äger produktgränserna: åtta timmar och 30 minuters inaktivitet för vanlig
inloggning, högst sju dygn för ihågkommen, gemensam aktivitet i sessionens
flikar samt pausad inaktivitet under verkligt AI-arbete och leverans.
Varje mottagen uppgift har högst 30 minuter från sitt eget mottagande.
Undantaget gäller vanlig tidsutgång och ger ingen ny sparauktorisering.

[Hur ska befintliga sessioner utan aktivt lagringsval hanteras vid övergången?][transition]
äger övergången: äldre berörda sessioner och försök avslutas utan respit,
AI-arbete stoppas, lagrade utkast bevaras och registrerade sparförsök
följer befintlig återhämtning. Enbart roll forward gäller.

[Hur länge ska uppgifter om ihågkommen inloggning sparas på servern?][retention]
äger lagringsgränserna. Denna research inför ingen separat valhistorik,
ingen ny spegelcookie, inget fingeravtryck och ingen ny backupfunktion.
Aktiva operativa uppgiftsuppgifter behöver en motiverad livscykel;
sessionens gallring är skild från både uppgiftens 30 minuter och
utkastets vanliga bevarande. Sparförsökens kvitton får inte felaktigt
gallras som gamla inloggningsuppgifter.

## Låsta komponenter och faktiska flöden

### Versioner

[Låsfilen][lock] och installerade paket anger:

<!-- markdownlint-disable MD013 -->
| Komponent | Version | Betydelse här |
| :--- | :--- | :--- |
| OpenAI SDK | 7.30.1 | Responses för text och GPT-Live för röst. |
| Better Auth och OAuth-provider | 1.7.7 | Inloggning och assistentens OAuth-grant. |
| MCP TypeScript SDK | 1.32.1 | Lokal Streamable HTTP-transport. |
| better-sqlite3 | 13.0.3 | Synkrona, omedelbara transaktioner. |
| ws | 8.22.0 | Live-sideband via serverns WebSocket. |
<!-- markdownlint-enable MD013 -->

Modellvalen i [samtalskapaciteten][capacity] är `gpt-6.1-sol` för text
och `gpt-live-1` för röst. Detta underlag byter ingen modell.
Låsfilen binder SDK-koden, men fryser inte leverantörens serverbeteende
eller modellversion bakom namnet.

OpenAI-taggen `v7.30.1` pekar vid kontroll på
`bc6c0bfb70f253d5caa3f335699e9713ea9067b5`.
[SDK:ns Live-definitioner][sdk-live] har samma Git-blobhash som den
installerade filen: `2f023171b7fa37029e97b61b2cbd031553c3e618`.
Det ger ett versionsbundet källbelägg för bland annat fragment, delegation
och mute. De publika dokumentationssidorna är daterade läskällor,
inte oföränderliga protokollversioner.

MCP SDK:ns installerade `dist/esm/types.js` anger senaste protokoll
`2025-11-25`, även stöd för `2025-06-18`, `2025-03-26`, `2024-11-05`
och `2024-10-07`, samt fallback `2025-03-26`. Klienten begär senaste
vid initialize. Den faktiskt överenskomna versionen ska fångas i en
framtida kontraktskontroll; den här proben registrerar inte handskakningen.
[MCP:s versionsförhandling][mcp-lifecycle].

### Text

[Textassistenten][text-admission] validerar instruktion, versionsankare och
`requestId`, kontrollerar aktuellt utkast och lägger sedan meddelandet i
en processlokal kö. Samma ID och innehåll återanvänds; ändrat innehåll
med samma ID avvisas. Kapaciteten är högst 200 pågående och köade
meddelanden. `Message` saknar `receivedAt` och egen deadline.
`beginMessage` skapar en AbortController först när meddelandet börjar
bearbetas. Dagens kö kan därför inte bevisa en 30-minutersgräns från
**mottagandet**, särskilt inte för arbete som väntar i kön.

[Textmodellen][text-model] använder `responses.create`, `store: false`,
`parallel_tool_calls: false`, `maxRetries: 0` och en AbortSignal.
En modellrespons kan begära verktyg; Skyttel utför dem. Modellens
text eller verktygsargument är ingen självständig behörighet.
[OpenAI: function calling][function-calling]. Ingen providerlagring
ersätter Skyttels databas, och `store: false` är inget allmänt löfte
om att all leverantörsbehandling upphör vid lokal abort.

[connectTextAssistant][mcp] skapar en vanlig privat OAuth-klient och
grant genom samma HTTP/MCP-ingång som andra assistenter. Den får
`skyttel:read skyttel:write`, utan `offline_access` eller refresh-token
i den här vägen. `mcp.expiresAt` beräknas som anslutningstid plus
`min(tokens.expires_in, 1800)` sekunder. Samtalets timer stoppar hela
samtalet där. OAuth-tokenets giltighet, samtalets timer och uppgiftens
egen deadline är alltså tre skilda gränser.

### Röst: GPT-Live, inte äldre Realtime

[Röstassistenten][voice] använder `client.live.create`, WebRTC,
`delegation: { type: 'client' }`, `store: false` och server-sideband.
Frontendens data channel tillåter endast `session.close` som skickat
klientkommando och tar emot de serverhändelser som listas i koden.
Backendens anrop till textassistenten bär i dag
webbläsarens Cookie och går genom vanlig sessionsauktorisering.
Klientstyrd behörighet eller nya instruktioner får inte smygas in genom
en efterföljande generell rätt att fortsätta samtalet.

[voiceWork][voice-work] samlar färska användarfragment och inväntar
mikrofonens aktivitet samt två sekunder efter senaste fragment innan
backendens `messages` anropas. Delegationens `offset_ms` identifierar
en plats i samtalet och innehåller inte instruktionens text.
Tidigare samtal och historiskt seedade repliker ger ingen ny sparbegäran.

OpenAI beskriver fragmentens tidsintervall som ungefärliga och kan
leverera dem ojämnt. De saknar turens slutmarkör. Tystnad mellan
fragment räcker därför inte som bevis för avslutat tal. Mute kvitteras
separat och lämnar modellen och delegerat arbete igång.
[Managing GPT-Live sessions][live-sessions] och
[versionsbunden SDK-definition][sdk-live]. Äldre Realtime-händelser som
`input_audio_buffer.commit` och `response.cancel` är inte lösningen
för Skyttels nuvarande Live-flöde.

### Beständighet och befintlig auktorisering

[householdMap][domain] skriver `map_draft` med ny version i en
omedelbar databastransaktion. Utkastet lagras per hushåll och
**innehållsägare**, inte per samtal eller sessionscookie.
[contentOwner][owner] binder den autentiserade användaren till rätt
`content_identity`; efter import kan innehållsägarens ID skilja sig
från inloggningens användar-ID. Återinloggning ska återupplösa samma
bindning, inte byta till ett nytt utkast baserat på klientens ID.
[Databasschemat][schema-owner] och [befintliga ägarskapstester][ownership-tests].

[MCP-rutten][mcp-route] kontrollerar grant, användare och hushåll samt
kör `assistantTaskAccess` före domänanropet. Domänens egna
`authorize()` inne i skrivtransaktionen kontrollerar däremot medlemskap,
innehållets tillgänglighet och innehållsägare, inte sessionens utgång,
uppgiftens deadline eller en beständig medgivanderevision. En synkron
kontroll och skrivning undviker vissa mellanrum i samma Node-process.
Det är inte bevis för atomisk auktorisering mot en annan databasanslutning,
en annan process eller en framtida asynkron ändring.

[Samtalsmedgivandets återkallelse][consent-route] raderar sparat medgivande
och avslutar användarens samtal i hushållet på alla enheter.
Textassistentens processlokala återkallelseräknare skyddar även starter
som pågår. Detta är användbar befintlig funktion; det är inte en
distribuerad, beständig spärr för ett nytt undantag efter tidsutgång.

## Föreslaget verifierbart serverkontrakt

Detta avsnitt är en teknisk rekommendation. Inget av det nya kontraktets
hela flöde är körverifierat av denna research.

### 1. Mottagande är en serverhändelse

Registrera en uppgift först när en fullständig och avgränsad instruktion
har godkänts av servern. Kontrollera giltig inloggning, rätt hushåll,
aktuellt medgivande, innehållsägare, innehållsgeneration, tillåten
instruktion och kökapacitet **vid registreringen**. En kontroll i
middleware före `await request.json()` räcker inte om kroppen anländer
efter utgång. Klientens tid, aktörs-ID, uppgifts-ID eller flagga om
tidigare mottagande får inte ge behörighet.

Den serverstyrda posten behöver minst följande funktionella uppgifter:

- Oföränderligt uppgifts-ID, inloggningens stabila identitet,
  autentiserad aktör, hushåll, innehållsägare och innehållsgeneration.
- Serverns `receivedAt` och `deadline = receivedAt + 30 minuter`.
- Hash av instruktionen och ursprungliga versionsankare, för samma
  mottagande vid dubletter. Själva instruktionen kan stanna i arbetsminnet
  om återupptagning efter processavbrott inte erbjuds.
- Ursprunglig medgivandeversion och revisionsspärrar för utloggning,
  återkallat medgivande, medlemskap och installationens övergång.
- Tillåtna handlingar för just uppgiften, tillstånd och eventuell
  ursprunglig sparbehörighet; ingen generell rätt att skapa nya uppgifter.

Detta är operativ metadata, ingen separat historik över lagringsval.
Identifierarna är inte autentiseringsbevis. En kvarvarande post får inte
ge fortsatt inloggning, och ett vanligt klientanrop får inte kunna välja
den som auktoriseringsväg.

För **text** räknas registreringen före HTTP 202 som mottagande, även
om uppgiften köas. Samma ID och samma hash återanvänder samma tid och
deadline. Dequeue, modellvarv, context summary, verktygssteg och interna
återförsök startar aldrig om klockan. Köväntan förbrukar uppgiftens tid.
Ett köat arbete vars tid gått ut avslutas utan nytt modellanrop.

För **röst** behöver produktgränsen preciseras enligt HITL-frågan nedan.
Det konservativa alternativet är ett fruset instruktionspaket godkänt
före utgång, med servermottagna fragment och egen identitet. En öppen
mikrofon, ett delegationsevent utan komplett instruktion, ett tidigare
samtal eller en heartbeat är aldrig en sådan uppgift. Sena fragment får
inte läggas till en redan godkänd uppgift.

Använd föräldrauppgiftens identitet för tillhörande verktygsarbete och
leverans. Ett verktygsanrop eller en ny providerdelegation får inte skapa
en ny tidsperiod. Varje självständig ny användarinstruktion behöver nytt
giltigt mottagande.

### 2. Skilj inloggning från slutförandebehörighet

En gemensam serverkontroll måste neka allmän åtkomst vid
`now >= absoluteExpiresAt`, även om Better Auth ännu godtar posten.
Stäng av automatisk sessionsförnyelse enligt
[serverresearchen för ihågkommen inloggning][auth-research]. Ingen
callback för en uppgift, sessionshämtning, aktivitet eller
tokenutgivning får
flytta den ursprungliga gränsen eller skriva en förlängd cookie.

Endast serverns redan registrerade exekverare får fortsätta uppgiften
efter naturlig utgång. Låt den bära en avgränsad uppgiftskontext genom
samma MCP-ingång och gemensamma kartregler. Den behöver fortfarande
kunna läsa det underlag och utföra de verktyg som den ursprungliga
instruktionen kräver. Behörigheten får inte följa med till webbläsarens
API, externa assistenter eller en modellgenererad ny instruktion.
[Arkitekturbeslut om gemensam MCP-ingång][adr-mcp].

Enbart en borttagen kontroll av `expiresAt` är otillräcklig. Dagens
OAuth-grant har bredare verktygsbehörighet än en enskild instruktion,
och dess token kan ta slut före uppgiftens deadline. Ett möjligt
genomförande är ett före utgång registrerat, serverinternt uppgiftsgrant
som krävs och begränsas vid varje MCP-anrop. Tokenens livslängd
måste vara tillräcklig för uppgiften men högst dess deadline. Grantet
får ingen refresh-rätt, och inga nya browsercookies utfärdas.

Detta kräver en explicit token- och valideringsdesign; dagens
`assistantTaskAccess` är bara en möjlig bärare av kontext. Ett fritt
uppgiftsheaderfält, generell OAuth-förnyelse efter utgång eller ett
globalt undantag i MCP-auktoriseringen uppfyller inte kontraktet.
Ett uppgiftsgrant måste vara oanvändbart utan sin ursprungliga
serverregistrering och ska nekas utanför dess tillåtna verktyg,
aktör, hushåll och innehållsgeneration. Befintliga externa klienter
behåller sina vanliga regler. [MCP:s tokenvalidering och scopes][mcp-auth].

Vanlig utgång får inte behandlas som utloggning. Better Auth 1.7.7 kan
radera en utgången sessionsrad vid `get-session`; dess sign-out läser
den signerade cookie-tokenen och försöker radera sessionen utan att
först kräva en giltig session. Samma radborttagning säger därför inte
vilken orsak som gäller. Uppgiftsbehörigheten behöver en självständig,
begränsad livscykel och explicit spärrorsak; den får varken få respit
av en okänd orsak eller försvinna genom utgångens vanliga städning.
[Better Auths sessionroute][ba-session] och [sign-out][ba-signout].

### 3. Kontrollera behörighet och skrivning atomiskt

Vid varje läsning, verktygsanrop, modellanrop och mottaget resultat
kontrolleras uppgiftens identitet, status, deadline och spärrar.
Efter varje väntan kontrolleras de igen. AbortController hjälper till
att frigöra resurser, men är inte själva säkerhetsgränsen.

För en ändring behöver följande ske i **samma omedelbara transaktion**
som skriver utkastet eller registrerar ett nytt sparförsök:

1. Läs serverns tid och den ursprungliga uppgiftens tillstånd.
2. Kräv `now < task.deadline`, rätt medgivanderevision, oförändrad
   sessionsspärr och installationsgeneration samt aktuellt medlemskap.
3. Kontrollera samma aktör, hushåll, innehållsägare, generation,
   utkastversion och verktygsrätt som uppgiften ursprungligen får ha.
4. Utför ändringen och skriv ny utkastversion med befintliga domänvillkor.
5. Registrera verifierbart lagringsutfall först när transaktionen lyckas.

Utloggning, återkallelse och övergång måste uppdatera de lästa spärrarna
i transaktioner som serialiseras med dessa skrivningar. Om spärren
committas först nekas den sena skrivningen. Om skrivningen committas
först är dess förslag redan lagrat och bevaras enligt vanliga regler;
spärren stoppar nästa steg. En åtkomst som tas bort och återläggs får
inte återuppliva en gammal uppgift: jämför revision, inte bara att
medlemskap åter finns.

SQLite tillåter en skrivare åt gången. `BEGIN IMMEDIATE` tar skrivlåset
innan transaktionens läsningar; en ytterkontroll följd av en senare
transaktion har inte samma garanti. [SQLite: isolation][sqlite-isolation]
och [befintliga databasinställningar][database]. Detta ger en möjlig
ordningspunkt, inte ett bevis för att den föreslagna lösningen har den.
Inga modell- eller nätverksanrop ska ske medan databaslåset hålls.

Kontrollen definierar när en ny operation får godkännas. Ett OS kan
pausa processen och en påbörjad databascommit kan bli klar senare än
väggklockans gräns. Underlaget utlovar inte hård realtid eller att redan
utskickade nätpaket kan återtas. Körkontroller måste visa att inga nya
steg auktoriseras vid eller efter deadline, även vid försenad timer,
databaslås och sena svar. En timer ensam är otillräcklig.

### 4. Håll inaktivitet gemensam och ändlig

Bind aktivitetsräkningen till en stabil inloggningssession, inte till
användarkontot, samtalet, fliken eller den roterbara cookie-tokenen.
Sessionens flikar delar senaste användarhandling och pågående arbete.
En annan enhets session får inte hållas aktiv av detta arbete.

Registrera serverns mottagningstid för att skriva, tala, navigera, söka,
redigera och spara. Lokala handlingar utan ett vanligt serveranrop
behöver ett begränsat aktivitetsmeddelande som hör till den giltiga
sessionen. Det kan inte få backdatera tid eller återuppliva en redan
inaktiv session. Klienten kan rapportera en handling; det är inget
kryptografiskt bevis för mänsklig aktivitet.

Bakgrunds-GET, `/api/bootstrap`, samtalspollning, röstpollning, fokus,
musrörelse, tyst mikrofon och heartbeat uppdaterar inte aktiviteten.
Koden hämtar bootstrap och samtalsåtkomst var femte sekund samt röst
vanligen var 500 ms. Dagens klientrapport om `microphoneActive` är
användbar för talflödet, men får inte ensam ge en obegränsad paus.
[Appens polling][client-app], [samtalsåtkomst][client-conversation],
[röstpollning][client-voice] och [ljudmätaren][client-transport].

Räkna pågående verklig bearbetning, verktyg och ändlig leverans som
ett intervall per mottagen uppgift. Flera samtidiga intervall bildar
en union: en uppgifts slut får inte återstarta klockan medan en annan
fortfarande arbetar. När sista arbetet inklusive lagring och leverans
slutar, eller avslutas med fel, börjar en ny 30-minutersperiod.
Kontrollera alltid först den absoluta inloggningsgränsen.

Köade poster förbrukar sina egna 30 minuter. En kö bakom verkligt
pågående arbete är täckt av det arbetets paus. En blockerad kö som
väntar på mänskligt svar eller återhämtning får inte ensam behålla
pausen. Väntan på nästa användarsvar är färdigt arbete, inte en ny
aktiv uppgift. Utgång, abort, frånkoppling och processavbrott måste
städa aktivt arbete så att en gammal post inte håller sessionen aktiv.

Låt varje HTTP-, modell-, MCP- och leveransförsök ha timeout inom den
**återstående** uppgiftstiden. Progress, heartbeats och återförsök får
inte flytta den absoluta gränsen. [MCP:s timeoutregler][mcp-lifecycle].
Behandla icke ändliga eller felaktiga tider som nekad behörighet.
Serverns klocka måste övervakas; en monoton lokal budget kan dessutom
hindra att ett bakåtsteg förlänger en redan påbörjad uppgift. En omstart
får inte ge en ny budget.

### 5. Beständigt utkast och återinloggning

Låt varje giltigt förslag gå genom samma domänfunktioner som i dag,
med extra uppgiftskontroll i transaktionen. Behåll versionskonflikter,
skydd mot ändrad innehållsgeneration och rätt innehållsägare. En annan
fliks samtidiga ändring får inte skrivas över eller införlivas i en
äldre sparbehörighet. Vid konflikt avslutas detta arbete eller får
bara fortsätta inom redan tillåten hantering; en ny fråga kräver ett
nytt giltigt användarsvar.

Ett förslag är beständigt lagrat först efter lyckad commit av
`map_draft`, inte när modellen producerar ett anrop, klienten visar en
rad eller MCP-anropet startar. Flera verktygsanrop kan lagra flera
förslag; ett senare fel får inte radera tidigare lyckade förslag.
Modellsvar utan föreslagna ändringar skapar inget låtsasutkast.
[Domänens utkastskrivning][domain].

Efter absolut utgång stängs den allmänna resultatåtkomsten. Textens
poll får inte returnera privat innehåll med utgången nyckel. Röstens
inkanal stängs och inga nya privata resultat matas till den gamla
Live-anslutningen. Backenduppgiften kan slutföras till databasen.
Ny inloggning med samma användare och aktuell hushållsåtkomst hämtar
utkastet genom vanlig kartläsning; ingen gammal samtalscookie eller
nytt AI-medgivande behövs för själva kartläsningen.

Servern kan stoppa **ny** leverans men kan inte ta tillbaka redan
levererat innehåll eller bevisa att användaren såg eller hörde det.
En skickad commentary och dess kvittens är skilda från lagrad data
och fysisk uppspelning. [voiceCommentary][commentary] och
[OpenAI: delegationens kvittenser][live-delegation].

### 6. Bevara sparreglerna

[Arkitekturbeslutet om samlat sparande][adr-save] kräver uttrycklig
sparbegäran för hela aktuella utkastet. Dagens textflöde har
`saveIntent`, inmatningsordning, versionskontroller och spärrar mot
historiska, negativa, villkorliga eller modellpåstådda godkännanden.
Röstens historiska kontext är aldrig färsk sparauktorisering.
[Textens sparflöde][text-save] och [röstens färska indata][voice-work].

Frys den ursprungliga avgränsningen av en giltig sparbegäran till rätt
uppgift. Undantaget gör inte en begäran om förslag till en sparbegäran,
tar inte bort konflikter och ger inte rätt över en annan fliks nya
förslag. Om samma redan mottagna instruktion uttryckligen godkänner
sparande kan endast dess befintliga sparbehörighet användas under den
återstående uppgiftstiden och samma kontroller. Ny auktorisering efter
utgång, även ett modellgenererat ja, är förbjuden.

Skilj tre fall:

- **Ingen registrerad operation och inget giltigt sparbesked:** bara
  förslag i utkastet. Ingen automatisk `prepare_save` eller `save_draft`.
- **Ursprungligt giltigt sparbesked, ännu ingen operation:** enbart
  oförändrad befintlig rätt får användas före uppgiftsgränsen; den får
  inte utökas av slutbehandling eller återhämtning.
- **Redan beständigt registrerat sparförsök:** följ samma oföränderliga
  operations-ID, utkastversion, innehållsgeneration och innehållshash.
  Kontroll och tillåten återhämtning är inte en ny sparbegäran.

[map.save][domain-save] registrerar försöket i en separat commit före
själva sparandet. Karta, historik, förbrukat utkast och sparkvitto skrivs
sedan tillsammans. [mapOperations][operations] låser samma identitet och
innehåll; [checkSaves][save-check] slutför bara befintliga väntande
operationer, utan modellarbete eller nytt operations-ID.

Uppgiftens tidsgräns, utloggning, medgivandeåterkallelse och övergång
får inte kasta sådana operationer eller omtolka okänt utfall som
misslyckande. Efter ny autentisering med aktuell åtkomst kan samma
försök kontrolleras även utan samtalsmedgivande. Borttaget medlemskap
ger däremot ingen rätt att läsa privat resultat eller skriva i hushållet.
Att en redan registrerad operation kan återhämtas enligt sina regler
är inte en förlängning av AI-uppgiftens 30 minuter.
[Beslut och genomförande för oklart sparande][save-decision].

### 7. Utloggning, återkallelse och övergång är stopp

Den ursprungliga uppgiftens spärrar måste kunna kontrolleras även när
den allmänna sessionsbehörigheten är slut. Övergångens generation får
aldrig falla tillbaka till att tolka en gammal uppgift som ny.

<!-- markdownlint-disable MD013 -->
| Händelse | Nya handlingar | Redan mottaget AI-arbete | Beständig information |
| :--- | :--- | :--- | :--- |
| Vanlig absolut utgång | Nekas. | Samma uppgift får fortsätta inom egen tid. | Utkast och registrerade sparförsök bevaras. |
| Inaktivitet utan arbete | Nekas. | Ingen paus får finnas enbart från tom anslutning. | Vanliga regler gäller. |
| Uttrycklig utloggning | Nekas. | Stoppas för berörd inloggning. | Lagrade förslag och operationsåterhämtning följer vanliga regler. |
| Återkallat samtalsmedgivande | Nytt samtalsarbete nekas. | Stoppas för användaren och hushållet på alla enheter. | Inget nytt sparande; befintliga försök kan kontrolleras. |
| Återkallad hushållsåtkomst | Nekas. | Stoppas för berörd aktör och hushåll. | Ingen fortsatt läs- eller skrivrätt genom uppgiften. |
| Övergång för äldre session | Nekas, även med sen cookie. | Stoppas utan slutförandeundantag. | Lagrade utkast bevaras och registrerade försök följer återhämtning. |
| Uppgiftens egen deadline | Ingen ny rätt. | Stoppas, sena svar förkastas. | Redan committade förslag bevaras. |
<!-- markdownlint-enable MD013 -->

Att återkalla **ihågkommen inloggning** är ett annat fall än att återkalla
**samtalsmedgivande**. Det förstnämnda byter lagringsval och sätter
vanlig inloggnings återstående gränser; det är inte i sig ett nytt
beslut att återkalla mottagen AI-instruktion. Den gamla cookie-tokenen
ska ändå förbli ogiltig. Uppgiften behöver en stabil serverbindning
som överlever en tillåten tokenrotation utan att acceptera gamla
browsernycklar. [Beslutade tidsgränser][limits] och
[garantin vid sena cookiesvar][rotation-decision].

Samordna med
[Hur binds återkallelse och utloggning till äldre inloggningsförsök i samma webbläsarprofil?][rotation-research].
En generell delete-session-hook kan inte skilja naturlig utgång från
utloggning. En generell 401 får inte heller låta servern glömma
spärrningen av ett pågående arbete. Om den gamla cookien redan
försvunnit måste utloggningsflödet fortfarande nå rätt kvarvarande
uppgifter genom en verifierad och begränsad serverbindning.
En sådan stopprätt ger ingen läsning, förnyelse eller ny instruktion.
Inför inte ny beständig browserlagring som dold lösning.

Efter återstart eller återställning får varken gamla spärrar eller
processlokala räknare antas finnas kvar. Övergångskontrollen måste gälla
innan trafik släpps in. Databas-/diskåterställning samordnas med
[underlaget om säkerhetskopior och säker återställning][backup-research].
Detta underlag bevisar inte de två separata researchfrågornas kontrakt.

### 8. Fel, leverans och processavbrott

Skilj arbetsutfall från lagringsutfall och leveransutfall. Ett förlorat
HTTP-svar kan följa en lyckad commit. Ett modellsvar kan vara komplett
utan att ett enda förslag lagras. En misslyckad röstleverans kan följa
ett redan lagrat utkast eller genomfört sparande.

- **Frånkopplad klient:** avsluta leveransväntan; håll inte inaktivitet
  pausad tills användaren återkommer. Ett redan mottaget serverarbete
  kan fortsätta inom sin behörighet och deadline utan klientanslutning.
  Frånkopplingen får inte radera kända databasresultat.
- **Röstanslutningens fel:** stäng media och bestäm separat om den redan
  mottagna backenduppgiften ska slutföras. Dagens `close()` anropar
  `voice.work.stop()` och avbryter arbetet; den kopplingen måste delas
  där naturlig utgång bara avslutar klientåtkomst. Explicit stopp
  fortsätter att återkalla uppgiften.
- **Leverantörsfel, ofullständigt svar eller deadline:** stoppa nya
  verktyg, avsluta uppgiften med fel och bevara tidigare commits.
  Signalera aldrig att olagrade delar finns i utkastet. Exakt feltext
  efter återinloggning kräver känt underlag; okänt utfall måste få vara
  okänt utan en ny personkopplad historik.
- **Fastnad leverans:** sätt en ändlig leveranstid inom uppgiftens
  återstående tid. Varken ack, speaker-flagga, polling eller öppen
  WebRTC får starta om den. Efter sessionsutgång ges inget nytt privat
  svar över den gamla anslutningen.
- **Processavbrott/omstart:** arbetsminne, kö, transkript och pågående
  providersvar kan gå förlorade. Ingen automatisk ny instruktion eller
  ny modellkörning härleds ur dem efter omstart. Bevara committade
  utkast och oföränderliga sparförsök. Återhämta endast de senare genom
  deras befintliga regler. En ny worker får inte återställa 30 minuter.

Det minsta genomförbara kontraktet behöver inte garantera återupptaget
AI-arbete efter processdöd. En beständig kö med instruktioner, replay,
lease och exakt återupptagning skulle vara ett större separat löfte.
Det befintliga produktbeslutet accepterar arbetsfel och garanterar inte
ett lyckat modellsvar. Det tillåter inte falska lagringsbesked.

OpenAI anger att en Live-sideband inte spelar upp tidigare händelser
vid anslutning. `session.close` och `session.closed` avser sessionens
avslut; klientdelegerat backendarbete måste hanteras i applikationen.
Mottagen context-ack bevisar inte uppspelning.
[Live-sideband][live-sideband] och [delegation][live-delegation].
Lokal AbortSignal bevisar inte att leverantören omedelbart slutat arbeta
eller debitera. Responses cancel-endpoint gäller background-responser;
dagens anrop använder inte background mode. Det är ingen generell
återställningsmekanism för detta flöde.
[OpenAI: background mode][background].

## Körbevis och reproduktion

### Två nya nulägesprober

Körning genom repoets delade processlås:

```sh
npm run test:env -- tsx research/expiry-probe.ts
```

Probkällan finns komplett i bilagan. Den kan skrivas till angiven fil
i en kastbar worktree från den frusna Skyttel-versionen med installerade
paket enligt låsfilen. Den behöver ingen verklig API-nyckel och gör inga
modellanrop eller röstanrop till en verklig leverantör.

För vardera text och röst skapar den en isolerad riktig SQLite-databas,
loggar in genom syntetisk OAuth-provider och startar verklig app/MCP.
Den lagrar ett förslag, tar emot en ny instruktion och håller dess
syntetiska modellrespons. Sedan sätter den den enda sessionspostens
`expiresAt` till en tid strax före nu och släpper ett nytt
`propose_object`. Den väntar på att assistentgrantet stängs, kontrollerar
att det sena verktyget inte startar och att utkastet är oförändrat,
prövar en ny instruktion samt läser utkastet efter ny inloggning och
faktisk app-/databasomstart.

Resultat för båda lägena:

```json
{
  "heldBeforeExpiry": true,
  "lateProposalBlocked": true,
  "newInstructionStatus": 401,
  "priorDraftSurvivesReloginAndRestart": true
}
```

Körningen passerar. Den arrangerar utgång direkt i databasen och
prövar inte verklig åttatimmarsinloggning, cookieutgång eller det ännu
saknade slutförandeundantaget. Röstleverantören och sideband är
syntetiska; det är inget bevis för verklig mikrofon, ljudtransport,
mänsklig hörsel eller OpenAI:s stopptid.

Appens HTTP-del lämnar meddelandet att `dist/client` saknas i denna
worktree för researchen. Proben använder HTTP-API och inget byggt klient-UI;
ingen assertion eller API-del kräver katalogen.

### Befintliga fokuserade tester

Följande körning passerar med **15 tester**, 158 bortvalda, i fyra filer:

<!-- markdownlint-disable MD013 -->
```sh
npm run test:unit -- tests/unit/server/voice-lifecycle.test.ts tests/unit/server/text-assistant.test.ts tests/unit/server/conversation-message-admission.test.ts tests/unit/server/conversation-consent.test.ts -t 'restart expires the voice|cancels|revoking|logout|lost automatic save response|new authorized session finds|queued save cannot acquire|pending work stays bounded|ends a conversation|consent that is revoked'
```
<!-- markdownlint-enable MD013 -->

Kontrollerna omfattar bland annat dubletter och kökapacitet, spärr mot
att en köad sparbegäran förvärvar en annan fliks nya innehåll, utloggning,
återkallat grant eller medgivande, förlorat sparandesvar och samma
beständiga sparförsök efter ny anslutning. Röstfallet om omstart
verifierar att gamla röstsessioner upphör medan utkast och exakt
sparkvitto finns kvar. [Kötester][admission-tests],
[texttester][text-tests], [medgivandetester][consent-tests] och
[röstlivscykeltester][voice-tests].

Detta är nulägeskontroller, inte tester av en ännu oimplementerad
uppgiftsbehörighet. Ingen integrations-, real-model- eller real-voice-
suite körs. Ingen ny eller ändrad testfil i produktens testsvit behövs
för researchen; den fristående proben återges som ett researchunderlag.

`npm run lint:docs` passerar för repoets 200 Markdown-filer.
Researchkatalogen ignoreras normalt av Git och dokumentkontrollen;
därför körs dessutom uttrycklig Markdownlint och cSpell med
`--no-gitignore --file research/expired-ai-work.md --force-check`.
Båda passerar. Korrekt stavade svenska och tekniska termer finns i
researchgrenens projektordlista. `git diff --cached --check` passerar.

## Avgränsad verifiering för en senare implementation

Använd riktiga HTTP-gränser, isolerade SQLite-filer, två autentiserade
sessioner, två flikar för samma session och styrda providersvar.
Kontrollera observerbara databasresultat efter ny inloggning och omstart.
Fånga mottagandetid, uppgiftsdeadline och token-/sessionstider som
testdiagnostik med syntetiska data. Ett godkänt test av en fristående
policyfunktion ersätter inte detta gränsöverskridande prov.

<!-- markdownlint-disable MD013 -->
| Kontroll | Styrning | Krävt observerbart resultat |
| :--- | :--- | :--- |
| Mottagande före och vid absolut gräns | Håll request body eller sista validering. | Före gränsen kan registreras; vid eller efter gränsen nekas, utan klientbackdatering. |
| Textkö och dubletter | Håll första uppgiften, köa andra, repetera ID. | Samma mottagandetid; köväntan räknas; inga dubletter eller ny deadline vid dequeue. |
| Egen 30-minutersgräns | Flytta styrd serverklocka till precis före, vid och efter. | Inga nya modell-/verktygssteg vid gränsen; sena resultat förkastas och tidigare commits bevaras. |
| Samtalets token tar slut tidigare | Ta emot uppgift nära nuvarande MCP-timer. | Slutförandekontraktet förväxlar inte anslutningstid med uppgiftstid och förnyar ingen inloggning. |
| Text och röst över åttatimmars- och sjudygnsgräns | Håll modellrespons, passera sessionstid. | Samma uppgift kan lagra utkast; ny instruktion och privat resultatläsning med gammal nyckel nekas. |
| Inaktivitet i flera flikar | Typning/navigering i en flik, enbart polling i en annan. | Rätt gemensamma session påverkas; ingen annan session och ingen absolut gräns flyttas. |
| Samtidiga uppgifter | Slutför en medan en annan arbetar. | Pausen avslutas först när sista verkliga arbetet och ändliga leveransen är klara. |
| Tyst röst och heartbeat | Skicka bara poll och håll anslutningen öppen. | Ingen ny aktivitet eller obegränsad paus. |
| Sen rösttext/delegation | Fördröj och duplicera fragment på båda sidor om gränsen. | Endast beslutad avgränsad instruktion används; ingen sen sparbegäran eller nytt uppdrag. |
| Rätt innehållsägare | Två användare/hushåll samt importerad ägarbindning. | Förslag återfinns enbart i rätt beständiga utkast, även efter återinloggning. |
| Utloggning mot sen skrivning | Två DB-anslutningar/processer, barriär vid transaktion. | Efter committad spärr nekas nya uppgiftsändringar; tidigare commits bevaras. |
| Medgivande/medlemskap återkallas och återges | Håll provider-/verktygssvar, ändra revision. | Gammal uppgift återupplivas inte av nytt samtycke eller återlagt medlemskap. |
| Tokenrotation och gammal cookie | Rotera vid återkallad ihågkommen inloggning. | Gammal nyckel ger ingen allmän åtkomst; mottagen uppgift blandar inte ihop rotation och logout. |
| Logout efter naturlig utgång | Låt get-session städa raden/cookien före logout. | Rätt kvarvarande arbete kan fortfarande stoppas utan läsning, ny instruktion eller extra lagring. |
| Övergång | Spärra äldre generation medan arbete väntar. | Ingen completion-respit, även efter omstart, sen callback eller gammal cookie. |
| Utkastcommit och tappat svar | Tappa svar efter riktig commit, starta ny session. | Verkligt utkast finns; ingen falsk totalframgång eller dubbel mutation. |
| Sparbehörighet | Begär bara förslag; injicera modell-save och historiskt ja. | Ingen registrering eller gemensam ändring. Ursprungligt giltigt sparbesked ger ingen större rätt än före utgång. |
| Registrerat sparförsök | Bryt efter prepare och efter save-commit. | Samma ID, hash och innehåll återhämtas, exakt ett kvitto/historikutfall; ingen ny sparbegäran. |
| Frånkopplad leverans | Släpp textklient/WebRTC medan backend arbetar. | Inga eviga leveranspauser; lagrad data bevaras och ny instruktion nekas efter utgång. |
| Abort ignoreras av leverantör | Returnera sent trots signal. | Databasspärren stoppar ändringen; abortens kvittens är inte auktorisering. |
| Processdöd och återstart | Döda worker före/efter utkastcommit och sparregistrering. | Ingen automatisk replay eller ny tidsbudget; committade förslag och samma sparförsök går att återfinna. |
| Timer eller klocka försenas | Stoppa event loop, håll DB-lås, pröva klocksteg. | Deadline prövas vid operationens verkliga auktorisering; timerleverans är inte gränsen. |
<!-- markdownlint-enable MD013 -->

Tabellens tester är en verifieringsplan. De genomförs inte av den här
researchen. Verkligt providerstopp, produktionsproxy, WebRTC-media,
fysisk uppspelning och tillgängliga besked på mobil, dator, tangentbord
och skärmläsare behöver separata kontroller. Billable leverantörstester
kräver uttryckligt användartillstånd.

## Preciserad öppen HITL-fråga

[När är en röstinstruktion mottagen om inloggningen går ut under talet?][voice-decision]
är ett öppet beslutsärende i kartan. Nedan finns researchens underlag;
inget svar antas vara beslutat.

Frågan: Ska undantaget bara omfatta en komplett instruktion som servern
hinner avgränsa och registrera före utgång, eller ska tal som börjar
före utgång också kunna bli en uppgift när senare fragment anländer?

Rekommendation: komplett, fruset instruktionspaket före utgång.
Oavslutat tal och sena fragment får lämnas om efter ny inloggning.
Det är verifierbart utan att låta öppen mikrofon ge längre behörighet.
Det innebär samtidigt att tal nära gränsen kan behöva upprepas även
om personen börjar tala före gränsen. Den konsekvensen ska vara ett
uttryckligt produktbeslut, inte döljas bakom en antagande om två sekunders tystnad.

Alternativet behöver definiera en separat ändlig insamlingsgräns och
hur en ofullständig instruktion kan skiljas från en ny instruktion
efter utgång. Live-fragment och delegationens offset bevisar inte den
skillnaden. Researchen antar därför inte att alternativet ingår i det
tidigare produktbeslutet. Ingen HITL-resolution tas här.

Övriga luckor ovan är tekniska krav och verifiering inom redan beslutade
gränser. Återupptagning efter processdöd är inget nytt löfte i detta
underlag. Om en lösning kräver ny browserlagring, längre behandling,
större behörighet eller längre spärrlagring behöver den ändringen
återkomma som en egen produktfråga.

## Fortsatt användning av underlaget

Researchfrågan kan avslutas med länk till denna frusna rapport och en
tydlig bevisgräns. Beslutet om mottagen röstinstruktion är ett öppet
HITL-underärende som implementationsöverlämningen väntar på. Underlaget
kan samtidigt ge kommande implementation ett sammanhängande kontrakt
för mottagande, spärrar, utkast och oförändrad sparrätt.

[Är cookiehanteringens beslut och formulär redo för implementation?][handoff]
behöver fortfarande väga ihop detta med återkallelse- och
återställningsresearchen. Den här rapporten innebär inte att hela
kartan är färdig eller att de kontrakten är verifierade.

## Bilaga: komplett syntetisk nulägesprob

Filen är `research/expiry-probe.ts` när den körs. Den ingår här för
reproduktion, inte som ett tillägg till produktens testsvit.

<!-- markdownlint-disable MD013 -->
```typescript
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { request } from '@playwright/test';
import Database from 'better-sqlite3';
import { createHousehold, restartWithSession, signIn } from '../tests/support/client.js';
import { approvedForVisit } from '../tests/support/conversation.js';
import { createInstallation } from '../tests/support/installation.js';
import { liveProvider } from '../tests/support/live-provider.js';
import { modelTool, textModel } from '../tests/support/text-model.js';

async function until(predicate: () => boolean | Promise<boolean>) {
  const deadline = Date.now() + 7000;
  while (!(await predicate())) {
    assert(Date.now() < deadline, 'Bounded probe wait exceeded');
    await pause(20);
  }
}

for (const mode of ['text', 'voice']) {
  let release: (value: unknown[]) => void = () => {};
  let held = false;
  let reachedTool = false;
  const model = textModel(() => new Promise<unknown[]>((done) => {
    held = true;
    release = done;
  }));
  const live = liveProvider();
  const app = await createInstallation(undefined, {
    modelFetch: model.provider,
    liveFetch: live.provider,
    liveSideband: live.attach,
    observe(event) {
      if (event.kind === 'mcp_started' && event.data?.name === 'propose_object')
        reachedTool = true;
    },
  });
  let browser = await request.newContext();
  const db = new Database(join(app.directory, 'skyttel.db'));
  try {
    await signIn(browser, app.origin);
    const created = await (await createHousehold(browser, app.origin)).json();
    const base = `${app.origin}/api/households/${created.household.id}`;
    const post = (path: string, data: unknown = {}) => browser.post(path, {
      headers: { origin: app.origin }, data,
    });
    const before = await (await browser.get(`${base}/map`)).json();
    const typeId = before.types[0].id;
    const proposal = await post(`${base}/map/draft`, {
      id: 'durable-before-expiry', version: 0, contentVersion: 1,
      baseRevision: null, value: { typeId, name: 'Syntetisk cykel', description: '' },
    });
    assert.equal(proposal.status(), 200);
    const started = await post(`${base}/text-assistant`, approvedForVisit);
    assert.equal(started.status(), 201);
    const session = await started.json();
    const path = `${base}/text-assistant/${session.id}`;
    if (mode === 'text') {
      const admitted = await post(`${path}/messages`, {
        revision: 0, draftVersion: 1, contentVersion: 1,
        requestId: 'before-expiry', text: 'Lägg till en syntetisk hjälm.',
      });
      assert.equal(admitted.status(), 202);
    } else {
      const voice = await post(`${path}/voice`, {
        sdp: 'synthetic-offer', revision: 0, draftVersion: 1, contentVersion: 1,
      });
      assert.equal(voice.status(), 201);
      const id = [...live.channels.keys()][0];
      live.emit(id, {
        type: 'session.input_transcript.delta', event_id: 'input-before-expiry',
        delta: 'Lägg till en syntetisk hjälm.', start_ms: 0, end_ms: 100,
      });
      live.emit(id, {
        type: 'session.delegation.created', event_id: 'delegation-before-expiry',
        offset_ms: 100,
        delegation: { id: 'task-before-expiry', type: 'delegation', target: 'client' },
      });
    }
    await until(() => held);
    const unchanged = await (await browser.get(`${base}/map`)).json();
    // Arrange expiry directly, without waiting eight hours or changing the clock.
    assert.equal(db.prepare('SELECT COUNT(*) n FROM session').get().n, 1);
    db.prepare('UPDATE session SET expiresAt = ?').run(Date.now() - 1);
    release([modelTool('propose_object', {
      id: 'must-not-appear-today', version: 1, contentVersion: 1,
      baseRevision: null, value: { typeId, name: 'Sen hjälm', description: '' },
    })]);
    await until(() => db.prepare('SELECT COUNT(*) n FROM assistant_connection').get().n === 0);
    assert.equal(reachedTool, false);
    const row = db.prepare('SELECT changes FROM map_draft WHERE householdId = ?').get(created.household.id);
    assert.deepEqual(JSON.parse(row.changes), unchanged.draft.changes);
    assert.equal((await post(`${path}/messages`, {
      revision: 1, draftVersion: 1, contentVersion: 1,
      requestId: 'after-expiry', text: 'Ny instruktion.',
    })).status(), 401);
    await signIn(browser, app.origin);
    assert.deepEqual((await (await browser.get(`${base}/map`)).json()).draft, unchanged.draft);
    browser = await restartWithSession(browser, () => app.restart());
    assert.deepEqual((await (await browser.get(`${base}/map`)).json()).draft, unchanged.draft);
    console.log(JSON.stringify({ mode, heldBeforeExpiry: held,
      lateProposalBlocked: !reachedTool, newInstructionStatus: 401,
      priorDraftSurvivesReloginAndRestart: true }));
  } finally {
    release([]);
    db.close();
    await browser.dispose();
    await app.close();
  }
}
```
<!-- markdownlint-enable MD013 -->

## Källor

Alla Skyttel-länkar nedan är till den undersökta, oföränderliga
versionen om inget annat anges. Produktbesluten finns i namngivna
resolutioner, inte i denna rapports sammanfattning.

[ticket]: https://github.com/viscalyx/skyttel/issues/422
[map]: https://github.com/viscalyx/skyttel/issues/27
[limits]: https://github.com/viscalyx/skyttel/issues/416#issuecomment-6176577860
[transition]: https://github.com/viscalyx/skyttel/issues/420#issuecomment-6198342920
[retention]: https://github.com/viscalyx/skyttel/issues/419#issuecomment-6198194078
[rotation-decision]: https://github.com/viscalyx/skyttel/issues/417#issuecomment-6190546347
[rotation-research]: https://github.com/viscalyx/skyttel/issues/432
[backup-research]: https://github.com/viscalyx/skyttel/issues/434
[handoff]: https://github.com/viscalyx/skyttel/issues/414
[voice-decision]: https://github.com/viscalyx/skyttel/issues/437
[auth-research]: https://github.com/viscalyx/skyttel/blob/98dda0ff691fc60700e5e778a50e92e9d2df9ab1/research/remembered-login.md
[lock]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/package-lock.json
[text-auth]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/text-assistant.ts#L159-L180
[text-admission]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/text-assistant.ts#L1696-L1783
[text-save]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/text-assistant.ts#L1200-L1260
[text-model]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/text-assistant-model.ts
[mcp]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/text-assistant-mcp.ts
[mcp-route]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/assistant-routes.ts#L198-L209
[voice]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/voice-assistant.ts
[voice-work]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/voice-work.ts
[commentary]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/voice-commentary.ts
[capacity]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/conversation-capacity.ts
[domain]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/map.ts#L55-L164
[domain-save]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/map.ts#L805-L960
[owner]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/content-identities.ts
[schema-owner]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/migrations/015_content_maintenance.sql
[database]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/database.ts#L26-L47
[operations]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/map-operations.ts
[save-check]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/save-check.ts
[consent-route]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/conversation-consent-routes.ts
[client-app]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/client/App.tsx#L49-L99
[client-conversation]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/client/use-conversation.ts#L520-L558
[client-voice]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/client/use-voice.ts#L434-L459
[client-transport]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/client/voice-transport.ts#L88-L125
[adr-save]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/docs/adr/0005-utkast-sparas-samlat.md
[adr-mcp]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/docs/adr/0004-gemensam-mcp-ingang.md
[save-decision]: https://github.com/viscalyx/skyttel/issues/213#issuecomment-5969467534
[ownership-tests]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/tests/unit/server/assistant-ownership.test.ts
[admission-tests]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/tests/unit/server/conversation-message-admission.test.ts
[text-tests]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/tests/unit/server/text-assistant.test.ts
[consent-tests]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/tests/unit/server/conversation-consent.test.ts
[voice-tests]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/tests/unit/server/voice-lifecycle.test.ts#L478-L516
[sdk-live]: https://github.com/openai/openai-node/blob/bc6c0bfb70f253d5caa3f335699e9713ea9067b5/src/resources/live/live.ts
[ba-session]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/session.ts
[ba-signout]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/sign-out.ts
[live-sessions]: https://developers.openai.com/api/docs/guides/live-conversations
[live-delegation]: https://developers.openai.com/api/docs/guides/live-delegation
[live-sideband]: https://developers.openai.com/api/reference/resources/live/sideband-websocket
[function-calling]: https://developers.openai.com/api/docs/guides/function-calling
[background]: https://developers.openai.com/api/docs/guides/background
[mcp-lifecycle]: https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle
[mcp-auth]: https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
[sqlite-isolation]: https://sqlite.org/isolation.html

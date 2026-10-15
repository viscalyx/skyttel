# Begränsad förlängning för en påbörjad röstuppgift

Research för
[Hur verifieras den begränsade förlängningen för en påbörjad röstuppgift?][ticket].
Läsare är den som beslutar om röstens återstående produktgräns och senare
utformar eller granskar implementationen. Underlaget avser Skyttel
`8f86c81dbe8f4007e93973f6735a47c409397ff5` och källkontroll samt syntetiska
körningar 2026-10-15. Ingen produktionsfil ändras och ingen verklig extern
leverantör anropas; verklig appkod körs med syntetiska externa leverantörer.

## Slutsats

Det fullständiga kontraktet kan **inte verifieras med dagens röstflöde**.
Två oberoende informationsluckor kvarstår: att belägga faktisk talstart
före utgång när signalen anländer sent, och att skilja fortsättningen på
den instruktionen från en ny instruktion eller sparbegäran. GPT-Live ger
inget säkert slut på användarens tur. En oföränderlig textsnapshot visar
bara vad som samlas in, inte att resten av instruktionen är mottagen.
[Live-definitionerna][sdk], [OpenAI om transkript][live-sessions] och
[lokal insamling][work].

Åtta syntetiska prober passerar. Sju anropar verklig `voiceWork` med
kontrollerad tid och visar konkreta begränsningar. En app-prob visar att
dagens sessionskontroll stoppar sen insamling, nekar nya anrop med 401
och bevarar tidigare utkast vid ny inloggning och omstart. **Godkända
prober betyder här att begränsningarna reproduceras**, inte att det nya
slutförandeundantaget fungerar.

Det övriga kontraktet kan beskrivas villkorligt: separat uppgiftsrätt,
samma absoluta deadline genom alla steg, atomiska spärrkontroller och
leverans som inte ger allmän åtkomst eller förlänger en cookie. Det löser
inte informationsluckorna. Ett nytt HITL-beslut behövs före
[Är cookiehanteringens beslut och formulär redo för implementation?][handoff];
frågan preciseras nedan.

## Beslut och bevisnivå

[När är en röstinstruktion mottagen om inloggningen går ut under talet?][decision]
har företräde framför tidigare röstvillkor: tal före ordinarie utgång
ska få avslutas och utföras utan ett extra bekräftelsesteg. Hela kedjan
inklusive leverans har högst 30 minuter **från talstart**. Följdfrågan
avslutar undantaget efter leverans; dess svar kräver ny inloggning.
Frånkoppling ger ingen väntetid för återanslutning eller läsning.

[Vilka tidsgränser och lagringsval ska gälla under en pågående inloggning?][limits]
gäller i övrigt: vanlig inloggning
har åtta timmars absolut gräns och 30 minuters inaktivitet; ihågkommen
har högst sju dygn. Sessionens flikar delar aktivitet. Pollning, fokus,
tyst mikrofon och heartbeat räknas inte. Verkligt AI-arbete och ändlig
leverans pausar inaktivitet, aldrig den absoluta gränsen.

[Hur länge ska uppgifter om ihågkommen inloggning sparas på servern?][retention]
och
[Hur ska befintliga sessioner utan aktivt lagringsval hanteras vid övergången?][transition]
gäller fortfarande. Underlaget inför ingen ny historik över lagringsval, ingen
ny identifierare i webbläsaren och ingen ny beständig samtalshistorik.
[Det tidigare frysta AI-underlaget][previous] är en jämförelsekälla;
dess gamla mottagningsgräns återanvänds inte som produktkrav.

- **Kodbelägg:** frusen appkod, låsfil och installerade paket.
- **Källbelägg:** officiella OpenAI-, MCP-, SQLite-, W3C- och
  HTML-specifikationer; publika dokument läses 2026-10-15.
- **Körbevis:** endast proberna och befintliga tester som namnges nedan.
- **Villkorligt förslag:** framtida mekanismer och kontroller; varken
  produktbeslut, färdig implementation eller verifierad säkerhet.

## Versionsbundet nuläge

[Låsfilen][lock] binder OpenAI SDK 7.30.1, Better Auth och
OAuth-provider 1.7.7, MCP SDK 1.32.1, better-sqlite3 13.0.3 och ws 8.22.0.
OpenAI-taggen `v7.30.1` pekar vid källkontroll på
`bc6c0bfb70f253d5caa3f335699e9713ea9067b5`.
`git hash-object node_modules/openai/src/resources/live/live.ts` ger
`2f023171b7fa37029e97b61b2cbd031553c3e618`, samma som det tidigare
underlaget. MCP:s installerade `types.js` anger senaste protokoll
`2025-11-25` och fallback `2025-03-26`. Förhandlad version registreras
inte av denna probe; den måste fångas i en framtida kontraktskontroll.
SDK-versionen fryser inte leverantörens modell eller serverbeteende.

[Röstskapandet][voice] använder Live med WebRTC, serverns sideband,
klientdelegering och `store: false`. Ljudet går från webbläsaren till
leverantören; Skyttel mäter inte själv de inkommande ljudpaketen.
[Klientens ljudmätare][transport] mäter amplitud var 100 ms och
rapporterar `microphoneActive` genom [pollning][client-voice].
[Serverns pollroute][voice] tar emot klientens booleska uppgift och
uppdaterar heartbeat. Detta är användbart flödesunderlag, inget
oberoende serverbevis för fysisk talstart eller mänskligt tal.

SDK:n beskriver input som fragment utan fullständig tur eller
transcript-done. Officiella OpenAI-dokument anger ungefärliga intervall
på sessionens tidslinje och ojämn leverans. Delegeringens `offset_ms`
innehåller inte instruktionens text och markerar inte att användaren
talar klart. Mute har en separat kvittens, men dokumentationen ger inget
löfte om att alla tidigare transkript är levererade då.
[SDK][sdk], [transkript][live-sessions], [delegering][live-delegation].
Äldre Realtime-kommandon tillhör ett annat protokoll och får inte antas
finnas i detta Live-flöde.

[Insamlingen][work] väntar medan mikrofonen anges aktiv eller mindre än
två sekunder går från senaste fragmentet. Samma `event_id` och
`delegation.id` dedupliceras inom den processlokala röstinstansen.
Ingen återstartsbeständig eller sessionsövergripande deduplicering
finns här. Samma text med nytt event-ID räknas som ny text; att deduplicera
på text vore också fel när personen faktiskt upprepar sig.
Delegeringens offset prövar att något tidigare fragment finns; den
efterföljande insamlingen tar alla väntande fragment.

## Talstart: vad servern kan och inte kan veta

Låt `E` vara serverns ordinarie utgång, `S` faktisk talstart och `R` tiden
då servern tar emot första belägget. Ett klientfält `startedAt < E`
bevisar inte `S < E`: klientklockan kan avvika eller manipuleras och en
sen begäran kan backdateras. Heartbeat eller en förhandsreservation
bevisar inte att någon talar. En gammal aktiv mikrofon ger inget löpande
undantag. Återanslutning får inte återanvända ett gammalt startfält för
att skapa ny uppgift.

Två historier kan vara likadana för servern vid `R > E`: legitimt tal
som börjar före `E` men fördröjs i nätet, och tal som börjar efter `E`
med samma klientuppgift. Utan ett trovärdigt tidsankare och en uttrycklig
felmarginal kan servern inte alltid godkänna det första och neka det
andra. Detta är en slutsats av tillgänglig information, inget utfört
nätverkstest eller påstående om ett providerfel.

Att servern tar emot ett trovärdigt talbelägg före `E` är en möjlig
konservativ registreringsregel. Den ändrar dock det bekräftade löftet
för tal som bara når servern efter `E`. Första transkriptets mottagning
plus 30 minuter är dessutom fel deadline: fördröjningen ger längre än
30 minuter från faktisk talstart. Leverantörens ungefärliga offset plus
serverns sessionstid är inte ett verifierat exakt tidsankare.

Ett nytt ljudflöde genom servern kan ge serverobserverat första ljud
och sekvensordning, men nätfördröjning mellan fysisk talstart och server
kvarstår. Ljudenergi skiljer inte säkert tal från brus. En tidsstämpel
med felintervall `[Smin, Smax]` kan ge konservativ deadline
`Smin + 30 minuter`; säkert godkännande före utgång kräver
`Smax < E`. Det förkortar tiden och kan avvisa legitima gränsfall.
Det är ett tänkbart underlag för ett produktval, ingen redan beslutad
regel eller verifierad transport.

## Instruktionsgräns: konkreta motexempel

Följande två historier delar först samma serverobservationer:

1. Vid `E - 500 ms` anländer fragmentet **Spara**, sedan en delegering.
2. Under mer än två sekunder anländer inget nytt fragment; klienten
   rapporterar ingen aktuell mikrofonaktivitet.
3. I historia A är instruktionen klar. I historia B säger användaren
   **inte. Läs bara utkastet.** som fortsättning, men transkriptet dröjer.

Vid steg 2 har exekveraren samma information i båda historierna.
Kör den en mutation nu kan den utföra motsatsen till hela instruktionen
i B. Väntar den längre kan ett ännu senare fragment fortfarande ändra
innebörden. Ingen vald tystnadstid ger bevis för komplett mottagande.
Trettiominutersgränsen begränsar väntan, men gör inte den mottagna
instruktionen komplett. Att frysa texten efter två sekunder löser inte
detta. Den första insamlingsproben reproducerar prefixdispatch före
den sena rättelsen; dess stub utför ingen databasmutation eller sparning.

Ett andra par historier har samma observerade text **Läs utkastet. Spara
sedan allt.** och samma ungefärliga fragmentintervall. Antingen hör
allt till den påbörjade instruktionen, eller är sparbegäran en ny
instruktion efter `E`. Fragmenten har inget säkert tur-ID. En modell
som gissar avsikten tillför inget autentiseringsbevis. Den andra proben
visar att nuvarande insamling sammanfogar sådan text. Dagens yttre
sessionskontroll nekar senare HTTP-arbete; proben påstår därför inte
att dagens app tillåter obehörigt sparande efter utgång.

Samma problem gäller en rättelse av belopp, objekt eller mottagare,
en sent tillagd uttrycklig sparbegäran och en tidig delegering mitt i
ett ord. Ett uttryckligt **spara inte** får inte bli sparauktorisering
genom ett fruset tidigare **spara**. Att neka alla sena sparord löser
inte heller beslutet: en legitim fortsättning kan innehålla dem.

För säkert slutförande behövs ett verifierat slut på det tillåtna
indatafönstret **och** bevis för att hela det fönstrets indata har
levererats. Därefter kan ett fruset instruktionspaket fungera som
auktoriseringsunderlag. En lokal paus, mute-kvittens, modellens svar
eller godtycklig textlikhet visar inte båda egenskaperna.

## Villkorligt kontrakt för återstående kedja

Detta gäller först när produktvalet ger en verifierbar talstart och
instruktionsgräns. Det får inte implementeras som ett tyst byte tillbaka
till krav på komplett instruktion före ordinarie utgång.

### En uppgift, samma tid, separata rättigheter

Registrera serverns uppgift under giltig ursprunglig inloggning och bind
den till samma aktör, hushåll, innehållsägare, innehållsgeneration och
medgivande. Inmatningen går från insamling till verifierat avslutad
instruktion innan mutationer eller sparauktorisering används. Tidig
delegering kan förbereda arbete, men får inte göra en ofullständig
instruktion till slutlig behörighet. Förberedande modell- och
verktygsarbete måste ha samma uppgiftsgräns och spärrkontroller.

Sätt `D = verifierad talstart + 30 minuter` exakt en gång. Tal,
transkript, kö, modell, verktyg, eventuell registrering av sparförsök,
databascommit och leverans delar `D`. Varje tillåtet steg kräver
`serverNow < D`; ett utgånget köelement får inget modellanrop.
Dequeue, återförsök, sena fragment, dubletter och återanslutning
återanvänder uppgiften och dess tid. Även om en timer försenas får nästa
behörighetskontroll inte godkänna nytt arbete. Ett återförsök har timeout
högst återstående tid, aldrig en ny 30-minutersperiod.

Flera flikar med samma session får inte anta samma pågående instruktion
som var sin ny uppgift. Bind en registrerad insamling till dess befintliga
röstanslutning och serveridentitet; en klientvald uppgiftsnyckel räcker
inte. Konkurrerande registreringar behöver en atomisk kontroll och
deduplicering under sessionen. Nya självständiga instruktioner efter
`E` nekas även om de anländer över en redan öppen anslutning.

[Dagens backend][voice] återanvänder ursprunglig Cookie för vanliga
textanrop, och [textens guard][text] kräver giltig sessionsrad.
[MCP-anslutningen][mcp] använder ett vanligt OAuth-grant med
`skyttel:read skyttel:write` och en lokal timer på högst 1800 sekunder
från anslutningen. Den kan ta slut före `D` och är inte en behörighet för
en enda uppgift. Att bara ta bort sessionskontrollen gör grantet för brett.

Ett framtida serverinternt uppgiftsgrant behöver binda varje MCP-anrop
till den registrerade instruktionen, tillåtna verktyg och ursprunglig
deadline. Ingen browserroute får välja den vägen genom ett eget
headerfält. MCP:s resurs- och tokenvalidering gäller fortfarande;
gemensam MCP-ingång och domänregler bevaras.
[MCP-auktorisering][mcp-auth], [gemensam ingång][adr-mcp].
Tokenets tekniska livslängd kan täcka uppgiftens återstående tid, men får
inte ge nya instruktioner, refresh-rätt eller allmän browseråtkomst.

### Cookieutgång och leverans

Allmän åtkomst stoppas vid `E` av servern även om en gammal cookie finns.
Ingen beständig cookie förlängs, återutfärdas eller omvandlas till en ny
inloggningsperiod för uppgiften. Better Auth kan både radera utgångna
sessioner och förnya sessionsrader vid hämtning; undantaget får därför
varken bero på att utgången sessionsrad finns kvar eller acceptera dess
nya utgång som ny produktdeadline. Utloggning är en separat spärrorsak,
inte samma sak som naturlig radgallring.
[Lokal authkonfiguration][auth], [sessionroute][ba-session],
[utloggning][ba-signout].

För leverans kan en före `E` autentiserad, redan öppen anslutning vara
bunden till endast den registrerade uppgiftens slutresultat eller
följdfråga. Den får varken utföra nya kommandon eller läsa annat innehåll.
En befintlig Live-anslutning kan ta emot serverns svar, men dess kvittens
är inte säker leverans av exakt hela svaret till användaren.
[Svarskedjan][commentary] och [klientens kvittensheuristik][client-voice].

Ett möjligt tekniskt alternativ är en uppgiftsbunden ström som öppnas med
befintlig autentisering före `E`, levererar exakt samtalstext och stängs
efter ett ändligt leveransförsök. Detta kräver ingen ny cookie eller ny
hemlighet i webbläsaren. Det är en utredningsbar mekanism, ingen
implementerad garanti. En ny allmän pollroute efter cookieutgång får
inte öppnas. Vid bruten anslutning ges ingen ny anonym återanslutningsrätt;
användaren loggar in igen för fortsatt åtkomst.

Normalt avslut kräver färdig uppgift, verifierad lagring där sådan ingår
och levererat slutligt svar. En följdfråga levereras och avslutar
undantaget utan att samla in svaret. Efter `E` måste automatisk
uppsamling av svar i `voiceWork.collectReply` vara spärrad. Leverans får
inte vänta på läskvitto eller att någon lyssnar. Vid frånkoppling kan
arbete slutföras inom `D`, men slutresultatet får inte skapa en väntan
på ny anslutning. Leveransfel avslutar leveransförsöket och undantaget;
redan lagrat utkast eller sparkvitto påverkas inte.

Transportkvittens, mottagen fullständig text, uppspelat ljud och läst
eller förstått svar är skilda bevisnivåer. Live-dokumentationen och
nuvarande kod ger inte säker fullständig ljudslutmarkör. Om produktlöftet
kräver att hela röstsvaret spelas upp behöver det ingå i samma
HITL-fråga om verifierbar gräns och reservutfall. Det får inte ersättas
med en textmatchning plus en paus utan ett uttryckligt beslut.

### Beständighet, samtidighet och omstart

[Utkastet][domain] lagras i `map_draft` för rätt innehållsägare och
hushåll. Innehållsägare måste lösas via [aktörens befintliga bindning][owner],
inte antas vara samma ID som autentiserad användare. Efter framgångsrik
commit kan förslaget beskrivas som beständigt i ditt utkast; modellens
text eller klientens minne räcker inte. Ny inloggning ska öppna samma
utkast. Registrerade sparförsök och sparkvitton följer
[befintlig återhämtning][operations]; inget nytt automatiskt omsparande.

Behörighetskontroll måste ske i samma omedelbara transaktion som ändrar
utkastet eller registrerar ett nytt sparförsök: rätt uppgift och status,
`now < D`, oförändrad medgivanderevision, sessionsspärr och
installationsgeneration samt aktuellt medlemskap, innehållsägare,
innehållsgeneration och utkastversion. [Nuvarande domänguard][domain]
kontrollerar inte alla dessa framtida villkor. Återkallelse och skrivning
ska ordnas genom samma databasgräns; SQLite tillåter en skrivare åt
gången och `BEGIN IMMEDIATE` låser före transaktionens läsningar.
[SQLite][sqlite], [databaskonfiguration][database].

Om spärren committas först nekas efterföljande mutation; om mutationen
committas först är resultatet redan lagrat och bevaras. Utloggning,
återkallat medgivande, borttaget medlemskap och beslutad övergång stoppar
nästa steg direkt. Borttaget och sedan återlagt medlemskap eller
medgivande får inte återuppliva gammalt arbete; jämför revision, inte
bara nuvarande existens. En processlokal AbortController är hjälp för
resursstädning, inte den beständiga säkerhetsgränsen.

Kontrollera tid efter varje väntan, före varje modell- och verktygsanrop,
vid inkommande svar och i skrivtransaktionen. Hård realtid för fysisk
commit eller paketleverans kan inte lovas om operativsystemet pausar
processen. Kontrollerna ska visa att inget nytt steg auktoriseras vid
eller efter gränsen och att pågående arbete avbryts så snart det går.

Kortaste lagring uppnås genom att inget modellarbete återupptas efter
processdöd: markera gamla aktiva försök avbrutna före servern tar emot
trafik igen, bevara committade utkast och återhämta redan registrerade
sparförsök. Detta föreslår ingen ny framgångsgaranti efter omstart.
Processgeneration eller annan beständig spärr behöver säkerställa att
en sen callback från gammal process aldrig kan återöppna uppgiften.
En rad som saknas ska alltid neka uppgiftsrätt. Återställning från backup
följer [det separata beslutet om ogiltigförklaring][retention], inte en
ny röstspecifik backupfunktion.

## Minsta uppgifter och kortaste livscykel

Följande är funktionella behov, ingen beslutad ny datamodell:

- Referens till befintlig inloggningssession, aktör, hushåll,
  innehållsägare, innehållsgeneration och befintlig samtals-/uppgiftsidentitet.
- Talstartens belägg och felmarginal, oföränderligt `D`, tillstånd samt
  vilka indata som tillhör den registrerade insamlingen.
- Versionsankare, avgränsad instruktion när den är komplett, tillåtna
  verktyg och eventuell redan härledd uttrycklig sparauktorisering.
- Spärrrevisioner för session, medgivande, åtkomst och installation samt
  endast nödvändiga referenser till befintliga sparförsök och kvitton.

Återanvänd befintliga serveridentiteter där deras livscykel räcker.
Ett framtida behov av ny identifierare eller hemlighet måste redovisas
med ändamål, åtkomst och gallring; denna research godkänner det inte
genom ett antaget schema. Ingen IP-adress, profilidentifierare, historik
över lagringsval eller ny browsernyckel behövs för det beskrivna förslaget.

Transkript, ljud, svar och instruktionshash behöver inte bli beständiga
bara för undantaget. Arbetsminnet kan rensas vid avslut eller avbrott;
det ger ingen återupptagning av samtal efter processdöd. Minimala
operativa rader kan raderas när uppgiften är terminal och samtliga
refererande token/försök är ogiltiga, senast efter `D` för just
uppgiftsrätten. Kortare terminal livstid är möjlig om frånvaro nekar.
Inget krav här motiverar att behålla dem sju dygn som standard.

En sessionsspärr som också skyddar äldre OAuth-försök kan behöva leva
längre än röstuppgiften. Röstuppgiftens behov upphör senast vid `D`;
den får inte förnya denna andra spärrs tid. Separat sessions-/försöksgallring
sker inom 24 timmar efter avslut enligt [lagringsbeslutet][retention].
Särskild spärrinformation har högst sju dygn från återkallelse/utloggning
och gallring inom ytterligare 24 timmar, men bara så länge nödvändigt.
Ett ändringsutfalls 24-timmars kontrollfönster, vanliga utkast och
sparkvitton är egna ändamål och får inte raderas som röstmetadata.

Efter ny inloggning går det att återfinna det beständiga utkastet och
befintliga sparutfall enligt respektive flöde. Enbart processlokalt svar
eller följdfråga kan försvinna med det avslutade samtalet. Ingen ny
beständig samtalstext eller garanti att återfinna frågan införs här.
Om användaren ska kunna återfinna just frågan krävs ett produktbeslut
om den lagringen; det följer inte av att utkastet är beständigt.

## Förvarning: beräkning och tillgänglighet

Följande är ett villkorligt genomförande av beslutade varningstider,
inte en körverifierad banner. Servern ger den tillämpliga gränsen och
dess revision. För vanlig inloggning är ordinarie utgång
`E = min(absolut utgång, inaktivitetsutgång)` när inaktivitet löper.
Under giltigt aktivt arbete är inaktiviteten pausad; då styr den
absoluta gränsen. För ihågkommen inloggning gäller bara dess absoluta
gräns. När sista verkliga arbetet och leveransen avslutas börjar en ny
30-minutersperiod; en tyst mikrofon eller fastnad kö får inte simulera
arbete. Flera uppgifters aktiva intervall räknas som en union.

Visa ordinarie banner när `E - 5 minuter <= serverNow < E`. Om en
handling ändrar inaktivitetsutgång eller ett återkallat lagringsval
förkortar absoluta tiden beräknas den om. Den gamla bannern uppdateras
eller tas bort. Efter `E` med godkänt skyddat arbete visas beskedet om
att bara pågående uppgift får bli klar. Visa särskild slutvarning när
förlängning pågår och `D - 1 minut <= serverNow < D`. Den får inte utlova
att uppgiften lyckas. Vid `D` avbryts undantaget och utgångsbeskedet
ersätter förvarningen. Finns flera godkända uppgifter behöver bannern
visa den närmaste relevanta gränsen utan att dölja övriga avbrott.

Klienten kan använda serverns tid och en monoton lokal klocka för att
rita en nedräkning, men serverkontrollen är auktoritativ. Efter fokus,
återställd sida eller nätåterkomst hämtas aktuella gränser innan arbete
åter tillåts. Fokusförändringen är inte aktivitet. Om mindre än fem
minuter respektive en minut återstår visas bannern genast med verklig
återstående tid. Om tiden redan löper ut visas utgången; ingen ny minut
ges. [HTML-timers][timers] garanterar inte exakt schemaläggning.
Bakgrundsflikar kan därför inte garanteras att presentera varning exakt
vid tröskeln; kort återstående tid efter återkomst ska hanteras ärligt.

Bannern ligger kvar utan automatisk fokusering. Använd en semantisk
statusyta och en begränsad, artig live-region för förändrat besked,
inte en sekundvis upprepning. En inloggningskontroll måste vara nåbar
med tangentbord och fokus ska vara synligt och inte täckas av bannern.
Förmedla gränsen som text, inte bara färg eller ljud.
[WCAG 2.2][wcag], särskilt 2.1.1, 2.4.3, 2.4.7, 2.4.11 och 4.1.3.

I röstläge köas en separat kort uppläsning till nästa lämpliga paus;
ta bort en inaktuell köad varning när gränsen ändras. Den får inte
avbryta användarens tal och dess ljud eller transkript får inte uppdatera
användaraktivitet, öppna uppgift eller skapa sparauktorisering. Om ingen
paus kommer innan utgång gäller gränsen ändå; bannern ligger kvar.
Nuvarande amplitud- och pausbedömning är ingen verifierad garanti att
uppläsningen aldrig avbryter tal. Det kräver manuella talfall och en
uttrycklig hantering av osäkert pausläge. Fem minuters förvarning visar
inte ensamt WCAG-efterlevnad: 2.2.1 om tidsgränser och eventuella
undantag måste bedömas för hela återinloggningsflödet och bevarat arbete.

## Utförda syntetiska kontroller

Proberna finns i [insamling](voice-task-extension/collection.probe.ts),
[app och utgång](voice-task-extension/expiry.probe.ts) samt
[separat konfiguration](voice-task-extension/vitest.config.ts).
Kör från researchgrenens rot med befintliga låsta beroenden:

```sh
npm run test:env -- vitest run \
  --config research/voice-task-extension/vitest.config.ts --reporter verbose
```

Körningen använder repositoryts delade processlås. `node_modules` är
en lokal symlänk till den redan installerade katalogen i arbetsytan;
den ingår inte i grenen. Inga verkliga API-nycklar eller leverantörer
används. Testhjälparen ersätter externa identitets-, modell- och
röstleverantörer medan app och SQLite körs lokalt. Samtalsskapandet
genomför verklig lokal OAuth-registrering, authorize/consent/token,
MCP-initialisering, verktygslistning och `read_my_draft`.
Efter utgång når inget modellarbete eller nytt uppgiftsbundet
MCP-verktygsanrop fram. Framtida uppgiftsauktorisering i MCP verifieras
alltså inte av denna körning.

Resultat: **2 filer, 8 prober passerar, 3,52 sekunder** vid omkörning
efter formatering.

1. Prefixet **Spara** skickas vidare efter 2100 ms; den senare rättelsen
   **inte** ändrar inte den redan skickade begäran.
2. Ett nytt fragment efter den tänkta ordinarie gränsen sammanfogas
   med den tidigare väntande instruktionen, inklusive nya sparord.
   Själva funktionen har ingen ordinarie sessionsdeadline som indata.
3. Samma event-ID och delegerings-ID konsumeras bara en gång inom
   den aktuella insamlingen.
4. Samma text med olika event-ID sammanfogas två gånger.
5. Aktiv mikrofon och delegering utan transkript skapar inget backendjobb.
6. Delegeringens tidiga offset utesluter inte ett senare väntande fragment.
7. `retire` under insamling förhindrar senare backendjobb.
8. App-proben tar emot talprefix och delegering under giltig session,
   arrangerar sessionsutgång direkt i SQLite och ger ett sent suffix.
   Inget modellanrop sker. Ny instruktion och röstpollning får 401.
   Ett tidigare beständigt utkast återfinns efter ny inloggning och
   efter appomstart med ny inloggning.

Första sju proberna använder falsk tid och anropar riktig insamlingskod
med stubbat backendutfall. De bevisar inga ljudegenskaper, ingen faktisk
sparning och inget fungerande slutförande efter utgång. App-proben
arrangerar sessionsutgång; den väntar inte åtta timmar och verifierar
inte det framtida sessionsvalet eller fullständig gallring.
Körningen ger förväntad logg om avbruten röst och varning om att
`dist/client` saknas; ingen klient eller browserlayout behövs för proben.

Dessutom passerar **13 befintliga tester i tre filer, 12,30 sekunder**:

```sh
npm run test:unit -- \
  tests/unit/server/voice-input-collection.test.ts \
  tests/unit/server/voice-task-integrity.test.ts \
  tests/unit/server/voice-save-delivery.test.ts
```

De täcker befintlig insamling, uppgiftsintegritet och leverans av
sparutfall inom nuvarande regler; de verifierar inte det nya undantaget.
Researchens avgränsade kvalitetskontroll kör Markdownlint på noten,
cSpell med projektets ordlista och researchens tillägg samt Biome på
stödmaterialet. Ordlistan tillför korrekt svensk och teknisk terminologi.
Konfigurationerna ändrar inte produktens kontroller.

```sh
npm run test:env -- node research/voice-task-extension/check-artifacts.mjs
```

## Vad som återstår att verifiera

En framtida implementation behöver syntetiska kontraktskontroller för
talstart strax före/på/efter `E`, klientklockor, fördröjda och omordnade
fragment, återanslutning, dubblering i andra flikar och helt tyst input.
Samma tester ska visa att en verifierad tid aldrig ersätts av dequeue,
återförsök, ny token eller ny process. Modell-, MCP- och databasbarriärer
precis före/på/efter `D` ska visa att tal, kö och leverans delar tiden.

Parallella databasanslutningar ska pröva båda ordningarna mellan commit
och utloggning, medgivande-/åtkomståterkallelse och övergång. Ta bort och
återlägg åtkomst för att visa att revisionen hindrar återupplivning.
Stoppa processen före och efter utkastcommit respektive registrerat
sparförsök och pröva återhämtning utan automatiskt omsparande.
Kontrollera att token, Cookie, nytt allmänt GET/POST och externa
MCP-klienter saknar uppgiftsundantaget. Naturlig sessionsgallring får
inte förväxlas med en explicit spärr.

För leverans behövs exakta transportutfall: slutligt svar, följdfråga,
hel text mottagen, bruten anslutning före/efter commit och försenad
kvittens efter `D`. Säkert lagrat resultat ska överleva utan att en
olagrad fråga påstås finnas kvar. Separata kontroller behöver visa
gallring vid tidig terminal status och deadline utan återupplivning.

Syntetiska DOM-/tidkontroller kan pröva bannertrösklar, ändrade gränser,
återkomst efter lång bakgrundstid, fokusbevarande och att varningen inte
registrerar aktivitet. Verklig mikrofon, nätverk, skärmläsare,
tangentbord, mobil bakgrundssuspension och att uppläsning väntar på paus
behöver manuellt underlag. Inga sådana kontroller eller billable
modell-/röstanrop ingår i denna research. Det finns inget körbevis för
hela framtida kontraktet eller verifierad WCAG-efterlevnad.

## Minsta nödvändiga HITL-fråga

Det öppna beslutsärendet
[Vilken verifierbar gräns och vilket reservutfall ska gälla för röstundantaget?][next-decision]
samlar frågan. Inget produktval är gjort i detta underlag.

**Vilken verifierbar gräns och vilket reservutfall ska gälla för en
röstuppgift när talstart eller instruktionens slut inte kan beläggas
under det beslutade flödet?**

Det är en sammanhängande kontraktsfråga: samma avgränsning måste bära
starttid, tillåtna fragment och sparauktorisering. Två möjliga vägar
behöver diskuteras med användaren, inte väljas av agenten:

- Behåll kravet på säker avgränsning och utred ett röstflöde med
  serverförankrad tidsgräns, uttryckligt avgränsat inspelningsfönster
  och verifierat komplett indata, exempelvis en tala-medan-kontrollen-
  hålls-inne-interaktion och en färdig transkription. Detta är en ändrad
  interaktion och behöver beslutas och sedan tekniskt beläggas.
  Att släppa en talkontroll behöver inte vara en extra efterföljande
  bekräftelse, men den ersätter dagens fria talflöde och kan inte
  antas godkänd. Nätfördröjningens startgräns behöver fortfarande väljas.
- Behåll dagens fria Live-samtal och precisera ett snävare löfte vid
  osäker gräns: ingen osäkert avgränsad mutation eller ny sparauktorisering
  efter ordinarie utgång; beständiga resultat bevaras och användaren
  loggar in igen för att lämna en fullständig instruktion. Detta
  inskränker tidigare löfte om att alltid få tala klart och utföra just
  instruktionen, och kräver därför ett nytt uttryckligt produktbeslut.

En pausheuristik kan vara en medveten produktavvägning, men ger inte
den verifieringsgaranti som efterfrågas. Den får inte införas under
etiketten säker instruktionsgräns. Inte heller ett nytt bekräftelsesteg,
ny lagring av samtalstext eller förlängd cookie antas här.
Om en säker fullständig röstleverans krävs behöver samma beslut ange
reservutfallet när bara exakt textleverans kan beläggas.

## Källor

[ticket]: https://github.com/viscalyx/skyttel/issues/440
[decision]: https://github.com/viscalyx/skyttel/issues/437#issuecomment-6199589014
[limits]: https://github.com/viscalyx/skyttel/issues/416#issuecomment-6176577860
[retention]: https://github.com/viscalyx/skyttel/issues/419#issuecomment-6198194078
[transition]: https://github.com/viscalyx/skyttel/issues/420#issuecomment-6198342920
[previous]: https://github.com/viscalyx/skyttel/blob/b9fa1c9f1b170aa42af3b6eea9c5c848202ddb05/research/expired-ai-work.md
[handoff]: https://github.com/viscalyx/skyttel/issues/414
[next-decision]: https://github.com/viscalyx/skyttel/issues/442
[lock]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/package-lock.json
[sdk]: https://github.com/openai/openai-node/blob/bc6c0bfb70f253d5caa3f335699e9713ea9067b5/src/resources/live/live.ts#L830-L868
[live-sessions]: https://developers.openai.com/api/docs/guides/live-conversations
[live-delegation]: https://developers.openai.com/api/docs/guides/live-delegation
[voice]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/voice-assistant.ts
[work]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/voice-work.ts#L315-L452
[transport]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/client/voice-transport.ts#L87-L125
[client-voice]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/client/use-voice.ts
[text]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/text-assistant.ts#L159-L180
[mcp]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/text-assistant-mcp.ts
[mcp-auth]: https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
[adr-mcp]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/docs/adr/0004-gemensam-mcp-ingang.md
[auth]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/auth.ts#L20-L33
[ba-session]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/session.ts
[ba-signout]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/sign-out.ts
[commentary]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/voice-commentary.ts
[domain]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/map.ts#L55-L164
[owner]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/content-identities.ts
[operations]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/map-operations.ts
[database]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/database.ts#L26-L47
[sqlite]: https://sqlite.org/isolation.html
[wcag]: https://www.w3.org/TR/WCAG22/
[timers]: https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers

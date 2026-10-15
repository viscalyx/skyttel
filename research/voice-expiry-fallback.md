# Säker avvisning och textreserv när röstinloggningen går ut

Underlag för
[Hur verifieras säker avvisning och textreserv när röstinloggningen går ut?][ticket].
Läsare är den som slutbedömer specifikationen och senare implementerar
eller verifierar den. Kodbasen är fryst vid
`8f86c81dbe8f4007e93973f6735a47c409397ff5`. Källkontroll och syntetiska
körningar avser 2026-10-15. Produktionsimplementation ingår inte.

## Slutsats och omfattning

Det beslutade **avbrottet vid ordinarie utgång går att specificera** utan
en fortsatt allmän inloggning. Dagens fria Live-flöde belägger ingen
fullständig röstinstruktion med verifierad start och absolut gräns.
Ingen sådan Live-uppgift får därför fortsatt exekveringsrätt efter utgång.
Det är det redan beslutade reservutfallet, inte ett nytt produktval.
[Produktbeslutet][decision], [fryst föregående underlag][previous],
[versionsbunden SDK][sdk] och [lokal insamling][work].

En ändlig textreserv kan tekniskt levereras över en **före utgång
autentiserad och uppgiftsbunden kanal**. En syntetisk WebSocket-prob
visar full textleverans och rätt klients kvittens efter utgång medan en
ny anslutning nekas. Den visar en möjlig mekanism, inte en befintlig
Skyttel-funktion. Dagens pollroute, leveransmarkörer och klientens
ljudheuristik uppfyller inte hela kontraktet. Ingen produktionsklar
leveransgaranti eller verifierad tillgänglighet påstås.
[Appens röstkoppling][voice], [klientens rösthantering][client].

**En viktig gräns:** ett sparande som redan committas före utgång kan
inte göras ogjort av ett senare avbrott. En app-prob reproducerar att
prefixet **Spara** hinner sparas före ett sent **inte**, och att resultat
och sparkvitto består efter ny inloggning och omstart. Det är en belagd
begränsning i normalt Live-flöde, inte bevis för otillåtet sparande efter
utgång. Att ge generell garanti mot alla sådana prefix även under giltig
inloggning skulle kräva en större produktgräns än detta utgångskontrakt.
Underlaget inför inte den garantin och stänger inte av normalt röstläge.

## Beslut, källor och bevisnivåer

[Vilken verifierbar gräns och vilket reservutfall ska gälla för röstundantaget?][decision]
styr: osäker instruktion stoppas vid ordinarie utgång; sena fragment får
inte återuppliva arbete eller ge ny sparauktorisering. Komplett mottagen
svarstext eller följdfråga får ersätta obekräftad ljudleverans. Läsning
eller ny inloggning behöver inte inväntas. Beständiga resultat bevaras;
ny inloggning skickar inte en avvisad instruktion igen.

[De beslutade tidsgränserna][limits] och [övergångsbeslutet][transition]
gäller: absolut inloggningsgräns är skild från inaktivitet och högst
30 minuter från verifierad talstart gäller hela undantagsuppgiften.
Verkligt pågående arbete kan påverka inaktivitet, aldrig absolut tid.
Pollning, heartbeat, fokus och tyst mikrofon skapar ingen aktivitet.
[Gallring och återställning][retention] samt tidigare sparregler ändras
inte av denna research.

- **Kodbelägg:** länkar till samma frysta källcommit och installerad SDK.
- **Källbelägg:** officiella protokoll, specifikationer och dokument.
- **Körbevis:** nedan namngivna prober och fokuserade befintliga tester.
- **Villkorligt kontrakt:** föreslagna framtida kontroller. Prober av
  denna modell verifierar modellen och transportprincipen, inte appen.

OpenAI SDK är 7.30.1 och dess lokala `live.ts` har Git-blobhash
`2f023171b7fa37029e97b61b2cbd031553c3e618`, samma som det frysta
föregående underlaget. SDK-källan binds till upstreamcommit
`bc6c0bfb70f253d5caa3f335699e9713ea9067b5`.
[Låsfilen][lock], [SDK][sdk]. Officiell OpenAI-dokumentation läses
2026-10-15 och kan senare ändras; den ersätter inte fryst kodbelägg.

## Ordinarie utgång och säkert stopp

Låt `E` vara den effektiva ordinarie utgång som servern beslutar,
inklusive tillämplig inaktivitet. En verifierad undantagsuppgift måste
ha komplett instruktion, trovärdigt startbelägg och en oföränderlig
`D <= verifierad talstart + 30 minuter`. Alla kontroller använder
servertid. Klientens klocka och leverantörens ungefärliga intervall är
inte nya rättigheter. [Beslutet][decision], [tidsgränserna][limits].

Live har fragment utan turens säkra slut eller transcript-done.
Delegering kan komma mitt i insamlingen, och ojämn leverans kan bero på
nätet. Dagens två sekunders tystnad, offset och textsnapshot bevisar
inte komplett instruktion. Sidokanalens öppnande eller modellarbete
bevisar inte heller start och kompletthet.
[SDK][sdk], [officiell OpenAI-dokumentation][live-docs], [insamling][work].

Den implementerbara regeln för dagens Live är därför:

1. Vid `E` stoppas insamling och framtida delegeringar för den gamla
   inloggningen. Mikrofonens utgående ljud och providerarbetet stängs
   så snart det går; en fördröjd klienttimer får inte ge serverrätt.
2. Köade och pågående uppgifter utan komplett verifierat underlag
   förlorar rätten att starta modell-, MCP- och verktygssteg. Detta
   gäller också ett tidigare accepterat **Spara** vars sparande ännu
   inte committas. Samma regel gäller automatisk insamling av svar på
   följdfrågor. En öppen anslutning är inte ett undantag.
3. Samma kontroll krävs efter varje väntan, vid modellens resultat,
   före verktygsanrop och i skrivtransaktionen innan utkast ändras
   eller ett nytt sparförsök registreras. Enbart AbortController eller
   en schemalagd timer räcker inte som säkerhetsgräns.
4. Sena fragment, nya **spara allt**, dubbla event och nya event-ID:n
   får inte fylla på en avvisad instruktion. Återförsök och dequeue
   återanvänder samma uppgift och gräns, aldrig ett nytt tidsfönster.
5. En ny inloggning kan öppna befintligt utkast och sparåterhämtning.
   Den skapar ingen ny instruktion. Avvisat tal rensas från kö och
   automatisk återutsändning; användaren lämnar hela instruktionen igen.

Detta är ett krav på framtida implementation. Dagens yttre authkontroll
nekar redan nya HTTP-anrop efter arrangerad utgång, och en ny app-prob
visar att ett modellresultat som hålls kvar och släpps efter utgång inte får
spara. De körningarna verifierar inte framtida absoluta gränser,
inaktivitetsberäkning eller samtliga databasrace.
[Sessionguard][text], [MCP-kedja][mcp], [databasgräns][domain].

App-proberna visar avvisning när arbete når en sessions-/uppgiftsguard.
De visar inte att providerarbete utan pollning stängs exakt vid `E`.
Framtida implementation behöver därför serverägd deadline och aktiv
avbrytning av pågående providerarbete, utöver kontroller vid nästa steg.
Klienttimer eller nästa misslyckade poll är otillräckligt även för att
begränsa fortsatt extern behandling och resursförbrukning.

### Prefix före utgång är en separat gräns

Tre tidsordningar måste hållas isär:

- **Insamling vid `E`:** ingen modell startar; sena rättelser eller ny
  sparbegäran får inte rädda uppgiften. App-proben reproducerar detta.
- **Modellarbete före `E`, verktyg efter `E`:** ingen ny mutation eller
  registrering tillåts utan verifierad undantagsrätt. Den hållna
  modellproben reproducerar avvisning och bevarat utkast i dagens app.
- **Commit före `E`, rättelse efteråt:** ändringen finns redan i kartan.
  App-proben visar ett beständigt sparkvitto. Avbrottsnotisen får inte
  påstå att ingenting sparas eller att ändringen ångras automatiskt.

Ett senare **inte** kan inte reparera den sista ordningen genom ett
utgångslås. Vill man även förbjuda den ordningen generellt behöver man
besluta hur fritt tal ska ge verifierad slutlighet före varje mutation.
Inga säkra Live-markörer för det finns belagda här. Det är en möjlig
separat HITL-fråga om produktens normala röstgaranti utvidgas, inte ett
skäl att återinföra ett osäkert undantag efter `E`.

## Vilka uppgifter kan faktiskt fortsätta?

**Ingen röstinstruktion i det undersökta fria Live-flödet har här
belagd rätt att fortsätta exekveras efter `E`.** Ett redan färdigt
resultat, tidigare sparkvitto eller en tillgänglig text är inte bevis
för att dess ursprungliga röstinstruktion var komplett. De bevaras men
skapar ingen ny exekveringsrätt. Textinmatningens tidigare beslut ska
inte användas som en bakväg för att omklassificera Live-fragment.
[Beslutet][decision], [föregående undersökning][previous].

Den villkorliga leveransmodellen nedan är relevant om ett redan
auktoriserat resultat får levereras inom sitt verifierade uppdrag.
Den ger inte dagens osäkra Live-uppgifter ett sådant bevis. Vid `E`
ska sådana uppgifter få avbrott och uppmaning till ny inloggning.
Om ett resultat redan är helt mottaget i klienten före `E` är det
naturligtvis inget nytt exekveringssteg efter utgång.

## Komplett text och rätt klients kvittens

### En enda slutlig text

Frys ett kanoniskt leveranspaket när den auktoriserade uppgiften når
slutsvar eller följdfråga. Den innehåller bara den uppgiftens befintliga
identitet, revision, svarstyp och hela sluttexten. Ta med obligatoriskt
besked, verifierat resultat, sparstatus och frågan där de hör till svaret.
Modellens fria text får inte ersätta serverns verifierade sparutfall.
Texten blir oföränderlig när leveransen startar; inget nytt modellanrop
behövs för att återge den.

Dagens `voiceWork.completion` kan innehålla `requiredNotice`,
`result.message`, status för markerat objekt och `modelReply`, medan
`append` ibland sätter `response.text` till enbart `reply/modelReply`.
Även en korrekt kvittens av det senare fältet kan därför missa delar
av det avsedda svaret. `voiceAnswerText` ger dessutom särskilda
källmarkeringar för delarna. Implementationen behöver gemensam
kanonisk sammansättning för det fullständiga användarsvaret; en tyst
providerprompt eller etiketterad modellkontext är inte UI-text.
[Svarssammansättning][work], [röstkommentar][commentary].

### Vad kvittensen bevisar

Klienten kvitterar först efter att den **hela** slutliga texten avkodas,
valideras, kopplas till rätt samtal/uppgift/revision och finns i den
monterade, åtkomliga reservpresentationens tillstånd. Ett innehållsdigest
av exakt UTF-8-text kan upptäcka fel revision och ofullständig text; det
är korrelation och integritetskontroll, ingen ny autentiseringsnyckel.
Servern godtar kvittensen endast på den redan bundna klientkanalen.

Den syntetiska WebSocket-proben öppnar två kanaler med samma giltiga
syntetiska session före `E`. Den andra klienten får känna till både
text och alla publika identiteter men kan ändå inte kvittera den första
klientens leverans. Hela texten skickas och kvitteras efter `E` på den
första kanalen. Ett nytt handslag vid den tiden får 401.
[Körbar kontraktsmodell](voice-expiry-fallback/contract.probe.ts).

Detta bevisar en möjlig transportbindning med riktiga lokala WebSockets.
Det bevisar inte React-rendering, hjälpmedelsåtkomst eller att en
illvillig klient talar sanning om sin rendering. Ingen vanlig
klientkvittens kan bevisa mänsklig läsning, hörsel eller förståelse.
Kvittensen är automatisk; användaren behöver inte trycka på en knapp.

- WebSocket-pong eller HTTP 200 visar högst transport/protokollutfall.
- Live `session.commentary.appended` kvitterar providerinjektion,
  inte rätt browsers fullständiga text eller avslutad ljuduppspelning.
- Ett helt matchande transkript plus ljudaktivitet och paus är dagens
  heuristik. Den ger inte ett säkert slut på ljudsvaret.
- Textreserven bekräftar hela textens mottagning i rätt klient enligt
  klientkontraktet; den är inget bevis för ljudleverans eller läsning.

[RFC 6455][websocket], [Live-SDK][sdk], [klientheuristik][client].

## Ändlig leverans utan ny allmän åtkomst

En möjlig implementation öppnar en dedikerad dubbelriktad kanal före
`E` med befintlig inloggning och Origin-kontroll. Servern binder
kanalobjektet till rätt inloggningsgeneration, aktör, hushåll, samtal,
uppgift och klientinstans redan då. Publika ID:n väljer inte mottagare
efteråt. Ingen ny cookie, browserhemlighet eller återanslutningsnyckel
behövs. WebSocket-uppgraderingen använder normal auth, inte specialauth
för utgångna cookies. [WebSocket-handslag][websocket].

Efter `E` tillåter kanalen endast ett redan auktoriserat fryst svar och
dess kvittens. Den får inte leverera hela `assistant`, hela kartan,
nya verktygssvar eller löpande samtalstext; inte heller ta emot nya
instruktioner, pollning, sparbegäran eller svar på följdfrågan.
Dagens pollroute svarar med både `voice` och hela `assistant` och går
genom vanlig sessionskontroll. Att ge den routen ett generellt undantag
skulle inte uppfylla denna avgränsning. [Pollroute][voice].

Serverns Live-sideband är en kanal **till leverantören**, inte denna
klientkanal. Dagens WebRTC-händelselista tillåter klienten enbart
`session.close`; ingen antagen godtycklig ACK får läggas ovanpå den
utan protokollstöd. En separat autentiserad applikationskanal före `E`
är ett tekniskt förslag, inte en redan befintlig leveransväg.
[Live-konfiguration][voice], [SDK][sdk].

Sätt ett tekniskt leveranstak, exempelvis högst **5 sekunder** från att
den frysta sluttexten lämnas för leverans, och alltid
`L = min(D, leveransstart + 5 sekunder)`. Det är ett föreslaget övre
timeoutvärde inom befintlig uppgiftsgräns, ingen ny respit efter `D`.
En implementation kan välja kortare timeout. Svaret måste redan vara
färdigt; leveransfasen får inte bedriva nytt modellarbete.

- Vid komplett kvittens före `L` avslutas uppgiften som textlevererad.
  Reservtexten behöver inte läsas för att kanalen ska stängas.
- Vid saknad eller sen kvittens avslutas försöket som leveransfel vid
  `L`. Kvittensen vid exakt gräns är för sen. Ingen ACK flyttar `L/D`.
- Frånkoppling avslutar kanalens leveransförsök omedelbart. Redan
  auktoriserat arbete kan bara slutföras enligt tidigare regler och
  samma `D`; ingen väntan på en ny kanal ingår. Ingen automatisk
  återanslutning efter `E` tillåts.
- Omstart ger ingen ny kanal eller påbörjad leverans. Processlokala
  svar får gå förlorade; beständiga resultat och sparförsök består.
- Utlöpning måste kontrolleras vid varje handling även om timerkön är
  sen. Hård realtid för fysisk paketleverans kan inte garanteras vid
  processpaus. Inget nytt steg auktoriseras vid eller efter gränsen.

Proben använder korta syntetiska tider och samma fasta deadline, inte
ett verifierat femsekundersvärde i produktionsnät. Den prövar sen ACK,
deadline, frånkoppling och omstart som terminala tillstånd. En försenad
timeout får inte ge `mutate/ack` rätt även innan städningen körs.
[Kontraktsprober](voice-expiry-fallback/contract.probe.ts).

## Beständighet, återkallelse och samtidighet

Utkast ligger redan i `map_draft` för hushåll och rätt innehållsägare.
Aktörens auth-ID är inte automatiskt innehållsägarens ID. Registrerade
sparförsök och deras sparkvitton följer befintlig återhämtning med samma
operation, inte omsparande. Ett osäkert sparutfall är inte bevis för
att inget sparas. [Domänlagring][domain], [sparoperationer][operations].

Nya app-prober verifierar dels bevarat osparat utkast efter avvisad
sen sparning, dels ett redan genomfört sparandes operation och kvitto
efter ny inloggning och omstart. I båda fallen startar ny inloggning
inga nya modellanrop. Avvisat tal blir ingen beständig samtalshistorik.
En olagrad följdfråga behöver inte gå att hitta efter ny inloggning.
[App-prober](voice-expiry-fallback/app.probe.ts), [beslutet][decision].

Ett framtida undantag kräver serverkontroll av ursprunglig
inloggnings-/bindningsgeneration, sessionens spärr, samtalsmedgivandets
revision, aktuellt medlemskap, innehållsägare, innehållsgeneration,
utkastversion, uppgiftsstatus och `now < D`. Utgångna eller saknade
poster nekar. Tillbakaändrat medlemskap eller nytt medgivande får inte
återuppliva gammalt arbete; jämför revision/generation, inte enbart
aktuell existens. [Tidigare kontrakt][previous], [medgivandekod][consent].

Utloggning, återkallat medgivande eller åtkomst och beslutad övergång
stoppar nästa steg även om kanalen är öppen. Ny session ersätter inte
den gamla uppgiftens identitet eller tid. Ingen ny hemlighet behövs för
detta; servern behöver tillräckliga spärruppgifter enligt redan beslutade
livscykler. Omstart återupptar inte modellarbete. Gamla aktiva uppgifter
görs terminala innan ny trafik tas emot; sen callback från gammal
generation nekas. Återställning följer installationsspärren, inte
ytterligare rösthistorik. [Övergång][transition], [gallring][retention].

Kontroll och mutation behöver ordnas inom samma `BEGIN IMMEDIATE`
transaktion eller likvärdig atomisk spärr. Om återkallelsen committas
först nekas senare mutation. Om mutationen redan committas först är
resultatet beständigt och ska beskrivas korrekt. Ett registrerat
sparförsök kan kontrolleras enligt tidigare återhämtningsregler; det
ger ingen rätt till en ny sparbegäran.
[SQLite-transaktioner][sqlite], [befintlig domäntransaktion][domain],
[befintlig medgivandeåterkallelse][text].

Dagens domäntransaktion kontrollerar medlemskap och innehållsägare.
Text/MCP-kedjan gör separata sessions- och uppgiftskontroller. De
befintliga kontrollerna belägger inte att alla framtida tids- och
spärrrevisioner kontrolleras atomiskt över parallella processer.
Kontraktsmodellens `revoke/restart/disconnect` visar bara det avsedda
tillståndsbeteendet. De faktiska databasordningarna och skyddet mot
gammal process måste verifieras i implementationens syntetiska tester.
[MCP-ingång][routes], [uppgiftsguard][text], [modellprober](voice-expiry-fallback/contract.probe.ts).

Rösttranskript, svar, digest och leveranskvittens kan hållas enbart i
arbetsminnet och rensas när uppgiften slutar. Ingen ny valhistorik,
browsernyckel eller samtalshistorik behövs. Eventuella beständiga
spärrrevisioner behöver följa de redan beslutade gallringsfristerna;
denna research väljer ingen ny lagringstid.

## Reservpresentation och tillgänglighet

Detta är **design- och verifieringskrav**, inte verifierad överensstämmelse.
Behåll full mottagen text i samtalets befintliga flyktiga tillstånd.
När textvyn är stängd behöver reservtexten göras synlig och åtkomlig vid
röstrutans/samtalsnotisens plats, med samma fullständiga text som kan
visas i textvyn. Enbart ”läs svaret i textvyn” utan en fungerande väg
räcker inte när inloggningsnavigering annars tar bort samtalet.
Efter utgång får presentationen bara visa redan levererat material;
den hämtar inte mer hushållsinformation.

Använd befintlig notistext för obekräftad uppläsning där den passar:
”Uppläsningen kunde inte bekräftas. Du kan läsa svaret i textvyn.”
Den förutsätter att hela svaret verkligen finns åtkomligt. Avbruten
instruktion behöver separat besked om ny inloggning och att lämna hela
instruktionen igen. Leveransfel utan kontakt kan inte beskrivas som
visad notis. Sparstatus grundas på kvitto/registrerat försök och får
inte antas av felorsaken. [Befintliga notiser][notices].

Använd semantisk text, logisk läsordning, synligt fokus och tangentbords-
åtkomst. Den som läser behöver kunna nå hela texten utan ljud, tal eller
visuell rymdnavigering. Befintliga polite/assertive-regioner kan ge ett
kort statusbesked utan fokusflytt; lägg inte hela långa svaret i en
assertive-region och flytta inte fokus automatiskt från pågående arbete.
Den fullständiga texten är vanlig läsbar text. Om en kontroll försvinner
ska fokus återföras logiskt. Inga extra kvittensknappar krävs.
[Notiskomponenter][notice-ui], [WCAG 2.2][wcag].

Verifiera särskilt mobil och dator, pekskärm och tangentbord, stängd och
öppen textvy, synligt fokus vid utgång, läsordning, zoom/omflöde,
kontrast och att notisen inte bara signaleras med färg. Pröva
skärmläsare med faktisk browser och hjälpmedel, samtidig uppläsning,
blockerad/avbruten ljuduppspelning, bakgrundsflik, offline, tappad
anslutning och sen kvittens. Förvarning ska återberäknas från serverns
gränser när sidan blir aktiv; timer eller uppläst förvarning förlänger
inte inloggning eller uppgift. Gå igenom tidsgränsernas tillämpliga
WCAG-undantag och sparat arbete utan att påstå att en säkerhetsgräns
automatiskt ger full överensstämmelse. [WCAG 2.2][wcag].

Ingen browserlayout, verklig ljudutgång eller skärmläsare provas i denna
research. Befintlig kod är en återanvändbar byggsten, inte bevis för
att den framtida utgångsvägen fungerar tillgängligt.

## Körbevis och reproduktion

Kör endast på denna kastbara gren. Samtliga körningar använder repots
npm-skript och delade processlås. Inga real-model-/real-voice-sviter
eller fakturerbara provideranrop ingår. OAuth och MCP i app-proberna
är riktiga lokala kodvägar; extern identitet, modell och Live är
syntetiska. Arrangerad sessionsutgång ersätter väntan på verkliga timmar.

```sh
npm run test:env -- vitest run \
  --config research/voice-expiry-fallback/vitest.config.ts
```

**13 nya prober i två filer** täcker tre faktiska appflöden och tio
villkorliga kontrakts-/transportfall:

- Prefixets commit före utgång och beständigt kvitto efter sen negation.
- Pågående modellresultat efter utgång, nekat sparande och bevarat utkast.
- Insamling, ny sparbegäran och dubbel delegering runt utgång.
- Osäker instruktion/start/deadline samt sent startbelägg, kö och retry.
- Återkallelse, omstart och frånkoppling utan återupplivning.
- Sen ACK, partiell text, transportkvittens, fel revision och fel klient.
- Riktig lokal WebSocket med text och ACK efter utgång på tidigare
  autentiserad kanal, samt nekat nytt handslag med samma cookie.

[Probeutfall](voice-expiry-fallback/probes.log) och
[källorna](voice-expiry-fallback/app.probe.ts) hör till samma commit
som denna text. Godkänt begränsningstest visar en reproducerad
begränsning; det är inte ett lyckat nytt produktionskontrakt.

**9 fokuserade befintliga tester passerar**, 206 andra hoppas över:

<!-- markdownlint-disable MD013 -->

```sh
npm run test:unit -- \
  tests/unit/server/voice-assistant.test.ts \
  tests/unit/server/text-assistant.test.ts \
  tests/unit/server/conversation-consent.test.ts \
  -t 'a queued correction prevents|ending the shared text authority|an aborted public retry|a lost automatic save response|a new authorized session finds|revoking the actual MCP grant|revoking removes the saved consent|revoking ends a conversation that was approved|a consent that is revoked while'
```

<!-- markdownlint-enable MD013 -->

De avser köad rättelse, stopp, avbruten sparåterhämtning, förlorat
sparresultat, ny session, MCP-återkallelse och återkallat medgivande.
[Befintliga testutfall](voice-expiry-fallback/existing-tests.log).
Researchens Markdown, stavning och kodstil kontrolleras av:

```sh
npm run test:env -- node research/voice-expiry-fallback/check-artifacts.mjs
```

[Kvalitetskontrollens utfall](voice-expiry-fallback/checks.log).
Researchens lokala ordlista och Biome-konfiguration påverkar endast
kastbart underlag och ändrar inte produktens konfiguration.

## Slutbedömning och återstående verifiering

Specifikationen kan beskriva säkert stopp vid `E`, inga nya rättigheter
för osäkra Live-uppgifter, bevarat beständigt arbete och textreserven som
ett avgränsat leveranskrav. Inget nytt produktval är nödvändigt för
denna snäva utgångsregel. Den körda transportmodellen visar att rätt
klients textkvittens är möjlig utan nya browserhemligheter.

Före en implementation får kallas verifierad återstår:

1. Koppla faktiska `E/D` till sessionsval, inaktivitet och alla kö-,
   modell-, MCP- och skrivgränser. Visa fall precis före/på/efter gräns.
2. Pröva databasrace med separata anslutningar/processer i båda
   commitordningarna för utloggning, medgivande, medlemskap och övergång;
   även återlagt medlemskap/medgivande och gammal process efter omstart.
3. Implementera en gemensam komplett sluttext och verklig klientkvittens
   på en före utgång bunden kanal. Visa utebliven, partiell och sen
   leverans, deadline, bruten kanal, omstart och blockerad återanslutning.
4. Visa att generell map-, text-, OAuth-, MCP- och pollåtkomst nekas
   efter `E`, även när en leveranskanal finns; ingen cookie förnyas för
   undantaget. Serverns interna uppgiftsrätt får inte väljas av klienten.
5. Pröva reservpresentationen i riktig browser och genomför manuell
   mobil-, dator-, tangentbords-, fokus-, skärmläsar-, ljud- och
   nätverksverifiering. Separera designmål från dokumenterad observation.

Om slutbedömningen dessutom vill lova **ingen mutation från något
ofullständigt röstprefix även före ordinarie utgång**, är den precisa
nya HITL-frågan: ”Vilken verifierbar slutlighet eller ändrad interaktion
ska krävas före normalt röstinitierat ändrings- och spararbete?” Den
frågan ligger utanför det redan beslutade snävare avbrottet och avgörs
inte här. Tillfälliga pauser eller en modellgissning är inget svar.

[ticket]: https://github.com/viscalyx/skyttel/issues/443
[decision]: https://github.com/viscalyx/skyttel/issues/442#issuecomment-6200431259
[previous]: https://github.com/viscalyx/skyttel/blob/1548738e80b0343a0995d2229d0f5059b5a1dfe2/research/voice-task-extension.md
[limits]: https://github.com/viscalyx/skyttel/issues/416#issuecomment-6176577860
[transition]: https://github.com/viscalyx/skyttel/issues/420#issuecomment-6198342920
[retention]: https://github.com/viscalyx/skyttel/issues/419#issuecomment-6198194078
[sdk]: https://github.com/openai/openai-node/blob/bc6c0bfb70f253d5caa3f335699e9713ea9067b5/src/resources/live/live.ts
[lock]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/package-lock.json
[work]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/voice-work.ts
[voice]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/voice-assistant.ts
[client]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/client/use-voice.ts
[text]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/text-assistant.ts
[mcp]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/text-assistant-mcp.ts
[domain]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/map.ts
[operations]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/map-operations.ts
[consent]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/conversation-consent.ts
[routes]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/assistant-routes.ts
[commentary]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/voice-commentary.ts
[notices]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/client/conversation-notice.ts
[notice-ui]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/client/ConversationNotice.tsx
[live-docs]: https://developers.openai.com/api/docs/guides/live-conversations
[websocket]: https://www.rfc-editor.org/rfc/rfc6455
[sqlite]: https://www.sqlite.org/lang_transaction.html
[wcag]: https://www.w3.org/TR/WCAG22/

# Gemensam webbläsarbindning och en giltig inloggning

Underlag för specifikationsarbetet i
[Hur verifieras gemensam webbläsarbindning och en enda giltig inloggning?][ticket].
Läsare är den som granskar kontraktet och planerar implementationen.
Undersökningen gäller Skyttel vid `8f86c81dbe8f4007e93973f6735a47c409397ff5`,
Better Auth och OAuth-provider **1.7.7**, better-sqlite3 **13.0.3** samt
Playwright **1.64.0** enligt [låsfilen][lock]. Datum: 2026-10-15.

## Slutsats och bevisgräns

Ett avgränsat kontrakt är möjligt under de angivna klientvillkoren och
med samtliga serverkontroller: positiv serverregistrering, en enda
atomiskt utbytbar inloggning per bindning och samordnade skrivningar
av säkerhetskakan. Körda prober visar två första flikars gemensamma
initialisering, faktisk sen kaköverskrivning och konkurrerande SQLite-
transaktioner. De verifierar **inte** en produktionsimplementation.

En rundresa som återger en kaka räcker inte. Två rundresor kan var för
sig lyckas med olika bindningar. Inte heller ett Web Lock räcker om ett
gammalt nätverkssvar fortfarande kan skriva `Set-Cookie` efter att låset
släpps. Båda motexemplen går att köra i den medföljande proben.

Den prövade riktningen låter servern lämna en kandidat som JSON utan
`Set-Cookie` för säkerhetskakan. Klienten skriver kakan synkront under
ett gemensamt Web Lock och låter servern bekräfta rätt värde innan ett
försök registreras. Detta kräver en JavaScript-läsbar bindningskaka.
Det är ett villkorat teknikval; autentiseringskakan behåller `HttpOnly`.
Bindningen får aldrig bli en autentiseringsnyckel.

Ingen ny autentiseringsmöjlighet, längre lagring eller ändrad garanti
behövs för den beskrivna vägen med säkra avvisningar. Däremot återstår
implementationens integration och verifiering. Saknad auth-kaka med
kvarvarande upptagen bindning ger ett uttryckligt stopp; underlaget
inför ingen ny rätt att avsluta den gamla sessionen genom bindningen
eller en annan användares ny autentisering. Om produkten senare kräver
ett framgångsrikt kontobyte i det läget behövs ett separat beslut om
behörighet och räckvidd.

## Beslut som kontraktet följer

- [Webbläsarbindning och en aktuell inloggning][decision] tillåter en
  särskild säkerhetskaka, kräver bekräftad gemensam start och första
  lyckade slutförande som vinnare. Full förlust av identifierande kakor
  har den uttryckliga gräns som beskrivs nedan.
- [Tidsgränser][times] anger vanlig inloggning: åtta timmar absolut och
  30 minuters inaktivitet. Ihågkommen inloggning: sju dygn absolut.
  Återkallelse ger högst `min(tidigare utgång, nu + åtta timmar)`.
- [Bevarande][retention] skiljer aktiv funktion, gallring inom 24 timmar,
  resultatkontroll under 24 timmar och särskilda spärrar med taket sju
  dygn plus högst 24 timmar för gallring. Taket är ingen standardtid.
- [Besked och kontroll][confirmation] skiljer serverändring från rätt
  fortsatt inloggning. [Återställningsundantaget][restore] tillåter
  saknat resultat efter bekräftad återställning, utan nytt resultatarkiv.
- [Tidigare fryst research][previous] visar andra befintliga luckor.
  Dess antagna profilbindning är inget bevis på detta nya kontrakt.

## Versionsbundna kodbelägg

Skyttel stänger av sessionscache i kaka men konfigurerar ingen gemensam
bindning eller atomisk ersättning av alla sessioner i en sådan bindning.
`auth.api.getSession` används av produktvägarna. Nuvarande konfiguration
bevisar inte de beslutade nya tids- och lagringsgränserna.
[Auth-konfiguration][auth], [applikation][app].

Better Auths callback läser och konsumerar OAuth-state före väntan på
provider. Efter providerresultatet kan den skapa användare, konto och
session samt skriva autentiseringskaka. State som redan är konsumerat
finns därför inte kvar som en fullständig lista över pågående callbacks.
Kontokoppling har en särskild gren med effekter på konto och användare.
En kontroll enbart efter callbackens avslut kan komma för sent.
[Callback 1.7.7][callback], [konto- och sessionsskapande 1.7.7][oauthuser].

Better Auths cookieutgivning skiljer beständig cookie från vanlig
sessionscookie men upprätthåller inte därmed Skyttels nya bindning eller
alla dess absoluta gränser. Gamla headers kan anlända efter en senare
ändring. [Cookiekod 1.7.7][authcookies].

Skyttels koppling har ett minneslås per sessions-ID och kontroller för
användare, provider och steg. Det låset delas inte med ett framtida
bindningsregister eller återkallelseflöde. SQLite använder WAL,
`synchronous = FULL` och `busy_timeout = 5000`.
[Kontokoppling][linking], [databas][database].

Det körda negativa bibliotekskontrollprovet låter två överlappande
syntetiska callbacks skapa varsin giltig session för olika användare.
Den första callbacken har redan konsumerat state medan den andra blir
klar. Detta är faktisk bibliotekskörning, skild från SQLite-modellen.

## Villkorat initialiseringskontrakt

Web Locks samordnar samarbetande kontexter inom samma lagringsområde.
Låset släpps när arbetets promise avslutas och kan släppas när dokumentet
försvinner. API:t kräver en säker kontext. Ett låsnamn är ingen
autentiserad serveridentitet. Underlaget använder den daterade
[Web Locks-specifikationen 2025-09-24][weblocks], som är ett arbetsutkast.

Föreslagna villkor för den stödda vägen:

1. Skyttel kör på en kanonisk top-level HTTPS-origin. Samma flikar har
   samma kaklagring och samma Web Locks-område. Inbäddning, alternativa
   origin/portar och partitioner får inte antas dela lås bara för att en
   kaka ser gemensam ut. Osäker räckvidd stoppar starten.
2. Ett exklusivt gemensamt lås omfattar varje skrivning, rotation,
   livslängdsändring och borttagning av säkerhetskakan. Ingen kod använder
   `steal`. Saknat eller nekat lås ger stopp, ingen oskyddad reservväg.
3. Vid en uttrycklig start läser klienten den befintliga kakan under
   låset. Saknad kaka med giltig auth-nyckel kräver skyddad återhämtning
   som ogiltigförklarar den identifierade gamla bindningen före ersättning.
4. För helt ny kontext ger servern en slumpmässig kandidat som JSON,
   `Cache-Control: no-store`, utan bindningsskrivande cookieheader.
   Kandidatposten är kortlivad och ger ingen kontoåtkomst.
5. Klienten skriver kandidaten med `document.cookie` medan låset hålls.
   Servern kräver därefter kandidatens förväntade värde **och** rätt kaka
   i begäran. En gissad klientgeneration är inget bevis. Nekad skrivning
   ger stopp före providerstart. [HTML:s cookie-API][htmlcookie].
6. Samma servertransaktion kontrollerar bindningen och registrerar ett
   engångsförsök före providerstart. Serverns registrering är startgränsen.
   Retur från echo räcker inte som en varaktig biljett till senare start.
7. Ett avbrutet eller förlorat kandidatsvar får aldrig få en fristående
   fortsättning som skriver efter låsets slut. JSON-svaret kan komma sent
   men har ingen egen kakeffekt. Ett okänt utfall ger kontroll eller ny
   uttrycklig handling, aldrig automatisk ny providerstart.

Proben visar detta i två färska flikar: båda får samma bindning och
servern ger endast en kandidat. Den visar även att en fördröjd JSON-
kandidat inte ändrar den nya kakan efter avslutat lås. Krasch, navigering,
alla webbläsare och alla partitioneringslägen är inte körverifierade.
Proben använder inget `localStorage`, IndexedDB eller service worker.
Web Locks lagrar inget nytt personkopplat val mellan omstarter.

En server kan inte från cookie-echo bevisa att godtyckliga klienter
använder samma webbläsarlås. Garantin för den stödda klienten bygger på
den granskade samordningen och dess verifierade plattformsvillkor.
Behörighetskontrollerna på servern gäller även utanför den klienten.
Utbyte av kakor via utvecklarverktyg eller annan lokal programvara kan
inte räknas som ett bevisat oförändrat lagringsområde.

## Atomisk servermodell och behörighet

Modellen i [browser-binding-model.mjs](browser-binding-model.mjs) har
positiva poster för bindning, försök och aktuell session. Sessionens
bindningskolumn är unik. Saknad post nekar; inget uppslag får skapa en
saknad gammal bindning eller återställa en standardgeneration.

Försök registreras för en bekräftad bindning och får provider, ändamål,
engångsstatus och absolut utgång. För upptagen bindning kräver
registreringen också den aktuella giltiga autentiseringsnyckeln och
matchande bindningskaka. Servern sparar snäv auktorisering för just
försöket: användare, session och nyckelrevision. Bindnings-ID eller en
annan användares bevisade provideridentitet får inte själv välja en
gammal session att avsluta. Tom bindning tillåter anonym start.

Modellen använder hash av den aktuella syntetiska nyckeln som revision,
ingen extra rå autentiseringsnyckel i försöket. Produktionsriktningen
är serverstyrt sessions-ID och monoton eller slumpmässig nyckelrevision.
Varken revision eller hash är en alternativ läs- eller inloggningsnyckel.

Efter providerverifiering genomförs följande i en synkron
`BEGIN IMMEDIATE`-transaktion:

- Kräv fortfarande levande bindning och registrerat, förbrukat men
  ännu inte annullerat eget försök. Konsumerat OAuth-state är inte en
  dispens från sista kontrollen. Bindning från callbackens begäran måste
  också matcha dess serverregistrering i produktimplementationen.
- Kontrollera den ursprungliga auktoriseringens användare, session och
  revision. Koppling kontrollerar dessutom provider, steg och den nya
  identitetens ägarskap. Providerbevis måste komma från verifierad server-
  kommunikation, inte klientfält.
- Lyckad ny inloggning raderar tidigare session i bindningen, annullerar
  alla dess övriga registrerade försök och skapar exakt en ny session.
  Första framgångsrika commit vinner; nästa callback saknar giltigt försök.
- Misslyckad inloggning tar bara bort sitt eget försök. Fel mitt i
  transaktionen rullar tillbaka även konto- och sessionsändringar.
  Tidigare giltig inloggning ska bestå.

Kopplingens kontoändring och sista behörighetskontroll måste omfattas av
samma atomiska gräns. Att låta standardcallbacken länka ett konto och
sedan i en efterhook underkänna sessionen räcker inte. Alla bibliotekets
kontoskrivningar, eventuella pluginhooks och sekundära lagringar måste
antingen delta i kontraktet eller vara spärrade. Dagens API-anrop får
inte antas automatiskt gå i researchmodellens synkrona transaktion.

SQLite serialiserar skrivtransaktioner; `BEGIN IMMEDIATE` kan ändå ge
`SQLITE_BUSY`. En sådan start är inte framgång. Ingen extern provider-
väntan eller `await` får ligga i transaktionen. Efter asynkron väntan
krävs färsk kontroll vid effekten. En fristående `authorize()` följd av
en senare skrivning bevisar inte skydd mot återkallelse däremellan.
[SQLite-transaktioner][sqlite], [isolering][isolation].

## Återkallelse, utloggning och sena svar

Skyddade ändringsanrop kräver giltig aktuell auth-nyckel, rätt bindning,
behörighet för rätt session och befintligt Origin-/CSRF-skydd. Modellen
visar inte HTTP-skyddet; dess anrop är instrumenterade serveroperationer.
OAuth behåller state-/PKCE-/providerkontroller enligt
[OAuth Security BCP, RFC 9700][oauthbcp]. Bindningen ersätter ingen av dem.

Återkallelse avslutar gamla bindningen och dess försök, byter den
aktuella auth-nyckeln och skapar en ny bindning för den fortsatta vanliga
inloggningen. Sessions-ID och ägare kan bestå. Utgången blir minimum av
tidigare absoluta gräns och åtta timmar från återkallelsen. Utloggning
avslutar bindningen och aktuell session utan ersättningsnyckel.
Andra bindningar påverkas inte.

Förlorat svar ger inget tokenalias. Ändringsresultatet kan läsas med rätt
användares nya giltiga autentisering under kontrollfönstret; bindning,
sessions-ID och åtgärdsreferens ensamma ger inte rätt att läsa resultat.
Modellen prövar både rätt ägare på annan session och fel användare.
Åtgärdsreferensen väljer exakt resultat, inte en ny auth-nyckel.

En begäran som fördröjs över återkallelsegränsen och kommer med gammal
bindning nekas. Redan konsumerad callback nekas vid sin sista kontroll.
En ändringsbegäran som först kan autentiseras efter att dess nyckel
ersätts nekas; den får inte svara som om utloggning genomförs. För att
rapportera genomfört avslut måste just det avsedda avslutet ha committats.
Detta inför inget gammalt-token-till-nytt-token-utbyte.

Utfärdad gammal auth-kaka kan faktiskt ersätta den nya i webbläsaren.
Den får då ligga kvar utan åtkomst och medföra ny inloggning. Vid rotation
kan ett sent svar också ge ett felmatchat kakpar. Ingetdera får repareras
tyst genom att servern godtar gammal bindning eller gammal nyckel.
Även en redan utfärdad sessionsnyckel måste omfattas av serverns
ogiltigförklaring; det räcker inte att radera försöksrader.

## Saknade, ändrade och återställda kakpar

- Giltig auth-nyckel utan rätt bindningskaka: ingen skyddad handling.
  En uttrycklig skyddad återhämtning kan autentisera nyckeln enbart för
  att identifiera och avsluta dess egen gamla bindning före ersättning.
  Den vägen ger ingen fortsatt kontoåtkomst utan rätt kakpar.
- Bindningskaka utan giltig auth-nyckel, men servern har en aktuell
  session där: bindningen kan inte ensam avsluta eller ersätta sessionen.
  Den beskrivna vägen nekar ny start på den upptagna bindningen. Den
  uppfinner ingen ersättningsbehörighet via ny användare, sessions-ID
  eller klientrevision. Den kvarvarande sessionens ordinarie utgång gäller.
- Ett återställt **fortfarande giltigt** par kan åter få åtkomst om
  servern inte har anledning och behörighet att ogiltigförklara det.
  Frånvaro i en tidigare begäran är inget bevis på omedelbar annullering.
- Om alla identifierande kakor verkligen saknas kan ett uttryckligt nytt
  tillfälle skapa ny bindning. Servern kan inte säkert koppla den till
  den gamla. Den gamla sessionen kan förbli giltig till sin gamla utgång.
  Ett sent återställt gammalt giltigt par kan därför fungera. Det är
  [produktbeslutets uttryckliga gräns][decision], ingen dold garanti om
  hela den fysiska webbläsarprofilen efter radering.
- Ett redan ogiltigförklarat par nekar även när verkliga sena HTTP-svar
  återställer båda kakorna. Borttagen metadata återupplivar det inte.

Ny bindning får inte skapas tyst för att kringgå en befintlig felaktig
eller ogiltig bindning. Delvis förlust är inte automatiskt fullständig
förlust. Klienten behöver få ett tydligt hinder och en uttrycklig väg
vidare enligt [beskedsbeslutet][confirmation]. Framgångsrikt byte till
annan användare efter partiell förlust är ingen verifierad reservväg.

## Kakans innehåll, säkerhetsattribut och livscykel

Teknikförslag för säkerhetskakan: `__Host-skyttel_binding`, slumpmässigt
256-bitars opakt värde, `Secure; SameSite=Lax; Path=/`, inget `Domain`.
Inga namn, adresser, provider-token eller lagrat Kom ihåg mig-val.
Den prövade skrivvägen kräver **utan `HttpOnly`**, eftersom bara den
samordnade klienten skriver bindningskakan. Detta är en medveten
avvägning mot ett serverägt `HttpOnly`-alternativ med annan verifierad
samordning. Prefixet begränsar cookieattribut, inte identitet eller
åtkomst; annan betrodd kod på samma värd är fortfarande inom kakans
skrivgräns. [Cookieprefix i 6265bis-utkastet][cookieprefix].

Autentiseringskakan behöver eget namn, signerad opak auth-nyckel,
`Secure; HttpOnly; SameSite=Lax; Path=/` och värdavgränsning.
`__Host-research_auth` är enbart probens instrumentnamn; inget beslut om
byte av Better Auths produktionsnamn följer av det.

- Före uttrycklig inloggning: ingen ny säkerhetskaka. Under pågående
  första försök: sessionskaka, begränsad servergiltighet för försöket.
- Vanlig lyckad inloggning: sessionskaka. Serverns absoluta och inaktiva
  gränser gäller även om webbläsaren återställer sessionskakor.
- Ihågkommen lyckad inloggning: beständighet till just sessionens
  absoluta utgång, högst sju dygn från inloggningen. Skriv den absoluta
  återstående tiden; ingen ny sjudygnsperiod vid läsning eller omstart.
- Ny uttrycklig inloggning kan skydda en ny sessions egen utgång.
  Kom ihåg mig börjar avmarkerat. Bakgrundsanrop ändrar inte livslängd.
- Återkallelse: gammal bindning och nyckel blir ogiltiga på servern;
  fortsatt bindning och auth-kaka ska vara sessionskakor. Sen beständig
  gammal kaka ger ingen återaktiverad ihågkommen inloggning.
- Utloggning och absolut utgång: åtkomst upphör på servern oberoende av
  om klientens borttagning lyckas. Borttagning använder samma namn och
  avgränsning. Kakor som blir kvar kan vara ogiltiga och kräva ny start.

Servern kan inte läsa tillbaka kakans `Expires` eller `Max-Age` från
requestens Cookie-header. Sessionsåterställning och tidigare radering
kan ändra webbläsarens faktiska beteende. Proben kontrollerar verkliga
sessions- och beständighetsattribut men bevisar ingen beständighet efter
omstart. [RFC 6265, avsnitt 4–5][cookiespec].

## Minsta metadata, omstart och gallring

Behövliga aktiva poster är bindnings-ID med giltighetsgräns, sessionens
ägare/ID/aktuella nyckelrevision/tids- och valunderlag samt registrerade
försök med verifiering, ändamål och utgång. För koppling tillkommer rätt
ägare, session, revision, provider och steg. Minimalt åtgärdsresultat
innehåller referens, autentiserad ägare, åtgärdstyp, terminalt utfall och
ursprunglig kontrollgräns. Ingen separat historik över tidigare val,
IP-adress, fingeravtryck eller extra autentiseringsnyckel behövs.

Positiv registrering kan radera gamla nycklar och försök atomiskt. Då
behövs **noll extra säkerhetstid** för en separat lista över dem:
frånvaro nekar för alltid, så länge inget kodflöde återskapar dem.
Aktiva sessioners bindning följer sessionens funktion; förbrukad
OAuth-state får inte bära sessionens enda kvarvarande koppling.
Försök och avslutade sessioner gallras senast inom 24 timmar.
Resultatläsning upphör exakt efter 24 timmar från åtgärden; fysisk
gallring är en separat kontroll. Bindningen ska tas bort när den inte
längre skyddar någon aktiv session eller något giltigt försök.

Modellens kandidat och försök har tio minuters giltighet som syntetisk
avgränsning i linje med bibliotekets tekniska försöksfönster. Det är
inget nytt produktbeslut om beständighet eller längre bevarande.
Obekräftade kandidater behöver begränsning och automatisk gallring så
att avbruten initialisering inte blir ett nytt personkopplat arkiv.

Omstart måste behålla positivt register och aktuell auth-modellgräns.
Efter gallring får samma gamla kakvärden, callback eller state aldrig
skapa en ny post. Vid återställning måste gamla positiva poster och
redan flygande svar göras ogiltiga före öppning; det räcker inte att
återläsa en äldre databas med sina gamla giltiga rader.
[Separat återställningsunderlag][backup].

Proben återöppnar SQLite-filen, gallrar och prövar gamla identifierare
igen. Den visar inte schemaläggning av fysisk gallring under driftstopp,
produktionsbackup eller katastrofåterställning. Bevarandegränserna blir
inte bevisade driftförhållanden genom att SQL-modellen följer dem.

## Faktiskt körda avgränsade prober

Källor: [browser-binding-probe.mjs](browser-binding-probe.mjs) och
[browser-binding-model.mjs](browser-binding-model.mjs). Kör från denna
kastbara grens rot med låsfilens installerade beroenden, OpenSSL och
Playwrights Chromium. Proben skapar egen temporär databas och lokalt
engångscertifikat samt väljer en ledig HTTPS-port. Alla identiteter och
providerresultat är påhittade. Ingen extern provider kontaktas.

```sh
npm run test:env -- node_modules/.bin/tsx research/browser-binding-probe.mjs
```

Den passerande körningen ger 15 JSON-rader utan auth- eller kakvärden:

- `sqlite-native-race`: åtta kapplöpningar för samma/olika användare,
  två separata worker-anslutningar till samma SQLite-fil, exakt en vinnare.
  Faktisk SQLite-version **3.53.4**.
- `sqlite-native-boundary-race`: åtta kapplöpningar mellan callback och
  utloggning/återkallelse. En behörig commit vinner, den andra nekar.
- `atomic-effects`: rollback, misslyckad login, konsumerat state,
  försenad registrering, koppling, tokenbyte och annan enhet.
- `authority-and-loss`: bindningen kan inte koppla konto, logga ut,
  ersätta upptagen session eller identifiera en annan session för avslut.
- `restart-and-positive-list`: okänt gammalt giltigt par kan fungera
  före invalidatering; återöppning och borttagning återupplivar det inte.
- `absolute-deadlines`: injicerad tid vid exakt utgång, kortad gräns
  efter återkallelse och radering av resultat vid kontrollfönstrets slut.
- `better-auth-stock-negative-control`: riktig Better Auth 1.7.7,
  syntetisk provider, två överlappande olika användares giltiga sessioner.
- `first-two-tabs`: riktig Chromium **156.0.8078.4**, HTTPS med lokalt
  självsignerat certifikat, två första flikar, en kandidat och samma
  bindning före de simulerade providerstarterna.
- `echo-is-not-convergence`: två riktiga echo-rundresor lyckas men har
  olika bindning efter konkurrerande `Set-Cookie`-svar.
- `late-set-cookie-after-lock`: ett gammalt headersvar skriver faktiskt
  över bindningen efter låsets slut. Lås ensamt är otillräckligt.
- `late-json-candidate`: motsvarande sent JSON-svar saknar kakeffekt.
- `initialization-rejections`: simulerad nekad skrivning och saknat lås
  stoppar providerstart. Native felaktig `__Host`-kaka avvisas också.
- `actual-late-cookie-writes`: sen auth-header ersätter nya användarens
  kaka med gammal nyckel; åtkomst nekar. Återställt ogiltigt par nekar.
- `actual-cookie-pair-loss-and-rotation`: saknad marker med giltig auth,
  återställda levande/ogiltiga par, helt förlorade identifierare och
  sen auth-kaka efter återkallelse. Den beslutade begränsningen syns.
- `native-cookie-lifetime`: verklig sessionskaka och absolut `Expires`,
  samt oförändrad giltighet efter bakgrundsläsning. Ingen omstartsbevisning.

Native SQLite- och webbläsarbevis gäller **researchkontraktet**. Endast
den särskilt namngivna negativa kontrollen kör Better Auths callback.
HTTP-endpoints som `/pair` och `/candidate` är probinstrument, inga
föreslagna oskyddade produktrutter. `/pair` tar syntetiska nycklar från
testharnessen för att styra svarens ordning; en produkt får inte göra det.

Modellen saknar 30 minuters inaktivitet, verklig providerverifiering,
Origin-/CSRF-kontroll, produktens kontoregler och alla pluginhooks.
Callbackens begäranscookie och OAuth-statekontroller hör till den ännu
overifierade integrationen. Modellens `complete()` får aldrig ensam
exponeras som en klientstyrd autentiseringsväg. Bibliotekets negativa kontroll
fyller inte dessa integrationsluckor åt modellen.

## Underlag till befintligt lagringsregister

Säkerhetskakan ska in i prototypens befintliga utvecklingsbara detaljer
på Kakor och lagring, med samma struktur som övriga poster:

- Ändamål: sammanbinda begärda inloggningsförsök och deras sessioner så
  att ersatta nycklar och äldre försök kan nekas. Ingen inställning för
  kakan och ingen separat spegel av Kom ihåg mig.
- Innehåll och leverantör: opak slumpmässig bindning, Skyttel som
  förstapart; inget direkt personnamn eller provider-token. Beskriv
  kopplingen till servermetadata utan att kalla värdet anonymt.
- Livslängd: session respektive skyddad ihågkommen sessions absoluta
  utgång, pågående försök och ny uttrycklig inloggning. Ingen
  bakgrundsförlängning. Skilj servergiltighet från fysisk kaklagring.
- Verkan: flikar med samma bekräftade bindning delar aktuell inloggning.
  Ny lyckad login ersätter den gamla på servern. Återkallelse roterar
  nyckel; utloggning avslutar. Andra enheter påverkas inte.
- Radering och hinder: saknade/felaktiga kakpar stoppar handlingar;
  en gammal kaka kan finnas kvar utan giltighet. Full radering kan
  hindra identifiering och omedelbar annullering av äldre bindningar.
- Serveruppgifter: aktiva metadata, gallring inom 24 timmar,
  kontrollfönster och eventuell minsta spärrinformation enligt beslutet.
  Redovisa eventuella säkerhetskopior separat och bara med verifierade
  driftförhållanden. [Godkänd prototyp][prototype], [bevarande][retention].

Formulärens lyckade besked kräver rätt efterföljande kontroll enligt
[beskedsbeslutet][confirmation]. Serverns genomförda återkallelse får
bekräftas även när fortsatt inloggning inte kan bekräftas. Ingenting i
proben verifierar fokus, skärmläsarbesked eller WCAG-överensstämmelse.

## Återstående verifiering och överlämningsgräns

Före påstående om fungerande produkt behövs följande:

1. Integrera bindningskontroller i verklig OAuth-start, callbackens
   sessions- och kontoeffekter, koppling och samtliga skyddade API-vägar.
   Återkontrollera efter väntan och atomiskt vid säkerhetskritisk effekt.
2. Håll verkliga callbacks vid statekonsumtion, provider, kontoskrivning,
   sessionsskapande och headersvar. Kör samma tidplaner mot utloggning,
   återkallelse och nya lyckade inloggningar. Prova redan utfärdad nyckel.
3. Verifiera alla bindningsskrivare, inklusive livslängd och borttagning.
   Ingen gammal serverheader får skriva bindningskakan. Pröva verklig
   navigering/krasch, borttappat svar, timeout och flera väntande svar.
4. Kör stödda webbläsare på mobil och dator med verkligt blockerade kakor,
   privat läge, partitionering, omstart och sessionsåterställning.
   Nuvarande nekad skrivning är en injicerad policy, ingen sådan helkontroll.
5. Verifiera kanonisk HTTPS-origin, proxy, alternativa portar/värdar,
   top-level-scope och avvisning när samma kak- och låsområde inte kan
   bekräftas. En enskild Chromium-version bevisar inte alla klienter.
6. Koppla in redan beslutade inaktivitets- och absoluta gränser,
   ingen bakgrundsförnyelse, rätt resultatägare och exakt kontrollfrist.
   Testa samtidiga olika ändrings-ID och förlorad rotationscookie.
7. Bevisa faktisk fysisk gallring, avbrott/omstart, migration och säker
   återställning före återöppning. Gamla par och callbacks ska fortsatt
   neka även efter borttagen metadata och gamla säkerhetskopior.
8. Stäm av prototypens register och hindertexter, inklusive partiell
   kakförlust, samt manuellt fokus, tangentbord och skärmläsare.

Ingen produkt-, integrations-, real-model- eller real-voice-svit ingår.
Inga billable API-anrop ingår. Artefakterna hör till en kastbar
`research/`-gren, utan PR eller merge.

## Primärkällor och kanonisk beslutskontext

[ticket]: https://github.com/viscalyx/skyttel/issues/441
[decision]: https://github.com/viscalyx/skyttel/issues/438#issuecomment-6199879635
[times]: https://github.com/viscalyx/skyttel/issues/416#issuecomment-6176577860
[retention]: https://github.com/viscalyx/skyttel/issues/419#issuecomment-6198194078
[confirmation]: https://github.com/viscalyx/skyttel/issues/418#issuecomment-6197811528
[restore]: https://github.com/viscalyx/skyttel/issues/439#issuecomment-6200023920
[backup]: https://github.com/viscalyx/skyttel/issues/434#issuecomment-6199323828
[prototype]: https://github.com/viscalyx/skyttel/issues/413#issuecomment-6173156242
[previous]: https://github.com/viscalyx/skyttel/blob/b90d37c2d4137556b023150e5fb1e89716f9f703/research/profile-revocation.md
[lock]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/package-lock.json
[auth]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/auth.ts
[app]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/app.ts
[linking]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/login-methods.ts
[database]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/database.ts
[callback]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/callback.ts
[oauthuser]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/oauth2/link-account.ts
[authcookies]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/cookies/index.ts
[weblocks]: https://www.w3.org/TR/2025/WD-web-locks-20250924/
[htmlcookie]: https://html.spec.whatwg.org/multipage/dom.html#dom-document-cookie
[sqlite]: https://www.sqlite.org/lang_transaction.html
[isolation]: https://www.sqlite.org/isolation.html
[cookiespec]: https://www.rfc-editor.org/rfc/rfc6265#section-4.1.2
[cookieprefix]: https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html#name-cookie-name-prefixes
[oauthbcp]: https://www.rfc-editor.org/rfc/rfc9700

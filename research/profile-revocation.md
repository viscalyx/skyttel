# Återkallelse och äldre inloggningsförsök

Underlag för
[Hur binds återkallelse och utloggning till äldre inloggningsförsök i samma webbläsarprofil?](https://github.com/viscalyx/skyttel/issues/432).
Läsare är den som beslutar om webbläsarbindningen och sedan utformar
eller granskar serverkontraktet. Detta är research, ingen
produktionsimplementation eller verifierad säkerhet för hela Skyttel.

## Slutsats och öppet produktbeslut

En serverlagrad sessions gamla nyckel kan ersättas direkt, med
bibehållet sessions-ID och utan förlängd utgång. Den låsta versionens
färska sessionsuppslag nekar därefter den gamla nyckeln. Detta är ett
avgränsat körbevis, inte ett färdigt kontrakt för pågående handlingar.

Garantin för **alla äldre försök i samma webbläsarprofil** kan däremot
inte genomföras med enbart dagens sessionscookie och singleton-cookie
för OAuth-state. Före autentisering saknas en stabil koppling mellan
alla försök och profilen. Efter sessionsskapandet kan ett äldre försök
producera en annan användares giltiga session, vars cookiesvar väntar
ute i nätverket. Radering av enbart OAuth-state räcker inte.
Slutsatsen härleds från kod och konkreta motexempel nedan.

**Ett nytt HITL-beslut behövs före implementationsöverlämning:** vilken
webbläsarlagring och observerbar bindningsräckvidd får kontraktet använda?
Beslutet måste omfatta anonyma starter, olika användare, första
parallella flikarna, nekad/borttagen lagring och nollställning.
Alternativet är uttrycklig omprövning av garantins räckvidd. Ingen extra
cookie, generell valnyckel i lokal lagring eller autentiseringsnyckel
införs genom rapporten. Återhämtning av rätt åtgärdsresultat behöver
dessutom en verifierbar korrelationsväg genom ny inloggning.

Ett villkorat kontrakt kan undvika historiska tokenlistor och långlivade
spärrar med positiv registrering: bara en befintlig aktiv nyckel eller
ett befintligt aktivt försök ger åtkomst respektive skapar en session.
Frånvaro måste alltid neka. Bindningen och alla relevanta kodvägar
måste verkligen omfattas; detta är ännu ingen verifierad helhet.

## Version och bevisnivå

Undersökningen gäller 2026-10-15 och Skyttel vid `8f86c81d`.
[Låsfilen][lock] och installerade paket anger Better Auth och
OAuth-provider **1.7.7**. Paketdeklarationen använder intervall;
låsfilens konkreta version undersöks. GitHubs tagg `v1.7.7` pekar vid
kontrollen på `db02f233918ad1233bf0753e437e1c0da353273d`.
Upstreamlänkarna nedan är bundna till denna commit. Installerad
distributionskod läses också; oberoende byggverifiering av npm-arkivet
mot Git-taggen ingår inte.

- **Kodbelägg:** produktkod och installerad distributionskod.
- **Körbevis:** verkliga Better Auth-endpoints mot SQLite i minnet,
  simulerad provider och faktisk Chromium över HTTP på loopback.
- **Villkorad modell:** separat liten SQLite-modell med antagen korrekt
  profilbindning. Den är inte produktens auth-flöde.
- **Förslag:** atomiskt kontrakt, metadata, gallring och framtida
  verifiering. De är inte genomförda produktändringar.

Produktgränserna kommer från resolutionerna för
[tidsgränser][times], [återkallelsegaranti][revoke],
[bekräftelse och okänt utfall][confirm], [serverlagring][retention] och
[övergång][transition]. Tidigare [fryst serverunderlag][previous]
gäller där senare resolutioner inte preciserar det. Rapporten tillför
inte juridiska påståenden om användarens valda lagringsfrister.

## Varför befintlig lagring inte identifierar hela profilen

Databasstrategin lagrar försök under `auth-state:<slumpvärde>` och
kräver signerad cookie med namnet `state`. En senare start ersätter
statecookien. Callbacken kontrollerar matchningen och raderar
verifieringsposten före väntan på providern. Detta binder ett enskilt
försök säkert men registrerar inte samtliga försök i profilen.
[Statehantering][state], [stategenerering][oauthstate].

Två förlopp kan ge servern samma observation:

1. Anonymt försök X startar i profilen där Alice sedan loggar in via Y
   och återkallar. Y ersätter statecookien. X:s callbackbegäran eller
   svar kan redan vara på väg med äldre cookieuppgifter.
2. X startar i annan profil. Alice loggar in via Y och återkallar i
   sin profil. Ingen gemensam profilsignal finns vid X:s start.

Servern kan då inte avgöra om X ska annulleras lokalt eller lämnas
opåverkat som annan enhets försök. IP-adress, agentsträng och klientens
påstådda ägare löser inte detta. Att annullera alla Alices sessioner
påverkar andra enheter och missar Bobs anonyma förhandsstart i samma
profil. Att bara rensa synlig state missar konsumerad state och redan
skapade sessioner. Det är en härledning för den befintliga modellen,
inte en omöjlighet för alla andra tänkbara protokoll.

Servern kan inte veta när cookiesvaret faktiskt når webbläsaren.
RFC 6265 beskriver konkurrerande `Set-Cookie`-svars kapplöpning.
Nästa begäran innehåller inte cookiens lagringstid, och Fetch låter
inte frontend läsa `Set-Cookie`.
[RFC 6265, 4.1 och 4.2][cookiespec], [Fetch][fetch].
Serverlås till sändning eller JSON-generation bevisar inte
mottagningsordning. OAuth-BCP kräver säker transaktionsbindning till
user agent där försöket startar; den skapar inte automatiskt en
profilidentitet. [RFC 9700, 2.1 och 4.7][oauthbcp].

### Vägval för nytt HITL-beslut

En separat ändamålsbegränsad HttpOnly-cookie med slumpmässig bindning
är kandidat, **inte godkänt tillägg**. Den behöver vara stabil över
berörda kontobyten och får inte skrivas om av varje callback. Den får
inte ensam autentisera användare, välja ägare, läsa resultat eller
aktivera Kom ihåg mig. Namnet bindning undanröjer inte dess faktiska
befogenheter; även eventuell annullering behöver eget snävt
behörighets- och CSRF-kontrakt.

Två första flikar utan cookie kan få olika bindningar innan något svar
når profilen. Designen måste etablera och bekräfta gemensam bindning
**före** tillåtna OAuth-starter, exempelvis med samordnad initialisering
och serverkontroll. Utan stöd eller bekräftelse kan start behöva nekas;
optimistisk cookieutgivning räcker inte. Initialiseringen implementeras
eller verifieras inte här.

Efter nekad eller borttagen bindning kan servern inte kryptografiskt
identifiera samma fysiska profil utan annan gemensam signal. Ett
kontrakt kan kräva godkänd lagringskontext, neka callbacks utan rätt
bindning och definiera nollställning som ny kontext. Det är inte ett
ovillkorligt löfte om hela fysiska profilen. Livslängd, stängning,
nollställning och gamla försök vid borttagning måste beslutas.

Återanvänt cookienamn med nytt innehåll är fortfarande ändrad lagring
med möjligt ändrat ändamål och livslängd. Anonym försession i
sessionscookien är också nytt kontrakt. Fliksamordning via exempelvis
Web Locks bevisar inte i sig serverbindning för frånkopplade callbacks
eller utfärdade sessioner. Ingen generell valnyckel i lokal lagring
förutsätts.

## Villkorat kontrakt med positiv registrering

Detta är en konstruktionsriktning efter beslut om bindningen. Den
kräver integration med alla berörda vägar; enbart efterbehandling av
cookieheaders räcker inte.

### Start, callback och atomisk gräns

Varje start får slumpmässigt engångs-ID och positiv försökspost:
servervald bindning, provider, ändamål, utgång och lagringsval.
Koppling lagrar rätt autentiserad användare, session, revision och steg.
Klientmetadata får inte ersätta detta. `addOAuthServerContext` kan bära
servervalda uppgifter i state men ersätter inte återläst aktiv post.
[Serverkontext][oauthcontext].

Providern kan verifieras utanför transaktionen. Callbacken återläser
sedan exakt det fortfarande aktiva försöket vid sessionsskapande eller
koppling. Kontroll, engångskonsumtion, sessionsskapande och registrering
av sessionens profil/ursprung måste dela atomisk gräns. Saknad post
nekar; signerad state får inte återskapa den. Bibliotekets konsumtion
av `verification` före providerväntan bevisar inte den gränsen.
[Callback][callback], [OAuth-användare][oauthuser].

Återkallelse/utloggning ordnas mot **serverns registrering** av starter.
Ett klick i frånkopplad flik kan inte tidsordnas förrän begäran anländer.
Betydelsen av tidigare påbörjat behöver ingå i det nya beslutet.
Nya starter efter gränsen kräver ny uttrycklig begäran och nytt ID;
ingen automatisk omstart av äldre callback.

Åtgärden tar bort berörda positiva försök och ogiltigförklarar även
nycklar till sessioner dessa starter redan producerar. Konsumerad state
bevisar inte leverans. Bindningen måste följa utfärdad session så länge
nyckeln kan vara giltig, även när state gallras.

Servern kan inte säkert skilja levererad sessionscookie från väntande
svar. Konservativt annulleras alla äldre utfärdade sessioner i bindningen,
utom den nuvarande som återkallelsen bevarar. Utloggning bevarar ingen.
Detta omfattar potentiellt redan slutförda inloggningar i bindningen och
är **föreslaget räckviddsval för HITL**, särskilt över olika användare.
Andra enheters bindningar får inte påverkas.

### Rotation och auktorisering

Återkallelsens transaktion skriver AV, bevarar sessions-ID/användare,
ersätter enda giltiga tokenen, annullerar berörda försök/utfärdade
nycklar och sparar resultat. Inget alias till ny token. Gammal nyckel
nekar direkt efter commit. Ny cookie är sessionscookie.

Gränsen blir `min(tidigare gräns, första återkallelsetid + 8 h)`.
30 minuters inaktivitet gäller. Dubbletter flyttar varken gräns eller
första återkallelsens aktivitetstid. [Tidsbeslut][times].

Utan cookiecache eller sekundär lagring söker `findSession` med exakt
token. Utbyte gör gamla uppslaget tomt. Skyttels cookiecache är avstängd.
Förnyelse måste också stängas av globalt. Egen tidskontroll behöver
`nu >= gräns`; bibliotekets sessionsroute använder `<`.
[Adapter][adapter], [sessionsroute][sessionroute], [konfiguration][auth].

Kontrollen omfattar offentlig `get-session`, interna `auth.api`, alla
skyddade rutter, koppling, provider-tokenhämtning och OAuth-auktorisering.
Vissa biblioteks-API:er tillåter betrodda serveranrop utan HTTP-headers
att ange `userId` direkt. Klientfält får inte förvandlas till sådan
betrodd identitet. [Kontorutternas `resolveUserId`][account].

Redan inläst `context.session` kan överleva en `await`. Färsk kontroll
krävs vid känslig effekt, ordnad mot återkallelse. Callback och koppling
får inte skriva med passerad revision. SQLite-lås gör bara ändringar
atomiska när alla skrivningar använder samma transaktion. Asynkrona
hooks och provideranrop behöver uttrycklig integrationsgräns. Detta är
förslag, inte bevisat av probens tokenuppdatering.
[SQLite][sqlite], [databashooks][hooksdb].

### Samtidighet, utloggning och svarsförlust

- Samtidiga återkallelser behöver aktuell token/revision och unik
  åtgärdsidentitet. Första commit skriver AV och ny token. Dubbletter
  läser samma resultat utan rotation eller förlängning; ingen får byta
  gammal token mot den nya.
- Utloggning som autentiseras och tas emot före rotation kan ordnas
  efter den som serverhållen, snävt avgränsad avslutsbegäran för exakt
  session. Färska begäranden med gammal token får ingen rätt till
  åtkomst. Avslut ska vinna över senare återaktivering.
- Utloggning som kommer först efter rotation med bara ogiltig token
  får inte hitta aktuell session genom generellt alias. Aktuell
  autentisering kan behövas. Garanterat profilavslut även här behöver
  godkänt annulleringskontrakt för bindningen. Proben visar att
  standardutloggning kan säga success utan att stänga roterad nyckel;
  produkten får inte ge sådan falsk bekräftelse.
- Fel före commit lämnar hela åtgärden ogenomförd. Fel efter commit ger
  okänt klientutfall tills rätt resultat läses. Förlorat svar med ny
  token får kräva ny inloggning. Resultat ger ingen ersättningstoken.
- Gammalt svar kan skriva ogiltig cookie över den nya. Servern nekar.
  Genomfört AV bekräftas utan påstående om fortsatt inloggning eller
  fysisk cookieradering. [Beskedsbeslut][confirm].

### Kontokoppling och andra behörighetsvägar

Better Auths `link-social` kräver session vid start. Callback använder
lagrad länkinformation. Skyttel har extra `login_link`-kontroll och
minneslås per sessions-ID över callback. Gammal ogiltig nyckel nekas
av färsk `getSession`. Låset delas inte ännu med nytt återkallelseflöde.
[Kontorutter][account], [Skyttels koppling][linking].

Framtida koppling återkontrollerar användare, session, aktuell
nyckelrevision, provider, steg och aktivt försök vid effekten. Samma
sessions-ID efter rotation räcker inte. Återkallelse först innebär
misslyckad koppling och omstart med aktuell autentisering. Redan
committad koppling består även om svaret förloras. Återkallelse får inte
radera konton eller återställa gamla nycklar för att hjälpa försöket.
Implicit koppling och direkt `idToken`-inloggning måste nekas eller
uttryckligen omfattas.

Kodläsningen visar särskilt följande integrationsgränser:

- Bootstrap, hushåll, karta, administration, export/import/radering,
  profilbild, kostnader, samtalsmedgivande och textassistent använder
  `auth.api.getSession`. Röst och fortsatt arbete behöver kontroll
  även efter första autentiseringen. [App][app].
- Textassistent behåller servervalt sessions-ID och kontrollerar
  senare ID, användare och utgång. Eftersom rotation bevarar ID skiljer
  detta inte gammal token från tillåtet redan mottaget arbete. Ny
  handling måste passera aktuell autentisering.
  [Hur slutförs mottaget AI-arbete säkert när inloggningen går ut?](https://github.com/viscalyx/skyttel/issues/422)
  preciserar undantagen. Utloggning och övergång stoppar fortsatt arbete.
  [Textassistentens auktorisering][text].
- Assistant-consent och bibliotekets OAuth-auktorisering härleder
  tillstånd från browsernyckeln. Sena kod-/consentsvar behöver kontroll
  vid utfärdande. OAuth-provider har egna sessionsreferenser och
  raderingshooks; direkt SQL får inte antas köra hooks.
  [Pluginval][assistant], [OAuth-provider 1.7.7][provider].
- `/mcp` verifierar separata bearer-token och `assistant_connection`,
  användare, klient och hushåll. Godkänd extern anslutning är skild
  från browsernyckeln. Cookieåterkallelse upphäver inte automatiskt
  oberoende medgivanden. Cookie får inte bli alternativ auktorisering.
  [Assistant-rutter][assistantroutes]. `/token` är blockerat; JWT-signatur
  ensam får inte bli sessionsersättning.

Detta är kodinventering, inte körbevis för alla produktvägar eller sena
plugin- och kopplingseffekter.

## Kontrollera igen och minsta metadata

Klienten skapar slumpmässigt åtgärds-ID **före** ändringsbegäran och
behåller det i formulärets minne. Servern lagrar ID i samma transaktion
som utfallet: autentiserad ägare, ursprunglig session, typ, revision,
beslutstid och kontrollgräns. Resultatet har terminalt utfall och
nödvändiga beskedsuppgifter, inga gamla/nya token. ID korrelerar och är
ingen extra autentiseringsnyckel.

Efter förlorat svar och ogiltig gammal token kan ny inloggning krävas
som **samma användare** för exakt rätt resultat. Serverns ägarbindning
och åtgärds-ID skiljer rätt handling från annan session. Sessions-ID,
generation, påstådd ägare eller vetskap om ID ger ingen läsrätt. Annan
användare, även i samma profil, nekas. Ursprunglig session behöver inte
vara fortsatt aktiv; annars fungerar inte återhämtning efter avsiktlig
ogiltigförklaring. [Kontrollbeslut][retention].

Kontroll efter ny inloggning bekräftar gamla åtgärdens utfall. Den
bekräftar inte fortsatt gammal session eller att nya sessionens val är
AV. Gammal eller ny token får inte återutges via resultatet.

Vid ny inloggning kan ett icke-auktoriserande åtgärds-ID föras genom
serverstyrd OAuth-kontext och en begränsad returadress. Ägarkontrollen
görs efter autentisering. Detta kan bevara referensen utan extra cookie,
lokal lagring eller autentiseringsnyckel. ID får inte innehålla känsligt
resultat; returadressen måste begränsas till tillåten lokal destination.
Den lösningen är föreslagen och behöver verifieras genom hela flödet.
Ny inloggning i annan flik kan också bevara originalformulärets minne.

Om alla referenser sedan försvinner, exempelvis efter stängning eller
borttagen historik, kan exakt åtgärd inte säkert återskapas genom att
gissa senaste resultatet. Befintligt beslut anger 24 timmars tillgång
till rätt autentiserade användares resultat, men inget tydligt löfte
om återhämtning efter förlust av alla referenser. Det är en begränsning
att beskriva och verifiera, inte i sig skäl att införa mer lagring eller
ett nytt HITL-beslut.

Saknad resultatpost bevisar inte avslag medan originalbegäran kan vara
på väg. Kontroll ger då okänt utan nytt sparande. Terminalt avslag
registreras om servern faktiskt tar emot och avslår rätt begäran.
Efter 24 timmar upphör läsbarheten även om fysisk gallring dröjer.
Frånvaro får inte bli gissad framgång eller gissning om gamla valet
utifrån ny session.

Minsta operativa metadata i denna konstruktionsriktning:

- Aktiv session: ID, användare, enda aktuella token, modellversion,
  utgång, aktivitetsunderlag enligt tidsbeslut, aktivt val,
  informationsversion, beslutstid, bindning och nödvändig revision.
  Ingen historisk tokenlista.
- Aktivt försök: engångs-ID, OAuth-verifiering, provider, ändamål,
  bindning, utgång och servervalda valuppgifter. Koppling har rätt
  användare, session, revision och steg.
- Resultat: ID, ägare, ursprunglig session, typ, terminalt utfall och
  tidsgräns. Inga nycklar för fortsatt åtkomst.
- Aktuell global auth-modellversion för roll forward: driftregel,
  ingen personkopplad historisk valdatabas.

## Livscykler och kortaste säkra spärrtid

Med positiv registrering behöver borttagen rad ingen negativ spärr för
alltid. Svar kan komma godtyckligt sent utan att gammal nyckel sparas
lika länge: saknat uppslag nekar och ingen väg återskapar posten.
Detta är konstruktionshärledning, villkorad av alla kodvägar och
bevarad aktuell driftgräns.

1. Aktiva sessionsuppgifter följer behövd livstid. AV bevarar bara
   fortsatta vanliga sessionen enligt kortad gräns. Avslutade sessioner
   ger ingen åtkomst och gallras senast 24 timmar efter avslut.
   Rotation ersätter gammal token omedelbart.
2. Försök nekar vid utgång eller konsumtion. Bibliotekets tio minuter
   på servern och fem minuter för statecookien är tekniska standarder,
   inte nytt beslut om längre lagring. Eget aktivt försöksregister
   nekar också vid frånvaro/utgång. Förbrukade/utgångna poster gallras
   inom 24 timmar. Utfärdad giltig sessions bindning hör till aktiva
   sessionen, inte till förbrukad OAuth-state.
3. Resultat läses under 24 timmar från ändringen. Ingen ny frist vid
   kontroll eller ny inloggning. Därefter nekar läsvägen. Tidsstyrd
   städning raderar när fönstret slutar; åtkomstspärr är inte gallring.
4. Särskild negativ spärr kräver i denna modell **noll extra säkerhetstid
   efter atomisk borttagning**. Det ryms inom sju dygn plus 24 timmar
   för fysisk gallring, utan att taket blir standardtid. Förenklade
   modellen visar ingen återupplivning vid borttagen metadata men
   bevisar inte produktintegrationens alla vägar.

Alternativ med stateless state och temporär generationsspärr måste
behålla spärren tills berörda försök definitivt är utgångna och ingen
callback kan committa utan ny kontroll. Om gamla token nekas enbart
via spärr behövs den till deras sista giltighet, upp till kvarvarande
sjudygnsgräns. Borttagen profilpost får aldrig återställa standardgeneration
som accepterar gamla signerade data. Fullständigheten i sådan modell
verifieras inte här.

Städning körs vid uppstart och periodiskt med beständiga tidsgränser
och återstartbara batcher. Avbrott får aldrig förlänga auktorisering.
Efter omstart och borttagna spärrar ska saknat försök/session neka.
Fysisk gallring under totalt driftstopp längre än fristen kan inte
garanteras av enbart applikationsjobb. Driftförutsättningar behöver
verifieras i backupresearchen och inför överlämning. Ingen beslutad
tidsgräns visas här vara omöjlig i en drift med nödvändig städning;
gränsernas faktiska uppfyllelse är ännu inte verifierad. Aktiv bindning
får inte gömma ständigt förnyad historisk spärr.
Positiva försök kan göra historisk generation överflödig. Bindningscookiens
tid och eventuell aktiv serverpost kräver ändå det nya produktbeslutet.

## Övergång och separat återställningsgräns

Roll forward behöver atomisk driftgräns: stoppa gammal auktorisering,
avsluta äldre sessioner/försök, stoppa berört arbete och öppna bara nya
modellens positiva registrering. Gamla callbacks måste dräneras eller
nekas vid sista commitkontroll. Utfärdat gammalt cookiesvar är ofarligt
först när dess nyckel saknar giltig post. Nya uttryckliga försök får nya
poster under aktuell modell. Saknad gammal metadata får inte backfyllas.

Modellgränsen överlever omstart. När gamla poster försvinner och nya
koden aldrig accepterar eller rekonstruerar dem behövs ingen temporär
lista över gamla token. Gallring får inte ta bort regeln att gamla
format nekas. Referenser och pluginhooks behöver hanteras: `login_link`
refererar sessions-ID med kaskadradering. Konton, kopplingar, hushåll,
lagrade utkast och registrerade sparförsök är skilda från sessionerna.
[Övergångsbeslut][transition], [kopplingsschema][linkschema],
[databas][database].

Återställd databas kan återinföra positivt giltiga rader och sakna
senare återkallelser. Före återöppning behövs gräns utanför återställd
giltighet eller fullständig verifierad ogiltigförklaring av gamla
sessioner, försök och utfärdade svar. Nya försök får registreras under
nya gränsen. Backupinnehåll, leverantör och procedur hör till
[Vilka säkerhetskopior innehåller inloggningsuppgifter och hur verifieras säker återställning?](https://github.com/viscalyx/skyttel/issues/434)
Rapporten antar inte att senare spärrar överlever återställning.

## Avgränsade reproducerbara körbevis

Källan är [profile-revocation-probe.mts](profile-revocation-probe.mts).
Kör från researchgrenens rot med låsfilens beroenden och installerad
Chromium. Port 8199 måste vara ledig. Bara påhittade identiteter,
tillfällig lokal databas och simulerad provider används. Inga riktiga
provider- eller billable API-anrop sker.

```sh
npm run test:env -- node_modules/.bin/tsx research/profile-revocation-probe.mts
```

Körningen ger fem JSON-rader utan cookie- eller tokenvärden:

- `overlap`: senare statecookie ersätter äldre. Äldre callback nekar
  med senare cookien medan äldre verifieringspost fortfarande finns.
- `stock-logout-inflight-callback`: callback konsumerar state och
  väntar på simulerad provider. Utloggning sker. Callback skapar sedan
  annan användares giltiga session: faktiskt negativt körbevis.
- `rotation`: direkt SQL ersätter token i samma rad. ID/utgång består.
  Gammal token nekas av HTTP och direkt API för `getSession`,
  `listSessions`, `linkSocialAccount` och `getAccessToken`, samt adapter.
  Oberoende session består. Standardutloggning med gammal token
  returnerar 200 och lämnar nya nyckeln giltig.
- `late-response-browser`: Chromium **156.0.8078.4** skriver först
  roterad sessionscookie, sedan redan producerat callbacksvar med
  annan användares beständiga cookie. Andra användaren är
  autentiserbar tills också dess utfärdade session raderas. Cookien
  kan sedan ligga kvar utan åtkomst. HTTP-loopback bevisar inte TLS,
  proxy eller produktionens attribut. Tidigare researchens HTTPS-prob
  kompletterar transportobservationen.
- `conditional-model`: separat modell antar färdig bindning och visar
  rollback vid injicerat fel, borttagning av försök och utfärdad annan
  session, samma åtgärds-ID två gånger, databasens återöppning,
  ägarkontroll, exakt resultatfrist och ingen återupplivning efter
  städning. Den har hårdkodad generation och en åtgärd; den bevisar
  inte samtidiga återkallelser, tokenrotation eller profilbindning.

Proberna passerar via repoets delade processlås. Ingen produkt-,
integration-, real-model- eller real-voice-svit körs. Ingen
produktimplementation eller fullsystemverifiering följer av dessa prov.

## Återstående verifiering före implementationsklar specifikation

Följande är planerade kontroller, inte genomförda:

1. Efter HITL-beslut: initialisering över första parallella flikarna,
   nekad/borttagen cookie, olika användare, anonyma försök, omstart och
   överlappning. Visa vad som nekas utan bekräftad bindning.
2. Callbacks sista kontroll atomiskt med verkligt sessionsskapande
   och koppling. Håll provideranrop, skapad session och utsänt svar
   vid skilda punkter. Släpp omvänt efter återkallelse/utloggning.
   Kontrollera cookie och åtkomst, även andra enheten.
3. Samtidiga återkallelser med olika ID, dubbletter, förlorat svar,
   sena begäranden, fel före/efter commit och utloggning under rotation.
   AV och tidsgränser ska bestå utan extra aktivitet.
4. Koppling före/efter gränsen med gammal/aktuell nyckel och ny
   inloggning. Genomförd koppling består. Kontrollera pluginhooks,
   databasreferenser och JWT-/OAuth-auktorisering.
5. Alla inventerade produktvägar och interna API:er. Håll efter första
   `getSession` och före känslig effekt. Skilj nya handlingar, separat
   tillåtet redan mottaget AI-arbete och oberoende medgivanden.
6. Resultat efter förlorad rotationscookie: samma återautentiserade
   användare, fel användare/åtgärd, saknad post och exakt 24 timmar.
   Kontrollera igen får inte ändra något eller lämna ny token. Prova
   förlorat formulärminne och omdirigering vid ny inloggning.
7. Gallring vid frister, efter omstart och avbrott mitt i transaktion
   eller städbatch. Bevisa fysisk gallring. Ta bort spärrar och neka
   fortfarande gamla format/försök/token; tillåt nya uttryckliga starter.
8. Roll forward med gamla sessioner, långa arbeten och sena callbacks
   och svar. Bevara konton, kopplingar, utkast och sparförsök. Samordna
   separat återställningsprov före tjänstens återöppning.

## Primärkällor

[lock]: https://github.com/viscalyx/skyttel/blob/8f86c81d/package-lock.json
[auth]: https://github.com/viscalyx/skyttel/blob/8f86c81d/src/server/auth.ts
[app]: https://github.com/viscalyx/skyttel/blob/8f86c81d/src/server/app.ts
[linking]: https://github.com/viscalyx/skyttel/blob/8f86c81d/src/server/login-methods.ts
[linkschema]: https://github.com/viscalyx/skyttel/blob/8f86c81d/migrations/003_login_link.sql
[database]: https://github.com/viscalyx/skyttel/blob/8f86c81d/src/server/database.ts
[text]: https://github.com/viscalyx/skyttel/blob/8f86c81d/src/server/text-assistant.ts
[assistant]: https://github.com/viscalyx/skyttel/blob/8f86c81d/src/server/assistant-auth.ts
[assistantroutes]: https://github.com/viscalyx/skyttel/blob/8f86c81d/src/server/assistant-routes.ts
[previous]: https://github.com/viscalyx/skyttel/blob/98dda0ff691fc60700e5e778a50e92e9d2df9ab1/research/remembered-login.md
[times]: https://github.com/viscalyx/skyttel/issues/416#issuecomment-6176577860
[revoke]: https://github.com/viscalyx/skyttel/issues/417#issuecomment-6190546347
[confirm]: https://github.com/viscalyx/skyttel/issues/418#issuecomment-6197811528
[retention]: https://github.com/viscalyx/skyttel/issues/419#issuecomment-6198194078
[transition]: https://github.com/viscalyx/skyttel/issues/420#issuecomment-6198342920
[state]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/state.ts
[oauthstate]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/oauth2/state.ts
[oauthcontext]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/state/oauth.ts
[callback]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/callback.ts
[oauthuser]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/oauth2/link-account.ts
[adapter]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/db/internal-adapter.ts
[sessionroute]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/session.ts
[account]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/account.ts
[hooksdb]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/db/with-hooks.ts
[provider]: https://github.com/better-auth/better-auth/tree/db02f233918ad1233bf0753e437e1c0da353273d/packages/oauth-provider/src
[cookiespec]: https://www.rfc-editor.org/rfc/rfc6265
[oauthbcp]: https://datatracker.ietf.org/doc/html/rfc9700
[fetch]: https://fetch.spec.whatwg.org/#forbidden-response-header-name
[sqlite]: https://www.sqlite.org/lang_transaction.html

# Ihågkommen inloggning: serverkontrakt och verifieringsgränser

Underlag för
[Hur genomförs ihågkommen inloggning och återkallelse säkert på servern?](https://github.com/viscalyx/skyttel/issues/415)
i kartan
[Skyttel – väg till cookie- och lagringshantering med återanvända formulär](https://github.com/viscalyx/skyttel/issues/27).
Läsare är den som fattar återstående produktbeslut och senare utformar eller
granskar serverlösningen. Detta är research, ingen produktionsimplementation
eller bedömning av verifierad säkerhet eller rättslig efterlevnad.

## Resultat och bevisnivå

Better Auth 1.7.7 har användbara mekanismer för serverstyrd OAuth-state,
sessionshooks och avstängd förnyelse. Produktbeslutet kräver ändå ett eget
sammanhängande kontrakt för cookieutgivning, serverutgång och återkallelse.
Ett `rememberMe`-fält i den sociala inloggningen löser inte detta.

Den svåraste gränsen är ett äldre svar med beständig cookie som anländer
efter återkallelsens sessionscookie. En databasrevision eller klient som
ignorerar gamla JSON-svar hindrar inte webbläsaren från att skriva den äldre
cookieheadern. Detta observeras också i den avgränsade HTTPS-proben nedan.
Ett uttryckligt produktbeslut behövs om garantin och möjlig förlust av
sessionskontinuitet.

Researchen gäller 2026-10-14 och Skyttel vid
`99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c`. Låsfil och installerade paket
anger Better Auth samt OAuth-provider 1.7.7. GitHubs tagg `v1.7.7` pekar
på `db02f233918ad1233bf0753e437e1c0da353273d` vid kontrollen.
Källorna nedan är versionsbundna där bibliotekets exakta beteende avgör.

- **Kodbelägg:** lokal produktkod, installerat paket och upstreamkoden.
- **Körbevis:** in-process-anrop med påhittad OAuth-provider och SQLite i
  minnet; separat faktisk Chromium-prob över lokal HTTPS.
- **Förslag:** kontrakt och kontroller som framtida implementation behöver
  pröva. Proberna implementerar inte hela kontraktet.
- **Ej verifierat:** verklig Google/Microsoft-inloggning, produktionens
  proxy/HTTPS, fullständigt återkallelseflöde, sessionsåterställning,
  andra webbläsare och samtliga Skyttel-rutters auktorisering.

[Låsta paket][lock], [nuvarande auth-konfiguration][auth] och
[det beslutade produktbeteendet][decision]. Ingen verklig användar- eller
hushållsinformation, verklig providertoken eller betald API används.

## Vad den låsta koden faktiskt gör

### OAuth-försök och sessionsskapande

`/sign-in/social` har `additionalData` men inget `rememberMe` i sitt schema.
Redirectgrenen använder `generateState`; även en direkt `idToken`-gren
finns på samma endpoint. Den senare saknar redirectförsökets state och
måste uttryckligen nekas eller ges vanlig inloggning i ett framtida
begränsat kontrakt. Fältet kan inte få vara en dold väg till beständig
inloggning. [Social inloggning][signin].

`addOAuthServerContext`, exporterad från `better-auth/api`, kan anropas i
en `before`-hook vid inloggningsstart. `generateState` skriver denna
serverkontext efter klientens `additionalData`, så klienten kan inte
ersätta den. `getOAuthState()` läser den genererade eller validerade
stateinformationen under samma begäran. Övriga fria top-level-fält i state
kan vara klientdata och får inte betraktas som behörighet eller bevis.
[Statekontext][oauthcontext] och [stategenerering][oauthstate].

Databasstrategin skriver state i `verification` med identifieraren
`auth-state:<slumpvärde>` och tio minuters utgång. En signerad
`better-auth.state`-cookie med fem minuters `Max-Age` krävs också.
Callbacken kontrollerar state och signerad cookie, tar bort dem, kontrollerar
utgång och exponerar sedan parsed state. Utgången kontrolleras med `<`.
Ett singleton-cookienamn betyder att två samtidiga starter kan ersätta
varandras statecookie: tidigare callback misslyckas hellre än att få
det senare försöket som sitt val. [Generisk statehantering][state].

Callbacken väljer provider från sökvägen; choice-kontraktet bör dessutom
kräva att denna provider är densamma som i den serverstyrda kontexten.
Bevara bibliotekets kodverifiering, eventuell issuerkontroll och
providerns ID-token-/noncekontroller. Skyttel har separata callbackvägar
för Google och Microsoft. Vid kontokoppling finns `link` i state och
callbacken länkar utan att skapa en ny inloggningssession.
[Callback][callback] och [OAuth-säkerhetsvägledning][oauthbcp].

Vanlig social callback skapar session med `dontRememberMe` ospecificerat
och anropar sedan `setSessionCookie` utan sådant argument. Standardens
serverlivslängd är sju dygn. Ett explicit `createSession(..., true)` har
i stället ett dygn; det är en biblioteksstandard för den vägen, inget
beslut om Skyttels vanliga inloggning. [OAuth-användarhantering][oauthuser],
[intern adapter][adapter] och [callback][callback].

### Cookieutgivning och förnyelse

`setSessionCookie` väljer `Max-Age` från serverns `sessionConfig.expiresIn`
om argumentet inte anger att inloggningen ska glömmas. Ett befintligt
signerat `dont_remember` kan också styra det. Den använda sessionpostens
`expiresAt` beräknar inte automatiskt cookiens återstående tid.
`overrides` ligger sist och kan skriva över `maxAge`.
[Cookiehjälparen][cookies].

`setSessionCookie(..., true)` skapar även signerad
`better-auth.dont_remember`, normalt med sessionslivslängd och samma
säkerhetsattribut. Den är en extra browserpost, inte serverns valmetadata.
`get-session` läser den och hoppar då över förnyelse; flaggan kan dessutom
påverka en senare inloggning. Att införa den som en tyst nödvändighet
strider mot det beslutade upplägget utan separat spegelcookie.
[Cookiehjälparen][cookies] och [sessionhämtning][sessionroute].

Ett alternativ som undviker flaggan är att stänga av all automatisk
sessionsförnyelse och cookiecache samt styra sessionscookien i en gemensam
svarsgräns. Då kan en vanlig cookie utfärdas med `maxAge: undefined` och
utan `expires`, efter att bibliotekets motsvarande header tagits bort.
Att enbart konfigurera standardattribut räcker inte: hjälparen skriver
själv `maxAge`, och förnyelsevägen anropar den explicit med `false`.
Detta är ett rekommenderat tekniskt alternativ, inte ett körverifierat
helt produktflöde. [Cookiehjälparen][cookies] och [sessionhämtning][sessionroute].

`get-session` förnyar som standard efter ett dygn och flyttar serverns
utgång till nu plus sju dygn. `session.disableSessionRefresh: true`
stoppar den grenen globalt. `disableRefresh` på ett enskilt anrop är
svagare som garanti eftersom alla andra anrop också måste ange det.
Skyttel har redan `cookieCache.enabled: false`; behåll det så serverns
återkallelse inte kringgås via en fristående cookiecache.
[Sessionhämtning][sessionroute] och [bibliotekets sessionsdokumentation][sessionsdocs].

Skyttels publika `/api/auth/get-session` returnerar bibliotekets headers.
Interna `auth.api.getSession`-anrop används däremot som dataläsningar utan
vidarebefordran av headers; det hindrar inte en möjlig ändring av
serverposten. Även pluginmiddleware kan hämta session och vidareföra
headers. Granska därför både publika svar och intern auktorisering,
inklusive assistantens OAuth-provider, kontokoppling och utloggning.
[Appens auth-rutter][app], [sessionmiddleware][sessionroute] och
[assistantkonfiguration][assistant].

## Möjligt sammanhängande serverkontrakt

Det följande är ett underbyggt förslag att verifiera efter de återstående
produktbesluten. Det gör inget anspråk på att alla egenskaper redan gäller.

### Bind val, försök och ny session

1. En same-origin `POST` för inloggningsstart accepterar en strikt boolean
   och en begränsad informationsversion. Saknad, ogiltig eller inkompatibel
   valmetadata ger `remember=false`; ogiltig begäran i övrigt kan avvisas.
   Servern väljer vilka informationsversioner den accepterar, och skriver
   tid, strukturversion, provider och ändamålet `sign-in`. Klientens
   påstådda användare, session, serverdatum eller deadline accepteras inte.
2. Servern lägger normaliserad choice i `addOAuthServerContext`. Endast
   tillåtna redirectvägar används; fria `additionalData` används aldrig
   som trusted choice. En `before`-hook är en möjlig mekanism. En strikt
   wrapper kring starten kan också bestämma body och originregler.
3. Callbackens state/cookie, provider och giltighet måste valideras innan
   choice får användas. Saknad choice betyder vanlig inloggning; felaktig
   OAuth-state betyder misslyckad autentisering, aldrig en fallback som
   hoppar över OAuth-skyddet. Lås varje stateförsök genom callbackens
   asynkrona arbete så samma försök inte skapar flera sessioner samtidigt.
4. `databaseHooks.session.create.before` kan läsa `getOAuthState()` efter
   statekontrollen och skriva valfält och `expiresAt` i samma sessionpost.
   Använd serverns `createdAt` för sjudygnsgränsen. Koppla inte valet till
   en användare från klienten eller till en äldre cookie i callbacken.
5. Databasens skapade sessions-ID och användare är identiteten.
   `session.create.after` eller `ctx.context.newSession` i efterhooken ger
   den nya sessionen. En redirectadress ensam bevisar inte vilken session
   som skapats eller att valmetadata sparats. Utge ingen beständig cookie
   om lagringen misslyckas.

Punkterna om hooks stöds av [databashooks][hooksdb],
[OAuth-statekontext][oauthcontext] och [API-hooks][hooksdocs]. Körproben
bekräftar just stateåtkomst och `newSession`, men sparar inte de föreslagna
extra fälten och provar inte ett färdigt återkallelsekontrakt.

Bibliotekets databas-state gör en läsning och därefter radering; den
funktionen i sig är inte ett bevis på atomisk engångskonsumtion över
parallella callbackanrop. Ett lås per state passar Skyttels nu dokumenterade
enda appinstans. Fler instanser kräver delat lås eller atomisk konsumtion
med varaktigt anspråk. Skapa inte ett okontrollerat extra stateförråd bara
för att slippa granska bibliotekets väg. [Statehantering][state] och
[Skyttels befintliga serialisering][linking].

### Minsta lagring och versioner

Ett möjligt minimum är serverstyrd choice i den redan befintliga
OAuth-verifieringen och serverstyrda extra kolumner på `session`:

- `choiceSchemaVersion`: representerar tolkningen av strukturen.
- `rememberLogin`: nu gällande aktivt val för denna session.
- `choiceInfoVersion`: version av informationen som visas vid aktivt val;
  ingen allmän appversion och inget bevis på klientens faktiska läsning.
- `choiceAt`: serverns tid när startbegäran med val accepteras.
- Befintliga `id`, `userId` och `createdAt`: koppling och inloggningstid.
- `absoluteExpiresAt`: serverns oföränderligt begränsade slutpunkt.
  Befintligt `expiresAt` måste aldrig överskrida den.
- `choiceRevision`: monoton serverrevision för villkorliga skrivningar och
  UI-läsning. Den är inte en förmåga att filtrera browserheaders.

En separat tabell med `sessionId` som unik främmande nyckel är ett annat
alternativ, men kräver att metadata och sessionsskapande blir atomiska.
Att skriva valmetadata i en efterhook och anta att ett fel rullar tillbaka
sessionen är inte underbyggt; efterhooks kan schemaläggas efter transaktion.
En sessionrad med extra fält undviker just denna dubbel skrivning.
Better Auths `additionalFields` måste konfigureras med `input: false` och
lämpligt `returned: false` så råfält inte blir klientstyrbara eller
exponeras i onödan. [Fälttyper][fieldtypes], [databashooks][hooksdb] och
[nuvarande sessionsschema][schema].

`revokedAt`, tidigare informationsversioner eller separat oföränderlig
bevislogg är möjliga tillägg, men inget av dem antas ingå i minimum.
Om historiskt bevis ska behållas efter avslutad session behövs ett eget
beslut om ändamål, innehåll, åtkomst och tid. Samla inte ytterligare IP
eller fingeravtryck för choice. Biblioteket sparar redan IP/user-agent på
sessionen; det är separat från behovet av valmetadata.
[Intern adapter][adapter] och [IMY:s principer][imy].

Valfält kan gallras tillsammans med sessionen. OAuth-metadata följer
försökets korta utgång och engångskonsumtion; avbrutna försök och utgångna
sessioner behöver en uttrycklig städväg eftersom uteblivna nästa anrop
inte garanterar radering. Uppgifterna blir inte fysiskt raderade från
backup vid samma tid som live-raden. Eventuell bevislagring och backupens
bevarandetid är därför frågor att precisera, inte implicita extrafält.
[Statehantering][state], [intern adapter][adapter] och [IMY:s principer][imy].

### En enda kontrollerad väg för cookies och auktorisering

- Behåll avstängd cookiecache, inaktivera automatisk sessionsförnyelse och
  inventera alla session-/tokenutgivande routes och pluginvägar.
- En slutlig svarsgräns granskar varje faktisk `Set-Cookie`, inklusive
  redirects och felsvar. Ta bort alla tidigare headers för samma
  sessionscookienamn innan exakt en slutlig header skrivs; vik inte ihop
  flera cookies eller dela på komma eftersom `Expires` innehåller komma.
- Ny vanlig session och återkallelse: samma cookieidentitet med
  `HttpOnly`, HTTPS-`Secure`, `SameSite=Lax`, `Path=/`, utan `Domain`,
  `Max-Age` och `Expires`. Det är attributen tillsammans som avgör läget.
- Beständig session: bara giltig aktiv choice får ge beständig cookie.
  Sätt fast `Expires=absoluteExpiresAt`; eventuell `Max-Age` får vara högst
  återstående hela sekunder. `Max-Age` är relativ till mottagandet, så
  tillräckligt fördröjt svar kan ge browserlagring efter deadline. Serverns
  absoluta kontroll får aldrig bero på browserns klocka eller cookietid.
- Läsningar ska normalt inte återutge token. Saknad/ogiltig valmetadata
  får inte innebära implicit godkännande. Om reparation behövs får den ge
  vanlig cookie och bibehålla eller minska giltigheten.
- Auktorisering på varje skyddad begäran ska läsa aktuell serversession
  och kontrollera `now >= absoluteExpiresAt` samt faktisk `expiresAt` och
  eventuell beslutad inaktivitet. Använd samma skydd även för intern API,
  WebSocket-åtkomst och långvarigt arbete som annars kan överleva utgång.

Källa för cookieegenskaper och tidssemantik är [RFC 6265][cookiebcp] och
[MDN:s cookieattribut][mdncookie]; teknisk kontroll måste prövas mot
[bibliotekets cookiehjälpare][cookies] och [nuvarande API-rutter][app].

Bibliotekets sessionhämtning jämför `expiresAt < now`: proben accepterar
exakt likhet och avvisar en millisekund senare. Ett strikt kontrakt med
åtkomst endast **före** sjudygnsgränsen behöver därför den egna
`now >= deadline`-kontrollen och ett gränstest, även med förnyelse avstängd.
[Sessionhämtning][sessionroute].

## Återkallelse, samtidighet och säkerhetsgränser

### Vad återkallelse kan göra utan utloggning

En autentiserad same-origin `POST` härleder session och användare från
verifierad token, inte request body. Servern läser sessionen på nytt
under lås/transaktion, sätter `rememberLogin=false`, ökar revisionen och
behåller eller minskar `expiresAt` och absolut deadline. Servern skickar
en sessionscookie för just samma webbläsare. Upprepning är idempotent;
den gamla aktiva choice får inte kunna aktiveras igen genom ett stale
write. Utloggning är separat och raderar/ogiltigförklarar sessionen.
[Sessionsvägledning][owaspsession] och [bibliotekets utloggning][signout].

Om ursprunglig deadline är `D` och återkallelsen sker vid `R`, är
återstående servertid högst `max(0, D-R)`. En vanlig serverpolicy kan
korta den ytterligare, exempelvis `min(D, R+vanligGräns)`; den får inte
flytta `D` framåt. Vilken sådan policy som ska gälla, och från vilken
tidpunkt den beräknas, kräver HITL-beslut. Inaktivitet är en separat
serverregel, inte cookieattribut eller bibliotekets `updateAge`.
[Sessionsvägledning][owaspsession].

En sessionscookie lovar inte att servern avslutar sessionen när sista
fönstret stängs. Webbläsaren kan återställa den. Därför måste UI beskriva
valfri beständighet och faktisk serverutgång utan att lova säker utloggning
vid fönsterstängning. [MDN om sessionsåterställning][mdncookie].

### Ett gammalt headerfält kan inte avvisas med databasrevision

Förloppet är konkret: A får en beständig cookieheader beräknad under aktiv
choice; A:s svar dröjer. B återkallar, servern sparar `false`, och B:s svar
ersätter cookien med sessionscookie. A anländer därefter och ersätter
åter cookien med sin beständiga variant. JavaScript som ignorerar A:s JSON
stoppar inte cookiehanteringen. Ett lås fram till serverns sändning ordnar
inte nödvändigtvis mottagningen över olika anslutningar.
[RFC 6265, avsnitt 4.1 och 4.1.2][cookiebcp].

Tre garantier behöver hållas isär:

1. **Serverns choice återställs inte:** transaktion/revision och återläsning
   kan ge detta. En äldre klient får ingen behörighet att välja `true`.
2. **Äldre token återger inte fungerande ihågkommen inloggning:** rotation
   av token och omedelbar ogiltigförklaring av föregående token kan ge en
   starkare servergaranti. Sena headers kan ändå ersätta den nya cookien
   med en ogiltig gammal token och förlora fortsatt inloggning. Behåll
   samma session-ID och deadline om token byts; ett nytt sessions-ID kan
   påverka länkningsförsök och andra sessionsbundna tillstånd. En generell
   gammal-token-alias återinför risken och behöver separat analys.
3. **Ingen beständig cookiepost finns efter lyckad återkallelse:** det
   kan inte lovas från ett vanligt same-name-cookieprotokoll när redan
   utgivna headers får anlända senare. Tokenrotation ogiltigförklarar
   innehållet men hindrar inte själva lagringen av posten.

Detta är slutsatser ur HTTP-reglerna och den körda browserproben, inte en
föreslagen ändring av produktbeslutet. Det kan krävas en omformulerad
garanti eller annat protokoll. Klientkoordination mellan flikar,
`AbortController`, svarsversioner och efterföljande reparationsanrop hjälper
den normala upplevelsen men utgör inte ett generellt bevis för den tredje
garantin. [RFC 6265][cookiebcp] och [Fetch-standarden][fetch].

Kontokopplingens OAuth-försök hör till den redan autentiserade sessionen,
inte ett nytt `Kom ihåg mig`. Länkningsförsök efter återkallelse måste läsa
aktuell choice; efter tokenrotation krävs aktuell token. Äldre session-
eller användarsvar får inte ändra ett nytt kontos UI. Andra enheters
sessioner påverkas inte av uppdateringen för aktuellt sessions-ID.
Två nya inloggningar i samma browserprofil konkurrerar däremot om samma
cookie: ett äldre callback-svar kan byta aktuell session. Produktens val
per försök kan skyddas på servern, men samtidiga starters mottagningsordning
måste testas och hanteras som en del av garantin ovan.
[Skyttels kopplingskontroller][linking] och [callback][callback].

### Behörighet, origin, CSRF och indata

Alla choice-läsningar och ändringar härleder aktuell session från den
verifierade auth-cookien och serversessionens `userId`. Strikt schema
utesluter klientstyrda sessionsägare, tid och deadline. Begränsa body,
acceptera JSON på ändringsanrop, kräv exakt konfigurerad `Origin`, neka
saknat/null/felaktigt ursprung och håll `trustedOrigins` snäv. Läsningar
ska inte vara förnyande skrivningar och alla känsliga svar får `no-store`.
[CSRF-vägledning][owaspcsrf] och [Skyttels nuvarande skydd][app].

Better Auths originmiddleware hoppar över GET och anrop utan `Request`.
Social start har särskilt skydd för första inloggning, men frånvaron av
samtliga browsermetadata i ett anrop är inte samma sak som exakt
Origin-krav. Interna API-anrop kan därför inte ersätta wrapperns egna
kontroller. OAuth-callback som kommer från providern behöver sitt
state-/cookie-/kodskydd; ett krav på Skyttel-Origin på just callback-GET
skulle kunna blockera det avsedda flödet. Stäng inte av statecookie,
origin- eller CSRF-kontroller för att komma runt ett fel.
[Originmiddleware][origincheck] och [OAuth-state][state].

Behåll HTTPS, `HttpOnly`, `Secure` och uttryckligt OAuth-kompatibelt
`SameSite=Lax`; inget subdomän-`Domain` behövs. Skyttels standardnamn får
`__Secure-` vid HTTPS; det är inte ett `__Host-`-löfte. Direkt skriptläsning
förhindras av `HttpOnly`, men XSS kan fortfarande skicka same-origin-anrop.
Skydda databas, backup och driftsåtkomst; logga inte token, OAuth-state
eller providerkod. Valmetadata är inte en autentiseringsnyckel.
[Cookiehjälparen][cookies] och [sessionsvägledning][owaspsession].

## Fel, nekad lagring och bekräftelse

Ett serverlagringsfel före OAuth-start ska inte ge beständig inloggning.
Om säker state inte kan sparas misslyckas autentiseringsförsöket. Om bara
choice är ogiltig men säker state/session kan skapas blir utfallet vanlig
inloggning och ett tydligt besked att ihågkommen inloggning inte sparas.
Skriv metadata och session atomiskt, eller avbryt utan giltig beständig
cookie. Fel i en efterhook är inte i sig bevis på rollback.
[Statehantering][state] och [databashooks][hooksdb].

Vid återkallelse är databascommit och webbläsarens cookiebyte två skilda
steg. Ett nätfel kan ge okänt utfall även om servern redan sparar `false`.
En idempotent upprepning och aktuell serverläsning kan kontrollera choice;
UI visar väntande eller fel tills det relevanta utfallet är känt. Ett
nytt kontobyte ska avbryta eller förkasta gamla UI-resultat. Ingen lokal
`localStorage`-nyckel eller spegelcookie behövs för serverläsningen.

Webbläsaren får neka `Set-Cookie`. Frontend kan inte läsa denna header
eller en `HttpOnly`-cookie. Ett följande autentiserat anrop kan visa att
browsern nu skickar token, men kan inte bevisa beständighet efter omstart
eller att den tidigare cookien verkligen ersätts om samma token används.
Serverns svar kan alltså bekräfta sparad choice och utgiven header,
inte browserns framtida lagringsvilja. Proben observerar även att
`fetch().headers.get('set-cookie')` ger `null`.
[Fetch-standarden][fetch] och [RFC 6265, avsnitt 5.2][cookiebcp].

Vid ny inloggning kan bootstrap med ny sessionsgeneration upptäcka saknad
cookie och visa att inloggningen inte går att behålla. Vid tokenrotation
kan efterkontroll av just den nya generationen visa att cookiebytet
fungerar för stunden. Rå token behöver aldrig exponeras för JavaScript.
Om återkallelsen redan sparas på servern men browserbekräftelsen saknas,
visa det som separat eller osäkert utfall och ge möjlighet till nytt försök
eller separat utloggning. Exakt löfte och formulering är ett produktbeslut.

## Migration och kvarstående produktfrågor

En teknisk väg är en ny numrerad SQLite-migration med extra sessionfält,
konfiguration av serverstyrda `additionalFields` och kontroll av schema
innan start. Redigera inte gamla migrationsfiler med sparade checksummor.
Rulla ut deadlinekontrollen och avstängd förnyelse tillsammans med den
nya cookiegränsen; annars kan gamla routes återskapa beständighet.
[Databasmigrationer][database] och [fälttyper][fieldtypes].

Gamla sessioner saknar ett aktivt val som uppfyller nya kontraktet.
Tilldela dem aldrig `rememberLogin=true` genom backfill. Bara en
sessionscookie på nästa svar kan inte göra redan sparad beständig token
verkningslös före nästa kontakt eller om browsern återställer den.
Ogiltigförklaring av gamla token kräver ny inloggning; fortsatt vanlig
användning med gammal token har en svagare övergångsgaranti. Den
avvägningen måste beslutas innan migrationen utformas.

Följande öppna HITL-ärenden preciserar de återstående produktbesluten:

1. [Vilka tidsgränser och lagringsval ska gälla under en pågående inloggning?](https://github.com/viscalyx/skyttel/issues/416)
   Bestäm absolut tid och eventuell inaktivitet samt startpunkt. Jämför
   kvarvarande ursprunglig deadline med en kortare vanlig gräns; ingen
   modell får förlänga den redan beslutade sjudygnsgränsen.
2. [Vilken återkallelsegaranti ska Skyttel ge när gamla cookiesvar anländer sent?](https://github.com/viscalyx/skyttel/issues/417)
   Avgör om ogiltig ihågkommen token räcker, om cookieposten måste vara
   borta, och om tokenrotation får avbryta kontinuitet i samma browser.
   Den nu beskrivna kombinationen av strikt lagringsgaranti och garanterad
   fortsatt session är inte bevisad för same-name-cookieprotokollet.
   Frågan om tidsgränser och lagringsval ovan omfattar också om PÅ får
   väljas under en redan pågående vanlig session. Beslutet ger uttryckligt
   val vid ny inloggning och AV efteråt; det ger inget tydligt stöd för
   senare aktivering eller återaktivering. Anta inte sådan aktivering,
   och starta aldrig om sjudygnsgränsen.
3. [Vad kan Skyttel bekräfta när webbläsarens lagring inte kan verifieras?](https://github.com/viscalyx/skyttel/issues/418)
   Skilj sparad serverchoice, lyckat cookieutgivningssvar och kontrollerad
   fortsatt autentisering. Bestäm fel/okänt utfall och väg till nytt försök.
4. [Hur länge ska uppgifter om ihågkommen inloggning sparas på servern?](https://github.com/viscalyx/skyttel/issues/419)
   Pröva sessionens minimum mot separat bevislagring; bestäm gallring,
   backup och tillåtna informationsversioner utan att anta historikbehov.
5. [Hur ska befintliga sessioner utan aktivt lagringsval hanteras vid övergången?](https://github.com/viscalyx/skyttel/issues/420)
   Jämför krav på ny inloggning med en avgränsad övergång som endast ger
   vanlig cookie vid nästa kontakt. Bestäm vilket övergångslöfte som är
   förenligt med avsaknaden av ett gammalt uttryckligt val.

## Verifieringsplan för framtida implementation

Kontroller ska använda påhittade identiteter, den låsta versionen och
repo-npm-skript med delat processlås. Observera headers på transportnivå
och cookieattribut i browserverktyg; publicera aldrig värden eller tokens.

- OAuth-start/callback över faktisk HTTPS och lokal utvecklings-HTTP:
  rätt namn, host/path, `Secure`, `HttpOnly`, `SameSite` och exakt ett
  sessionheaderfält. Prova avmarkerat och aktivt val, felaktiga fält och
  informations-/strukturversioner samt saknad metadata.
- Försök med saknad/felaktig statecookie, förfalskat state, replay,
  fel provider, två samtidiga starter, två samtidiga callbacks,
  avbrutet försök och utgång vid cookie- respektive servergräns.
  Säker OAuth-state måste avvisas vid fel; choice får aldrig flyttas
  mellan försök, användare eller kontokoppling.
- Läs session via publikt `get-session`, bootstrap, interna skyddade
  routes, linking och assistant-OAuth efter mer än ett dygn.
  Kontrollera både `Set-Cookie` och faktiska SQLite-värden. Ingen läsning
  får flytta deadline eller återinföra `dont_remember`/cookiecache.
- Testa tiden strax före, exakt vid och strax efter sju dygn med gammal
  signerad cookie. Försök kringgå via klockfält, version, refreshvägar,
  intern API och redan pågående långt arbete. Servern ska neka åtkomst
  vid deadline även om browsern fortfarande sparar en cookie.
- Återkalla med två flikar och annan enhet inloggad. Fortsatt åtkomst i
  aktuell session följer vald vanlig policy; andra enhetens session
  behåller sina fält. Serverns deadline ökar aldrig. Utloggning upphör
  även vid återspelning av gammal token.
- Håll äldre callback-/förnyelse-/choice-/felsvar tills återkallelse eller
  kontobyte redan har svarat. Släpp dem i omvänd ordning och observera
  både cookieattribut, tokenens faktiska åtkomst och UI-generation.
  En JSON-revision är otillräckligt resultat för det testet.
- Neka cookies helt, tillåt befintlig cookie men neka ersättning, neka
  beständighet, bryt nätverket efter commit, injicera DB-fel och kör
  idempotent nytt försök. UI får inte visa falsk sparbekräftelse.
- Prova saknad/fel/null-Origin, cross-site form, annan origin inklusive
  annan port, felaktig content-type, oönskade fält och överstor body.
  Inga klientval av sessions-ID får ändra annan sessions choice.
- Prova browserns verkliga sessionsåterställning separat i stödda
  webbläsare. Granska proxyns faktiska cookiehantering och databas-/backup-
  gallring. Lokal självsignerad HTTPS bevisar inte produktionens TLS.

## Avgränsade körbevis och reproduktion

Proberna nedan är kompletta källor som kan kopieras till `probe.mts` och
`browser-probe.mjs` i en separat worktree på ovan angiven Skyttel-commit
med dess låsta beroenden installerade. De är researchverktyg, ska inte
kopieras till produkten. Kör från arbetskatalogens rot:

```sh
npm run test:env -- node_modules/.bin/tsx probe.mts
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout /tmp/research-415-key.pem \
  -out /tmp/research-415-cert.pem -days 1 -subj /CN=localhost
npm run test:env -- node browser-probe.mjs
```

Första proben ändrar enbart en minnesdatabas och mockar providern direkt
i auth-kontexten. Den testar bibliotekets verkliga endpoint-/hookkod,
men inte nätverk, OIDC-signaturer eller en verklig provider. Resultatet:

- Callback: 302; signerad state rensas. Klientens förfalskade
  `additionalData.serverContext` ersätter inte serverns `false`.
- Databashook ser validerad state och efterhook ser `newSession`.
  Defaultcallbacken ger ändå `Max-Age=604800`, `Path=/`, `HttpOnly`,
  `Secure`, `SameSite=Lax`; inget `dont_remember` skapas i detta flöde.
- Med globalt avstängd förnyelse: inga `Set-Cookie`, oförändrad
  serverutgång även när förnyelse annars är mogen.
- Med standardförnyelse: en ny beständig cookie och utgång flyttad framåt.
- Exakt utgång: biblioteket accepterar likhet; en millisekund senare
  returnerar det `null`. Det är en uppmätt begränsning, inte godkänt
  beteende för det föreslagna deadlinekontraktet.

Andra proben använder faktisk Chromium **156.0.8078.4**, TLS över loopback
och ett tillfälligt självsignerat certifikat accepterat bara för proben.
Servern håller ett svar öppet, skickar först en sessionscookie och därefter
det gamla svaret med samma cookie och beständighet. Browserinspektionen
visar först `expires=-1`, sedan framtida utgång. `Secure`, `HttpOnly` och
`SameSite=Lax` bevaras. Frontend kan inte läsa `Set-Cookie`.
Proben innehåller ingen Better Auth-auktorisering och bevisar endast
browserns headerbeteende, inte en fungerande säker återkallelse.

Inga produkt-, integrations-, real-model- eller real-voice-suites körs.
Dokument- och diffkontroller redovisas i ärendets resolution tillsammans
med fryst commitlänk. Varken verifierad säkerhet eller rättslig efterlevnad
kan härledas ur dessa två avgränsade prober.

## Primärkällor

[decision]: https://github.com/viscalyx/skyttel/issues/412#issuecomment-6172094393
[lock]: https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/package-lock.json
[auth]: https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/server/auth.ts
[app]: https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/server/app.ts
[linking]: https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/server/login-methods.ts
[assistant]: https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/server/assistant-auth.ts
[schema]: https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/migrations/001_initial.sql
[database]: https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/server/database.ts
[signin]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/sign-in.ts
[callback]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/callback.ts
[state]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/state.ts
[oauthstate]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/oauth2/state.ts
[oauthcontext]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/state/oauth.ts
[oauthuser]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/oauth2/link-account.ts
[adapter]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/db/internal-adapter.ts
[cookies]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/cookies/index.ts
[sessionroute]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/session.ts
[signout]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/sign-out.ts
[hooksdb]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/db/with-hooks.ts
[fieldtypes]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/core/src/db/type.ts
[origincheck]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/middlewares/origin-check.ts
[sessionsdocs]: https://better-auth.com/docs/concepts/session-management
[hooksdocs]: https://better-auth.com/docs/concepts/hooks
[cookiebcp]: https://www.rfc-editor.org/rfc/rfc6265
[oauthbcp]: https://www.rfc-editor.org/rfc/rfc9700
[owaspsession]: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
[owaspcsrf]: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
[mdncookie]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
[fetch]: https://fetch.spec.whatwg.org/#forbidden-response-header-name
[imy]: https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/grundlaggande-principer/

## Kompletta probkällor

### In-process-prob: `probe.mts`

<!-- markdownlint-disable MD013 -->
```typescript
import assert from 'node:assert/strict';
import { betterAuth } from 'better-auth';
import { addOAuthServerContext, getOAuthState, createAuthMiddleware } from 'better-auth/api';
import { openDatabase } from './src/server/database.ts';

const origin = 'https://research.skyttel.invalid';
const database = openDatabase(':memory:');
let choice = false;
let readState;
let created;
const auth = betterAuth({
  baseURL: origin, database, secret: 'research-only-fake-secret-32-characters-long',
  telemetry: { enabled: false }, logger: { disabled: true },
  trustedOrigins: [origin], socialProviders: { google: { clientId: 'fake', clientSecret: 'fake' } },
  session: { cookieCache: { enabled: false }, disableSessionRefresh: true },
  hooks: { before: createAuthMiddleware(async ctx => {
    if (ctx.path === '/sign-in/social') await addOAuthServerContext({
      loginChoice: { schemaVersion: 1, infoVersion: 'research-v1', remember: choice, provider: 'google' },
    });
  }), after: createAuthMiddleware(async ctx => {
    if (ctx.context.newSession) created = ctx.context.newSession;
  }) },
  databaseHooks: { session: { create: { before: async (session, ctx) => {
    readState = await getOAuthState();
    assert.ok(ctx?.path?.startsWith('/callback/'));
    assert.equal(readState?.serverContext?.loginChoice.remember, choice);
    return { data: { ...session, expiresAt: new Date(Date.now() + 604800000) } };
  } } } },
});
const context = await auth.$context;
context.socialProviders = [{
  id: 'google', name: 'fake', options: {},
  accountSubject: ({ profile }) => profile.sub,
  createAuthorizationURL: async ({ state }) => new URL(`https://provider.invalid/?state=${state}`),
  validateAuthorizationCode: async () => ({ accessToken: 'FAKE-NO-REAL-TOKEN', scopes: ['openid'] }),
  getUserInfo: async () => ({ user: { id: 'fake-subject', email: 'fake@research.invalid', emailVerified: true, name: 'Research' }, data: { sub: 'fake-subject' } }),
}];
const call = (path, options = {}) => auth.handler(new Request(origin + '/api/auth' + path, options));
const cookie = r => r.headers.getSetCookie().map(v => v.split(';')[0]).join('; ');
const redact = h => h.map(v => v.replace(/^([^=]+)=[^;]*/, '$1=<redacted>'));

const start = await call('/sign-in/social', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'google', callbackURL: '/', additionalData: { serverContext: { loginChoice: { remember: true } }, remember: true } }) });
assert.equal(start.status, 200);
const state = new URL((await start.json()).url).searchParams.get('state');
const callback = await call(`/callback/google?code=fake&state=${state}`, { headers: { Cookie: cookie(start) } });
assert.equal(callback.status, 302);
console.log(JSON.stringify({ location: callback.headers.get('location'), readStateAvailable: !!readState, createdAvailable: !!created }));
assert.ok(created?.session);
assert.equal(readState.serverContext.loginChoice.remember, false);
const tokenHeader = callback.headers.getSetCookie().find(v => v.startsWith('__Secure-better-auth.session_token='));
assert.match(tokenHeader, /Max-Age=604800/i);
console.log(JSON.stringify({ probe: 'oauth-server-context', status: callback.status, clientSpoofIgnored: true, databaseHookSawValidatedState: true, afterHookSawNewSession: true, callbackHeaders: redact(callback.headers.getSetCookie()) }));

const tokenCookie = tokenHeader.split(';')[0];
const originalExpiry = database.prepare('SELECT expiresAt FROM session WHERE id = ?').get(created.session.id).expiresAt;
// Make refresh eligible without waiting a day; global switch must prevent writes.
const oldExpiry = Date.now() + 5 * 86400000;
database.prepare('UPDATE session SET expiresAt = ? WHERE id = ?').run(oldExpiry, created.session.id);
const disabled = await call('/get-session', { headers: { Cookie: tokenCookie } });
assert.ok((await disabled.json()).session);
assert.deepEqual(disabled.headers.getSetCookie(), []);
assert.equal(database.prepare('SELECT expiresAt FROM session WHERE id = ?').get(created.session.id).expiresAt, oldExpiry);
const defaultAuth = betterAuth({ baseURL: origin, database,
  secret: 'research-only-fake-secret-32-characters-long',
  telemetry: { enabled: false }, logger: { disabled: true },
  session: { cookieCache: { enabled: false } },
});
const refreshed = await defaultAuth.handler(new Request(origin + '/api/auth/get-session', { headers: { Cookie: tokenCookie } }));
assert.ok((await refreshed.json()).session);
const refreshedExpiry = database.prepare('SELECT expiresAt FROM session WHERE id = ?').get(created.session.id).expiresAt;
assert.ok(new Date(refreshedExpiry).getTime() > oldExpiry);
console.log(JSON.stringify({ probe: 'refresh', disabledHeaders: [], disabledPreservedExpiry: true, defaultMovedDeadline: true, defaultHeaders: redact(refreshed.headers.getSetCookie()) }));
context.options.session.disableSessionRefresh = true;
// Source uses strictly less-than expiry, so equality is checked separately.
const realDate = Date;
const boundary = Date.now() + 1000;
database.prepare('UPDATE session SET expiresAt = ? WHERE id = ?').run(boundary, created.session.id);
function at(ms) {
  globalThis.Date = class extends realDate { constructor(...args) { super(...(args.length ? args : [ms])); } static now() { return ms; } };
}
at(boundary);
const equalResponse = await call('/get-session', { headers: { Cookie: tokenCookie } });
const equalAccepted = !!(await equalResponse.json())?.session;
at(boundary + 1);
const expiredResponse = await call('/get-session', { headers: { Cookie: tokenCookie } });
assert.equal(await expiredResponse.json(), null);
globalThis.Date = realDate;
console.log(JSON.stringify({ probe: 'deadline', exactEqualityAccepted: equalAccepted, oneMillisecondAfterRejected: true, originalExpiryWasSevenDays: Math.abs(new Date(originalExpiry).getTime() - created.session.createdAt.getTime() - 604800000) < 1000 }));
database.close();
```
<!-- markdownlint-enable MD013 -->

### HTTPS-browserprob: `browser-probe.mjs`

<!-- markdownlint-disable MD013 -->
```javascript
import assert from 'node:assert/strict';
import { createServer } from 'node:https';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
let staleResponse;
let signalArrival;
const arrived = new Promise(resolve => { signalArrival = resolve; });
const attrs = '; Path=/; HttpOnly; Secure; SameSite=Lax';
const server = createServer({ key: readFileSync('/tmp/research-415-key.pem'), cert: readFileSync('/tmp/research-415-cert.pem') }, (req, res) => {
  if (req.url === '/old') { staleResponse = res; signalArrival(); return; }
  if (req.url === '/withdraw') res.setHeader('Set-Cookie', '__Secure-research=fake-session' + attrs);
  res.end(req.url === '/' ? '<!doctype html><title>Offline research</title>' : 'ok');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `https://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.goto(origin);
  await page.evaluate(() => { window.oldResponse = fetch('/old'); });
  await arrived;
  const readHeader = await page.evaluate(async () => (await fetch('/withdraw')).headers.get('set-cookie'));
  const before = (await context.cookies())[0];
  assert.equal(before.expires, -1);
  assert.equal(readHeader, null);
  staleResponse.setHeader('Set-Cookie', '__Secure-research=fake-session; Max-Age=604800' + attrs);
  staleResponse.end('old');
  await page.evaluate(() => window.oldResponse);
  const after = (await context.cookies())[0];
  assert.ok(after.expires > Date.now() / 1000);
  assert.equal(after.value, before.value);
  console.log(JSON.stringify({ browserVersion: browser.version(), originProtocol: 'https:', selfSignedCertificateAcceptedForLocalProbeOnly: true, sessionCookieAfterWithdrawal: before.expires === -1, staleResponseRestoredPersistentCookie: true, frontendCouldReadSetCookie: readHeader !== null, secure: after.secure, httpOnly: after.httpOnly, sameSite: after.sameSite }));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
```
<!-- markdownlint-enable MD013 -->

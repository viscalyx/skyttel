# Skyttels faktiska webbläsarlagring

Underlag för beslutet
[Vilken webbläsarlagring behöver Skyttels cookiehantering styra?](https://github.com/viscalyx/skyttel/issues/409)
i kartan
[Skyttel – väg till cookie- och lagringshantering med återanvända formulär](https://github.com/viscalyx/skyttel/issues/27).

## Avgränsning och bevisnivå

Inventeringen gäller 2026-10-14 och Skyttel vid commit
`99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c`. Den bygger på produktkod,
låsfil och lokalt installerad bibliotekskod. Inga riktiga inloggningar,
webbläsarsessioner eller modell- och röstanrop ingår. Därför är nedan
**kodbelagda fakta och slutsatser ur kod**, inte observerade cookies i
produktion. Ingen juridisk kategorisering eller profilkoppling beslutas.

Better Auth och dess OAuth-provider är låsta till **1.7.7**, trots att
paketmanifestet tillåter senare kompatibla versioner. Den installerade
Better Auth-versionen är också 1.7.7. Upstream-taggen `v1.7.7` pekar vid
kontrollen på `db02f233918ad1233bf0753e437e1c0da353273d`; länkarna till
upstream nedan använder den committen.

[Skyttels låsfil](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/package-lock.json#L262)
och
[låst Better Auth-paket](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/package-lock.json#L3631).

## Register: cookies på Skyttels värd

Leverantör och ansvarig produkt är Skyttel; implementationen är Better
Auth. Namnen nedan har prefixet `__Secure-` vid HTTPS. Exempel:
`__Secure-better-auth.session_token`. Lokal HTTP på loopback använder
namnet utan prefix. Skyttel tillåter HTTP endast där. Biblioteket väljer
säkerhetsvariant från det explicit angivna `baseURL`, vilket är mer
precist än att enbart säga att produktionsläge styr.

Alla aktiva auth-cookies har `HttpOnly`, `SameSite=Lax`, `Path=/` och
`Secure` vid HTTPS. Skyttel konfigurerar inte delning mellan subdomäner
eller ett eget cookieprefix; utan `Domain` är cookies knutna till värden.
`HttpOnly` gör att klientens JavaScript inte kan läsa eller radera dem.

[Skyttels auth-konfiguration](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/server/auth.ts#L20),
[tillåtna ursprung](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/server/config.ts#L27)
och
[Better Auths namn och attribut](https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/cookies/index.ts#L45).

### `better-auth.session_token`

- Innehåll: signerad sessionsidentifierare; inte användarens hela profil
  eller Google-/Microsoft-token.
- Skapas efter lyckad inloggning. Läses och verifieras på servern när
  sessionen hämtas; Skyttels API använder den för användarens identitet.
- Normal `Max-Age`: 604800 sekunder, alltså sju dygn.
  Serverns session har samma standardlivslängd och blir förnybar efter
  ett dygn. En sessionhämtning kan då förnya serverpost och skicka cookie.
  Skyttels interna `auth.api.getSession`-anrop returnerar däremot data:
  underlaget visar inte att deras eventuella cookieheaders vidarebefordras
  till klienten. Den faktiska förnyelsen i produktflödet behöver verifieras.
- Utloggning tar bort serverns session och skickar utgången cookie.
  Enbart radering av browsercookie är därför inte samma sak som serverns
  utloggning eller återkallelse av en OAuth-anslutning.
- Saknad eller blockerad cookie gör att följande API-anrop saknar session
  och användaren betraktas som anonym; hushållets skyddade funktioner
  blir otillgängliga. Detta är en teknisk konsekvens, ingen rättslig etikett.

[Sessionscookie](https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/cookies/index.ts#L359),
[livslängder](https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/context/create-context.ts#L309),
[förnyelse](https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/session.ts#L324),
[utloggning](https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/sign-out.ts)
och
[Skyttels bootstrap](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/server/app.ts#L168).

### `better-auth.state`

- Skapas när OAuth-inloggning eller koppling av ytterligare inloggningssätt
  startar. Innehåller ett signerat slumpvärde för bindning till webbläsaren.
- `Max-Age`: 300 sekunder, alltså fem minuter.
- Själva OAuth-stateinformationen, bland annat verifieringsdata, lagras
  i serverns `verification`-tabell med tio minuters utgångstid.
- Callback måste ha både rätt state och motsvarande signerad cookie;
  Skyttel aktiverar inte `skipStateCookieCheck`. Biblioteket skickar
  borttagningscookie och raderar verifieringspost när state accepteras.
- Om cookien nekas, raderas eller löper ut före callback misslyckas
  inloggningen eller kopplingen, även om serverposten fortfarande finns.
  Avbruten navigering behöver inte omedelbart rensa cookien: dess
  femminutersgräns gäller då fortfarande.

Det viktiga versionsfyndet är att **databaslagrad OAuth-state ändå kräver
en browsercookie**. Namnet är här `state`, inte `oauth_state`.

[Strategins standardval](https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/context/create-context.ts#L292),
[skapande av state](https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/state.ts#L125)
och
[callbackkontrollen](https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/state.ts#L256).

### Biblioteksnamn som inte är aktiv lagring i det valda flödet

- `better-auth.session_data`: cache av session och användardata, normalt
  fem minuter, men Skyttel sätter `cookieCache.enabled=false`. Borttagning
  kan ändå förekomma i svar utan att någon tidigare cookie skapas.
- `better-auth.account_data`: browserlagring av kontodata används när
  `storeAccountCookie` är aktiverad. Skyttel använder databas och aktiverar
  inte det valet; bibliotekets automatiska aktivering gäller utan databas.
- `better-auth.oauth_state`: krypterad statecookie, tio minuter, för
  strategin `cookie`. Skyttels databasstrategi väljer `state` i stället.
- `better-auth.dont_remember`: bibliotekets sessionscookieflagga för
  ett explicit val att inte minnas inloggningen. Skyttels sociala
  inloggningsform skickar inget sådant val och 1.7.7:s sociala schema
  innehåller inte `rememberMe`. Ingen skapandeväg hittas i det valda
  UI-flödet. Biblioteket kan läsa eller radera en befintlig flagga.
- `better-auth.session_token.oauth_logout_confirmation`: OAuth-provider
  1.7.7 har denna signerade cookie med fem minuters livslängd och särskild
  path för `/oauth2/end-session/confirm`. Skyttels tillåtna auth-rutter
  omfattar inte end-session eller confirm; vägen är inte exponerad här.
- `better-auth.message` i localStorage: Better Auth-klientens
  sessionssynkronisering använder denna nyckel. Produktens klient använder
  egen `fetch` och importerar inte Better Auth-klienten. Därför är denna
  beroendekod inte en aktiv lagringspost i den granskade produkten.

[Cache- och cookievillkor](https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/cookies/index.ts#L160),
[databasberoende standardval](https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/context/create-context.ts),
[socialt inloggningsschema](https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/sign-in.ts),
[OAuth-providerpaketets versionsbundna kod](https://unpkg.com/@better-auth/oauth-provider@1.7.7/dist/authorize-K1WHCNih.mjs),
[klientsynkronisering](https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/client/broadcast-channel.ts)
och
[Skyttels tillåtna auth-rutter](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/server/app.ts#L143).

## Register: annan lagring på Skyttels origin

Alla tre nyckelfamiljer nedan skrivs av Skyttels egen klient. Ingen TTL
implementeras. localStorage har normalt ingen utgångstid; sessionStorage
är avgränsad till origin och fliksession, överlever omladdning och rensas
när fliksessionen avslutas. Webbläsarens återställning och användarens
egna rensningar kan påverka den praktiska varaktigheten.

[Browserns localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
och
[browserns sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).

### `skyttel-theme` i localStorage

Läser `light`, `dark` eller `system` när temahooken startar. Saknad,
ogiltig eller oläsbar post ger `system`. Skriver när användaren byter
tema, också när hen väljer `system`. Valet gäller webbläsarens origin,
inte ett visst användarkonto eller hushåll, och skickas inte till servern.

Nekad skrivning fångas: temat fungerar fortfarande i komponenternas
tillstånd och via en händelse inom dokumentet, men valet består inte
garanterat över omladdning. Radering av nyckeln gör nästa initiering till
`system`; koden lyssnar inte på storage-händelser, så en redan öppen
temavy återställs inte automatiskt av extern radering.

[Temalagring och fallback](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/WorkspaceTheme.tsx#L13).

### `skyttel-import:<householdId>` i sessionStorage

JSON med importförsökets `id` och `contentVersion`, inte importerad fil.
Läses när importsidan öppnas, så en osäker operation kan kontrolleras
med exakt ID efter omladdning. Skrivs när ett försök upptäcks eller
förbereds; rensas vid flera avslut, fel eller användarval. Servern har
också en upptäcktsväg för importförsök när lokal identitet saknas.

Skrivnings- och raderingsfel visas för användaren. Ny filkontroll kräver
att tidigare lokal post kan rensas. Bekräftad ersättning eller
fortsättning kräver att försöket kan sparas. Vid misslyckad lagring
skickas inte dessa åtgärder. Serverresultat som redan mottas behåller
sin identitet i komponentens minne, men återhämtning efter omladdning
garanteras inte. Ett generellt återkallande som rensar denna nyckel mitt
i en osäker import kan därför ta bort viktig återhämtningsinformation.

[Lagring och upptäckt](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/HouseholdImport.tsx#L18)
och
[spärrar före filkontroll och ersättning](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/HouseholdImport.tsx#L149).

### `skyttel-erasure:<householdId>` i sessionStorage

Sträng med raderingsoperationens ID, inte dess innehåll eller
bekräftelsetoken. Läses vid sidans initiering; status hämtas därefter
med exakt ID. Skrivs före ny radering och fortsättning samt när en
serverstatus observeras. Rensas när användaren kan lämna operationen
eller vissa fel uppstår.

Nekad lagring stoppar start och fortsättning före serveranrop och ger
synligt fel. Ett mottaget serverresultat kan fortfarande behållas i
komponentminnet. Radering av nyckeln lämnar serveroperationen kvar;
den är inte ett återkallande av permanent radering. Att rensa mitt i ett
osäkert förlopp förlorar möjligheten att fråga efter samma lokalt kända
operation och får inte likställas med säker avbrytning.

[Lagring och exakt statusläsning](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/HouseholdErasure.tsx#L40)
och
[spärrar före fortsättning och ny radering](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/HouseholdErasure.tsx#L228).

## Inloggningsleverantörer och annan lagring

Skyttel skickar användaren till Google eller Microsoft och får en
OAuth-callback tillbaka. Cookies på leverantörernas egna värdar är
deras lagring; Skyttels cookieformulär kan inte läsa, styra eller radera
dem. Inga sådana externa cookienamn eller livslängder fastställs här.
Skyttels server lagrar OAuth-token i konto-/autentiseringsdatabasen och
aktiverar kryptering av OAuth-token; detta är inte browserlagring.
Koppling av fler inloggningssätt kräver både befintlig Skyttel-session
och ett nytt OAuth-stateflöde, med serverlagrade kopplingsförsök.

[Inloggningsformens redirect](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/App.tsx#L185),
[providerkonfiguration och tokenkryptering](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/server/auth.ts#L33)
och
[kopplingsflödet](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/server/login-methods.ts#L61).

Sökning i produktkod ger inga direkta användningar av IndexedDB,
CacheStorage, service worker, `navigator.storage` eller egna
`document.cookie`-skrivningar. Det innebär inte att webbläsaren saknar
vanlig HTTP-cache eller att infrastruktur inte kan lägga till cookies.
Klientens gemensamma API-anrop använder `cache: no-store` och
`credentials: same-origin`. Ingen aktiv analys- eller marknadsförings-
lagring identifieras i produktkoden; UI-komponenter och bibliotek som
installeras utan att deras lagringskod används räknas inte som poster.

[Skyttels API-klient](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/map-request.ts#L15)
och den granskade
[produktkoden](https://github.com/viscalyx/skyttel/tree/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src).

## Webbläsarval, profil och personliga vyer

Det finns också serverlagrade användarpreferenser som är gemensamma för
Skyttel-användaren oberoende av hushåll: `conversation_preferences`
innehåller `showDraftOnStart`, `textWidth` och `draftWidth`, med enbart
`userId` som nyckel. De styr om utkastet visas vid samtalets start och
bredden på text- och utkastvyerna. Läsning och ändring sker i serverns
SQLite-databas; browserlagring och samtalsmedgivande är inte deras
lagringsmodell. Rensning av browserlagring tar inte bort dessa val.
Det är en befintlig användaranknuten preferensmodell som ett senare
beslut om profilsparade cookieval kan jämföra med, utan att den i sig
avgör om cookieval ska ha samma scope.

[Användarens samtalspreferenser](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/server/conversation-preferences.ts#L18).

Temat är ett webbläsarval. Auth identifierar Skyttel-användaren på
servern. Personliga kartinställningar och objektpositioner lagras däremot
i SQLite med både `userId` och `householdId`: inverterade axlar,
axelns hörn och fästning, stjärnor, etiketter samt koordinater.
De är hushållsanknutna personliga vyer, inte cookieval eller den allmänna
användarprofilen. Att rensa browserlagring raderar inte dessa serverdata.

[Serverns personliga vyer](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/server/personal-view.ts#L61)
och
[vyinställningarnas typ](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/shared/personal-view.ts#L3).

Sparat samtalsmedgivande är också serverdata per användare och hushåll,
med textversion och sparningstid. Dess återkallelse är en separat
produktåtgärd och ska inte uppstå av cookieåterställning.

[Samtalsmedgivande](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/server/conversation-consent.ts#L27).

## Underlag för nästa beslut och återstående osäkerhet

Det finns ingen cookievalsnyckel, profilsparat cookieval eller läsning
av sådant val i den granskade koden. Biblioteket kan sätta auth-cookies
på servern före att klienten återkommer från inloggningen. Om kommande
beslut ska göra någon av dem valbar behöver serverns auth-flöde få ett
uttryckligt kontrakt för valet; klientens formulär kan inte ensamt
garantera att en `HttpOnly`-cookie aldrig sätts. Detta är en slutsats
ur existerande flöde, inte ett förslag om att göra inloggning valbar.

Beslutsarbetet behöver särskilt avgöra följande:

1. Vilka poster ska beskrivas och vilka ska användaren kunna neka?
   Inloggning och säker återhämtning har belagda funktionsberoenden.
2. Hur ska återkallelse hantera import eller radering med osäkert utfall?
   Rensning av alla nycklar är inte samma sak som att avbryta en åtgärd.
3. Ska tema fortsätta i minnet utan beständig lagring, och hur ska ett
   återställt val omedelbart påverka redan öppna komponenter?
4. Vilken giltighetstid, versionering och lagringsplats ska det nya
   cookievalet få? Ingen sådan livslängd kan kopieras från produktkoden.
5. Ska cookieval knytas till användarprofilen? Underlaget visar tre olika
   befintliga scopes för browser, användare och användare i hushåll,
   men fattar inget synkroniseringsbeslut.

Före implementationens slutverifiering behövs en kontrollerad
browserinventering av HTTPS och lokal HTTP: före inloggning, start av
OAuth, callback, utloggning, extra inloggningssätt, assistant-consent,
sessionförnyelse efter ett dygn samt nekad cookie- och Web Storage.
Verifiera också att deploymentens proxy eller ingress inte tillför
lagring. Namn, scope och cookieheaders kan observeras utan att värden
eller tokens publiceras. Produktionsdomän och faktisk infrastruktur
fastställs inte i denna research.

Inga bygg- eller testsuites körs: ändringen är endast detta underlag.
Ingen körverifikation av autentiseringsflöden påstås.

# Inloggningsuppgifter i kopior och säker återställning

Beslutsunderlag för
[Vilka säkerhetskopior innehåller inloggningsuppgifter och hur verifieras säker återställning?](https://github.com/viscalyx/skyttel/issues/434).
Läsare är den som färdigställer specifikationen samt operatören och
utvecklaren som ska verifiera återställningen. Underlaget är research,
inte ett genomfört återställningsförfarande eller en ändring av drift.

## Slutsats

Hushållsexporten återställer innehåll med separat, aktuell åtkomst.
Den innehåller inte Skyttels sessionsnycklar eller aktiva OAuth-token.
En kopia av hela SQLite-databasen eller disken har en annan omfattning:
den kan innehålla sessioner, påbörjade försök, assistentbehörigheter och
nyckelmaterial. Framtida valmetadata och spärrar i samma databas kommer
också med. [Exportbeslutet][exportadr], [exportkoden][export],
[databasschemat][schema], [OAuth-schemat][oauthschema].

Render beskriver automatiska diskkopior. Formuleringen om ingen extra
automatisk backup i repoet belägger därför inte att kopior saknas.
De publika källorna belägger inget tak på 30 dygn fram till faktisk
radering av varje kopia. Det kräver privat operatörsevidens innan
den beslutade tiden får beskrivas som ett verkligt driftförhållande.
[Render om diskar][renderdisks], [driftguiden][renderguide],
[lagringsbeslutet][retention].

En säker återställning måste ske avstängd från användartrafik och
stoppa samtliga äldre auktoriseringsvägar innan öppning. Bara ändrad
auth-hemlighet eller raderad `session` är otillräckligt underlag.
OAuth-token har bland annat referenser som blir `NULL` när sessionen
raderas; `/mcp` använder separat JWT-verifiering och en aktuell
assistentanslutning. Rapporten beskriver ett villkorat kontrakt och
en verifieringsmatris, inte ett färdigt säkerhetsbevis.
[Auth][auth], [OAuth-schema][oauthschema], [MCP-kontroller][mcp].

**Ett nytt HITL-beslut behövs:** återställning från före en ändring
kan förlora dess resultat trots att det beslutade kontrollfönstret
på 24 timmar pågår. Att alla gamla nycklar blir ogiltiga bevisar inte
hur den tidigare åtgärden slutar. Specifikationen behöver antingen
ett uttryckligt återställningsundantag för resultatkontrollen eller
ett separat, verifierbart bevarande av minsta resultatunderlag.
Avsnittet om förlorade resultat preciserar frågan och alternativen.
[Beskedsbeslutet][confirmation], [lagringsbeslutet][retention].

## Version, metod och bevisnivå

Undersökningen gäller 2026-10-15. Skyttels källor binds till
`8f86c81dbe8f4007e93973f6735a47c409397ff5`. Låsfilen och installerad
distribution anger Better Auth och OAuth-provider **1.7.7**.
Upstreamkoden binds till
`db02f233918ad1233bf0753e437e1c0da353273d`, samma version som i den
[frysta researchen om återkallelse][revocationresearch].
Ingen oberoende byggjämförelse mellan npm-paket och Git-tagg ingår.
[Låsfil][lock].

Följande nivåer hålls åtskilda:

- **Verifierat i källa:** läst, versionsbunden produktkod och
  paketkod samt de namngivna publika leverantörskällorna.
- **Tidigare körbevis:** proberna i återkallelseresearchen; de är
  länkade underlag och körs inte på nytt här.
- **Förslag:** återställningskontrakt, gallring, publiceringsgrindar
  och verifieringsfall nedan. De finns inte som produktfunktioner.
- **Operatörskontroll återstår:** verklig tjänst, disk, kopior,
  åtkomst, avtal, radering och fungerande trafikspärr i Render.

Inga produktionsuppgifter, privata driftinställningar eller verkliga
provideranrop undersöks. Inga billable API-anrop, produktbyggen eller
produkt- och integrationssviter körs. Dokumentkontroller anges sist.
Publika webbkällor läses denna dag; deras URL:er är inte immutabla
avtalsversioner. Operatören behöver spara gällande avtalsversion och
daterat leverantörssvar som privat evidens.

## De beslutade tider som återställningen måste respektera

Detta är en läsanvisning till de kanoniska besluten, inte nya tider:

- Vanlig inloggning: högst åtta timmar från inloggning och 30 minuter
  utan relevant användaraktivitet. Ihågkommen inloggning: högst sju
  dygn. [Sessionsbeslutet][times].
- Avslutade sessionsuppgifter och förbrukade eller utgångna
  OAuth-försök: radering senast inom 24 timmar. Under fristen finns
  ingen fortsatt inloggningsbehörighet. [Lagringsbeslutet][retention].
- Minsta resultatunderlag: kontroll under 24 timmar från ändringen,
  endast för rätt autentiserad ägare och rätt åtgärd. Ingen separat
  personkopplad valhistorik. [Lagringsbeslutet][retention].
- Minsta spärrdata: bara tills berörda försök och gamla nycklar säkert
  är ogiltiga, högst sju dygn från återkallelse eller utloggning och
  gallring inom ytterligare 24 timmar. Taket är inte normal lagringstid.
  [Lagringsbeslutet][retention].
- Berörda säkerhetskopior: högst 30 dygn från kopiering, enbart för
  återställning och med begränsad driftsåtkomst. Vid hel återställning
  ska samtliga gamla sessioner och försök redan vara ogiltiga när
  tjänsten öppnas. [Lagringsbeslutet][retention].

Tiderna är valda produktgränser. De är inte uppmätta egenskaper hos
dagens drift och inte generella lagstadgade standardtider.
Giltighet, logisk borttagning och leverantörens faktiska radering är
skilda kontroller. Återställning får inte flytta fram ursprunglig
beslutstid, utgång, avslutstid eller kopieringstid.
[Lagringsbeslutet][retention].

## Inventering av kopior

### Hushållsexport och dess temporära filer

`snapshot()` i exportkoden är en konsekvent läsning av utvalt
hushållsinnehåll, inte en kopia av hela SQLite-filen. Den skapar
`content.json`, `images.bin` och ett manifest, sedan en ZIP.
Samlingarna omfattar bland annat historik, sparförsök, privata utkast
och personliga vyer. Identiteter exporteras med ID och namn.
`session`, `account`, `verification`, `login_link`, `jwks`,
`oauthRefreshToken`, `oauthAccessToken` och `assistant_connection`
ingår inte. Ordet snapshot i funktionen innebär alltså inte att
sessionsuppgifterna exporteras. [Exportkoden][export].

De temporära filerna ligger i `.skyttel-exports` bredvid databasen,
alltså under `/data` med den dokumenterade produktionssökvägen.
Färdig export har tio minuters tillgänglighet; nedladdning, avbrott,
invalidering och omstart har särskilda städvägar. Tiden för en färdig
export bevisar inte leverantörens fysiska radering av en diskversion.
En diskkopia kan fånga en temporär export eller importfil.
[Exportkoden][export], [exportfrist][exportcontract],
[importkoden][import], [driftens databasväg][installation].

En hämtad ZIP på administratörens dator eller privata lagring har
ingen automatisk gallring som Skyttels server kan verkställa.
Den kan återinföra permanent raderat hushållsinnehåll, men återinför
inte de gamla sessionsnycklarna. Nuvarande export omfattas därför
inte av 30-dygnsgränsen *för inloggningsuppgifter* enbart genom att
vara en export; hushållets separata beslut om innehållets bevarande
och radering gäller fortfarande. Framtida ändringar måste verifiera
exportens gräns på nytt så att valmetadata inte läcker in i formatet.
[Exportbeslutet][exportadr], [återställningsguiden][recovery],
[raderingsguiden][erasurerunbook].

Återimport i ett befintligt hushåll behåller dess aktuella åtkomst.
Import i en ny installation kräver verifierade nya inloggningar och
uttrycklig tilldelning av historiskt privat innehåll. Detta är ett
annat förfarande än att skriva tillbaka en äldre hel databas.
[Exportbeslutet][exportadr], [återställningsguiden][recovery].

### Logisk export av hela databasen eller kopia av SQLite

En fullständig SQL-export eller konsekvent databasbackup kan innehålla:

- Sessions-ID, aktiva token, användar-ID, tidsvärden och nuvarande
  schemafält för IP-adress och agentsträng. Att fälten finns är inte
  ett nytt godkännande att samla in dem. [Grundschemat][schema].
- Övergående verifieringsvärden och kontokopplingsförsök, inklusive
  uppgifter som kan låta en äldre callback fortsätta.
  [Grundschemat][schema], [kopplingsschemat][linkschema],
  [statehanteringen][state].
- Leverantörskonton, krypterade OAuth-token, assistentanslutningar,
  OAuth-koder i verifieringslagringen, refresh- och access-token,
  medgivanden och JWT-nycklar. Det är skilda behörighetsvägar.
  [Auth][auth], [OAuth-schema][oauthschema],
  [OAuth-tokenutgivning][upstreamtoken].
- Framtida sessionsbundna valuppgifter, resultat och tekniska spärrar,
  om de lagras i samma databas. Dessa finns inte i dagens schema som
  det nya beslutade kontraktet. [Grundschemat][schema],
  [lagringsbeslutet][retention], [återkallelseresearchen][revocationresearch].

Ingen ny fullständig backupfunktion är belagd i dessa produktflöden.
Uppgraderingsguiden nämner dock databasbackup som operatörsåtgärd.
Det motiverar inventering av manuella kopior; det bevisar inte att
en sådan kopia faktiskt finns eller har rätt gallring. Guidens äldre
råd om rollback får inte bli stöd för att köra gammal kod i detta
arbete: beslutet kräver enbart roll forward.
[Uppgraderingsguiden][upgradenotes], [övergångsbeslutet][transition].

Databasen använder WAL. En ensam kopia av `skyttel.sqlite` under
pågående skrivning är inte ett verifierat återställningsunderlag;
WAL och andra journalfiler måste hanteras av ett konsekvent förfarande.
SQLites backup-API är ett exempel på en mekanism för konsekvent kopia,
inte något som rapporten inför. [Databasöppningen][database],
[SQLite om korruptionsrisker][sqlitecorrupt], [SQLite backup-API][sqlitebackup].

### Diskkopior och Render

Repoets avsedda Render-installation är en betald webbtjänst med en
disk vid `/data` och SQLite vid `/data/skyttel.sqlite`. Den faktiska
kopplingen i det privata kontot är inte kontrollerad.
[Renderguiden][renderguide], [installationsguiden][installation].

Den publika diskdokumentationen anger automatisk kopiering var
24:e timme, åtkomliga snapshots i minst sju dygn samt kryptering av
disk och snapshots. Minimitiden är inget högsta bevarande.
Render varnar dessutom för återställning av diskkopior som används
för en egen databas, på grund av risk för korruption.
[Render om diskar][renderdisks].

Slutsats för Skyttel: behandla dessa kopior som möjliga bärare av
hela auth-databasen och journaler. Påstå inte att SQLite här är
undantaget från varningen eller att en tillgänglig snapshot är en
testad databasbackup. Begär skriftligt besked om just denna driftform.
Ingen snapshot återställs i researchen.

Listnings-API:t visar `createdAt`, `snapshotKey` och `instanceId`.
Det ger inventeringsdata men ingen attest för fysisk gallring.
Återställnings-API:t kan skriva över hela disken och utlösa en deploy;
dess nyckel gäller i 24 timmar. Nyckelns utgång är inte snapshotens
radering. API:t för att uppdatera disk beskriver namn, storlek och
monteringsväg; någon inställbar 30-dygnsfrist visas inte där.
[List snapshots][rendersnapshots], [Restore snapshot][renderrestore],
[Update disk][renderupdate].

Render DPA avsnitt 2.4 behandlar återlämning/radering när tjänsten
avslutas, undantag och skydd om radering inte kan ske samt certifiering
på begäran i angivna fall. Det belägger inte en 30-dygnsfrist räknad
från varje diskkopiering medan tjänsten används. Det privata avtalet
och leverantörens faktiska process behöver kontrolleras.
[Render DPA][renderdpa].

### Andra kopior att uttryckligen kontrollera

Följande är inventeringsfrågor, inte belägg för befintliga system:

- SCP-hämtade databasfiler, SQL-dumpar, gamla diskvolymer, kopior inför
  migrering, supportbilagor och utvecklares tillfälliga felsökningskopior.
- Datorers och privata lagringsytors egen synkronisering, versionshistorik,
  papperskorg och säkerhetskopiering av en tidigare hämtad databas.
- Leverantörens repliker, interna katastrofkopior och kvarvarande block
  efter att en snapshot försvinner från kundens lista.
- Eventuella externa loggmottagare som kan ha fått token eller
  auth-metadata. Loggar är inte en godkänd reserv för valhistorik.

Operatören måste bekräfta både förekomst och frånvaro. Att repoet
inte konfigurerar en tjänst bevisar inte vad som har kopierats manuellt.
Render beskriver möjlighet till filöverföring; den är inte ett belägg
för att en sådan överföring sker här. [Render om filöverföring][renderdisks].

## Verifiering av 30 dygn från kopiering

Följande är föreslagen kontrollmodell för den redan beslutade gränsen:

1. För varje kopia: registrera privat ägare, källa, innehållsklass,
   ursprunglig kopieringstid i UTC, lagringsplats, åtkomst och sista
   tillåtna bevarandetid. Bevara kopians ålder när den flyttas eller
   kopieras vidare; en hämtning dag 29 ger inte samma innehåll en ny
   30-dygnsfrist. Vid osäker tidsgräns används den tidigare tiden.
2. Kontrollera hela kedjan, inklusive derivat, lagringsversioner och
   tillfälliga återställningskopior. En snapshotlista täcker bara vad
   listningsgränssnittet visar. Originalets ålder får inte döljas genom
   namnbyte, kopiering eller ny uppladdning.
3. Begränsa läsning, nedladdning, återställning och radering till
   nödvändiga operatörsroller och nycklar. Dokumentera det operativa
   ändamålet. Kryptering ersätter inte åtkomst- eller gallringskontroll.
4. Samla daterad evidens från inställningar och leverantör för högsta
   tid till faktisk radering, intern kopiering, undantag och vad en
   raderingsbekräftelse omfattar. Att en återställningsnyckel upphör
   eller en post saknas i listan räcker inte.
5. Verifiera en full bevarandecykel med påhittat innehåll i en separat
   godkänd miljö. Mät fångst, sista åtkomst och leverantörens slutliga
   raderingsfrist. Kravet gäller även kopior utan kundsynlig lista.
   Produktionsdata ska inte spridas för denna kontroll.
6. Lägg gallringen före taket med marginal för köer, avbrott och
   tidsfel. Larma när ett jobb inte fullföljs eller maxålder riskeras.
   Rapportera ingen uppmätt 30-dygnsgaranti innan evidensen finns.

Modellen är en härledning ur [lagringsbeslutet][retention].
Den hävdar inte att Render låter kunden verkställa varje steg själv.
Ett leverantörsbesked om längre eller okontrollerbar lagring är en
konkret konflikt med produktbeslutet. Då krävs ett nytt HITL-beslut
om driftlösning eller produktlöfte före överlämning; osäkerhet ensam
ger inte tillstånd att ändra gränsen eller införa en ny backuptjänst.

## Villkorat kontrakt för återställning av hel databas eller disk

### Varför två enkla åtgärder inte räcker som bevis

Skyttel slår upp sessionscookien i databasen och har cookiecache
avstängd. Återställs en tidigare giltig rad med samma token och ännu
inte passerad utgång kan dagens sessionsväg alltså åter acceptera
den. Det är en kodhärledning, inte en körd återställningsprob.
[Auth][auth], [sessionsuppslag][upstreamsession].

Ett nytt auth-secret kan få gamla signerade webbläsarcookies att
underkännas, men är inte ett bevis för alla vägar. `jwt()` har eget
nyckelmaterial i `jwks`; MCP verifierar token med publik nyckel och
kontrollerar aktuell anslutning och medlemskap. OAuth-refresh är
en annan väg och OAuth-tabellernas sessionsreferenser använder
`ON DELETE SET NULL`. Bara raderade sessioner garanterar därför inte
att tokenfamiljer, återgivna rotationssvar och assistentbehörigheter
upphör. [Auth][auth], [assistentplugin][assistantauth],
[OAuth-schema][oauthschema], [MCP][mcp],
[resursverifieraren][upstreamresource], [tokenutgivningen][upstreamtoken].

Det finns dessutom krypterade provider-token i `account` som använder
auth-konfigurationens krypteringshantering. Rotation utan plan kan
förstöra läsbarheten för uppgifter som ska bevaras. Rapporten föreslår
därför inte att slumpmässigt byta alla hemligheter som standardmetod.
[Auth][auth], [kontohanteringen][upstreamaccount].

Radering av kvarvarande OAuth-state stoppar inte en callback som
redan har läst det och väntar på providern. Detta är konkret visat i
tidigare research. Ett sent cookiesvar kan dessutom innehålla en
redan skapad annan session. [Fryst prob och förklaring][revocationresearch].

### Gränsen före återöppning

Följande är ett teknikförslag att implementera och verifiera:

1. Stäng samtliga publika vägar till installationen, inklusive dess
   Render-adress, egen domän, callbacks, `/api/auth`, `/mcp` och
   bestående anslutningar. Håll också interna modelluppdrag och
   tokenutgivning avstängda. En tillfällig startsida eller grön
   `/healthz` är inte ett bevis för denna spärr.
2. Stoppa hela gamla processen och dess anslutningar. Avbryt arbete
   och låt ingen gammal instans återansluta till disken. Ett fullständigt
   processstopp undanröjer callbacks som redan har konsumerat state
   i minnet; nätverkssvar kan fortfarande anlända senare.
3. Återställ konsekvent data i karantän till aktuell, verifierad kod
   eller en korrigerad ny version. Tillåt inte äldre kod eller
   automatisk offentlig start med återställd auth-data.
4. Sätt en ny återställningsgeneration som inte kan hämtas tillbaka
   från den gamla kopian. En ny operatörsstyrd generationsreferens
   utanför återställda data är en möjlig mekanism, utan ny tjänst.
   En räknare enbart i samma återställda databas räcker inte. Det
   räcker heller inte att skapa ett värde som kodvägarna inte kontrollerar.
5. Ogiltigförklara samtliga gamla sessioner och försök innan
   utgivning/åtkomst tillåts. Hantera `login_link`, relevant
   verifieringslagring, OAuth-koder, refresh-/access-token och
   assistentanslutningar med referenser och pluginbeteende beaktade.
   Kopior av uppgifterna får inte återläggas av en separat städ- eller
   återhämtningsväg. Konton, kopplade identiteter, medlemskap och
   hushållsinnehåll är skilda från de gamla behörigheterna.
6. Tillåt bara positivt registrerade nya sessioner och försök under
   nya gränsen. Frånvaro, okänd generation eller gammalt format nekar.
   Gamla nycklar ska aldrig återupplivas av alias, saknad spärr,
   automatisk förnyelse, callback eller reservväg. Knyt återkontrollen
   till den känsliga effekten, också efter väntan på externa svar.
7. För MCP krävs en explicit plan för gamla JWT:er även om en
   verifierare har cachat JWKS. Att neka de gamla anslutningarnas
   grant-ID i den lokala databaskontrollen är en möjlig gräns för
   Skyttels resurs; en ny anslutning får inte återanvända gamla ID:n.
   Att bara radera en access-tokenrad bevisar inte att en redan
   signerad JWT nekas av den lokala verifieraren.
8. Kontrollera gallring och permanent radering enligt nästa avsnitt,
   sedan samtliga negativa och positiva fall i verifieringsmatrisen.
   Öppna först efter dokumenterat godkännande av dessa kontroller.

Återställningsgeneration är inte en ny autentiseringshemlighet för
valbevisning. Den ger inte användare behörighet och behöver ett
eget verifierat initierings- och felkontrakt. Ett annat fullständigt
förfarande kan uppfylla samma gräns; ett generellt krav på att alla
normala omstarter loggar ut användarna följer inte av förslaget.

Dagens start öppnar databasen, migrerar och kontrollerar auth-schema
innan servern lyssnar, men har ingen sådan återställningsgrind.
`/healthz` kontrollerar databasberedskap, inte att gamla nycklar är
ogiltiga eller att raderingar från senare tid är tillämpade.
[Startkoden][startup], [beredskap och auth-rutter][app].

Render kan utlösa deploy vid snapshotåterställning och disken är
inte tillgänglig i pre-deploy-kommandot. Förslaget måste därför
verifiera isolering och startspärr i den verkliga driftformen;
anvisningen att först återställa och sedan manuellt logga ut alla
uppfyller inte gränsen. [Restore snapshot][renderrestore],
[Render om diskens åtkomst][renderdisks].

### Verifieringsmatris för den framtida implementationen

Fallen är krav på nya syntetiska prov. Inget av dem redovisas som
godkänt här. Använd både råa HTTP-anrop och interna Better Auth-API:er;
ett utloggningssvar med 200 eller klientens dolda formulär är inget
auktoriseringsbevis. Tidigare probe visar just denna skillnad.
[Återkallelseresearchen][revocationresearch].

<!-- markdownlint-disable MD013 -->
| Fall | Hållpunkt och prov | Förväntad verifiering före öppning |
| :--- | :--- | :--- |
| Kopia före återkallelse | Återställ rad med gamla giltiga token och PÅ; skicka gammal cookie efteråt. | Ingen åtkomst, förnyelse, alias eller återaktivering; nytt uttryckligt inloggningsförsök kan lyckas. |
| Kopia före utloggning | Återställ gammal session och state; använd båda efter återöppning. | Session och callback nekas; alla enheter kräver ny inloggning vid hel återställning. |
| Oavslutad callback | Håll före stateläsning, efter stateläsning och före sessionsskapande. Stoppa gamla processen; skicka begäran igen mot nya. | Varken gammalt state, en ny implicit statebegäran eller reservväg får slutföra gamla försöket. |
| Redan utsänt svar | Håll callback-, rotations- och förnyelsesvar utanför servern; släpp efter ny inloggning, även i annan flik. | Cookie får finnas kvar, men nyckeln nekar åtkomst och kontoväxling; ingen giltighet förlängs. |
| Kontokoppling | Äldre prove/add-callback och rått linkSocialAccount-anrop. | Ingen äldre proof/session kan lägga till konto; redan fastställda identitetskopplingar finns kvar. |
| OAuth-kod och refresh | Växla gammal kod, refresh-token och rotationsupprepning mot nya token via tokenendpoint och direkt API. | Ingen ny användbar token eller återgivet giltigt gammalt tokenpar. |
| JWT och MCP | Gammal JWT med varm JWKS-cache, rått MCP-anrop och gammalt grant-ID. | Ingen läsning/skrivning; ny inloggning och nytt godkännande ger ny fungerande anslutning. |
| Pågående arbete | Håll text-/röstarbete och MCP-begäran efter första auth-kontroll. | Gamla processer är stängda; ingen gammal uppgiftsbehörighet fortsätter skriva. Lagrade utkast bevaras. |
| Gallring och omstart | Radera tillfälliga spärrar, starta om, använd samma gamla token och state långt senare. | Frånvaro nekar fortsatt; en gammal generation blir inte giltig när en spärr saknas. |
| Avbrott under återställning | Stoppa efter varje delsteg, injicera skrivfel och felaktig konfiguration. | Tjänsten förblir stängd; kontroll kan återupptas utan halvfärdig öppning. |
| Hushållsexport | Importera syntetisk ZIP till ny och befintlig installation. | Innehåll återställs enligt formatet; äldre källsession och assistentanslutning ger ingen ny åtkomst. |
<!-- markdownlint-enable MD013 -->

Verifiera också `/api/auth/get-session`, `/api/bootstrap`, läs- och
skrivrutter för kartan, bilder, profil, administration, export, import,
radering, resultatkontroll, OAuth authorize/token, kontokoppling,
text, röst och `/mcp`. Kartlägg interna anrop såsom `getSession`,
`listSessions`, `getAccessToken`, `linkSocialAccount` samt adapterns
direkta uppslag. Frontendens ruttlista är inte full verifiering av
intern auktorisering. [Produktens rutter][app],
[kontokoppling][linking], [assistentens rutter][mcp],
[textens sessionstillgång][text], [röstens vägar][voice],
[tidigare API-prob][revocationresearch].

## Gallring och permanent radering efter återställning

För **inloggningsuppgifterna** är säker standard att återställningen
avslutar alla äldre behörigheter och gallrar deras nu onödiga data
innan öppning. Den återställer inte en ny 24-timmarsperiod för redan
gamla sessionsposter eller resultat. Kontrollera tid mot verklig UTC,
inte kopians klockvärde; ursprungliga frister består.
Gallring får aldrig vänta på nästa användarinloggning för att klara
ett maximikrav vid lång inaktivitet.
[Lagringsbeslutet][retention].

Biblioteket raderar en utgången session vid sessionsuppslag och har
städning av utgångna verifieringar i uppslagsvägen. Det bevisar inte
en schemalagd, fullständig radering inom 24 timmar när ingen trafik
sker. Särskild, verifierad gallring behövs för det beslutade kontraktet,
inklusive framtida resultat och spärrar.
[Sessionsvägen][upstreamsession], [intern adapter][upstreamadapter].

För **hushållets permanenta radering** finns en annan mekanism:
innehållsunderhåll skyddar åtkomst, invaliderar temporära export- och
importfiler, använder `secure_delete`, checkpoint med trunkering,
`VACUUM` samt kontroller av fria sidor och databasreferenser.
Detta är inte ett flöde för att radera en användares inloggningskonto,
sessioner eller valmetadata. Återanvänd inte innehållsradering som
bevis för att auth-data eller externa kopior är borta.
[Raderingskoden][erasure], [raderingsomfattningen][erasurecontent].

Skyttels kontroller visar inte fysisk radering i provider-snapshots,
filhistorik eller ommappade block. SQLites `secure_delete` behandlar
databassidor; det styr inte redan skapade externa kopior.
[Raderingsguiden][erasurerunbook], [SQLite PRAGMA][sqlitepragma].

En kopia från före permanent radering kan sakna både den raderingen
och dess skyddande underhållspost. Att öppna kopian och se ingen
väntande radering bevisar därför inget om senare åtgärder. Ny
inloggning och ny content generation avlägsnar inte gammalt innehåll.
Detta följer av att både data och underhållstillstånd återställs.
[Raderingskoden][erasure], [databasens innehållsskydd][maintenance],
[raderingsguiden][erasurerunbook].

Den säkra återställningsgrinden måste därför skilja två fall:

1. **Kopian är tillåten:** betrodd proveniens visar att den inte kan
   återinföra senare permanent raderad information, eller ett komplett
   senare raderingsunderlag kan tillämpas och verifieras i karantän.
   Fortsätt först när både innehåll och lokal städning är godkända.
2. **Kopian är osäker:** senare raderingar kan saknas och komplett
   oberoende underlag finns inte. Håll stängt och använd inte kopian
   för normal återställning. Märk den spärrad för återställning i
   den privata inventeringen; invänta en tillåten kopia eller beslut.

Ingen sådan komplett oberoende förteckning är belagd i repoets
återställningsflöde. Rapporten inför inte en personkopplad
raderingshistorik eller extern tjänst. Den befintliga driftsguiden
kräver redan att berörda kopior hanteras separat och att kopior som
inte får användas för normal återställning markeras.
[Raderingsguiden][erasurerunbook], [återställningsguiden][recovery].

Om operatören behöver använda en osäker äldre kopia ändå uppstår en
ny HITL-fråga: avstå den återställningsmöjligheten och acceptera dess
dataförlust, eller godkänna minsta oberoende raderingsunderlag och ett
verifierat återtillämpningsförfarande. Varken en sådan ny lagring eller
återinförd permanent raderad information får väljas tyst. Att
kontrollera om en tillåten kopia finns är däremot en operatörskontroll,
inte i sig ett nytt produktbeslut.

## Förlorade resultat inom kontrollfönstret: ett nytt HITL-beslut

Ett konkret motexempel till att återställning ensam löser allt:

1. Klockan 10 tas en kopia av databasen.
2. Klockan 11 genomförs en återkallelse och dess minimala resultat
   sparas. Svaret går förlorat och klienten visar Sparstatus okänd.
3. Klockan 12 återställs kopian från klockan 10. All gammal åtkomst
   ogiltigförklaras korrekt innan tjänsten öppnas.
4. Rätt användare loggar in igen och använder Kontrollera igen för
   den ursprungliga åtgärden. Dess 24 timmar har inte gått ut, men
   resultatet finns inte i den återställda databasen.

En värld där åtgärden genomförs och en där den aldrig når servern
kan nu ha exakt samma databas. Ny autentisering bevisar ägaren,
inte den förlorade händelsen. Den globala ogiltigförklaringen
bevisar gammal åtkomsts nuvarande tillstånd, inte den tidigare
återkallelsens historiska utfall. En korrelationsreferens ensam
återskapar inte saknat resultat. Detta är en härledning, utan krav
på någon särskild backupkonfiguration.
[Kontrollkontraktet][retention], [beskedsreglerna][confirmation],
[resultatmodellens begränsningar][revocationresearch].

Frågan bör vara:
**Vad ska Kontrollera igen kunna visa efter återställning av en äldre
säkerhetskopia?**

Den behöver beslutas med användaren före implementationsöverlämning:

- Tillåts ett uttryckligt katastrof-/återställningsundantag där rätt
  tidigare resultat kan bli otillgängligt även inom 24 timmar?
  Specificera ärligt besked, ny inloggning och hur användaren kommer
  vidare när historiskt utfall inte går att få fram. Beslutet säger
  nu att nytt sparförsök erbjuds först när utfallet är känt.
- Eller ska garantin om återläsning hålla även då? Precisera vilket
  minsta resultatunderlag som måste överleva separat, dess åtkomst,
  24-timmarslivscykel, kopieringsgränser och hur det återförenas med
  rätt autentiserad ägare och åtgärd. Krävs ny lagring eller tjänst
  är det ett eget uttryckligt val, inte ett antaget införande här.
- I båda fallen: inget automatiskt nytt sparande, ingen påhittad
  historisk framgång och ingen återanvänd gammal nyckel. Bevarad
  giltig bekräftelse hos klienten är skild från klientens okända
  utfall; återställningen får inte låtsas återskapa bevis.

Researchen väljer inget alternativ. Frågan bör blockera
[Är cookiehanteringens beslut och formulär redo för implementation?][handoff].
Den är skild från den redan öppna frågan om
[webbläsarbindning och räckvidd][bindingdecision].

## Vad sidan Kakor och lagring får ange

Sidan behöver skilda beskrivningar av webbläsarcookie, serveruppgifter
och berörda kopior. Nuvarande dokumentation kan inte sanningsenligt
säga att driften redan raderar alla berörda kopior inom 30 dygn eller
att inga automatiska diskkopior finns. Inte heller kan den säga att
utgången cookie innebär raderad serverpost.
[Lagringsbeslutet][retention], [Render om diskar][renderdisks].

Specifikationen kan ange beslutade gränser som **krav att verifiera**.
När sidan publiceras som beskrivning av faktisk tjänst behöver följande
ha evidens från rätt release och drift:

<!-- markdownlint-disable MD013 -->
| Uppgift på sidan | Krävd evidens före påstående om faktisk funktion |
| :--- | :--- |
| Ändamål, innehåll och leverantör | Faktiskt cookie-/lagringsregister och den verifierade driftens kopior; skilj Skyttel från Google/Microsoft och Render. |
| Vanlig inloggning: åtta timmar och 30 minuter inaktivitet | Servergränser och samtliga åtkomstvägar; aktivitet får inte implicit aktivera Kom ihåg mig. |
| Ihågkommen inloggning: högst sju dygn | Uttryckligt val, serverns absoluta utgång och faktisk cookieutgivning, inklusive sena svar. |
| Avslutade sessioner/OAuth-försök: högst 24 timmar | Mätt schemalagd gallring, även utan trafik och efter omstart/återställning; utgång är inte radering. |
| Resultatkontroll: 24 timmar från ändringen | Rätt ägare/åtgärd, förlorat svar och ny inloggning samt det nya beslutet om förlorade resultat vid återställning. |
| Tekniska spärrar: kortast nödvändiga tid inom beslutat tak | Verifierad minsta livscykel, högst sju dygn plus gallring inom 24 timmar, och fortsatt nekande efter städning. |
| Kopior: högst 30 dygn från kopiering | Full inventering och faktiskt leverantörstak för alla relevanta kopior/derivat, åtkomst och radering. Ett kundsynligt återställningsfönster räcker inte. |
| Ny inloggning efter hel återställning | Godkänd matris för gamla cookies, callbacks, token, grants, omstart och öppningsgrind. |
| Permanent radering och begränsningar | Separat hushållsflöde, kopior som inte får användas igen och leverantörens verifierade begränsningar. |
<!-- markdownlint-enable MD013 -->

Tider ska knytas till rätt startpunkt: inloggning, aktivitet,
ändring, avslut, återkallelse, utloggning eller kopiering.
Cookiens eventuella kvarvaro efter ett sent svar får inte beskrivas
som fortsatt fungerande inloggning. Användarens besked ska följa
beslutet om bekräftat respektive okänt utfall.
[Tidsgränser][times], [återkallelse][revokedecision],
[besked][confirmation], [lagring][retention].

Sidan ska inte användas för att dölja oförenlig drift bakom formuleringar
som målsättning eller normalt 30 dygn. Kravet måste först uppfyllas
och verifieras, eller ändras genom ett nytt uttryckligt produktbeslut.

## Preciserad privat operatörschecklista

Checklistan är återstående arbete. Inget steg intygar dagens drift.
Spara daterad, åtkomstskyddad evidens; publicera bara kontroller,
versioner och slutsatser. Publicera aldrig token, snapshotnycklar,
SQL-data, cookieheaders eller hemliga miljövärden i ärendet.

1. **Identifiera verklig installation.** Anteckna konto/workspace,
   region, plan, tjänstens och diskens ID, aktuellt bilddigest,
   schema/version, databasväg och monteringsväg. Kontrollera att
   avsedd `/data` verkligen används och att bara en process skriver.
   Kontrollera värdet för sökväg, inte innehållet i databasen.
2. **Inventera kopior.** Hämta aktuell lista över diskkopior med
   fångsttid. Kontrollera också manuella dumpar, hämtade SQLite-filer,
   supportkopior, tidigare diskar och lagringsversioner. Skilj
   hushålls-ZIP från hel auth-databas och markera osäkert innehåll.
3. **Kontrollera rättigheter.** Läs verkliga medlemmar/roller,
   drift-/deploy-nycklar och SSH-/Shell-åtkomst; ange vilka som kan
   läsa, hämta eller återställa data. Kontrollera leverantörens
   administrativa åtkomst och avtalade begränsningar. Registrera
   rättigheter och nyckelidentitet, aldrig hemligt nyckelvärde.
4. **Begär precist leverantörssvar.** Avser automatisk kopiering
   faktiskt den aktuella disken? Finns annat internt kopierat innehåll?
   Vilket är maximalt bevarande från ursprunglig fångst, även när
   snapshoten inte längre listas, vid disk-/tjänstradering och i
   katastrofkopior? När är data slutligt raderade och vilket intyg
   kan fås? Finns undantag som går utöver 30 dygn? Spara avtalsversion,
   datum, omfattning och svar för den aktuella planen.
5. **Kontrollera tillgängliga kontroller.** Finns faktisk inställning
   för bevarande/radering som inte framgår av de granskade API:erna?
   Kontrollera dess verkliga värde, verkställandetid och omfattning.
   Dra ingen slutsats från tom lista eller en 24-timmars snapshotnyckel.
   Om kunden saknar kontroll, ange leverantörens utfästelse och evidens.
6. **Pröva återställningsvägens stöd.** Begär besked om SQLite i WAL
   på just denna disk och den publika varningen om egna databaser.
   Vilken konsistent kopia är tillåten och hur verifieras den? Använd
   inte live-snapshot som enda godkända återställningskälla utan svar.
7. **Pröva verklig isolering.** Verifiera i separat godkänd miljö att
   trafiken spärras också vid automatisk deploy, omstart och avbruten
   återställning; testa alla offentliga värdnamn och callbacks. Visa
   var nya generationen kommer från och att gammal kopia inte kan
   återställa den. Inga produktionsåtgärder är godkända av denna lista.
8. **Kör negativa och positiva auth-prov.** Använd påhittade konton
   och simulerad provider genom repoets npm-skript/processlås.
   Verkställ hela matrisen mot implementerad release, med gamla
   cookies/state, token, JWKS-cache, sena svar och inaktiva kopior.
   Ny inloggning ska fungera utan återanvänd gammal behörighet.
9. **Kontrollera gallring och radering.** Visa originalets frister,
   återstående resultat och spärrar, avslutade sessionsdata samt
   journal-/temporärstädning. Prova avbrott och utebliven trafik.
   Jämför kopian mot betrott senare raderingsunderlag; saknas det
   och kopian kan återinföra raderat innehåll ska den inte öppnas.
10. **Godkänn publicerbara påståenden.** Koppla varje tid och garanti
    till rätt release, kontroll och leverantörsevidens. Håll åtskilt
    vad som är verifierat, nytt produktval och återstående kontroll.
    Invänta också beslutet om resultat som går förlorade vid restore.

Om driftsåtkomst saknas räcker detta underlag för att specificera
acceptansgrindarna, men det räcker inte för att markera dem godkända.
Enbart verifiering som återstår ska inte bli ett nytt generellt
implementationsärende i beslutskartan. Den nya frågan om
resultatkontroll är däremot ett verkligt produktbeslut. Konflikt med
leverantörens faktiska bevarande eller behov av osäker för-raderingskopia
skapar ytterligare HITL-frågor först när respektive konflikt är belagd.

## Kontroller av detta underlag

Underlaget baseras på läsning av källor och befintliga frysta prober.
Ingen ny körprob av säker återställning genomförs. Förslagens riktighet
i produkt och drift är därför en verifieringsuppgift inför leverans.

Dokumentets Markdownkontroll och stavningskontroll passerar via
`npm run test:env`, alltså med repoets delade processlås. Kontrollerna
omfattar hela forskningsfilen trots att `research/` ignoreras av Git.
Kontrollen av Markdown tillämpar repoets dokumenterade undantag för en
ensam lång länkrad; tabeller har avgränsade MD013-undantag enligt
instruktionen. Kontroll av diffens blanktecken passerar också.

Stavningskontrollen använder `cspell --no-gitignore --no-progress`.
Korrekt stavade tekniska ord och svenska sammansättningar läggs till
i projektordboken `cspell.json` enligt AGENTS.md. Övriga ändringar är
denna fil. Ingen produktkod, produktionskonfiguration eller
produktionsdata ändras.

## Primärkällor och kanoniska beslut

[handoff]: https://github.com/viscalyx/skyttel/issues/414
[bindingdecision]: https://github.com/viscalyx/skyttel/issues/438
[retention]: https://github.com/viscalyx/skyttel/issues/419#issuecomment-6198194078
[times]: https://github.com/viscalyx/skyttel/issues/416#issuecomment-6176577860
[revokedecision]: https://github.com/viscalyx/skyttel/issues/417#issuecomment-6190546347
[confirmation]: https://github.com/viscalyx/skyttel/issues/418#issuecomment-6197811528
[transition]: https://github.com/viscalyx/skyttel/issues/420#issuecomment-6198342920
[revocationresearch]: https://github.com/viscalyx/skyttel/blob/b90d37c2d4137556b023150e5fb1e89716f9f703/research/profile-revocation.md
[lock]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/package-lock.json
[schema]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/migrations/001_initial.sql
[linkschema]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/migrations/003_login_link.sql
[oauthschema]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/migrations/009_assistants.sql
[auth]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/auth.ts
[assistantauth]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/assistant-auth.ts
[app]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/app.ts
[mcp]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/assistant-routes.ts
[startup]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/index.ts
[linking]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/login-methods.ts
[database]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/database.ts
[export]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/household-export.ts
[exportcontract]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/shared/household-export.ts
[import]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/household-import.ts
[erasure]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/household-erasure.ts
[erasurecontent]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/erase-household-content.ts
[maintenance]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/content-maintenance.ts
[text]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/text-assistant.ts
[voice]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/src/server/voice-assistant.ts
[exportadr]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/docs/adr/0006-export-med-separat-atkomst.md
[renderguide]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/docs/operations/render.md
[installation]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/docs/operations/installation.md
[recovery]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/docs/operations/recovery.md
[erasurerunbook]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/docs/operations/permanent-erasure.md
[upgradenotes]: https://github.com/viscalyx/skyttel/blob/8f86c81dbe8f4007e93973f6735a47c409397ff5/docs/operations/operator-upgrade-notes.md
[state]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/state.ts
[upstreamsession]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/session.ts
[upstreamadapter]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/db/internal-adapter.ts
[upstreamaccount]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/better-auth/src/api/routes/account.ts
[upstreamtoken]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/oauth-provider/src/token.ts
[upstreamresource]: https://github.com/better-auth/better-auth/blob/db02f233918ad1233bf0753e437e1c0da353273d/packages/oauth-provider/src/client-resource.ts
[renderdisks]: https://render.com/docs/disks
[rendersnapshots]: https://api-docs.render.com/reference/list-snapshots
[renderrestore]: https://api-docs.render.com/reference/restore-snapshot
[renderupdate]: https://api-docs.render.com/reference/update-disk
[renderdpa]: https://render.com/dpa
[sqlitebackup]: https://www.sqlite.org/backup.html
[sqlitecorrupt]: https://www.sqlite.org/howtocorrupt.html#_backup_or_restore_while_a_transaction_is_active
[sqlitepragma]: https://www.sqlite.org/pragma.html#pragma_secure_delete

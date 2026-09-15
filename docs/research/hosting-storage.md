# Drift och lagring för första Skyttel

Kontrolldatum: 2026-09-15. Underlag, inte ett teknikbeslut.

Frågan är
[Vilka drift- och lagringsalternativ passar Skyttels krav och kostnadsram?](https://github.com/viscalyx/skyttel/issues/18)
inför
[Vilken sammanhängande teknik och lagring uppfyller de prövade behoven?](https://github.com/viscalyx/skyttel/issues/12).

## Slutsatser för beslutet

- En liten egen server har lägst tjänstekostnad men lämnar operativsystem,
  databas, inloggning, övervakning och återställning till Skyttels förvaltare.
- Render med förvaltad PostgreSQL är en mellanväg nära kostnadsriktmärket.
  Supabase tillför även förvaltad inloggning och bildlagring, men dess
  betalda grundnivå plus appserver kostar mer.
- PostgreSQL och SQLite kan båda bära kraven. Historik, utkast,
  konflikthantering och säker återimport måste utformas i Skyttel oavsett
  leverantör. Nätverket i gränssnittet kräver inte en grafdatabas.
- Små profilbilder i samma databas som övrigt innehåll är ett konkret
  alternativ: det förenklar samstämmiga exporter och säkerhetskopior.
- Leverantörens backup ersätter varken användarens fullständiga export
  eller Skyttels obegränsade ändringshistorik. Supabase Storage ingår
  uttryckligen inte i databasens backup.

De tekniska slutsatserna är bedömningar utifrån kraven och källorna nedan.
Ingen resurs behöver skapas för att fatta nästa beslut.

## Förutsättningar och kostnadsjämförelse

Bekräftad planeringsinriktning från beställaren: låg kostnad väger tyngre
än extra skydd mot driftfel. Egen fullständig export räcker tills vidare;
första versionen behöver ingen tillagd automatisk säkerhetskopiering.
Vid större haveri accepteras förlust av allt som saknas i den egna
exporten. Därmed finns inget krav på högst en veckas dataförlust och
ingen beslutad backupretention. Kraven på privat innehåll, inloggning,
fullständig export och korrekt återimport gäller fortfarande.

Cirka 200 kr per månad för drift, lagring, tal och AI är ett mjukt
riktmärke. Internet och åtkomst utanför hemmet krävs. Kostnadsexempel
ska omfatta 1, 4 och 10 timmars tal per månad enligt
[teknikbeslutets pågående samtal](https://github.com/viscalyx/skyttel/issues/12#issuecomment-5688442400).
Exakt återställningsrutin och faktisk användningsvolym återstår.
Innehåll och åtkomst följer
[informationsbeslutet](https://github.com/viscalyx/skyttel/issues/9#issuecomment-5655680457)
och
[åtkomstbeslutet](https://github.com/viscalyx/skyttel/issues/6#issuecomment-5654275475).

Beloppen nedan är tjänsternas publicerade grundpriser före skatt, AI och
tillägg. SEK-kolumnen är endast räkneexempel med 1 EUR = 11 SEK,
1 USD = 10 SEK och ett hypotetiskt skattepåslag på 25 procent.
Detta är inga aktuella valutakurser eller besked om fakturans skatt.

<!-- markdownlint-disable MD013 -->
| Kandidat | Grundkostnad per månad | SEK-exempel | Kvar av 200 kr före övriga tillägg |
| --- | --- | --- | --- |
| Hetzner CX23 och IPv4 | 5,49 + 0,50 = 5,99 EUR | cirka 82 kr | cirka 118 kr |
| Render app och PostgreSQL, 1 GB databasdisk | 7 + 6 + 0,30 = 13,30 USD | cirka 166 kr | cirka 34 kr |
| Render app och Supabase Pro | 7 + 25 = 32 USD | cirka 400 kr | över riktmärket före AI |
<!-- markdownlint-enable MD013 -->

Hetzners priser följer
[prislistan från juni 2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/),
[IPv4-priset](https://docs.hetzner.com/general/infrastructure-and-availability/ipv4-pricing/).
Renderpriserna kommer från [prislistan](https://render.com/pricing).
Supabase Pro kostar 25 USD med en Micro-instans täckt av inkluderad
compute-kredit; det är inte 25 + 10 USD för denna enda databas.
Se [Supabases faktureringsexempel](https://supabase.com/docs/guides/platform/billing-faq).

Tabellen är ett jämförelsegolv utan köpt serverbackup, separat backupjobb
eller R2. Backuper som redan ingår i en leverantörs betalda tjänst är
fortfarande tillgängliga enligt leverantörens villkor. Domän, eventuell
e-postleverantör, större instanser, överföring och testmiljöer kan
tillkomma. Reserven till AI är alltså högst skillnaden i sista
kolumnen, inte ett löfte om vad tal och AI kommer att kosta.

## Kandidat: egen server hos Hetzner

En appserver med PostgreSQL eller SQLite och privata bilder kan köras på
samma virtuella server. CX23 har två delade processorkärnor, 4 GB minne,
40 GB disk och 20 TB inkluderad trafik i EU. Produktvyn visar för
närvarande lågprisalternativen som otillgängliga. Grundpriset är därför
ingen garanti att servern går att beställa när beslutet ska genomföras.
Se [CX23 och tillgänglighet](https://www.hetzner.com/cloud/cost-optimized/).

Tyskland och Finland är möjliga driftländer; välj faktisk ort vid
beställning. Server och databas bör hållas bakom appens åtkomstkontroll.
Hushållets medlemmar behöver egna Skyttel-inloggningar; serverkontot hos
Hetzner ger inte detta. Förvaltaren ansvarar för installation, patchning,
certifikat, larm, databasuppgraderingar och återställningsövningar.
Detta är driftbedömningen för den egenförvaltade kandidaten, inte ett
löfte om ett visst antal arbetstimmar.
[Hetzners serverplattform och orter](https://www.hetzner.com/cloud/).

Valfri serverbackup ger sju dagliga kopior och kostar 20 procent extra.
Den ingår inte i första versionens kostnadsgrund.
[Backupavgiften](https://docs.hetzner.com/cloud/billing/faq/).
Hetzner rekommenderar avstängning
för säker diskkonsistens; en kopia av en körande server är därför inte
i sig en verifierad databasbackup. En framtida backupplan behöver
databasens egna verktyg. Backuper försvinner när servern tas bort,
medan manuella snapshots finns kvar tills de tas bort separat.
[Hetzners backupregler](https://docs.hetzner.com/cloud/servers/backups-snapshots/faq/).

Denna kandidat lämnar mest pengar till AI, förutsatt tillgängligt
lågprisalternativ. Den lämnar också mest arbete vid driftfel.

## Kandidat: Render med förvaltad PostgreSQL

Appen kan ligga på `0.5c-512mb` för 7 USD och databasen på
`0.1c-256mb` för 6 USD. Databasen har 256 MB minne och högst
100 anslutningar; använd anslutningspool och mät minnesbehovet.
Planernas namn ersätter de äldre Starter och Basic-256mb.
[Resursgränser och namn](https://render.com/docs/compute-plans).
1 GB är minsta databasdisk; ökningar går till multiplar av 5 GB.
[Diskstorlek](https://render.com/tutorials/postgres-on-render/provisioning-and-immutable-fields).

Frankfurt kan väljas för både app och databas, med privat nät mellan
tjänsterna. Regionbyte kräver nya resurser och flytt av data.
[Regioner](https://render.com/docs/regions).
Hobby har en driftoperatör i leverantörens kontrollpanel; detta begränsar
inte antalet Skyttel-användare. Flera separata driftoperatörer kräver
Pro, 25 USD extra per månad.
[Arbetsytans nivåer](https://render.com/docs/new-workspace-plans).

Render hanterar databasens mindre säkerhetsuppdateringar och erbjuder
återställning till tidpunkt, PITR, för betalda databaser: tre dagars
fönster på Hobby. Återställning skapar en ny, debiterad instans som
behöver kontrolleras innan appen kopplas om. Manuellt skapade logiska
exporter lagras i sju dagar. Det är leverantörens återställningsverktyg,
inte en garanti om Skyttels högsta dataförlust eller avbrottstid.
[Backup och PITR](https://render.com/docs/postgresql-backups),
[versionsunderhåll](https://render.com/docs/postgresql-upgrading).

Inloggning, medlemskap och återställning av användarkonton ingår i appens
utveckling. Profilbilder kan sparas som `bytea` i databasen enligt
bedömningen nedan. Appens vanliga filsystem är tillfälligt och tappar
lokala filer vid omstart eller ny driftsättning.
[Filsystemets livslängd](https://render.com/docs/disks).

Hobby inkluderar 5 GB utgående trafik och tar 0,15 USD per extra GB till
internet. Även externa databasexporter och trafik till AI kan bidra;
det privata nätet i samma region räknas inte på samma sätt.
[Trafikdebitering](https://render.com/docs/outbound-bandwidth).
Den lilla databasen är en kandidat att pröva, inte verifierad kapacitet
för den ännu oskrivna appen. Mer minne, fler driftoperatörer och bättre
återställningsmarginal är tydliga skäl till högre månadskostnad.

## Kandidat: Supabase Pro och separat appserver

Här ligger appen på samma Render-nivå medan Supabase sköter PostgreSQL,
Auth och, om det behövs, Storage. Pro omfattar 8 GB databasdisk,
100 GB filer och 250 GB utgående trafik. Free har 500 MB databas,
1 GB filer, 5 GB trafik och kan pausas efter en veckas inaktivitet.
Free saknar inkluderad automatisk backup. Avsaknaden av backup är
accepterad i första versionen; pausning och återstart behöver ändå
bedömas innan Free väljs som driftplan.
[Priser och gränser](https://supabase.com/pricing).

Välj en bestämd region, exempelvis Frankfurt. Stockholm finns också.
Den allmänna regionen Europe är inte ett löfte om EU-land, eftersom
den även kan omfatta London eller Zürich.
[Regionernas innebörd](https://supabase.com/docs/guides/platform/regions).

Auth erbjuder bland annat lösenord och externa inloggningsleverantörer.
Skyttel måste ändå hantera inbjudningar, hushållstillhörighet och
administratörsrollen. RLS kan kontrollera åtkomst per datarad och
användare; policyn måste utformas och prövas för hushåll och privata
utkast. Förvaltade konton gör inte dessa produktregler automatiska.
[Auth](https://supabase.com/docs/guides/auth),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
E-postbaserad inloggning och inbjudningar kräver en riktig SMTP-tjänst:
standardtjänsten skickar bara till projektets team och har en gräns på
två meddelanden per timme.
[E-postvillkor](https://supabase.com/docs/guides/auth/auth-smtp).

Supabases OAuth 2.1 Server kan även autentisera externa MCP-klienter
med PKCE, discovery och dynamisk klientregistrering. Skyttel bygger
medgivandevyn och verktygens regler; SDK-stöd kan publicera skyddad
resursmetadata och verifiera tokens. Det minskar det egna arbetet
jämfört med en app med egen OAuth-komponent, men ChatGPT/Codex-flödet
måste fortfarande prövas. Funktionen är i beta och gratis under beta,
så framtida pris ingår inte som ett garanterat nollbelopp.
[OAuth-status](https://supabase.com/docs/guides/auth/oauth-server/getting-started),
[stöd för egen MCP-server](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication).

Privata Storage-buckets stöder behörighetskontrollerad nedladdning eller
tidsbegränsade signerade länkar. Publika buckets passar inte Skyttels
profilbilder. Signerade länkar behöver behandlas som tillfälliga
åtkomstbevis; för omedelbar kontroll av medlemskap är en auktoriserad
nedladdning enklare att resonera om.
[Storage-åtkomst](https://supabase.com/docs/guides/storage/buckets/fundamentals).

Pro ger daglig databasbackup med sju dagars historik. Bildobjekt i Storage
ingår inte, endast deras metadata. En återställd databas återför alltså
inte en raderad bild. Om leverantörsbackupen ska täcka bilder behövs
separat bildbackup eller databaslagring av de små bilderna. PITR är
ett separat tillägg från cirka 100 USD per
månad; tätare återställningspunkter behöver därför jämföras separat.
[Backupens omfattning](https://supabase.com/docs/guides/platform/backups).
Databasuppgraderingar kräver fortfarande planerad avbrottstid och
kontroller av appen.
[Uppgraderingsansvar](https://supabase.com/docs/guides/platform/upgrading).

En statisk klient med Supabase Edge Functions kan undvika den separata
appserveravgiften, men den varianten är inte verifierad här mot tal,
strömmande svar och externa assistenter. Den får inte räknas som en
färdig helhetslösning utan den prövningen.

## Google och Microsoft som inloggning

Beställarens planeringspreferens är Google och Microsoft i första hand.
Egen e-post och lösenord är reservvägen om ett konkret hinder gör
leverantörsinloggningen för komplicerad. Detta är en produktpreferens;
följande är verifierade integrationsmöjligheter, inte en genomförd
inloggningsprövning.

- Better Auth har inbyggda Google- och Microsoft-provider. Google kräver
  ett Cloud-projekt, OAuth-klient, klienthemlighet och registrerad
  returadress. Microsoft kräver en Entra-appregistrering, returadress
  och klientautentisering. Biblioteket kan köras i Skyttels egen app,
  vilket passar både egen server och Render.
  [Google i Better Auth](https://better-auth.com/docs/authentication/google),
  [Microsoft i Better Auth](https://better-auth.com/docs/authentication/microsoft).
- Supabase har motsvarande provider. Även här behöver förvaltaren
  registrera egna OAuth-appar; Supabase ersätter inte registreringarna.
  Microsoft-integrationen begär `email` och kräver giltig e-postadress.
  Microsoft-hemlighetens utgångsdatum innebär återkommande förvaltning.
  [Google i Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google),
  [Microsoft i Supabase](https://supabase.com/docs/guides/auth/social-login/auth-azure).
- Privata Microsoft-konton stöds. Appregistreringens tillåtna kontotyper
  måste omfatta dem; `common` kan användas för organisationskonton och
  privata konton tillsammans. Better Auth visar `tenantId: 'common'`;
  Supabase använder motsvarande adress som standard och dokumenterar
  också `consumers` för en app med endast privata konton.
  [Microsofts kontotyper](https://learn.microsoft.com/en-us/entra/identity-platform/v2-supported-account-types),
  [Microsofts common-adress](https://learn.microsoft.com/en-us/entra/identity-platform/howto-convert-app-to-be-multi-tenant).

Förvaltaren behöver åtkomst till en Entra-tenant och rätt att registrera
appen. Det är skilt från hushållsmedlemmens vanliga privata Microsoft-konto.
Kontot och registreringsåtkomsten är inte verifierade i denna research.
[Microsofts registreringskrav](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app).

Skyttel behöver en stabil egen användaridentitet som olika inloggningar
kan kopplas till; en e-postadress ensam ska inte ge hushållstillgång.
Better Auth skiljer användare från provider-konton och erbjuder
kontolänkning. Regler för länkar och inbjudningar behöver prövas så att
Google och Microsoft inte skapar två oavsiktliga hushållsidentiteter.
[Användare och konton](https://better-auth.com/docs/concepts/users-accounts).

Google/Microsoft bevisar vem som loggar in i Skyttel. ChatGPT/Codex
behöver därefter separat medgivande och tokens för Skyttels MCP-server.
Better Auth erbjuder ett OAuth-provider-tillägg; Supabases motsvarande
stöd beskrivs ovan. Ingen av inloggningsknapparna ger automatiskt en
extern assistent rätt att läsa eller ändra kartan.
[Better Auth OAuth-provider](https://better-auth.com/docs/plugins/oauth-provider).
Bedömning: inget dokumenterat hinder kräver lösenordsreservvägen nu;
faktisk appregistrering och ett prov med båda kontotyperna återstår.

## Hur databaserna passar Skyttels innehåll

PostgreSQL har transaktioner som kan spara en grupp ändringar helt eller
inte alls. SQLite har också transaktioner men endast en samtidig
skrivtransaktion. SQLite kan därför fungera bakom en central appserver
för ett litet hushåll: flera klienter betyder inte automatiskt att
SQLite är olämpligt. WAL förbättrar samtidig läsning och skrivning men
förutsätter samma dator för databasprocesserna, inte en delad fil över
nätverk.
[PostgreSQL-transaktioner](https://www.postgresql.org/docs/current/tutorial-transactions.html),
[SQLite-transaktioner](https://www.sqlite.org/lang_transaction.html),
[SQLite WAL](https://www.sqlite.org/wal.html).

Arkitekturbedömning, inte fastställt schema:

- Objekt och samband kan ha vanliga tabeller med stabila identiteter.
  Privata utkast och personliga vyer kopplas till Skyttel-användaren.
- Ett samlat sparande bör kontrollera berörda versioner och skriva
  aktuella värden, historik, bildreferenser och sparandets identitet i
  samma transaktion. Oberörda ändringar ska kunna fortsätta fungera.
- En unik operationsidentitet gör att ett återförsök efter ett tappat
  svar kan hitta det tidigare resultatet i stället för att spara dubbelt.
  Databasen löser inte detta användarbeteende på egen hand.
- Obegränsad historik betyder ingen automatisk tidsrensning i appen,
  inte oändlig gratis lagring. Äldre versioner måste ingå i diskbudget
  och permanent radering. Ångring skapar nya förslag enligt beslutet.
- PostgreSQL underlättar flera appinstanser och ger en rak väg till de
  förvaltade alternativen. SQLite minskar antalet serverprocesser men
  binder den här kandidaten till lokal disk och serialiserade skrivningar.

### Små profilbilder i databasen

PostgreSQLs `bytea` lagrar binära värden. Arkitekturbedömningen är att
Skyttels anpassade bilder på högst 300 × 300 bildpunkter kan ligga i
en separat bildversionstabell med `bytea`, hushållskoppling och format.
Själva bytesen kan då sparas med ändringen och följa databasbackupen.
Det undviker glappet mellan databas och objektlagring även med Supabase.
[Binär datatyp](https://www.postgresql.org/docs/current/datatype-binary.html).

Appen behöver läsa och omkoda JPEG, PNG och WebP, begränsa indata till
10 MB och kasta originalet. Pixelgränsen ensam är ingen exakt
lagringsbudget. Som påhittat storleksexempel ger 100 bevarade versioner
à 100 kB cirka 10 MB bilddata före databasutrymme och säkerhetskopior.
Versionsantal och faktiskt kodade filstorlekar behöver mätas.

Nackdelen är större databas, tyngre backuper och belastning när bilder
hämtas. Hämta bilder separat från kartans vanliga frågor. Den här
förenklingen är rimlig att pröva för små ikoner; den är inte ett generellt
argument för att lagra originalfoton eller ljud i databasen.

## Export, återimport och driftens återställning

Fullständig export är en Skyttel-funktion: allt unikt hushållsinnehåll,
inklusive historik, utkast, personliga vyer och bildversioner, ska kunna
flyttas tillsammans. En SQL-dump är ett administrativt verktyg och
behöver inte uppfylla produktens format-, identitets- och åtkomstregler.

PostgreSQLs `pg_dump` kan ge en konsistent databasexport under samtidig
användning och flyttas till annan PostgreSQL-installation. Globala
databasroller ingår inte automatiskt. SQLite erbjuder ett backup-API
för en konsistent kopia av en öppen databas.
[pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html),
[SQLite backup](https://www.sqlite.org/backup.html).

Följande är en möjlig utformning att besluta om, inte implementation:

1. Exportera från ett konsekvent innehållstillstånd med versionerat
   manifest, stabila identiteter och integritetskontroller för bilder.
2. Validera återimport helt innan det aktuella innehållet ersätts.
   Vid större mängder kan ett nytt, osynligt innehållstillstånd byggas
   först och växlas in genom en kort databastransaktion.
3. Spärra samtidiga sparanden vid bytet eller kräv ny versionskontroll.
   Ett misslyckat byte lämnar det tidigare innehållet tillgängligt.
4. Återimportera inte åtkomsträttigheter eller gamla sessionsuppgifter.
   Behåll befintliga medlemskap; kräv administratörens bekräftelse i
   en ny installation. Skilj historisk författaridentitet från rätten
   att logga in. Det behövs för privata utkast och personliga vyer.

En leverantörsbackup kan återställa även äldre åtkomsttabeller och
autentiseringsdata. Driftens katastrofåterställning behöver därför en
egen rutin: återapplicera aktuella spärrar från separat bevarad information,
eller stäng åtkomsten och bekräfta medlemmarna igen innan tjänsten öppnas.
Äldre sessioner och externa assistenters behörigheter får inte automatiskt
bli giltiga. Detta följer av Skyttels åtkomstkrav, inte av en särskild
leverantörsfunktion.

## Permanent radering och oberoende kopior

Radering ur den aktiva appens historik rensar inte en redan skapad
backup. Hetzners sju platser roterar dagligen, men snapshots ligger kvar
tills de raderas. Render anger att instansens backuper försvinner när
databasen tas bort. Supabase anger motsvarande för hela projektet.
Att förstöra hela databasen eller projektet är inte en lösning för
radering av ett enskilt hushållsobjekt.
[Hetzner](https://docs.hetzner.com/cloud/servers/backups-snapshots/faq/),
[Render](https://render.com/docs/postgresql-creating-connecting),
[Supabase](https://supabase.com/docs/guides/platform/delete-project).

De kontrollerade källorna ger ingen funktion som plockar bort en enskild
rad ur alla äldre leverantörsbackuper. Exakt fysisk raderingstid för
alla interna kopior är inte verifierad här. Teknikbeslutet behöver därför
ange backupers livslängd och vad som händer om en äldre backup måste
återställas: permanent raderat innehåll ska rensas innan åtkomst öppnas.
En separat, minimalt innehållande raderingsjournal är en möjlig mekanism.
Nedladdade privata användarexporter följer undantaget i informationsbeslutet.

Följande är valfria framtida möjligheter och ingår inte i första
versionens beslutade kostnadsgrund. Oberoende, krypterade kopior kan
användas om kraven på skydd mot förlust av leverantörskontot skärps.
Cloudflare R2 Standard är ett möjligt mål: 10 GB-månader lagring,
en miljon skrivoperationer och tio miljoner läsoperationer ingår gratis;
därefter kostar lagring 0,015 USD per GB-månad plus operationer.
Direkt utgående trafik från R2 är gratis. Gratisutrymmet gäller samtliga
bevarade kopior tillsammans, inte varje kopia.
[R2-priser](https://developers.cloudflare.com/r2/pricing/).
EU-jurisdiktion går att välja för lagrade objekt.
[R2-placering](https://developers.cloudflare.com/r2/reference/data-location/).
Render Cron kan vid ett senare behov köra ett separat backupjobb från
1 USD per månad, debiterat efter körtid över minimibeloppet.
[Render Cron](https://render.com/docs/cronjobs).
R2 kan radera objekt enligt åldersregler; radering
sker typiskt inom 24 timmar efter utgång, vilket inte är en exakt
garanterad tidsgräns.
[R2:s livscykelregler](https://developers.cloudflare.com/r2/buckets/object-lifecycles/).
Ingen frekvens, retention eller extern backupdestination är ett krav
för första versionen. Den egna exportens innehåll avgör vad som går
att återställa om driftens data försvinner.

## Leverantörsbyte och återstående avvägningar

Vanlig PostgreSQL och en portabel app gör flytt mellan VPS och Render
relativt rak: nya resurser, konsistent överföring, kontroll och byte av
anslutning. SQLite kräver anpassning om databasprodukt byts.
Supabase kan exportera PostgreSQL-data, men Auth-inställningar,
OAuth-konfiguration och Storage-objekt behöver hanteras separat.
Supabases flyttguide listar dessa kompletteringar; en SQL-dump är inte
en komplett kopia av plattformen.
[Supabases flyttguide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

Före teknikbeslutet återstår följande mänskliga avvägningar:

- Vilket billigt alternativ har acceptabelt eget arbete? Render minskar
  serverarbete; Supabase minskar även arbete med inloggningstjänsten.
- Hur görs egen export och återimport tillräckligt enkla? Automatisk
  backup, hög tillgänglighet och jouravtal ingår inte i första kravet.
- Hur länge får permanent raderat innehåll finnas i otillgängliga
  säkerhetskopior, och hur ska spärrar överleva en återställning?
- Vem kan återställa tjänsten om den ordinarie förvaltaren inte kan?
  Två Skyttel-administratörer är inte automatiskt två driftoperatörer.
- Vilken tal- och AI-användning ska budgeten rymma, och behöver appens
  minne eller databasens storlek ökas? Detta kräver volymexempel eller
  mätning, inte antagandet att den billigaste instansen alltid räcker.

Render Free är endast en provväg här: webbtjänster somnar efter
inaktivitet och gratisdatabaser upphör efter 30 dagar. Det är inte en
likvärdig ersättare för de betalda driftkandidaterna.
[Gratisnivåns begränsningar](https://render.com/docs/free).

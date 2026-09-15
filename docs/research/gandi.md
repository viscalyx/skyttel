# Gandi för första Skyttel

Kontrolldatum: 2026-09-16. Forskningsunderlag till
[Gandi-frågan](https://github.com/viscalyx/skyttel/issues/21)
och
[teknikbeslutet](https://github.com/viscalyx/skyttel/issues/12).
Inget leverantörs- eller teknikval är låst.

## Samlad bedömning

GandiCloud VPS V-R1 är en rimlig kandidat för vanlig Node och SQLite.
Driftpriset motsvarar cirka 69 kr per månad i räkneexemplet nedan,
jämfört med cirka 91 kr för Render och 63 kr för Cloudflare.
Gandi kräver eget underhåll av operativsystem och servermiljö. Den
besparingen mot Render behöver vägas mot detta arbete.

Gandi Web Hosting har ett lägre annonserat ingångspris och verkligt
Node-stöd. Det är en villkorad kandidat: WebSocket-begränsningen,
aktuella runtimeversioner och förnyelsepriset behöver klarläggas.
Rapporten visar ingen färdigkörd Skyttel-installation.

Beställarens planeringsval gäller: låg löpande kostnad prioriteras,
cirka 200 kr är ett mjukt riktmärke och egen fullständig export räcker
tills vidare. Ingen extra automatisk backup, bestämd högsta dataförlust
eller återställningsjour ingår. Privat innehåll och åtkomstkontroll
krävs fortfarande. Befintlig domän/DNS och befintliga ChatGPT-/Codex-
abonnemang räknas inte som tillkommande kostnad hos någon leverantör.

## Aktuella erbjudanden och källornas gränser

Gandis publika produktsidor visar Web Hosting och GandiCloud VPS med
beställningslänkar. Det finns därför inget stöd här för att avfärda
båda som nedlagda produkter. Beställning efter inloggning, faktisk
kapacitet och kontospecifika villkor är inte verifierade.
[Web Hosting](https://www.gandi.net/en/simple-hosting),
[GandiCloud VPS](https://www.gandi.net/en/cloud/vps).

Äldre Gandi Cloud är en annan plattform enligt Gandis FAQ. Den används
inte som kandidat eller prisunderlag här. Vissa FAQ-formuleringar är
uppenbart eftersläpande: exempelvis beskrivs snapshots som kommande,
medan produktsidan redan listar funktionen. Inga löften om backup eller
återställning grundas på dessa formuleringar.
[VPS FAQ](https://docs.gandi.net/en/cloud/vps/faq/index.html).

### GandiCloud VPS V-R1

Den aktuella prislistan anger 5 EUR per månad exklusive skatt för
1 CPU, 1 GB RAM, 25 GB disk och IPv4/IPv6 i Frankrike. Tabellen anger
250 Mbit/s och 3 TB inkluderad överföring. Ytterligare disk kostar
0,06 EUR/GB och månad. V-R2 med 2 GB RAM kostar 8 EUR per månad.
[VPS-priser och resurser](https://www.gandi.net/en/cloud/vps).

Kunden har administratörs- och rootåtkomst. Därmed är en vanlig
Linuxserver med självvald Node-version och installerade beroenden
en rimlig teknisk utgångspunkt.
[Administratörsåtkomst](https://docs.gandi.net/en/cloud/vps/faq/index.html).

**Arkitekturförslag:** kör webbapp, HTTP-API, OAuth, MCP och kartjobb
i samma app med SQLite på serverns disk. Spara små bildversioner som
BLOB i databasen. Låt appen starta automatiskt efter omstart och spara
jobbstatus före externa anrop. Bildomkodning kan använda ett vanligt
Linux-bibliotek; samtidig omkodning och större importer behöver
begränsas så att de ryms i 1 GB RAM. Kapaciteten är inte uppmätt.

Detta kräver ansvar för OS- och runtimeuppdateringar, HTTPS,
processövervakning, diskgränser och återstart efter fel. Ingen extra
server, separat databasprodukt eller lagringstjänst behövs i förslaget.
VPS-replikering innebär enligt Gandi inte en ersättning för egen
backup; beställarens egen export är den planerade återställningsvägen.
[Lagringens skydd](https://docs.gandi.net/en/cloud/vps/faq/index.html).

### Gandi Web Hosting Essential

Essential annonseras från 2 EUR per månad exklusive skatt, för nya
hostingkunder, med ett års abonnemang. Förnyelse sker till då gällande
ordinarie pris, vilket inte går att fastställa entydigt här. Befintlig
DNS hos Gandi bevisar inte att kontot uppfyller erbjudandets villkor.
[Aktuella erbjudandevillkor](https://www.gandi.net/en/simple-hosting).

Essential omfattar 20 GB, 1 CPU/512 MB, Node, PostgreSQL eller MySQL
och HTTPS. Gandis egen lanseringsbeskrivning bekräftar dessa egenskaper.
[Essential](https://news.gandi.net/fr/2025/07/nouvelle-offre-webhosting-lessentiel/).

Node-dokumentationen beskriver en server som startar via
`package.json`, lyssnar på `process.env.PORT` och installeras via
npm. PostgreSQL är åtkomligt lokalt. Senaste LTS-versioner utlovas,
men den exakta valbara versionen kräver kontroll. Här är Node med
plattformens PostgreSQL en bättre belagd utgångspunkt än en antagen
beständig lokal SQLite-fil.
[Node och databas](https://docs.gandi.net/en/web_hosting/languages/nodejs.html).

Samma dokumentation säger uttryckligen att WebSockets inte stöds.
Den preciserar inte om detta endast gäller inkommande anslutningar.
WebRTC-ljudet går direkt mellan webbläsaren och OpenAI, men Skyttels
server behöver en utgående sideband-WebSocket. Därför är begränsningen
ett verifieringsbehov, inte bevis för att hela talflödet är omöjligt.
Även SSE/HTTP-strömning, proxytimeout, privata svar genom cache och
bakgrundsjobb efter avslutat HTTP-anrop behöver bekräftas.
[WebSocket-begränsning](https://docs.gandi.net/en/web_hosting/languages/nodejs.html#websockets).

Bedömning: Web Hosting kan innebära mindre OS-arbete än en VPS, men
kan inte räknas som den billigaste fungerande helheten utan dessa svar.
Bildbibliotekets native-beroenden och minnesbehov måste också rymmas.

## Datamodell, inloggning och externa klienter

Följande är implementationsbedömningar, inte Gandi-funktioner:

- SQLite på VPS eller PostgreSQL på Web Hosting kan samla karta,
  privata utkast, historik, bildversioner och sparandets kvitto i
  samma transaktion. Versionskontroll och åtkomstkontroll måste ingå.
- Bilder ska bara lämnas ut efter aktuell medlemskontroll. Exporten
  behöver omfatta små bilder, historik och privata utkast konsekvent.
  Återimport ska valideras före atomiskt byte av innehåll och får inte
  återinföra indraget medlemskap eller gamla inloggningssessioner.
- Full export är ett eget produktflöde; en rå databasfil eller dump
  är inte automatiskt Skyttels avtalade exportformat.

Better Auth har dokumenterade adaptrar för SQLite och PostgreSQL.
Det ger en portabel integrationsväg på VPS; Web Hosting kräver
kompatibla aktuella Node- och databasversioner.
[SQLite](https://better-auth.com/docs/adapters/sqlite),
[PostgreSQL](https://better-auth.com/docs/adapters/postgresql).

Biblioteket har Google- och Microsoft-inloggning. Egen OAuth-app,
klienthemlighet och rätt returadresser krävs hos respektive leverantör.
Microsofts appregistrering måste tillåta personliga konton; en
organisationsspecifik inställning räcker inte. Inloggningen kopplas
till Skyttels stabila användaridentitet och hushållsmedlemskap.
[Google](https://better-auth.com/docs/authentication/google),
[Microsoft](https://better-auth.com/docs/authentication/microsoft),
[Microsofts kontotyper](https://learn.microsoft.com/en-us/entra/identity-platform/v2-supported-account-types).

OAuth-auktorisering för ChatGPT webb och Codex-appen är ett separat
integrationssteg. Better Auths OAuth-provider ger en möjlig grund,
men verifierar inte automatiskt MCP-upptäckt, klientregistrering,
medgivande och indraget medlemskap i båda klienterna.
[OAuth-provider](https://better-auth.com/docs/plugins/oauth-provider).

På VPS styr appen och dess proxy anslutningarnas livslängd. Vanliga
utgående WebSockets och serverstyrda jobb bedöms därför rimliga utan
Workers-specifik livscykel. Återanslutning, omstarter och beständig
jobbstatus behövs ändå. På Web Hosting kvarstår frågorna ovan.

## Jämförbar månadskostnad

Räknekursen är 10 SEK/USD och 11 SEK/EUR, med hypotetiskt
25 procent skattepåslag på hela beloppet. Det är varken aktuell
valutakurs eller skattebesked. AI-exemplet är 4,47 USD per timme:
3 USD Live plus 1,47 USD Terra enligt
[AI-underlaget](https://github.com/viscalyx/skyttel/issues/19).
Det antar 30 kartuppdrag per timme, två anrop per uppdrag, 5 000
indatatoken och 1 000 utdata-/resonemangstoken per anrop, med antagen
cacheskrivning och utan cacheträffar. Faktisk förbrukning kan avvika.

Render-basens 7,25 USD består av en app för 7 USD och 1 GB beständig
disk för 0,25 USD. Cloudflare-basens 5 USD förutsätter att övriga
kvoter räcker. Leverantörernas prisgrunder finns i
[Render-priser](https://render.com/pricing),
[Render-diskpris](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses)
och
[Workers-priser](https://developers.cloudflare.com/workers/platform/pricing/).

<!-- markdownlint-disable MD013 -->
| Kandidat | Bas exkl. skatt | Drift i SEK | Med 1 timme AI | Med 4 timmar AI | Med 10 timmar AI |
| --- | --- | --- | --- | --- | --- |
| Gandi VPS V-R1 + SQLite | 5 EUR | 68,75 kr | 124,63 kr | 292,25 kr | 627,50 kr |
| Render + SQLite på 1 GB disk | 7,25 USD | 90,63 kr | 146,50 kr | 314,13 kr | 649,38 kr |
| Cloudflare Workers Paid + datalagring inom kvot | 5 USD | 62,50 kr | 118,38 kr | 286,00 kr | 621,25 kr |
| Gandi Essential, villkorat ingångspris | 2 EUR | 27,50 kr | 83,38 kr | 251,00 kr | 586,25 kr |
<!-- markdownlint-enable MD013 -->

Alla SEK-belopp inkluderar räkneexemplets skattepåslag. Essential-raden
är en prisillustration med årsabonnemang och obekräftad teknisk helhet;
den är ingen långsiktig kostnadsutfästelse. Domän/DNS, befintliga
abonnemang och extra backup är exkluderade för samtliga. Extra lagring,
kvotöverskott, eventuell e-post och arbete utöver AI-scenariot kan
tillkomma. Gandi V-R2 innebär cirka 110 kr i drift om 1 GB RAM inte
räcker, alltså mer än Render-basens pris.

## Vad beslutet behöver väga

Gandi VPS ger en vanlig servermiljö till nästan Cloudflares baspris.
Skillnaden mot Cloudflare är cirka 6 kr och mot Render cirka 22 kr
per månad. Den tydliga avvägningen är eget serverunderhåll mot
Render-plattformens högre tjänstepris; Cloudflare kräver i stället
anpassning av databasåtkomst och bakgrundslivscykel.

Web Hosting är intressant om den lägsta tjänstekostnaden motiverar
de kvarvarande klarläggandena. Viktigast är utgående sideband,
MCP/HTTP-strömning, runtimeversioner och faktiskt förnyelsepris.
VPS kräver främst ett litet kapacitetsprov av bildomkodning, import
och samtidiga jobb under implementationen. Rapporten inför inget nytt
krav på förhandsprov i beslutskartan. Ingen del av denna research
skapar resurser, använder hemligheter eller inför nya backupkrav.

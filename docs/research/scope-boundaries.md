# Avgränsningsbeslut som underlag för framtida triage

Inventering den 16 september 2026 för
[Vilka avgränsningsbeslut kan återanvändas av triage?][scope].

## Resultat

Ingen inventerad avgränsning uppfyller alla villkor för en post i
.out-of-scope/. Underlaget innehåller produktkrav, begränsningar av första
versionen, prototypval och uppskjuten verifiering, men inget belagt
triageutfall där ett förbättringsförslag avvisas som wontfix.

Framtida triage kan direkt använda källorna för att känna igen beslutade
krav, uppskjutna prov och planerad fortsättning. De ger inte rätt att
automatiskt stänga ett nytt förslag. Den tydligaste kandidaten för
beställarens framtida bedömning är lagring av hemligheter och fullständiga
betalningsidentifierare. Beständigt ljud och fullständiga samtal har också
en uttrycklig gräns, men saknar ett självständigt dokumenterat varaktigt
motiv. Kandidaterna ändrar inga produktbeslut.

## Metod och källornas räckvidd

Underlaget omfattar hela
[Skyttel – väg till grundspecifikationen för första användbara versionen][map],
dess aktuella Notes och Out of scope, samtliga 23 indexerade resolutioner,
ärendekroppar och mellanliggande kommentarer. GitHub-inventeringen omfattar
30 ärenden och 77 kommentarer. Öppna uppföljningar och kompletterande
planeringsfrågor kontrolleras också. Täckningen redovisas sist.

Datumen nedan är källornas publiceringsdatum i UTC om inget annat anges.
Ärendekroppar och kommentarer kan redigeras; detta är en daterad
inventering. Tekniska leverantörsfakta används som historiska beslutsmotiv,
inte som en ny kontroll av priser, avtal eller kompatibilitet.

Den godkända grundspecifikationen är resolutionen i
[Vad ska första användbara Skyttel innehålla och hur vet vi att det räcker?][spec]
från 16 september. Den fastställer också sina länkade tretton acceptansfall
och typbeslutets åtta fall. Godkänt versionsbundet detaljunderlag är
[Skyttels teknikbeslut][techdoc], commit
ec59c74119e28ada77ab23e6c5919b8c9ecc2292, som läses i sin helhet.
Prototypernas slutresolutioner anger vad deras versioner belägger.

Grundspecifikationens regel gäller: uttryckliga senare preciseringar
kompletterar tidigare beslut. Preliminära alternativ blir inte krav genom
att stå i statusanteckningar. En senare sammanfattning gör inte en
uttrycklig gräns för första versionen till ett permanent förbud.
Kartans aktuella destination omfattar ADR och avgränsningsresearch;
indexet ersätter inte detaljresolutionerna.

Lokala AGENTS.md, CONTEXT.md, .github/copilot-instructions.md,
.github/instructions/*.md, docs/planning/README.md och triagereglerna
är kontrollerade i huvudcheckouten. Dessa arbetsfiler är inte incheckade
i dess basrevision. Ingen .out-of-scope/ finns där vid kontrollen.
Rapportgrenen innehåller endast denna rapport utöver basrevisionen.

Triages regelkälla är de lokala filerna nedan. Kontrollsummorna identifierar
den lästa texten; de är inte publicerade Git-versioner.

    .github/skills/triage/SKILL.md
    SHA-256 f4f720dea34eea04e2a60565821636595e4a40157b231a33e862e8f1892105df
    .github/skills/triage/OUT-OF-SCOPE.md
    SHA-256 1fbf9b432130c6380aa65813b55553cfda150309b27c595e183f8e335b8a190d

Reglerna kräver ett avvisat förbättringsförslag med utfallet wontfix.
Kunskapsbasen grupperar per begrepp och bevarar beslut, hållbart skäl och
tidigare förslag. Tillfällig resursbrist är uppskjutning. Buggrapporter
och redan implementerade funktioner hör inte till denna kunskapsbas.
Vid en senare begreppsmässig träff bedömer underhållaren om avslaget
fortfarande gäller, ska omprövas eller gäller ett annat förslag.
Uppdraget i
[Vilka avgränsningsbeslut kan återanvändas av triage?][scope]
bekräftar samma gränser. Ingen faktisk triage utförs här.

## Sex klassificeringar

1. Gräns för kartläggningen eller prototyparbetet.
2. Begränsning av första användbara versionen.
3. Uppskjutet arbete eller uppskjuten verifiering.
4. Uttryckligt avvisat funktionsförslag med varaktig motivering.
5. Avgränsning som ersätts eller preciseras av senare beslut.
6. Oklart fall där källa, motiv, räckvidd eller aktuellt beslut saknas.

En källa kan stödja flera begrepp. Begreppen grupperas nedan.
**Belägg** återger källornas besked. **Bedömning** anger researchens
klassificering och konsekvens för triage.

## Gränser för kartläggning och prototyper

### Produktionsarbete, hushållsdata och tjänstköp

**Belägg:** Kartans Out of scope avgränsar implementation, driftsättning,
anslutning av verkliga hushållsuppgifter, köp och abonnemangsbeställning.
Kastbara prototyper ger beslutsunderlag. Publika artefakter ska innehålla
påhittade exempel. Källa: aktuell
[Skyttel – väg till grundspecifikationen för första användbara versionen][map],
avläst 16 september, samt produktresolutionerna i täckningslistan.

**Bedömning: kategori 1.** Skälet är kartans destination och offentliga
underlag. Produkten ska senare implementeras och behandla privata
hushållsdata enligt sina åtkomstregler. Detta är inget produktavslag.
Kartkroppen visar inte när varje ursprunglig punkt tillkommer.

### Provunderlag, utformning och kostnadsram

**Belägg:** Samtals- och rymdprototyperna den 13 september använder
simulerade delar; enhetsprototypen den 15 september har minnestillstånd.
Handplacerade exempel verifierar inte stora kartor eller generell layout.
Färgval, zoomgränser, avstånd och tider är inte låsta produktionskrav.
Relationseditorn täcker exempel. Källor:
[Hur ska samtalet skapa, rätta och spara en begriplig karta?][conversation],
[Hur gör 3D-vyn hushållets samband tydliga och redigerbara?][spatial]
och
[Kan Skyttels kartarbete fungera på valda enheter med pekgester och tillgängliga alternativ?][devices].

[Ordna API-nyckel och åtkomst för Skyttels talprov][access-task]
fastställer 15 september högst 10 USD totalt för provet, utan köp,
automatisk påfyllning eller höjning. Modellistan är inget talprov.
Faktiska senare prov dokumenteras i
[Vilken talväg klarar det godkända samtalsflödet på svenska?][voice].

**Bedömning: kategori 1.** Bevisvärde och behörig provförbrukning
avgränsas. Tillstånd som försvinner vid omladdning eller ofullständig
redigering är inte accepterade produktbegränsningar. Provbudgeten är
varken ett förbud mot betalda produkt-API:er eller produktens budget.

## Begränsningar av första versionen

### Distribution och målplattformar

**Belägg:**
[Vilka enheter och distributionsformer behöver första Skyttel?][platform]
väljer 14 september webb med internetkrav och Chrome på Windows, macOS,
iPhone och iPad. Installerad app, offlinearbete, Android och andra
webbläsare ingår inte. Länkåtkomst och flera enheter motiverar vanlig
webb; inget behov motiverar separat appleverans. Andra webbläsare och
installation får bedömas vid framtida behov. Grundspecifikationen
bekräftar omfattningen 16 september.

**Bedömning: kategori 2.** Ingen varaktig avvisning. Kompletterande
Safari-prov utökar inte webbläsarstödet. Oprövat stöd på en målplattform
är en annan fråga än att plattformen ligger utanför första versionen.

### Gemensam insyn och behörigheter per objekt

**Belägg:**
[Vem får se och ändra hushållets information?][access]
anger 13 september gemensam läsning och redigering för dem med tillgång.
Första versionen behöver inga privata delar eller behörigheter per
objekt. Syftet är att en annan hushållsmedlem ska kunna ta hand om
åtagandena. Administratören får inte större insyn i själva kartan.
Privata utkast och exportens särskilda insyn preciseras samma dag i
[Vilken information ska sparas, ändras över tid och kunna återställas?][lifecycle].

**Bedömning: kategori 2.** Omfattning för första versionen, inte ett
förbud mot allt privat innehåll eller ett framtida avslag på
behörighetsförslag. Hushållens isolering kvarstår.

### Ekonomisk automatik och betalningsförteckning

**Belägg:**
[Vilken information ska sparas, ändras över tid och kunna återställas?][lifecycle]
anger 13 september översikt över åtaganden och frivilliga uppgifter;
en förteckning över enskilda betalningar krävs inte.
[Vad ska första användbara Skyttel innehålla och hur vet vi att det räcker?][spec]
fastställer 16 september att automatiska amorteringsplaner,
ränteberäkningar, betalningar och påminnelser inte ingår.
Vardagsscenarierna hyra, lån, kredit och bilavbetalning ingår.

**Bedömning: kategori 2.** Inriktningen är översikt och registrering.
Fristående varaktiga motiv mot de fyra automatikfunktionerna saknas.
Att betalningsförteckning inte krävs är svagare än ett förbud mot den.

### Administrativa assistentverktyg och externt tal

**Belägg:**
[Vilken roll ska externa AI-assistenter få i första Skyttel?][integration]
fastställer 14 september att första MCP-versionen ger kartarbete,
eget utkast, historik och ångring. Export, återimport, permanent radering
och användartillgång görs av administratören i Skyttels gränssnitt,
även när den egna assistenten används. Assistenten tolkar godkännandet;
ett sparanrop är inte oberoende bevis för människans avsikt.
[Vilken sammanhängande teknik och lagring uppfyller de prövade behoven?][technology]
väljer 16 september externa textflöden i ChatGPT webb och Codex-appen.
Externt tal är inget krav; talet inne i Skyttel kvarstår.

**Bedömning: kategori 2.** Administrationsgränsen är uttryckligen för
första versionen. Roll- och avsiktskontroll är dokumenterad bakgrund,
inte ett fastställt skäl att alltid förbjuda administrativa verktyg.
Externt tal är en separat omfattningsgräns utan varaktigt avslagsmotiv.

### Egna fält, konvertering och sammanslagning av typer

**Belägg:**
[Hur ska hushållet skapa och ändra egna objekt- och sambandstyper?][types]
fastställer 16 september text, tal, datum och ja/nej för objektfält.
Sambandstyper har namn och beskrivning men inga egna fält.
Automatisk konvertering och sammanslagning av typdefinitioner ingår inte
i första versionen. Ett nytt fält med rätt värdetyp bevarar tidigare
fält och värden. Användaren kan byta objekttyp och hantera värden
uttryckligen; en oanvänd typ kan därefter tas bort.

**Bedömning: kategori 2.** Alternativen och databevarandet är belagda.
Ett särskilt varaktigt motiv mot fler fälttyper eller egna sambandfält
saknas. Sammanslagning av kartobjekt är en annan funktion och kvarstår.
Egna fält ändrar inte produktens gräns för hemligheter.

### Profilbilder och originalfoton

**Belägg:**
[Vilken information ska sparas, ändras över tid och kunna återställas?][lifecycle]
anger 13 september små profilbilder: JPEG, PNG och WebP upp till 10 MB,
lagrad bild högst 300 × 300 bildpunkter. Originalet behöver inte bevaras.
Det godkända [Skyttels teknikbeslut][techdoc] preciserar 16 september
att endast slutbilden sparas, med bildversioner för historik och ångring.
Bildlagring i databasen förenklar sammanhängande export.

**Bedömning: kategori 2.** Avgränsning av profilbildsfunktionen, inget
varaktigt avslag på originalbilder eller andra bilagor. Teknikpreciseringen
styr vad implementationen ska lagra.

### Liggande iPhone och eget tangentbord

**Belägg:**
[Kan Skyttels kartarbete fungera på valda enheter med pekgester och tillgängliga alternativ?][devices]
fastställer 15 september att användaren får vända iPhone till stående
läge för textredigering. Eget eller mindre tangentbord ingår inte.
Skälet är trångt utrymme med systemtangentbordet och beställarens bedömning
att byte av orientering är ett normalt arbetssätt.

**Bedömning: kategori 2.** Accepterat arbetssätt, bekräftat av
grundspecifikationen. Det avvisar inte mobil redigering, tillgänglighet
eller bevarande av oskickad formulärtext vid vybyte.

### Backup, återställning och leverantörens kopior

**Belägg:**
[Vilken sammanhängande teknik och lagring uppfyller de prövade behoven?][technology]
fastställer 16 september egen export utan extra automatisk backup.
Allt efter senaste export kan förloras vid större haveri; flera dygns
avbrott accepteras. Låg kostnad prioriteras och grundinformationen finns
enligt beställarens ramar på andra ställen. Normal omstart och
driftsättning ska bevara data.

Permanent radering gör berört innehåll oåtkomligt i Skyttel, inklusive
historik, utkast och bildversioner. Beställaren accepterar leverantörens
vanliga villkor utan garanti om omedelbar fysisk radering ur alla
interna kopior. Nedladdade exporter påverkas inte.
[Skyttels teknikbeslut][techdoc] anger att Renders disksnapshots inte
räknas som databasens återställningsväg.

**Bedömning: kategori 2.** Accepterade drift- och leverantörsvillkor,
ingen varaktig avvisning av förbättrat skydd. Detta tillåter inte att
innehållet lämnas åtkomligt i Skyttel. Egen export, normal beständighet
och faktisk raderingsverifiering kvarstår som krav.

### En driftväg och begränsad extra teknik

**Belägg:** [Skyttels teknikbeslut][techdoc], godkänt 16 september,
väljer Render och SQLite för portabel appcontainer, sammanhängande
serverlogik och enklare lagring. Cloudflare byggs inte parallellt.
Två driftvägar eller ett generellt ramverk för alla leverantörer ingår
inte. Separat köserver, databastjänst och backuptjänst behövs inte.
En appinstans och kort uppdateringsavbrott accepteras.

En enkel stabil startplacering och versionskontroll används utan krav på
generell automatisk layoutmotor eller separat avancerad synkmotor.
Cirka 200 kr är ett riktmärke utan automatiskt hårt stopp.
En enkel kostnadsöversikt krävs; separat övervakningstjänst behövs inte
för den. Globalt OpenAI-API är prövad utgångspunkt; EU-avtal och ZDR
förutsätts inte som kontobehörigheter.

**Bedömning: kategori 2.** Sammanhängande enkel lösning och prövade
förutsättningar motiverar omfattningen. Jämförelsealternativen
Cloudflare, Azure, Gandi, PostgreSQL, egen drift, Python och Next.js
är inte varaktigt avvisade förbättringsförslag. Exportbaserad flytt,
samtidighet, beständiga utkast mellan enheter och acceptans med 500
objekt och 1 500 samband kvarstår. Databas i EU innebär inte att all
AI-behandling sker där; store: false lovar inte noll leverantörslagring.

### Säkerhetskontroller, release och utvecklingsmiljö

**Belägg:** [Skyttels teknikbeslut][techdoc] den 16 september anpassar
Kravhanterings principer till en appcontainer. Hela referensens
flerbildsbyggen, register, särskilda tjänster och ärendesamordning
kopieras inte. SQL Server, Keycloak, Kong, HSA och Podman-upplägget
följer inte med till Skyttels grundmiljö. Skälet är den valda stacken.

CodeQL, hemlighets- och beroendekontroller, Trivy config, Syft/Grype,
ZAP-baseline och egna säkerhetstester ingår. Referensens hela uppsättning
Nuclei-, roll-, API- och aktiva ZAP-prov kopieras inte automatiskt;
tillägg motiveras av konkreta täckningsluckor. Dubblerad paket- och
hemlighetsskanning behövs inte som extra standardkontroll.
Separat betald säkerhetslicens eller extern betald bevakning förutsätts
inte. Inget generellt stöd till alla äldre releaser eller oavbruten
säkerhetsbevakning utlovas. Daglig kontroll av faktisk driftbild och
månadsvis kontroll av schemat är däremot krav.

Manuellt godkänd merge följs av automatisk release och driftsättning.
Extra godkännande efter merge och ombygge i Render ingår inte;
den granskade leveranskedjan och bildens digest hålls samman.

**Bedömning: kategori 2.** Anpassning och vald tjänstenivå, inga
varaktiga avslag. Valda säkerhetskontroller får inte utelämnas.
Detta tillåter inte att Codex sandbox stängs av; klienternas behov
av rättigheter avgörs genom uppföljningen nedan.

## Uppskjutet arbete och verifiering

### Tal, enheter och hjälpmedel

**Belägg:**
[Vilken talväg klarar det godkända samtalsflödet på svenska?][voice]
avslutas 15 september med verkligt svenskt Mac-prov. Ytterligare röstprov
på Windows, iPhone och iPad ingår inte i kartläggningen; beställaren
bedömer att det nödvändiga är prövat. Beslutet lovar inget nytt
provärende eller provtillfälle. Målplattformarna kvarstår.

[Kan Skyttels kartarbete fungera på valda enheter med pekgester och tillgängliga alternativ?][devices]
godkänner samma dag uppskjutna Windows-, Chrome-mobil- och hjälpmedelsprov.
Windows som macOS och fortsatt fungerande VoiceOver är arbetsantaganden.
Krav på fulla flöden, gester, minskad rörelse och tillgänglighet kvarstår.
Avgörande senare hinder ska återföras till berörda beslut.

**Bedömning: kategori 3, med kategori 1 för kartläggningens provgräns.**
Detta avvisar inte stöd för plattformar eller hjälpmedel.
Framtida triage ska skilja bevisning från produktkrav.
Inventeringen skapar inga obligatoriska prov eller tidslöften.

### Produktionsanslutningar och samlad verifiering

**Belägg:**
[Kan en extern assistent genomföra Skyttels gemensamma MCP-flöde?][mcp]
den 14 september belägger lokal Codex CLI via stdio med simulerad
identitet och provlagring. Fjärranslutning, OAuth, återkallelse och
ChatGPT/Codex-appens produktionsflöden är inte verifierade där.
[Vad ska första användbara Skyttel innehålla och hur vet vi att det räcker?][spec]
för vidare kontroller av samtidighet, avbrott, kvitton, export/import,
bilder, radering, resursbehov, prestanda och målplattformar till
implementationen. Acceptansfallen är krav, inte testresultat.

**Bedömning: kategori 3.** Prototypbevisning ersätter inte prov av
produkten. Detta avvisar inte funktionerna och återöppnar inte
planeringsbesluten som villkor för att börja implementera.

### Vanliga uppföljningar för devcontainer och cookiehantering

**Belägg:**
[Funktionstesta Codex CLI och VS Code-tillägget i devcontainern][dev-followup]
är öppet och skapat 16 september. Provet görs när den riktiga
devcontainern finns, med separata klientresultat och vanlig profil först.
Ett konstaterat behov kan motivera minsta fungerande förhöjning.
Det blockerar inte teknikbeslutet.

[Inför cookie- och lagringshantering med `viscalyx/viscalyx.se` som förebild][cookie-followup]
är öppet och skapat samma dag, enligt beställarens val av separat nästa
steg. Arbetet utgår från Skyttels faktiska lagring, med egen nyckel,
version, giltighet och testade val. Referensens beteenden är inte redan
implementerade eller verifierade i Skyttel. Externt AI-val är separat.

**Bedömning: kategori 3.** Båda har planerad fortsättning utanför kartan.
Liknande förslag ska bedömas mot den fortsättningen, inte framställas
som avvisade eller redan genomförda funktioner.

## Prövning av varaktiga avslag

### Inget fall uppfyller kategori 4 och triages fulla villkor

Inget inventerat ärende har dokumenterat utfall som avvisad enhancement
med wontfix. Stängda Wayfinder-beslut anger att en fråga är avgjord,
inte att ett förbättringsförslag avvisas. Kandidaterna nedan saknar
därmed minst detta villkor.

### Kandidat: hemligheter och fullständiga betalningsidentifierare

**Belägg:**
[Vem får se och ändra hushållets information?][access]
fastställer 13 september att fullständiga konto- och kortnummer,
lösenord, pinkoder, säkerhetskoder och återställningskoder hålls utanför
Skyttel. Begränsade referenser räcker för att känna igen rätt konto
eller betalningsmedel. Källan skiljer referenser från uppgifter som
ger åtkomst eller möjlighet att betala. Typbeslutet och
grundspecifikationen bekräftar 16 september att egna fält inte ändrar detta.

**Bedömning: kategori 6 beträffande ett varaktigt triageavslag.**
Det uttryckliga produktkravet har ett sakligt dokumenterat motiv:
skillnaden mellan identifiering och tillgång. Det är starkare än att
något bara saknas. Källans övergripande ram är dock första Skyttel;
räckvidden bortom första Skyttel är inte uttryckligen fastställd.
Varken ett avvisat förbättringsärende eller wontfix är belagt.

Framtida triage kan direkt citera den gällande gränsen. Beställaren
behöver bedöma det konkreta nya förslaget och räckvidden innan ett
varaktigt avslag dokumenteras. All ekonomisk information eller alla
inloggningsreferenser är inte förbjudna.

### Kandidat med saknat motiv: beständigt ljud och hela samtal

**Belägg:**
[Vilken information ska sparas, ändras över tid och kunna återställas?][lifecycle]
fastställer 13 september att aktuella förslag och nödvändig
textsammanfattning bevaras, medan ljud och fullständig samtalshistorik
inte lagras som beständigt innehåll i Skyttel. Tillfällig AI-behandling
är separat. Grundspecifikationen bekräftar gränsen 16 september.
Teknikunderlaget avgränsar även teknisk loggning från hushållstexter,
bilder, token och ljud.

**Bedömning: kategori 6 för varaktigheten, explicit gällande produktgräns.**
Källorna anger vad som behövs för att återuppta utkastet, men inget
självständigt hållbart motiv att avvisa alla framtida ljud- eller
samtalsarkiv. Kostnad, juridik eller integritetsargument får inte
tillskrivas beställaren i efterhand. Wontfix saknas. Leverantörens
loggar och externa klienters historik är skilda från Skyttels lagring.

## Ändrade beslut och preciseringar

### Granskning, sparande och borttagning

**Belägg:** Samtalsbeslutet den 13 september ersätter prototypens separata
granskningssteg med löpande synliga förslag och sammanfattning.
Sparbeskedet godkänner helheten. Integrationsbeslutet den 14 september
tillåter granskning genom extern text eller tal utan besök i kartan.
Godkännandet kvarstår.

[Kan en extern assistent genomföra Skyttels gemensamma MCP-flöde? – förtydligande från användarprovet][save-clarification]
preciserar samma dag att rättelse och sparbesked i samma meddelande
kan slutföras utan ännu ett ja. Skälet är en onödig extra dialogomgång.
Oväntat ändrat underlag kräver fortfarande hantering.
Enhetsbeslutet den 15 september ersätter det extra steget
Ta bort → Föreslå borttagning med direkt borttagning till utkast.

**Bedömning: kategori 5.** Källor är
[Hur ska samtalet skapa, rätta och spara en begriplig karta?][conversation],
[Vilken roll ska externa AI-assistenter få i första Skyttel?][integration]
och
[Kan Skyttels kartarbete fungera på valda enheter med pekgester och tillgängliga alternativ?][devices].
Senare flödesbeslut styr. Avvisningen av extra steg gäller vanliga
kartflöden, inte alla bekräftelser i hela produkten.

### Ångring, typkatalog och historiska definitioner

**Belägg:** MCP-provet den 14 september beskriver stopp vid överlapp
som en prototypbegränsning, inte en produktregel om tomt utkast.
[Vad ska första användbara Skyttel innehålla och hur vet vi att det räcker? – pågående beslutsomgång][spec-progress]
preciserar 16 september att just överlapp stoppar ångring tills
konflikten är löst. Förslag får inte skrivas över.
Grundspecifikationen godkänner detta.

[Hur ska hushållet skapa och ändra egna objekt- och sambandstyper?][types]
preciserar 16 september att ordlistan inte ger låsta standardtyper och
att samband får koppla valfria objekt. Historiska definitioner bevaras
utan att låsa aktuell katalog; aktuell användning och beständiga utkast
hindrar borttagning. Detta preciserar tidigare öppen formulering om användning.

**Bedömning: kategori 5.** Senare regler styr. Hela utkastet behöver
inte alltid vara tomt. Teknikunderlagets tillåtna domänkombinationer
måste läsas enligt typbeslutet. Ingen sluten katalog är belagd som ett
tidigare godkänt krav. Prototypens exempel får inte avvisa nya typer.

### Rumslig huvudvy och mobil lista

**Belägg:**
[Hur gör 3D-vyn hushållets samband tydliga och redigerbara?][spatial]
väljer 13 september samlad A-vy med B:s fokus och låter C utgå.
Plattformsbeslutet den 14 september och enhetsbeslutet den 15 september
väljer lista och detaljer som mobilstart med redigerbar rymdkarta.
Grundspecifikationen tillåter färre etiketter vid utzoomning men
behåller åtkomst till alla objekt och samband.

**Bedömning: kategori 5.** C:s bortval avvisar inte lista som mobilstart.
Färre etiketter innebär inte bortvald information eller sökning.
Statisk bottenellips och fasta visuella varianter ingår inte i vald
utformning; varaktigt motiv mot sådana framtida förslag saknas.

### Provvillkor, teknik och korrigerade budgettolkningar

**Belägg:** Talresolutionen den 15 september ersätter uttryckligen
beskedet att hålla frågan öppen för plattformsprov. Enhetsresolutionen
ersätter provvillkor med accepterade antaganden. Teknikresolutionen
den 16 september väljer Render. Tidigare öppna jämförelser är inte
aktuellt beslutsläge. Egen export gäller utan backupretention eller
garanterad högsta dataförlust. Tolkningar om veckoförlust och tre
månaders backupretention korrigeras uttryckligen i
[Vilken sammanhängande teknik och lagring uppfyller de prövade behoven? – teknikramar][tech-progress].

**Bedömning: kategori 5.** De aktuella resolutionerna styr.
Korrigerade tolkningar är inte först beslutade och sedan avvisade
funktioner. Provets hårda budget och produktens mjuka riktmärke har
olika räckvidd. Godkänt teknikval är inte produktionsverifiering.

### Kartans utvidgade destination

**Belägg:** Grundspecifikationens slutkommentar den 16 september anger
att kartan kan avslutas. Samma dags
[Skyttel – väg till grundspecifikationen för första användbara versionen – komplettering med ADR-arbete][map-extension]
och aktuell destination omfattar ADR-inventering, urval, dokumentation
och avgränsningsresearch. Produktbesluten kvarstår.

**Bedömning: kategori 5.** Aktuell karta styr återstående kartarbete.
Slutkommentarens avslutsbesked avvisar inte senare dokumentation.
Produktionsimplementation ingår fortfarande inte i kartan.

## Övriga oklara fall och motiverade bortval

### Inget krav är inte ett avslag

**Belägg:**
[Vem får se och ändra hushållets information?][access]
anger 13 september att lokal AI inte är ett krav. Kvalitet prioriteras
och extern behandling godtas efter tydligt val.
[Vad ska första användbara Skyttel innehålla och hur vet vi att det räcker? – pågående beslutsomgång][spec-progress]
anger 16 september att första administratör per installation inte
inför krav på en central installationstjänst. Teknikunderlaget anger
egna inloggningslösenord som reserv vid konkret hinder.

**Bedömning: kategori 6 för ett påstått avslag.** Lokal AI, central
administration, egna lösenord och EU/ZDR är inte dokumenterade som
varaktigt avvisade förbättringsförslag. Ett uteblivet krav, en reservväg
eller en oprövad kontobehörighet får inte ges den betydelsen.

### Positiva säkerhets- och datakrav

**Belägg:** Åtkomst-, informations-, integrations-, teknik- och typbesluten
kräver hushållsisolering, rätt identitet, godkännande av ändringar,
konfliktkontroll, skydd av privata utkast och bevarad historik.
Import återaktiverar inte åtkomst. Borttagning av en använd typ får
inte automatiskt radera användande objekt. Namn avgör inte identitet;
saknade uppgifter får inte gissas. Källor och datum finns i täckningslistan.

**Bedömning: kategori 6 för ett påstått avslag.** Kraven kan direkt
användas för att bedöma förslag. De är inte i sig avslag på identifierade
förbättringsärenden. En avvikande implementation kan vara en bugg och
hör då inte till .out-of-scope/. Ingen befintlig implementation antas.

## Användning vid framtida triage

- Använd aktuell resolution och kontrollera senare preciseringar för
  just det begrepp som det nya förslaget gäller.
- Behåll källans räckvidd: kartläggning, första version, prototyp,
  produktkrav eller verifiering. Uppskjutna prov avvisar inte krav.
- Kontrollera aktuell status för devcontainer- och cookieuppföljningarna.
  De visar planerad fortsättning.
- Vid förslag om hemligheter eller samtalsarkiv: visa gällande gräns.
  Beställaren bedömer om det konkreta förslaget avvisas, dess räckvidd
  och vilket hållbart skäl som gäller.
- Skriv eventuell kunskapsbaspost först enligt triageflödet för avvisad
  förbättring med wontfix. Gruppera per begrepp och länka faktiskt
  avvisade förslag. Skapa inga retroaktiva utfall.

Inga nya produktbeslut krävs för att använda inventeringen.
Saknade avslagsbeslut behöver bara prövas när ett konkret framtida
förslag motiverar det. Rapporten skriver inga .out-of-scope/-poster,
ändrar inga triageroller och lägger inte till verifieringsvillkor.

## Täckning av kartans beslut

Varje indexerad resolution är kontrollerad med ärendets övriga kommentarer.
Listan anger datum och var dess avgränsningar hör hemma i rapporten.
Researchalternativen är underlag, inte beställarens avslag.

- [Vilka tekniska vägar kan stödja svenska samtal som ändrar en relationskarta?][voice-research]
  (13 september): dokumentationsgräns, inga liveprov eller leverantörsval.
- [Hur kan externa AI-assistenter läsa och föreslå ändringar i Skyttel?][assistant-research]
  (13 september): klientförmågor och förslag, inget integrationsbeslut.
- [Vilka objekt, relationer och ord behöver Skyttels första scenario?][domain]
  (13 september): vardagsord, identitet, ofullständighet; ingen databasstruktur.
- [Vem får se och ändra hushållets information?][access]
  (13 september): insyn, hemligheter och extern behandling.
- [Hur ska samtalet skapa, rätta och spara en begriplig karta?][conversation]
  (13 september): granskningsflöde och simulerad prototyp.
- [Hur gör 3D-vyn hushållets samband tydliga och redigerbara?][spatial]
  (13 september): vyval, presentation och provens bevisvärde.
- [Vilken information ska sparas, ändras över tid och kunna återställas?][lifecycle]
  (13 september): ekonomisk översikt, ljud, historik, utkast och bilder.
- [Vilken roll ska externa AI-assistenter få i första Skyttel?][integration]
  (14 september, redigerad samma dag): administrativa gränser och sparande.
- [Vilka enheter och distributionsformer behöver första Skyttel?][platform]
  (14 september): plattformar, internetkrav och tillgänglig riktning.
- [Kan en extern assistent genomföra Skyttels gemensamma MCP-flöde?][mcp]
  (14 september): faktiskt lokalprov och senare sparregel.
- [Kan Skyttels kartarbete fungera på valda enheter med pekgester och tillgängliga alternativ?][devices]
  (15 september): mobil redigering, direkt borttagning, uppskjutna prov.
- [Ordna API-nyckel och åtkomst för Skyttels talprov][access-task]
  (15 september): åtkomstkontroll och provbudget.
- [Vilken talväg klarar det godkända samtalsflödet på svenska?][voice]
  (15 september): talväg och gräns för ytterligare kartläggningsprov.
- [Vilka drift- och lagringsalternativ passar Skyttels krav och kostnadsram?][hosting]
  (15 september, redigerad samma dag): alternativ och backupkorrigering.
- [Vilka villkor och klientstöd gäller för Skyttels valda AI- och MCP-flöden?][ai-research]
  (15 september): textklienter, datavillkor och återstående prov.
- [Kan Cloudflare ge Skyttel billigare sammanhängande drift?][cloudflare]
  (15 september): jämförelse, inget produktval eller avslag.
- [Vad kan Gandi erbjuda för Skyttels drift och lagring?][gandi]
  (15 september): jämförelse; oklara webbhotellsvillkor är inget förbud.
- [Kan Azure Static Web Apps Free bära första Skyttel?][azure]
  (15 september): jämförelse; gratisnivåer och tekniska villkor.
- [Vilka säkerhetskontroller och uppdateringsflöden bör Skyttel återanvända från Kravhantering?][security]
  (16 september, redigerad samma dag): en appbild och ännu ej införda
  kontroller.
- [Vilket devcontainer-upplägg ger fungerande Codex för Skyttels stack?][devcontainer]
  (16 september): referensens tjänster och senare klientprov.
- [Vilken sammanhängande teknik och lagring uppfyller de prövade behoven?][technology]
  (16 september): stack, drift, säkerhet, radering och hela godkända underlaget.
- [Hur ska hushållet skapa och ändra egna objekt- och sambandstyper?][types]
  (16 september): öppen katalog, fält, konvertering och typlivscykel.
- [Vad ska första användbara Skyttel innehålla och hur vet vi att det räcker?][spec]
  (16 september): samlad omfattning, senare preciseringar och acceptans.

De två vanliga uppföljningarna är kontrollerade i sin helhet. Även
[Vilka fattade beslut är kandidater för ADR:er?][adr-inventory]
och
[Vilka ADR:er ska ingå i Skyttels arkitekturdokumentation?][adr-decision]
är kontrollerade. De dokumenterar kompletteringen, inga produktavslag.
[Test: verify issue tracker access][tracker-test]
har ingen produktfråga eller resolution att klassificera.

[scope]: https://github.com/viscalyx/skyttel/issues/30
[map]: https://github.com/viscalyx/skyttel/issues/2
[map-extension]: https://github.com/viscalyx/skyttel/issues/2#issuecomment-5697192526
[domain]: https://github.com/viscalyx/skyttel/issues/3#issuecomment-5654166004
[voice-research]: https://github.com/viscalyx/skyttel/issues/4#issuecomment-5653964246
[assistant-research]: https://github.com/viscalyx/skyttel/issues/5#issuecomment-5653964755
[access]: https://github.com/viscalyx/skyttel/issues/6#issuecomment-5654275475
[conversation]: https://github.com/viscalyx/skyttel/issues/7#issuecomment-5654691943
[spatial]: https://github.com/viscalyx/skyttel/issues/8#issuecomment-5655478727
[lifecycle]: https://github.com/viscalyx/skyttel/issues/9#issuecomment-5655680457
[integration]: https://github.com/viscalyx/skyttel/issues/10#issuecomment-5662601732
[platform]: https://github.com/viscalyx/skyttel/issues/11#issuecomment-5663538779
[technology]: https://github.com/viscalyx/skyttel/issues/12#issuecomment-5691771132
[tech-progress]: https://github.com/viscalyx/skyttel/issues/12#issuecomment-5688442400
[techdoc]: https://github.com/viscalyx/skyttel/blob/ec59c74119e28ada77ab23e6c5919b8c9ecc2292/docs/planning/technology-proposal.md
[spec]: https://github.com/viscalyx/skyttel/issues/13#issuecomment-5697070021
[spec-progress]: https://github.com/viscalyx/skyttel/issues/13#issuecomment-5692315413
[voice]: https://github.com/viscalyx/skyttel/issues/14#issuecomment-5688291674
[mcp]: https://github.com/viscalyx/skyttel/issues/15#issuecomment-5667325819
[save-clarification]: https://github.com/viscalyx/skyttel/issues/15#issuecomment-5666680822
[devices]: https://github.com/viscalyx/skyttel/issues/16#issuecomment-5678916527
[access-task]: https://github.com/viscalyx/skyttel/issues/17#issuecomment-5679042669
[hosting]: https://github.com/viscalyx/skyttel/issues/18#issuecomment-5688577251
[ai-research]: https://github.com/viscalyx/skyttel/issues/19#issuecomment-5688577722
[cloudflare]: https://github.com/viscalyx/skyttel/issues/20#issuecomment-5688731768
[gandi]: https://github.com/viscalyx/skyttel/issues/21#issuecomment-5688766972
[azure]: https://github.com/viscalyx/skyttel/issues/22#issuecomment-5688787471
[security]: https://github.com/viscalyx/skyttel/issues/23#issuecomment-5691424692
[devcontainer]: https://github.com/viscalyx/skyttel/issues/24#issuecomment-5691593794
[dev-followup]: https://github.com/viscalyx/skyttel/issues/25
[types]: https://github.com/viscalyx/skyttel/issues/26#issuecomment-5696089834
[cookie-followup]: https://github.com/viscalyx/skyttel/issues/27
[adr-inventory]: https://github.com/viscalyx/skyttel/issues/28
[adr-decision]: https://github.com/viscalyx/skyttel/issues/29
[tracker-test]: https://github.com/viscalyx/skyttel/issues/1

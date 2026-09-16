# Säkerhetskontroller och uppdateringar för Skyttel

## Status och avgränsning

Underlaget beskriver förslag för Skyttels teknikbeslut. Det innebär inte att
kontroller har införts eller att någon driftsättning har genomförts.

Källgranskningen av Kravhantering är skrivskyddad och gäller det offentliga
arkivet `viscalyx/Kravhantering` vid commit
`562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88`. Inga arbetsflöden, installationer,
säkerhetsskanningar eller applikationer har körts. Dokumenterade inställningar
i GitHub är inte samma sak som verifierade aktuella inställningar.

## Vad Kravhantering faktiskt har

### GitHubs kontroller och projektets egna kontroller

Kravhantering dokumenterar CodeQL med standardkonfiguration, GitHub secret
scanning och push protection som kontroller i GitHub. Dokumentet säger att
dessa är aktiverade. Det finns ingen egen CodeQL-skanning i det granskade
repository-arbetsflödet; dess CodeQL-action används enbart för att ladda upp
andra verktygs SARIF-resultat. Trivys hemlighetsskanning och Gitleaks väljs
bort för att undvika dubbla larm. Detta skiljer en inställning i GitHub från
en kontroll vars implementation finns i arkivet.
[Dokumenterade GitHub-kontroller](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/docs/security-privacy/security-ci.md#L72-L85),
[SARIF-uppladdning](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/workflows/security-repository.yml#L98-L126).

Projektets repository-skanning körs vid pull request till `main`, push till
`main`, varje vecka och manuellt. Den installerar enligt låsfilen med
`npm ci`, kör `npm audit --audit-level=high`, Trivys paketskanning och Trivys
konfigurationsskanning. High och Critical stoppar arbetsflödet. Skannerns
action och verktygsversion är låsta. Rapporter laddas upp även vid fel,
varefter ett separat steg gör hela kontrollen underkänd vid skanningsfel.
[Utlösare och skanning](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/workflows/security-repository.yml#L3-L96),
[Rapporter och samlat resultat](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/workflows/security-repository.yml#L128-L157).

SARIF-uppladdningen hoppas över för pull requests från andra arkiv, medan
själva skanningen kan köras med de begränsade rättigheter som gäller där.
Arbetsflödet checkar inte ut beständiga GitHub-autentiseringsuppgifter.
[Rättigheter vid fork](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/workflows/security-repository.yml#L98-L126),
[Checkout](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/workflows/security-repository.yml#L29-L32).

### Uppdateringar och sådant Dependabot inte äger

Dependabot söker varje vecka efter nya npm-paket i rotprojektet och tre
separata stödprojekt samt efter nya GitHub Actions och devcontainer features.
Konfigurationen innehåller ingen Docker-lane. Containerbilder och samordnade
verktyg hanteras i stället av projektets egen driftkontroll.
[Dependabot-konfiguration](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/dependabot.yml#L1-L34),
[Underhållsregister](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/dependency-maintenance.json#L38-L163).

Registret anger en ansvarig uppdateringsväg för varje paket-, verktygs- och
bildkälla. En lokal kontroll upptäcker luckor, motstridiga bildreferenser,
felaktiga eller utgångna undantag, skillnader mot Dependabot-konfigurationen
och inkonsekventa installationsvägar. Kontrollen ingår i `npm run check`.
[Samlad validering](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/scripts/dependency-maintenance.mjs#L1185-L1216),
[Check-kommandot](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/package.json#L92-L93).

Arbetsflödet Dependency Drift körs varje vecka eller manuellt på `main` och
skriver uppdateringsärenden. Det är inte en sårbarhetsskanner. Det kan
upptäcka en ny version eller ett ändrat bildinnehåll även utan en känd
sårbarhet. Det hanterar bland annat npm-versionen, Node-bilder, UBI-bilder,
SQL Server, Keycloak, Kong och Lychee. Hela kontrollen av register och
fjärrkällor måste lyckas innan ärenden får ändras.
[Arbetsflöde](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/workflows/dependency-drift.yml#L3-L61),
[Ordning före GitHub-ändringar](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/workflows/dependency-drift.mjs#L1476-L1513).

Ärendena har en genomarbetad livscykel: samma observation skapar inget nytt,
ett nytt mål får ett eget ärende, ersatta ärenden länkas och stängs, och ett
utgånget uppskov gör arbetet aktuellt igen. Det finns högst ett aktivt
automatiskt ärende per underhållsenhet. Detta är användbart vid många
samordnade beroenden men är mycket mer mekanik än ett första Skyttel behöver.
[Ärendelivscykel](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/docs/development/dependency-workflow.md#L100-L139).

### Själva uppdateringsarbetet

Ett uppdateringsärende ska leda till granskning av primärkällor och
kompatibilitet, uppdatering av samtliga berörda referenser, relevanta tester,
säkerhetsskanning och en ny kontroll som visar att driftavvikelsen är löst.
Paketreglerna kräver `npm run check` och `npm audit` efter beroendeändringar.
Det är alltså en väg från upptäckt till verifierad ändring, inte bara ett
flöde av larm.
[Uppdateringsarbetsflöde](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/skills/resolve-dependency-drift/SKILL.md#L11-L54),
[Paketregler](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/instructions/package-updates.instructions.md#L7-L27).

Kravhantering låser en gemensam npm-version och tillåter bara granskade
installationsskript. Ogranskade skript ska stoppa en ren installation.
Principen är återanvändbar, men Skyttels konkreta inställning måste verifieras
mot vald pakethanterare och native-paketen, exempelvis SQLite och Sharp.
[Livscykelskript](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/docs/development/dependency-workflow.md#L5-L24).

### Säkerhet i CI och rapportering

Projektreglerna kräver externa GitHub Actions låsta till fullständig commit
och `persist-credentials: false` när checkout inte behöver behålla token.
Dependabot äger uppdateringen av dessa action-revisioner.
[Actions-regler](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/instructions/github-actions-security.instructions.md#L5-L25).

En särskild SSDLC-kontroll kräver att författaren intygar säkerhetsbedömning
för känsliga ändringar. Den kontrollerar intyget, inte om bedömningen är
korrekt. Dess `pull_request_target` kör bara betrodd baskod med läsrättigheter.
För Skyttel kan en kort granskningsmall ge samma ansvarsfördelning utan att
hela denna kontrollmotor kopieras.
[Kontrollens begränsning](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/docs/security-privacy/security-ci.md#L45-L60),
[Betrodd baskod](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/workflows/ssdlc-gate.yml#L12-L40).

Säkerhetspolicyn beskriver privat rapportering och en enkel supportmodell:
fixar görs på `main`, levereras i en ny release och förs inte tillbaka till
äldre releaser. Befintliga taggar byggs inte om. Den modellen kan passa
Skyttel, men Kravhanterings svarstider och särskilda granskargrupp är inga
automatiskt överförda åtaganden.
[Supportmodell](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/SECURITY.md#L3-L29),
[Privat rapportering](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/SECURITY.md#L31-L48),
[Svarstider](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/SECURITY.md#L93-L106).

## Återanvändning för ett litet Skyttel

Följande är en bedömning utifrån källorna ovan, inte en beskrivning av redan
införda Skyttel-kontroller.

- **Behåll principerna:** GitHubs kod- och hemlighetskontroller, låsfil,
  automatiska uppdateringsförslag, skanning vid ändring och regelbundet även
  när ingen kod ändras, tydligt underkänt resultat och bevarade rapporter.
- **Anpassa till en applikation:** uppdateringsbevakning behöver täcka
  npm-paket, GitHub Actions, Node, pakethanterare, containerbas och verktyg
  som installeras utanför vanliga paket. Börja med GitHubs inbyggda stöd där
  det räcker och en dokumenterad väg för återstående komponenter.
- **Behåll granskning och verifiering:** läs ändringsinformation, kontrollera
  kompatibilitet och migrationspåverkan, testa, bygg och skanna den nya
  leveransen. Ett öppnat uppdateringsärende är inte en installerad fix.
- **Anpassa granskningen till Skyttel:** hushållsgränser, indragen åtkomst,
  OAuth/MCP, import, filhantering och datamigrationer behöver egna
  säkerhetstester. Allmänna skannrar verifierar inte dessa produktregler.
- **Kopiera inte hela samordningen:** separata SQL Server-, Keycloak-, Kong-,
  HSA-, UBI- och Azure-vägar, full registerupptäckt och omfattande automatisk
  ärendelivscykel motiveras av Kravhanterings större leveransmodell.
- **Undvik dubbla larm utan ett uttalat syfte:** npm audit och flera
  paketverktyg kan överlappa. Verktygsvalet ska följa den yta som behöver
  kontrolleras: källkod, beroenden, konfiguration, färdig container eller
  körande applikation.

## Containerbilder och körande applikation

Kravhanterings gemensamma containerkontroll skapar en SPDX-SBOM med Syft,
skannar den med Grype och tillämpar en incheckad undantagspolicy. En SBOM är
en förteckning över bildens komponenter. Policyn blockerar High/Critical
med tillgänglig fix, om ett giltigt avgränsat undantag saknas. Undantag har
ägare, motivering, exakta paketversioner, granskningstid och utgångsdatum.
Detta är en annan tröskel än repository-skanningens High/Critical utan
villkor om tillgänglig fix. Skyttels policy behöver ange skillnaden öppet.
[Containerkontrollen](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/actions/container-vulnerability-gate/action.yml),
[Undantagsvalidering och blockerande fynd](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/scripts/release/container-vulnerability-policy.mjs#L118-L260).

Den dagliga containerbevakningen verifierar publicerade bilders identitet
och attestering, hämtar aktuell sårbarhetsdatabas och skannar deras SBOM.
Den bygger inte om en gammal tagg. Det gör det möjligt att upptäcka en ny
sårbarhet i en oförändrad release. Urvalet är en stabil och en förhandsrelease;
det bevisar inte vilken version en viss installation kör. Skyttel bör i
stället registrera den faktiskt driftsatta bildens digest, alltså dess
innehållsidentifierare, och använda den för bevakningen.
[Daglig bevakning](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/workflows/container-vulnerability-monitor.yml),
[Releaseurval](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/container-release-support.json).

Kravhantering kompletterar statiska kontroller med autentiserad ZAP-baseline,
Nuclei och särskilda API-, roll- och MCP-prov mot en lokal testinstallation.
Skyttel kan använda ZAP-baseline och egna behörighets-/MCP-prov som första
nivå. SQL Server, Keycloak och Kravhanterings rollmodell ska inte kopieras.
Aktiva angreppstester hör hemma i en isolerad installation med syntetiska
data. En generell skanner bevisar inte att hushållens gränser håller.
[DAST-fördelning](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/docs/security-privacy/security-ci.md#L217-L347),
[MCP-prov](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/workflows/security-mcp.yml).

## Vad GitHub kan tillhandahålla

Kontrollerat mot officiell dokumentation 2026-09-16:

- CodeQL för JavaScript/TypeScript och Actions, dependency review samt
  hemlighetsskanning är tillgängliga för publika projekt utan en separat
  betald säkerhetslicens. Inställningarna måste ändå aktiveras och verifieras.
  [Tillgänglighet](https://docs.github.com/en/billing/concepts/product-billing/github-advanced-security),
  [CodeQL](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning).
- Dependabot stöder npm, GitHub Actions och Docker som versionsuppdateringar.
  Docker har inte Dependabots säkerhetsuppdateringar; bildens OS-paket
  behöver separat skanning. SHA-låsta Actions kan versionsuppdateras, men
  Dependabots sårbarhetsvarningar för Actions omfattar semantiska
  versionsreferenser och inte SHA-referenser. Behåll SHA-låsning och bevaka
  även leverantörernas säkerhetsmeddelanden.
  [Ekosystem](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories),
  [Beroendegrafens begränsningar](https://docs.github.com/en/code-security/reference/supply-chain-security/dependency-graph-supported-package-ecosystems).
- Dependency review granskar ändrade beroenden i en PR och kan stoppa vid
  vald allvarlighetsgrad. Det krävs en obligatorisk statuskontroll för att
  hindra sammanslagning. Verktyget ersätter inte löpande kontroll av en
  redan driftsatt bild.
  [Konfiguration](https://docs.github.com/en/code-security/tutorials/secure-your-dependencies/customize-dependency-review-action).
- SARIF-uppladdning visar fynd i GitHub men utgör inte ensam en spärr.
  Code-scanning-regler har dokumenterade undantag, bland annat för
  Dependabot-PR:er med standardkonfiguration och merge queue. Slutkontrollen
  måste uttryckligen kontrollera att obligatoriska skanningar körts och
  godkänts. En överhoppad kontroll får inte bli en godkänd leverans av misstag.
  [Code-scanning-regler](https://docs.github.com/en/code-security/concepts/code-scanning/merge-protection),
  [Branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
- Push protection har begränsad mönstertäckning och möjligheter till bypass.
  Hemligheter ska därför ligga i tjänsternas hemlighetslager även när
  skanning är aktiverad. Upptäckta riktiga nycklar behöver återkallas.
  [Push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection),
  [Täckning](https://docs.github.com/en/code-security/reference/secret-security/secret-scanning-scope).
- Ursprungs- och SBOM-attestering kan knyta publicerade bilder till en
  viss byggkörning och källkod. Verifiering av attesteringen visar ursprung,
  inte frånvaro av säkerhetsbrister. Publika attesteringar får inte innehålla
  hemligheter eller hushållsdata.
  [Attestering](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations),
  [Begränsningar](https://docs.github.com/en/actions/concepts/security/artifact-attestations).
- Schemalagda arbetsflöden i publika projekt kan avaktiveras efter 60 dagars
  inaktivitet. Bevakning behöver därför en ansvarig som kontrollerar senaste
  lyckade körning och återaktiverar vid behov. Ett schema är ingen garanti
  för oavbruten bevakning.
  [Arbetsflödens livscykel](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows).

## Observerat nuläge i Skyttel

Skrivskyddad kontroll mot GitHub API 2026-09-16 visar:

- Repositoryt är publikt och har `main` som standardbranch.
- Dependabots säkerhetsuppdateringar är aktiverade.
- Repositoryts hemlighetsskanning och push protection är avaktiverade.
- CodeQL standardkonfiguration har status `not-configured`.
- Listan över repository-rulesets är tom. Detta säger inte ensamt om
  klassiskt branch protection eller överordnade regler finns.

Källor är API-svaren från `GET /repos/viscalyx/skyttel`,
`GET /repos/viscalyx/skyttel/code-scanning/default-setup` och
`GET /repos/viscalyx/skyttel/rulesets`. Inga inställningar ändras här.

## Render, release och kostnad

Render kan köra en färdig bild från GHCR med exakt digest. En bildbaserad
tjänst driftsätter inte automatiskt när en tagg ändras. En deploy-hook kan
ange en viss digest för en körning, men ändrar inte tjänstens sparade
bildreferens. Skyttel behöver därför hålla avsedd och faktiskt driftsatt
version samstämmiga. Bilder som används för drift och återgång måste finnas
kvar i registret. Detta stöder förslaget att testa och skanna samma bild
som sedan införs, utan ett separat ombygge på Render.
[Färdiga bilder på Render](https://render.com/docs/deploying-an-image),
[Deploy-hooks](https://render.com/docs/deploy-hooks).

GitHubs standardrunners är kostnadsfria för publika projekt; större runners
och lagring har andra villkor. Publika Packages är kostnadsfria och
containerregistrets lagring och trafik är för närvarande kostnadsfria.
Korta lagringstider för tillfälliga CI-rapporter och få kvarhållna bilder
begränsar förbrukningen. Ingen ny betald säkerhetstjänst behövs i förslaget,
men lagringskvoter och framtida prisändringar behöver följas upp.
[Actions-kostnader](https://docs.github.com/en/billing/concepts/product-billing/github-actions),
[Packages-kostnader](https://docs.github.com/en/billing/concepts/product-billing/github-packages).

## Inriktning för teknikförslaget

Beställaren anger automatiska uppdateringsförslag och tester samt manuellt
godkänd sammanslagning till `main`. Godkänd kod på `main` ska därefter införas
automatiskt i Render när releasekontrollerna lyckas, utan ett extra manuellt
steg. Detta kan genomföras i GitHub Actions med Renders deploy-hook eller API.
En bildbaserad Render-tjänst reagerar inte själv på en ny registertagg;
arbetsflödet behöver uttryckligen begära införande av den kontrollerade bilden.
Övriga tekniska rekommendationer konkretiseras i teknikförslaget. Researchen
fastställer varken en genomförd implementation eller att stacken är godkänd.

## Begränsningar i källunderlaget

- Ingen `dependency-review-action` påträffades i de granskade arbetsflödena.
  Det bevisar inte vilka regler eller appar som har aktiverats i GitHub.
- GitHub-inställningar, obligatoriska statuskontroller och mottagare av larm
  måste verifieras separat för Skyttel. Dokumentation räcker inte som bevis
  för att en kontroll faktiskt stoppar sammanslagning eller driftsättning.
- Dokumentationen och koden är inte helt synkroniserade: SSDLC-dokumentet
  nämner ett titelvillkor för undantag, medan arbetsflödet undantar alla
  Dependabot-författade pull requests. Återanvänd aktuellt avsett beteende,
  inte formuleringen utan kontroll.
  [Dokumentets undantag](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/docs/security-privacy/security-ci.md#L20-L27),
  [Arbetsflödets villkor](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/workflows/ssdlc-gate.yml#L16-L20).
- Kravhanterings repository-skanning ersätter inte skanning av exakt den
  container som körs. Dess dokumentation har en separat modell för byggda
  kandidater och återkommande skanning av publicerade bilder.
  [Separata containerkontroller](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/docs/security-privacy/security-ci.md#L147-L163).

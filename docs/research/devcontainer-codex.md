# Devcontainer med Codex för Skyttel

## Slutsats

Skyttel kan utgå från Kravhanterings devcontainer men anpassa den till en
utvecklingscontainer med TypeScript, React/Vite, Hono och SQLite. Behåll
Codex-installation, beständig utvecklingsmiljö, GitVersion och relevanta
testverktyg. Separata SQL Server-, Keycloak-, Kong- och HSA-tjänster ingår
inte i det föreslagna Skyttel-upplägget.

Normalprofilen är förstahandsval. Behåll möjligheten till en uttryckligen
vald profil med ytterligare Linux-rättigheter om ett faktiskt prov visar
att värdens containerisolering hindrar Codex inre sandbox. Fungerande Codex
ska verifieras genom ett riktigt arbetsflöde; installerad kommandofil räcker
inte som bevis.

## Underlag och avgränsning

Källgranskningen gäller offentliga `viscalyx/Kravhantering` vid commit
`562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88`. Den omfattar konfiguration,
installationsskript, dokumentation och CI-definition. Inga tjänster eller
skanningar körs och inga personliga autentiseringsfiler läses.

Den lokala värden har Codex 0.153.0 på macOS ARM64 och Docker-klient 29.7.2,
men saknar tillgänglig Docker-serversocket vid kontrollen. Det är inte ett
Linux- eller devcontainerprov. Inget i rapporten visar att Skyttels slutliga
miljö redan fungerar.

## Verifierade mönster i Kravhantering

### Bas, verktyg och användare

Dockerfile använder en versionsangiven Ubuntu 24.04-devcontainerbas,
installerar bland annat native-byggverktyg, Python och Bubblewrap och kör
den långlivade processen som `vscode`. Devcontainer features installerar
Node, npm, .NET, Git, GitHub CLI och verktyg för containerbyggen.
[Dockerfile](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.devcontainer/Dockerfile#L1-L42),
[Användare](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.devcontainer/Dockerfile#L90-L103),
[Features](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.devcontainer/devcontainer.json#L21-L61).

### Codex-installation och start

Codex installeras från OpenAI:s aktuella stabila fristående release.
Installationsskriptet kräver en unik SHA-256-kontrollsumma för `install.sh`
från samma release och verifierar filen före körning. Saknad eller felaktig
kontrollsumma stoppar installationen. Binären blir tillgänglig
systemomfattande och paketkatalogen ligger under `/home/vscode/.codex`.
[Verifierad installation](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/scripts/azure-dev/templates/install-codex.sh#L45-L118),
[Installation i bilden](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.devcontainer/Dockerfile#L48-L58).

Vid skapande förbereds ägarskap och Codex-konfiguration, beroenden
installeras, GitVersion återställs och Playwright installeras. Varje start
kör först `codex app-server daemon start`; ett misslyckande blir ett synligt
startfel. Dokumentationen anger att starten är idempotent och väntar på
den lokala kontrollsocketen. Det senare är en dokumenterad förväntan, inte
ett genomfört körprov i denna undersökning.
[Livscykelkommandon](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.devcontainer/devcontainer.json#L241-L257),
[Daemonbeskrivning](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/docs/development/devcontainer-developer-workflow.md#L89-L118).

### Inloggning, beständighet och konfiguration

Compose monterar värdens Codex-sessioner, plugins, skills, regler och
`auth.json` separat. Codex egen SQLite-status och tillfälliga filer ligger
i namngivna volymer. Hela värdens Codex-katalog eller `config.toml` monteras
inte. Bindmontering av `auth.json` förutsätter att en sådan fil finns och
passar den valda inloggningsmetoden; det kan inte antas för varje dator.
[Codex-monteringar](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.devcontainer/docker-compose.yml#L18-L49).

`GH_TOKEN` och `COPILOT_GITHUB_TOKEN` vidarebefordras separat från värdens
miljö. Dokumentationen kopplar dem till GitHub MCP respektive Copilot.
De är inte i sig Codex-inloggningen och ska inte följa med automatiskt till
Skyttel om motsvarande funktion inte behövs.
[Vidarebefordring](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.devcontainer/devcontainer.json#L16-L19),
[Dokumenterat syfte](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/docs/development/devcontainer-developer-workflow.md#L21-L44).

Codex-mallen väljer en behörighetsprofil som bygger på workspace, med
åtkomst till `.git`, `.codex`, skills och utvecklingstjänsternas nätverk.
Den sätter även `approval_policy = "never"` och stänger av vissa plugins
och skills. Dessa personliga projektval är inga krav för Skyttel.
Sammanfogningsskriptet bevarar andra inställningar, men är nära knutet till
Kravhanterings profiler och Azure-sökvägar.
[Codex-mall](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.devcontainer/codex-config.toml#L5-L56),
[Sammanfogning](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/scripts/azure-dev/templates/merge-codex-config.py#L378-L407).

### Normal och förhöjd profil

De två `devcontainer.json`-filerna skiljer sig enbart i visningsnamn.
Den förhöjda Compose-filen lägger till `SYS_ADMIN`,
`seccomp=unconfined` och `systempaths=unconfined`, samt anpassade relativa
sökvägar, projektnamn och SQL Server-volym. Källkommentarerna motiverar
rättigheterna med Bubblewrap/unshare och montering av `/proc` i en inre
namnrymd. Profilen använder inte `privileged: true` och ska vara frivillig.
[Förhöjd profil](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.devcontainer/elevated/docker-compose.yml#L75-L100),
[Val av profil](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/docs/development/devcontainer-developer-workflow.md#L6-L13).

Båda profilerna exponerar `/dev/fuse` och `/dev/net/tun` för lokala
Podman-körningar. Dessa enheter ska inte behandlas som allmänna krav för
Codex, Node eller SQLite. Behörigheter i den yttre Linux-containern är också
skilda från om Codex begär godkännande för ett enskilt kommando.
[Podman-enheter](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.devcontainer/docker-compose.yml#L74-L82).

Användaren anger att den förhöjda profilen ursprungligen behövs för
Codex-tillägget i VS Code. Motsvarande behov är inte provat för Codex CLI.
Detta är användarens historik, medan källkommentarerna beskriver agenters
sandbox generellt. CLI och tillägg ska därför bedömas var för sig.

## Aktuell Codex-dokumentation

OpenAI rekommenderar distributionens Bubblewrap-paket på Linux och WSL2.
Codex använder första `bwrap` i sökvägen; den medföljande reservlösningen
kräver stöd för oprivilegierade användarnamnrymder. Ubuntu 24.04 kan behöva
en AppArmor-profil på värden. Det visar att miljön spelar roll, men bevisar
inte att `SYS_ADMIN` krävs på varje värd. Sandboxens tekniska begränsningar
och godkännande av ett kommando är två olika kontrollnivåer.
[OpenAI: sandboxing](https://learn.chatgpt.com/docs/sandboxing).

För en miljö utan lokal webbläsare finns enhetsinloggning när funktionen är
aktiverad. Filbaserad inloggningscache kan återanvändas, men lagring i
operativsystemets nyckelring innebär att `auth.json` kan saknas. Välj och
prova en fungerande metod utan att göra en värdfil obligatorisk.
[OpenAI: authentication](https://learn.chatgpt.com/docs/auth).

Domänregler för nätverk verkställs först med aktiverad nätverksproxy. De
kopierade domännamnen i Kravhanterings mall är därför inte ensamma bevis
för begränsade destinationer. Anpassa och prova aktuell konfiguration.
[OpenAI: agent approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security).

## Föreslagen anpassning för Skyttel

Detta är en rekommendation för implementationen, inte införd konfiguration.

- Behåll en normal container med användaren `vscode`, källkoden under
  `/workspace` och en separat beständig plats för Git-worktrees utanför
  repositorykatalogen.
- Anpassa Node/npm till samma versioner som CI och produktionsbygget.
  Behåll native-byggverktyg för SQLite/Sharp, Git, GitHub CLI och .NET för
  GitVersion. Behåll relevanta Playwright-, test- och kvalitetsverktyg.
- Installera Codex med verifierat ursprung och fungerande daemonstart.
  Erbjud Codex-tillägget i VS Code. Ändra bara inställningar som miljön
  behöver; bevara användarens modell-, plugin- och godkännandeval.
- Dokumentera inloggning och beständighet. Använd utvecklingsspecifik
  lagring och håll Codex-status skild från Skyttels SQLite-data. Lägg aldrig
  personliga token eller autentiseringsfiler i bilden eller Git.
- Publicera bara Skyttels faktiska Vite/API- och testrapportsportar.
  Anpassa eventuell lokal HTTPS-hantering efter OAuth- och talproven.
- Ta bort SQL Server, Keycloak, Kong, HSA-tjänster, deras certifikat,
  portar, datavolymer, vidarebefordrare och startåtgärder. Ta även bort
  Next.js-specifik konfiguration och Kravhanterings nyckelringsprovisionering.
- Behåll möjlighet att bygga och prova Skyttels produktionscontainer.
  Välj och dokumentera dess containeranslutning uttryckligen; kopiera inte
  hela Podman-/Quadlet-miljön och dess Linux-rättigheter av slentrian.
- Prova normalprofilen först. Om inre sandbox hindras, dokumentera konkret
  fel, nödvändig extra rättighet och provad värdmiljö för en frivillig
  förhöjd profil. Stäng inte av Codex sandbox som allmän lösning.

## Separat funktionsprov efter första implementationen

Kravhanterings bildkontroll bygger Dockerfile-steget `development` och kör
`codex --version` samt dotenv-linter. Den verifierar inte hela
Dev Container-konfigurationen med features, inloggning eller agentarbete.
[Befintligt bildprov](https://github.com/viscalyx/Kravhantering/blob/562f9d2eccc85a316cf30eaa01a9e4e85c4fbb88/.github/workflows/devcontainer-image-smoke.yml#L23-L34).

Användaren vill köra funktionsprovet med Codex inne i den verkliga
devcontainern efter första implementationen. Det ska hanteras i ett
fristående vanligt ärende utanför Wayfinder-kartan:
[Funktionstesta Codex CLI och VS Code-tillägget i devcontainern](https://github.com/viscalyx/skyttel/issues/25).
Använd syntetiska data och dokumentera resultatet i
`docs/development/devcontainer.md`:

1. Ren uppbyggnad och anslutning av hela devcontainern på avsedda värdar;
   dokumentera provade CPU-arkitekturer och normal eller förhöjd profil.
2. Node/npm, native SQLite/Sharp och GitVersion fungerar som `vscode`.
   Låst installation, kvalitetskontroller, tester och produktionsbygge går
   att köra; versionsberäkningen ser nödvändig Git-historik och taggar.
3. Vite/Hono startar och nås via dokumenterade portar. SQLite kan skapa,
   läsa och migrera en testdatabas; Playwright kan köra ett enkelt webbprov.
4. Prova Codex CLI och VS Code-tillägget oberoende i samma värdmiljö och
   container. Dokumentera respektive klientversion, använd runtime,
   daemonstatus och godkännandeinställningar. Tillägget kan använda en annan
   CLI-version än terminalen. Inloggning får inte läcka till loggar eller
   Git.
5. För varje klient: läs och ändra en provfil, kör ett test, nå den lokala
   appen och arbeta i en worktree inom avsedda behörigheter. Kontrollera
   sandboxens gränser. Registrera normalprofilens resultat först och prova
   den förhöjda profilen separat vid behov, med exakt fel och utfall. Prova
   även ett uttryckligen godkänt enstaka kommando utanför sandbox mot en
   tillfällig provsökväg; det är skilt från containerns Linux-rättigheter.
6. Stopp/start och ombyggnad bevarar de data, sessioner och inställningar
   som utlovas. Tillfälliga sockets och wrappers ska inte återanvändas från
   värden på ett sätt som bryter daemonstarten.
7. Containerbygge och kontroll av en syntetisk Skyttel-bild fungerar genom
   den dokumenterade anslutningen utan dold upplåsning av agentens sandbox.

Provet sker efter första implementationen och blockerar inte det pågående
teknikbeslutet. Profilvalet ska bygga på observationer per klient, inte på
antagandet att CLI ärver ett historiskt problem från VS Code-tillägget.

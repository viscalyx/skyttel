# Bevara utvecklingsdata och Codex vid ombyggnad

Den här guiden är för utvecklare som skapar eller bygger om Skyttels
devcontainer. Kör kommandon i containern om inte värddatorn anges.
Den vanliga profilen är utgångspunkt. Båda profilerna använder samma flöde
men har separata namngivna volymer.

## Ny värddator utan Codex-inloggning

På värddatorn, i repositoryts rot, förbered de delade katalogerna och den
privata miljöfilen:

```sh
mkdir -p "$HOME/.codex/sessions" "$HOME/.codex/plugins" \
  "$HOME/.codex/skills" "$HOME/.codex/rules"
cp -n .devcontainer/.env.example .devcontainer/.env
chmod 600 .devcontainer/.env
openssl rand -base64 48
```

Spara det genererade värdet i `BETTER_AUTH_SECRET` och behåll det vid
ombyggnad. Skapa ingen tom `auth.json` på värddatorn. Välj **Dev Containers:
Reopen in Container** och den vanliga Skyttel-profilen. Vänta tills
installationen och starten av Codex-daemonen är klara.

Skapandet kör `npm run db:migrate`: en ny databas får tabeller och
migrationshistorik, men inget hushåll eller demodata. En befintlig databas
behåller sitt innehåll. Exempelvärdena för identitetsleverantörerna räcker
för skapandet och inloggningssidan. Riktig inloggning i Skyttel kräver
[egna registreringar och administratörsidentitet](local-authentication.md).
Starta med `npm run dev:all` och följ installationsflödet för ett nytt hushåll.
Välj endast `npm run db:setup` om du vill ersätta alla utvecklingsdata och
sessioner med `TestHousehold`. Det är ett uttryckligt återställningskommando.

### Ange första administratören

Om du inte känner till din Google-identitet kan du ta reda på den efter
att containern skapats. Spara riktiga leverantörsuppgifter i
`.devcontainer/.env` enligt autentiseringsguiden och återskapa containern
för att läsa in dem. Behåll exempelvärdet för administratörens identitet
tills du har identifierat rätt konto.

1. Kör `npm run dev:all`, öppna `http://localhost:5173` och logga in med
   det tänkta administratörskontot. Förvänta **Du har inte tillgång till
   hushållet** när ingen administratör är utsedd.
1. Stoppa appen och läs identiteten i en privat containerterminal:

   ```sh
   sqlite3 -header "$SKYTTEL_DATABASE_PATH" \
     "SELECT providerId, accountId FROM account WHERE providerId = 'google';"
   ```

1. Identifiera rätt kontos `accountId`; välj inte första raden om flera
   konton visas. Spara värdet i `SKYTTEL_FIRST_ADMIN_SUBJECT` i
   `.devcontainer/.env` och behåll `SKYTTEL_FIRST_ADMIN_PROVIDER=google`.
   Publicera inte identiteten. Återskapa containern och starta appen igen.
1. Logga in och skapa ett nytt hushåll genom installationsflödet, eller
   välj uttryckligen demoåterställningen enligt ovan. För Microsoft används
   motsvarande verifierade identitet och `SKYTTEL_FIRST_ADMIN_PROVIDER`.

## Logga in i Codex i containern

Den nya användarkonfigurationen använder `cli_auth_credentials_store = "file"`.
Codex sparar då inloggningen i `~/.codex/auth.json` på volymen `codex-home`.
Filinnehållet hör varken hemma i Git, avbildningen eller offentliga loggar.
Om du själv väljer ett annat lagringssätt behöver du även ordna dess
beständighet. Personliga val skrivs inte över vid ombyggnad.

Samma bevarande gäller personliga modell-, godkännande-, plugin- och
skillinställningar. Skapandet uppdaterar den reserverade behörighetsprofilen
`permissions.skyttel-development` och tilliten till `/workspace`.
Standardprofil och lagringssätt för inloggning fylls bara i om de saknas.
Projektets `.codex/config.toml` väljer profil, `approval_policy = "never"`
och projektets begränsningar för plugins och skills när du arbetar i Skyttel.
De personliga värdena ligger kvar för andra projekt. Använd ett eget namn
för personliga behörighetsprofiler; se
[konfigurationens lager](codex-permissions.md).

Aktivera vid behov inloggning med enhetskod i kontots säkerhetsinställningar
eller genom arbetsytans administratör. Kör sedan i containerterminalen:

```sh
codex login --device-auth
codex login status
```

Öppna den angivna länken i värddatorns webbläsare och slutför inloggningen
med engångskoden. Dela inte koden. Om enhetskod inte är tillgänglig kan du
vidarebefordra port 1455 i VS Code och köra `codex login`, eller använda den
frivilliga kopieringen nedan. Se
[OpenAI:s autentiseringsguide](https://learn.chatgpt.com/docs/auth).

Kontrollera även Codex-tilläggets inloggning i containerns VS Code-fönster.
Statuskommandot visar bara inloggningsstatus; ett faktiskt klientprov följer
[ärende #25](https://github.com/viscalyx/skyttel/issues/25).

### Återanvänd värddatorns inloggning frivilligt

Om värddatorn redan har en riktig `~/.codex/auth.json` kan du kopiera den
en gång till den startade containern. Kör från repositoryts rot på värddatorn:

```sh
test -f "$HOME/.codex/auth.json" &&
docker compose -f .devcontainer/docker-compose.yml exec -T app \
  sh -c 'umask 077; set -C; cat > "$HOME/.codex/auth.json"' \
  < "$HOME/.codex/auth.json"
```

För den extra behörighetsprofilen använder du i stället
`.devcontainer/elevated/docker-compose.yml`. Kommandot vägrar skriva över
en befintlig målfil. Behåll containerns egen inloggning om den redan finns.
Kopian uppdateras därefter av Codex i containern och delas inte löpande med
värddatorn. Ett konto som enbart finns i värddatorns nyckelring behöver
inloggning i containern; skapa ingen ersättningsfil med påhittat innehåll.
Kör `codex login status` i containern och öppna om Codex-klienterna.

## Bevara befintliga inställningar vid första övergången

Om din körande container ännu saknar volymen `codex-home`, spara dess
personliga `config.toml` före den första ombyggnaden. Den separata volymen
för `~/.config` överlever ombyggnaden:

```sh
install -d -m 700 "$HOME/.config/skyttel"
install -m 600 "$HOME/.codex/config.toml" \
  "$HOME/.config/skyttel/codex-config.before-persistence.toml"
```

Stäng Codex-klienterna och bygg om samma profil. Återställ sedan filen och
lägg in projektets förvaltade inställningar igen:

```sh
install -m 600 "$HOME/.config/skyttel/codex-config.before-persistence.toml" \
  "$HOME/.codex/config.toml"
python3 .devcontainer/merge-codex-config.py \
  .devcontainer/codex-config.toml "$HOME/.codex/config.toml"
```

Öppna Codex-klienterna igen. Den befintliga `codex-state`-volymen ligger
kvar vid `~/.codex/sqlite`; delade sessioner, regler, tillägg och skills
ligger kvar på värddatorn. Den gamla bindningen av värddatorns `auth.json`
ersätts av egen inloggning eller den frivilliga kopieringen ovan.
Övriga personliga filer som du själv lagt i containerns disponibla
filsystem behöver sparas före denna första övergång. Vid följande ombyggnader
bevaras hela Codex-katalogen med undantag för dess separata monteringar,
som har egen lagring enligt [volymtabellen](devcontainer.md#state-and-rebuilds).

## Kontrollera personliga inställningar utan ombyggnad

Kör konfigurationstesterna utan Docker eller inloggning:

```sh
node --test scripts/__tests__/devcontainer-config.test.mjs
```

Testerna använder tillfälliga filer och kontrollerar att personliga modell-,
godkännande-, plugin- och skillinställningar bevaras. De kontrollerar även
första övergången från äldre förvaltade block, upprepad sammanslagning,
filbehörigheter och att felaktiga filer inte skrivs över. Riktig
användarkonfiguration läses inte.

## Automatiskt prov av omstart och ombyggnad

Kör från repositoryts rot med installerade beroenden, Python 3.11 eller
senare samt en tillgänglig Docker-motor och Docker Compose:

```sh
npm run test:devcontainer
```

Provet bygger repositoryts devcontaineravbildning och kör båda profilernas
volymstruktur i egna Compose-projekt. Alla monteringar får nya testvolymer,
även de kataloger som normalt delas med värddatorn. Din vanliga databas,
personliga konfiguration och privata miljöfil används inte.

För varje profil kontrolleras följande:

- En databas skapad med appens migrationer behåller ett sparat objekt,
  ett privat utkast och övriga tabeller efter omstart och återskapande.
- Båda profilernas skapandekommandon använder migration utan återställning,
  och den verkliga migrationskörningen bevarar databasens innehåll.
- Den första övergångens säkerhetskopia via `~/.config` kan återställas
  när den beständiga Codex-katalogen införs.
- Personliga inställningar, syntetisk inloggningsfil, Codex-arbetsläge
  och den separata SQLite-volymen bevaras.
- Katalogerna för sessioner, plugins, skills, regler, temporärfiler,
  VS Code, beroenden och worktrees behåller sina markörer.
- Lagringsförberedelsen och konfigurationssammanslagningen fungerar även
  när de körs igen efter att containerns disponibla lager ersätts.
- Testets containrar och volymer tas bort efter körningen.

Provet kör lagrings- och konfigurationsstegen från skapandet. Det kör inte
VS Code eller hela installationen av verktyg i `postCreateCommand`.
Migrationen körs med repositoryts Node och beroenden på en isolerad kopia
av testvolymens databas. Resultatet förs tillbaka till testvolymen och
jämförs direkt i SQLite. Användarflöden har separata integrationstester.
Syntetisk inloggning verifierar filens beständighet, inte ett verkligt konto.

## Manuellt prov av omstart och ombyggnad

Omstarts- och beständighetskontrollerna ovan ingår i automatiseringen.
Inloggning som kräver ett personligt medgivande görs fortfarande enligt
[Codex-inloggningen](#logga-in-i-codex-i-containern).
Kontrollera Codex-tilläggets inloggning i VS Code med ditt eget konto.
Spara inga token eller personliga identitetsvärden i testresultat.

Vid den första övergången behöver du fortfarande säkra din egen befintliga
fil enligt [övergångsguiden](#bevara-befintliga-inställningar-vid-första-övergången).
Det är en engångsåtgärd för dina uppgifter, inte ett extra manuellt test.
